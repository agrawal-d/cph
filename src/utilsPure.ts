export const words_in_text = function (text: string) {
    const regex = /[\p{L}-]+|[0-9]+/gu;
    return text.match(regex);
};
