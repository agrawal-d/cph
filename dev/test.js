const runTestcase = require("../runTestcase");

async function dev() {
    try {
        let result = await runTestcase("/home/divyanshu/programming/competitive/file", "3", "");
        console.log("Result", result);
    } catch (err) {
        console.error(err);
    }
    return;
}

dev();