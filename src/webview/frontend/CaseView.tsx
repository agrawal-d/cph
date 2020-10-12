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
    doFocus?: boolean;
    forceRunning: boolean;
}) {
    const { id, result } = props.case;

    const [input, setInput] = useState<string>(props.case.testcase.input);
    const [output, setOutput] = useState<string>(props.case.testcase.output);
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

    useEffect(() => {
        if (props.case.result !== null) {
            setRunning(false);
            props.case.result.pass ? setMinimized(true) : setMinimized(false);
        }
    }, [props.case.result]);

    useEffect(() => {
        if (running === true) {
            setMinimized(true);
        }
    }, [running]);

    let resultText = '';
    let stderror = result?.stderr;
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
                <div className="left" onClick={toggle}>
                    <div className="case-number left">Testcase {props.num}</div>
                    {running && <span className="running-text">Running</span>}
                    {result && !running && (
                        <div className="result-data left">
                            <span
                                className={
                                    result.pass ? 'result-pass' : 'result-fail'
                                }
                            >
                                {result.pass ? 'Passed' : 'Failed'}
                            </span>
                            <span className="exec-time">{timeText}</span>
                        </div>
                    )}
                    <div className="clearfix"></div>
                </div>
                <div className="right time">
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
                    {minimized && (
                        <button
                            className="btn btn-w80"
                            onClick={expand}
                            title="Expand"
                        >
                            [+]
                        </button>
                    )}
                    {!minimized && (
                        <button
                            className="btn btn-w80"
                            onClick={minimize}
                            title="Minimize"
                        >
                            [-]
                        </button>
                    )}
                </div>
                <div className="clearfix"></div>
            </div>
            {!minimized && (
                <>
                    Input:
                    <TextareaAutosize
                        className="selectable input-textarea"
                        onChange={handleInputChange}
                        value={input}
                        ref={inputBox}
                        autoFocus={props.doFocus}
                    />
                    Expected Output:
                    <TextareaAutosize
                        className="selectable expected-textarea"
                        onChange={handleOutputChange}
                        value={output}
                    />
                    Received Output:
                    <TextareaAutosize
                        className="selectable received-textarea"
                        value={trunctateStdout(resultText)}
                        readOnly
                    />
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
