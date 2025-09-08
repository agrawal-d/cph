import path from 'path';
import fs from 'fs';
import * as vscode from 'vscode';
import { Problem } from './types';
import { getSaveLocationPref } from './preferences';

/**
 *  Get the location (file path) to save the generated problem file in. If save
 *  location is available in preferences, returns that, otherwise returns the
 *  director of active file. The extension is `.prob`.
 *
 *  @param srcPath location of the source code
 */
export const getProbSaveLocation = (srcPath: string): string => {
    const srcFileName = path.basename(srcPath);
    const srcFolder = path.dirname(srcPath);
    const baseProbName = `${srcFileName}.prob`;
    const cphFolder = path.join(srcFolder, '.cph');
    return path.join(cphFolder, baseProbName);
};

/** Find the .prob path for the given source by scanning ancestor .cph folders. */
export const findProbPath = (srcPath: string): string | null => {
    const srcFolder = path.dirname(srcPath);
    const srcFileName = path.basename(srcPath);

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(srcPath),
    );
    const workspaceRoot = workspaceFolder?.uri.fsPath ?? path.parse(srcFolder).root;

    const ancestors: string[] = [];
    let currentDir = srcFolder;
    // Collect ancestor directories up to workspace root (inclusive)
    while (true) {
        ancestors.push(currentDir);
        if (
            path.resolve(currentDir) === path.resolve(workspaceRoot) ||
            path.dirname(currentDir) === currentDir
        ) {
            break;
        }
        currentDir = path.dirname(currentDir);
    }

    for (const dir of ancestors) {
        const cphFolder = path.join(dir, '.cph');
        if (!fs.existsSync(cphFolder)) {
            continue;
        }
        const files = fs
            .readdirSync(cphFolder)
            .filter((f) => f.endsWith('.prob'));
        if (files.length === 0) {
            continue;
        }
        // Prioritize files that start with the source filename
        const prioritized = [];
        const nonPrioritized = [];
        for (const file of files) {
            const name = file.startsWith('.') ? file.slice(1) : file;
            if (name.startsWith(srcFileName)) {
                prioritized.push(file);
            } else {
                nonPrioritized.push(file);
            }
        }

        const all = [...prioritized, ...nonPrioritized];

        for (const file of all) {
            const fullProbPath = path.join(cphFolder, file);
            try {
                const content = fs.readFileSync(fullProbPath).toString();
                const parsed: Problem = JSON.parse(content);
                const recorded = (parsed as any).srcPath as string | undefined;
                if (!recorded) {
                    continue;
                }
                const parentOfCph = dir; // parent of the .cph folder
                let resolvedRecorded: string;
                if (path.isAbsolute(recorded)) {
                    resolvedRecorded = path.normalize(recorded);
                } else {
                    resolvedRecorded = path.resolve(parentOfCph, recorded);
                }
                if (path.normalize(resolvedRecorded) === path.normalize(srcPath)) {
                    return fullProbPath;
                }
            } catch (_e) {
                // Ignore invalid/partial files
                continue;
            }
        }
    }

    return null;
};

/** Get the problem for a source, `null` if does not exist on the filesystem. */
export const getProblem = (srcPath: string): Problem | null => {
    const probPath = findProbPath(srcPath);
    if (!probPath) {
        return null;
    }
    try {
        const content = fs.readFileSync(probPath).toString();
        const parsed: Problem = JSON.parse(content);
        parsed.srcPath = srcPath;
        return parsed;
    } catch (_e) {
        return null;
    }
};

/** Save the problem (metadata) */
export const saveProblem = (srcPath: string, problem: Problem) => {
    const srcFolder = path.dirname(srcPath);
    const cphFolder = path.join(srcFolder, '.cph');

    const pref = getSaveLocationPref();
    if (pref === '' && !fs.existsSync(cphFolder)) {
        globalThis.logger.log('Making .cph folder');
        fs.mkdirSync(cphFolder);
    }

    const probPath = getProbSaveLocation(srcPath);
    const probDir = path.dirname(probPath);
    if (!fs.existsSync(probDir)) {
        fs.mkdirSync(probDir, { recursive: true });
    }
    try {
        const problemToSave: Problem = {
            ...problem,
            // Store path relative to parent of .cph folder when possible
            srcPath: path.relative(path.dirname(probDir), srcPath),
        };
        fs.writeFileSync(probPath, JSON.stringify(problemToSave, null, 2));
    } catch (err) {
        throw new Error(err as string);
    }
};
