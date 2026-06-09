import http from 'http';
import config from './config';
import { Problem, CphSubmitResponse, CphEmptyResponse } from './types';
import { saveProblem, getProbSaveLocation } from './parser';
import * as vscode from 'vscode';
import path from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { isCodeforcesUrl, isLuoguUrl, isAtCoderUrl, randomId } from './utils';
import {
    getDefaultLangPref,
    getLanguageId,
    useShortCodeForcesName,
    useShortLuoguName,
    useShortAtCoderName,
    getMenuChoices,
    getDefaultLanguageTemplateFileLocation,
    includeProblemIndex,
    wordRegex,
    doTemplateFileVariableReplacement,
} from './preferences';
import { getProblemName } from './submit';
import { spawn } from 'child_process';
import { getJudgeViewProvider } from './extension';
import { words_in_text, toPascalCase } from './utilsPure';
import telmetry from './telmetry';
import os from 'os';
import localize from './i18n';

const emptyResponse: CphEmptyResponse = { empty: true };
let savedResponse: CphEmptyResponse | CphSubmitResponse = emptyResponse;
const COMPANION_LOGGING = false;

export const submitKattisProblem = (problem: Problem) => {
    globalThis.reporter.sendTelemetryEvent(telmetry.SUBMIT_TO_KATTIS);
    const srcPath = problem.srcPath;
    const homedir = os.homedir();
    const directoryChar = process.platform == 'win32' ? '\\' : '/';
    const submitPath = `${homedir}${directoryChar}.kattis${directoryChar}submit.py`;

    if (
        !existsSync(
            `${homedir}${directoryChar}.kattis${directoryChar}.kattisrc`,
        ) ||
        !existsSync(
            `${homedir}${directoryChar}.kattis${directoryChar}submit.py`,
        )
    ) {
        vscode.window.showErrorMessage(
            localize(
                'cph.companion.kattisError',
                'Please ensure .kattisrc and submit.py are present in {0}',
                `${homedir}${directoryChar}.kattis${directoryChar}`,
            ),
        );
        return;
    }

    const pyshell = spawn('python', [submitPath, '-f', srcPath]);

    //tells the python script to open submission window in new tab
    pyshell.stdin.setDefaultEncoding('utf-8');
    pyshell.stdin.write('Y\n');
    pyshell.stdin.end();

    pyshell.stdout.on('data', function (data) {
        globalThis.logger.log(data.toString());
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem,
        });
        ({ command: 'submit-finished' });
    });
    pyshell.stderr.on('data', function (data) {
        globalThis.logger.log(data.tostring());
        vscode.window.showErrorMessage(data);
    });
};

/** Stores a response to be submitted to CF page soon. */
export const storeSubmitProblem = (problem: Problem) => {
    const srcPath = problem.srcPath;
    const problemName = getProblemName(problem.url);
    const sourceCode = readFileSync(srcPath).toString();
    const languageId = getLanguageId(problem.srcPath);
    savedResponse = {
        empty: false,
        url: problem.url,
        problemName,
        sourceCode,
        languageId,
    };
    globalThis.reporter.sendTelemetryEvent(telmetry.SUBMIT_TO_CODEFORCES);
    globalThis.logger.log('Stored savedResponse', savedResponse);
};

export const setupCompanionServer = () => {
    try {
        const server = http.createServer((req, res) => {
            const { headers } = req;
            let rawProblem = '';

            req.on('data', (chunk) => {
                COMPANION_LOGGING &&
                    globalThis.logger.log('Companion server got data');
                rawProblem += chunk;
            });
            req.on('close', function () {
                try {
                    if (rawProblem == '') {
                        return;
                    }
                    const problem: Problem = JSON.parse(rawProblem);
                    handleNewProblem(problem);
                    COMPANION_LOGGING &&
                        globalThis.logger.log(
                            'Companion server closed connection.',
                        );
                } catch (e) {
                    vscode.window.showErrorMessage(
                        localize(
                            'cph.companion.parseError',
                            'Error parsing problem from companion {0}. Raw problem: {1}',
                            String(e),
                            rawProblem,
                        ),
                    );
                }
            });
            res.write(JSON.stringify(savedResponse));
            if (headers['cph-submit'] == 'true') {
                COMPANION_LOGGING &&
                    globalThis.logger.log(
                        'Request was from the cph-submit extension; sending savedResponse and clearing it',
                        savedResponse,
                    );

                if (savedResponse.empty != true) {
                    getJudgeViewProvider().extensionToJudgeViewMessage({
                        command: 'submit-finished',
                    });
                }
                savedResponse = emptyResponse;
            }
            res.end();
        });
        server.listen(config.port);
        server.on('error', (err) => {
            vscode.window.showErrorMessage(
                localize(
                    'cph.companion.serverError',
                    'Are multiple VSCode windows open? CPH will work on the first opened window. CPH server encountered an error: {0}, companion may not work.',
                    err.message,
                ),
            );
        });
        globalThis.logger.log(
            'Companion server listening on port',
            config.port,
        );
        return server;
    } catch (e) {
        globalThis.logger.error('Companion server error :', e);
    }
};

export const getProblemFileName = (problem: Problem, ext: string) => {
    if (!includeProblemIndex()) {
        const sections = problem.name.split(' - ');
        if (sections.length > 1) {
            problem.name = sections.splice(1).join();
        }
    }
    if (isCodeforcesUrl(new URL(problem.url)) && useShortCodeForcesName()) {
        return `${getProblemName(problem.url)}.${ext}`;
    } else if (isLuoguUrl(new URL(problem.url)) && useShortLuoguName()) {
        // Url is like https://www.luogu.com.cn/problem/P1000
        const pattern = /problem\/(\w+)/;
        const match = problem.url.match(pattern);
        return `${match?.[1] ?? ''}.${ext}`;
    } else if (isAtCoderUrl(new URL(problem.url)) && useShortAtCoderName()) {
        // Url is like https://atcoder.jp/contests/abc311/tasks/abc311_a
        const pattern = /tasks\/(\w+)_(\w+)/;
        const match = problem.url.match(pattern);
        return `${match?.[1] ?? ''}${match?.[2] ?? ''}.${ext}`;
    } else {
        globalThis.logger.log(
            isCodeforcesUrl(new URL(problem.url)),
            useShortCodeForcesName(),
        );

        const words = words_in_text(problem.name, wordRegex());
        let baseName: string;
        if (words === null) {
            baseName = problem.name.replace(/\W+/g, '_');
        } else {
            baseName = words.join('_');
        }

        // For Java, use PascalCase without underscores
        if (ext === 'java') {
            baseName = toPascalCase(baseName);
        }

        return `${baseName}.${ext}`;
    }
};

/** Derives a short contest+problem prefix from a URL to avoid filename collisions.
 *  e.g. https://codeforces.com/problemset/problem/96/A  -> "96A"
 *       https://codeforces.com/contest/123/problem/B    -> "123B"
 *       https://atcoder.jp/contests/abc311/tasks/abc311_a -> "abc311a"
 */
const getContestPrefix = (url: string): string => {
    // Codeforces: /problemset/problem/96/A  or  /contest/123/problem/B
    const cfMatch = url.match(
        /(?:contest|problem)\/(\d+)\/(?:problem\/)?(\w+)/,
    );
    if (cfMatch) {
        return `${cfMatch[1]}${cfMatch[2]}`;
    }
    // AtCoder: /tasks/abc311_a
    const acMatch = url.match(/tasks\/(\w+)_(\w+)/);
    if (acMatch) {
        return `${acMatch[1]}${acMatch[2]}`;
    }
    // Luogu: /problem/P1000
    const lgMatch = url.match(/problem\/(\w+)/);
    if (lgMatch) {
        return lgMatch[1];
    }
    try {
        return new URL(url).hostname.replace(/\W+/g, '_');
    } catch {
        return 'unknown';
    }
};

/** Handle the `problem` sent by Competitive Companion, such as showing the webview, opening an editor, managing layout etc. */
const handleNewProblem = async (problem: Problem) => {
    globalThis.reporter.sendTelemetryEvent(telmetry.GET_PROBLEM_FROM_COMPANION);
    // If webview may be focused, close it, to prevent layout bug.
    if (vscode.window.activeTextEditor == undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
        });
    }
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folder === undefined) {
        vscode.window.showInformationMessage(
            localize('cph.companion.openFolder', 'Please open a folder first.'),
        );
        return;
    }
    const defaultLanguage = getDefaultLangPref();
    let extn: string;

    if (defaultLanguage == null) {
        const allChoices = new Set(Object.keys(config.extensions));
        const userChoices = getMenuChoices();
        const choices = userChoices.filter((x) => allChoices.has(x));
        const selected = await vscode.window.showQuickPick(choices);
        if (!selected) {
            vscode.window.showInformationMessage(
                localize(
                    'cph.companion.aborted',
                    'Aborted creation of new file',
                ),
            );
            return;
        }
        // @ts-ignore
        extn = config.extensions[selected];
    } else {
        //@ts-ignore
        extn = config.extensions[defaultLanguage];
    }
    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        return null;
    }
    if (url.hostname == 'open.kattis.com') {
        const splitUrl = problem.url.split('/');
        problem.name = splitUrl[splitUrl.length - 1];
    }
    let problemFileName = getProblemFileName(problem, extn);
    let srcPath = path.join(folder, problemFileName);

    // If a file with this name already exists but belongs to a *different*
    // problem (different URL), prefix with the contest ID to avoid collision.
    if (existsSync(srcPath)) {
        const existingProbPath = getProbSaveLocation(srcPath);
        let existingUrl: string | null = null;
        try {
            const existingProb: Problem = JSON.parse(
                readFileSync(existingProbPath).toString(),
            );
            existingUrl = existingProb.url;
        } catch (_) {
            // No .prob file — file was created manually, leave it alone.
        }
        if (existingUrl !== null && existingUrl !== problem.url) {
            const contestPrefix = getContestPrefix(problem.url);
            problemFileName = `${contestPrefix}_${problemFileName}`;
            srcPath = path.join(folder, problemFileName);
        }
    }

    // Add fields absent in competitive companion.
    problem.srcPath = srcPath;
    problem.tests = problem.tests.map((testcase, index) => ({
        ...testcase,
        // Pass in index to avoid generating duplicate id
        id: randomId(index),
    }));

    if (!existsSync(srcPath)) {
        writeFileSync(srcPath, '');

        if (defaultLanguage) {
            const templateLocation = getDefaultLanguageTemplateFileLocation();
            if (templateLocation !== null) {
                const templateExists = existsSync(templateLocation);
                if (!templateExists) {
                    vscode.window.showErrorMessage(
                        localize(
                            'cph.companion.templateMissing',
                            'Template file does not exist: {0}',
                            templateLocation,
                        ),
                    );
                } else {
                    let templateContents =
                        readFileSync(templateLocation).toString();

                    if (extn == 'java') {
                        const className = path.basename(
                            problemFileName,
                            '.java',
                        );
                        templateContents = templateContents.replace(
                            'CLASS_NAME',
                            className,
                        );
                    }
                    if (doTemplateFileVariableReplacement()) {
                        const now = new Date();
                        const pad2 = (value: number) =>
                            value.toString().padStart(2, '0');
                        const date = `${now.getFullYear()}-${pad2(
                            now.getMonth() + 1,
                        )}-${pad2(now.getDate())}`;
                        const time = `${pad2(now.getHours())}:${pad2(
                            now.getMinutes(),
                        )}:${pad2(now.getSeconds())}`;
                        const templateVariables: Record<string, unknown> = {
                            ...problem,
                            date,
                            time,
                        };

                        for (const [key, value] of Object.entries(
                            templateVariables,
                        )) {
                            let replaceWith = JSON.stringify(value);
                            replaceWith = replaceWith.substring(
                                1,
                                replaceWith.length - 1,
                            );
                            templateContents = templateContents.replace(
                                `$${key}$`,
                                replaceWith,
                            );
                        }
                    }
                    writeFileSync(srcPath, templateContents);
                }
            }
        }
    }

    saveProblem(srcPath, problem);
    const doc = await vscode.workspace.openTextDocument(srcPath);

    const editor = await vscode.window.showTextDocument(
        doc,
        vscode.ViewColumn.One,
    );

    // Move cursor to the first occurrence of $CURSOR_PLACEHOLDER and remove it
    const cursorPlaceholder = '$CURSOR_PLACEHOLDER';
    const text = doc.getText();
    const index = text.indexOf(cursorPlaceholder);
    if (index !== -1) {
        const start = doc.positionAt(index);
        const end = doc.positionAt(index + cursorPlaceholder.length);
        await editor.edit((editBuilder) => {
            editBuilder.delete(new vscode.Range(start, end));
        });
        // Set selection and reveal AFTER the edit so it isn't reset
        editor.selection = new vscode.Selection(start, start);
        editor.revealRange(
            new vscode.Range(start, start),
            vscode.TextEditorRevealType.InCenter,
        );
    }

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem,
    });
};
