const vscode = require("vscode");
const path = require("path");
const preferences = require("./preferencesHelper");

/**
 * @param filePath complete path to .cpp file
 */
function getBinLocation(language, filePath) {
  if (language == 'Python')
    return `${filePath}c`

  const saveSetting = preferences().get("saveLocation");
  let fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filePath + ".bin"
    : path.join(saveSetting, fileName + ".bin");
}

/**
 * @param filePath complete path to .cpp file
 */
function getTestCaseLocation(filePath) {
  const saveSetting = preferences().get("saveLocation");
  let fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filePath + ".tcs"
    : path.join(saveSetting, fileName + ".tcs");
}

module.exports = {
  getBinLocation: getBinLocation,
  getTestCaseLocation: getTestCaseLocation
};
