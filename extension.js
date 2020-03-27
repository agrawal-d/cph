const vscode = require("vscode");
const rp = require("request-promise-native");
const { spawn } = require("child_process");
const parseCodeforces = require("./parseCodeforces");
const createTestacesFile = require("./createTestcasesFile");
const parseTestCasesFile = require("./parseTestCasesFile");
const compileFile = require("./compileFile");
const getWebviewContent = require("./generateResultsHtml");
const locationHelper = require("./locationHelper");
const fs = require("fs");
const path = require("path");
const companionServer = require("./companionServer");
const EventEmitter = require('events');
let preferences = require("./preferencesHelper");
const writeToTestCaseFile = require("./writeToTestCaseFile");
const handleCompanion = require("./companionHandler");
const config = require('./config');

let oc = vscode.window.createOutputChannel("competitive");
let spawnStack = [];

/**
 * Retrieve extension of file
 * @param {string} filePath 
 */
function getExtension(filePath) {
  const fileExtension = filePath
    .split(".")
    .pop()
    .toLowerCase();
  return fileExtension;
}

/**
 * Get language based on file extension
 * @param {string} extension 
 */
function getLanguage(extension) {
  for (const [lang, ext] of Object.entries(config.extensions))
      if (ext === extension)
          return lang;
}

function getLangugeByFilePath(filePath) {
  const extension = getExtension(filePath);
  return getLanguage(extension);
}

/**
 * check if folder is open - then warn if folder is not open;
 *
 */
function workspaceIsFolder() {
  return vscode.workspace.workspaceFolders !== undefined;
}

const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  1000
);

statusBarItem.text = " ▶  Run Testcases";
statusBarItem.show();
statusBarItem.command = "extension.runCodeforcesTestcases";


/**
 * Shows error if workspace is not a folder.
 */
function showWorkSpaceError() {
  vscode.window.showErrorMessage("To use Competitive Companion Integration you must open a folder in VS Code. Go to File>Open Folder or press Ctrl+K then press O");
}

const server = companionServer();

// setup event listeners for competitive companion extension
(() => {
  class CompanionEmitterSetup extends EventEmitter { }
  const mySetup = new CompanionEmitterSetup();
  mySetup.on("new-problem", function (problem) {
    handleCompanion(problem);
  })
  //@ts-ignore
  global.companionEmitter = mySetup;
  console.log("Event listeners setup");
})();



// kills all spawned process
function killAll() {
  console.log("Killing all spawns");
  spawnStack.forEach(proc => {
    proc.kill();
  })
  spawnStack = [];
}


//webview
let resultsPanel;
let latestTextDocument = null;
let latestContext = null;


/**
 * Verifies if url is codeforces
 */
function verifyValidCodeforcesURL(url) {
  if (
    url.includes("https://codeforces.com") ||
    url.includes("http://codeforces.com")
  ) {
    return true;
  }
  return false;
}

// creates 2X1 grid 0.75+0.25
function createLayout() {
  vscode.commands.executeCommand("vscode.setEditorLayout", {
    orientation: 0,
    groups: [
      { groups: [{}], size: 0.75 },
      { groups: [{}], size: 0.25 }
    ]
  });
}

async function runSingleTestCase(filePath, inp, op) {
  const language = getLangugeByFilePath(filePath)
  console.log("fp", locationHelper.getBinLocation(language, filePath));
  try {
    let promise = new Promise((resolve, reject) => {
      let spawned_process = spawn(locationHelper.getBinLocation(language, filePath), {
        timeout: 10000
      });
      spawnStack.push(spawned_process);


      let time0 = Date.now();
      let stdout = "";
      let stderr = "";


      let killer = setTimeout(() => {
        console.log("Killed process timeout.");
        spawned_process.kill();
      }, 10000);

      spawned_process.stdin.write(inp + "\n");
      spawned_process.stdin.end();

      spawned_process.stdout.on("data", data => {
        stdout += data.toString();
      });

      spawned_process.stderr.on("data", data => {
        stderr += data.toString();
      });

      spawned_process.on("exit", (code, signal) => {
        let time1 = Date.now();
        clearInterval(killer);
        killer = null;
        console.log("Execution done with code", code, " with signal ", signal);

        if (signal || code != 0) {
          resolve({
            evaluation: false,
            got: `Runtime error. Exit signal ${signal}. Exit code ${code}.`,
            time: time1 - time0
          });
        } else {
          if (stderr.length > 0) {
            resolve({
              evaluation: false,
              got: "STDERR:" + stderr,
              time: time1 = time0
            })
          } else {
            let stdout_fixed;
            stdout_fixed = stdout.replace(/\r?\n|\r/g, " ");
            stdout_fixed = stdout_fixed.replace(/[ ]/g, "");
            op = op.replace(/\r?\n|\r/g, " ");
            op = op.replace(/[ ]/g, "");
            let eval;
            if (op == stdout_fixed) {
              eval = true;
            } else {
              eval = false;
            }
            resolve({
              evaluation: eval,
              got: stdout,
              time: time1 - time0
            })
          }
        }
      });
    })
    return promise;
  } catch (e) {
    console.error(e);
  }
}

async function handleSingleTestcaseCommand(filePath, caseId, data) {
  const language = getLangugeByFilePath(filePath)
  let compilation = await compileFile(language, filePath, oc);
  if (compilation === "OK") {
    let evaluation = await runSingleTestCase(filePath, data.input, data.output);
    console.log("Eval : ", evaluation);
    resultsPanel.webview.postMessage({
      command: "singe-case-rerun-evaluation",
      evaluation: evaluation,
      caseId: caseId
    });
  }
}

/**
 * Creates and reveals a webview beisde the active window, but does not put any content in it.
 */
function startWebView() {
  if (!resultsPanel) {
    console.log("Creating webview");
    resultsPanel = vscode.window.createWebviewPanel(
      "evalResults",
      "Results",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    createLayout();
    // message from webview
    resultsPanel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case "save-and-rerun-all": {
          if (!message.filepath || message.filepath.length === 0) {
            console.error("Filepath not known");
            return;
          }
          if (
            !writeToTestCaseFile(
              JSON.stringify(message.testcases),
              message.filepath
            )
          ) {
            vscode.window.showInformationMessage(
              "Couldnt save testcases. Please report bug to developer."
            );
            return;
          }
          if (message.filepath) {
            vscode.workspace.openTextDocument(message.filepath).then((document) => {
              vscode.window
                .showTextDocument(document, vscode.ViewColumn.One)
                .then(textEditor => {
                  executePrimaryTask("no-webview-check");
                })
            });
          } else {
            vscode.window.showInformationMessage(
              "Couldnt switch to active editor. Please report bug to developer."
            );
            return;
          }
          break;
        }
        case "save-and-rerun-single": {
          if (!writeToTestCaseFile(
            JSON.stringify(message.testcases),
            message.filepath)) {
            vscode.window.showInformationMessage("Couldnt save testcases. Please report bug to developer.");
            return;
          }

          // now evaulate it
          handleSingleTestcaseCommand(message.filepath, message.caseId, message.testcases[message.casenum]);
          break;
        }
        case "kill-all": {
          killAll();
          break;
        }
        case "webview-filepath": {
          if (message.filepath === vscode.window.activeTextEditor.document.fileName) {
            resultsPanel.webview.postMessage({
              command: "save-and-run-all"
            });
          } else {
            executePrimaryTask("no-webview-check");
          }
          break;

        }
      }
    });

    resultsPanel.onDidDispose(() => {
      resultsPanel = null;
    });
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
    vscode.commands
      .executeCommand("workbench.action.files.save")
      .then(response => {
        callback();
      });
  });
}

/**
 * show dialog box for actions such as downloading testcases and generating testcase file manually
 * @param {any} filepath path to the active source code document
 */
function testCasesHelper(filepath) {
  vscode.window
    .showQuickPick(
      ["Download testcases from Codeforces", "Manually enter testcases"],
      {
        placeHolder: "Choose one of the options to get testcases"
      }
    )
    .then(selection => {
      if (selection === "Download testcases from Codeforces") {
        vscode.window
          .showInputBox({
            placeHolder: "Enter the complete URL of the codeforces problem"
          })
          .then(async problemURL => {
            if (!problemURL || problemURL == "" || problemURL == undefined) {
              return;
            }
            if (!verifyValidCodeforcesURL(problemURL)) {
              vscode.window.showErrorMessage("Not a valid codeforces URL");
              return;
            }
            appendProblemURLToFile(problemURL, executePrimaryTask);
            return;
          });
      } else if (selection === "Manually enter testcases") {
        console.log("Showing blank webview");
        let blank_testcase = [];
        if (!writeToTestCaseFile(JSON.stringify(blank_testcase), filepath)) {
          console.error("Could not create tcs file");
          return;
        }
        console.log("Created TCS file");
        displayResults([], true, filepath);
        return;

        // console.log("Showing blank webview");
        // evaluateResults([], true);
        // vscode.commands.executeCommand("extension.runCodeforcesTestcases");
      }
    });
}

/**
 * shows the webview with the available results
 */
function displayResults(result, isFinal, filepath) {
  startWebView();
  const onDiskPath = vscode.Uri.file(
    path.join(latestContext.extensionPath, "frontend", "main.js")
  );
  const jssrc = resultsPanel.webview.asWebviewUri(onDiskPath);
  let html = getWebviewContent(result, isFinal, jssrc, filepath);
  resultsPanel.webview.html = html;
  resultsPanel.reveal();
}


/**
 * Worker function for the extension, activated on shortcut or "Run testcases"
 */
async function executePrimaryTask(context) {
  oc.hide();

  const saveFile = await vscode.commands.executeCommand(
    "workbench.action.files.save"
  );
  let codeforcesURL = vscode.window.activeTextEditor.document.getText();
  let filePath = vscode.window.activeTextEditor.document.fileName;


  if (resultsPanel && resultsPanel.webview && context != "no-webview-check") {
    resultsPanel.webview.postMessage({
      command: "send-filepath"
    });
    return;
  }

  let cases;
  const fileExtension = getExtension(filePath);
  const language = getLanguage(fileExtension);

  const validExtensions = Object.values(config.extensions);
  const extList = validExtensions.map(ext => `.${ext}`);
  const extListPresentation = `${
    extList.slice(0, -1).join(', ')
  } or ${
    extList.slice(-1)[0]
  }`;

  if (!validExtensions.includes(fileExtension)) {
    vscode.window.showInformationMessage(
      `Active file must be have a ${extListPresentation} extension`
    );
    return;
  } else {
    console.log(`Is a ${extListPresentation}`);
    latestTextDocument = vscode.window.activeTextEditor.document;
  }
  codeforcesURL = codeforcesURL.split("\n")[0];
  codeforcesURL = codeforcesURL.substring(2);

  let passed_cases = [];
  /**
   * runs a particular testcase
   * @param {*} caseNum 0-indexed number of the case
   */
  function runTestCases(caseNum) {
    try {
      fs.accessSync(locationHelper.getTestCaseLocation(filePath));
    } catch (err) {
      let html = downloadCodeforcesPage(codeforcesURL);
      html
        .then(string => {
          const [inp, op] = parseCodeforces(string);
          createTestacesFile(inp, op, locationHelper.getTestCaseLocation(filePath));
          runTestCases(0);
        })
        .catch(err => {
          console.error("Error", err);
        });
      return;
    }

    if (caseNum == 0) {
      startWebView();
      cases = parseTestCasesFile(locationHelper.getTestCaseLocation(filePath));
      if (!cases || !cases.inputs || cases.inputs.length === 0) {
        displayResults([], true, filePath);
        return;
      }

      displayResults([], false, filePath);

    } else if (caseNum == cases.numCases) {
      return;
    }
    let stdoutlen = 0;
    let spawned_process = spawn(locationHelper.getBinLocation(language, filePath), {
      timeout: 10000
    });
    spawnStack.push(spawned_process);
    // Creates a 10 second timeout to kill the spawned process.
    let killer = setTimeout(() => {
      console.log("10 sec killed process - ", caseNum);
      spawned_process.kill();
    }, 10000);
    let tm = Date.now();
    spawned_process.stdin.write(cases.inputs[caseNum] + "\n");
    spawned_process.stdin.end();
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
        displayResults(passed_cases, true, filePath);
        spawn("rm", [locationHelper.getBinLocation(language, filePath)]);
        spawn("del", [locationHelper.getBinLocation(language, filePath)]);
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
      clearInterval(killer);
      killer = null;
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
          displayResults(passed_cases, true, filePath);
        } else {
          displayResults(passed_cases, false, filePath);
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
            displayResults(passed_cases, true, filePath);
          } else {
            displayResults(passed_cases, false, filePath);
          }
        }
      }
      runTestCases(caseNum + 1);
    });
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
      testCasesHelper(filePath);
      return false;
    }
  }

  let compilationResult = await compileFile(language, filePath, oc);
  if (compilationResult === "OK") {
    console.log("Compiled OK");
    runTestCases(0);
  } else {
    console.error("Compilation error!");
  }
}

/**
 * Registers the functions and commands on extension activation
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("ACTIVATED")
  latestContext = context;
  let disposable = vscode.commands.registerCommand(
    "extension.runCodeforcesTestcases",
    function () {
      executePrimaryTask(context);
    }
  );
  // context.subscriptions.push(disposable);


  let disposable2 = vscode.commands.registerCommand(
    "extension.showWorkspaceError",
    function () {
      showWorkSpaceError();
    }
  );
  context.subscriptions.push(disposable, disposable2);

}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
  activate,
  deactivate
};
