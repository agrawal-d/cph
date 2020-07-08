/** Valid name for a VS Code preference section for the extension */
export type prefSection =
    | 'saveLocation'
    | 'defaultLanguage'
    | 'timeOut'
    | 'argsC'
    | 'argsCpp'
    | 'argsRust'
    | 'argsPython'
    | 'defaultLanguage'
    | 'firstTime';

export type Language = {
    name: LangNames;
    compiler: string;
    args: string[];
    skipCompile: boolean;
};

export type LangNames = 'python' | 'c' | 'cpp' | 'rust';

export type TestCase = {
    input: string;
    output: string;
    id: number;
};

export type Problem = {
    name: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    group: string;
    tests: TestCase[];
    srcPath: string;
    local?: boolean;
};

export type Case = {
    id: number;
    result: RunResult | null;
    testcase: TestCase;
};

export type Run = {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    time: number;
    timeOut: boolean;
};

export type RunResult = {
    pass: boolean | null;
    id: number;
} & Run;

export type WebviewMessageCommon = {
    problem: Problem;
};

export type RunSingleCommand = {
    command: 'run-single-and-save';
    id: number;
} & WebviewMessageCommon;

export type RunAllCommand = {
    command: 'run-all-and-save';
} & WebviewMessageCommon;

export type KillRunningCommand = {
    command: 'kill-running';
} & WebviewMessageCommon;

export type SaveCommand = {
    command: 'save';
} & WebviewMessageCommon;

export type WebviewToVSEvent =
    | RunAllCommand
    | RunSingleCommand
    | KillRunningCommand
    | SaveCommand;

export type RunningCommand = {
    command: 'running';
    id: number;
} & WebviewMessageCommon;

export type ResultCommand = {
    command: 'run-single-result';
    result: RunResult;
} & WebviewMessageCommon;

export type CompilingStartCommand = {
    command: 'compiling-start';
};

export type CompilingStopCommand = {
    command: 'compiling-stop';
};

export type RunAllInWebViewCommand = {
    command: 'run-all';
};

export type VSToWebViewMessage =
    | ResultCommand
    | RunningCommand
    | RunAllInWebViewCommand
    | CompilingStartCommand
    | CompilingStopCommand;
