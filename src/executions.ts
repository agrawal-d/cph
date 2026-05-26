import { Language, Run, CustomCheckerRun } from './types';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';
import config from './config';
import { getTimeOutPref } from './preferences';
import telmetry from './telmetry';
import * as fs from 'fs';
import { executeCustomChecker } from './utils/customChecker';

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
            process = spawn(
                language.compiler,
                ['cp', '.', ...language.args, binPath],
                spawnOpts,
            );
            break;
        }
        case 'c':
        case 'cpp':
        case 'rust':
        case 'go':
        case 'hs':
        case 'csharp':
        case 'cangjie': {
            process = spawn(binPath, language.args, spawnOpts);
            break;
        }
        default: {
            // Should never happen, since language name is an enum.
            throw new Error('Unsupported language: ' + language.name);
        }
    }

    const begin = Date.now();
    const ret: Promise<Run> = new Promise((resolve) => {
        runningBinaries.push(process);
        process.on('exit', (code, signal) => {
            clearTimeout(killer);
            const end = Date.now();
            result.code = code;
            result.signal = signal;
            result.time = end - begin;
            runningBinaries.pop();
            resolve(result);
        });

        process.stdout.on('data', (data) => {
            result.stdout += data;
        });
        process.stderr.on('data', (data) => (result.stderr += data));

        process.on('error', (err) => {
            clearTimeout(killer);
            const end = Date.now();
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;
            runningBinaries.pop();
            resolve(result);
        });

        process.stdin.write(input);
        process.stdin.end();
    });

    return ret;
};

export const deleteBinary = (language: Language, binPath: string) => {
    if (language.skipCompile) {
        return;
    }
    try {
        if (language.name === 'java') {
            fs.unlinkSync(binPath + '.class');
        } else if (platform() === 'win32' && language.name !== 'python') {
            fs.unlinkSync(binPath + '.exe');
        } else {
            fs.unlinkSync(binPath);
        }
    } catch (err) {
        // globalThis.logger.error("Error deleting binary: " + err);
    }
};

/** Kill all currently running processes. Only one problem's testcases
 * should be running at a time. */
export const killRunning = () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.KILL_RUNNING);
    globalThis.logger.log('Killling binaries');
    runningBinaries.forEach((process) => process.kill());
};
