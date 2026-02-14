import fs from 'fs/promises';
const BRANCH_KEYWORDS = new Set([
    'if', 'else', 'switch', 'case', 'for', 'while', 'catch', 'try', 'finally', 'do'
]);
const FUNC_KEYWORDS = new Set([
    'function', 'return', '=>', 'def', 'class', 'struct', 'interface'
]);
export async function calculateComplexity(filepath) {
    if (isTestFile(filepath)) {
        return createZeroScore();
    }
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        return analyzeContent(content);
    }
    catch (error) {
        return createZeroScore();
    }
}
function isTestFile(filepath) {
    return filepath.includes('.test.') ||
        filepath.includes('.spec.') ||
        filepath.includes('__tests__');
}
function createZeroScore() {
    return { score: 0, details: { branchCount: 0, funcCount: 0, maxNesting: 0, locCode: 0 } };
}
function analyzeContent(content) {
    const lines = content.split(/\r?\n/);
    let branchCount = 0;
    let funcCount = 0;
    let maxNesting = 0;
    let locCode = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        locCode++;
        maxNesting = Math.max(maxNesting, calculateLineNesting(line));
        const counts = countTokens(trimmed);
        branchCount += counts.branches;
        funcCount += counts.functions;
    }
    const score = computeRawScore(branchCount, funcCount, maxNesting, locCode);
    return {
        score,
        details: { branchCount, funcCount, maxNesting, locCode }
    };
}
function calculateLineNesting(line) {
    const leadingSpace = line.match(/^\s*/)?.[0].length || 0;
    return Math.floor(leadingSpace / 2);
}
function countTokens(trimmedLine) {
    const tokens = trimmedLine.split(/[^a-zA-Z0-9_]+/);
    let branches = 0;
    let functions = 0;
    for (const token of tokens) {
        if (BRANCH_KEYWORDS.has(token))
            branches++;
        if (FUNC_KEYWORDS.has(token))
            functions++;
    }
    return { branches, functions };
}
function computeRawScore(branches, functions, nesting, loc) {
    // Refined Formula for A-Grade accuracy
    // Heavy penalty on nesting (readability killer)
    // Moderate penalty on branches
    // Low penalty on function count (modular code is good, but too many implies monolithic file)
    // LOC impact reduced (long files aren't always complex, just long)
    const rawScore = (branches * 1.5) + (functions * 0.5) + (nesting * 5) + (loc / 100 * 2);
    return Math.min(Math.max(rawScore, 0), 100);
}
export function calculateRepoComplexity(scanResult) {
    const complexFiles = scanResult.files.filter(f => f.complexity !== undefined);
    if (complexFiles.length === 0)
        return 0;
    // Use top 20 most complex files to judge the repo
    const sorted = complexFiles.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
    const topN = sorted.slice(0, 20);
    const sum = topN.reduce((acc, f) => acc + (f.complexity || 0), 0);
    return sum / topN.length;
}
