import { describe, it, expect } from 'vitest';
import { generateBadgeSvg, getGradeColor, formatCurrency } from '../src/core/badgeGenerator.js';
describe('Badge Generator', () => {
    describe('getGradeColor', () => {
        it('returns correct colors for grades', () => {
            expect(getGradeColor('A+')).toBe('#16a34a');
            expect(getGradeColor('A')).toBe('#22c55e');
            expect(getGradeColor('B')).toBe('#14b8a6');
            expect(getGradeColor('C')).toBe('#f59e0b');
            expect(getGradeColor('D')).toBe('#ea580c');
            expect(getGradeColor('F')).toBe('#dc2626');
            expect(getGradeColor('Z')).toBe('#737373'); // Default
        });
    });
    describe('formatCurrency', () => {
        it('formats small numbers correctly', () => {
            expect(formatCurrency(500)).toBe('$500');
            expect(formatCurrency(999)).toBe('$999');
        });
        it('formats thousands correctly', () => {
            expect(formatCurrency(1000)).toBe('$1K');
            expect(formatCurrency(1500)).toBe('$1.5K');
            expect(formatCurrency(12400)).toBe('$12.4K');
            expect(formatCurrency(100000)).toBe('$100K');
        });
        it('formats millions correctly', () => {
            expect(formatCurrency(1000000)).toBe('$1M');
            expect(formatCurrency(1500000)).toBe('$1.5M');
            expect(formatCurrency(4200000)).toBe('$4.2M');
        });
    });
    describe('generateBadgeSvg', () => {
        it('generates a valid SVG string', () => {
            const svg = generateBadgeSvg({
                label: 'TestLabel',
                valueText: 'A (100)',
                color: '#000000'
            });
            expect(svg).toContain('<svg');
            expect(svg).toContain('TestLabel');
            expect(svg).toContain('A (100)');
            expect(svg).toContain('fill="#000000"');
        });
        it('matches snapshot', () => {
            const svg = generateBadgeSvg({
                label: 'Codeworth',
                valueText: 'A+ (95)',
                color: '#16a34a'
            });
            expect(svg).toMatchSnapshot();
        });
    });
});
