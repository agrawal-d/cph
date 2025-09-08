import path from 'path';
import fs from 'fs';
import { Problem } from './types';
import { getSaveLocationPref } from './preferences';
import crypto from 'crypto';

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
    const hash = crypto
        .createHash('md5')
        .update(srcPath)
        .digest('hex')
        .substr(0);
    const baseProbName = `${srcFileName}_${hash}.prob`;
    const cphFolder = path.join(srcFolder, '.cph');
    return path.join(cphFolder, baseProbName);
};

/** Get the problem for a source, `null` if does not exist on the filesystem. */
export const getProblem = (srcPath: string): Problem | null => {
    const probPath = getProbSaveLocation(srcPath);
    let problem: string;
    try {
        problem = fs.readFileSync(probPath).toString();
        const parsed: Problem = JSON.parse(problem);
        parsed.srcPath = srcPath;
        return parsed;
    } catch (err) {
        // Fallback to legacy .prob path (leading dot in filename)
        try {
            const srcFileName = path.basename(srcPath);
            const srcFolder = path.dirname(srcPath);
            const hash = crypto
                .createHash('md5')
                .update(srcPath)
                .digest('hex')
                .substr(0);
            const baseProbNameLegacy = `.${srcFileName}_${hash}.prob`;
            const cphFolder = path.join(srcFolder, '.cph');
            const legacyProbPath = path.join(cphFolder, baseProbNameLegacy);
            problem = fs.readFileSync(legacyProbPath).toString();
            const parsed: Problem = JSON.parse(problem);
            parsed.srcPath = srcPath;
            return parsed;
        } catch (err2) {
            return null;
        }
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
            srcPath: path.basename(srcPath),
        };
        fs.writeFileSync(probPath, JSON.stringify(problemToSave));
    } catch (err) {
        throw new Error(err as string);
    }
};
