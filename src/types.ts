/** Valid name for a VS Code preference section for the extension */
export type prefSection =
    | 'general.saveLocation'
    | 'general.defaultLanguage'
    | 'general.timeOut'
    | 'general.firstTime'
    | 'general.useShortCodeforcesName'
    | 'general.menuChoices'
    | 'language.c.Args'
    | 'language.c.SubmissionCompiler'
    | 'language.cpp.Args'
    | 'language.cpp.SubmissionCompiler'
    | 'language.rust.Args'
    | 'language.rust.SubmissionCompiler'
    | 'language.java.Args'
    | 'language.java.SubmissionCompiler'
    | 'language.python.Args'
    | 'language.python.SubmissionCompiler'
    | 'language.python.Command';

export type Language = {
    name: LangNames;
    compiler: string;
    args: string[];
    skipCompile: boolean;
};

export type LangNames = 'python' | 'c' | 'cpp' | 'rust' | 'java';

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

export type DeleteTcsCommand = {
    command: 'delete-tcs';
} & WebviewMessageCommon;

export type SubmitCf = {
    command: 'submitCf';
} & WebviewMessageCommon;

export type SubmitKattis = {
    command: 'submitKattis';
} & WebviewMessageCommon;

export type WebviewToVSEvent =
    | RunAllCommand
    | RunSingleCommand
    | KillRunningCommand
    | SaveCommand
    | DeleteTcsCommand
    | SubmitCf
    | SubmitKattis;

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

export type WaitingForSubmitCommand = {
    command: 'waiting-for-submit';
};

export type SubmitFinishedCommand = {
    command: 'submit-finished';
};

export type VSToWebViewMessage =
    | ResultCommand
    | RunningCommand
    | RunAllInWebViewCommand
    | CompilingStartCommand
    | CompilingStopCommand
    | WaitingForSubmitCommand
    | SubmitFinishedCommand;

export type CphEmptyResponse = {
    empty: true;
};

export type CphSubmitResponse = {
    empty: false;
    problemName: string;
    sourceCode: string;
    languageId: number;
};
