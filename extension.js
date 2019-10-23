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

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// let resultsPanel;
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('catCoding.start', () => {
	// 		if (!resultsPanel) {
	// 			resultsPanel = vscode.window.createWebviewPanel(
	// 				'catCoding',
	// 				'Results',
	// 				vscode.ViewColumn.Two
	// 			);
	// 		} else {
	// 			resultsPanel.reveal(vscode.ViewColumn.Two);
	// 		}


	// 		let iteration = 0;
	// 		const updateWebview = () => {
	// 			resultsPanel.webview.html = getWebviewContent(["hello"]);
	// 		};

	// 		// Set initial content
	// 		updateWebview();

	// 		resultsPanel.onDidDispose(() => {
	// 			resultsPanel = null;
	// 		})
	// 	})

	// );






	/**End Cats */


	let disposable = vscode.commands.registerCommand('extension.runCodeforcesTestcases', function () {

		var codeforcesURL = vscode.window.activeTextEditor.document.getText();
		var filepath = vscode.window.activeTextEditor.document.fileName;
		var resultsPanel;
		codeforcesURL = codeforcesURL.split("\n")[0];
		codeforcesURL = codeforcesURL.substring(2);
		var compilationError = false;
		var oc = vscode.window.createOutputChannel("competitive");

		if (!(filepath.substring(filepath.length - 4).toLowerCase() == '.cpp')) {
			vscode.window.showInformationMessage("Active file must be have a .cpp extension");
			return;
		}

		function evaluateResults(result) {
			var html = getWebviewContent(result);
			if (!resultsPanel) {
				resultsPanel = vscode.window.createWebviewPanel(
					'evalResults',
					'Results',
					vscode.ViewColumn.Two
				);
			} else {
				resultsPanel.reveal(vscode.ViewColumn.Two);
			}


			let iteration = 0;
			const updateWebview = () => {
				resultsPanel.webview.html = html;
			};

			// Set initial content
			updateWebview();

			resultsPanel.onDidDispose(() => {
				resultsPanel = null;
			})
		}

		function runTestCases() {
			try {
				fs.accessSync(filepath + ".testcases")
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
			var cases = parseTestCasesFile(filepath);
			var passed_cases = [];
			for (let i = 0; i < cases.numCases; i++) {
				const exec = spawn(filepath + '.bin');
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
				exec.stderr.on('data', (data) => {
					console.error(`stderr: ${data}`);
				});

				exec.on('exit', code => {

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
				oc.append("Error!\nYou must do either of these two things : \nCreate a comment with the URL of the codeforces problem on line 1 first.\nOr Create a .testcases file containing the testcases. If your current filename is A.cpp then create a file A.cpp.testcases");
				oc.show();
				return false;
			}
		}

		/**
		 * Comiple the C++ file
		 */
		vscode.window.showInformationMessage("Compiling file");
		const gpp = spawn('g++', [filepath, '-o', filepath + ".bin"]);
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
