const { spawn } = require("child_process");
const { getLangugeByFilePath } = require("./utilities");
const { getBinLocation } = require("./locationHelper");
const config = require("./config");

/**
 * Execute an executable file
 * @param {string} filePath bin or .py
 * @param {object} options
 */
function execFile(filePath, options = {}) {
  const language = getLangugeByFilePath(filePath);
  const opts = { ...options, timeout: config.timeout };

  if (language === "Python")
    return spawn(config.compilers[language], [filePath], opts);

  console.log("filePath", filePath);
  const binPath = getBinLocation(filePath);
  return spawn(binPath, opts);
}

// kills all spawned process
function killAll(stack) {
  console.log("Killing all spawns");
  stack.forEach(proc => proc.kill());
}

/**
 * Create timeout to kill the process
 * @param {*} process
 * @param {object} info
 */
function setKiller(process, info = {}) {
  return setTimeout(() => {
    console.log(`${config.timeout} sec killed process`, info);
    process.kill();
  }, config.timeout);
}

/**
 * Get rid of created bin if exists
 * @param {string} filePath bin or .py
 */
function removeBin(filePath) {
  const binPath = getBinLocation(filePath);
  console.log("Deleting binary at", binPath, "for source code", filePath);
  if (binPath) {
    spawn("rm", [binPath]);
    spawn("del", [binPath]);
  }
}

module.exports = {
  execFile,
  killAll,
  setKiller,
  removeBin
};
