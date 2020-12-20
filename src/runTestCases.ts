import * as vscode from 'vscode';
import { checkUnsupported, randomId } from './utils';
import { Problem } from './types';
import { getProblem, saveProblem } from './parser';
import { compileFile } from './compiler';
import runAllAndSave from './webview/processRunAll';
import path from 'path';
import sendTelemetryEvent from './telemetery';
import { getJudgeViewPorivider } from './extension';

/**
 * Execution for the run testcases command. Runs all testcases for the active
 * editor. If the active editor does not have any saved testaces, presents an
 * option to the user to either download them from a codeforces URL or manually
 * create an empty testcases file and show it in the results section.
 */
export default async () => {
    console.log('Running command "runTestCases"');
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        console.log('Sending command to webview.');
        getJudgeViewPorivider().extensionToJudgeViewMessage({
            command: 'run-all',
        });
        return;
    }
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const problem = getProblem(srcPath);

    if (!problem) {
        console.log('No problem saved.');
        createLocalProblem(editor);
        return;
    }

    sendTelemetryEvent(
        'run-all-testcases',
        {
            language: path.extname(srcPath),
        },
        {
            numTestCases: problem.tests.length,
        },
    );

    const didCompile = await compileFile(srcPath);

    if (!didCompile) {
        console.error('Could not compile', srcPath);
        return;
    }
    await editor.document.save();
    getJudgeViewPorivider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem: problem,
    });
    runAllAndSave(problem);
    vscode.window.showTextDocument(editor.document, vscode.ViewColumn.One);
};

const createLocalProblem = async (editor: vscode.TextEditor) => {
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
    getJudgeViewPorivider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem: newProblem,
    });
};
