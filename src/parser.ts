import path from 'path';
import fs from 'fs';
import { Problem } from './types';
import { getSaveLocationPref } from './preferences';
import crypto from 'crypto';
import * as vscode from 'vscode';

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
    const srcFolder = path.dirname(srcPath);
    // If this file belongs to a workspace folder, prefer a deterministic
    // relative-path-based filename. Otherwise fall back to the old
    // `.<filename>_<md5>.prob` hash-based name.
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(srcPath),
    );

    let baseProbName: string;

    if (workspaceFolder) {
        // compute path relative to workspace root and use $$ as separator
        let rel = path.relative(workspaceFolder.uri.fsPath, srcPath);
        // Remove any drive colon on Windows (e.g. C:)
        rel = rel.replace(/:/g, '');
        const parts = rel.split(path.sep);
        baseProbName = `.${parts.join('$$')}.prob`;

        // perform migration of old hashed .prob files into .cph/old (if using
        // the per-folder .cph location). We only attempt this when save
        // preference is not set (that's when .cph sits next to sources).
        const cphFolder = path.join(srcFolder, '.cph');
        try {
            if (getSaveLocationPref() === '' && fs.existsSync(cphFolder)) {
                const oldFolder = path.join(cphFolder, 'old');
                const files = fs.readdirSync(cphFolder);
                const oldRegex = /^(\..+)_[0-9a-f]{32}\.prob$/i;
                for (const f of files) {
                    const oldFileMatch = f.match(oldRegex);
                    if (!oldFileMatch) continue;

                    if (!fs.existsSync(oldFolder)) {
                        fs.mkdirSync(oldFolder);
                    }
                    const from = path.join(cphFolder, f);
                    const to = path.join(oldFolder, f);
                    try {
                        // Read the old problem file and write it to the new format
                        const oldProblem = JSON.parse(
                            fs.readFileSync(from).toString(),
                        );
                        const newProbPath = path.join(
                            cphFolder,
                            `${oldFileMatch[1]}.prob`,
                        );
                        // Don't include srcPath in the new format
                        const toWrite = { ...oldProblem };
                        delete toWrite.srcPath;
                        fs.writeFileSync(
                            newProbPath,
                            JSON.stringify(toWrite, null, 2),
                        );

                        // Move the old file to old/
                        fs.renameSync(from, to);
                    } catch (e) {
                        // If migration fails, skip and continue.
                        globalThis.logger.error(
                            `Failed to migrate ${from} -> ${to}: ${e}`,
                        );
                    }
                }
            }
        } catch (e) {
            globalThis.logger.error('Error during .prob migration', e);
        }
    } else {
        const hash = crypto
            .createHash('md5')
            .update(srcPath)
            .digest('hex')
            .substr(0);
        baseProbName = `.${srcFileName}_${hash}.prob`;
    }

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
        const parsed: Problem = JSON.parse(problem);
        // populate srcPath in-memory so callers don't have to change.
        parsed.srcPath ??= srcPath;
        return parsed;
    } catch (err) {
        return null;
    }
};

/** Save the problem (metadata) */
export const saveProblem = (srcPath: string, problem: Problem) => {
    const srcFolder = path.dirname(srcPath);
    const cphFolder = path.join(srcFolder, '.cph');

    if (getSaveLocationPref() === '' && !fs.existsSync(cphFolder)) {
        globalThis.logger.log('Making .cph folder');
        fs.mkdirSync(cphFolder);
    }

    const probPath = getProbSaveLocation(srcPath);
    try {
        // If this file belongs to a workspace folder, we omit srcPath from the
        // on-disk JSON because it's encoded in the filename. We still keep it
        // in-memory when returning/working with problems.
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
            vscode.Uri.file(srcPath),
        );

        let toWrite = problem;
        if (workspaceFolder) {
            toWrite = { ...problem };
            delete toWrite.srcPath;
        }
        fs.writeFileSync(probPath, JSON.stringify(toWrite, null, 2));
    } catch (err) {
        throw new Error(err as string);
    }
};
