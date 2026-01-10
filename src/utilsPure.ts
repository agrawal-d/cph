// Pure javascript utilities, that don't use VS Code API.
// They can still use VS Code type definitions.

export const words_in_text = function (text: string) {
    const regex = /[\p{L}]+|[0-9]+/gu;
    return text.match(regex);
};

/**
 * Converts a string with underscores to PascalCase.
 * Example: "two_sum" -> "TwoSum", "hello_world_123" -> "HelloWorld123"
 * If the result starts with a digit, prefixes with "Problem" (Java class names can't start with numbers).
 * @param input The input string with underscores.
 * @returns PascalCase string without underscores, valid as a Java class name.
 */
export const toPascalCase = (input: string): string => {
    const result = input
        .split('_')
        .map((word) => {
            if (word.length === 0) return '';
            // Check if the word is all digits - keep as is
            if (/^\d+$/.test(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');

    // Java class names cannot start with a number
    if (/^\d/.test(result)) {
        return 'Problem' + result;
    }

    return result;
};

/**
 * Converts a string to an ASCII-safe filename.
 * Non-ASCII characters are replaced with their Unicode code point in hexadecimal format.
 * @param input The input string to convert.
 * @returns An ASCII-safe filename.
 */
export const toAsciiFilename = (input: string): string => {
    return Array.from(input)
        .map((char) => {
            const code = char.charCodeAt(0);
            return code < 128
                ? char
                : `_u${code.toString(16).padStart(4, '0')}`;
        })
        .join('');
};
