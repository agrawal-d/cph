import { runTestCase } from '../executions';

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
