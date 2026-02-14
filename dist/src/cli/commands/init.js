import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
export function registerInitCommand(program) {
    program
        .command('init')
        .description('Initialize Codeworth configuration')
        .action(async () => {
        const ignorePath = path.resolve('.codeworthignore');
        const defaultIgnore = `# Codeworth Ignore List
node_modules
dist
build
coverage
reports
.next
.vercel
.git
`;
        try {
            await fs.access(ignorePath);
            console.log(chalk.yellow('.codeworthignore already exists.'));
        }
        catch {
            await fs.writeFile(ignorePath, defaultIgnore);
            console.log(chalk.green('Created .codeworthignore'));
        }
    });
}
