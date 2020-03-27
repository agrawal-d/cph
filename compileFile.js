const { spawn } = require("child_process");
const preferences = require("./preferencesHelper");
const path = require("path");
const locationHelper = require("./locationHelper");
const config = require("./config")

function getLanguage(extension) {
    for (const [lang, ext] of Object.entries(config.extensions))
        if (ext === extension)
            return lang;
}

function getFlags(language, path) {
    const ext = config.extensions[language];
    let flags = preferences().get("compilationFlags" + ext).split(" ");
    if (flags[0] === "")
        flags = [];

    if (language === 'Python')
        flags = [path, ...flags];
    else {
        // type of compiler ( g++ or gcc )
        const outputLocation = locationHelper.getBinLocation(path);
        flags = [path, "-o", outputLocation, ...flags];
    }
    return flags
}

// compile the file and return a promise with the result/error
function compileFile(filepath, oc) {
    let promise = new Promise((resolve, reject) => {
        const fileExtension = filepath
            .split(".")
            .pop()
            .toLowerCase();
        
        const language = getLanguage(fileExtension);
        const compiler = config.compilers[language];
        const flags = getFlags(language, filepath);
        console.log(`${compiler} flags`, flags);

        const saveSetting = preferences().get("saveLocation");
        let fileName = filepath.substring(filepath.lastIndexOf(path.sep) + 1);

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

