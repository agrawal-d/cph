import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { platform } from 'os';
import path from 'path';
import * as vscode from 'vscode';

import config from './config';
import { getProbSaveLocation } from './parser';
import {
    getCArgsPref,
    getCppArgsPref,
    getPythonArgsPref,
    getRubyArgsPref,
    getRustArgsPref,
    getJavaArgsPref,
    getJsArgsPref,
    getGoArgsPref,
    getHaskellArgsPref,
    getCSharpArgsPref,
    getCangejieArgsPref,
    getCCommand,
    getCppCommand,
    getPythonCommand,
    getRubyCommand,
    getRustCommand,
    getJavaCommand,
    getJsCommand,
    getGoCommand,
    getHaskellCommand,
    getCSharpCommand,
    getCangjieCommand,
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
        case 'cpp':
        case 'cc':
        case 'cxx': {
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
        case 'ruby': {
            return {
                name: langName,
                args: [...getRubyArgsPref()],
                compiler: getRubyCommand(),
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
        case 'hs': {
            return {
                name: langName,
                args: [...getHaskellArgsPref()],
                compiler: getHaskellCommand(),
                skipCompile: false,
            };
        }
        case 'csharp': {
            return {
                name: langName,
                args: [...getCSharpArgsPref()],
                compiler: getCSharpCommand(),
                skipCompile: false,
            };
        }
        case 'cangjie': {
            return {
                name: langName,
                args: [...getCangejieArgsPref()],
                compiler: getCangjieCommand(),
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
    return url.hostname.includes('codeforces.com');
};
export const isLuoguUrl = (url: URL): boolean => {
    return url.hostname.indexOf('luogu.com.cn') !== -1;
};
export const isAtCoderUrl = (url: URL): boolean => {
    return url.hostname === 'atcoder.jp';
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

export const randomId = (index: number | null) => {
    if (index !== null) {
        return Math.floor(Date.now() + index);
    } else {
        return Math.floor(Date.now() + Math.random() * 100);
    }
};

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
export const deleteProblemFile = async (srcPath: string) => {
    globalThis.reporter.sendTelemetryEvent(telmetry.DELETE_ALL_TESTCASES);
    const probPath = getProbSaveLocation(srcPath);

    globalThis.logger.log('Deleting problem file', probPath);
    try {
        if (platform() === 'win32') {
            spawn('cmd.exe', ['/c', 'del', probPath]);
        } else {
            spawn('rm', [probPath]);
        }
    } catch (error) {
        globalThis.logger.error('Error while deleting problem file ', error);
    }

    // Sleep for half second
    await new Promise((resolve) => setTimeout(resolve, 500));

    // If the folder is now empty, remove the folder too
    const probFolder = path.dirname(probPath);
    const files = readdirSync(probFolder);
    if (files.length === 0) {
        globalThis.logger.log(
            'Deleting problem folder',
            probFolder,
            'as it is empty',
        );
        try {
            if (platform() === 'win32') {
                spawn('cmd.exe', ['/c', 'rmdir', probFolder]);
            } else {
                spawn('rmdir', [probFolder]);
            }
        } catch (error) {
            globalThis.logger.error(
                'Error while deleting problem folder ',
                error,
            );
        }
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
