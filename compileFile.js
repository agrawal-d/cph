const { spawn } = require("child_process");
const preferences = require("./preferencesHelper");
const path = require("path");
const locationHelper = require("./locationHelper");

// compile the file and return a promise with the result/error
function compileFile(filepath, oc) {
    let promise = new Promise((resolve, reject) => {
        const fileExtension = filepath
            .split(".")
            .pop()
            .toLowerCase();

        let flags = preferences.get("compilationFlags" + fileExtension).split(" ");
        let compilationError = false;
        if (flags[0] === "") {
            flags = [];
        }
        const saveSetting = preferences.get("saveLocation");
        let fileName = filepath.substring(filepath.lastIndexOf(path.sep) + 1);
        const outputLocation = locationHelper.getBinLocation(filepath);
        flags = [filepath, "-o", outputLocation].concat(flags);
        let compiler; // type of compiler ( g++ or gcc )
        switch (fileExtension) {
            case "cpp":
                compiler = "g++";
                break;
            case "c":
                compiler = "gcc";
                break;
        }
        console.log("gcc/g++ flags", flags);
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

