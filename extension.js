// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const request = require('request');
var rp = require('request-promise-native');
const { spawn } = require('child_process');
let fs = require("fs");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.runCodeforcesTestcases', function () {
		var codeforcesURL = vscode.window.activeTextEditor.document.getText();
		var filepath = vscode.window.activeTextEditor.document.fileName;
		console.log(filepath.substring(filepath.length - 4).toLowerCase());
		if (!(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
			vscode.window.showInformationMessage("Active file must be have a .cpp extension");
			return;
		}
		codeforcesURL = codeforcesURL.split("\n")[0];
		codeforcesURL = codeforcesURL.substring(2);
		var compilationError = false;
		var oc = vscode.window.createOutputChannel("competitive");

		function createTestacesFile(document) {
			console.log("Creating a file at", filepath);
			var inp = [];
			var op = [];
			var lines = document.split('\n');
			var tc = "";
			var isTestcase = false;
			var isInput = true;
			for (var element of lines) {
				if (element.includes('</pre></div></div></div></div>')) {
					isTestcase = false;
					op.push(tc);
				}
				else if (element.includes('<div class="input"><div class="title">Input</div>')) {
					if (tc != "") {
						op.push(tc);
						tc = ""
					}
					isTestcase = true;
				} else if (element.includes('<div class="output"><div class="title">Output</div>')) {
					if (tc != "") {
						inp.push(tc);
						tc = "";
					}
					isTestcase = true;
				}
				else if (isTestcase) {
					tc += element + "\n";
				}

			}
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
			fs.writeFileSync(filepath + ".testcases", strings);
		}

		function parseTestCases() {
			try { var txt = fs.readFileSync(filepath + ".testcases").toString(); }
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

		function evaluateResults(result) {
			oc.clear();
			console.log("Evaluating")
			console.log(result);
			var txt = `Evaluation Results (${result.length}) :\n`;
			for (var i = 0; i < result.length; i++) {
				if (result[i].passed) {
					txt += `✓ Testcase ${i} passed in ${result[i].time} ms\n`;
				}
				else {
					txt += `✗ Testcase ${i} failed. \nExpected :\n${result[i].expected}\nGot\n${result[i].output}\n`;
				}
				txt += "-------------\n";
			}
			oc.append(txt);
			oc.show();
		}

		function runTestCases() {
			try {
				fs.accessSync(filepath + ".testcases")
			} catch (err) {
				var html = downloadCodeforcesPage(codeforcesURL);
				html.then(string => {
					createTestacesFile(string);
					runTestCases();
				}).catch(err => {
					console.error("Error")
				})
				return;
			}
			var cases = parseTestCases();
			var passed_cases = [];
			console.log(cases.outputs);
			for (let i = 0; i < cases.numCases; i++) {
				const exec = spawn('./a.out');
				let tm = Date.now();
				exec.stdin.write(cases.inputs[i]);
				exec.stdin.end();
				exec.stdout.on('data', (data) => {
					const ans = data.toString();
					var tm2 = Date.now();
					var time = tm2 - tm;
					if (ans.trim() == cases.outputs[i].trim()) {
						passed_cases[i] = {
							passed: true,
							time: time,
							output: ans.trim(),
							expected: cases.outputs[i].trim()
						}
					} else {
						passed_cases[i] = {
							passed: false,
							time: time,
							output: ans.trim(),
							expected: cases.outputs[i].trim()
						}

					}
					if (i == (cases.numCases - 1)) {
						evaluateResults(passed_cases);
					}
				});
				exec.stderr.on('data', (data) => {
					console.error(`stderr: ${data}`);
				});

				exec.on('exit', code => {

				})
			}
		}

		async function downloadCodeforcesPage(url) {
			if (url.includes("https://codeforces.com") || url.includes("http://codeforces.com")) {
				vscode.window.showInformationMessage("Downloading Testcases");
				const html = await rp(url);
				return html;
			} else {
				vscode.window.showErrorMessage("Create a comment with the URL of the codeforces problem on line 1 first.");
				return false;
			}
		}


		vscode.window.showInformationMessage("Compiling file");
		const gpp = spawn('g++', [filepath]);
		gpp.stdout.on("data", (data) => {
			console.log(`stdout: ${data}`);
		})
		gpp.stderr.on('data', (data) => {
			vscode.window.showErrorMessage("Error while compining current file");
			oc.clear();
			oc.append("Errors while compiling\n" + data.toString());
			oc.show();
			compilationError = true;
		});

		gpp.on('exit', async (exitCode) => {
			if (!compilationError) {
				await runTestCases();
			}
			console.log(`Child exited with code ${exitCode}`);
		});

	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
