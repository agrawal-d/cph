import {
    createTempFiles,
    deleteTempFiles,
    executeCustomChecker,
    getEffectivePythonCommand,
} from '../utils/customChecker';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('fs');
jest.mock('os');
jest.mock('child_process');
jest.mock('../preferences', () => ({
    getPythonCommand: jest.fn(() => 'python3'),
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedSpawn = spawn as jest.Mock;

describe('Custom Checker Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        globalThis.logger = {
            log: jest.fn(),
            error: jest.fn(),
        };
    });

    describe('createTempFiles', () => {
        it('should create two files with correct prefix', () => {
            mockedOs.tmpdir.mockReturnValue('/tmp');
            mockedFs.writeFileSync.mockImplementation(() => {});

            const { inputPath, outputPath } = createTempFiles(
                'input',
                'output',
            );

            expect(inputPath).toContain('cph-input-');
            expect(outputPath).toContain('cph-output-');
            expect(path.normalize(path.dirname(inputPath))).toBe(
                path.normalize('/tmp'),
            );
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                inputPath,
                'input',
            );
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                outputPath,
                'output',
            );
        });
    });

    describe('deleteTempFiles', () => {
        it('should delete files if they exist', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.unlinkSync.mockImplementation(() => {});

            deleteTempFiles('in.txt', 'out.txt');

            expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(2);
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith('in.txt');
            expect(mockedFs.unlinkSync).toHaveBeenCalledWith('out.txt');
        });

        it('should not delete files if they do not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);

            deleteTempFiles('in.txt', 'out.txt');

            expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should log error if deletion fails', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.unlinkSync.mockImplementation(() => {
                throw new Error('fail');
            });

            deleteTempFiles('in.txt', 'out.txt');

            expect(globalThis.logger.error).toHaveBeenCalled();
        });
    });

    describe('getEffectivePythonCommand', () => {
        it('should return python on win32 if preference is python3', () => {
            mockedOs.platform.mockReturnValue('win32');
            const cmd = getEffectivePythonCommand();
            expect(cmd).toBe('python');
        });

        it('should return python3 on linux if preference is python3', () => {
            mockedOs.platform.mockReturnValue('linux');
            const cmd = getEffectivePythonCommand();
            expect(cmd).toBe('python3');
        });
    });

    describe('executeCustomChecker', () => {
        let mockProcess: any;

        beforeEach(() => {
            mockProcess = new EventEmitter();
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockedSpawn.mockReturnValue(mockProcess);
            mockedOs.tmpdir.mockReturnValue('/tmp');
            mockedFs.writeFileSync.mockImplementation(() => {});
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.unlinkSync.mockImplementation(() => {});
        });

        it('should execute successfully and cleanup', async () => {
            const runningBinaries: any[] = [];
            const resultPromise = executeCustomChecker(
                'checker.py',
                'in',
                'out',
                runningBinaries,
            );

            expect(runningBinaries.length).toBe(1);
            expect(mockedSpawn).toHaveBeenCalled();

            mockProcess.stdout.emit('data', Buffer.from('passed'));
            mockProcess.emit('exit', 0, null);

            const result = await resultPromise;

            expect(result.code).toBe(0);
            expect(result.stdout).toBe('passed');
            expect(runningBinaries.length).toBe(0);
            expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(2);
        });

        it('should handle errors and cleanup', async () => {
            const runningBinaries: any[] = [];
            const resultPromise = executeCustomChecker(
                'checker.py',
                'in',
                'out',
                runningBinaries,
            );

            mockProcess.emit('error', new Error('spawn failed'));

            const result = await resultPromise;

            expect(result.code).toBe(1);
            expect(runningBinaries.length).toBe(0);
            expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(2);
        });
    });
});
