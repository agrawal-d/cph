const fs = require("fs");
/**
 * Parses a .tcs file and returns an object - containing inputs and outputs and no of testcases
 * @param sourceCodePath path to the .cpp file
 */
function parseTestCasesFile(sourceCodePath) {
    var filePath = sourceCodePath + ".tcs";
    try { var txt = fs.readFileSync(filePath).toString() }
    catch (err) { console.error(err); return; }
    var tcNum = 0;
    var inpCases = [];
    var opCases = [];
    console.log(txt);
    const tcs = JSON.parse(txt);
    return tcs;

}

module.exports = parseTestCasesFile;