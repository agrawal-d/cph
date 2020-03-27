const { spawn } = require("child_process");
const preferences = require("./preferencesHelper");
const path = require("path");
const locationHelper = require("./locationHelper");
const config = require("./config")

function getFlags(language, filePath) {
    const ext = config.extensions[language];
    let flags = preferences().get("compilationFlags" + ext).split(" ");
    if (flags[0] === "")
        flags = [];

    if (language === 'Python')
        flags = ['-m', 'compileall', '-b', filePath, ...flags];
    else {
        // type of compiler ( g++ or gcc )
        const outputLocation = locationHelper.getBinLocation(language, filePath);
        flags = [filePath, "-o", outputLocation, ...flags];
    }
    return flags
}

// compile the file and return a promise with the result/error
function compileFile(language, filePath, oc) {
    let promise = new Promise((resolve, reject) => {
        const compiler = config.compilers[language];
        const flags = getFlags(language, filePath);
        console.log(`${compiler} flags`, flags);

        const saveSetting = preferences().get("saveLocation");
        let fileName = filePath.substring(filePath.lastIndexOf(path.sep) + 1);

        let compilationError = false;
        const compilerProcess = spawn(compiler, flags);
        compilerProcess.stdout.on("data", data => {
            console.log(`stdout: ${data}`);
        });
        compilerProcess.stderr.on("data", data => {
            oc.clear();
            oc.append("Errors while compiling\n" + data.toString());
            oc.show();
            compilationError = true;
        });
        compilerProcess.on("exit", async exitCode => {
            if (!compilationError) {
                resolve("OK")
            }
            console.log(`Compiler exited with code ${exitCode}`);
            reject(exitCode);
        });
    })
    
    return promise;
}

module.exports = compileFile;
