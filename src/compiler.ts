import { getLanguage, ocHide, ocShow, ocWrite } from './utils';
import { Language } from './types';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { platform } from 'os';
import path from 'path';
import {
    getCOutputArgPref,
    getCppOutputArgPref,
    getSaveLocationPref,
    getHideStderrorWhenCompiledOK,
} from './preferences';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from './extension';
export let onlineJudgeEnv = false;

export const setOnlineJudgeEnv = (value: boolean) => {
    onlineJudgeEnv = value;
    globalThis.logger.log('online judge env:', onlineJudgeEnv);
};

/**
 *  Get the location to save the generated binary in. If save location is
 *  available in preferences, returns that, otherwise returns the directory of
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
    let ext: string;
    switch (language.name) {
        case 'java': {
            ext = '*.class';
            break;
        }
        case 'csharp': {
            ext = language.compiler.includes('dotnet') ? '_bin' : '.bin';
            break;
        }
        default: {
            ext = '.bin';
        }
    }
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
 * Get the complete list of required arguments to be passed to the compiler.
 * Loads additional args from preferences if available.
 *
 * @param language The Language object for the source code
 * @param srcPath location of the source code
 */
const getFlags = (language: Language, srcPath: string): string[] => {
    // The language.args are fetched from user saved preferences, if any.
    let args = language.args;
    if (args[0] === '') args = [];
    let ret: string[];
    switch (language.name) {
        case 'cpp':
        case 'cc':
        case 'cxx': {
            ret = [
                srcPath,
                getCppOutputArgPref(),
                getBinSaveLocation(srcPath),
                ...args,
                '-D',
                'DEBUG',
                '-D',
                'CPH',
            ];
            if (onlineJudgeEnv) {
                ret.push('-D');
                ret.push('ONLINE_JUDGE');
            }
            break;
        }
        case 'c': {
            {
                ret = [
                    srcPath,
                    getCOutputArgPref(),
                    getBinSaveLocation(srcPath),
                    ...args,
                ];
                if (onlineJudgeEnv) {
                    ret.push('-D');
                    ret.push('ONLINE_JUDGE');
                }
                break;
            }
        }
        case 'rust': {
            ret = [srcPath, '-o', getBinSaveLocation(srcPath), ...args];
            break;
        }
        case 'go': {
            ret = [
                'build',
                '-o',
                getBinSaveLocation(srcPath),
                srcPath,
                ...args,
            ];
            break;
        }
        case 'java': {
            const binDir = path.dirname(getBinSaveLocation(srcPath));
            ret = [srcPath, '-d', binDir, ...args];
            break;
        }
        case 'hs': {
            ret = [
                srcPath,
                '-o',
                getBinSaveLocation(srcPath),
                '-no-keep-hi-files',
                '-no-keep-o-files',
                ...args,
            ];
            break;
        }
        case 'csharp': {
            const projDir = getDotnetProjectLocation(language, srcPath);
            const binPath = getBinSaveLocation(srcPath);

            if (language.compiler.includes('dotnet')) {
                ret = [
                    'build',
                    projDir,
                    '-c',
                    'Release',
                    '-o',
                    binPath,
                    '--force',
                    ...args,
                ];
                if (onlineJudgeEnv) {
                    ret.push('/p:DefineConstants="TRACE;ONLINE_JUDGE"');
                }
            } else {
                // mcs will run on shell, need to wrap paths with quotes.
                // otherwise it will raise error when the paths contain whitespace.
                let wrpSrcPath = srcPath;
                let wrpBinPath = binPath;
                if (platform() === 'win32') {
                    wrpSrcPath = '"' + srcPath + '"';
                    wrpBinPath = '"' + binPath + '"';
                }

                ret = [wrpSrcPath, '-out:' + wrpBinPath, ...args];
                if (onlineJudgeEnv) {
                    ret.push('-define:ONLINE_JUDGE');
                }
            }
            break;
        }
        default: {
            ret = [];
            break;
        }
    }
    return ret;
};

/**
 * Get the path of the .NET project file (*.csproj) from the location of the source code.
 * If the compiler is not dotnet, simply returns the path to the source code.
 *
 * @param language The Language object for the source code
 * @returns location of the .NET project file (*.csproj)
 */
const getDotnetProjectLocation = (
    language: Language,
    srcPath: string,
): string => {
    if (!language.compiler.includes('dotnet')) {
        return srcPath;
    }

    const projName = '.cphcsrun';
    const srcDir = path.dirname(srcPath);
    const projDir = path.join(srcDir, projName);
    return path.join(projDir, projName + '.csproj');
};

/**
 * Create a new .NET project to compile the source code.
 * It would be created under the same directory as the code.
 *
 * @param language The Language object for the source code
 * @param srcPath location of the source code
 */
const createDotnetProject = async (
    language: Language,
    srcPath: string,
): Promise<boolean> => {
    const result = new Promise<boolean>((resolve) => {
        const projDir = path.dirname(
            getDotnetProjectLocation(language, srcPath),
        );

        globalThis.logger.log('Creating new .NET project');
        const args = ['new', 'console', '--force', '-o', projDir];
        const newProj = spawn(language.compiler, args);

        let error = '';

        newProj.stderr.on('data', (data) => {
            error += data;
        });

        newProj.on('exit', (exitcode) => {
            const exitCode = exitcode || 0;
            const hideWarningsWhenCompiledOK = getHideStderrorWhenCompiledOK();

            if (exitCode !== 0) {
                ocWrite(
                    `Exit code: ${exitCode} Errors while creating new .NET project:\n` +
                        error,
                );
                ocShow();
                resolve(false);
                return;
            }

            if (!hideWarningsWhenCompiledOK && error.trim() !== '') {
                ocWrite(
                    `Exit code: ${exitCode} Warnings while creating new .NET project:\n ` +
                        error,
                );
                ocShow();
            }

            const destPath = path.join(projDir, 'Program.cs');
            globalThis.logger.log(
                'Copying source code to the project',
                srcPath,
                destPath,
            );
            try {
                const isLinux = platform() == 'linux';

                if (isLinux) {
                    spawn('cp', ['-f', srcPath, destPath]);
                } else {
                    const wrpSrcPath = '"' + srcPath + '"';
                    const wrpDestPath = '"' + destPath + '"';
                    spawn(
                        'cmd.exe',
                        ['/c', 'copy', '/y', wrpSrcPath, wrpDestPath],
                        { windowsVerbatimArguments: true },
                    );
                }
                resolve(true);
            } catch (err) {
                globalThis.logger.error('Error while copying source code', err);
                ocWrite('Errors while creating new .NET project:\n' + err);
                ocShow();
                resolve(false);
            }
        });

        newProj.on('error', (err) => {
            globalThis.logger.log(err);
            ocWrite('Errors while creating new .NET project:\n' + err);
            ocShow();
            resolve(false);
        });
    });

    return result;
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
    globalThis.logger.log('Compilation Started');
    await vscode.workspace.openTextDocument(srcPath).then((doc) => doc.save());
    ocHide();
    const language: Language = getLanguage(srcPath);
    if (language.skipCompile) {
        return Promise.resolve(true);
    }

    const spawnOpts: SpawnOptionsWithoutStdio = {
        cwd: undefined,
        env: process.env,
    };

    if (language.name === 'csharp') {
        if (language.compiler.includes('dotnet')) {
            const projResult = await createDotnetProject(language, srcPath);
            if (!projResult) {
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'compiling-stop',
                });
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'not-running',
                });
                return Promise.resolve(false);
            }
        } else {
            // HACK: Mono only provides mcs.bat for Windows?
            // spawn cannot run mcs.bat :(
            if (platform() === 'win32') {
                spawnOpts.shell = true;
            }
        }
    }

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'compiling-start',
    });
    const flags: string[] = getFlags(language, srcPath);
    globalThis.logger.log('Compiling with flags', flags);
    const result = new Promise<boolean>((resolve) => {
        let compiler;
        try {
            compiler = spawn(language.compiler, flags, spawnOpts);
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

        compiler.on('error', (err) => {
            globalThis.logger.error(err);
            ocWrite(
                'Errors while compiling:\n' +
                    err.message +
                    `\n\nHint: Is the compiler ${language.compiler} installed? Check the compiler command in cph settings for the current language.`,
            );
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'not-running',
            });
            ocShow();
            resolve(false);
        });

        compiler.on('exit', (exitcode) => {
            const exitCode = exitcode || 0;
            const hideWarningsWhenCompiledOK = getHideStderrorWhenCompiledOK();

            if (exitCode !== 0) {
                ocWrite(
                    `Exit code: ${exitCode} Errors while compiling:\n` + error,
                );
                ocShow();
                globalThis.logger.error('Compilation failed');
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'compiling-stop',
                });
                getJudgeViewProvider().extensionToJudgeViewMessage({
                    command: 'not-running',
                });
                resolve(false);
                return;
            }

            if (!hideWarningsWhenCompiledOK && error.trim() !== '') {
                ocWrite(
                    `Exit code: ${exitCode} Warnings while compiling:\n ` +
                        error,
                );
                ocShow();
            }

            globalThis.logger.log('Compilation passed');
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
            resolve(true);
            return;
        });
    });
    return result;
};
