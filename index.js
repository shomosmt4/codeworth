#!/usr/bin/env node

import process from 'node:process';

// Configuration
const DEFAULT_RATE = 10.77;

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};

// Helper to format numbers
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

// Main execution
const main = () => {
    const args = process.argv.slice(2);

    // Help / Usage
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: codeworth <lines-of-code> [options]

Arguments:
  <lines-of-code>  Total lines of code (numeric)

Options:
  --rate <number>  Override rate per line (default: ${DEFAULT_RATE})
  --help           Show this help message

Example:
  codeworth 26024
  codeworth 50000 --rate 15
`);
        process.exit(args.length === 0 ? 1 : 0);
    }

    // Parse arguments
    let loc = null;
    let rate = DEFAULT_RATE;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--rate') {
            const nextArg = args[i + 1];
            if (!nextArg || isNaN(parseFloat(nextArg))) {
                console.error('Error: --rate requires a valid number');
                process.exit(1);
            }
            rate = parseFloat(nextArg);
            i++; // Skip next arg
        } else if (!isNaN(parseInt(arg.replace(/,/g, ''), 10)) && loc === null) {
            loc = parseInt(arg.replace(/,/g, ''), 10);
        }
    }

    if (loc === null) {
        console.error('Error: Please provide a valid number for lines of code.');
        process.exit(1);
    }

    // Calculate
    const valuation = loc * rate;

    // Output
    console.log('-----------------------------------');
    console.log('CodeWorth CLI');
    console.log('-----------------------------------');
    console.log(`Lines of Code: ${formatNumber(loc)}`);
    console.log(`Rate Per Line: $${rate.toFixed(2)}`);
    console.log(`Estimated Valuation: ${formatCurrency(valuation)}`);
    console.log('-----------------------------------');
};

main();
