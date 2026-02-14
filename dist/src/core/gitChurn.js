import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
const execAsync = util.promisify(exec);
export async function hasGit(cwd) {
    try {
        await fs.stat(path.join(cwd, '.git'));
        return true;
    }
    catch {
        return false;
    }
}
export async function getFileChurn(filepath, cwd) {
    try {
        // We use relative path for git commands usually, but we need to be careful with CWD
        const relativePath = path.relative(cwd, filepath);
        // Get commit count
        // git log --follow --format=oneline <file> | wc -l
        const { stdout: commitStdout } = await execAsync(`git log --follow --format=oneline -- "${relativePath}" | wc -l`, { cwd });
        const commits = parseInt(commitStdout.trim()) || 0;
        // Get author count
        // git log --follow --format="%aN" <file> | sort -u | wc -l
        const { stdout: authorStdout } = await execAsync(`git log --follow --format="%aN" -- "${relativePath}" | sort -u | wc -l`, { cwd });
        const authors = parseInt(authorStdout.trim()) || 0;
        return { commits, authors };
    }
    catch (e) {
        // If git fails (e.g. file not committed yet), return 0
        return { commits: 0, authors: 0 };
    }
}
