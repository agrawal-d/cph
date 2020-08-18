import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    Problem,
    WebviewToVSEvent,
    TestCase,
    Case,
    VSToWebViewMessage,
    ResultCommand,
    RunningCommand,
} from '../../types';
import CaseView from './CaseView';
declare const acquireVsCodeApi: () => {
    postMessage: (message: WebviewToVSEvent) => void;
};
const vscodeApi = acquireVsCodeApi();

const getProblemFromDOM = (): Problem => {
    console.log('Got problem from dom!');
    const element = document.getElementById('problem') as HTMLElement;
    return JSON.parse(element.innerText);
};

const getCasesFromProblem = (problem: Problem): Case[] => {
    console.log('Get cases from problem!');
    return problem.tests.map((testCase) => ({
        id: testCase.id,
        result: null,
        testcase: testCase,
    }));
};

function App() {
    const [problem, useProblem] = useState<Problem>(() => getProblemFromDOM());
    const [cases, useCases] = useState<Case[]>(() =>
        getCasesFromProblem(getProblemFromDOM()),
    );
    const [focusLast, useFocusLast] = useState<boolean>(false);
    const [forceRunning, useForceRunning] = useState<number | false>(false);
    const [compiling, setCompiling] = useState<boolean>(false);
    const [deferSaveTimer, setDeferSaveTimer] = useState<number | null>(null);
    const [waitingForSubmit, setWaitingForSubmit] = useState<boolean>(false);

    // Update problem if cases change. The only place where `useProblem` is
    // allowed to ensure sync.
    useEffect(() => {
        const testCases: TestCase[] = cases.map((c) => c.testcase);
        console.log(cases);
        useProblem({
            ...problem,
            tests: testCases,
        });
    }, [cases]);

    useEffect(() => {
        console.log('Adding event listeners');
        const fn = (event: any) => {
            const data: VSToWebViewMessage = event.data;
            console.log('Got event in web view', event.data);
            switch (data.command) {
                case 'run-single-result': {
                    handleRunSingleResult(data);
                    break;
                }
                case 'running': {
                    handleRunning(data);
                    break;
                }
                case 'run-all': {
                    runAll();
                    break;
                }
                case 'compiling-start': {
                    setCompiling(true);
                    break;
                }
                case 'compiling-stop': {
                    setCompiling(false);
                    break;
                }
                case 'submit-finished': {
                    setWaitingForSubmit(false);
                    break;
                }
                case 'waiting-for-submit': {
                    setWaitingForSubmit(true);
                    break;
                }
                default: {
                    console.log('Invalid event', event.data);
                }
            }
        };
        window.addEventListener('message', fn);
        return () => {
            console.log('Cleaned up event listeners');
            window.removeEventListener('message', fn);
        };
    }, [problem, cases]);

    const handleRunSingleResult = (data: ResultCommand) => {
        const idx = cases.findIndex(
            (testCase) => testCase.id === data.result.id,
        );
        if (idx === -1) {
            console.error('Invalid single result', problem, data);
            return;
        }
        const newCases = cases.slice();
        newCases[idx].result = data.result;
        useCases(newCases);
    };

    const handleRunning = (data: RunningCommand) => {
        useForceRunning(data.id);
    };

    const rerun = (id: number, input: string, output: string) => {
        const idx = problem.tests.findIndex((testCase) => testCase.id === id);

        if (idx === -1) {
            console.log('No id in problem tests', problem, id);
            return;
        }

        problem.tests[idx].input = input;
        problem.tests[idx].output = output;

        vscodeApi.postMessage({
            command: 'run-single-and-save',
            problem,
            id,
        });
    };

    // Remove a case.
    const remove = (id: number) => {
        const newCases = cases.filter((value) => value.id !== id);
        useCases(newCases);
    };

    // Save problem if it changes.
    useEffect(() => {
        if (deferSaveTimer === null) {
            console.log('Setting timer');
            setDeferSaveTimer(
                window.setTimeout(() => {
                    save();
                    setDeferSaveTimer(null);
                }, 400),
            );
        }
    }, [problem]);

    // Create a new Case
    const newCase = () => {
        console.log(cases);
        const id = Date.now();
        const testCase: TestCase = {
            id,
            input: '',
            output: '',
        };
        useCases([
            ...cases,
            {
                id,
                result: null,
                testcase: testCase,
            },
        ]);
        useFocusLast(true);
    };

    // Save the problem
    const save = () => {
        console.log('Saved problem');
        vscodeApi.postMessage({
            command: 'save',
            problem,
        });
    };

    // Stop running executions.
    const stop = () => {
        vscodeApi.postMessage({
            command: 'kill-running',
            problem,
        });
    };

    // Deletes the .prob file and closes webview
    const deleteTcs = () => {
        vscodeApi.postMessage({
            command: 'delete-tcs',
            problem,
        });
    };

    const runAll = () => {
        console.log(problem);
        vscodeApi.postMessage({
            command: 'run-all-and-save',
            problem,
        });
    };

    const submitKattis = () => {
        vscodeApi.postMessage({
            command: 'submitKattis',
            problem,
        });

        setWaitingForSubmit(true);
    };

    const submitCf = () => {
        vscodeApi.postMessage({
            command: 'submitCf',
            problem,
        });

        setWaitingForSubmit(true);
    };

    const debounceFocusLast = () => {
        setTimeout(() => {
            useFocusLast(false);
        }, 100);
    };

    const debounceForceRunning = () => {
        setTimeout(() => {
            useForceRunning(false);
        }, 100);
    };

    const getRunningProp = (value: Case) => {
        if (forceRunning === value.id) {
            console.log('Forcing Running');
            debounceForceRunning();
            return forceRunning === value.id;
        }
        return false;
    };

    const updateCase = (id: number, input: string, output: string) => {
        const newCases: Case[] = cases.map((testCase) => {
            if (testCase.id === id) {
                return {
                    id,
                    result: testCase.result,
                    testcase: {
                        id,
                        input,
                        output,
                    },
                };
            } else {
                return testCase;
            }
        });
        useCases(newCases);
    };

    const views: JSX.Element[] = [];
    cases.forEach((value, index) => {
        if (focusLast && index === cases.length - 1) {
            views.push(
                <CaseView
                    num={index + 1}
                    case={value}
                    rerun={rerun}
                    key={value.id.toString()}
                    remove={remove}
                    doFocus={true}
                    forceRunning={getRunningProp(value)}
                    updateCase={updateCase}
                ></CaseView>,
            );
            debounceFocusLast();
        } else {
            views.push(
                <CaseView
                    num={index + 1}
                    case={value}
                    rerun={rerun}
                    key={value.id.toString()}
                    remove={remove}
                    forceRunning={getRunningProp(value)}
                    updateCase={updateCase}
                ></CaseView>,
            );
        }
    });

    const renderSubmitButton = () => {
        let url: URL;
        try {
            url = new URL(problem.url);
        } catch (err) {
            console.error(err);
            return null;
        }
        if (
            url.hostname !== 'codeforces.com' &&
            url.hostname !== 'open.kattis.com'
        ) {
            return null;
        }

        if (url.hostname == 'codeforces.com') {
            return (
                <div className="pad-10 submit-area">
                    <button className="btn" onClick={submitCf}>
                        Submit on CF <small>(beta)</small>
                    </button>
                    {waitingForSubmit && (
                        <>
                            <span className="loader"></span> Waiting for
                            extension ...
                            <br />
                            <small>
                                To submit to codeforces, you need to have the{' '}
                                <a href="https://github.com/agrawal-d/cph-submit">
                                    cph-submit browser extension{' '}
                                </a>
                                installed, and a browser window open. You can
                                change change language ID from VS Code settings.
                                <br />
                                <br />
                                Hint: You can also press <kbd>
                                    Ctrl+Alt+S
                                </kbd>{' '}
                                to submit.
                            </small>
                        </>
                    )}
                </div>
            );
        } else if (url.hostname == 'open.kattis.com') {
            return (
                <div className="pad-10 submit-area">
                    <button className="btn" onClick={submitKattis}>
                        Submit on Kattis
                    </button>
                    {waitingForSubmit && (
                        <>
                            <br />
                            <small>
                                To submit to Kattis, you need to have the{' '}
                                <a href="https://open.kattis.com/download/submit.py?410d6d=">
                                    submission client{' '}
                                </a>
                                and the{' '}
                                <a href="https://open.kattis.com/download/kattisrc">
                                    configuration file{' '}
                                </a>
                                downloaded in ~/.kattis.
                                <br />
                                <br />
                                Click &apos;Open&apos; to open up the
                                submission result.
                            </small>
                        </>
                    )}
                </div>
            );
        }
    };

    return (
        <div className="ui">
            <div className="meta">
                <h1 className="problem-name">
                    {problem.name}{' '}
                    {compiling && <b className="compiling">Compiling</b>}
                </h1>
            </div>
            <div className="results">{views}</div>
            <button className="btn margin-10" onClick={newCase}>
                + New Testcase
            </button>
            <div className="actions">
                <button className="btn" onClick={runAll}>
                    ↺ Run All
                </button>
                <button className="btn btn-green" onClick={newCase}>
                    + New
                </button>
                <button className="btn btn-orange" onClick={stop}>
                    ⊗ Stop
                </button>
                <button className="btn btn-red right" onClick={deleteTcs}>
                    ☠ Delete
                </button>
            </div>
            {renderSubmitButton()}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
