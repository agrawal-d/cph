const vscode = require("vscode");
const parseTestCasesFile = require("./parseTestCasesFile");
const createTestacesFile = require("./createTestcasesFile");
const locationHelper = require("./locationHelper");

export interface CompanionJSON {
    name: string;
    group: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    tests?: (TestsEntity)[] | null;
    testType: string;
    input: InputOrOutput;
    output: InputOrOutput;
    languages: Languages;
}
export interface TestsEntity {
    input: string;
    output: string;
}
export interface InputOrOutput {
    type: string;
}
export interface Languages {
    java: Java;
}
export interface Java {
    mainClass: string;
    taskClass: string;
}




/**
 * Appends cases to  testcase file already present, else, it generates a new one
 */
function handleCompanion(problem: CompanionJSON) {
    try {
        if (vscode.workspace.workspaceFolders === undefined) {
            vscode.commands.executeCommand(
                "extension.showWorkspaceError"
            )
        } else {
            vscode.workspace.fs.writeFile(problem.name + ".cpp");

        }
    } catch (e) {

    }
}

module.exports = handleCompanion;