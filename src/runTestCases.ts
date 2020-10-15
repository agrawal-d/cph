import * as vscode from 'vscode';
import { checkUnsupported, randomId } from './utils';
import {
    startWebVeiwIfNotActive,
    setBaseWebViewHTML,
    webViewExists,
    getWebViewProblemName,
    extensionToWebWiewMessage,
} from './webview/webview';
import { Problem } from './types';
import { getProblem, saveProblem } from './parser';
import { compileFile } from './compiler';
import runAllAndSave from './webview/processRunAll';
import path from 'path';

/**
 * Execution for the run testcases command. Runs all testcases for the active
 * editor. If the active editor does not have any saved testaces, presents an
 * option to the user to either download them from a codeforces URL or manually
 * create an empty testcases file and show it in the results section.
 */
export default async (context: vscode.ExtensionContext) => {
    console.log('Running command "runTestCases"');
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        if (webViewExists()) {
            console.log('Sending command to webview.');
            extensionToWebWiewMessage({
                command: 'run-all',
            });
        }
        return;
    }
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const problem = getProblem(srcPath);

    if (!problem) {
        console.log('No problem saved.');
        createLocalProblem(context, editor);
        return;
    }

    const didCompile = await compileFile(srcPath);

    if (!didCompile) {
        console.error('Could not compile', srcPath);
        return;
    }
    await editor.document.save();
    if (!webViewExists()) {
        startWebVeiwIfNotActive();
        await setBaseWebViewHTML(context, problem);
    } else {
        if (getWebViewProblemName() !== problem.name) {
            console.log(
                'Viewing different problem currenlty, changing base HTML',
            );
            await setBaseWebViewHTML(context, problem);
        }
    }
    runAllAndSave(problem);
    vscode.window.showTextDocument(editor.document, vscode.ViewColumn.One);
};

const createLocalProblem = async (
    context: vscode.ExtensionContext,
    editor: vscode.TextEditor,
) => {
    console.log('Creating local problem');
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const newProblem: Problem = {
        name: 'Local: ' + path.basename(srcPath).split('.')[0],
        url: srcPath,
        tests: [
            {
                id: randomId(),
                input: '',
                output: '',
            },
        ],
        interactive: false,
        memoryLimit: 1024,
        timeLimit: 3000,
        srcPath,
        group: 'local',
        local: true,
    };
    console.log(newProblem);
    saveProblem(srcPath, newProblem);
    await startWebVeiwIfNotActive();
    await setBaseWebViewHTML(context, newProblem);
};
