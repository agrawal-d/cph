let fs = require("fs");
/**
 * Creates a .testcases file in the given filepath with the given input and output arrays
 */
function createTestCasesFile(inp, op, filepath) {
    console.log("Creating a file at", filepath);
    var strings = "";
    for (var i = 0; i < inp.length; i++) {
        if (i != 0) {
            strings += "-----------------\n";
        }
        strings += "input\n";
        strings += inp[i];
        strings += "output\n";
        strings += op[i];
    }

    try {
        fs.writeFileSync(filepath + ".testcases", strings);
    } catch (err) {
        console.log(err);
        return 1;
    }finally{
        console.log("Done attemting file creation");
    }
    return 0;
}

module.exports = createTestCasesFile;