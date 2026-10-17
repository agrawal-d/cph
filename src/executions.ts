import { Language, Run, CustomCheckerRun } from './types';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';
import config from './config';
import { getTimeOutPref } from './preferences';
import * as vscode from 'vscode';
import path from 'path';
import { onlineJudgeEnv } from './compiler';
import telmetry from './telmetry';
import localize from './i18n';
import { executeCustomChecker } from './utils/customChecker';
import * as fs from 'fs';

export const runningBinaries: ChildProcessWithoutNullStreams[] = [];

/**
 * Run a custom checker script for a testcase.
 */
export const runCustomChecker = async (
    checkerPath: string,
    input: string,
    output: string,
): Promise<CustomCheckerRun> => {
    return executeCustomChecker(checkerPath, input, output, runningBinaries);
};

/**
 * Run a single testcase, and return the raw results, without judging.
 *
 * @param binPath path to the executable binary
 * @param input string to be piped into the stdin of the spawned process
 */
export const runTestCase = (
    language: Language,
    binPath: string,
    input: string,
    outputFileName?: string,
): Promise<Run> => {
    globalThis.logger.log('Running testcase', language, binPath, input);
    const result: Run = {
        stdout: '',
        stderr: '',
        code: null,
        signal: null,
        time: 0,
        timeOut: false,
    };
    const spawnOpts = {
        timeout: config.timeout,
        env: {
            ...global.process.env,
            DEBUG: 'true',
            CPH: 'true',
        },
    };

    let childProc: ChildProcessWithoutNullStreams;

    const killer = setTimeout(() => {
        result.timeOut = true;
        childProc.kill();
    }, getTimeOutPref());

    // HACK - On Windows, `python3` will be changed to `python`!
    if (platform() === 'win32' && language.compiler === 'python3') {
        language.compiler = 'python';
    }

    // Start the binary or the interpreter.
    switch (language.name) {
        case 'python': {
            childProc = spawn(
                language.compiler, // 'python3' or 'python' TBD
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'ruby': {
            childProc = spawn(
                language.compiler,
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'js': {
            childProc = spawn(
                language.compiler,
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'java': {
            const args: string[] = [];
            if (onlineJudgeEnv) {
                args.push('-DONLINE_JUDGE');
            }

            const binDir = path.dirname(binPath);
            args.push('-cp');
            args.push(binDir);

            const binFileName = path.parse(binPath).name.slice(0, -1);
            args.push(binFileName);

            childProc = spawn('java', args);
            break;
        }
        case 'kotlin': {
            const args: string[] = [];
            if (onlineJudgeEnv) {
                args.push('-DONLINE_JUDGE');
            }
            args.push('-jar', binPath);
            process = spawn('java', args, spawnOpts);
            break;
        }
        case 'csharp': {
            let binFileName: string;

            if (language.compiler.includes('dotnet')) {
                const projName = '.cphcsrun';
                const isLinux = platform() == 'linux';
                if (isLinux) {
                    binFileName = projName;
                } else {
                    binFileName = projName + '.exe';
                }

                const binFilePath = path.join(binPath, binFileName);
                childProc = spawn(binFilePath, ['/stack:67108864'], spawnOpts);
            } else {
                // Run with mono
                childProc = spawn('mono', [binPath], spawnOpts);
            }

            break;
        }
        default: {
            childProc = spawn(binPath, spawnOpts);
        }
    }

    childProc.on('error', (err) => {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            localize(
                'cph.executor.launchError',
                "Could not launch testcase process. Is '{0}' in your PATH?",
                language.compiler,
            ),
        );
    });

    const begin = Date.now();
    const ret: Promise<Run> = new Promise((resolve) => {
        runningBinaries.push(childProc);
        childProc.on('exit', (code, signal) => {
            clearTimeout(killer);
            const end = Date.now();
            result.code = code;
            result.signal = signal;
            result.time = end - begin;
            const idx = runningBinaries.indexOf(childProc);
            if (idx > -1) {
                runningBinaries.splice(idx, 1);
            }
            console.debug(`outputFileName:${outputFileName}`);
            if (outputFileName && outputFileName.trim() !== '') {
                const outputFileDir = path.join(process.cwd(), outputFileName);
                if (fs.existsSync(outputFileDir)) {
                    try {
                        const fileOutput = fs.readFileSync(
                            outputFileDir,
                            'utf8',
                        );
                        result.stdout = fileOutput;
                    } catch {
                        vscode.window.showErrorMessage(
                            localize(
                                'cph.processRunSingle.readOutputFileError',
                                'Read output file error.',
                            ),
                        );
                    }
                    try {
                        console.log(`delete ${outputFileDir}`);
                        if (fs.existsSync(outputFileDir)) {
                            fs.unlinkSync(outputFileDir);
                        }
                    } catch (err) {
                        globalThis.logger.error(
                            'Error while deleting data files',
                            err,
                        );
                    }
                } else {
                    vscode.window.showWarningMessage(
                        localize(
                            'cph.processRunSingle.outputFileDoesNotExist',
                            'The output file does not exist. Please make sure your program created {0}',
                            outputFileName,
                        ),
                    );
                }
            }
            resolve(result);
        });

        childProc.stdout.on('data', (data) => {
            result.stdout += data;
        });
        childProc.stderr.on('data', (data) => (result.stderr += data));

        childProc.on('error', (err) => {
            clearTimeout(killer);
            const end = Date.now();
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;
            const idx = runningBinaries.indexOf(childProc);
            if (idx > -1) {
                runningBinaries.splice(idx, 1);
            }
            resolve(result);
        });

        globalThis.logger.log('Wrote to STDIN');
        try {
            childProc.stdin.write(input);
        } catch (err) {
            globalThis.logger.error('WRITEERROR', err);
        }

        childProc.stdin.end();
    });

    return ret;
};

export const deleteBinary = (language: Language, binPath: string) => {
    if (language.skipCompile) {
        globalThis.logger.log(
            "Skipping deletion of binary as it's not a compiled language.",
        );
        return;
    }
    globalThis.logger.log('Deleting binary', binPath);
    try {
        const isLinux = platform() == 'linux';
        const isFile = path.extname(binPath);

        if (isLinux) {
            if (isFile) {
                spawn('rm', [binPath]);
            } else {
                spawn('rm', ['-r', binPath]);
            }
        } else {
            const nrmBinPath = '"' + binPath + '"';
            if (isFile) {
                spawn('cmd.exe', ['/c', 'del', nrmBinPath], {
                    windowsVerbatimArguments: true,
                });
            } else {
                spawn('cmd.exe', ['/c', 'rd', '/s', '/q', nrmBinPath], {
                    windowsVerbatimArguments: true,
                });
            }
        }
    } catch (err) {
        globalThis.logger.error('Error while deleting binary', err);
    }
};

/** Kill all currently running processes. Only one problem's testcases
 * should be running at a time. */
export const killRunning = () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.KILL_RUNNING);
    globalThis.logger.log('Killling binaries');
    runningBinaries.forEach((process) => process.kill());
};
