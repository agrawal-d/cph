import type { Run } from '../types';
import { getRunFailure } from '../utils/runFailure';

const run: Run = {
    stdout: '',
    stderr: '',
    code: 0,
    signal: null,
    time: 12,
    timeOut: false,
};

test.each([0xc00000fd, -1073741571])(
    'recognizes a Windows stack overflow from exit status %i',
    (code) => {
        expect(getRunFailure({ ...run, code }, 'win32', true)).toEqual({
            reason: 'runStackOverflow',
            detail: '0xC00000FD',
        });
    },
);

test.each([
    { code: 0xc0000005, reason: 'runAccessViolation', detail: '0xC0000005' },
    { code: 0xc0000094, reason: 'runDivideByZero', detail: '0xC0000094' },
    { code: 0xc000001d, reason: 'runIllegalInstruction', detail: '0xC000001D' },
    { code: 0xc0000409, reason: 'runExitCode', detail: '0xC0000409' },
    { code: 42, reason: 'runExitCode', detail: '42' },
])('decodes Windows status $detail', ({ code, reason, detail }) => {
    expect(getRunFailure({ ...run, code }, 'win32', true)).toEqual({
        reason,
        detail,
    });
});

test('reports signals but does not infer stack overflow from SIGSEGV', () => {
    expect(
        getRunFailure({ ...run, code: null, signal: 'SIGSEGV' }, 'linux', true),
    ).toEqual({ reason: 'runAccessViolation', detail: 'SIGSEGV' });
    expect(
        getRunFailure({ ...run, code: null, signal: 'SIGTERM' }, 'linux', true),
    ).toEqual({ reason: 'runTerminated', detail: 'SIGTERM' });
});

test('reports a timeout rather than its kill signal', () => {
    expect(
        getRunFailure(
            { ...run, code: null, signal: 'SIGTERM', timeOut: true },
            'win32',
            true,
        ),
    ).toEqual({ reason: 'timedOut' });
});

test('reports launch errors without inventing a process exit code', () => {
    expect(
        getRunFailure(
            { ...run, code: null, launchError: 'ENOENT' },
            'win32',
            true,
        ),
    ).toEqual({ reason: 'runLaunchError', detail: 'ENOENT' });
});

test('reports stderr only when configured to consider it a failure', () => {
    const withStderr = { ...run, stderr: 'diagnostic' };
    expect(getRunFailure(withStderr, 'linux', true)).toEqual({
        reason: 'runStandardError',
    });
    expect(getRunFailure(withStderr, 'linux', false)).toBeUndefined();
    expect(getRunFailure(run, 'linux', true)).toBeUndefined();
});
