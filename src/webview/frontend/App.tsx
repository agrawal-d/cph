import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Problem,
    WebviewToVSEvent,
    TestCase,
    Case,
    VSToWebViewMessage,
    ResultCommand,
    RunningCommand,
    WebViewpersistenceState,
} from '../../types';
import CaseView from './CaseView';
declare const vscodeApi: {
    postMessage: (message: WebviewToVSEvent) => void;
    getState: () => WebViewpersistenceState | undefined;
    setState: (state: WebViewpersistenceState) => void;
};

// Original: www.paypal.com/ncp/payment/CMLKCFEJEMX5L
const payPalUrl = 'https://rb.gy/5iiorz';

function Judge(props: {
    problem: Problem;
    updateProblem: (problem: Problem) => void;
    cases: Case[];
    updateCases: (cases: Case[]) => void;
}) {
    const problem = props.problem;
    const cases = props.cases;
    const updateProblem = props.updateProblem;
    const updateCases = props.updateCases;

    const [focusLast, setFocusLast] = useState<boolean>(false);
    const [forceRunning, setForceRunning] = useState<number | false>(false);
    const [compiling, setCompiling] = useState<boolean>(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [waitingForSubmit, setWaitingForSubmit] = useState<boolean>(false);
    const [onlineJudgeEnv, setOnlineJudgeEnv] = useState<boolean>(false);
    const [webviewState, setWebviewState] = useState<WebViewpersistenceState>(
        () => {
            const vscodeState = vscodeApi.getState();
            const ret = {
                dialogCloseDate: vscodeState?.dialogCloseDate || Date.now(),
            };
            vscodeApi.setState(ret);
            console.log('Restored to state:', ret);
            return ret;
        },
    );

    console.log(webviewState);

    // Update problem if cases change. The only place where `updateProblem` is
    // allowed to ensure sync.
    useEffect(() => {
        const testCases: TestCase[] = cases.map((c) => c.testcase);
        updateProblem({
            ...problem,
            tests: testCases,
        });
    }, [cases]);

    const closeDonateBox = () => {
        const newState = {
            ...webviewState,
            dialogCloseDate: Date.now(),
        };
        setWebviewState(newState);
        vscodeApi.setState(newState);
    };

    const sendMessageToVSCode = (message: WebviewToVSEvent) => {
        vscodeApi.postMessage(message);
    };

    useEffect(() => {
        const fn = (event: any) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'new-problem': {
                    setOnlineJudgeEnv(false);
                    break;
                }

                case 'remote-message': {
                    window.remoteMessage = data.message;
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
            window.removeEventListener('message', fn);
        };
    }, []);

    const handleRunning = (data: RunningCommand) => {
        setForceRunning(data.id);
    };

    const refreshOnlineJudge = () => {
        sendMessageToVSCode({
            command: 'online-judge-env',
            value: onlineJudgeEnv,
        });
    };

    const rerun = (id: number, input: string, output: string) => {
        refreshOnlineJudge();
        const idx = problem.tests.findIndex((testCase) => testCase.id === id);

        if (idx === -1) {
            console.log('No id in problem tests', problem, id);
            return;
        }

        problem.tests[idx].input = input;
        problem.tests[idx].output = output;

        sendMessageToVSCode({
            command: 'run-single-and-save',
            problem,
            id,
        });
    };

    // Remove a case.
    const remove = (id: number) => {
        const newCases = cases.filter((value) => value.id !== id);
        updateCases(newCases);
    };

    // Create a new Case
    const newCase = () => {
        const id = Date.now();
        const testCase: TestCase = {
            id,
            input: '',
            output: '',
        };
        updateCases([
            ...cases,
            {
                id,
                result: null,
                testcase: testCase,
            },
        ]);
        setFocusLast(true);
    };

    // Stop running executions.
    const stop = () => {
        sendMessageToVSCode({
            command: 'kill-running',
            problem,
        });
    };

    // Deletes the .prob file and closes webview
    const deleteTcs = () => {
        sendMessageToVSCode({
            command: 'delete-tcs',
            problem,
        });
    };

    const runAll = () => {
        refreshOnlineJudge();
        sendMessageToVSCode({
            command: 'run-all-and-save',
            problem,
        });
    };

    const submitKattis = () => {
        sendMessageToVSCode({
            command: 'submitKattis',
            problem,
        });

        setWaitingForSubmit(true);
    };

    const submitCf = () => {
        sendMessageToVSCode({
            command: 'submitCf',
            problem,
        });

        setWaitingForSubmit(true);
    };

    const debounceFocusLast = () => {
        setTimeout(() => {
            setFocusLast(false);
        }, 100);
    };

    const debounceForceRunning = () => {
        setTimeout(() => {
            setForceRunning(false);
        }, 100);
    };

    const getRunningProp = (value: Case) => {
        if (forceRunning === value.id) {
            debounceForceRunning();
            return forceRunning === value.id;
        }
        return false;
    };

    const toggleOnlineJudgeEnv = () => {
        const newEnv = !onlineJudgeEnv;
        setOnlineJudgeEnv(newEnv);
        sendMessageToVSCode({
            command: 'online-judge-env',
            value: newEnv,
        });
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
        updateCases(newCases);
    };

    const notify = (text: string) => {
        setNotification(text);
        setTimeout(() => {
            setNotification(null);
        }, 1000);
    };

    const views: JSX.Element[] = [];
    cases.forEach((value, index) => {
        if (focusLast && index === cases.length - 1) {
            views.push(
                <CaseView
                    notify={notify}
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
                    notify={notify}
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
        if (!problem.url.startsWith('http')) {
            return null;
        }

        let url: URL;
        try {
            url = new URL(problem.url);
        } catch (err) {
            console.error(err, problem);
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
                <button className="btn" onClick={submitCf}>
                    <span className="icon">
                        <i className="codicon codicon-cloud-upload"></i>
                    </span>{' '}
                    Submit
                </button>
            );
        } else if (url.hostname == 'open.kattis.com') {
            return (
                <div className="pad-10 submit-area">
                    <button className="btn" onClick={submitKattis}>
                        <span className="icon">
                            <i className="codicon codicon-cloud-upload"></i>
                        </span>{' '}
                        Submit on Kattis
                    </button>
                    {waitingForSubmit && (
                        <>
                            <span className="loader"></span> Submitting...
                            <br />
                            <small>
                                To submit to Kattis, you need to have the{' '}
                                <a href="https://github.com/Kattis/kattis-cli/blob/main/submit.py">
                                    submission client{' '}
                                </a>
                                and the{' '}
                                <a href="https://open.kattis.com/download/kattisrc">
                                    configuration file{' '}
                                </a>
                                downloaded in a folder called .kattis in your
                                home directory.
                                <br />
                                Submission result will open in your browser.
                                <br />
                                <br />
                            </small>
                        </>
                    )}
                </div>
            );
        }
    };

    const getHref = () => {
        if (problem.local === undefined || problem.local === false) {
            return problem.url;
        } else {
            return undefined;
        }
    };

    const renderDonateButton = () => {
        const diff = new Date().getTime() - webviewState.dialogCloseDate;
        const diffInDays = diff / (1000 * 60 * 60 * 24);
        console.log('Diff in days:', diffInDays);
        if (diffInDays < 14) {
            return null;
        }

        return (
            <div className="donate-box">
                <a
                    href="javascript:void(0)"
                    className="right"
                    title="Close dialog"
                    onClick={() => closeDonateBox()}
                >
                    <i className="codicon codicon-close"></i>
                </a>
                <h1>🌸</h1>
                <h3>If you find CPH useful, please consider supporting.</h3>
                <p>
                    Your contribution helps support continued development of
                    CPH. CPH is free and open source, thanks to your support.
                </p>
                <a
                    href={payPalUrl}
                    className="btn btn-pink"
                    title="Open donation page"
                >
                    <i className="codicon codicon-heart-filled"></i> Donate
                </a>
            </div>
        );
    };

    return (
        <div className="ui">
            {notification && <div className="notification">{notification}</div>}
            {renderDonateButton()}
            <div className="meta">
                <h1 className="problem-name">
                    <a href={getHref()}>{problem.name}</a>{' '}
                    {compiling && (
                        <b className="compiling" title="Compiling">
                            <span className="loader"></span>
                        </b>
                    )}
                </h1>
            </div>
            <div className="results">{views}</div>
            <div className="margin-10">
                <div className="row">
                    <button
                        className="btn btn-green"
                        onClick={newCase}
                        title="Create a new empty testcase"
                    >
                        <span className="icon">
                            <i className="codicon codicon-add"></i>
                        </span>{' '}
                        New Testcase
                    </button>
                    {renderSubmitButton()}
                </div>

                <br />
                <span onClick={toggleOnlineJudgeEnv}>
                    <input
                        type="checkbox"
                        className="oj"
                        checked={onlineJudgeEnv}
                    />
                    <span>
                        Set <code>ONLINE_JUDGE</code>
                    </span>
                </span>
                <br />
                <br />
                <div>
                    <small>
                        <a
                            href={payPalUrl}
                            className="btn btn-pink"
                            title="Donate"
                        >
                            <i className="codicon codicon-heart-filled"></i>{' '}
                            Support
                        </a>
                    </small>
                    <small>
                        <a href="https://rb.gy/vw82u5" className="btn">
                            <i className="codicon codicon-feedback"></i>{' '}
                            Feedback
                        </a>
                    </small>
                </div>
                <div className="remote-message">
                    <p
                        dangerouslySetInnerHTML={{
                            __html: window.remoteMessage || '',
                        }}
                    />
                </div>
            </div>
            <div className="actions">
                <div className="row">
                    <button
                        className="btn"
                        onClick={runAll}
                        title="Run all testcases again"
                    >
                        <span className="icon">
                            <i className="codicon codicon-run-above"></i>
                        </span>{' '}
                        <span className="action-text">Run All</span>
                    </button>
                    <button
                        className="btn btn-green"
                        onClick={newCase}
                        title="Create a new empty testcase"
                    >
                        <span className="icon">
                            <i className="codicon codicon-add"></i>
                        </span>{' '}
                        <span className="action-text">New</span>
                    </button>
                </div>
                <div className="row">
                    <button
                        className="btn btn-orange"
                        onClick={stop}
                        title="Kill all running testcases"
                    >
                        <span className="icon">
                            <i className="codicon codicon-circle-slash"></i>
                        </span>{' '}
                        <span className="action-text">Stop</span>
                    </button>
                    <button
                        className="btn"
                        title="Help"
                        onClick={() =>
                            sendMessageToVSCode({
                                command: 'url',
                                url: 'https://github.com/agrawal-d/cph/blob/main/docs/user-guide.md',
                            })
                        }
                    >
                        <span className="icon">
                            <i className="codicon codicon-question"></i>
                        </span>{' '}
                        <span className="action-text">Help</span>
                    </button>
                    <button
                        className="btn btn-red right"
                        onClick={deleteTcs}
                        title="Delete all testcases and close results window"
                    >
                        <span className="icon">
                            <i className="codicon codicon-trash"></i>
                        </span>{' '}
                        <span className="action-text">Delete</span>
                    </button>
                </div>
            </div>

            {waitingForSubmit && (
                <div className="margin-10">
                    <span className="loader"></span> Waiting for extension ...
                    <br />
                    <small>
                        To submit to codeforces, you need to have the{' '}
                        <a href="https://github.com/agrawal-d/cph-submit">
                            cph-submit browser extension{' '}
                        </a>
                        installed, and a browser window open. You can change
                        language ID from VS Code settings.
                        <br />
                        <br />
                        Hint: You can also press <kbd>Ctrl+Alt+S</kbd> to
                        submit.
                    </small>
                </div>
            )}
        </div>
    );
}

const getCasesFromProblem = (problem: Problem | undefined): Case[] => {
    if (problem === undefined) {
        return [];
    }

    return problem.tests.map((testCase) => ({
        id: testCase.id,
        result: null,
        testcase: testCase,
    }));
};

/**
 * A wrapper over the main component Judge.
 * Shows UI to create problem when no problem exists.
 * Otherwise, shows the Judge view.
 */
function App() {
    const [problem, setProblem] = useState<Problem | undefined>(undefined);
    const [cases, setCases] = useState<Case[]>([]);
    const [deferSaveTimer, setDeferSaveTimer] = useState<number | null>(null);
    const [, setSaving] = useState<boolean>(false);
    const [showFallback, setShowFallback] = useState<boolean>(false);

    // Save the problem
    const save = () => {
        setSaving(true);
        if (problem !== undefined) {
            vscodeApi.postMessage({
                command: 'save',
                problem,
            });
        }
        setTimeout(() => {
            setSaving(false);
        }, 500);
    };

    const handleRunSingleResult = (data: ResultCommand) => {
        const idx = cases.findIndex(
            (testCase) => testCase.id === data.result.id,
        );
        if (idx === -1) {
            console.error('Invalid single result', cases, cases.length, data);
            return;
        }
        const newCases = cases.slice();
        newCases[idx].result = data.result;
        setCases(newCases);
    };

    // Save problem if it changes.
    useEffect(() => {
        if (deferSaveTimer !== null) {
            clearTimeout(deferSaveTimer);
        }
        const timeOutId = window.setTimeout(() => {
            setDeferSaveTimer(null);
            save();
        }, 500);
        setDeferSaveTimer(timeOutId);
    }, [problem]);

    useEffect(() => {
        const fn = (event: any) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'new-problem': {
                    if (data.problem === undefined) {
                        setShowFallback(true);
                    }

                    setProblem(data.problem);
                    setCases(getCasesFromProblem(data.problem));
                    break;
                }
                case 'run-single-result': {
                    handleRunSingleResult(data);
                    break;
                }
            }
        };
        window.addEventListener('message', fn);
        return () => {
            window.removeEventListener('message', fn);
        };
    }, [cases]);

    const createProblem = () => {
        vscodeApi.postMessage({
            command: 'create-local-problem',
        });
    };

    if (problem === undefined && showFallback) {
        return (
            <>
                <div className={`ui p10 fallback`}>
                    <div className="text-center">
                        <p>
                            This document does not have a CPH problem associated
                            with it.
                        </p>
                        <br />
                        <div className="btn btn-block" onClick={createProblem}>
                            <span className="icon">
                                <i className="codicon codicon-add"></i>
                            </span>{' '}
                            Create Problem
                        </div>
                        <a
                            className="btn btn-block btn-green"
                            href="https://github.com/agrawal-d/cph/blob/main/docs/user-guide.md"
                        >
                            <span className="icon">
                                <i className="codicon codicon-question"></i>
                            </span>{' '}
                            How to use this extension
                        </a>
                    </div>
                </div>
            </>
        );
    } else if (problem !== undefined) {
        return (
            <Judge
                problem={problem}
                updateProblem={setProblem}
                cases={cases}
                updateCases={setCases}
            />
        );
    } else {
        return (
            <>
                <div className="text-center">Loading...</div>
            </>
        );
    }
}

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
