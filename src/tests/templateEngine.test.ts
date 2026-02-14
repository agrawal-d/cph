globalThis.logger = { ...console };
import { getTemplateContents } from '../templateEngine';
import { Problem } from '../types';

const baseProblem: Problem = {
	name: 'Test Problem',
	url: 'https://example.com/problem/123',
	group: 'Contest 1',
	srcPath: '/workspace/MySolution.java',
	interactive: false,
	memoryLimit: 256,
	timeLimit: 1000,
	tests: [],
};

describe('getTemplateContents', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2025-02-14T12:30:45.000Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('problem metadata placeholders', () => {
		test('replaces PROBLEM_NAME with problem name', () => {
			const template = '// PROBLEM_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// Test Problem');
		});

		test('replaces PROBLEM_FILE_NAME with file basename', () => {
			const template = '// PROBLEM_FILE_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// MySolution.java');
		});

		test('replaces PROBLEM_URL with problem url', () => {
			const template = '// PROBLEM_URL';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// https://example.com/problem/123');
		});

		test('replaces PROBLEM_GROUP with problem group', () => {
			const template = '// PROBLEM_GROUP';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// Contest 1');
		});

		test('replaces all problem metadata in one template', () => {
			const template =
				'PROBLEM_NAME PROBLEM_FILE_NAME PROBLEM_URL PROBLEM_GROUP';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe(
				'Test Problem MySolution.java https://example.com/problem/123 Contest 1',
			);
		});
	});

	describe('CLASS_NAME placeholder', () => {
		test('replaces CLASS_NAME with file basename without extension for Java', () => {
			const template = 'public class CLASS_NAME { }';
			const result = getTemplateContents(template, 'java', baseProblem);
			expect(result).toBe('public class MySolution { }');
		});

		test('does not replace CLASS_NAME for non-Java extension', () => {
			const template = '// CLASS_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// CLASS_NAME');
		});

		test('Java template with CLASS_NAME and problem metadata', () => {
			const template = 'class CLASS_NAME { // PROBLEM_NAME }';
			const result = getTemplateContents(template, 'java', baseProblem);
			expect(result).toBe('class MySolution { // Test Problem }');
		});
	});

	describe('date and time placeholders', () => {
		test('replaces CURRENT_YEAR', () => {
			const template = '// CURRENT_YEAR';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 2025');
		});

		test('replaces CURRENT_YEAR_SHORT', () => {
			const template = '// CURRENT_YEAR_SHORT';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 25');
		});

		test('replaces CURRENT_MONTH with two digits', () => {
			const template = '// CURRENT_MONTH';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 02');
		});

		test('replaces CURRENT_MONTH_NAME', () => {
			const template = '// CURRENT_MONTH_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// February');
		});

		test('replaces CURRENT_MONTH_NAME_SHORT', () => {
			const template = '// CURRENT_MONTH_NAME_SHORT';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// Feb');
		});

		test('replaces CURRENT_DATE with two digits', () => {
			const template = '// CURRENT_DATE';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 14');
		});

		test('replaces CURRENT_DAY_NAME', () => {
			const template = '// CURRENT_DAY_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toMatch(
				/^\/\/ (Friday)$/,
			);
		});

		test('replaces CURRENT_DAY_NAME_SHORT', () => {
			const template = '// CURRENT_DAY_NAME_SHORT';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toMatch(
				/^\/\/ (Fri)$/,
			);
		});

		test('replaces CURRENT_HOUR_24', () => {
			const template = '// CURRENT_HOUR_24';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 12');
		});

		test('replaces CURRENT_HOUR_12', () => {
			const template = '// CURRENT_HOUR_12';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 12');
		});

		test('replaces CURRENT_HOUR_AM_PM', () => {
			const template = '// CURRENT_HOUR_AM_PM';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// PM');
		});

		test('replaces CURRENT_MINUTE and CURRENT_SECOND', () => {
			const template = '// CURRENT_MINUTE CURRENT_SECOND';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('// 30 45');
		});

		test('replaces CURRENT_SECONDS_UNIX', () => {
			const template = '// CURRENT_SECONDS_UNIX';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toMatch(/^\/\/ \d+$/);
		});

		test('replaces CURRENT_TIMEZONE_OFFSET with +/-HH:MM format', () => {
			const template = '// CURRENT_TIMEZONE_OFFSET';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toMatch(/^\/\/ [+-]\d{2}:\d{2}$/);
		});
	});

	describe('edge cases', () => {
		test('returns empty string for empty template', () => {
			const result = getTemplateContents('', 'cpp', baseProblem);
			expect(result).toBe('');
		});

		test('leaves template unchanged when it has no placeholders', () => {
			const template = 'just some code\n// no placeholders';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe(template);
		});

		test('replaces only first occurrence of each placeholder (replace is not replaceAll)', () => {
			const template = 'PROBLEM_NAME and PROBLEM_NAME';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('Test Problem and PROBLEM_NAME');
		});

		test('special key 0 is not replaced (no switch case)', () => {
			const template = 'cursor at 0';
			const result = getTemplateContents(template, 'cpp', baseProblem);
			expect(result).toBe('cursor at 0');
		});
	});
});
