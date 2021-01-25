import { Case } from '../../types';
import { useState, createRef, useEffect } from 'react';
import TextareaAutosize from 'react-autosize-textarea/lib';
import React from 'react';

const reloadIcon = '↺';
const deleteIcon = '⨯';

export default function CaseView(props: {
    num: number;
    case: Case;
    rerun: (id: number, input: string, output: string) => void;
    updateCase: (id: number, input: string, output: string) => void;
    remove: (num: number) => void;
    notify: (text: string) => void;
    doFocus?: boolean;
    forceRunning: boolean;
}) {
    const { id, result } = props.case;

    const [input, setInput] = useState<string>(
        props.case.testcase.input.trim(),
    );
    const [output, setOutput] = useState<string>(
        props.case.testcase.output.trim(),
    );
    const [running, setRunning] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(
        props.case.result?.pass === true,
    );
    const inputBox = createRef<HTMLTextAreaElement>();

    useEffect(() => {
        if (props.doFocus) {
            console.log('Scrolling', inputBox.current);
            inputBox.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [props.doFocus]);

    useEffect(() => {
        props.updateCase(props.case.id, input, output);
    }, [input, output]);

    useEffect(() => {
        if (props.forceRunning) {
            console.log('Case was forced to run!');
            setRunning(true);
        }
    }, [props.forceRunning]);

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
        console.log('Copied', text);
        props.notify('✅ Copied to clipboard');
    };

    useEffect(() => {
        if (props.case.result !== null) {
            setRunning(false);
            props.case.result.pass ? setMinimized(true) : setMinimized(false);
            console.log('minimizing', props.case.id, props.case.result);
        }
    }, [props.case.result]);

    useEffect(() => {
        if (running) {
            setMinimized(true);
        }
    }, [running]);

    let resultText = '';
    const stderror = result?.stderr;
    // Handle several cases for result text
    if (result?.signal) {
        resultText = result?.signal;
    } else if (result?.stdout) {
        resultText = result.stdout.trim() || ' ';
    }
    if (!result) {
        resultText = 'Run to show output';
    }
    if (running) {
        resultText = '...';
    }
    const passFailText = result ? (result.pass ? 'passed' : 'failed') : '';
    const caseClassName = 'case ' + (running ? 'running' : passFailText);
    const timeText = result?.timeOut ? 'Timed Out' : result?.time + 'ms';

    return (
        <div className={caseClassName}>
            <div className="case-metadata">
                <div className="toggle-minimize" onClick={toggle}>
                    <span className="case-number case-title">
                        {minimized && (
                            <span onClick={expand} title="Expand">
                                [+]
                            </span>
                        )}
                        {!minimized && (
                            <span onClick={minimize} title="Minimize">
                                [-]
                            </span>
                        )}
                        &nbsp;Testcase {props.num}
                    </span>
                    {running && <span className="running-text">Running</span>}
                    {result && !running && (
                        <span className="result-data">
                            <span
                                className={
                                    result.pass ? 'result-pass' : 'result-fail'
                                }
                            >
                                {result.pass ? 'Passed' : 'Failed'}
                            </span>
                            <span className="exec-time">{timeText}</span>
                        </span>
                    )}
                </div>
                <div className="time">
                    <button
                        className="btn btn-green"
                        title="Run Again"
                        onClick={rerun}
                        disabled={running}
                    >
                        {reloadIcon}
                    </button>
                    <button
                        className="btn btn-red"
                        title="Delete Testcase"
                        onClick={() => {
                            props.remove(id);
                        }}
                    >
                        {deleteIcon}
                    </button>
                </div>
            </div>
            {!minimized && (
                <>
                    <div className="textarea-container">
                        Input:
                        <div
                            className="clipboard"
                            onClick={() => {
                                copyToClipboard(input);
                            }}
                            title="Copy to clipboard"
                        >
                            Copy
                        </div>
                        <TextareaAutosize
                            className="selectable input-textarea"
                            onChange={handleInputChange}
                            value={input}
                            ref={inputBox}
                            autoFocus={props.doFocus}
                        />
                    </div>
                    <div className="textarea-container">
                        Expected Output:
                        <div
                            className="clipboard"
                            onClick={() => {
                                copyToClipboard(output);
                            }}
                            title="Copy to clipboard"
                        >
                            Copy
                        </div>
                        <TextareaAutosize
                            className="selectable expected-textarea"
                            onChange={handleOutputChange}
                            value={output}
                        />
                    </div>
                    {props.case.result != null && (
                        <div className="textarea-container">
                            Received Output:
                            <div
                                className="clipboard"
                                onClick={() => {
                                    copyToClipboard(resultText);
                                }}
                                title="Copy to clipboard"
                            >
                                Copy
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
                    {stderror && stderror.length > 0 && (
                        <>
                            Standard Error:
                            <TextareaAutosize
                                className="selectable stderror-textarea"
                                value={trunctateStdout(stderror)}
                                readOnly
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

/** Limit string length to 100,000. */
const trunctateStdout = (stdout: string): string => {
    if (stdout.length > 100000) {
        stdout = '[Truncated]\n' + stdout.substr(0, 100000);
    }
    return stdout;
};
