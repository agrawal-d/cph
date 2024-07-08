import * as vscode from 'vscode';
import { getWorkspaceRoot } from './utils';
import {
    getProblemFromProbPath,
    getProbSaveLocation,
    saveProblem,
} from './parser';
import fs from 'fs';

export const editorRename = (e: vscode.FileRenameEvent) => {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) return;
    e.files.forEach((file) => {
        const oldProblemPath = getProbSaveLocation(file.oldUri.fsPath);
        const problem = getProblemFromProbPath(oldProblemPath);
        if (!problem) return;
        problem.srcPath = file.newUri.fsPath;

        saveProblem(file.newUri.fsPath, problem);
        fs.unlinkSync(oldProblemPath);

        console.log(
            'Renamed problem:',
            file.oldUri.fsPath,
            '->',
            file.newUri.fsPath,
        );
    });
};
