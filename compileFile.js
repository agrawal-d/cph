const { spawn } = require("child_process");
const preferences = require("./preferencesHelper");
const path = require("path");
const { getBinLocation } = require("./locationHelper");
const config = require("./config");
const { getLangugeByFilePath } = require('./utilities');

/**language
 * Get flags which needed for compile based on language
 * @param {string} filePath complete path to .c, .cpp or .py file
 */
function getFlags(filePath) {
    const language = getLangugeByFilePath(filePath);
    const ext = config.extensions[language];
    let flags = preferences().get("compilationFlags" + ext).split(" ");
    if (flags[0] === "")
        flags = [];

    if (language === 'Python'){
        /**
         * python3
         * 
         * -m compileall    Searches sys.path for the 'compileall' module and runs it as a script
         * -b               Causes bytecode to be written to their legacy location rather than '__pycache__'
         */
        flags = ['-m', 'compileall', '-b', filePath, ...flags];
    } else {
        /**
         * g++ & gcc
         * 
         * -o outputLocation    Place output in 'outputLocation' file
         */
        const outputLocation = getBinLocation(filePath);
        flags = [filePath, "-o", outputLocation, ...flags];
    }
    return flags
}

// compile the file and return a promise with the result/error
function compileFile(filePath, oc) {
    let promise = new Promise((resolve, reject) => {
        const language = getLangugeByFilePath(filePath);
        if (language === 'Python')
            resolve("OK")

        const compiler = config.compilers[language];
        const flags = getFlags(filePath);
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
