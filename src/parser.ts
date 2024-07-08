import path from 'path';
import fs from 'fs';
import { Problem } from './types';
import { getSaveLocationPref } from './preferences';
import crypto from 'crypto';
import { getWorkspaceRoot } from './utils';

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
    const workspaceFolder = getWorkspaceRoot();
    if (workspaceFolder) srcPath = path.relative(workspaceFolder, srcPath);
    const hash = crypto
        .createHash('md5')
        .update(srcPath)
        .digest('hex')
        .substr(0);
    const baseProbName = `.${srcFileName}_${hash}.prob`;
    const cphFolder = path.join(srcFolder, '.cph');
    if (workspaceFolder) {
        return path.join(workspaceFolder, '.cph', baseProbName);
    } else if (savePreference && savePreference !== '') {
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

        const parsedProblem = JSON.parse(problem);
        if (parsedProblem == null) return null;

        const workspaceRoot = getWorkspaceRoot();
        if (workspaceRoot) {
            parsedProblem.srcPath = path.resolve(
                workspaceRoot,
                parsedProblem.srcPath,
            );
        }
        return parsedProblem;
    } catch (err) {
        return null;
    }
};

/** Get the problem from the problem path instead of the source path */
export const getProblemFromProbPath = (probPath: string): Problem | null => {
    let problem: string;
    try {
        problem = fs.readFileSync(probPath).toString();
    } catch (e) {
        return null;
    }
    const parsedProblem = JSON.parse(problem);
    const workspaceRoot = getWorkspaceRoot();

    if (parsedProblem == null) return null;
    if (workspaceRoot) {
        parsedProblem.srcPath = path.resolve(
            workspaceRoot,
            parsedProblem.srcPath,
        );
    }
    return parsedProblem;
};

/** Save the problem (metadata) */
export const saveProblem = (srcPath: string, problem: Problem) => {
    const srcFolder = path.dirname(srcPath);
    const cphFolder = path.join(srcFolder, '.cph');
    const workspaceRoot = getWorkspaceRoot();
    let probFolder: string;

    if (workspaceRoot) {
        probFolder = path.join(workspaceRoot, '.cph');
        if (!fs.existsSync(probFolder)) {
            console.log('Making workspaceRoot/.cph folder');
            fs.mkdirSync(probFolder);
        }
    } else if (getSaveLocationPref() === '' && !fs.existsSync(cphFolder)) {
        probFolder = cphFolder;
        console.log('Making .cph folder');
        fs.mkdirSync(cphFolder);
    }

    const probPath = getProbSaveLocation(srcPath);
    try {
        let tmpPath: string = '';
        if (workspaceRoot) {
            tmpPath = problem.srcPath;
            problem.srcPath = path.relative(workspaceRoot, srcPath);
        }

        fs.writeFileSync(probPath, JSON.stringify(problem));

        if (tmpPath) {
            problem.srcPath = tmpPath;
        }
    } catch (err) {
        throw new Error(err as string);
    }
};
