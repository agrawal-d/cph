// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const request = require('request');
var rp = require('request-promise-native');
const { spawn } = require('child_process');
const parseCodeforces = require("./parseCodeforces");
const createTestacesFile = require("./createTestcasesFile");
const parseTestCasesFile = require("./parseTestCasesFile");
const getWebviewContent = require("./generateResultsHtml")
let fs = require("fs");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
var resultsPanel;
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
statusBarItem.text = " ▶  Run Testcases";
statusBarItem.show();
statusBarItem.command = "extension.runCodeforcesTestcases";

// main extension commands are in this function

function openTestcaseFile() {
	var filepath = vscode.window.activeTextEditor.document.fileName;
	if (!filepath || !(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
		vscode.window.showInformationMessage("Active file must be have a .cpp extension");
		return;
	} else {
		try {
			fs.accessSync(filepath + ".testcases");
		} catch (err) {
			testCasesHelper(filepath);
			return;
		}

		vscode.workspace.openTextDocument(filepath + ".testcases").then(document => {
			vscode.window.showTextDocument(document, vscode.ViewColumn.Beside)
		})

	}
}


function startWebView() {
	if (!resultsPanel) {
		console.log("Creating webview");
		resultsPanel = vscode.window.createWebviewPanel(
			'evalResults',
			'Results',
			vscode.ViewColumn.Two
		);

		resultsPanel.onDidDispose(() => {
			resultsPanel = null;
		})
	}
}

function appendProblemURLToFile(problemURL) {
	const editor = vscode.window.activeTextEditor;
	vscode.window.activeTextEditor.edit(editBuilder => {
		const document = editor.document;
		const position = new vscode.Position(0, 0);
		editBuilder.insert(position, "//" + problemURL + "\n");
	})
}

function testCasesHelper(filepath) {
	if (resultsPanel) {
		vscode.commands.executeCommand("workbench.action.closeActiveEditor");
	}
	vscode
		.window.
		showQuickPick(["Download testcases from Codeforces", "Create a new .testcases file"], {
			placeHolder: "Choose one of the options to get testcases"
		})
		.then(selection => {
			if (selection === "Download testcases from Codeforces") {
				vscode.window.showInputBox({
					placeHolder: "Enter the complete URL of the codeforces problem"
				}).then((problemURL) => {
					appendProblemURLToFile(problemURL);
				})
			} else if (selection === "Create a new .testcases file") {
				try {
					fs.writeFileSync(
						filepath + ".testcases",
						"input\n1\n1 2 3\n4 3\noutput\nYES\n1 2 3\n-----------------\ninput\n1\n2\n5\noutput\n500\n4\n-----------------\n"
					)
					vscode.workspace.openTextDocument(filepath + ".testcases").then(document => {
						console.log(document.getText())
						vscode.window.showTextDocument(document, vscode.ViewColumn.Beside)
					})
				} catch (err) {
					console.error(err);
				}
			}
		})
}

function executePrimaryTask() {
	var codeforcesURL = vscode.window.activeTextEditor.document.getText();
	var filepath = vscode.window.activeTextEditor.document.fileName;
	var cases;
	if (!(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
		vscode.window.showInformationMessage("Active file must be have a .cpp extension");
		return;
	} else {
		console.log("Is a cpp");
	}
	var firstRun = true;
	codeforcesURL = codeforcesURL.split("\n")[0];
	codeforcesURL = codeforcesURL.substring(2);
	var compilationError = false;
	var oc = vscode.window.createOutputChannel("competitive");


	function evaluateResults(result, isFinal) {
		startWebView();
		var html = getWebviewContent(result, isFinal);
		resultsPanel.webview.html = html;
		resultsPanel.reveal()
	}

	let passed_cases = [];
	function runTestCases(caseNum) {
		try {
			fs.accessSync(filepath + ".testcases")
		} catch (err) {
			var html = downloadCodeforcesPage(codeforcesURL);
			html.then(string => {
				const [inp, op] = parseCodeforces(string);
				createTestacesFile(inp, op, filepath);
				runTestCases(0);
			}).catch(err => {
				console.error("Error", err)
			})
			return;
		}

		if (caseNum == 0) {
			startWebView()
			resultsPanel.webview.html = "<html><body><p style='margin:10px'>Runnung Testcases ...</p></body></html>";
			cases = parseTestCasesFile(filepath);

		} else if (caseNum == cases.numCases) {
			return;
		}
		var exec = [];
		var stdoutlen = 0;
		let spawned_process = spawn((filepath + '.bin'), {
			timeout: 10000
		});
		setTimeout(() => {
			console.log("10 sec killed process - ", caseNum);
			spawned_process.kill();
		}, 10000)
		let tm = Date.now();

		spawned_process.stdin.write(cases.inputs[caseNum]);
		spawned_process.stdout.on('data', (data) => {
			console.log("hey")
			if (stdoutlen > 10000) {
				startWebView();
				console.log("STDOUT length >10000");
				resultsPanel.webview.html = "<html><body><p style='margin:10px'>Your code is outputting more data than can be displayed. It is possibly stuck in an infinite loop. <br><br><b>All testcases failed.</b></p></body></html>";
				return;
			}
			const ans = data.toString();
			var tm2 = Date.now();
			var time = tm2 - tm;
			if (ans.trim() == cases.outputs[caseNum].trim()) {
				passed_cases[caseNum] = {
					passed: true,
					time: time,
					output: ans.trim(),
					input: cases.inputs[caseNum].trim(),
					expected: cases.outputs[caseNum].trim(),
					got: ans.trim()
				}
			} else {
				passed_cases[caseNum] = {
					passed: false,
					time: time,
					output: ans.trim(),
					input: cases.inputs[caseNum].trim(),
					expected: cases.outputs[caseNum].trim(),
					got: ans.trim()

				}
			}
			if (caseNum == (cases.numCases - 1)) {
				evaluateResults(passed_cases, true);
			} else {
				evaluateResults(passed_cases, false);
			}

		});
		spawned_process.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});

		spawned_process.on('exit', code => {
			var tm2 = Date.now();
			console.log("Execution done with code", code, "for process ", caseNum);
			if (typeof (code) == 'object') {
				console.log("Showing error string");
				passed_cases[caseNum] = {
					passed: false,
					time: tm2 - tm,
					output: "Process Was Killed",
					input: cases.inputs[caseNum].trim(),
					expected: cases.outputs[caseNum].trim(),
					got: "Process Was Killed"
				}
				if (caseNum == (cases.numCases - 1)) {
					evaluateResults(passed_cases, true);
				} else {
					evaluateResults(passed_cases, false);
				}

			} else {
				var tm2 = Date.now();
				if (!passed_cases[caseNum]) {
					passed_cases[caseNum] = {
						passed: cases.outputs[caseNum].trim().length == 0,
						time: tm2 - tm,
						output: "<br/>",
						input: cases.inputs[caseNum].trim(),
						expected: cases.outputs[caseNum].trim(),
						got: "<br/>"
					}
					if (caseNum == (cases.numCases - 1)) {
						evaluateResults(passed_cases, true);
					} else {
						evaluateResults(passed_cases, false);
					}
				}
			}
			runTestCases(caseNum + 1);
		})
	}

	/**
	 * Download a html page with the given codeforces url
	 */
	async function downloadCodeforcesPage(url) {
		if (url.includes("https://codeforces.com") || url.includes("http://codeforces.com")) {
			vscode.window.showInformationMessage("Downloading Testcases");
			const html = await rp(url);
			return html;
		} else {
			testCasesHelper(filepath);
			// oc.clear();
			// oc.append("Error - \nYou must do either of these two things : \nCreate a comment with the URL of the codeforces problem on line 1 first.\nOr Create a .testcases file containing the testcases. If your current filename is A.cpp then create a file A.cpp.testcases");
			// oc.show();
			return false;
		}
	}

	/**
	 * Comiple the C++ file
	 */
	const gpp = spawn('g++', [filepath, '-o', filepath + ".bin"]);
	gpp.stdout.on("data", (data) => {
		console.log(`stdout: ${data}`);
	})
	gpp.stderr.on('data', (data) => {
		oc.clear();
		oc.append("Errors while compiling\n" + data.toString());
		oc.show();
		compilationError = true;
	});

	gpp.on('exit', async (exitCode) => {
		if (!compilationError) {
			await runTestCases(0);
		}
		console.log(`Compiler exited with code ${exitCode}`);
	});
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('extension.runCodeforcesTestcases', function () {
		executePrimaryTask();
	});

	let disposableTwo = vscode.commands.registerCommand('extension.openTestcaseFile', function () {
		openTestcaseFile();
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
