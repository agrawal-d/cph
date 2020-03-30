const config = require('./config');

/**
 * Retrieve extension of file
 * @param {string} filePath complete path to .c, .cpp or .py file
 */
function getExtension(filePath) {
    const fileExtension = filePath
        .split(".")
        .pop()
        .toLowerCase();
    return fileExtension;
}
  
/**
 * Get language based on file extension
 * @param {string} extension c, cpp or py
 */
function getLanguage(extension) {
    for (const [lang, ext] of Object.entries(config.extensions))
        if (ext === extension)
            return lang;
}
  
/**
 * Get language based on the file path
 * @param {string} filePath complete path to .c, .cpp or .py file
 */
function getLangugeByFilePath(filePath) {
    const extension = getExtension(filePath);
    return getLanguage(extension);
}

/**
 * Verifies if url is codeforces
 */
function verifyValidCodeforcesURL(url) {
    if (
        url.includes("https://codeforces.com") ||
        url.includes("http://codeforces.com")
    )
        return true;
    return false;
}

module.exports = {
    getExtension,
    getLanguage,
    getLangugeByFilePath,
    verifyValidCodeforcesURL
}
