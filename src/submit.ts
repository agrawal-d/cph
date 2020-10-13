import { getProblem } from './parser';
import * as vscode from 'vscode';
import { storeSubmitProblem } from './companion';
import { extensionToWebWiewMessage } from './webview/webview';

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
    extensionToWebWiewMessage({ command: 'waiting-for-submit' });
};

/** Get the problem name ( like 144C ) for a given Codeforces URL string. */
export const getProblemName = (problemUrl: string): string => {
    const parts = problemUrl.split('/');
    let problemName: string;

    if (parts.find((x) => x == 'contest')) {
        // Url is like https://codeforces.com/contest/1398/problem/C
        problemName = parts[parts.length - 3] + parts[parts.length - 1];
    } else {
        // Url is like https://codeforces.com/problemset/problem/1344/F
        problemName = parts[parts.length - 2] + parts[parts.length - 1];
    }

    return problemName;
};
