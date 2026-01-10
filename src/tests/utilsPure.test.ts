globalThis.logger = { ...console };
import { words_in_text, toPascalCase } from '../utilsPure';

describe('problem name parser', () => {
    test('mix of latin, non latin and numbers', () => {
        const output = ['apple', '12345', 'mango', 'India', 'こんにちは', '7'];
        const input = 'apple 12345 mango India こんにちは 7';
        expect(words_in_text(input)).toEqual(output);
    });

    test('just a number', () => {
        const output = ['23'];
        const input = '23';
        expect(words_in_text(input)).toEqual(output);
    });

    test('just a word', () => {
        const output = ['grapes'];
        const input = 'grapes';
        expect(words_in_text(input)).toEqual(output);
    });
});

describe('toPascalCase', () => {
    test('converts underscore-separated words to PascalCase', () => {
        expect(toPascalCase('two_sum')).toBe('TwoSum');
    });

    test('handles multiple words', () => {
        expect(toPascalCase('hello_world_test')).toBe('HelloWorldTest');
    });

    test('handles single word', () => {
        expect(toPascalCase('hello')).toBe('Hello');
    });

    test('handles mixed case input', () => {
        expect(toPascalCase('HELLO_WORLD')).toBe('HelloWorld');
    });

    test('preserves numbers as-is', () => {
        expect(toPascalCase('problem_123_test')).toBe('Problem123Test');
    });

    test('prefixes with Problem when result starts with number', () => {
        expect(toPascalCase('123_456')).toBe('Problem123456');
    });

    test('prefixes single number with Problem', () => {
        expect(toPascalCase('123')).toBe('Problem123');
    });

    test('prefixes when starts with number followed by words', () => {
        expect(toPascalCase('123_hello_world')).toBe('Problem123HelloWorld');
    });

    test('handles empty string', () => {
        expect(toPascalCase('')).toBe('');
    });

    test('handles consecutive underscores', () => {
        expect(toPascalCase('hello__world')).toBe('HelloWorld');
    });

    test('handles real problem names', () => {
        expect(toPascalCase('A_Watermelon')).toBe('AWatermelon');
        expect(toPascalCase('Two_Sum')).toBe('TwoSum');
        expect(toPascalCase('Binary_Search_Tree')).toBe('BinarySearchTree');
    });
});
