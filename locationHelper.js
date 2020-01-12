const vscode = require("vscode");
const path = require("path");
const preferences = require("./preferencesHelper");

/**
 * @param filepath complete path to .cpp file
 */
function getBinLocation(filepath) {
  const saveSetting = preferences().get("saveLocation");
  let fileName = filepath.substring(filepath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filepath + ".bin"
    : path.join(saveSetting, fileName + ".bin");
}

/**
 * @param filepath complete path to .cpp file
 */
function getTestCaseLocation(filepath) {
  const saveSetting = preferences().get("saveLocation");
  let fileName = filepath.substring(filepath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filepath + ".tcs"
    : path.join(saveSetting, fileName + ".tcs");
}

module.exports = {
  getBinLocation: getBinLocation,
  getTestCaseLocation: getTestCaseLocation
};
