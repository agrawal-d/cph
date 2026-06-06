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
    CheckingCommand,
    WebViewpersistenceState,
} from '../../types';
import CaseView from './CaseView';
import Page from './Page';
import { Feedback } from './Feedback';
import { CatCompanion } from './CatCompanion';

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
    pythonCommand: string;
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
    updateCases: React.Dispatch<React.SetStateAction<Case[]>>;
    onlineJudgeEnv: boolean;
    setOnlineJudgeEnv: (value: boolean) => void;
}) {
    const problem = props.problem;
    const cases = props.cases;
    const updateProblem = props.updateProblem;
    const updateCases = props.updateCases;
    const onlineJudgeEnv = props.onlineJudgeEnv;
    const setOnlineJudgeEnv = props.setOnlineJudgeEnv;

    const casesRef = React.useRef(cases);
    useEffect(() => {
        casesRef.current = cases;
    }, [cases]);

    const [focusLast, setFocusLast] = useState<boolean>(false);
    const [forceRunning, setForceRunning] = useState<number | false>(false);
    const [forceChecking, setForceChecking] = useState<number | false>(false);
    const [compiling, setCompiling] = useState<boolean>(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [waitingForSubmit, setWaitingForSubmit] = useState<boolean>(false);
    const [infoPageVisible, setInfoPageVisible] = useState<boolean>(false);
    const [generatedJson, setGeneratedJson] = useState<any | null>(null);
    const [liveUserCount, setLiveUserCount] = useState<number>(0);
    const [extLogs, setExtLogs] = useState<string>('');

    const [checkerVisible, setCheckerVisible] = useState<boolean>(
        !!problem.customCheckerPath,
    );
    const checkerInputRef = React.useRef<HTMLInputElement>(null);

    const numPassed = cases.filter(
        (testCase) => testCase.result?.pass === true,
    ).length;
    const total = cases.length;

    useEffect(() => {
        if (infoPageVisible) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }, [infoPageVisible]);

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
            const currentLoads = (vscodeState?.totalLoads || 0) + 1;
            const ret = {
                dialogCloseDate: vscodeState?.dialogCloseDate || Date.now(),
                feedbackDialogCloseDate:
                    vscodeState?.feedbackDialogCloseDate || Date.now(),
                hasSeenFeedbackTooltip:
                    vscodeState?.hasSeenFeedbackTooltip || false,
                catCompanionEnabled: vscodeState?.catCompanionEnabled || false,
                totalLoads: currentLoads,
                hasSeenCompanionTooltip:
                    vscodeState?.hasSeenCompanionTooltip || false,
                rateDialogCloseDate:
                    vscodeState?.rateDialogCloseDate || Date.now(),
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
    const [showCompanionTooltip, setShowCompanionTooltip] = useState(
        (webviewState.totalLoads || 0) >= 10 &&
            !webviewState.hasSeenCompanionTooltip &&
            !webviewState.catCompanionEnabled,
    );

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

    const closeRateReminder = () => {
        const newState = {
            ...webviewState,
            rateDialogCloseDate: Date.now(),
        };
        updateWebviewState(newState);
    };

    const sendMessageToVSCode = (message: WebviewToVSEvent) => {
        vscodeApi.postMessage(message);
    };

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target) {
                const tagName = target.tagName;
                if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    return;
                }
                if (
                    typeof target.closest === 'function' &&
                    target.closest('.chevron-btn')
                ) {
                    return;
                }
            }
            e.preventDefault();
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    useEffect(() => {
        const fn = (event: any) => {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'remote-message': {
                    window.remoteMessage = data.message;
                    break;
                }

                case 'running': {
                    handleRunning(data);
                    break;
                }
                case 'checking': {
                    handleChecking(data);
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
        updateCases((prevCases) => {
            const idx = prevCases.findIndex((c) => c.id === data.id);
            if (idx === -1) return prevCases;
            const newCases = prevCases.slice();
            newCases[idx] = {
                ...newCases[idx],
                result: null,
            };
            return newCases;
        });
    };

    const handleChecking = (data: CheckingCommand) => {
        setForceChecking(data.id);
        updateCases((prevCases) => {
            const idx = prevCases.findIndex((c) => c.id === data.id);
            if (idx === -1) return prevCases;
            const newCases = prevCases.slice();
            newCases[idx] = {
                ...newCases[idx],
                result: null,
            };
            return newCases;
        });
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

    const submitCodeChef = () => {
        sendMessageToVSCode({
            command: 'submitCodeChef',
            problem,
        });

        setWaitingForSubmit(true);
    };

    const submitCSES = () => {
        sendMessageToVSCode({
            command: 'submitCSES',
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

    const getCheckingProp = (value: Case) => {
        if (forceChecking === value.id) {
            setTimeout(() => {
                setForceChecking(false);
            }, 100);
            return true;
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

    const updateCheckerPath = (path: string) => {
        updateProblem({
            ...problem,
            customCheckerPath: path,
        });
    };

    const notify = (text: string) => {
        clearTimeout(notificationTimeout!);
        setNotification(text);
        notificationTimeout = setTimeout(() => {
            setNotification(null);
            notificationTimeout = undefined;
        }, 1000);
    };

    const toggleChecker = () => {
        const nextVisible = !checkerVisible;
        setCheckerVisible(nextVisible);
        if (nextVisible) {
            setTimeout(() => {
                checkerInputRef.current?.focus();
            }, 100);
        }
    };

    const openCheckerFile = () => {
        const checkerPath = problem.customCheckerPath?.trim();
        if (checkerPath) {
            sendMessageToVSCode({
                command: 'open-file',
                path: checkerPath,
            });
        }
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
                    forceChecking={getCheckingProp(value)}
                    updateCase={updateCase}
                    customCheckerPath={problem.customCheckerPath}
                    stop={stop}
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
                    forceChecking={getCheckingProp(value)}
                    updateCase={updateCase}
                    customCheckerPath={problem.customCheckerPath}
                    stop={stop}
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
            url.hostname !== 'open.kattis.com' &&
            url.hostname !== 'www.codechef.com' &&
            url.hostname !== 'codechef.com' &&
            url.hostname !== 'cses.fi'
        ) {
            return null;
        }

        if (url.hostname.endsWith('codeforces.com')) {
            return (
                <button className="btn btn-block" onClick={submitCf}>
                    <span className="icon">
                        <i className="codicon codicon-cloud-upload"></i>
                    </span>{' '}
                    {t('submit')}
                </button>
            );
        } else if (url.hostname == 'open.kattis.com') {
            return (
                <div className="pad-10 submit-area">
                    <button className="btn btn-block" onClick={submitKattis}>
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
        } else if (url.hostname === 'www.codechef.com' || url.hostname === 'codechef.com') {
            return (
                <button className="btn btn-block" onClick={submitCodeChef}>
                    <span className="icon">
                        <i className="codicon codicon-cloud-upload"></i>
                    </span>{' '}
                    {t('submitOnCodeChef')}
                </button>
            );
        } else if (url.hostname === 'cses.fi') {
            return (
                <button className="btn btn-block" onClick={submitCSES}>
                    <span className="icon">
                        <i className="codicon codicon-cloud-upload"></i>
                    </span>{' '}
                    {t('submitOnCSES')}
                </button>
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

    const clearState = () => {
        const defaultState = {
            dialogCloseDate: Date.now(),
            feedbackDialogCloseDate: Date.now(),
            hasSeenFeedbackTooltip: false,
            catCompanionEnabled: false,
            totalLoads: 0,
            hasSeenCompanionTooltip: false,
            rateDialogCloseDate: Date.now(),
        };
        updateWebviewState(defaultState);
        setEditableStateText(JSON.stringify(defaultState, null, 2));
        setNotification('State cleared');
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

    const renderRateReminder = () => {
        const diff =
            new Date().getTime() -
            (webviewState.rateDialogCloseDate || Date.now());
        const diffInDays = diff / (1000 * 60 * 60 * 24);
        if (diffInDays < 30) {
            return null;
        }

        return (
            <div
                className="donate-box"
                style={{
                    background:
                        'linear-gradient(0deg, rgba(255, 234, 130, 0.23), transparent)',
                }}
            >
                <a
                    role="button"
                    className="right"
                    title={t('close')}
                    onClick={() => closeRateReminder()}
                >
                    <i className="codicon codicon-close"></i>
                </a>
                <h1>⭐</h1>
                <h3>{t('rateCPH')}</h3>
                <p>{t('rateDescription')}</p>
                <a
                    href="https://marketplace.visualstudio.com/items?itemName=DivyanshuAgrawal.competitive-programming-helper&ssr=false#review-details"
                    className="btn btn-yellow"
                    title={t('rate')}
                    onClick={() => closeRateReminder()}
                >
                    <i className="codicon codicon-star-full"></i> {t('rate')}
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
                <button className="btn btn-red" onClick={clearState}>
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
        <div
            className={`ui ${
                webviewState.catCompanionEnabled ? 'cat-companion-active' : ''
            }`}
        >
            {notification && <div className="notification">{notification}</div>}
            {renderDonateButton()}
            {renderRateReminder()}
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
                    <b
                        className="compiling"
                        title={compiling ? t('compiling') : undefined}
                        style={{
                            opacity: compiling ? 1 : 0,
                            pointerEvents: compiling ? 'auto' : 'none',
                        }}
                    >
                        <span className="loader"></span>
                    </b>
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
                <div className="action-container">
                    <div className="button-grid">
                        <button
                            className="btn btn-green btn-block"
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
                    {waitingForSubmit && (
                        <div className="margin-10">
                            <span className="loader"></span>{' '}
                            {t('waitingForExtension')}
                            <br />
                            <small>
                                {(() => {
                                    try {
                                        const u = new URL(problem.url);
                                        if (u.hostname === 'www.codechef.com' || u.hostname === 'codechef.com') {
                                            return t('codechefInstructions');
                                        } else if (u.hostname === 'cses.fi') {
                                            return t('csesInstructions');
                                        }
                                    } catch (_) {}
                                    return (
                                        <>
                                            {t('codeforcesInstructions')}
                                            <br />
                                            <br />
                                            {t('submitHint')}
                                        </>
                                    );
                                })()}
                            </small>
                        </div>
                    )}
                    <button
                        className={`btn btn-block ${
                            problem.customCheckerPath?.trim()
                                ? 'btn-orange'
                                : ''
                        }`}
                        onClick={toggleChecker}
                    >
                        <span className="icon">
                            <i
                                className={`codicon codicon-chevron-${
                                    checkerVisible ? 'up' : 'down'
                                }`}
                            ></i>
                        </span>{' '}
                        {problem.customCheckerPath?.trim()
                            ? t('customCheckerEnabled')
                            : t('customChecker')}
                    </button>
                </div>
                {checkerVisible && (
                    <div className="pad-10 custom-checker-area">
                        <div
                            style={{
                                display: 'flex',
                                gap: '5px',
                                alignItems: 'center',
                            }}
                        >
                            <input
                                type="text"
                                className="selectable"
                                placeholder={t('customCheckerPathPlaceholder')}
                                value={problem.customCheckerPath || ''}
                                onChange={(e) =>
                                    updateCheckerPath(e.target.value)
                                }
                                ref={checkerInputRef}
                                style={{
                                    flexGrow: 1,
                                    width: '0',
                                    padding: '4px 6px',
                                }}
                            />
                            <button
                                className="btn-chromeless"
                                title="Open the checker script"
                                onClick={openCheckerFile}
                                disabled={!problem.customCheckerPath?.trim()}
                            >
                                <span
                                    className="icon"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <i className="codicon codicon-link-external"></i>
                                </span>
                            </button>
                        </div>
                        <details style={{ marginTop: '10px' }}>
                            <summary
                                style={{
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    opacity: 0.8,
                                }}
                            >
                                {t('usageInstructions')}
                            </summary>
                            <div style={{ marginTop: '10px' }}>
                                <small>
                                    {t('customCheckerDescription')}
                                    <br />
                                    <br />
                                    {t('exitCodes')}
                                    <br />
                                    <br />
                                    {t('invocationFormat')}:
                                    <br />
                                    <code>
                                        {window.pythonCommand}{' '}
                                        &lt;script-path&gt; &lt;input-file&gt;
                                        &lt;output-file&gt;
                                    </code>
                                    <ul
                                        style={{
                                            margin: '10px 0',
                                            paddingLeft: '20px',
                                        }}
                                    >
                                        <li>
                                            <b>&lt;script-path&gt;</b>:{' '}
                                            {t('argScriptPath')}
                                        </li>
                                        <li>
                                            <b>&lt;input-file&gt;</b>:{' '}
                                            {t('argInputFile')}
                                        </li>
                                        <li>
                                            <b>&lt;output-file&gt;</b>:{' '}
                                            {t('argOutputFile')}
                                        </li>
                                    </ul>
                                    {t('expectedBehavior')}
                                    <br />
                                    <textarea
                                        className="selectable"
                                        readOnly
                                        value={`with open(sys.argv[1], "r") as f:
    test_input = f.read()
with open(sys.argv[2], "r") as f:
    code_output = f.read()`}
                                        style={{
                                            fontSize: '0.9em',
                                            height: '95px',
                                            width: '100%',
                                            display: 'block',
                                        }}
                                    />
                                    <br />
                                    <a
                                        href="https://github.com/agrawal-d/cph/blob/main/docs/user-guide.md#custom-checker"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-black"
                                        style={{
                                            fontSize: '0.9em',
                                            display: 'inline-block',
                                        }}
                                    >
                                        <i className="codicon codicon-book"></i>{' '}
                                        {t('documentation')}
                                    </a>
                                </small>
                            </div>
                        </details>
                    </div>
                )}
                <small className="footer-button-grid">
                    <a
                        href={payPalUrl}
                        className="btn btn-black footer-btn-row-1"
                        title={t('donate')}
                    >
                        <i className="codicon codicon-heart-filled"></i>{' '}
                        {t('support')}
                    </a>
                    <span
                        className="footer-btn-row-1"
                        style={{ position: 'relative' }}
                    >
                        {showFeedbackTooltip && (
                            <div
                                className="feedback-tooltip"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>{t('feedbackTooltip')}</span>
                                <a
                                    role="button"
                                    style={{
                                        cursor: 'pointer',
                                        color: 'white',
                                        opacity: 0.8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setShowFeedbackTooltip(false);
                                        updateWebviewState({
                                            ...webviewState,
                                            hasSeenFeedbackTooltip: true,
                                        });
                                    }}
                                    title="Close"
                                >
                                    <i
                                        className="codicon codicon-close"
                                        style={{ fontSize: '10px' }}
                                    ></i>
                                </a>
                            </div>
                        )}
                        <a
                            role="button"
                            className="btn btn-black"
                            onClick={() => setFeedbackPageVisible(true)}
                        >
                            <i className="codicon codicon-feedback"></i>{' '}
                            {t('feedback')}
                        </a>
                    </span>
                    <span
                        className="footer-btn-row-2"
                        style={{ position: 'relative' }}
                    >
                        {showCompanionTooltip &&
                            !webviewState.catCompanionEnabled && (
                                <div
                                    className="feedback-tooltip"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <span>{t('companionTooltip')}</span>
                                    <a
                                        role="button"
                                        style={{
                                            cursor: 'pointer',
                                            color: 'white',
                                            opacity: 0.8,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setShowCompanionTooltip(false);
                                            updateWebviewState({
                                                ...webviewState,
                                                hasSeenCompanionTooltip: true,
                                            });
                                        }}
                                        title="Close"
                                    >
                                        <i
                                            className="codicon codicon-close"
                                            style={{ fontSize: '10px' }}
                                        ></i>
                                    </a>
                                </div>
                            )}
                        <a
                            role="button"
                            className="btn btn-black"
                            title={
                                webviewState.catCompanionEnabled
                                    ? t('disableCatCompanion')
                                    : t('enableCatCompanion')
                            }
                            onClick={() => {
                                updateWebviewState({
                                    ...webviewState,
                                    catCompanionEnabled:
                                        !webviewState.catCompanionEnabled,
                                    hasSeenCompanionTooltip: true,
                                });
                            }}
                        >
                            <i className="codicon codicon-octoface"></i>{' '}
                            {t('cat')}
                        </a>
                    </span>
                    <a
                        href="https://github.com/agrawal-d/cph/issues"
                        className="btn btn-black footer-btn-row-2"
                    >
                        <i className="codicon codicon-github"></i> {t('bugs')}
                    </a>
                    <a
                        role="button"
                        className="btn btn-black footer-btn-row-2"
                        title={t('aboutCPH')}
                        onClick={() => showInfoPage()}
                    >
                        <i className="codicon codicon-info"></i> {t('about')}
                    </a>
                </small>
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
                {webviewState.catCompanionEnabled && (
                    <CatCompanion
                        enabled={webviewState.catCompanionEnabled}
                        total={total}
                        numPassed={numPassed}
                    />
                )}
                <div className="row">
                    <div className="split-btn">
                        <button
                            className="btn main-btn"
                            onClick={runAll}
                            title={t('runAll')}
                        >
                            <span className="icon">
                                <i className="codicon codicon-run-above"></i>
                            </span>{' '}
                            <span className="action-text">{t('runAll')}</span>
                        </button>
                        <button
                            className="btn chevron-btn"
                            title={t('moreActions')}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const event = new MouseEvent('contextmenu', {
                                    bubbles: true,
                                    clientX: e.clientX,
                                    clientY: e.clientY,
                                });
                                e.currentTarget.dispatchEvent(event);
                            }}
                            data-vscode-context='{"preventDefaultContextMenuItems": true, "webviewSection": "compile-button"}'
                        >
                            <span className="icon">
                                <i className="codicon codicon-chevron-down"></i>
                            </span>
                        </button>
                    </div>
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
                        className="btn btn-yellow"
                        title={t('settings')}
                        onClick={() =>
                            sendMessageToVSCode({
                                command: 'open-settings',
                            })
                        }
                    >
                        <span className="icon">
                            <i className="codicon codicon-settings"></i>
                        </span>{' '}
                        <span className="action-text">{t('settings')}</span>
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
    const [onlineJudgeEnv, setOnlineJudgeEnv] = useState<boolean>(false);

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
                    setOnlineJudgeEnv(data.onlineJudgeEnv ?? false);
                    break;
                }
                case 'run-single-result': {
                    handleRunSingleResult(data);
                    break;
                }
                case 'update-online-judge-env': {
                    setOnlineJudgeEnv(data.value);
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
                key={problem.srcPath}
                problem={problem}
                updateProblem={setProblem}
                cases={cases}
                updateCases={setCases}
                onlineJudgeEnv={onlineJudgeEnv}
                setOnlineJudgeEnv={setOnlineJudgeEnv}
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
