export function getQuickWins(maintainability, scanResult) {
    const wins = [];
    // Hygiene wins
    const hygiene = maintainability.breakdown.find(c => c.category === 'Project Hygiene');
    if (hygiene && hygiene.score < hygiene.max) {
        if (!hygiene.notes.some(n => n.includes('README')))
            wins.push('Add a README.md file.');
        if (!hygiene.notes.some(n => n.includes('LICENSE')))
            wins.push('Add a LICENSE file.');
        // Only suggest CI if we are sure there is none and it wasn't filtered out
        if (!hygiene.notes.some(n => n.includes('CI')))
            wins.push('Add CI configuration (GitHub Actions, etc).');
    }
    // Structure wins
    const structure = maintainability.breakdown.find(c => c.category === 'Code Structure');
    if (structure && structure.score < structure.max) {
        // Only suggest splitting files if there ARE huge files
        const hasHugeFiles = scanResult.files.some(f => f.loc.code > 800);
        if (hasHugeFiles) {
            wins.push('Refactor/Split files larger than 800 LOC.');
        }
        if (!structure.notes.some(n => n.includes('Linter')))
            wins.push('Add eslint/prettier configuration.');
    }
    // Testing wins
    const testing = maintainability.breakdown.find(c => c.category === 'Testing');
    if (testing && testing.score < testing.max) {
        if (!testing.notes.some(n => n.includes('Tests directory')))
            wins.push('Create a test directory and add tests.');
    }
    // Hotspots correction
    const topComplexity = scanResult.hotspots.byComplexity[0];
    if (topComplexity && topComplexity.score > 50) {
        wins.push(`Refactor highly complex file: ${topComplexity.path} (Score: ${topComplexity.score.toFixed(0)})`);
    }
    return wins.slice(0, 5);
}
