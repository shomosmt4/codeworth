import fs from 'fs/promises';
import path from 'path';
export const hygieneChecks = [
    { score: 5, note: 'README exists', condition: (f) => !!f.find(n => /^readme/i.test(n)) },
    { score: 3, note: 'LICENSE exists', condition: (f) => !!f.find(n => /^license/i.test(n)) },
    { score: 5, note: 'CONTRIBUTING exists', condition: (f) => !!f.find(n => /^contributing/i.test(n)) },
    {
        score: 5,
        note: 'Issue templates detected',
        condition: async (_, root) => fs.stat(path.join(root, '.github/ISSUE_TEMPLATE')).then(() => true).catch(() => false)
    },
    {
        score: 5,
        note: 'CI config detected',
        condition: async (_, root) => {
            const gh = fs.stat(path.join(root, '.github/workflows')).then(() => true).catch(() => false);
            const circle = fs.stat(path.join(root, '.circleci')).then(() => true).catch(() => false);
            const travis = fs.stat(path.join(root, '.travis.yml')).then(() => true).catch(() => false);
            return (await gh) || (await circle) || (await travis);
        }
    }
];
export const testingChecks = (scanResult) => [
    {
        score: 5,
        note: 'Tests directory exists',
        condition: async (_, root) => {
            return fs.stat(path.join(root, 'test')).then(() => true).catch(() => fs.stat(path.join(root, 'tests')).then(() => true).catch(() => false));
        }
    },
    {
        score: 5,
        note: 'Test files detected',
        condition: () => scanResult.files.some(f => f.path.includes('.test.') || f.path.includes('.spec.'))
    },
    {
        score: 5,
        note: 'Test runner config detected',
        condition: (f) => f.includes('vitest.config.ts') || f.includes('jest.config.js')
    },
    {
        score: 5,
        note: 'Coverage reports detected',
        condition: async (_, root) => fs.stat(path.join(root, 'coverage')).then(() => true).catch(() => false)
    }
];
