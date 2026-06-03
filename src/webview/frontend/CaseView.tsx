import { Case, VSToWebViewMessage, DiffResult, TokenDiff } from '../../types';
import { useState, createRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import React from 'react';

interface CustomWindow extends Window {
    translations: Record<string, string>;
}
declare const window: CustomWindow;

const t = (key: string): string => {
    return window.translations[key] || key;
};

export default function CaseView(props: {
    num: number;
    case: Case;
    rerun: (id: number, input: string, output: string) => void;
    updateCase: (id: number, input: string, output: string) => void;
    remove: (num: number) => void;
    notify: (text: string) => void;
    doFocus?: boolean;
    forceRunning: boolean;
    forceChecking: boolean;
    customCheckerPath?: string;
    stop: () => void;
}) {
    const { id, result } = props.case;

    const [input, setInput] = useState<string>(props.case.testcase.input);
    const [output, setOutput] = useState<string>(props.case.testcase.output);
    const [running, setRunning] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(
        props.case.result?.pass === true,
    );
    const inputBox = createRef<HTMLTextAreaElement>();

    useEffect(() => {
        if (props.doFocus) {
            inputBox.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [props.doFocus]);

    useEffect(() => {
        props.updateCase(props.case.id, input, output);
    }, [input, output]);

    useEffect(() => {
        if (props.forceRunning) {
            setRunning(true);
            setChecking(false);
        }
    }, [props.forceRunning]);

    useEffect(() => {
        if (props.forceChecking) {
            setRunning(false);
            setChecking(true);
        }
    }, [props.forceChecking]);

    const handleInputChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setInput(event.target.value);
    };

    const handleOutputChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setOutput(event.target.value);
    };

    const rerun = () => {
        setRunning(true);
        props.rerun(id, input, output);
    };

    const expand = () => {
        setMinimized(false);
    };

    const minimize = () => {
        setMinimized(true);
    };

    const toggle = () => (minimized ? expand() : minimize());

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        props.notify(t('copiedToClipboard'));
    };

    useEffect(() => {
        if (props.case.result !== null) {
            setRunning(false);
            setChecking(false);
            props.case.result.pass ? setMinimized(true) : setMinimized(false);
        }
    }, [props.case.result]);

    useEffect(() => {
        if (running || checking) {
            setMinimized(true);
        }
    }, [running, checking]);

    useEffect(() => {
        window.addEventListener('message', function (event) {
            const data: VSToWebViewMessage = event.data;
            switch (data.command) {
                case 'not-running': {
                    setRunning(false);
                    break;
                }
            }
        });
    }, [props.case]);

    let resultText = '';
    const stderror = result?.stderr;
    // Handle several cases for result text
    if (result?.signal) {
        resultText = result?.signal;
    } else if (result?.stdout) {
        resultText = result.stdout || ' ';
    }
    if (!result) {
        resultText = t('runToShowOutput');
    }
    if (running || checking) {
        resultText = '...';
    }
    const passFailText = result
        ? result.pass
            ? t('passed')
            : t('failed')
        : '';
    const caseClassName =
        'case ' + (running || checking ? 'running' : passFailText);
    const timeText = result?.timeOut ? t('timedOut') : result?.time + 'ms';

    return (
        <div className={caseClassName}>
            <div className="case-metadata">
                <div className="toggle-minimize" onClick={toggle}>
                    <span className="case-number case-title">
                        {minimized && (
                            <span onClick={expand} title={t('expand')}>
                                <span className="icon">
                                    <i className="codicon codicon-chevron-down"></i>
                                </span>
                            </span>
                        )}
                        {!minimized && (
                            <span onClick={minimize} title={t('minimize')}>
                                <span className="icon">
                                    <i className="codicon codicon-chevron-up"></i>
                                </span>
                            </span>
                        )}
                        &nbsp;TC {props.num}
                    </span>
                    {(running || checking) && (
                        <span className="running-text">
                            {running ? t('running') : t('checking')}
                        </span>
                    )}
                    {result && !running && !checking && (
                        <>
                            <span className="result-data">
                                <span
                                    className={
                                        result.pass
                                            ? 'result-pass'
                                            : 'result-fail'
                                    }
                                >
                                    &nbsp; &nbsp;
                                    {result.pass ? t('Passed') : t('Failed')}
                                </span>
                            </span>
                            <span className="exec-time">{timeText}</span>
                        </>
                    )}
                </div>
                <div className="time">
                    {running || checking ? (
                        <button
                            className="btn btn-orange"
                            title={t('stop')}
                            onClick={props.stop}
                        >
                            <span className="icon">
                                <i className="codicon codicon-circle-slash"></i>
                            </span>{' '}
                        </button>
                    ) : (
                        <button
                            className="btn btn-green"
                            title={t('runAgain')}
                            onClick={rerun}
                        >
                            <span className="icon">
                                <i className="codicon codicon-play"></i>
                            </span>{' '}
                        </button>
                    )}
                    <button
                        className="btn btn-red"
                        title={t('deleteTestcase')}
                        onClick={() => {
                            props.remove(id);
                        }}
                    >
                        <span className="icon">
                            <i className="codicon codicon-trash"></i>
                        </span>{' '}
                    </button>
                </div>
            </div>
            {!minimized && (
                <>
                    <div className="textarea-container">
                        {t('inputLabel')}
                        <div
                            className="clipboard"
                            onClick={() => {
                                copyToClipboard(input);
                            }}
                            title={t('copiedToClipboard')}
                        >
                            {t('copy')}
                        </div>
                        <TextareaAutosize
                            className="selectable input-textarea"
                            onChange={handleInputChange}
                            value={input}
                            ref={inputBox}
                            autoFocus={props.doFocus}
                        />
                    </div>
                    <div
                        className={`textarea-container expected-output-container ${
                            props.customCheckerPath?.trim() ? 'hidden' : ''
                        }`}
                    >
                        {t('expectedOutputLabel')}
                        <div
                            className="clipboard"
                            onClick={() => {
                                copyToClipboard(output);
                            }}
                            title={t('copiedToClipboard')}
                        >
                            {t('copy')}
                        </div>
                        <TextareaAutosize
                            className="selectable expected-textarea"
                            onChange={handleOutputChange}
                            value={output}
                        />
                    </div>
                    {props.case.result != null && (
                        <div className="textarea-container">
                            {t('receivedOutputLabel')}
                            <div
                                className="clipboard"
                                onClick={() => {
                                    copyToClipboard(resultText);
                                }}
                                title={t('copiedToClipboard')}
                            >
                                {t('copy')}
                            </div>
                            <div
                                className="expectedoutput"
                                onClick={() => {
                                    setOutput(resultText);
                                    props.notify(t('setAsExpectedOutput'));
                                }}
                                title={t('setAsExpectedOutput')}
                            >
                                {t('set')}
                            </div>
                            <>
                                <TextareaAutosize
                                    className="selectable received-textarea"
                                    value={trunctateStdout(resultText)}
                                    readOnly
                                />
                            </>
                        </div>
                    )}
                    {props.case.result?.checkerRun && !running && !checking && (
                        <details style={{ marginTop: '10px' }}>
                            <summary
                                style={{
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    opacity: 0.8,
                                }}
                            >
                                {t('checkerLog')}
                            </summary>
                            <div style={{ marginTop: '5px' }}>
                                <small
                                    style={{
                                        display: 'block',
                                        marginTop: '5px',
                                    }}
                                >
                                    {t('checkerExitCode')}{' '}
                                    <code>
                                        {props.case.result.checkerRun.code !==
                                        null
                                            ? props.case.result.checkerRun.code
                                            : props.case.result.checkerRun
                                                  .signal || 'Terminated'}
                                    </code>
                                </small>
                                <small
                                    style={{
                                        display: 'block',
                                        marginTop: '10px',
                                    }}
                                >
                                    {t('checkerOutput')}
                                </small>
                                <textarea
                                    className="selectable"
                                    readOnly
                                    value={trunctateStdout(
                                        `STDOUT:\n${props.case.result.checkerRun.stdout}\n\nSTDERR:\n${props.case.result.checkerRun.stderr}`,
                                    )}
                                    style={{
                                        fontSize: '0.9em',
                                        height: '100px',
                                        width: '100%',
                                        display: 'block',
                                        marginTop: '5px',
                                    }}
                                />
                                <small
                                    style={{
                                        display: 'block',
                                        marginTop: '10px',
                                    }}
                                >
                                    {t('checkerInvocation')}
                                </small>
                                <textarea
                                    className="selectable"
                                    readOnly
                                    value={props.case.result.checkerRun.command}
                                    style={{
                                        fontSize: '0.9em',
                                        height: '40px',
                                        width: '100%',
                                        display: 'block',
                                        marginTop: '5px',
                                    }}
                                />
                                <small
                                    style={{
                                        display: 'block',
                                        marginTop: '10px',
                                    }}
                                >
                                    {t('checkerDuration')}{' '}
                                    {props.case.result.checkerRun.code === null
                                        ? 'Terminated'
                                        : `${props.case.result.checkerRun.time}ms`}
                                </small>
                            </div>
                        </details>
                    )}
                    {result != null &&
                        !result.pass &&
                        result.diff != null &&
                        (window as any).showOutputDifference !== false && (
                            <DiffView
                                diff={result.diff}
                                copyToClipboard={copyToClipboard}
                            />
                        )}
                    {stderror && stderror.length > 0 && (
                        <div className="textarea-container">
                            {t('standardError')}
                            <TextareaAutosize
                                className="selectable stderror-textarea"
                                value={trunctateStdout(stderror)}
                                readOnly
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function DiffView({
    diff,
    copyToClipboard,
}: {
    diff: DiffResult;
    copyToClipboard: (text: string) => void;
}) {
    if (diff.isMatch) {
        return null;
    }

    // Plain text version for clipboard (actual received output)
    const plainText = diff.tokenDiff
        .filter((t) => t.status !== 'missing')
        .map((t) => t.token)
        .join('');

    return (
        <div className="textarea-container">
            {t('outputDifference')}
            <div style={{ display: 'inline-flex', gap: '6px', float: 'right' }}>
                <div
                    className="clipboard"
                    onClick={() => copyToClipboard(plainText)}
                    title={t('copiedToClipboard')}
                >
                    {t('copy')}
                </div>
            </div>
            <div style={{ clear: 'both' }} />
            <div
                className="selectable received-textarea"
                style={{
                    padding: '6px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {diff.tokenDiff.map((t, idx) => (
                    <TokenChip key={idx} token={t} />
                ))}
            </div>
        </div>
    );
}

function TokenChip({ token }: { token: TokenDiff }) {
    if (token.token === '\n') {
        return <br />;
    }

    if (token.status === 'match') {
        return <span>{token.token}</span>;
    }

    if (token.status === 'extra') {
        return (
            <span
                style={{
                    backgroundColor:
                        'var(--vscode-diffEditor-insertedTextBackground)',
                    borderRadius: '3px',
                    padding: '1px 3px',
                }}
            >
                {token.token}
            </span>
        );
    }

    // missing — in expected but not received
    return (
        <span
            style={{
                backgroundColor:
                    'var(--vscode-diffEditor-removedTextBackground)',
                textDecoration: 'line-through',
                borderRadius: '3px',
                padding: '1px 3px',
            }}
        >
            {token.token}
        </span>
    );
}

const trunctateStdout = (stdout: string): string => {
    if (stdout.length > 100000) {
        stdout = '[Truncated]\n' + stdout.substr(0, 100000);
    }
    return stdout;
};
