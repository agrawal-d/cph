import http from 'http';
import config from './config';
import { Problem, CphSubmitResponse, CphEmptyResponse } from './types';
import { saveProblem } from './parser';
import * as vscode from 'vscode';
import path from 'path';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
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
import { spawn, execSync } from 'child_process';
import { getJudgeViewProvider } from './extension';
import { words_in_text, toPascalCase } from './utilsPure';
import telmetry from './telmetry';
import os from 'os';
import localize from './i18n';

const emptyResponse: CphEmptyResponse = { empty: true };
let savedResponse: CphEmptyResponse | CphSubmitResponse = emptyResponse;
const COMPANION_LOGGING = false;
let submitServerFailed = false;

const cphUser = process.env.USER || 'user';
const cphSubmitFile = path.join(os.tmpdir(), `cph-submit-${cphUser}.json`);
const cphFinishedFile = path.join(os.tmpdir(), `cph-finished-${cphUser}.json`);
const cphIncomingFile = path.join(os.tmpdir(), `cph-incoming-${cphUser}.json`);

let isServerRunning = false;
let currentServer: http.Server | null = null;
let focusStatusBarItem: vscode.StatusBarItem | null = null;
let incomingWatcherInstalled = false;

export const setStatusBarItem = (item: vscode.StatusBarItem) => {
    focusStatusBarItem = item;
    updateStatusBar(isServerRunning);
};

export const updateStatusBar = (active: boolean) => {
    if (!focusStatusBarItem) {
        return;
    }
    if (active) {
        focusStatusBarItem.text = '$(radio-tower) CPH: Active';
        focusStatusBarItem.tooltip =
            'CPH companion server is running in this window (Port 27121). Click to re-focus.';
        focusStatusBarItem.backgroundColor = undefined;
    } else {
        focusStatusBarItem.text = '$(target) CPH: Focus Here';
        focusStatusBarItem.tooltip =
            'Click to focus CPH companion server on this window (Port 27121).';
        focusStatusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground',
        );
    }
    focusStatusBarItem.show();
};

export const focusServerHere = async (showNotice = true): Promise<boolean> => {
    globalThis.logger?.log('CPH: focusServerHere in pid ' + process.pid);
    if (isServerRunning && currentServer) {
        updateStatusBar(true);
        if (showNotice) {
            vscode.window.showInformationMessage(
                '🎯 CPH is already focused on this window (Port 27121 active).',
            );
        }
        return true;
    }

    try {
        await new Promise<void>((resolve) => {
            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port: config.port,
                    path: '/__release',
                    method: 'POST',
                    timeout: 250,
                },
                (res) => {
                    res.on('data', () => {});
                    res.on('end', () => resolve());
                },
            );
            req.on('error', () => resolve());
            req.on('timeout', () => {
                req.destroy();
                resolve();
            });
            req.end();
        });
    } catch (_) {
        // ignore
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (process.platform === 'linux') {
        try {
            execSync(`fuser -k ${config.port}/tcp 2>/dev/null || true`);
            await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (_) {
            // ignore
        }
    }

    return new Promise((resolve) => {
        try {
            if (currentServer) {
                currentServer.close();
                currentServer = null;
            }
            const srv = createServerInstance();
            srv.listen(config.port, () => {
                submitServerFailed = false;
                isServerRunning = true;
                currentServer = srv;
                updateStatusBar(true);
                globalThis.logger?.log('CPH: Successfully claimed port 27121.');
                try {
                    getJudgeViewProvider()?.extensionToJudgeViewMessage({
                        command: 'submit-server-ok',
                    });
                } catch (_) {
                    // ignore
                }
                if (showNotice) {
                    vscode.window.showInformationMessage(
                        '🎯 CPH is now focused on this window (Port 27121 active).',
                    );
                }
                resolve(true);
            });
            srv.on('error', (err: any) => {
                if (err && err.code === 'EADDRINUSE') {
                    submitServerFailed = false;
                    isServerRunning = false;
                    currentServer = null;
                    updateStatusBar(false);
                    if (showNotice) {
                        vscode.window.showErrorMessage(
                            'Port 27121 still busy. Please click Focus again.',
                        );
                    }
                    resolve(false);
                    return;
                }
                submitServerFailed = true;
                isServerRunning = false;
                currentServer = null;
                updateStatusBar(false);
                if (showNotice) {
                    vscode.window.showErrorMessage(
                        'Failed to focus CPH: ' + (err.message || err),
                    );
                }
                resolve(false);
            });
        } catch (err: any) {
            updateStatusBar(false);
            if (showNotice) {
                vscode.window.showErrorMessage(
                    'Failed to start CPH server: ' + (err.message || err),
                );
            }
            resolve(false);
        }
    });
};

function setupIncomingProblemWatcher() {
    if (incomingWatcherInstalled) {
        return;
    }
    incomingWatcherInstalled = true;
    try {
        vscode.window.onDidChangeWindowState((e) => {
            if (e && e.focused) {
                checkIncomingProblem();
            }
        });
    } catch (_) {
        // ignore
    }
    setInterval(checkIncomingProblem, 500);
}

function checkIncomingProblem() {
    try {
        if (vscode.window.state && !vscode.window.state.focused) {
            return;
        }
        if (existsSync(cphIncomingFile)) {
            const data = JSON.parse(readFileSync(cphIncomingFile).toString());
            if (data && data.problem && Date.now() - data.timestamp < 10000) {
                unlinkSync(cphIncomingFile);
                handleNewProblem(data.problem);
            }
        }
    } catch (_) {
        // ignore
    }
}

const createServerInstance = (): http.Server => {
    const server = http.createServer((req, res) => {
        const { headers } = req;
        if (req.url === '/__release') {
            globalThis.logger?.log('CPH: Yielding port 27121.');
            try {
                currentServer?.close();
            } catch (_) {
                // ignore
            }
            isServerRunning = false;
            currentServer = null;
            updateStatusBar(false);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('released');
            return;
        }

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
                if (vscode.window.state && vscode.window.state.focused) {
                    handleNewProblem(problem);
                } else {
                    try {
                        writeFileSync(
                            cphIncomingFile,
                            JSON.stringify({
                                problem,
                                timestamp: Date.now(),
                            }),
                        );
                        setTimeout(() => {
                            try {
                                if (existsSync(cphIncomingFile)) {
                                    unlinkSync(cphIncomingFile);
                                    handleNewProblem(problem);
                                }
                            } catch (_) {
                                // ignore
                            }
                        }, 700);
                    } catch (_) {
                        handleNewProblem(problem);
                    }
                }
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

        let payload: any = savedResponse;
        try {
            if (existsSync(cphSubmitFile)) {
                const content = JSON.parse(
                    readFileSync(cphSubmitFile).toString(),
                );
                if (content && !content.empty) {
                    payload = content;
                }
            }
        } catch (_) {
            // ignore
        }

        res.write(JSON.stringify(payload));
        if (headers['cph-submit'] == 'true' && !payload.empty) {
            try {
                getJudgeViewProvider()?.extensionToJudgeViewMessage({
                    command: 'submit-finished',
                });
            } catch (_) {
                // ignore
            }
            try {
                writeFileSync(
                    cphFinishedFile,
                    JSON.stringify({
                        finished: true,
                        timestamp: Date.now(),
                    }),
                );
                writeFileSync(cphSubmitFile, JSON.stringify(emptyResponse));
            } catch (_) {
                // ignore
            }
            savedResponse = emptyResponse;
        }
        res.end();
    });

    server.on('error', (err: any) => {
        if (err && err.code === 'EADDRINUSE') {
            submitServerFailed = false;
            isServerRunning = false;
            currentServer = null;
            updateStatusBar(false);
            globalThis.logger?.log(
                'CPH: Port 27121 in use by another window; standby mode.',
            );
            return;
        }
        submitServerFailed = true;
        isServerRunning = false;
        currentServer = null;
        updateStatusBar(false);
        globalThis.logger?.error('Companion server error:', err);
        try {
            getJudgeViewProvider()?.extensionToJudgeViewMessage({
                command: 'submit-server-failed',
                port: config.port,
            });
        } catch (_) {
            // ignore
        }
    });

    return server;
};

export const hasSubmitServerFailed = () => submitServerFailed;
export const setSubmitServerFailed = (val: boolean) => {
    submitServerFailed = val;
};

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
export const storeSubmitProblem = async (problem: Problem) => {
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

    if (!isServerRunning) {
        await focusServerHere(false);
    }

    try {
        writeFileSync(cphSubmitFile, JSON.stringify(savedResponse));
        try {
            if (existsSync(cphFinishedFile)) {
                unlinkSync(cphFinishedFile);
            }
        } catch (_) {
            // ignore
        }

        let polls = 0;
        const interval = setInterval(() => {
            polls++;
            try {
                if (existsSync(cphFinishedFile)) {
                    unlinkSync(cphFinishedFile);
                    clearInterval(interval);
                    getJudgeViewProvider()?.extensionToJudgeViewMessage({
                        command: 'submit-finished',
                    });
                }
            } catch (_) {
                // ignore
            }
            if (polls > 60) {
                clearInterval(interval);
            }
        }, 500);
    } catch (_) {
        // ignore
    }

    globalThis.reporter.sendTelemetryEvent(telmetry.SUBMIT_TO_CODEFORCES);
    globalThis.logger.log('Stored savedResponse', savedResponse);
};

export const setupCompanionServer = () => {
    try {
        setupIncomingProblemWatcher();
        const server = createServerInstance();
        server.listen(config.port, () => {
            isServerRunning = true;
            currentServer = server;
            submitServerFailed = false;
            updateStatusBar(true);
            globalThis.logger.log(
                'Companion server listening on port',
                config.port,
            );
        });
        return server;
    } catch (e) {
        submitServerFailed = true;
        globalThis.logger.error('Companion server error :', e);
        try {
            getJudgeViewProvider()?.extensionToJudgeViewMessage({
                command: 'submit-server-failed',
                port: config.port,
            });
        } catch (_) {
            // ignore
        }
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

        // For Java and Kotlin, use PascalCase without underscores
        if (ext === 'java' || ext === 'kt') {
            baseName = toPascalCase(baseName);
        }

        return `${baseName}.${ext}`;
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
