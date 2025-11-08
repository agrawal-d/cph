globalThis.logger = { ...console };
import { words_in_text } from '../utilsPure';

describe('problem name parser', () => {
    test('mix of latin, non latin and numbers', () => {
        const output = ['apple', '12345', 'mango', 'India', 'こんにちは', '7'];
        const input = 'apple 12345 mango India こんにちは 7';
        expect(words_in_text(input, '[\\p{L}]+|[0-9]+')).toEqual(output);
    });

    test('just a number', () => {
        const output = ['23'];
        const input = '23';
        expect(words_in_text(input, '[\\p{L}]+|[0-9]+')).toEqual(output);
    });

    test('just a word', () => {
        const output = ['grapes'];
        const input = 'grapes';
        expect(words_in_text(input, '[\\p{L}]+|[0-9]+')).toEqual(output);
    });

    test('word and number', () => {
        const output = ['grapes', '1'];
        const input = 'grapes1';
        expect(words_in_text(input, '[\\p{L}]+|[0-9]+')).toEqual(output);
    });

    test('mix of latin, non latin, numbers, and apostrophes', () => {
        const output = [
            "apple's",
            '12345',
            "mango's",
            "India's",
            "こん'に'ち'は",
            '7',
        ];
        const input = "apple's 12345 mango's India's こん'に'ち'は 7";
        expect(words_in_text(input, "[\\p{L}']+|[0-9']+")).toEqual(output);
    });

    test('number and apostrophe', () => {
        const output = ["2'3"];
        const input = "2'3";
        expect(words_in_text(input, "[\\p{L}']+|[0-9']+")).toEqual(output);
    });

    test('word and apostrophe', () => {
        const output = ["grape's"];
        const input = "grape's";
        expect(words_in_text(input, "[\\p{L}']+|[0-9']+")).toEqual(output);
    });

    test('word and number and apostrophes', () => {
        const output = ["grape's", "1's"];
        const input = "grape's 1's";
        expect(words_in_text(input, "[\\p{L}0-9']+")).toEqual(output);
    });
});
