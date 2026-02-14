#!/usr/bin/env node
import { Command } from 'commander';
import { registerScanCommand } from './commands/scan.js';
import { registerInitCommand } from './commands/init.js';
import { registerBadgeCommand } from './commands/badge.js';
import { registerVersionCommand } from './commands/version.js';
const program = new Command();
program
    .name('codeworth')
    .description('Codebase valuation and maintainability tool')
    .version('1.0.0');
registerScanCommand(program);
registerInitCommand(program);
registerBadgeCommand(program);
registerVersionCommand(program);
program.parse(process.argv);
