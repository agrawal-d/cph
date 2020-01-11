const vscode = require("vscode");
const parseTestCasesFile = require("./parseTestCasesFile");
const createTestacesFile = require("./createTestcasesFile");
const locationHelper = require("./locationHelper");
const path = require("path");
const fs = require("fs");


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
        try {
            console.log(vscode.workspace.workspaceFolders[0].uri);
            const dir = vscode.workspace.workspaceFolders[0].uri.fsPath;
            let problemFile = problem.name.replace(/\W+/g, '_') + ".cpp";
            let fullPath = path.join(dir, problemFile);
            console.log(fullPath);
            console.log(fs.writeFileSync(fullPath, ""));

            let inp = [];
            let op = [];
            for (const element of problem.tests) {
                inp.push(element.input);
                op.push(element.output);
            }
            console.log(inp, op);
            createTestacesFile(inp, op, locationHelper.getTestCaseLocation(fullPath));
            vscode.workspace.openTextDocument(fullPath).then((doc) => {
                vscode.window.showTextDocument(doc);
            })

        } catch (e) {
            console.error(e);
            vscode.window.showErrorMessage("Error while creating file. Are you sure you have the correct permissions ?");
            return -1;
        }
    }

}

module.exports = handleCompanion;