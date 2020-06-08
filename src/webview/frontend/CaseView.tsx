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

    const [input, useInput] = useState<string>(props.case.testcase.input);
    const [output, useOutput] = useState<string>(props.case.testcase.output);
    const [running, useRuning] = useState<boolean>(false);
    const [minimized, useMinimized] = useState<boolean>(
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
            useRuning(true);
        }
    }, [props.forceRunning]);

    const handleInputChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        useInput(event.target.value);
    };

    const handleOutputChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        useOutput(event.target.value);
    };

    const rerun = () => {
        useRuning(true);
        props.rerun(id, input, output);
    };

    const expand = () => {
        useMinimized(false);
    };

    const minimize = () => {
        useMinimized(true);
    };

    useEffect(() => {
        if (props.case.result !== null) {
            useRuning(false);
            props.case.result.pass ? useMinimized(true) : useMinimized(false);
        }
    }, [props.case.result]);

    useEffect(() => {
        if (running === true) {
            useMinimized(true);
        }
    }, [running]);

    let resultText;
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
                <div className="left">
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
                            className="btn w80"
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
                        value={resultText}
                        readOnly
                    />
                </>
            )}
        </div>
    );
}
