const { spawn } = require("child_process");
const { getLangugeByFilePath } = require('./utilities');
const { getBinLocation } = require('./locationHelper');
const config = require('./config');

/**
 * Execute an executable file
 * @param {string} filePath bin or .py
 * @param {object} options e.g. timeout
 */
function execFile(filePath, options = {}) {
    const language = getLangugeByFilePath(filePath);
    if (language === 'Python')
        return spawn(config.compilers[language], [filePath], options)
    
    const binPath = getBinLocation(language, filePath);
    return spawn(binPath, options);
}

// kills all spawned process
function killAll(stack) {
    console.log("Killing all spawns");
    stack.forEach(proc => proc.kill());
}

/**
 * Create timeout to kill the process
 * @param {*} process 
 * @param {number} timeout
 * @param {object} info
 */
function setKiller(process, timeout, info = {}) {
    return setTimeout(() => {
        console.log(`${timeout} sec killed process`, info);
        process.kill();
    }, timeout);
}

/**
 * Get rid of created binary
 * @param {string} filePath bin or .py
 */
function removeBin(filePath) {
    const language = getLangugeByFilePath(filePath);
    if (language === 'Python')
        return

    const binPath = getBinLocation(language, filePath);    
    spawn("rm", [binPath]);
    spawn("del", [binPath]);
}

module.exports = {
    execFile,
    killAll,
    setKiller,
    removeBin
}
