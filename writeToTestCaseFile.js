const fs = require("fs");
function writeToTestCaseFile(string, filePathWithoutExtension) {
    try {
        fs.writeFileSync(
            filePathWithoutExtension + ".tcs", string
        )
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

module.exports = writeToTestCaseFile;