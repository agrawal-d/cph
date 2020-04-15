const fs = require("fs");
const locationHelper = require("./locationHelper");
function writeToTestCaseFile(string, filepath) {
  try {
    fs.writeFileSync(locationHelper.getTestCaseLocation(filepath), string);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

module.exports = writeToTestCaseFile;
