/**
 * Parses a .tcs file and returns an object - containing inputs and outputs and no of testcases
 */

const fs = require("fs");

function parseTestCasesFile(sourceCodePath) {
    var filePath = sourceCodePath + ".tcs";
    try { var txt = fs.readFileSync(filePath).toString() }
    catch (err) { console.error(err); return; }
    var tcNum = 0;
    var inpCases = [];
    var opCases = [];
    var lines = txt.split('\n');
    var inInp = false;
    var inOp = false;
    var tc = "";
    for (var line of lines) {
        if (line == "input") {
            if (inOp) {
                opCases.push(tc);
            }
            tc = "";
            inOp = false;
            inInp = true;
        } else if (line == "output") {
            if (inInp) {
                inpCases.push(tc);
            };
            tc = "";
            inInp = false;
            inOp = true;
        } else if (!line.includes("------") && line != "\n") {
            tc += (line + "\n");
        }
    }
    opCases.push(tc);
    var result = {
        inputs: inpCases,
        outputs: opCases,
        numCases: inpCases.length
    }
    return result;

}

module.exports = parseTestCasesFile;