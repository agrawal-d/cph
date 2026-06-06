import { getProblem } from './parser';
import * as vscode from 'vscode';
import { storeSubmitProblem, submitKattisProblem } from './companion';
import { getJudgeViewProvider } from './extension';
import { isCodeforcesUrl, isCodeChefUrl, isCsesUrl } from './utils';
import { readFileSync } from 'fs';
import telmetry from './telmetry';
import localize from './i18n';

export const submitToKattis = async () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.SUBMIT_TO_KATTIS);
    const srcPath = vscode.window.activeTextEditor?.document.fileName;
    if (!srcPath) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.notSupported',
                'Active editor is not supported for submission',
            ),
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage(
            localize('cph.submit.parseFailed', 'Failed to parse current code.'),
        );
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            localize('cph.submit.notKattis', 'Not a kattis problem.'),
        );
        return;
    }

    if (url.hostname !== 'open.kattis.com') {
        vscode.window.showErrorMessage(
            localize('cph.submit.notKattis', 'Not a kattis problem.'),
        );
        return;
    }

    submitKattisProblem(problem);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'waiting-for-submit',
    });
};

export const submitToCodeForces = async () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.notSupported',
                'Active editor is not supported for submission',
            ),
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage(
            localize('cph.submit.parseFailed', 'Failed to parse current code.'),
        );
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            localize('cph.submit.notCodeforces', 'Not a codeforces problem.'),
        );
        return;
    }

    if (!isCodeforcesUrl(url)) {
        vscode.window.showErrorMessage(
            localize('cph.submit.notCodeforces', 'Not a codeforces problem.'),
        );
        return;
    }

    storeSubmitProblem(problem);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'waiting-for-submit',
    });
};

/** Get the problem name ( like 144C ) for a given Codeforces URL string. */
export const getProblemName = (problemUrl: string): string => {
    const regexPatterns = [
        /\/contest\/(\d+)\/problem\/(\w+)/,
        /\/gym\/(\d+)\/problem\/(\w+)/,
        /\/problemset\/problem\/(\d+)\/(\w+)/,
        /\/problemset\/gymProblem\/(\d+)\/(\w+)/,
        /\/problemsets\/acmsguru\/problem\/(\d+)\/(\w+)/,
    ];

    for (const regex of regexPatterns) {
        const match = problemUrl.match(regex);
        if (match) {
            return match[1] + match[2];
        }
    }

    return '';
};

/** Get the CodeChef submission URL for a given CodeChef problem URL.
 *  CodeChef problem URLs look like: https://www.codechef.com/problems/PROBCODE
 *  or https://www.codechef.com/CONTEST/problems/PROBCODE
 *  Submission URL: https://www.codechef.com/submit/PROBCODE
 */
export const getCodeChefSubmitUrl = (problemUrl: string): string | null => {
    // Match /problems/PROBCODE (practice) or /CONTEST/problems/PROBCODE (contest)
    const match = problemUrl.match(/\/problems\/([A-Z0-9_]+)/i);
    if (match) {
        return `https://www.codechef.com/submit/${match[1]}`;
    }
    return null;
};

/** Get the CSES submission URL for a given CSES problem URL.
 *  CSES problem URLs look like: https://cses.fi/problemset/task/1234
 *  Submission URL: https://cses.fi/problemset/submit/1234/
 */
export const getCsesSubmitUrl = (problemUrl: string): string | null => {
    const match = problemUrl.match(/\/problemset\/task\/(\d+)/);
    if (match) {
        return `https://cses.fi/problemset/submit/${match[1]}/`;
    }
    return null;
};

export const submitToCodeChef = async () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.notSupported',
                'Active editor is not supported for submission',
            ),
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage(
            localize('cph.submit.parseFailed', 'Failed to parse current code.'),
        );
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            localize('cph.submit.notCodeChef', 'Not a CodeChef problem.'),
        );
        return;
    }

    if (!isCodeChefUrl(url)) {
        vscode.window.showErrorMessage(
            localize('cph.submit.notCodeChef', 'Not a CodeChef problem.'),
        );
        return;
    }

    const submitUrl = getCodeChefSubmitUrl(problem.url);
    if (!submitUrl) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.codechefUrlError',
                'Could not determine CodeChef submission URL.',
            ),
        );
        return;
    }

    const sourceCode = readFileSync(srcPath).toString();
    await vscode.env.clipboard.writeText(sourceCode);

    vscode.env.openExternal(vscode.Uri.parse(submitUrl));

    vscode.window.showInformationMessage(
        localize(
            'cph.submit.codechefSuccess',
            'Code copied to clipboard! Paste it on the CodeChef submission page.',
        ),
    );

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'submit-finished',
    });
};

export const submitToCSES = async () => {
    const srcPath = vscode.window.activeTextEditor?.document.fileName;

    if (!srcPath) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.notSupported',
                'Active editor is not supported for submission',
            ),
        );
        return;
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    const problem = getProblem(srcPath);

    if (!problem) {
        vscode.window.showErrorMessage(
            localize('cph.submit.parseFailed', 'Failed to parse current code.'),
        );
        return;
    }

    let url: URL;
    try {
        url = new URL(problem.url);
    } catch (err) {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            localize('cph.submit.notCSES', 'Not a CSES problem.'),
        );
        return;
    }

    if (!isCsesUrl(url)) {
        vscode.window.showErrorMessage(
            localize('cph.submit.notCSES', 'Not a CSES problem.'),
        );
        return;
    }

    const submitUrl = getCsesSubmitUrl(problem.url);
    if (!submitUrl) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.csesUrlError',
                'Could not determine CSES submission URL.',
            ),
        );
        return;
    }

    const sourceCode = readFileSync(srcPath).toString();
    await vscode.env.clipboard.writeText(sourceCode);

    vscode.env.openExternal(vscode.Uri.parse(submitUrl));

    vscode.window.showInformationMessage(
        localize(
            'cph.submit.csesSuccess',
            'Code copied to clipboard! Paste it on the CSES submission page.',
        ),
    );

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'submit-finished',
    });
};

/** Submit a CodeChef problem directly from a Problem object (called from webview message handler). */
export const submitCodeChefProblem = async (problem: { url: string; srcPath: string }) => {
    const submitUrl = getCodeChefSubmitUrl(problem.url);
    if (!submitUrl) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.codechefUrlError',
                'Could not determine CodeChef submission URL.',
            ),
        );
        return;
    }

    const sourceCode = readFileSync(problem.srcPath).toString();
    await vscode.env.clipboard.writeText(sourceCode);
    vscode.env.openExternal(vscode.Uri.parse(submitUrl));
    vscode.window.showInformationMessage(
        localize(
            'cph.submit.codechefSuccess',
            'Code copied to clipboard! Paste it on the CodeChef submission page.',
        ),
    );

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'submit-finished',
    });
};

/** Submit a CSES problem directly from a Problem object (called from webview message handler). */
export const submitCSESProblem = async (problem: { url: string; srcPath: string }) => {
    const submitUrl = getCsesSubmitUrl(problem.url);
    if (!submitUrl) {
        vscode.window.showErrorMessage(
            localize(
                'cph.submit.csesUrlError',
                'Could not determine CSES submission URL.',
            ),
        );
        return;
    }

    const sourceCode = readFileSync(problem.srcPath).toString();
    await vscode.env.clipboard.writeText(sourceCode);
    vscode.env.openExternal(vscode.Uri.parse(submitUrl));
    vscode.window.showInformationMessage(
        localize(
            'cph.submit.csesSuccess',
            'Code copied to clipboard! Paste it on the CSES submission page.',
        ),
    );

    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'submit-finished',
    });
};
