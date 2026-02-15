#!/usr/bin/env node

import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Configuration
const DEFAULT_RATE = 10.77;
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.idea', '.vscode', '.next', 'target']);
const IGNORED_FILES = new Set(['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']);
const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.mp3', '.mp4', '.wav', '.mov', '.avi',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.pyc', '.class', '.jar'
]);

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

// Check if file is likely binary
const isBinary = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return true;

    try {
        const buffer = fs.readFileSync(filePath); // Read full file to avoid complexity, or just first chunk
        // Check first 1024 bytes for null byte
        const checkLength = Math.min(buffer.length, 1024);
        for (let i = 0; i < checkLength; i++) {
            if (buffer[i] === 0) return true;
        }
        return false;
    } catch (e) {
        return true; // Treat unreadable as binary/skip
    }
};

// Count lines in a file
const countLines = (filePath) => {
    if (isBinary(filePath)) return 0;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.split(/\r\n|\r|\n/).length;
    } catch (e) {
        return 0;
    }
};

// Recursively scan directory
const scanDirectory = (dir) => {
    let totalLines = 0;
    let fileCount = 0;

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const resPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    const result = scanDirectory(resPath);
                    totalLines += result.lines;
                    fileCount += result.files;
                }
            } else if (entry.isFile()) {
                if (!IGNORED_FILES.has(entry.name)) {
                    const lines = countLines(resPath);
                    totalLines += lines;
                    fileCount++;
                }
            }
        }
    } catch (e) {
        // Ignore access errors
    }

    return { lines: totalLines, files: fileCount };
};

// Main execution
const main = () => {
    const args = process.argv.slice(2);

    // Check query args
    let loc = null;
    let rate = DEFAULT_RATE;
    let showHelp = false;

    // Simple arg parsing
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
        } else if (arg === '--help' || arg === '-h') {
            showHelp = true;
        } else if (!isNaN(parseInt(arg.replace(/,/g, ''), 10)) && loc === null) {
            loc = parseInt(arg.replace(/,/g, ''), 10);
        }
    }

    if (showHelp) {
        console.log(`
Usage: codeworth [lines-of-code] [options]

Arguments:
  [lines-of-code]  Total lines of code (numeric). If omitted, scans current directory.

Options:
  --rate <number>  Override rate per line (default: ${DEFAULT_RATE})
  --help           Show this help message

Example:
  codeworth           # Auto-scan current directory
  codeworth 26024     # Calculate for specific LOC
  codeworth --rate 15 # Auto-scan with custom rate
`);
        process.exit(0);
    }

    // Auto-scan if no LOC provided
    if (loc === null) {
        console.log('Scanning current directory...');
        const result = scanDirectory(process.cwd());
        loc = result.lines;
        console.log(`Scanned ${formatNumber(result.files)} files.`);
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
