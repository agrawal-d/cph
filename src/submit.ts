import { getProblem } from './parser';
import * as vscode from 'vscode';
import { storeSubmitProblem, submitKattisProblem } from './companion';
import { getJudgeViewProvider } from './extension';
import telmetry from './telmetry';

export const submitToKattis = async () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.SUBMIT_TO_KATTIS);
    const srcPath = vscode.window.activeTextEditor?.document.fileName;
    if (!srcPath) {
        vscode.window.showErrorMessage(
            'Active editor is not supported for submission',
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage('Failed to parse current code.');
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage('Not a kattis problem.');
        return;
    }

    if (url.hostname !== 'open.kattis.com') {
        vscode.window.showErrorMessage('Not a kattis problem.');
        return;
    }

    submitKattisProblem(problem);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'waiting-for-submit',
    });
};

export const submitToCodeForces = async () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            'Active editor is not supported for submission',
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage('Failed to parse current code.');
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    if (url.hostname !== 'codeforces.com') {
        vscode.window.showErrorMessage('Not a codeforces problem.');
        return;
    }

    storeSubmitProblem(problem);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'waiting-for-submit',
    });
};

/** Get the problem name ( like 144C ) for a given Codeforces URL string. */
export const getProblemName = (problemUrl: string): string => {
    const regexPatterns = [
        /\/contest\/(\d+)\/problem\/(\w+)/,
        /\/problemset\/problem\/(\d+)\/(\w+)/,
        /\/gym\/(\d+)\/problem\/(\w+)/,
    ];

    for (const regex of regexPatterns) {
        const match = problemUrl.match(regex);
        if (match) {
            return match[1] + match[2];
        }
    }

    return '';
};
