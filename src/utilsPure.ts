// Pure javascript utilities, that don't use VS Code API.
// They can still use VS Code type definitions.

export const words_in_text = function (text: string) {
    const regex = /[\p{L}]+|[0-9]+/gu;
    return text.match(regex);
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
