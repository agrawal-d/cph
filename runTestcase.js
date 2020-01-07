const { spawn } = require('child_process');
const fs = require("fs");

function runTestcase(filepath, stdin, stdout_expected, timeout = 10000) {
    let evalResults = new Promise((resolve, reject) => {

        let stdout_got = "";

        try {
            fs.accessSync(filepath + ".bin")
        } catch (err) {
            reject({
                type: "no-file",
                error: err
            });

        }

        let spawned_process = spawn((filepath + '.bin'), {
            timeout: 10000
        });
        let tm = Date.now();

        spawned_process.stdin.write(stdin + "\n");

        let killer = setTimeout(() => {
            console.log("10 sec killed process");
            spawned_process.kill();
        }, timeout);

        spawned_process.stdout.on('data', (data) => {
            stdout_got += data.toString();
        })

        spawned_process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            stdout_got += data.toString();
        });

        spawned_process.on('exit', (code, signal) => {
            let tm2 = Date.now();
            console.log("Execution done with code", code, " with signal ", signal);
            if (signal || code != 0) {
                reject({
                    type: "signal",
                    code: code,
                    signal: signal
                });
            } else {
                resolve(stdout_got);
            }
            clearTimeout(killer);
        })
    })

    return evalResults;
}

module.exports = runTestcase;
