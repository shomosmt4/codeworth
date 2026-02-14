import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { discoverFiles } from '../src/core/discoverFiles.js';
import { getLanguage } from '../src/core/language.js';
import { countLoc } from '../src/core/locCounter.js';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'basic');

describe('Codeworth Core', () => {
    beforeAll(async () => {
        // Setup fixture
        await fs.mkdir(FIXTURE_DIR, { recursive: true });
        await fs.writeFile(path.join(FIXTURE_DIR, 'main.ts'), 'console.log("hello");\n// comment');
        await fs.writeFile(path.join(FIXTURE_DIR, 'utils.js'), 'function foo() { return 1; }');
        await fs.writeFile(path.join(FIXTURE_DIR, 'ignored.txt'), 'ignored');
        await fs.writeFile(path.join(FIXTURE_DIR, '.gitignore'), 'ignored.txt');
    });

    afterAll(async () => {
        // Cleanup
        await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    });

    it('should discover files respecting gitignore', async () => {
        const files = await discoverFiles({ path: FIXTURE_DIR });
        const relativePaths = files.map((f: string) => path.relative(path.resolve(FIXTURE_DIR), path.join(path.resolve(FIXTURE_DIR), f))); // discoverFiles returns relative paths, but let's be safe
        // discoverFiles returns paths relative to rootDir.
        expect(files).toContain('main.ts');
        expect(files).toContain('utils.js');
        expect(files).not.toContain('ignored.txt');
    });

    it('should detect languages correctly', () => {
        expect(getLanguage('main.ts')).toBe('TypeScript');
        expect(getLanguage('utils.js')).toBe('JavaScript');
        expect(getLanguage('unknown.foo')).toBe('Other');
    });

    it('should count LOC correctly', async () => {
        const mainTsPath = path.join(FIXTURE_DIR, 'main.ts');
        const counts = await countLoc(mainTsPath, 'TypeScript');
        expect(counts.code).toBe(1);
        expect(counts.comment).toBe(1);
    });

    it('should calculate complexity', async () => {
        // Create a complex file
        const complexFile = `
            function a() {
                if (true) {
                    if (false) {
                        return;
                    }
                }
            }
        `;
        const complexPath = path.join(FIXTURE_DIR, 'complex.js');
        await fs.writeFile(complexPath, complexFile);

        const { calculateComplexity } = await import('../src/core/complexityProxy.js');
        const result = await calculateComplexity(complexPath);

        expect(result.score).toBeGreaterThan(0);
        expect(result.details.funcCount).toBeGreaterThanOrEqual(1);
        expect(result.details.branchCount).toBeGreaterThanOrEqual(2);
    });
});
