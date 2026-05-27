import { Problem, RunResult } from '../types';
import { getLanguage } from '../utils';
import { getBinSaveLocation, compileFile } from '../compiler';
import { saveProblem } from '../parser';
import { runTestCase, deleteBinary, runCustomChecker } from '../executions';
import { isResultCorrect } from '../judge';
import { diffOutput } from '../utils/diffOutput';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from '../extension';
import { getIgnoreSTDERRORPref } from '../preferences';
import telmetry from '../telmetry';
import * as fs from 'fs';
import localize from '../i18n';

export const runSingleAndSave = async (
    problem: Problem,
    id: number,
    skipCompile = false,
    skipTelemetry = false,
) => {
    if (!skipTelemetry) {
        globalThis.reporter.sendTelemetryEvent(telmetry.RUN_TESTCASE);
    }
    globalThis.logger.log('Run and save started', problem, id);
    const srcPath = problem.srcPath;
    const language = getLanguage(srcPath);
    const binPath = getBinSaveLocation(srcPath);
    const idx = problem.tests.findIndex((value) => value.id === id);
    const testCase = problem.tests[idx];

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    if (!testCase) {
        globalThis.logger.error('Invalid id', id, problem);
        return;
    }

    saveProblem(srcPath, problem);

    if (!skipCompile) {
        if (!(await compileFile(srcPath))) {
            globalThis.logger.error('Failed to compile', problem, id);
            return;
        }
    }

    const run = await runTestCase(language, binPath, testCase.input);

    if (!skipCompile) {
        deleteBinary(language, binPath);
    }

    const stderrorFailure = getIgnoreSTDERRORPref() ? false : run.stderr !== '';

    const didError =
        (run.code !== null && run.code !== 0) ||
        run.signal !== null ||
        stderrorFailure;

    let pass: boolean | null = null;
    let checkerRun: any = undefined;

    if (didError) {
        pass = false;
    } else if (
        problem.customCheckerPath &&
        problem.customCheckerPath.trim() !== ''
    ) {
        const checkerPath = problem.customCheckerPath.trim();
        if (fs.existsSync(checkerPath)) {
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'checking',
                id,
                problem,
            });
            checkerRun = await runCustomChecker(
                checkerPath,
                testCase.input,
                run.stdout,
            );
            pass = checkerRun.code === 0;
        } else {
            vscode.window.showErrorMessage(
                localize(
                    'cph.processRunSingle.invalidChecker',
                    "Custom checker script not found at '{0}'",
                    checkerPath,
                ),
            );
            pass = false;
        }
    } else {
        pass = isResultCorrect(testCase, run.stdout);
    }

    const result: RunResult = {
        ...run,
        pass,
        checkerRun,
        diff:
            didError ||
            (problem.customCheckerPath &&
                problem.customCheckerPath.trim() !== '')
                ? undefined
                : diffOutput(testCase.output, run.stdout),
        id,
    };

    globalThis.logger.log('Testcase judging complete. Result:', result);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'run-single-result',
        result,
        problem,
    });
};
