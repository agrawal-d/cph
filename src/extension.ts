import * as vscode from 'vscode';
import { setupCompanionServer } from './companion';
import runTestCases from './runs/runTestCases';
import {
    editorChanged,
    editorClosed,
    checkLaunchWebview,
} from './webview/editorChange';
import { submitToCodeForces } from './companion/submit';

declare global {
    module NodeJS {
        interface Global {
            context: vscode.ExtensionContext;
        }
    }
}

const registerCommands = (context: vscode.ExtensionContext) => {
    console.log('Registering commands');
    const disposable = vscode.commands.registerCommand(
        'cph.runTestCases',
        () => {
            runTestCases(context);
        },
    );

    const disposable2 = vscode.commands.registerCommand(
        'extension.runCodeforcesTestcases',
        () => {
            runTestCases(context);
        },
    );

    const disposable3 = vscode.commands.registerCommand(
        'cph.submitToCodeForces',
        () => {
            submitToCodeForces();
        },
    );

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
};

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('cph: activate() execution started');

    global.context = context;

    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        1000,
    );
    statusBarItem.text = ' ▶  Run Testcases';
    statusBarItem.tooltip = 'Competitive Programming Helper';
    statusBarItem.show();
    statusBarItem.command = 'cph.runTestCases';

    registerCommands(context);
    setupCompanionServer();
    checkLaunchWebview(context);

    vscode.workspace.onDidCloseTextDocument((e) => {
        editorClosed(e, context);
    });

    vscode.window.onDidChangeActiveTextEditor((e) => {
        editorChanged(e, context);
    });

    return;
}
