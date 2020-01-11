const { spawn } = require("child_process");
const preferences = require("./preferencesHelper");
const path = require("path");
const locationHelper = require("./locationHelper");

// compile the file and return a promise with the result/error
function compileFile(filepath, oc) {
    let promise = new Promise((resolve, reject) => {
        try {
            fs.accessSync(locationHelper.getTestCaseLocation(filepath));
        } catch (err) {
            let html = downloadCodeforcesPage(codeforcesURL);
            html
                .then(string => {
                    const [inp, op] = parseCodeforces(string);
                    createTestacesFile(inp, op, locationHelper.getTestCaseLocation(filepath));
                    runTestCases(0);
                })
                .catch(err => {
                    console.error("Error", err);
                });
            return;
        }

        if (caseNum == 0) {
            startWebView();
            cases = parseTestCasesFile(locationHelper.getTestCaseLocation(filepath));
            if (!cases || !cases.inputs || cases.inputs.length === 0) {
                displayResults([], true, filepath);
                return;
            }
            resultsPanel.webview.html =
                "<html><body><p style='margin:10px'>Runnung Testcases ...</p><p>If this message does not change in 10 seconds, it means an error occured. Please contact developer.<p/></body></html>";
        } else if (caseNum == cases.numCases) {
            return;
        }
        let exec = [];
        let stdoutlen = 0;
        let spawned_process = spawn(locationHelper.getBinLocation(filepath), {
            timeout: 10000
        });
        // Creates a 10 second timeout to kill the spawned process.
        setTimeout(() => {
            console.log("10 sec killed process - ", caseNum);
            spawned_process.kill();
        }, 10000);
        let tm = Date.now();
        spawned_process.stdin.write(cases.inputs[caseNum] + "\n");
        spawned_process.stdout.on("data", data => {
            if (stdoutlen > 10000) {
                startWebView();
                console.log("STDOUT length >10000");
                resultsPanel.webview.html =
                    "<html><body><p style='margin:10px'>Your code is outputting more data than can be displayed. It is possibly stuck in an infinite loop. <br><br><b>All testcases failed.</b></p></body></html>";
                return;
            }
            console.log("Go stdout", data);
            let ans = data.toString();
            let tm2 = Date.now();
            let time = tm2 - tm;
            ans = ans.replace(/\r?\n|\r/g, "\n");
            cases.outputs[caseNum] = cases.outputs[caseNum].replace(
                /\r?\n|\r/g,
                "\n"
            );
            let stripped_case = cases.outputs[caseNum].replace(/\r?\n|\r| /g, "");
            let stripped_ans = ans.replace(/\s|\n|\r\n|\r| /g, "");
            if (stripped_ans == stripped_case) {
                passed_cases[caseNum] = {
                    passed: true,
                    time: time,
                    output: ans.trim(),
                    input: cases.inputs[caseNum].trim(),
                    expected: cases.outputs[caseNum].trim(),
                    got: ans.trim()
                };
            } else {
                passed_cases[caseNum] = {
                    passed: false,
                    time: time,
                    output: ans.trim(),
                    input: cases.inputs[caseNum].trim(),
                    expected: cases.outputs[caseNum].trim(),
                    got: ans.trim()
                };
            }
            if (caseNum == cases.numCases - 1) {
                displayResults(passed_cases, true, filepath);
                spawn("rm", [locationHelper.getBinLocation(filepath)]);
                spawn("del", [locationHelper.getBinLocation(filepath)]);
            } else {
                displayResults(passed_cases, false);
            }
        });
        spawned_process.stderr.on("data", data => {
            console.error(`stderr: ${data}`);
            oc.clear();
            oc.appendLine("STDERR:");
            oc.appendLine(data);
        });

        spawned_process.on("exit", (code, signal) => {
            let tm2 = Date.now();
            console.log(
                "Execution done with code",
                code,
                " with signal ",
                signal,
                "for process ",
                caseNum
            );
            if (signal || code != 0) {
                passed_cases[caseNum] = {
                    passed: false,
                    time: tm2 - tm,
                    output: `Runtime error. Exit signal ${signal}. Exit code ${code}.`,
                    input: cases.inputs[caseNum].trim(),
                    expected: cases.outputs[caseNum].trim(),
                    got: `Runtime error. Exit signal ${signal}. Exit code ${code}.`
                };
                if (caseNum == cases.numCases - 1) {
                    displayResults(passed_cases, true, filepath);
                } else {
                    displayResults(passed_cases, false, filepath);
                }
            } else {
                let tm2 = Date.now();
                if (!passed_cases[caseNum]) {
                    passed_cases[caseNum] = {
                        passed: cases.outputs[caseNum].trim().length == 0,
                        time: tm2 - tm,
                        output: "",
                        input: cases.inputs[caseNum].trim(),
                        expected: cases.outputs[caseNum].trim(),
                        got: ""
                    };
                    if (caseNum == cases.numCases - 1) {
                        displayResults(passed_cases, true, filepath);
                    } else {
                        displayResults(passed_cases, false, filepath);
                    }
                }
            }
            runTestCases(caseNum + 1);
        });
    })

}

module.exports = compileFile;

