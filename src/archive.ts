import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { getProblem, saveProblem, getProbSaveLocation } from './parser';
import { editorChanged } from './webview/editorChange';

export async function archiveActiveProblem(context: vscode.ExtensionContext) {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;
    if (!srcPath) {
        vscode.window.showErrorMessage(
            'Active editor is not supported for archiving',
        );
        return;
    }
    const srcFolder = path.dirname(srcPath);
    const srcFileName = path.basename(srcPath);
    const problem = getProblem(srcPath);
    if (problem == null) {
        vscode.window.showInformationMessage(
            'Active document is not a problem',
        );
        return;
    }
    const newSrcFolder = await vscode.window.showInputBox({
        value: srcFolder,
        validateInput: (text) => {
            vscode.window.showInformationMessage(`Validating: ${text}`);
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(
                vscode.Uri.parse(text),
            );
            if (workspaceFolder == undefined) {
                return `${text} is not in the current workspace`;
            }
            return null;
        },
    });
    if (newSrcFolder == undefined) {
        vscode.window.showInformationMessage('Canceled problem archiving.');
        return;
    }
    const newSrcPath = path.join(newSrcFolder, srcFileName);
    vscode.commands.executeCommand('workbench.action.files.save');
    fs.rename(srcPath, newSrcPath, (err) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
    });
    problem.srcPath = newSrcPath;
    saveProblem(newSrcPath, problem);
    fs.unlink(getProbSaveLocation(srcPath), (err) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
            return;
        }
    });
    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(newSrcPath));
    const e = vscode.window.activeTextEditor;
    editorChanged(e, context);
}
