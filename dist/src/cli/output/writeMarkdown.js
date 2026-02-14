import fs from 'fs/promises';
import path from 'path';
import os from 'os';
export async function writeMarkdown(result, outDir, filename = 'codeworth.report.md') {
    const outputPath = path.join(outDir, filename);
    const totalLoc = result.totals.loc.code + result.totals.loc.comment + result.totals.loc.blank;
    // Prepare Data for Executive Summary
    const grade = result.maintainability?.grade || 'N/A';
    const score = result.maintainability?.score || 0;
    // Calculate Risk
    let topRisk = 'None';
    if (result.maintainability) {
        const lowest = result.maintainability.breakdown.reduce((prev, curr) => (curr.score / curr.max) < (prev.score / prev.max) ? curr : prev);
        topRisk = `${lowest.category} (Score: ${lowest.score}/${lowest.max})`;
    }
    // Recommendation
    let recommendation = 'Keep up the good work!';
    if (result.maintainability && result.maintainability.quickWins.length > 0) {
        recommendation = result.maintainability.quickWins[0];
    }
    else if (score < 80) {
        recommendation = 'Focus on refactoring complex hotspots.';
    }
    const lines = [
        `# Codeworth Report`,
        ``,
        `> **Executive Summary**`,
        `> `,
        `> **Overall Grade**: ${grade} (${score}/100)`,
    ];
    if (result.valuation) {
        lines.push(`> **Rebuild Cost**: $${result.valuation.rebuildCost.toLocaleString()}`);
        lines.push(`> **Risk-Adjusted Value**: $${result.valuation.riskAdjustedValue.toLocaleString()}`);
    }
    lines.push(`> **Top Risk**: ${topRisk}`);
    lines.push(`> **Primary Recommendation**: ${recommendation}`);
    lines.push(``);
    // Visual Grade
    const barLength = 20;
    const filled = Math.min(Math.max(Math.round((score / 100) * barLength), 0), barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    lines.push(`## Maintainability: ${bar} ${score}%`);
    lines.push(``);
    // Metadata
    lines.push(`### Scan Metadata`);
    lines.push(`- **Repo**: ${result.meta.repo.name}`);
    lines.push(`- **Date**: ${new Date().toLocaleString()}`);
    lines.push(`- **Scanned Files**: ${result.totals.files}`);
    lines.push(`- **Total LOC**: ${totalLoc.toLocaleString()}`);
    lines.push(`- **Node Version**: ${process.version}`);
    lines.push(`- **Platform**: ${os.platform()} (${os.release()})`);
    lines.push(``);
    if (result.valuation) {
        lines.push(`## Valuation Details`);
        lines.push(`| Metric | Value |`);
        lines.push(`|---|---|`);
        lines.push(`| **Rebuild Cost** | $${result.valuation.rebuildCost.toLocaleString()} |`);
        lines.push(`| **Risk-Adjusted** | $${result.valuation.riskAdjustedValue.toLocaleString()} |`);
        lines.push(`| **Confidence** | **${result.valuation.confidence}** |`);
        lines.push(``);
        lines.push(`### Valuation Inputs`);
        const assumptions = result.valuation.assumptions;
        lines.push(`- **Rate Model**: ${assumptions.rateModel} ($${assumptions.locRateUsd}/LOC)`);
        lines.push(``);
        lines.push(`### Multipliers`);
        const m = result.valuation.assumptions.multipliers;
        lines.push(`- Complexity: x${m.complexity.toFixed(2)}`);
        lines.push(`- Tests: x${m.tests.toFixed(2)}`);
        lines.push(`- Docs: x${m.docs.toFixed(2)}`);
        lines.push(`- Churn: x${m.churn.toFixed(2)}`);
        lines.push(`- Dependencies: x${m.deps.toFixed(2)}`);
        lines.push(``);
    }
    if (result.maintainability) {
        lines.push(`## Maintainability Breakdown`);
        lines.push(`| Category | Score | Max | Notes |`);
        lines.push(`|---|---|---|---|`);
        for (const item of result.maintainability.breakdown) {
            lines.push(`| ${item.category} | ${item.score} | ${item.max} | ${item.notes.join(', ')} |`);
        }
        if (result.maintainability.quickWins.length > 0) {
            lines.push(``);
            lines.push(`### Quick Wins`);
            for (const win of result.maintainability.quickWins) {
                lines.push(`- ${win}`);
            }
        }
    }
    lines.push(``);
    lines.push(`## Extreme Hotspots (Complexity >= 85)`);
    const extremeHotspots = result.hotspots.byComplexity.filter(h => h.score >= 85);
    if (extremeHotspots.length === 0) {
        lines.push(`_No extreme hotspots detected. Great job!_`);
    }
    else {
        lines.push(`| File | Complexity |`);
        lines.push(`|---|---|`);
        for (const h of extremeHotspots) {
            lines.push(`| ${h.path} | ${h.score.toFixed(1)} |`);
        }
    }
    lines.push(``);
    lines.push(`## Top Hotspots`);
    lines.push(`| File | LOC | Complexity |`);
    lines.push(`|---|---|---|`);
    // Combine LOC and Complexity for checking
    const combined = result.files
        .sort((a, b) => b.loc.code - a.loc.code)
        .slice(0, 10);
    for (const file of combined) {
        lines.push(`| ${file.path} | ${file.loc.code.toLocaleString()} | ${(file.complexity || 0).toFixed(1)} |`);
    }
    lines.push(``);
    lines.push(`## Language Breakdown`);
    lines.push(`| Language | Files | Code | Comment | Blank | % |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const lang of result.languages) {
        lines.push(`| ${lang.name} | ${lang.files} | ${lang.loc.code.toLocaleString()} | ${lang.loc.comment.toLocaleString()} | ${lang.loc.blank.toLocaleString()} | ${lang.percentOfCode.toFixed(1)}% |`);
    }
    await fs.writeFile(outputPath, lines.join('\n'));
    return outputPath;
}
