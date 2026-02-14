import fastGlob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
const DEFAULT_IGNORES = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'reports',
    '.next',
    '.vercel',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '*.min.*'
];
export async function discoverFiles(options) {
    const rootDir = path.resolve(options.path);
    const ignoreFilter = ignore();
    // 1. Add default ignores
    ignoreFilter.add(DEFAULT_IGNORES);
    // Add internal codeworth artifacts to ignore
    ignoreFilter.add([
        'codeworth.report.json',
        'codeworth.report.md',
        'badge.svg'
    ]);
    // If outdir is inside rootDir, ignore it
    if (options.outdir) {
        const absOut = path.resolve(options.outdir);
        // Check if absOut is inside rootDir
        if (absOut.startsWith(rootDir) && absOut !== rootDir) {
            const relativeOut = path.relative(rootDir, absOut);
            ignoreFilter.add(relativeOut);
            // Ensure we ignore the directory contents too
            ignoreFilter.add(path.join(relativeOut, '**'));
        }
    }
    // 2. Add .gitignore if exists
    try {
        const gitignorePath = path.join(rootDir, '.gitignore');
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        ignoreFilter.add(gitignoreContent);
    }
    catch (e) {
        // No .gitignore, that's fine
    }
    // 3. Add .codeworthignore if exists
    try {
        const codeworthignorePath = path.join(rootDir, '.codeworthignore');
        const cwIgnoreContent = await fs.readFile(codeworthignorePath, 'utf-8');
        ignoreFilter.add(cwIgnoreContent);
    }
    catch (e) {
        // No .codeworthignore, that's fine
    }
    // 4. Add CLI excludes
    if (options.exclude && options.exclude.length > 0) {
        ignoreFilter.add(options.exclude);
    }
    // glob needs forward slashes even on windows for patterns
    const globPattern = '**/*';
    const files = await fastGlob(globPattern, {
        cwd: rootDir,
        dot: true, // include dotfiles
        onlyFiles: true,
        ignore: DEFAULT_IGNORES // fast-glob can handle some basic ignores too, but we filter manually for full gitignore support
    });
    // Filter using ignore package
    return files.filter(f => !ignoreFilter.ignores(f));
}
