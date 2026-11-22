import type { Run, RunFailure } from '../types';

// https://learn.microsoft.com/openspecs/windows_protocols/ms-erref/596a1078-e883-4972-9bbc-49e60bebca55
const windowsReasons: Readonly<Partial<Record<number, RunFailure['reason']>>> =
    {
        0xc0000005: 'runAccessViolation',
        0xc000001d: 'runIllegalInstruction',
        0xc000008e: 'runDivideByZero',
        0xc0000094: 'runDivideByZero',
        0xc00000fd: 'runStackOverflow',
    };

const signalReasons = new Map<string, RunFailure['reason']>([
    ['SIGSEGV', 'runAccessViolation'],
    ['SIGILL', 'runIllegalInstruction'],
    ['SIGFPE', 'runArithmeticError'],
    ['SIGABRT', 'runAborted'],
]);

export function getRunFailure(
    run: Run,
    platform: NodeJS.Platform,
    stderrIsFailure: boolean,
): RunFailure | undefined {
    if (run.timeOut) {
        return { reason: 'timedOut' };
    }
    if (run.launchError) {
        return { reason: 'runLaunchError', detail: run.launchError };
    }
    if (run.signal) {
        return {
            reason: signalReasons.get(run.signal) ?? 'runTerminated',
            detail: run.signal,
        };
    }
    if (run.code !== null && run.code !== 0) {
        // Windows exit statuses can be reported as signed or unsigned DWORDs.
        const code = run.code >>> 0;
        if (platform === 'win32' && code >= 0x80000000) {
            return {
                reason: windowsReasons[code] ?? 'runExitCode',
                detail: '0x' + code.toString(16).toUpperCase(),
            };
        }
        return { reason: 'runExitCode', detail: String(run.code) };
    }
    if (stderrIsFailure && run.stderr !== '') {
        return { reason: 'runStandardError' };
    }
    return undefined;
}
