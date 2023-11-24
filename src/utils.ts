import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { platform } from 'os';
import path from 'path';
import * as vscode from 'vscode';

import config from './config';
import { getProbSaveLocation } from './parser';
import {
    getCArgsPref,
    getCppArgsPref,
    getPythonArgsPref,
    getRustArgsPref,
    getJavaArgsPref,
    getJsArgsPref,
    getGoArgsPref,
    getCCommand,
    getCppCommand,
    getPythonCommand,
    getRustCommand,
    getJavaCommand,
    getJsCommand,
    getGoCommand,
} from './preferences';
import { Language, Problem } from './types';
import telmetry from './telmetry';

const oc = vscode.window.createOutputChannel('cph');

/**
 * Get language based on file extension
 */
export const getLanguage = (srcPath: string): Language => {
    const extension = path.extname(srcPath).split('.').pop();
    let langName: string | void = undefined;
    for (const [lang, ext] of Object.entries(config.extensions)) {
        if (ext === extension) {
            langName = lang;
        }
    }

    if (langName === undefined) {
        throw new Error('Invalid extension');
    }

    switch (langName) {
        case 'cpp': {
            return {
                name: langName,
                args: [...getCppArgsPref()],
                compiler: getCppCommand(),
                skipCompile: false,
            };
        }
        case 'c': {
            return {
                name: langName,
                args: [...getCArgsPref()],
                compiler: getCCommand(),
                skipCompile: false,
            };
        }
        case 'python': {
            return {
                name: langName,
                args: [...getPythonArgsPref()],
                compiler: getPythonCommand(),
                skipCompile: true,
            };
        }
        case 'rust': {
            return {
                name: langName,
                args: [...getRustArgsPref()],
                compiler: getRustCommand(),
                skipCompile: false,
            };
        }
        case 'java': {
            return {
                name: langName,
                args: [...getJavaArgsPref()],
                compiler: getJavaCommand(),
                skipCompile: false,
            };
        }
        case 'js': {
            return {
                name: langName,
                args: [...getJsArgsPref()],
                compiler: getJsCommand(),
                skipCompile: true,
            };
        }
        case 'go': {
            return {
                name: langName,
                args: [...getGoArgsPref()],
                compiler: getGoCommand(),
                skipCompile: false,
            };
        }
    }
    throw new Error('Invalid State');
};

export const isValidLanguage = (srcPath: string): boolean => {
    return config.supportedExtensions.includes(
        path.extname(srcPath).split('.')[1],
    );
};

export const isCodeforcesUrl = (url: URL): boolean => {
    return url.hostname === 'codeforces.com';
};

export const ocAppend = (string: string) => {
    oc.append(string);
};

export const ocWrite = (string: string) => {
    oc.clear();
    oc.append(string);
};

export const ocShow = () => {
    oc.show();
};

export const ocHide = () => {
    oc.clear();
    oc.hide();
};

export const randomId = () => Math.floor(Date.now() + Math.random() * 100);

/**
 * Check if file is supported. If not, shows an error dialog. Returns true if
 * unsupported.
 */
export const checkUnsupported = (srcPath: string): boolean => {
    if (!isValidLanguage(srcPath)) {
        vscode.window.showErrorMessage(
            `Unsupported file extension. Only these types are valid: ${config.supportedExtensions}`,
        );
        return true;
    }
    return false;
};

/** Deletes the .prob problem file for a given source code path. */
export const deleteProblemFile = (srcPath: string) => {
    globalThis.reporter.sendTelemetryEvent(telmetry.DELETE_ALL_TESTCASES);
    const probPath = getProbSaveLocation(srcPath);
    try {
        if (platform() === 'win32') {
            spawn('del', [probPath]);
        } else {
            spawn('rm', [probPath]);
        }
    } catch (error) {
        console.error('Error while deleting problem file ', error);
    }
};

export const getProblemForDocument = (
    document: vscode.TextDocument | undefined,
): Problem | undefined => {
    if (document === undefined) {
        return undefined;
    }

    const srcPath = document.fileName;
    const probPath = getProbSaveLocation(srcPath);
    if (!existsSync(probPath)) {
        return undefined;
    }
    const problem: Problem = JSON.parse(readFileSync(probPath).toString());
    return problem;
};
