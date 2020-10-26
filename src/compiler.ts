import { getLanguage, ocHide, ocShow, ocWrite } from './utils';
import { Language } from './types';
import { spawn } from 'child_process';
import path from 'path';
import { getSaveLocationPref } from './preferences';
import { extensionToWebWiewMessage } from './webview/webview';
import * as vscode from 'vscode';

/**
 *  Get the location to save the generated binary in. If save location is
 *  available in preferences, returns that, otherwise returns the director of
 *  active file.
 *
 *  If it is a interpteted language, simply returns the path to the source code.
 *
 *  @param srcPath location of the source code
 */
export const getBinSaveLocation = (srcPath: string): string => {
    const language = getLanguage(srcPath);
    if (language.skipCompile) {
        return srcPath;
    }
    const ext = language.name == 'java' ? '*.class' : '.bin';
    const savePreference = getSaveLocationPref();
    const srcFileName = path.parse(srcPath).name;
    const binFileName = srcFileName + ext;
    const binDir = path.dirname(srcPath);
    if (savePreference && savePreference !== '') {
        return path.join(savePreference, binFileName);
    }
    return path.join(binDir, binFileName);
};

/**
 * Get the complete lsit of required arguments to be passed to the compiler.
 * Loads additional args from preferences if available.
 *
 * @param language The Language object for the source code
 * @param srcPath location of the source code
 */
const getFlags = (language: Language, srcPath: string): string[] => {
    // The language.args are fetched from user saved preferences, if any.
    let args = language.args;
    if (args[0] === '') args = [];

    switch (language.name) {
        case 'cpp': {
            return [
                srcPath,
                '-o',
                getBinSaveLocation(srcPath),
                ...args,
                '-D',
                'ONLINE_JUDGE',
                '-D',
                'CPH',
            ];
        }
        case 'c': {
            {
                return [srcPath, '-o', getBinSaveLocation(srcPath), ...args];
            }
        }
        case 'rust': {
            return [srcPath, '-o', getBinSaveLocation(srcPath), ...args];
        }
        case 'java': {
            const binDir = path.dirname(getBinSaveLocation(srcPath));
            return [srcPath, '-d', binDir, ...args];
        }
        default: {
            return [];
        }
    }
};

/**
 * Compile a source file, storing the output binary in a location based on user
 * preferences. If `skipCompile` is true for a language, skips the compilation
 * and resolves true. If there is no preference, stores in the current
 * directory. Resolves true if it succeeds, false otherwise.
 *
 * Saves the file before compilation starts.
 *
 * @param srcPath location of the source code
 */
export const compileFile = async (srcPath: string): Promise<boolean> => {
    console.log('Compilation Started');
    await vscode.workspace.openTextDocument(srcPath).then((doc) => doc.save());
    ocHide();
    const language: Language = getLanguage(srcPath);
    if (language.skipCompile) {
        return Promise.resolve(true);
    }
    extensionToWebWiewMessage({
        command: 'compiling-start',
    });
    const flags: string[] = getFlags(language, srcPath);
    console.log('Compiling with flags', flags);
    const result = new Promise<boolean>((resolve) => {
        let compiler;
        try {
            compiler = spawn(language.compiler, flags);
        } catch (err) {
            vscode.window.showErrorMessage(
                `Could not launch the compiler ${language.compiler}. Is it installed?`,
            );
            throw err;
        }
        let error = '';

        compiler.stderr.on('data', (data) => {
            error += data;
        });

        compiler.on('exit', (exitcode) => {
            if (exitcode === 1 || error !== '') {
                ocWrite('Errors while compiling:\n' + error);
                ocShow();
                console.error('Compilation failed');
                resolve(false);
                extensionToWebWiewMessage({
                    command: 'compiling-stop',
                });
                return;
            }
            console.log('Compilation passed');
            extensionToWebWiewMessage({
                command: 'compiling-stop',
            });
            resolve(true);
            return;
        });
    });
    return result;
};
