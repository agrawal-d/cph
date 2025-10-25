import { Problem } from '../types';
import * as vscode from 'vscode';
import { runSingleAndSave } from './processRunSingle';
import { compileFile, getBinSaveLocation } from '../compiler';
import { deleteBinary } from '../executions';
import { getLanguage } from '../utils';
import { getJudgeViewProvider } from '../extension';

/**
 * Run every testcase in a problem one by one. Waits for the first to complete
 * before running next. `runSingleAndSave` takes care of saving.
 **/
export default async (problem: Problem) => {
    globalThis.logger.log('Run all started', problem);
    let srcPath = problem.srcPath;
    if (!srcPath) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            srcPath = editor.document.fileName;
        } else {
            globalThis.logger.error(
                `No srcPath available to run all testcases`,
            );
            return;
        }
    }

    // Narrowed after the guard above; create a const for type safety.
    const finalSrcPath: string = srcPath as string;

    const didCompile = await compileFile(finalSrcPath);
    if (!didCompile) {
        return;
    }
    for (const testCase of problem.tests) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'running',
            id: testCase.id,
            problem: problem,
        });
        await runSingleAndSave(problem, testCase.id, true, true);
    }
    globalThis.logger.log('Run all finished');
    deleteBinary(getLanguage(finalSrcPath), getBinSaveLocation(finalSrcPath));
};
