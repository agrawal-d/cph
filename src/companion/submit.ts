import { getProblem } from '../parser';
import * as vscode from 'vscode';
import { storeSubmitProblem } from '.';

export const submitToCodeForces = () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            'Active editor is not supported for submission',
        );
        return;
    }

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage('Failed to parse current code.');
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        console.error(err);
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    if (url.hostname !== 'codeforces.com') {
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    storeSubmitProblem(problem);
};
