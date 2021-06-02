import { Problem, RunResult } from '../types';
import { getLanguage } from '../utils';
import { getBinSaveLocation, compileFile } from '../compiler';
import { saveProblem } from '../parser';
import { runTestCase, deleteBinary } from '../executions';
import { isResultCorrect } from '../judge';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from '../extension';

import { writeFile, readFile, mkdir } from 'fs';
import * as customEnvironmentVariables from '../customEnvironmentVariables';
const homedir = require('os').homedir();

export const runSingleAndSave = async (
    problem: Problem,
    id: number,
    skipCompile = false,
) => {
    console.log('Run and save started', problem, id);
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

    //first get file name problem
    var filename = problem.name;
    //  problems having their group as local have "Local: " as prefix, so removing it
    if (problem.group == "local" && problem.name.slice(0, 7) == "Local: ") filename = problem.name.substr(7);

    if (problem.srcPath.slice(problem.srcPath.length - 2) == ".c") filename += '.c';
    else if (problem.srcPath.slice(problem.srcPath.length - 3) == ".py") filename += '.py';
    else if (problem.srcPath.slice(problem.srcPath.length - 4) == ".cpp") filename += '.cpp';
    else if (problem.srcPath.slice(problem.srcPath.length - 5) == ".java") filename += '.java';

    //  Now read contents of the source-file
    readFile(problem.srcPath, 'utf8', function (err: any, data: string) {
        if (err) {
            return console.log(err);
        }
        var file_contents = data;

        // get meta-data for the file
        var file_meta_data = "";
        file_meta_data += '/*\n';
        file_meta_data += '\tgroup : ' + problem.group + '\n';
        file_meta_data += '\tname : ' + filename + '\n';
        file_meta_data += '\tsrcPath : ' + problem.srcPath + '\n';
        file_meta_data += '\turl : ' + problem.url + '\n';
        file_meta_data += '*/\n';

        // add the meta-data in source-file's string
        file_contents = file_meta_data + file_contents;

        // create the required directory if it doesn't exists
        mkdir(customEnvironmentVariables.getArchiveFolderPath() + "/" + problem.group, { recursive: true }, (err: any) => {
            if (err) throw err;
        })

        // create the file in the required directory
        writeFile(customEnvironmentVariables.getArchiveFolderPath() + "/" + problem.group + '/' + filename, file_contents, (err: any) => {

            if (err) {
                // if there is some error in creating file in required directory, make file in the home-directory, also add the error message
                var error_message="";
                error_message+="//   there was some error in creating file in the directory "+customEnvironmentVariables.getArchiveFolderPath() + "/" + problem.group+"\n";
                error_message+="//   so creating the file in home directory "+homedir+"\n";
                file_contents=error_message+file_contents;
                
                writeFile(homedir +"/"+ filename, file_contents, (err: any) => {
                    if (err) throw err;
                })
            }
        })
    });

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
