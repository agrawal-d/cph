import http from 'http';
import config from './config';
import { Problem, CphSubmitResponse, CphEmptyResponse } from './types';
import { saveProblem } from './parser';
import * as vscode from 'vscode';
import path from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
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

// 新增：获取题目编号的函数
const getProblemIdFromUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        
        if (isLuoguUrl(urlObj)) {
            // 洛谷URL格式：https://www.luogu.com.cn/problem/P1000
            const match = url.match(/problem\/(P\d+)/);
            return match ? match[1] : null;
        } else if (isAtCoderUrl(urlObj)) {
            // AtCoder URL格式：https://atcoder.jp/contests/abc311/tasks/abc311_a
            const match = url.match(/tasks\/(.+)/);
            return match ? match[1] : null;
        } else if (isCodeforcesUrl(urlObj)) {
            // Codeforces URL格式：https://codeforces.com/problemset/problem/1145/A
            // 或者：https://codeforces.com/contest/1145/problem/A
            let match = url.match(/problemset\/problem\/(\d+)\/(\w+)/);
            if (match) {
                return `CF${match[1]}${match[2]}`;
            }
            match = url.match(/contest\/(\d+)\/problem\/(\w+)/);
            if (match) {
                return `CF${match[1]}${match[2]}`;
            }
        }
    } catch (e) {
        globalThis.logger.error('Error parsing URL:', e);
    }
    return null;
};

// 新增：获取分类文件夹的函数（针对洛谷）
const getLuoguCategory = (problemId: string): string => {
    const numMatch = problemId.match(/P(\d+)/);
    if (!numMatch) return 'P12001+';
    
    const num = parseInt(numMatch[1]);
    if (num <= 3000) return 'P1000-P3000';
    if (num <= 6000) return 'P3001-P6000';
    if (num <= 9000) return 'P6001-P9000';
    if (num <= 12000) return 'P9001-P12000';
    return 'P12001+';
};

// 修改：获取问题文件路径
export const getProblemFileName = (problem: Problem, ext: string) => {
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    const isOICodes = folder && path.basename(folder) === 'OI-Codes';
    
    if (!isOICodes) {
        // 保持原有逻辑
        if (isCodeforcesUrl(new URL(problem.url)) && useShortCodeForcesName()) {
            return `${getProblemName(problem.url)}.${ext}`;
        } else if (isLuoguUrl(new URL(problem.url)) && useShortLuoguName()) {
            const pattern = /problem\/(\w+)/;
            const match = problem.url.match(pattern);
            return `${match?.[1] ?? ''}.${ext}`;
        } else if (isAtCoderUrl(new URL(problem.url)) && useShortAtCoderName()) {
            const pattern = /tasks\/(\w+)_(\w+)/;
            const match = problem.url.match(pattern);
            return `${match?.[1] ?? ''}${match?.[2] ?? ''}.${ext}`;
        } else {
            const words = words_in_text(problem.name);
            if (words === null) {
                return `${problem.name.replace(/\W+/g, '_')}.${ext}`;
            } else {
                return `${words.join('_')}.${ext}`;
            }
        }

        return `${baseName}.${ext}`;
    }

    // OI-Codes 文件夹下的新逻辑
    const problemId = getProblemIdFromUrl(problem.url);
    
    if (isLuoguUrl(new URL(problem.url)) && problemId) {
        const category = getLuoguCategory(problemId);
        return `Luogu/${category}/${problemId}/${problemId}.${ext}`;
    } else if (isAtCoderUrl(new URL(problem.url)) && problemId) {
        return `ATCoder/${problemId}/${problemId}.${ext}`;
    } else if (isCodeforcesUrl(new URL(problem.url)) && problemId) {
        return `Codeforces/${problemId}/${problemId}.${ext}`;
    } else {
        // 其他题目
        const nameWithUnderscores = problem.name.replace(/\s+/g, '_');
        const originName = (() => {
            // 使用原有的文件名生成逻辑
            if (isCodeforcesUrl(new URL(problem.url)) && useShortCodeForcesName()) {
                return `${getProblemName(problem.url)}.${ext}`;
            } else if (isLuoguUrl(new URL(problem.url)) && useShortLuoguName()) {
                const pattern = /problem\/(\w+)/;
                const match = problem.url.match(pattern);
                return `${match?.[1] ?? ''}.${ext}`;
            } else if (isAtCoderUrl(new URL(problem.url)) && useShortAtCoderName()) {
                const pattern = /tasks\/(\w+)_(\w+)/;
                const match = problem.url.match(pattern);
                return `${match?.[1] ?? ''}${match?.[2] ?? ''}.${ext}`;
            } else {
                const words = words_in_text(problem.name);
                if (words === null) {
                    return `${problem.name.replace(/\W+/g, '_')}.${ext}`;
                } else {
                    return `${words.join('_')}.${ext}`;
                }
            }
        })();
        
        const originNameWithoutExt = path.parse(originName).name;
        
        return `Other/${originNameWithoutExt}/${originName}`;
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
    
    const problemFileName = getProblemFileName(problem, extn);
    const srcPath = path.join(folder, problemFileName);

    // 确保目录存在
    const dir = path.dirname(srcPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
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
