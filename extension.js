const vscode = require('vscode');
const request = require('request');
const rp = require('request-promise-native');
const { spawn } = require('child_process');
const parseCodeforces = require("./parseCodeforces");
const createTestacesFile = require("./createTestcasesFile");
const parseTestCasesFile = require("./parseTestCasesFile");
const getWebviewContent = require("./generateResultsHtml");
const fs = require("fs");
const path = require("path")
const writeToTestCaseFile = require("./writeToTestCaseFile");
let oc = vscode.window.createOutputChannel("competitive");
/**
 * Webview
 */
let resultsPanel;
let latestFilePath = "";
let latestTextDocument = null;
let latestContext = null;
//Setup statusbar button
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);

statusBarItem.text = " ▶  Run Testcases";
statusBarItem.show();
statusBarItem.command = "extension.runCodeforcesTestcases";


/**
 * Verifies if url is valid
 */
function verifyValidCodeforcesURL(url) {
	if (url.includes("https://codeforces.com") || url.includes("http://codeforces.com")) {
		return true;
	}
	return false;
}

/**
 * Creates and reveals a webview beisde the active window, but does not put any content in it.
 */
function startWebView() {
	if (!resultsPanel) {
		console.log("Creating webview");
		resultsPanel = vscode.window.createWebviewPanel(
			'evalResults',
			'Results',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		// message from webview
		resultsPanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case "save-and-rerun-all": {
					console.log(message.testcases);
					if (!latestFilePath || latestFilePath.length === 0) {
						console.error("Filepath not known");
						return;
					}
					if (!writeToTestCaseFile(JSON.stringify(message.testcases), latestFilePath)) {
						vscode.window.showInformationMessage("Couldnt save testcases. Please report bug to developer.");
						return;
					}
					if (latestTextDocument) {
						vscode.window.showTextDocument(latestTextDocument, vscode.ViewColumn.One, {
							preview: true
						}).then((textEditor) => {
							vscode.commands.executeCommand("extension.runCodeforcesTestcases").then((param) => {
								console.log("Command executed");
								console.log("Opened text editor", textEditor);
							})
						});
						console.log("Save one", latestTextDocument);
					} else {
						vscode.window.showInformationMessage("Couldnt switch to active editor. Please report bug to developer.");
						return;
					}

				}
			}
		})

		resultsPanel.onDidDispose(() => {
			resultsPanel = null;
		})
	}
}

/**
 * adds codeforces url comment to the first line of the current document
 * @param problemURL the URL of the codeforces problem
 * @param callback the function to be executed after the comment is inserted
 */
function appendProblemURLToFile(problemURL, callback) {
	const editor = vscode.window.activeTextEditor;
	vscode.window.activeTextEditor.edit(editBuilder => {
		const document = editor.document;
		const position = new vscode.Position(0, 0);
		editBuilder.insert(position, "//" + problemURL + "\n");
		vscode.commands.executeCommand("workbench.action.files.save").then((response) => {
			callback();
		})
	})
}
/**
 * show dialog box for actions downloading testcases and generating testcase file manually
 * @param {any} filepath path to the active source code document
 */
function testCasesHelper(filepath) {
	if (resultsPanel) {
		vscode.commands.executeCommand("workbench.action.closeActiveEditor");
	}
	vscode
		.window.
		showQuickPick(["Download testcases from Codeforces", "Manually enter testcases"], {
			placeHolder: "Choose one of the options to get testcases"
		})
		.then((selection) => {
			if (selection === "Download testcases from Codeforces") {
				vscode.window.showInputBox({
					placeHolder: "Enter the complete URL of the codeforces problem"
				}).then(async (problemURL) => {
					if (!problemURL || problemURL == "" || problemURL == undefined) {

						return;
					}
					if (!verifyValidCodeforcesURL(problemURL)) {
						vscode.window.showErrorMessage("Not a valid codeforces URL");
						return;
					}
					appendProblemURLToFile(problemURL, executePrimaryTask);
					return;
				})
			} else if (selection === "Manually enter testcases") {
				console.log("Showing blank webview");
				let blank_testcase = [];
				if (!writeToTestCaseFile(JSON.stringify(blank_testcase), filepath)) {
					console.error("Could not create tcs file");
					return;
				}
				console.log('Created TCS file');
				evaluateResults([], true);
				return;

				// console.log("Showing blank webview");
				// evaluateResults([], true);
				// vscode.commands.executeCommand("extension.runCodeforcesTestcases");
			}
		})
}

/**
 * shows the webview with the available results
 */
function evaluateResults(result, isFinal) {
	startWebView();
	const onDiskPath = vscode.Uri.file(
		path.join(latestContext.extensionPath, 'frontend', 'main.js')
	);
	const jssrc = resultsPanel.webview.asWebviewUri(onDiskPath);
	let html = getWebviewContent(result, isFinal, jssrc);
	console.log(html)
	resultsPanel.webview.html = html;
	resultsPanel.reveal()
}


/**
 * Worker function for the extension, activated on shortcut or "Run testcases"
 */
async function executePrimaryTask(context) {
	const saveFile = await vscode.commands.executeCommand("workbench.action.files.save");
	let codeforcesURL = vscode.window.activeTextEditor.document.getText();
	let filepath = vscode.window.activeTextEditor.document.fileName;
	let cases;
	if (!(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
		vscode.window.showInformationMessage("Active file must be have a .cpp extension");
		return;
	} else {
		console.log("Is a cpp");
		latestFilePath = filepath;
		latestTextDocument = vscode.window.activeTextEditor.document;
	}
	let firstRun = true;
	codeforcesURL = codeforcesURL.split("\n")[0];
	codeforcesURL = codeforcesURL.substring(2);
	let compilationError = false;

	let passed_cases = [];
	/**
	 * runs a particular testcase
	 * @param {*} caseNum 0-indexed number of the case
	 */
	function runTestCases(caseNum) {
		try {
			fs.accessSync(filepath + ".tcs")
		} catch (err) {
			let html = downloadCodeforcesPage(codeforcesURL);
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
			startWebView();
			console.l
			cases = parseTestCasesFile(filepath);
			if (!cases || !cases.inputs || cases.inputs.length === 0) {
				evaluateResults([], true);
				return;
			}
			resultsPanel.webview.html = "<html><body><p style='margin:10px'>Runnung Testcases ...</p><p>If this message does not change in 10 seconds, it means an error occured. Please contact developer.<p/></body></html>";


		} else if (caseNum == cases.numCases) {
			return;
		}
		let exec = [];
		let stdoutlen = 0;
		let spawned_process = spawn((filepath + '.bin'), {
			timeout: 10000
		});
		// Creates a 10 second timeout to kill the spawned process.
		setTimeout(() => {
			console.log("10 sec killed process - ", caseNum);
			spawned_process.kill();
		}, 10000)
		let tm = Date.now();
		spawned_process.stdin.write(cases.inputs[caseNum] + "\n");
		spawned_process.stdout.on('data', (data) => {
			if (stdoutlen > 10000) {
				startWebView();
				console.log("STDOUT length >10000");
				resultsPanel.webview.html = "<html><body><p style='margin:10px'>Your code is outputting more data than can be displayed. It is possibly stuck in an infinite loop. <br><br><b>All testcases failed.</b></p></body></html>";
				return;
			}
			console.log("Go stdout", data);
			let ans = data.toString();
			let tm2 = Date.now();
			let time = tm2 - tm;
			ans = ans.replace(/\r?\n|\r/g, "\n");
			cases.outputs[caseNum] = cases.outputs[caseNum].replace(/\r?\n|\r/g, "\n");
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
				spawn("rm", [filepath + ".bin"]);
				spawn("del", [filepath + ".bin"]);


			} else {
				evaluateResults(passed_cases, false);
			}

		});
		spawned_process.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
			oc.clear();
			oc.appendLine("STDERR:");
			oc.appendLine(data);
		});

		spawned_process.on('exit', (code, signal) => {
			let tm2 = Date.now();
			console.log("Execution done with code", code, " with signal ", signal, "for process ", caseNum);
			if (signal || code != 0) {
				passed_cases[caseNum] = {
					passed: false,
					time: tm2 - tm,
					output: `Runtime error. Exit signal ${signal}. Exit code ${code}.`,
					input: cases.inputs[caseNum].trim(),
					expected: cases.outputs[caseNum].trim(),
					got: `Runtime error. Exit signal ${signal}. Exit code ${code}.`,
				}
				if (caseNum == (cases.numCases - 1)) {
					evaluateResults(passed_cases, true);
				} else {
					evaluateResults(passed_cases, false);
				}

			} else {
				let tm2 = Date.now();
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
		if (verifyValidCodeforcesURL(url)) {
			vscode.window.showInformationMessage("Downloading Testcases");
			const html = await rp(url);
			return html;
		} else {
			testCasesHelper(filepath);
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
 * Registers the functions and commands on extension activation
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	latestContext = context;
	let disposable = vscode.commands.registerCommand('extension.runCodeforcesTestcases', function () {
		executePrimaryTask(context);
	});

	// let disposableTwo = vscode.commands.registerCommand('extension.openTestcaseFile', function () {
	// 	openTestcaseFile();
	// });

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
