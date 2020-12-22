import { Problem, RunResult } from '../types';
import { getLanguage } from '../utils';
import { getBinSaveLocation, compileFile } from '../compiler';
import { saveProblem } from '../parser';
import { runTestCase, deleteBinary } from '../executions';
import { isResultCorrect } from '../judge';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from '../extension';
import sendTelemetryEvent from '../telemetery';

export const runSingleAndSave = async (
    problem: Problem,
    id: number,
    skipCompile = false,
) => {
    console.log('Run and save started', problem, id);
    sendTelemetryEvent('run-single');
    const srcPath = problem.srcPath;
    const language = getLanguage(srcPath);
    const binPath = getBinSaveLocation(srcPath);
    const idx = problem.tests.findIndex((value) => value.id === id);
    const testCase = problem.tests[idx];

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    if (!testCase) {
        console.error('Invalid id', id, problem);
        return;
    }

    saveProblem(srcPath, problem);

    if (!skipCompile) {
        if (!(await compileFile(srcPath))) {
            console.error('Failed to compile', problem, id);
            return;
        }
    }

    const run = await runTestCase(language, binPath, testCase.input);

    if (!skipCompile) {
        deleteBinary(language, binPath);
    }

    const didError =
        (run.code !== null && run.code !== 0) ||
        run.signal !== null ||
        run.stderr !== '';
    const result: RunResult = {
        ...run,
        pass: didError ? false : isResultCorrect(testCase, run.stdout),
        id,
    };

    console.log('Testcase judging complete. Result:', result);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'run-single-result',
        result,
        problem,
    });
};
