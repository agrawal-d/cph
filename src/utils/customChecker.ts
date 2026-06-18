import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { platform, tmpdir } from 'os';
import * as fs from 'fs';
import path from 'path';
import * as crypto from 'crypto';
import { CustomCheckerRun } from '../types';
import { getPythonCommand } from '../preferences';
import config from '../config';

/**
 * Creates temporary files for custom checker.
 */
export const createTempFiles = (input: string, output: string) => {
    const tmpDir = tmpdir();
    const inputPath = path.join(
        tmpDir,
        `cph-input-${crypto.randomBytes(4).toString('hex')}.txt`,
    );
    const outputPath = path.join(
        tmpDir,
        `cph-output-${crypto.randomBytes(4).toString('hex')}.txt`,
    );

    fs.writeFileSync(inputPath, input);
    fs.writeFileSync(outputPath, output);

    return { inputPath, outputPath };
};

/**
 * Deletes temporary files.
 */
export const deleteTempFiles = (inputPath: string, outputPath: string) => {
    try {
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    } catch (err) {
        globalThis.logger.error('Error cleaning up checker temp files:', err);
    }
};

/**
 * Gets the computed python command for the current platform.
 */
export const getEffectivePythonCommand = () => {
    let pythonCommand = getPythonCommand();
    if (platform() === 'win32' && pythonCommand === 'python3') {
        pythonCommand = 'python';
    }
    return pythonCommand;
};

/**
 * Orchestrates the custom checker execution.
 */
export const executeCustomChecker = async (
    checkerPath: string,
    input: string,
    output: string,
    runningBinaries: ChildProcessWithoutNullStreams[],
): Promise<CustomCheckerRun> => {
    const { inputPath, outputPath } = createTempFiles(input, output);
    const pythonCommand = getEffectivePythonCommand();
    const args = [checkerPath, inputPath, outputPath];
    const fullCommand = `${pythonCommand} ${args.join(' ')}`;

    globalThis.logger.log('Running custom checker:', fullCommand);

    const result: CustomCheckerRun = {
        command: fullCommand,
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

    const process = spawn(pythonCommand, args, spawnOpts);
    const begin = Date.now();

    return new Promise((resolve) => {
        runningBinaries.push(process);

        process.on('exit', (code, signal) => {
            const end = Date.now();
            result.code = code;
            result.signal = signal;
            result.time = end - begin;

            const procIndex = runningBinaries.indexOf(process);
            if (procIndex > -1) {
                runningBinaries.splice(procIndex, 1);
            }

            deleteTempFiles(inputPath, outputPath);

            globalThis.logger.log('Custom Checker Finished:', {
                command: result.command,
                code: result.code,
                stdout: result.stdout,
                stderr: result.stderr,
                time: result.time,
            });
            resolve(result);
        });

        process.stdout.on('data', (data) => {
            result.stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            result.stderr += data.toString();
        });

        process.on('error', (err) => {
            const end = Date.now();
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;

            const procIndex = runningBinaries.indexOf(process);
            if (procIndex > -1) {
                runningBinaries.splice(procIndex, 1);
            }

            deleteTempFiles(inputPath, outputPath);

            globalThis.logger.error('Custom Checker Spawn Error:', {
                command: result.command,
                error: err,
            });
            resolve(result);
        });
    });
};
