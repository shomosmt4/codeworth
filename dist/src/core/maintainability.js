import fs from 'fs/promises';
import path from 'path';
import { calculateRepoComplexity } from './complexityProxy.js';
import { hygieneChecks, testingChecks } from './scoringChecks.js';
// Weights
const MAX_SCORES = {
    HYGIENE: 20,
    STRUCTURE: 25,
    COMPLEXITY: 25,
    TESTING: 20,
    DEPENDENCIES: 10
};
export async function calculateMaintainability(scanResult, rootDir) {
    const rootFiles = await fs.readdir(rootDir).catch(() => []);
    const hygiene = await runChecks('Project Hygiene', hygieneChecks, rootFiles, rootDir, MAX_SCORES.HYGIENE);
    const structure = runStructureChecks(scanResult, rootFiles);
    const complexity = runComplexityChecks(scanResult);
    const testing = await runChecks('Testing', testingChecks(scanResult), rootFiles, rootDir, MAX_SCORES.TESTING);
    const dependencies = await runDependencyChecks(rootDir, rootFiles);
    const breakdown = [hygiene, structure, complexity, testing, dependencies];
    // Total Score
    const totalScore = breakdown.reduce((sum, cat) => sum + cat.score, 0);
    let grade = 'F';
    // Adjusted grading scale:
    // A+ (90–100)
    // A (85–89)
    // B (75–84)
    // C (65–74)
    // D (50–64)
    // F (< 50)
    if (totalScore >= 90)
        grade = 'A+';
    else if (totalScore >= 85)
        grade = 'A';
    else if (totalScore >= 75)
        grade = 'B';
    else if (totalScore >= 65)
        grade = 'C';
    else if (totalScore >= 50)
        grade = 'D';
    return {
        score: totalScore,
        grade,
        breakdown,
        quickWins: [] // Filled by separate function
    };
}
async function runChecks(category, checks, files, rootDir, max) {
    let score = 0;
    const notes = [];
    for (const check of checks) {
        if (await check.condition(files, rootDir)) {
            score += check.score;
            notes.push(check.note);
        }
    }
    return { category, score: Math.min(score, max), max, notes };
}
function runStructureChecks(scanResult, rootFiles) {
    let score = 0;
    const notes = [];
    const max = MAX_SCORES.STRUCTURE;
    const hugeFiles = scanResult.files.filter(f => f.loc.code > 800);
    if (hugeFiles.length === 0) {
        score += 10;
        notes.push('No huge files');
    }
    else if (hugeFiles.length < 5) {
        score += 5;
        notes.push(`Few huge files (${hugeFiles.length})`);
    }
    else
        notes.push(`Many huge files (${hugeFiles.length})`);
    const topLevelFiles = scanResult.files.filter(f => !f.path.includes('/') && !f.path.includes('\\'));
    // Relaxed threshold: Only enforce for repos with > 30 files, or allow up to 40% in root for smaller ones
    if (scanResult.files.length > 30 && topLevelFiles.length < scanResult.files.length * 0.2) {
        score += 5;
        notes.push('Good directory organization');
    }
    else if (scanResult.files.length <= 30 && topLevelFiles.length < scanResult.files.length * 0.4) {
        score += 5;
        notes.push('Small repo structure okay');
    }
    if (rootFiles.includes('tsconfig.json')) {
        score += 5;
        notes.push('TypeScript detected');
    }
    if (rootFiles.some(f => f.includes('eslint') || f.includes('prettier') || f === 'biome.json')) {
        score += 5;
        notes.push('Linter/Formatter detected');
    }
    return { category: 'Code Structure', score: Math.min(score, max), max, notes };
}
function runComplexityChecks(scanResult) {
    const repoComplexity = calculateRepoComplexity(scanResult);
    let score = Math.round(25 * (1 - (repoComplexity / 100)));
    score = Math.max(0, Math.min(25, score));
    const notes = [];
    if (score > 20)
        notes.push('Low complexity');
    else if (score > 10)
        notes.push('Moderate complexity');
    else
        notes.push('High complexity');
    const extreme = scanResult.files.filter(f => (f.complexity || 0) > 85);
    if (extreme.length === 0)
        notes.push('No extreme hotspots');
    else
        notes.push(`${extreme.length} extreme hotspots`);
    return { category: 'Complexity', score, max: MAX_SCORES.COMPLEXITY, notes };
}
async function runDependencyChecks(rootDir, rootFiles) {
    let score = 0;
    const notes = [];
    const max = MAX_SCORES.DEPENDENCIES;
    if (rootFiles.some(f => /lock/.test(f))) {
        score += 5;
        notes.push('Lockfile present');
    }
    try {
        const pkg = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8'));
        const deps = Object.keys(pkg.dependencies || {}).length;
        if (deps < 20) {
            score += 5;
            notes.push('Low dependencies');
        }
        else if (deps < 50) {
            score += 2;
            notes.push('Moderate dependencies');
        }
    }
    catch {
        score += 2;
    }
    return { category: 'Dependency Risk', score: Math.min(score, max), max, notes };
}
