const path = require("path");
const preferences = require("./preferencesHelper");
const { getLangugeByFilePath } = require("./utilities");

/**
 * Get compiled file
 * @param filePath complete path to .c, .cpp or .py file
 */
function getBinLocation(filePath) {
  const language = getLangugeByFilePath(filePath);
  if (language === "Python") return filePath + "c";

  const saveSetting = preferences().get("saveLocation");
  let fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filePath + ".bin"
    : path.join(saveSetting, fileName + ".bin");
}

/**
 * @param filePath complete path to .c, .cpp or .py file
 */
function getTestCaseLocation(filePath) {
  const saveSetting = preferences().get("saveLocation");
  let fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);
  return saveSetting.length == 0
    ? filePath + ".tcs"
    : path.join(saveSetting, fileName + ".tcs");
}

module.exports = {
  getBinLocation,
  getTestCaseLocation
};
