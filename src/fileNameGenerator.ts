const getCodeforcesProblemId = (url: string): string => {
    const match = url.match(/problem\/(\d+)\/([A-Za-z0-9]+)/);

    if (!match) {
        return '';
    }

    return `${match[1]}${match[2]}`;
};

export const getCodeforcesFileName = (
    problemName: string,
    problemUrl: string,
    style: string,
    useShortCodeforcesName: boolean,
    ext: string,
): string => {
   const cfId = getCodeforcesProblemId(problemUrl);

    const cleanName = problemName.replace(/^[A-Z][0-9]*\.\s*/, '');

    const originalFile = problemName.replace(/\W+/g, '_');
    const cleanFile = cleanName.replace(/\W+/g, '_');

    if (style === 'shortcode') {
        return `${cfId}.${ext}`;
    }

    if (style === 'both') {
        return `${cfId}_${cleanFile}.${ext}`;
    }

    if (style === 'name') {
        return `${originalFile}.${ext}`;
    }

    // legacy mode
    if (useShortCodeforcesName) {
        return `${cfId}.${ext}`;
    }

    return `${originalFile}.${ext}`;
};
