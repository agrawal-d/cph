import { readFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';

const problem = {
    name: "F. Piet's Palette",
    group: 'Codeforces - Codeforces Round #639 (Div. 1)',
    url: 'https://codeforces.com/problemset/problem/1344/F',
    interactive: false,
    memoryLimit: 256,
    timeLimit: 2000,
    tests: [
        {
            input: '3 2\nmix 2 2 1 R\nmix 2 1 3 Y\n',
            output: 'YES\nYB.\n',
            id: 1605954309766,
        },
        {
            id: 1605954309814,
            input: '2 3\nmix 1 2 Y\nRB 1 2\nmix 1 2 W',
            output: '',
        },
        {
            input: '1 3\nRY 1 1\nYB 1 1\nmix 1 1 B\n',
            output: 'YES\nR\n',
            id: 1605954309792,
        },
        {
            id: 1605954309810,
            input:
                '3 8\nmix 2 1 2 R\nmix 2 1 3 Y\nRY 2 2 3\nRB 3 1 2 3\nYB 3 1 2 3\nmix 1 1 W\nmix 1 2 B\nmix 1 3 Y',
            output: 'YES\n.RY',
        },
    ],
    testType: 'single',
    input: { type: 'stdin' },
    output: { type: 'stdout' },
    languages: {
        java: { mainClass: 'Main', taskClass: 'FPietsPalette' },
    },
    srcPath: '/home/divyanshu/testdir-cph/F_Piet_s_Palette.cpp',
};

// export function activate(context: vscode.ExtensionContext) {
//     const provider = new ColorsViewProvider(context.extensionUri);

//     context.subscriptions.push(
//         vscode.window.registerWebviewViewProvider(
//             ColorsViewProvider.viewType,
//             provider,
//         ),
//     );

//     context.subscriptions.push(
//         vscode.commands.registerCommand('calicoColors.addColor', () => {
//             provider.addColor();
//         }),
//     );

//     context.subscriptions.push(
//         vscode.commands.registerCommand('calicoColors.clearColors', () => {
//             provider.clearColors();
//         }),
//     );
// }

class JudgeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cph.judgeView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((data) => {
            switch (data.type) {
                case 'colorSelected': {
                    vscode.window.activeTextEditor?.insertSnippet(
                        new vscode.SnippetString(`#${data.value}`),
                    );
                    break;
                }
            }
        });
    }

    public addColor() {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'addColor' });
        }
    }

    public clearColors() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearColors' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'),
        );

        // Do the same for the stylesheet.
        // const styleResetUri = webview.asWebviewUri(
        //     vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'),
        // );
        // const styleVSCodeUri = webview.asWebviewUri(
        //     vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
        // );
        // const styleMainUri = webview.asWebviewUri(
        //     vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'),
        // );

        const css = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'app.css'),
        );
        const frontendModule = webview.asWebviewUri(
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
<div id="problem" hidden>
${JSON.stringify(problem)}
</div>
<div id="app">An error occurred! Please reopen the source code file. ( Ctrl+W then Ctrl+Shift+T )</div>
<script src="${frontendModule}">
</script>
</body>
</html>
`;

        return html;
    }
}

export default JudgeViewProvider;
