import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { calculateMaintainability } from '../../core/maintainability.js';
import { discoverFiles } from '../../core/discoverFiles.js';
import { getLanguage } from '../../core/language.js';
import { countLoc } from '../../core/locCounter.js';
import { calculateComplexity } from '../../core/complexityProxy.js';
import { generateBadgeSvg, getGradeColor, formatCurrency } from '../../core/badgeGenerator.js';
import { calculateValuation } from '../../core/valuation.js';
import { evaluateCiGate } from '../../core/ci.js';
export function registerBadgeCommand(program) {
    program
        .command('badge')
        .description('Generate a maintainability badge')
        .option('--path <dir>', 'Path to scan', '.')
        .option('--out <file>', 'Output SVG file', 'reports/codeworth.svg')
        .option('--report <file>', 'Path to report file (overrides auto-discovery in CI mode)')
        .option('--type <type>', 'Badge type (grade, value, certified)', 'grade')
        .option('--ci', 'Run in CI mode (enforces quality gate)')
        .option('--min-grade <grade>', 'Minimum grade required (A+, A, B, C, D, F)', 'C')
        .option('--min-score <score>', 'Minimum score required (0-100)', undefined)
        .action(async (options) => {
        try {
            const rootDir = path.resolve(options.path);
            let score = 0;
            let grade = 'F';
            let label = 'Codeworth';
            let valueText = '';
            let color = '#737373'; // Default gray
            if (options.ci) {
                // --- CI Mode ---
                // 1. Locate Report
                let reportPath = '';
                let reportData = null;
                if (options.report) {
                    // Explicit report path
                    reportPath = path.resolve(options.report);
                    try {
                        const data = await fs.readFile(reportPath, 'utf-8');
                        reportData = JSON.parse(data);
                    }
                    catch (e) {
                        console.error(chalk.red(`Error: Could not read report at ${reportPath}: ${e.message}`));
                        process.exit(1);
                    }
                }
                else {
                    // Auto-discovery
                    const reportPaths = [
                        path.join(rootDir, 'reports', 'codeworth.report.json'),
                        path.join(rootDir, 'codeworth.report.json'),
                        // Fallback to current working dir if path is default
                        path.join(process.cwd(), 'reports', 'codeworth.report.json'),
                        path.join(process.cwd(), 'codeworth.report.json')
                    ];
                    for (const p of reportPaths) {
                        try {
                            const data = await fs.readFile(p, 'utf-8');
                            reportData = JSON.parse(data);
                            reportPath = p;
                            break;
                        }
                        catch (e) {
                            // Continue to next path
                        }
                    }
                    if (!reportData) {
                        console.error(chalk.red('Error: Could not find a valid codeworth.report.json. Run "codeworth scan" first or use --report.'));
                        process.exit(1);
                    }
                }
                if (!reportData || !reportData.maintainability) {
                    console.error(chalk.red('Error: Report is missing maintainability data.'));
                    process.exit(1);
                }
                // 2. Evaluate CI Gate
                const ciOptions = {
                    minGrade: options.minGrade,
                    minScore: options.minScore ? parseInt(options.minScore, 10) : undefined
                };
                const ciResult = evaluateCiGate(reportData, ciOptions);
                score = ciResult.score;
                grade = ciResult.grade;
                const passed = ciResult.passed;
                // Prepare Badge Data
                valueText = `${grade} (${score})`;
                color = getGradeColor(grade);
                // 4. Output & Exit
                if (passed) {
                    console.log(chalk.green(`✅ Codeworth CI PASSED`));
                    console.log(`Grade: ${grade} (${score})`);
                    console.log(chalk.gray(`Requirement: ${ciResult.message}`));
                }
                else {
                    console.log(chalk.red(`❌ Codeworth CI FAILED`));
                    console.log(`Grade: ${grade} (${score})`);
                    console.log(chalk.yellow(`Required: ${ciResult.message}`));
                }
                // Store exit code for later
                var exitCode = passed ? 0 : 1;
            }
            else {
                // --- Standard Mode (Scan & Generate) ---
                const scanOptions = {
                    path: options.path,
                };
                const filePaths = await discoverFiles(scanOptions);
                const files = [];
                const totals = { files: 0, loc: { code: 0, comment: 0, blank: 0 } };
                const languagesMap = new Map();
                for (const filePath of filePaths) {
                    const absolutePath = path.join(rootDir, filePath);
                    const lang = getLanguage(filePath);
                    const loc = await countLoc(absolutePath, lang);
                    const complexity = await calculateComplexity(absolutePath);
                    files.push({
                        path: filePath,
                        size: 0,
                        language: lang,
                        loc,
                        complexity: complexity.score,
                        churn: undefined
                    });
                    totals.files++;
                    totals.loc.code += loc.code;
                    totals.loc.comment += loc.comment;
                    totals.loc.blank += loc.blank;
                    const langStat = languagesMap.get(lang) || { files: 0, loc: 0 };
                    langStat.files++;
                    langStat.loc += loc.code;
                    languagesMap.set(lang, langStat);
                }
                const languages = Array.from(languagesMap.entries()).map(([name, stat]) => ({
                    name,
                    files: stat.files,
                    loc: { code: stat.loc, comment: 0, blank: 0 },
                    percentOfCode: totals.loc.code > 0 ? (stat.loc / totals.loc.code) * 100 : 0
                }));
                const result = {
                    meta: { scannedPath: rootDir, timestamp: new Date().toISOString(), repo: { name: path.basename(rootDir), hasGit: false } },
                    files,
                    totals,
                    languages,
                    directories: [],
                    hotspots: { byLoc: [], byComplexity: [], byChurn: [] }
                };
                // Check for git presence manually
                try {
                    const gitDir = path.join(rootDir, '.git');
                    const stat = await fs.stat(gitDir);
                    if (stat.isDirectory()) {
                        result.meta.repo.hasGit = true;
                    }
                }
                catch { /* ignore */ }
                const maintainability = await calculateMaintainability(result, rootDir);
                score = maintainability.score;
                grade = maintainability.grade;
                valueText = `${grade} (${score})`;
                color = getGradeColor(grade);
                // Optional types
                if (options.type === 'certified') {
                    const isGradeEligible = score >= 90;
                    const hygieneCat = maintainability.breakdown.find(c => c.category === 'Project Hygiene');
                    const hasCI = hygieneCat?.notes.some(n => n.includes('CI'));
                    const testCat = maintainability.breakdown.find(c => c.category === 'Testing');
                    const hasTests = testCat && testCat.score > 0;
                    const hasExtremeHotspots = files.some(f => (f.complexity || 0) >= 85);
                    if (isGradeEligible && hasCI && hasTests && !hasExtremeHotspots) {
                        valueText = 'Certified';
                        color = '#16a34a';
                    }
                    else {
                        console.warn(chalk.yellow('Repo not eligible for Certified badge. Falling back to grade.'));
                    }
                }
                else if (options.type === 'value') {
                    const valuation = calculateValuation(result, maintainability);
                    valueText = formatCurrency(valuation.riskAdjustedValue);
                    label = 'Value';
                }
            }
            // --- Generate Badge (Common) ---
            const svg = generateBadgeSvg({
                label,
                valueText,
                color
            });
            const outDir = path.dirname(options.out);
            await fs.mkdir(outDir, { recursive: true });
            await fs.writeFile(options.out, svg);
            if (options.ci) {
                // In CI, we only print the badge path if successful? Or just always.
                // Spec says "Print only minimal CI output."
                // We already printed PASS/FAIL.
                //@ts-ignore
                if (typeof exitCode !== 'undefined' && exitCode !== 0) {
                    process.exit(exitCode);
                }
            }
            else {
                // Normal Output
                console.log(chalk.green(`Badge written to ${options.out}`));
                if (score >= 50) {
                    console.log('\n' + chalk.bold('Share your score: Add this to your README.'));
                    const relativePath = path.relative(rootDir, options.out);
                    const repoUrl = 'https://github.com/<user>/<repo>';
                    const rawUrl = `https://raw.githubusercontent.com/<user>/<repo>/main/${relativePath}`;
                    console.log(chalk.cyan(`\n[![Codeworth](${relativePath})](${repoUrl})`));
                }
                else {
                    console.log(chalk.gray('\nTip: Improve maintainability to earn a sharable badge.'));
                }
            }
        }
        catch (error) {
            console.error(chalk.red('Badge generation failed:'), error);
            process.exit(1);
        }
    });
}
