import { runTestCase } from '../executions';
import config from '../config';

jest.mock('vscode', () => ({ window: { showErrorMessage: jest.fn() } }), {
    virtual: true,
});
jest.mock('../compiler', () => ({ onlineJudgeEnv: false }));
jest.mock('../config', () => ({ timeout: 100 }));
jest.mock('../preferences', () => ({ getTimeOutPref: () => 3000 }));
jest.mock('../utils/customChecker', () => ({}));

globalThis.logger = { ...console, log: jest.fn(), error: jest.fn() };

test('captures a failed spawn as a launch error, not an exit status', async () => {
    const result = await runTestCase(
        {
            name: 'js',
            compiler: process.execPath + '.cph-missing',
            args: [],
            skipCompile: true,
        },
        '-e',
        '',
    );
    expect(result.launchError).toBe('ENOENT');
    expect(result.code).toBeNull();
    expect(result.signal).toBeNull();
});

test('keeps the exit code when the process closes stdin before consuming the input', async () => {
    const timeout = jest.replaceProperty(config, 'timeout', 3000);
    try {
        const result = await runTestCase(
            {
                name: 'js',
                compiler: process.execPath,
                args: ['process.exit(42)'],
                skipCompile: true,
            },
            '-e',
            '1'.repeat(2 ** 21),
        );
        expect(result.code).toBe(42);
        expect(result.launchError).toBeUndefined();
    } finally {
        timeout.restore();
    }
});
