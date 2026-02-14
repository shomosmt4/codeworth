import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { Command } from 'commander';
import { registerBadgeCommand } from '../../src/cli/commands/badge.js';
// Mock fs and process.exit
vi.mock('fs/promises');
describe('Badge Command - CI Mode', () => {
    let program;
    let mockExit;
    let mockLog;
    let mockError;
    beforeEach(() => {
        program = new Command();
        registerBadgeCommand(program);
        // Mock process.exit to be a no-op so tests allow "exit" without killing runner
        // @ts-ignore
        mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
            return undefined;
        });
        mockLog = vi.spyOn(console, 'log').mockImplementation(() => { });
        mockError = vi.spyOn(console, 'error').mockImplementation(() => { });
        // Reset fs mocks
        vi.resetAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    // Helper to create a mock report
    const createMockReport = (grade, score) => ({
        maintainability: {
            grade,
            score,
            breakdown: [],
            quickWins: []
        }
    });
    it('should fail if no report is found', async () => {
        // Mock fs.readFile to fail for all attempts
        vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
        vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));
        try {
            await program.parseAsync(['node', 'codeworth', 'badge', '--ci']);
        }
        catch (e) {
            // expected to catch
        }
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Error: Could not find a valid codeworth.report.json'));
    });
    it('should pass if grade meets default threshold (C)', async () => {
        const report = createMockReport('B', 80);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await program.parseAsync(['node', 'codeworth', 'badge', '--ci']);
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Grade: B (80)'));
        expect(mockExit).not.toHaveBeenCalled();
    });
    it('should fail if grade is below default threshold (C)', async () => {
        const report = createMockReport('D', 65);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        try {
            await program.parseAsync(['node', 'codeworth', 'badge', '--ci']);
        }
        catch (e) { }
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Required: Grade >= C'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
    it('should pass if grade meets specified threshold', async () => {
        const report = createMockReport('A', 92);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await program.parseAsync(['node', 'codeworth', 'badge', '--ci', '--min-grade', 'A']);
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
    });
    it('should fail if grade is below specified threshold', async () => {
        const report = createMockReport('B', 85);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        try {
            await program.parseAsync(['node', 'codeworth', 'badge', '--ci', '--min-grade', 'A']);
        }
        catch (e) { }
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Required: Grade >= A'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
    it('should pass if score meets min-score', async () => {
        const report = createMockReport('B', 80);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await program.parseAsync(['node', 'codeworth', 'badge', '--ci', '--min-score', '75']);
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Score >= 75'));
    });
    it('should fail if score is below min-score', async () => {
        const report = createMockReport('B', 80);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        try {
            await program.parseAsync(['node', 'codeworth', 'badge', '--ci', '--min-score', '85']);
        }
        catch (e) { }
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Required: Score >= 85'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
    it('should regenerate badge', async () => {
        const report = createMockReport('A', 95);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        await program.parseAsync(['node', 'codeworth', 'badge', '--ci']);
        // Check that writeFile was called with path and content (ignore 2 arguments vs 3)
        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('.svg'), expect.stringContaining('<svg'));
    });
    it('should regenerate badge even on failure', async () => {
        const report = createMockReport('F', 30);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(report));
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        try {
            await program.parseAsync(['node', 'codeworth', 'badge', '--ci']);
        }
        catch (e) { }
        // Verify fs.writeFile was called
        expect(fs.writeFile).toHaveBeenCalled();
    });
});
