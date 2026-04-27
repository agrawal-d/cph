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
import Page from './Page';
import { Feedback } from './Feedback';

let storedLogs = '';
let notificationTimeout: NodeJS.Timeout | undefined = undefined;

const originalConsole = { ...window.console };
function customLogger(
    originalMethod: (...args: any[]) => void,
    ...args: any[]
) {
    originalMethod(...args);

    storedLogs += new Date().toISOString() + ' ';
    storedLogs +=
        args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
            .join(' ') + '\n';
}

declare const vscodeApi: {
    postMessage: (message: WebviewToVSEvent) => void;
    getState: () => WebViewpersistenceState | undefined;
    setState: (state: WebViewpersistenceState) => void;
};

interface CustomWindow extends Window {
    generatedJsonUri: string;
    remoteMessage: string | null;
    remoteServerAddress: string;
    showLiveUserCount: boolean;
    console: Console;
    translations: Record<string, string>;
}
declare const window: CustomWindow;

const t = (key: string): string => {
    return window.translations[key] || key;
};

window.console.log = customLogger.bind(window.console, originalConsole.log);
window.console.error = customLogger.bind(window.console, originalConsole.error);
window.console.warn = customLogger.bind(window.console, originalConsole.warn);
window.console.info = customLogger.bind(window.console, originalConsole.info);
window.console.debug = customLogger.bind(window.console, originalConsole.debug);

// Original: www.paypal.com/ncp/payment/CMLKCFEJEMX5L
const payPalUrl = 'https://rb.gy/5iiorz';

function getLiveUserCount(): Promise<number> {
    console.log('Fetching live user count');
    return fetch(window.remoteServerAddress)
        .then((res) => res.text())
        .then((text) => {
            const userCount = Number(text);
            if (isNaN(userCount)) {
                console.error('Invalid live user count', text);
                return 0;
            } else {
                return userCount;
            }
        })
        .catch((err) => {
            console.error('Failed to fetch live users', err);
            return 0;
        });
}

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
    const [infoPageVisible, setInfoPageVisible] = useState<boolean>(false);
    const [generatedJson, setGeneratedJson] = useState<any | null>(null);
    const [liveUserCount, setLiveUserCount] = useState<number>(0);
    const [extLogs, setExtLogs] = useState<string>('');

    const numPassed = cases.filter(
        (testCase) => testCase.result?.pass === true,
    ).length;
    const total = cases.length;

    useEffect(() => {
        const updateLiveUserCount = (): void => {
            getLiveUserCount().then((count) => setLiveUserCount(count));
        };
        updateLiveUserCount();
        const interval = setInterval(updateLiveUserCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch(window.generatedJsonUri)
            .then((res) => res.json())
            .then((data) => setGeneratedJson(data))
            .catch((err) =>
                console.error('Failed to fetch generated JSON', err),
            );
    }, []);

    const [webviewState, setWebviewState] = useState<WebViewpersistenceState>(
        () => {
            const vscodeState = vscodeApi.getState();
            const ret = {
                dialogCloseDate: vscodeState?.dialogCloseDate || Date.now(),
                feedbackDialogCloseDate:
                    vscodeState?.feedbackDialogCloseDate || Date.now(),
                hasSeenFeedbackTooltip:
                    vscodeState?.hasSeenFeedbackTooltip || false,
            };
            vscodeApi.setState(ret);
            console.log('Restored to state:', ret);
            return ret;
        },
    );

    const [feedbackPageVisible, setFeedbackPageVisible] = useState(false);
    const [editableStateText, setEditableStateText] = useState(
        JSON.stringify(webviewState, null, 2),
    );
    const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(
        !webviewState.hasSeenFeedbackTooltip,
    );

    useEffect(() => {
        if (showFeedbackTooltip) {
            const timer = setTimeout(() => {
                setShowFeedbackTooltip(false);
                updateWebviewState({
                    ...webviewState,
                    hasSeenFeedbackTooltip: true,
                });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showFeedbackTooltip]);

    const updateWebviewState = (newState: WebViewpersistenceState) => {
        setWebviewState(newState);
        vscodeApi.setState(newState);
    };

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
        updateWebviewState(newState);
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
                case 'ext-logs': {
                    setExtLogs(data.logs);
                    break;
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
        let sendEnv = 'false';
        if (onlineJudgeEnv) sendEnv = 'true';
        sendMessageToVSCode({
            command: 'online-judge-env',
            value: sendEnv,
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
        notify(t('stoppedProcesses'));
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
        let sendEnv = 'false';
        if (newEnv) sendEnv = 'true';
        sendMessageToVSCode({
            command: 'online-judge-env',
            value: sendEnv,
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
        clearTimeout(notificationTimeout!);
        setNotification(text);
        notificationTimeout = setTimeout(() => {
            setNotification(null);
            notificationTimeout = undefined;
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
            !url.hostname.endsWith('codeforces.com') &&
            url.hostname !== 'open.kattis.com'
        ) {
            return null;
        }

        if (url.hostname.endsWith('codeforces.com')) {
            return (
                <button className="btn" onClick={submitCf}>
                    <span className="icon">
                        <i className="codicon codicon-cloud-upload"></i>
                    </span>{' '}
                    {t('submit')}
                </button>
            );
        } else if (url.hostname == 'open.kattis.com') {
            return (
                <div className="pad-10 submit-area">
                    <button className="btn" onClick={submitKattis}>
                        <span className="icon">
                            <i className="codicon codicon-cloud-upload"></i>
                        </span>{' '}
                        {t('submitOnKattis')}
                    </button>
                    {waitingForSubmit && (
                        <>
                            <span className="loader"></span> {t('submitting')}
                            <br />
                            <small>
                                {t('kattisInstructions')}
                                <br />
                                {t('kattisBrowserNote')}
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

    const showInfoPage = () => {
        sendMessageToVSCode({
            command: 'get-ext-logs',
        });
        setEditableStateText(JSON.stringify(webviewState, null, 2));
        setInfoPageVisible(true);
    };

    const saveDebugState = () => {
        try {
            const newState = JSON.parse(editableStateText);
            updateWebviewState(newState);
            setNotification('State saved');
        } catch (e) {
            setNotification('Invalid JSON');
        }
    };

    const renderDonateButton = () => {
        const diff = new Date().getTime() - webviewState.dialogCloseDate;
        const diffInDays = diff / (1000 * 60 * 60 * 24);
        if (diffInDays < 14) {
            return null;
        }

        return (
            <div className="donate-box">
                <a
                    role="button"
                    className="right"
                    title={t('close')}
                    onClick={() => closeDonateBox()}
                >
                    <i className="codicon codicon-close"></i>
                </a>
                <h1>🌸</h1>
                <h3>{t('supportCPH')}</h3>
                <p>{t('supportDescription')}</p>
                <a
                    href={payPalUrl}
                    className="btn btn-pink"
                    title={t('donate')}
                >
                    <i className="codicon codicon-heart-filled"></i>{' '}
                    {t('donate')}
                </a>
            </div>
        );
    };

    const renderInfoPage = () => {
        if (infoPageVisible === false) {
            return null;
        }

        if (generatedJson === null) {
            return (
                <Page
                    content={t('loading')}
                    title={t('aboutCPH')}
                    closePage={() => setInfoPageVisible(false)}
                />
            );
        }
        const logs = storedLogs;
        const contents = (
            <div>
                {t('cphDescription')}
                <hr />
                <h3>{t('aiCompilation')}</h3>
                {t('aiDescription')}
                <br />
                <br />
                <button
                    className="btn btn-green"
                    onClick={(e) => {
                        const target = e.target as HTMLButtonElement;
                        target.innerText = t('enable');
                    }}
                >
                    {t('enable')}
                </button>
                <hr />
                <h3>{t('getHelp')}</h3>
                <a
                    className="btn"
                    href="https://github.com/agrawal-d/cph/blob/main/docs/user-guide.md"
                >
                    {t('userGuide')}
                </a>
                <hr />
                <h3>{t('commit')}</h3>
                <pre className="selectable">{generatedJson.gitCommitHash}</pre>
                <hr />
                <h3>{t('buildTime')}</h3>
                {generatedJson.dateTime}
                <hr />
                <h3>{t('liveUserCount')}</h3>
                {liveUserCount} {liveUserCount === 1 ? t('user') : t('users')}{' '}
                {t('online')}.
                <hr />
                <h3>{t('uiLogs')}</h3>
                <pre className="selectable">{logs}</pre>
                <hr />
                <h3>{t('extensionLogs')}</h3>
                <pre className="selectable">{extLogs}</pre>
                <hr />
                <h3>Debug</h3>
                <textarea
                    className="selectable"
                    value={editableStateText}
                    onChange={(e) => setEditableStateText(e.target.value)}
                    rows={10}
                    style={{ height: '200px', fontSize: '12px' }}
                />
                <button className="btn btn-green" onClick={saveDebugState}>
                    Save Changes
                </button>
                <button
                    className="btn btn-red"
                    onClick={() => {
                        const defaultState = {
                            dialogCloseDate: Date.now(),
                            feedbackDialogCloseDate: Date.now(),
                            hasSeenFeedbackTooltip: false,
                        };
                        updateWebviewState(defaultState);
                        setEditableStateText(
                            JSON.stringify(defaultState, null, 2),
                        );
                        setNotification('State cleared');
                    }}
                >
                    Clear State
                </button>
                <hr />
                <details>
                    <summary>
                        <b>{t('license')}</b>
                    </summary>
                    <pre className="selectable">
                        {generatedJson.licenseString}
                    </pre>
                </details>
            </div>
        );

        return (
            <Page
                content={contents}
                title={t('aboutCPH')}
                closePage={() => setInfoPageVisible(false)}
            />
        );
    };

    const renderTimeoutAVSuggestion = () => {
        if (
            cases.some((testCase) => {
                return (
                    testCase.result?.timeOut ||
                    testCase.result?.signal == 'SIGTERM'
                );
            })
        ) {
            return (
                <div className="timeout-av-suggestion">
                    <h5>
                        <i className="codicon codicon-bug"></i>{' '}
                        {t('antivirusTitle')}
                    </h5>
                    <p>{t('antivirusDescription')}</p>
                </div>
            );
        } else {
            return <></>;
        }
    };

    return (
        <div className="ui">
            {notification && <div className="notification">{notification}</div>}
            {renderDonateButton()}
            {renderInfoPage()}
            <Feedback
                webviewState={webviewState}
                updateWebviewState={updateWebviewState}
                t={t}
                notify={notify}
                feedbackPageVisible={feedbackPageVisible}
                setFeedbackPageVisible={setFeedbackPageVisible}
            />
            <div className="meta">
                <span className="problem-name">
                    <a href={getHref()}>{problem.name}</a>{' '}
                    {compiling && (
                        <b className="compiling" title={t('compiling')}>
                            <span className="loader"></span>
                        </b>
                    )}
                </span>
                <span
                    className={`pass-rate ${
                        numPassed === total
                            ? 'pass-all'
                            : numPassed === 0
                              ? 'fail-all'
                              : ''
                    }`}
                >
                    {numPassed} / {total} {t('passedRate')}{' '}
                </span>
            </div>
            <div className="results">{views}</div>
            <div className="margin-10">
                <div className="row">
                    <button
                        className="btn btn-green"
                        onClick={newCase}
                        title={t('newTestcase')}
                    >
                        <span className="icon">
                            <i className="codicon codicon-add"></i>
                        </span>{' '}
                        {t('newTestcase')}
                    </button>
                    {renderSubmitButton()}
                </div>
                <div>
                    <span
                        onClick={toggleOnlineJudgeEnv}
                        className={`oj-box ${
                            onlineJudgeEnv ? 'oj-enabled' : ''
                        }`}
                    >
                        {onlineJudgeEnv ? '☑' : '☐'}{' '}
                        <span className="oj-code">{t('setOnlineJudge')}</span>
                    </span>
                    {renderTimeoutAVSuggestion()}
                </div>
                <br />
                <br />
                <div>
                    <small>
                        <a
                            href={payPalUrl}
                            className="btn btn-pink"
                            title={t('donate')}
                        >
                            <i className="codicon codicon-heart-filled"></i>{' '}
                            {t('support')}
                        </a>
                    </small>
                    <small>
                        <span style={{ position: 'relative' }}>
                            {showFeedbackTooltip && (
                                <div className="feedback-tooltip">
                                    Share feedback in-app
                                </div>
                            )}
                            <a
                                role="button"
                                className="btn"
                                onClick={() => setFeedbackPageVisible(true)}
                            >
                                <i className="codicon codicon-feedback"></i>{' '}
                                {t('feedback')}
                            </a>
                        </span>
                    </small>
                    <small>
                        <a
                            href="https://github.com/agrawal-d/cph/issues"
                            className="btn btn-black"
                        >
                            <i className="codicon codicon-github"></i>{' '}
                            {t('bugs')}
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
                {window.showLiveUserCount && liveUserCount > 0 && (
                    <div className="liveUserCount">
                        <i className="codicon codicon-circle-filled color-green"></i>{' '}
                        {liveUserCount}{' '}
                        {liveUserCount === 1 ? t('user') : t('users')}{' '}
                        {t('online')}.
                    </div>
                )}
            </div>
            <div className="actions">
                <div className="row">
                    <button
                        className="btn"
                        onClick={runAll}
                        title={t('runAll')}
                    >
                        <span className="icon">
                            <i className="codicon codicon-run-above"></i>
                        </span>{' '}
                        <span className="action-text">{t('runAll')}</span>
                    </button>
                    <button
                        className="btn btn-green"
                        onClick={newCase}
                        title={t('newTestcase')}
                    >
                        <span className="icon">
                            <i className="codicon codicon-add"></i>
                        </span>{' '}
                        <span className="action-text">{t('new')}</span>
                    </button>
                </div>
                <div className="row">
                    <button
                        className="btn btn-orange"
                        onClick={stop}
                        title={t('stop')}
                    >
                        <span className="icon">
                            <i className="codicon codicon-circle-slash"></i>
                        </span>{' '}
                        <span className="action-text">{t('stop')}</span>
                    </button>
                    <button
                        className="btn"
                        title={t('aboutCPH')}
                        onClick={() => showInfoPage()}
                    >
                        <span className="icon">
                            <i className="codicon codicon-info"></i>
                        </span>{' '}
                        <span className="action-text"></span>
                    </button>
                    <button
                        className="btn btn-red right"
                        onClick={deleteTcs}
                        title={t('delete')}
                    >
                        <span className="icon">
                            <i className="codicon codicon-trash"></i>
                        </span>{' '}
                        <span className="action-text">{t('delete')}</span>
                    </button>
                </div>
            </div>

            {waitingForSubmit && (
                <div className="margin-10">
                    <span className="loader"></span> {t('waitingForExtension')}
                    <br />
                    <small>
                        {t('codeforcesInstructions')}
                        <br />
                        <br />
                        {t('submitHint')}
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
                        <p>{t('noProblemAssociated')}</p>
                        <br />
                        <div className="btn btn-block" onClick={createProblem}>
                            <span className="icon">
                                <i className="codicon codicon-add"></i>
                            </span>{' '}
                            {t('createProblem')}
                        </div>
                        <a
                            className="btn btn-block btn-green"
                            href="https://github.com/agrawal-d/cph/blob/main/docs/user-guide.md"
                        >
                            <span className="icon">
                                <i className="codicon codicon-question"></i>
                            </span>{' '}
                            {t('howToUse')}
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
                <div className="text-center">{t('loading')}</div>
            </>
        );
    }
}

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
