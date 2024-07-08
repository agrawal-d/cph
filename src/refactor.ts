import * as vscode from 'vscode';
import { getWorkspaceRoot } from './utils';
import { getProblem, getProbSaveLocation, saveProblem } from './parser';
import fs from 'fs';

export const editorRename = (e: vscode.FileRenameEvent) => {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) return;
    e.files.forEach((file) => {
        const problem = getProblem(file.oldUri.fsPath);
        if (!problem) return;
        problem.srcPath = file.newUri.fsPath;

        saveProblem(file.newUri.fsPath, problem);
        const oldProblem = getProbSaveLocation(file.oldUri.fsPath);
        fs.unlinkSync(oldProblem);

        console.log(
            'Renamed problem:',
            file.oldUri.fsPath,
            '->',
            file.newUri.fsPath,
        );
    });
};
