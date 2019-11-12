let fs = require("fs");
/**
 * Creates a .tcs file in the given filepath with the given input and output arrays
 */
function createTestCasesFile(inp, op, filepath) {
    console.log("Creating a file at", filepath);
    let ans = [];
    for (var i = 0; i < inp.length; i++) {
        ans.push({
            input: inp[i],
            output: op[i]
        });
    }
    var strings = JSON.stringify(ans);

    try {
        fs.writeFileSync(filepath + ".tcs", strings);
    } catch (err) {
        console.log(err);
        return 1;
    } finally {
        console.log("Done attemting file creation");
    }
    return 0;
}

module.exports = createTestCasesFile;