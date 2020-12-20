import * as vscode from 'vscode';
import { storeSubmitProblem, submitKattisProblem } from '../companion';
import { killRunning } from '../executions';
import { saveProblem } from '../parser';
import { VSToWebViewMessage, WebviewToVSEvent } from '../types';
import { deleteProblemFile } from '../utils';
import { runSingleAndSave } from './processRunSingle';
import runAllAndSave from './processRunAll';

class JudgeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cph.judgeView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
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

                    case 'delete-tcs': {
                        this.extensionToJudgeViewMessage({
                            command: 'new-problem',
                            problem: undefined,
                        });
                        deleteProblemFile(message.problem.srcPath);
                        break;
                    }

                    case 'submitCf': {
                        storeSubmitProblem(message.problem);
                        break;
                    }
                    case 'submitKattis': {
                        submitKattisProblem(message.problem);
                        break;
                    }

                    default: {
                        console.error('Unknown event received from webview');
                    }
                }
            },
        );
    }

    public problemPath: string | undefined;

    /** Posts a message to the webview. */
    public extensionToJudgeViewMessage = async (
        message: VSToWebViewMessage,
    ) => {
        if (this._view) {
            // Always focus on the view whenever a command is posted. Meh.
            // this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage(message);
            if (message.command !== 'submit-finished') {
                console.log('View got message', message);
            }
            if (message.command === 'new-problem') {
                if (message.problem === undefined) {
                    this.problemPath = undefined;
                } else {
                    this.problemPath = message.problem.srcPath;
                }
            }
        }
    };

    private _getHtmlForWebview(webview: vscode.Webview) {
        const css = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'app.css'),
        );

        const js = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'frontend.module.js',
            ),
        );

        const html = `
            <!DOCTYPE html lang="EN">
            <html>
                <head>
                    <link rel="stylesheet" href="${css}" />
                    <meta charset="UTF-8" />
                </head>
                <body>
                    <div id="app">
                        An error occurred! Restarting VS Code may solve the
                        issue. If not, please
                        <a href="https://github.com/agrawal-d/cph/issues"
                            >report the bug on GitHub</a
                        >.
                    </div>
                    <script src="${js}"></script>
                    <script>
                        // Since the react script takes time to load, the problem is sent to the webview before it has even loaded.
                        // So, for the initial request, ask for it again.
                        document.addEventListener(
                            'DOMContentLoaded',
                            (event) => {
                                acquireVsCodeApi().postMessage({
                                    command: 'get-initial-problem',
                                });
                            },
                        );
                    </script>
                </body>
            </html>
        `;

        return html;
    }
}

export default JudgeViewProvider;
