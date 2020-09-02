import http from 'http';
import config from '../config';
import { Problem, CphSubmitResponse, CphEmptyResponse } from '../types';
import { saveProblem } from '../parser';
import * as vscode from 'vscode';
import path from 'path';
import { writeFileSync, readFileSync } from 'fs';
import {
    startWebVeiwIfNotActive,
    setBaseWebViewHTML,
    extensionToWebWiewMessage,
} from '../webview';
import { randomId } from '../utils';
import {
    getDefaultLangPref,
    getLanguageId,
    getTemplatePathPref,
} from '../preferences';
import { getProblemName } from './submit';

const emptyResponse: CphEmptyResponse = { empty: true };
let savedResponse: CphEmptyResponse | CphSubmitResponse = emptyResponse;

/** Stores a response to be submitted to CF page soon. */
export const storeSubmitProblem = (problem: Problem) => {
    const srcPath = problem.srcPath;
    const problemName = getProblemName(problem.url);
    const sourceCode = readFileSync(srcPath).toString();
    const languageId = getLanguageId(problem.srcPath);

    savedResponse = {
        empty: false,
        problemName,
        sourceCode,
        languageId,
    };

    console.log('Stored savedResponse', savedResponse);
};

export const setupCompanionServer = () => {
    try {
        const server = http.createServer((req, res) => {
            const { headers } = req;
            let rawProblem = '';

            req.on('readable', function () {
                console.log('Companion server got data');
                const tmp = req.read();
                if (tmp && tmp != null && tmp.length > 0) {
                    rawProblem += tmp;
                }
            });
            req.on('close', function () {
                const problem: Problem = JSON.parse(rawProblem);
                handleNewProblem(problem);
                console.log('Companion server closed connection.');
            });
            res.write(JSON.stringify(savedResponse));
            if (headers['cph-submit'] == 'true') {
                console.log(
                    'Request was from the cph-submit extension; sending savedResponse and clearing it',
                    savedResponse,
                );
                savedResponse = emptyResponse;
                extensionToWebWiewMessage({
                    command: 'submit-finished',
                });
            }
            res.end();
        });
        server.listen(config.port);
        console.log('Companion server listening on port', config.port);
        return server;
    } catch (e) {
        console.error('Companion server error :', e);
    }
};

export const getProblemFileName = (name: string, ext: string) => {
    return `${name.replace(/\W+/g, '_')}.${ext}`;
};

const handleNewProblem = async (problem: Problem) => {
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folder === undefined) {
        vscode.window.showInformationMessage('Please open a folder first.');
        return;
    }
    const defaultLanguage = getDefaultLangPref();
    let problemFileName: string;
    if (defaultLanguage == null) {
        const choices = Object.keys(config.extensions);
        const selected = await vscode.window.showQuickPick(choices);
        if (!selected) {
            vscode.window.showInformationMessage(
                'Aborted creation of new file',
            );
            return;
        }
        // @ts-ignore
        const extn: string = config.extensions[selected];
        console.log(config.extensions, extn, selected);
        problemFileName = getProblemFileName(problem.name, extn);
    } else {
        //@ts-ignore
        const extn: string = config.extensions[defaultLanguage];
        problemFileName = getProblemFileName(problem.name, extn);
    }
    const srcPath = path.join(folder, problemFileName);

    // Add fields absent in competitive companion.
    problem.srcPath = srcPath;
    problem.tests = problem.tests.map((testcase) => ({
        ...testcase,
        id: randomId(),
    }));

    let code_template = '';
    try {
        code_template = readFileSync(getTemplatePathPref().toString(), {
            encoding: 'utf8',
        });
    } catch (e) {
        if (getTemplatePathPref().toString().length > 0) {
            vscode.window.showErrorMessage(
                'The code template file does not exist in the specified path',
            );
        }
    }

    writeFileSync(srcPath, code_template);
    saveProblem(srcPath, problem);
    const doc = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await startWebVeiwIfNotActive();
    await setBaseWebViewHTML(global.context, problem);
};
