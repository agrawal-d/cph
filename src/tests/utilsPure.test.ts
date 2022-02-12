import { words_in_text } from '../utilsPure';

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
