import { calculateRepoComplexity } from './complexityProxy.js';
export function calculateValuation(scanResult, maintainability, options) {
    // 1. Base Cost
    // Default: per_loc, $10/LOC
    const rateModel = 'per_loc';
    const locRateUsd = options?.locRateUsd || 10;
    // Effective LOC: Total Code.
    const effectiveLoc = scanResult.totals.loc.code;
    const baseCost = effectiveLoc * locRateUsd;
    // 2. Multipliers
    // Complexity Multiplier (from unified repo complexity)
    const repoComplexity = calculateRepoComplexity(scanResult);
    const complexityScore = Math.round(25 * (1 - (repoComplexity / 100)));
    // Multiplier range: 0.80 (complex) to 1.15 (simple)
    const mComplexity = 0.80 + (complexityScore / 25) * 0.35;
    // Rebuild Cost = Effective LOC * Base Rate * Complexity Multiplier
    const rebuildCost = baseCost * mComplexity;
    // Risk Multipliers (tests, docs, churn, deps)
    // Testing Multiplier
    const testCat = maintainability.breakdown.find(c => c.category === 'Testing');
    const testScore = testCat ? testCat.score : 0;
    let mTests = 1.0;
    if (testScore >= 15)
        mTests = 1.10; // Good tests -> Higher asset value
    else if (testScore >= 8)
        mTests = 1.00;
    else if (testScore >= 1)
        mTests = 0.90;
    else
        mTests = 0.80; // No tests -> Penalty on value
    // Docs Multiplier
    const hygieneCat = maintainability.breakdown.find(c => c.category === 'Project Hygiene');
    const hasReadme = hygieneCat?.notes.some(n => n.includes('README'));
    let mDocs = hasReadme ? 1.0 : 0.90; // Penalty if missing docs
    // Churn Multiplier
    let mChurn = 1.0;
    if (scanResult.files.some(f => f.churn)) {
        mChurn = 1.05; // Active
    }
    else {
        mChurn = 1.0;
    }
    // Dependency Multiplier
    const depCat = maintainability.breakdown.find(c => c.category === 'Dependency Risk');
    const depScore = depCat ? depCat.score : 0;
    let mDeps = 1.0;
    if (depScore >= 8)
        mDeps = 1.05; // Low risk
    else if (depScore >= 5)
        mDeps = 1.0;
    else
        mDeps = 0.90; // High risk
    // Risk-Adjusted Value
    const riskAdjustmentMultiplier = mTests * mDocs * mChurn * mDeps;
    let riskAdjustedValue = rebuildCost * riskAdjustmentMultiplier;
    // Penalty for JSON/Config heavy repos (reduce value of non-code LOC)
    // Heuristic: If > 30% of LOC is JSON/YAML, discount the excess
    const jsonLoc = scanResult.languages.find(l => l.name === 'JSON')?.loc.code || 0;
    const yamlLoc = scanResult.languages.find(l => l.name === 'YAML')?.loc.code || 0;
    const configLoc = jsonLoc + yamlLoc;
    if (configLoc > effectiveLoc * 0.3) {
        // Discount the config LOC by 50% in the valuation
        const discountable = configLoc - (effectiveLoc * 0.3);
        const discountAmount = discountable * locRateUsd * mComplexity * 0.5;
        riskAdjustedValue -= discountAmount;
    }
    // Confidence
    let confidenceScore = 0;
    if (scanResult.meta.repo.hasGit)
        confidenceScore += 2; // Git is a strong signal
    if (testScore > 5)
        confidenceScore += 2; // Tests are a strong signal
    if (hygieneCat?.notes.some(n => n.includes('CI')))
        confidenceScore += 1;
    if (scanResult.totals.files > 5)
        confidenceScore += 1;
    if (depCat && depCat.score >= 5)
        confidenceScore += 1; // Dependencies managed
    // Penalty
    if (scanResult.totals.loc.code < 100)
        confidenceScore -= 5; // Too small to judge
    let confidence = 'LOW';
    if (confidenceScore >= 6)
        confidence = 'HIGH';
    else if (confidenceScore >= 3)
        confidence = 'MEDIUM';
    return {
        rebuildCost: Math.round(rebuildCost),
        riskAdjustedValue: Math.round(riskAdjustedValue),
        confidence,
        assumptions: {
            rateModel,
            locRateUsd,
            multipliers: {
                complexity: mComplexity,
                tests: mTests,
                docs: mDocs,
                churn: mChurn,
                deps: mDeps
            }
        }
    };
}
