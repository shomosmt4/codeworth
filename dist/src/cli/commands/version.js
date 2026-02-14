import os from 'os';
import chalk from 'chalk';
export function registerVersionCommand(program) {
    program
        .command('version')
        .description('Display detailed version information')
        .action(() => {
        console.log(chalk.bold('Codeworth CLI'));
        console.log(`Version:     1.0.0`); // Hardcoded for now as reading package.json can be tricky in dist
        console.log(`Node:        ${process.version}`);
        console.log(`OS:          ${os.platform()} ${os.release()}`);
        console.log(`Arch:        ${os.arch()}`);
    });
}
