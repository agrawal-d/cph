import path from 'path';
import fs from 'fs';
import { Problem } from './types';
import { getSaveLocationPref } from './preferences';
import crypto from 'crypto';
import { Uri, workspace } from 'vscode';

/**
 *  Get the location (file path) to save the generated problem file in. If save
 *  location is available in preferences, returns that, otherwise returns the
 *  director of active file. The extension is `.prob`.
 *
 *  @param srcPath location of the source code
 */
export const getProbSaveLocation = (srcPath: string): string => {
    const savePreference = getSaveLocationPref();
    const srcFileName = path.basename(srcPath);

    // Use workspace root if available, otherwise use source file's directory
    const uri = Uri.file(srcPath);
    const workspaceFolder = workspace.getWorkspaceFolder(uri);
    const srcFolder = workspaceFolder
        ? workspaceFolder.uri.fsPath
        : path.dirname(srcPath);

    const hash = crypto
        .createHash('md5')
        .update(srcPath)
        .digest('hex')
        .substr(0);
    const baseProbName = `.${srcFileName}_${hash}.prob`;
    const cphFolder = path.join(srcFolder, '.cph');
    if (savePreference && savePreference !== '') {
        return path.join(savePreference, baseProbName);
    }
    return path.join(cphFolder, baseProbName);
};

/** Get the problem for a source, `null` if does not exist on the filesystem. */
export const getProblem = (srcPath: string): Problem | null => {
    const probPath = getProbSaveLocation(srcPath);
    let problem: string;
    try {
        problem = fs.readFileSync(probPath).toString();
        return JSON.parse(problem);
    } catch (err) {
        return null;
    }
};

/**
 * Saves the problem metadata to a file.
 * If the `.cph` directory doesn't exist and no custom save location is set, it creates the directory.
 *
 * @param srcPath - The file path of the source code.
 * @param problem - The problem object containing test cases and metadata.
 */
export const saveProblem = (srcPath: string, problem: Problem) => {
    // Get the full path where the problem should be saved
    const probPath = getProbSaveLocation(srcPath);
    // Get the directory containing the problem file
    const cphFolder = path.dirname(probPath);

    // If no custom save location preference is set and the directory doesn't exist, create it
    if (getSaveLocationPref() === '' && !fs.existsSync(cphFolder)) {
        globalThis.logger.log('Making .cph folder');
        fs.mkdirSync(cphFolder, { recursive: true });
    }

    try {
        fs.writeFileSync(probPath, JSON.stringify(problem));
    } catch (err) {
        throw new Error(err as string);
    }
};
