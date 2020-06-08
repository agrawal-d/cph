import * as vscode from 'vscode';
import { getProbSaveLocation } from '../parser';
import { existsSync, readFileSync } from 'fs';
import {
    startWebVeiwIfNotActive,
    setBaseWebViewHTML,
    closeWebVeiw,
    getWebViewProblemName,
} from '.';
import { Problem } from '../types';

/**
 * Show the webview with the problem details if a source code with existing
 * saved problem is opened. If switch is to an invalid document of unsaved
 * problem, closes the active webview, if any.
 *
 * @param e An editor
 * @param context The activation context
 */
export const editorChanged = async (
    e: vscode.TextEditor | undefined,
    context: vscode.ExtensionContext,
) => {
    console.log('Changed editor to', e?.document.fileName);

    if (e === undefined) {
        return;
    }

    const srcPath = e.document.fileName;
    const probPath = getProbSaveLocation(srcPath);

    if (!existsSync(probPath)) {
        closeWebVeiw();
        return;
    }

    const problem: Problem = JSON.parse(readFileSync(probPath).toString());

    if (getWebViewProblemName() === problem.name) {
        console.log('Same problem. Skipping new webview.');
        return;
    }

    await startWebVeiwIfNotActive();
    await setBaseWebViewHTML(context, problem);
};

export const editorClosed = (
    e: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: vscode.ExtensionContext,
) => {
    console.log('Closed editor:', e.uri.fsPath);
    const srcPath = e.uri.fsPath;
    const probPath = getProbSaveLocation(srcPath);

    if (!existsSync(probPath)) {
        return;
    }

    const problem: Problem = JSON.parse(readFileSync(probPath).toString());

    if (getWebViewProblemName() === problem.name) {
        closeWebVeiw();
    }
};

export const checkLaunchWebview = (context: vscode.ExtensionContext) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    editorChanged(editor, context);
};
