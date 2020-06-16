import * as vscode from 'vscode';
import { WebviewToVSEvent, Problem, VSToWebViewMessage } from '../types';
import { killRunning } from '../runs/executions';
import path from 'path';
import { runSingleAndSave } from './runSingleAndSave';
import { saveProblem } from '../parser';
import runAllAndSave from './runAllAndSave';
import { readFileSync } from 'fs';

let resultsPanel: vscode.WebviewPanel | undefined;
let problemName = '';

/**
 * Creates a 2x1 grid 0.75+0.25
 */
const createLayout = (): Thenable<void> => {
    return vscode.commands.executeCommand('vscode.setEditorLayout', {
        orientation: 0,
        groups: [
            { groups: [{}], size: 0.75 },
            { groups: [{}], size: 0.25 },
        ],
    });
};

/** Create and show a webview panel ( but without content ) */
const initializeWebView = (): void => {
    console.log('Initializing webview');
    resultsPanel = vscode.window.createWebviewPanel(
        'evalResults',
        'Judge Results',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        },
    );

    resultsPanel.onDidDispose(() => {
        resultsPanel = undefined;
        clearProblemName();
    });
};

/**
 * Setup and handle events from WebView to Extension
 */
const setupListnersWebViewToExtension = (): void => {
    if (resultsPanel === undefined) {
        console.warn(
            "Failed to set up message listeners for web view because it's undefined",
        );
        return;
    }
    // Events from WebView to Extension
    resultsPanel.webview.onDidReceiveMessage(
        async (message: WebviewToVSEvent) => {
            console.log('Got from webview', message);
            switch (message.command) {
                case 'run-single-and-save': {
                    const problem = message.problem;
                    const id = message.id;
                    runSingleAndSave(problem, id);
                    break;
                }
                case 'run-all-and-save': {
                    const problem = message.problem;
                    runAllAndSave(problem);
                    break;
                }
                case 'save': {
                    saveProblem(message.problem.srcPath, message.problem);
                    break;
                }
                case 'kill-running': {
                    killRunning();
                    break;
                }
                default: {
                    console.error('Unknown event received from webview');
                }
            }
        },
    );
};

/**
 * Create and show an empty webview if one is not already open.
 */
export const startWebVeiwIfNotActive = async () => {
    if (resultsPanel === undefined) {
        console.log('Starting webview');
        initializeWebView();
        await createLayout();
        setupListnersWebViewToExtension();
    } else {
        console.log('Webivew exists - skipping creation');
    }
};

export const getExtensionResource = (
    context: vscode.ExtensionContext,
    ...args: string[]
): vscode.Uri => {
    if (resultsPanel === undefined) {
        console.error('Webview us undefined');
        throw new Error('Webview is undefined');
    }

    return resultsPanel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, ...args)),
    );
};

export const setBaseWebViewHTML = async (
    context: vscode.ExtensionContext,
    problem: Problem,
) => {
    problemName = problem.name;
    if (resultsPanel === undefined) {
        console.error('Webview us undefined');
        throw new Error('Webview is undefined');
    }
    // Current VS Implementation is buggy. Revert when it's fixed. For now, read
    // using fs. PREV: const appScript = getExtensionResource(context, 'dist',
    // 'frontend.module.js',
    // );
    // const appCss = getExtensionResource(context, 'dist', 'app.css');
    const css = readFileSync(
        path.join(context.extensionPath, 'dist', 'app.css'),
    ).toString();
    const frontendModule = readFileSync(
        path.join(context.extensionPath, 'dist', 'frontend.module.js'),
    ).toString();
    const html = `
<!DOCTYPE html lang="EN">
<html>
<head>
<style>
${css}
</style>
<meta charset="UTF-8" />
</head>
<body>
<div id="problem" hidden>
${JSON.stringify(problem)}
</div>
<div id="app">An error occurred! Please reopen the source code file. ( Ctrl+W then Ctrl+Shift+T )</div>
<script>
${frontendModule}
</script>
</body>
</html>
`;
    resultsPanel.webview.html = html;
};

/**
 *
 * Posts a message to the webview if present.
 *
 * @param message The message to be posted
 */
export const extensionToWebWiewMessage = async (
    message: VSToWebViewMessage,
) => {
    if (!resultsPanel) {
        console.error(
            'Trying to post message to non existent webview',
            message,
        );
        return;
    }
    await resultsPanel.webview.postMessage(message);
};

export const closeWebVeiw = () => {
    if (resultsPanel) {
        resultsPanel.dispose();
    }
};

export const webViewExists = () => resultsPanel !== undefined;

export const getWebViewProblemName = () => problemName;

export const clearProblemName = () => {
    problemName = '';
};
