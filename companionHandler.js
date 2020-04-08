const vscode = require("vscode");
const parseTestCasesFile = require("./parseTestCasesFile");
const createTestacesFile = require("./createTestcasesFile");
const preferences = require("./preferencesHelper"); 
const locationHelper = require("./locationHelper");
const path = require("path");
const fs = require("fs");
const config = require("./config");


/**
 * Appends cases to  testcase file already present, else, it generates a new one
 */
function handleCompanion(problem) {
    console.log("Handling")
    if (vscode.workspace.workspaceFolders === undefined) {
        console.log("NO folder")
        vscode.commands.executeCommand(
            "extension.showWorkspaceError"
        )
    } else {
        console.log(vscode.workspace.workspaceFolders[0].uri);
        const dir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const languageChoices = Object.keys(config.extensions);

        const defaultLanguage = preferences().get("defaultLanguage");
        const selectedLanguage = new Promise( (resolve) => {
            if(defaultLanguage != "None") {
                resolve(defaultLanguage);
            }
            else {
                vscode.window.showQuickPick(languageChoices, {
                    placeHolder: "Select the language"
                })
                .then(language => {
                    resolve(language);
                })
            }
        });
        selectedLanguage
        .then(async language => {
            const ext = config.extensions[language];
            if (!ext)
                throw Error("Extension not found");
            
            let problemFile = `${problem.name.replace(/\W+/g, '_')}.${ext}`;
            let fullPath = path.join(dir, problemFile);
            return fullPath;
        })
        .then(async filePath => {
            console.log(filePath);
            console.log(fs.writeFileSync(filePath, ""));

            let inp = [];
            let op = [];
            for (const element of problem.tests) {
                inp.push(element.input);
                op.push(element.output);
            }
            console.log(inp, op);

            createTestacesFile(inp, op, locationHelper.getTestCaseLocation(filePath));
            vscode.workspace.openTextDocument(filePath).then((doc) => {
                vscode.window.showTextDocument(doc);
            })
        }, err => console.error(err))
        .then(undefined, err => {
            console.error(err);
            vscode.window.showErrorMessage("Error while creating file. Are you sure you have the correct permissions ?");
            return -1;
        })
    }
}

module.exports = handleCompanion;