import path from 'path';
import fs from 'fs/promises';
import { Option } from 'commander';
import { discoverFiles } from '../../core/discoverFiles.js';
import { getLanguage } from '../../core/language.js';
import { countLoc } from '../../core/locCounter.js';
import { calculateComplexity } from '../../core/complexityProxy.js';
import { hasGit, getFileChurn } from '../../core/gitChurn.js';
import { calculateMaintainability } from '../../core/maintainability.js';
import { getQuickWins } from '../../core/quickWins.js';
import { calculateValuation } from '../../core/valuation.js';
import { computeDirectoryStats } from '../../core/directoryStats.js';
import { writeJson } from '../output/writeJson.js';
import { writeMarkdown } from '../output/writeMarkdown.js';
import chalk from 'chalk';
export function registerScanCommand(program) {
    program
        .command('scan')
        .description('Scan the current directory and generate a report')
        .option('--path <dir>', 'Path to scan', '.')
        .option('--outdir <dir>', 'Directory to output reports', './reports')
        .option('--json', 'Output JSON report', true)
        .option('--md', 'Output Markdown report', true)
        .option('--top <n>', 'Number of top files to show', '20')
        .option('--no-git', 'Disable git churn analysis')
        .option('--rate <number>', 'Base cost per LOC in USD (default: 10)', '10')
        .addOption(new Option('--preset <preset>', 'Rate preset (overrides rate)').choices(['junior', 'senior', 'agency']))
        .option('--exclude <patterns...>', 'Glob patterns to exclude')
        .action(async (options) => {
        try {
            const startTime = Date.now();
            console.log(chalk.blue(`Scanning ${options.path}...`));
            const scanOptions = parseOptions(options);
            // 1. Discover
            const filePaths = await collectScanContext(scanOptions);
            console.log(chalk.gray(`Found ${filePaths.length} files.`));
            // 2. Analyze
            const context = await analyzeProject(filePaths, options);
            // 3. Aggregate
            const partialResult = await buildPartialResult(context, options);
            // 4. Score & Value
            const result = await computeScores(partialResult, options, path.resolve(options.path));
            // 5. Report
            await generateOutputs(result, options);
            printSummary(startTime);
        }
        catch (error) {
            console.error(chalk.red('Scan failed:'), error);
            process.exit(1);
        }
    });
}
function parseOptions(options) {
    return {
        path: options.path,
        exclude: options.exclude,
        outdir: options.outdir
    };
}
async function collectScanContext(scanOptions) {
    return discoverFiles(scanOptions);
}
async function analyzeProject(filePaths, options) {
    const files = [];
    const languageStats = new Map();
    const totals = { files: 0, loc: { code: 0, comment: 0, blank: 0 } };
    for (const filePath of filePaths) {
        const absolutePath = path.join(path.resolve(options.path), filePath);
        const lang = getLanguage(filePath);
        const loc = await countLoc(absolutePath, lang);
        const size = (await fs.stat(absolutePath)).size;
        const complexity = await calculateComplexity(absolutePath);
        files.push({
            path: filePath,
            size,
            language: lang,
            loc,
            complexity: complexity.score
        });
        // Totals
        totals.files++;
        totals.loc.code += loc.code;
        totals.loc.comment += loc.comment;
        totals.loc.blank += loc.blank;
        // Languages
        if (!languageStats.has(lang)) {
            languageStats.set(lang, { files: 0, loc: { code: 0, comment: 0, blank: 0 } });
        }
        const s = languageStats.get(lang);
        s.files++;
        s.loc.code += loc.code;
        s.loc.comment += loc.comment;
        s.loc.blank += loc.blank;
    }
    // Git Churn
    const isGitRepo = await hasGit(path.resolve(options.path));
    if (isGitRepo && !options.noGit) {
        console.log(chalk.gray('Analyzing git churn for top files...'));
        const sorted = [...files].sort((a, b) => b.loc.code - a.loc.code).slice(0, 200);
        for (const file of sorted) {
            file.churn = await getFileChurn(path.join(path.resolve(options.path), file.path), path.resolve(options.path));
        }
    }
    return { files, totals, languageStats, isGitRepo };
}
async function buildPartialResult(context, options) {
    const { files, totals, languageStats, isGitRepo } = context;
    const languages = Array.from(languageStats.entries()).map(([name, stats]) => ({
        name,
        files: stats.files,
        loc: stats.loc,
        percentOfCode: totals.loc.code > 0 ? (stats.loc.code / totals.loc.code) * 100 : 0
    })).sort((a, b) => b.loc.code - a.loc.code);
    const directories = computeDirectoryStats(files);
    // Hotspots
    const topN = options.top ? parseInt(options.top) : 20;
    const hotspots = {
        byLoc: [...files].sort((a, b) => b.loc.code - a.loc.code).slice(0, topN).map(f => ({ path: f.path, locCode: f.loc.code })),
        byComplexity: [...files].filter(f => f.complexity !== undefined).sort((a, b) => (b.complexity || 0) - (a.complexity || 0)).slice(0, topN).map(f => ({ path: f.path, score: f.complexity || 0 })),
        byChurn: [...files].filter(f => f.churn).sort((a, b) => (b.churn?.commits || 0) - (a.churn?.commits || 0)).slice(0, topN).map(f => ({ path: f.path, commits: f.churn?.commits || 0, authors: f.churn?.authors || 0 }))
    };
    return {
        meta: {
            scannedPath: path.resolve(options.path),
            timestamp: new Date().toISOString(),
            repo: { name: path.basename(path.resolve(options.path)), hasGit: isGitRepo }
        },
        files,
        totals,
        languages,
        directories,
        hotspots
    };
}
async function computeScores(partialResult, options, scannedPath) {
    const maintainability = await calculateMaintainability(partialResult, scannedPath);
    maintainability.quickWins = getQuickWins(maintainability, partialResult);
    const valuation = computeValuation(partialResult, maintainability, options);
    return { ...partialResult, maintainability, valuation };
}
function computeValuation(partialResult, maintainability, options) {
    let locRate = parseInt(options.rate);
    if (options.preset === 'junior')
        locRate = 6;
    else if (options.preset === 'senior')
        locRate = 12;
    else if (options.preset === 'agency')
        locRate = 18;
    return calculateValuation(partialResult, maintainability, { locRateUsd: locRate });
}
async function generateOutputs(result, options) {
    const outDir = path.resolve(options.outdir);
    await fs.mkdir(outDir, { recursive: true });
    if (options.json) {
        const jsonPath = await writeJson(result, outDir);
        console.log(chalk.green(`JSON report written to ${jsonPath}`));
    }
    if (options.md) {
        const mdPath = await writeMarkdown(result, outDir);
        console.log(chalk.green(`Markdown report written to ${mdPath}`));
    }
}
function printSummary(startTime) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.blue(`Scan completed in ${duration}s`));
}
