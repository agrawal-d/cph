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
function executePrimaryTask() {
	var codeforcesURL = vscode.window.activeTextEditor.document.getText();
	var filepath = vscode.window.activeTextEditor.document.fileName;

	var firstRun = true;
	codeforcesURL = codeforcesURL.split("\n")[0];
	codeforcesURL = codeforcesURL.substring(2);
	var compilationError = false;
	var oc = vscode.window.createOutputChannel("competitive");

	if (!resultsPanel) {
		resultsPanel = vscode.window.createWebviewPanel(
			'evalResults',
			'Results',
			vscode.ViewColumn.Two
		);

		resultsPanel.onDidDispose(() => {
			resultsPanel = null;
		})
	}

	resultsPanel.webview.html = "<html><body><p style='margin:10px'>Please Wait...</p></body></html>"

	if (!(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
		vscode.window.showInformationMessage("Active file must be have a .cpp extension");
		return;
	}

	function evaluateResults(result) {
		var html = getWebviewContent(result);
		resultsPanel.webview.html = html;
	}

	function runTestCases() {
		try {
			fs.accessSync(filepath + ".tcs")
		} catch (err) {
			var html = downloadCodeforcesPage(codeforcesURL);
			html.then(string => {
				const [inp, op] = parseCodeforces(string);
				createTestacesFile(inp, op, filepath);
				runTestCases();
			}).catch(err => {
				console.error("Error", err)
			})
			return;
		}
		resultsPanel.webview.html = "<html><body><p style='margin:10px'>Runnung Testcases ...</p></body></html>";
		var cases = parseTestCasesFile(filepath);
		var passed_cases = [];
		var exec = [];
		var stdoutlen = 0;
		for (let i = 0; i < cases.numCases; i++) {

			exec[i] = spawn((filepath + '.bin'), {
				timeout: 10000
			});
			let tm = Date.now();
			setTimeout(() => {
				console.log("Killed process due to 10 second limit", i);
				exec[i].kill();
			}, 10000)
			exec[i].stdin.write(cases.inputs[i]);
			exec[i].stdout.on('data', (data) => {
				console.log("hey")
				if(stdoutlen>10000){
					console.log("STDOUT length >10000");
					resultsPanel.webview.html="<html><body><p style='margin:10px'>Your code is outputting more data than can be displayed. It is possibly stuck in an infinite loop. <br><br><b>All testcases failed.</b></p></body></html>";
					return;
				}
				const ans = data.toString();
				var tm2 = Date.now();
				var time = tm2 - tm;
				if (ans.trim() == cases.outputs[i].trim()) {
					passed_cases[i] = {
						passed: true,
						time: time,
						output: ans.trim(),
						input: cases.inputs[i].trim(),
						expected: cases.outputs[i].trim(),
						got: ans.trim()
					}
				} else {
					passed_cases[i] = {
						passed: false,
						time: time,
						output: ans.trim(),
						input: cases.inputs[i].trim(),
						expected: cases.outputs[i].trim(),
						got: ans.trim()

					}
				}
				if (i == (cases.numCases - 1)) {
					evaluateResults(passed_cases);
				}

			});
			exec[i].stderr.on('data', (data) => {
				console.error(`stderr: ${data}`);
			});

			exec[i].on('exit', code => {
				console.log("Execution done with code", code);
				if (typeof (code) == 'object') {
					console.log("Showing error string");
					resultsPanel.webview.html = "<html><body><p style='margin:10px'>Execution stopped due to 10 seconds timeout. Are you sure your code isnt stuck in an infinite loop?</p></body></html>";
				}
			})
		}
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
			oc.clear();
			oc.append("Error!\nYou must do either of these two things : \nCreate a comment with the URL of the codeforces problem on line 1 first.\nOr Create a .tcs file containing the testcases. If your current filename is A.cpp then create a file A.cpp.tcs");
			oc.show();
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
			await runTestCases();
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

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
