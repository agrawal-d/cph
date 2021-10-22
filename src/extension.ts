import * as vscode from 'vscode';
import { setupCompanionServer } from './companion';
import runTestCases from './runTestCases';
import {
    editorChanged,
    editorClosed,
    checkLaunchWebview,
} from './webview/editorChange';
import { submitToCodeForces, submitToKattis } from './submit';
import JudgeViewProvider from './webview/JudgeView';
import { getCompileOnSavePref, getRetainWebviewContextPref } from './preferences';
import { compileOnSave } from './compiler';

let judgeViewProvider: JudgeViewProvider;

declare global {
    module NodeJS {
        interface Global {
            context: vscode.ExtensionContext;
        }
    }
}

export const getJudgeViewProvider = () => {
    return judgeViewProvider;
};

const registerCommands = (context: vscode.ExtensionContext) => {
    console.log('Registering commands');
    const disposable = vscode.commands.registerCommand(
        'cph.runTestCases',
        () => {
            runTestCases();
        },
    );

    const disposable2 = vscode.commands.registerCommand(
        'extension.runCodeforcesTestcases',
        () => {
            runTestCases();
        },
    );

    const disposable3 = vscode.commands.registerCommand(
        'cph.submitToCodeForces',
        () => {
            submitToCodeForces();
        },
    );
    const disposable4 = vscode.commands.registerCommand(
        'cph.submitToKattis',
        () => {
            submitToKattis();
        },
    );

    judgeViewProvider = new JudgeViewProvider(context.extensionUri);

    const webviewView = vscode.window.registerWebviewViewProvider(
        JudgeViewProvider.viewType,
        judgeViewProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: getRetainWebviewContextPref(),
            },
        },
    );

    context.subscriptions.push(webviewView);
    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
    context.subscriptions.push(disposable4);
};

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('cph: activate() execution started');

    global.context = context;

    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        1000,
    );
    statusBarItem.text = ' $(run-all)  Run Testcases';
    statusBarItem.tooltip =
        'Competitive Programming Helper - Run all testcases or create if none exist.';
    statusBarItem.show();
    statusBarItem.command = 'cph.runTestCases';

    registerCommands(context);
    setupCompanionServer();
    checkLaunchWebview();

    vscode.workspace.onDidCloseTextDocument((e) => {
        editorClosed(e);
    });

    vscode.window.onDidChangeActiveTextEditor((e) => {
        editorChanged(e);
    });

    vscode.window.onDidChangeVisibleTextEditors((editors) => {
        if (editors.length === 0) {
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'new-problem',
                problem: undefined,
            });
        }
    });

    vscode.workspace.onDidSaveTextDocument((e) => {
        if (getCompileOnSavePref()) {
            compileOnSave(e);
        }
    });

    return;
}
