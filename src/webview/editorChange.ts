import * as vscode from 'vscode';
import { getProbSaveLocation } from '../parser';
import { existsSync, readFileSync } from 'fs';
import { Problem } from '../types';
import { getJudgeViewProvider } from '../extension';
import { getProblemForDocument } from '../utils';
import { getAutoShowJudgePref, getDefaultOnlineJudge } from '../preferences';
import { setOnlineJudgeEnv } from '../compiler';

/**
 * Tracks the source file that onlineJudgeEnv was last reset for, so that
 * refocusing the same file (e.g. after clicking into the Judge webview panel
 * and back) does not silently discard a manual "Set ONLINE_JUDGE" toggle.
 */
let lastOnlineJudgeResetSrcPath: string | undefined;

/**
 * Show the webview with the problem details if a source code with existing
 * saved problem is opened. If switch is to an invalid document of unsaved
 * problem, closes the active webview, if any.
 *
 * @param e An editor
 * @param context The activation context
 */
export const editorChanged = async (e: vscode.TextEditor | undefined) => {
    globalThis.logger.log('Changed editor to', e?.document.fileName);

    if (e === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
        });
        // Note: this branch fires whenever focus moves away from any text
        // editor (e.g. into the Judge webview panel itself), not only when
        // switching between source files, so onlineJudgeEnv is intentionally
        // NOT reset here anymore - see below.
        return;
    }

    if (e.document.uri.scheme !== 'file') {
        return;
    }

    const srcPath = e.document.uri.fsPath;
    if (srcPath !== lastOnlineJudgeResetSrcPath) {
        // Only reset to the configured default when switching to a
        // genuinely different source file. Previously this ran on every
        // onDidChangeActiveTextEditor event, which also fires when focus
        // returns to the same file after interacting with the Judge webview
        // (e.g. clicking the "Set ONLINE_JUDGE" checkbox), silently
        // discarding that manual toggle before compilation could use it.
        setOnlineJudgeEnv(getDefaultOnlineJudge());
        lastOnlineJudgeResetSrcPath = srcPath;
    }

    const problem = getProblemForDocument(e.document);

    if (problem === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
        });
        return;
    }

    if (
        getAutoShowJudgePref() &&
        getJudgeViewProvider().isViewUninitialized()
    ) {
        vscode.commands.executeCommand('cph.judgeView.focus');
    }

    globalThis.logger.log('Sent problem @', Date.now());
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem,
    });
};

export const editorClosed = (e: vscode.TextDocument) => {
    globalThis.logger.log('Closed editor:', e.uri.fsPath);
    const srcPath = e.uri.fsPath;
    const probPath = getProbSaveLocation(srcPath);

    if (!existsSync(probPath)) {
        return;
    }

    const problem: Problem = JSON.parse(readFileSync(probPath).toString());

    if (getJudgeViewProvider().problemPath === problem.srcPath) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
        });
    }
};

export const checkLaunchWebview = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    editorChanged(editor);
};
