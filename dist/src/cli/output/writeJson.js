import fs from 'fs/promises';
import path from 'path';
export async function writeJson(result, outDir, filename = 'codeworth.report.json') {
    const outputPath = path.join(outDir, filename);
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    return outputPath;
}
