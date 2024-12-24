import { Language, Run } from './types';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';
import config from './config';
import { getTimeOutPref } from './preferences';
import * as vscode from 'vscode';
import path from 'path';
import { onlineJudgeEnv } from './compiler';
import telmetry from './telmetry';

const runningBinaries: ChildProcessWithoutNullStreams[] = [];

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

    let process: ChildProcessWithoutNullStreams;

    const killer = setTimeout(() => {
        result.timeOut = true;
        process.kill();
    }, getTimeOutPref());

    // HACK - On Windows, `python3` will be changed to `python`!
    if (platform() === 'win32' && language.compiler === 'python3') {
        language.compiler = 'python';
    }

    // Start the binary or the interpreter.
    switch (language.name) {
        case 'python': {
            process = spawn(
                language.compiler, // 'python3' or 'python' TBD
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'ruby': {
            process = spawn(
                language.compiler,
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'js': {
            process = spawn(
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

            process = spawn('java', args);
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
                process = spawn(binFilePath, ['/stack:67108864'], spawnOpts);
            } else {
                // Run with mono
                process = spawn('mono', [binPath], spawnOpts);
            }

            break;
        }
        default: {
            process = spawn(binPath, spawnOpts);
        }
    }

    process.on('error', (err) => {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            `Could not launch testcase process. Is '${language.compiler}' in your PATH?`,
        );
    });

    const begin = Date.now();
    const ret: Promise<Run> = new Promise((resolve) => {
        runningBinaries.push(process);
        process.on('exit', (code, signal) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = code;
            result.signal = signal;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Result:', result);
            resolve(result);
        });

        process.stdout.on('data', (data) => {
            result.stdout += data;
        });
        process.stderr.on('data', (data) => (result.stderr += data));

        globalThis.logger.log('Wrote to STDIN');
        try {
            process.stdin.write(input);
        } catch (err) {
            globalThis.logger.error('WRITEERROR', err);
        }

        process.stdin.end();
        process.on('error', (err) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Error Result:', result);
            resolve(result);
        });
    });

    return ret;
};

/** Remove the generated binary from the file system, if present */
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

/** Kill all running binaries. Usually, only one should be running at a time. */
export const killRunning = () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.KILL_RUNNING);
    globalThis.logger.log('Killling binaries');
    runningBinaries.forEach((process) => process.kill());
};
