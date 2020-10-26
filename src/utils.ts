import { spawn } from 'child_process';
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
} from './preferences';
import { Language } from './types';

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
                compiler: 'g++',
                skipCompile: false,
            };
        }
        case 'c': {
            return {
                name: langName,
                args: [...getCArgsPref()],
                compiler: 'gcc',
                skipCompile: false,
            };
        }
        case 'python': {
            return {
                name: langName,
                args: [...getPythonArgsPref()],
                compiler: 'python',
                skipCompile: true,
            };
        }
        case 'rust': {
            return {
                name: langName,
                args: [...getRustArgsPref()],
                compiler: 'rustc',
                skipCompile: false,
            };
        }
        case 'java': {
            return {
                name: langName,
                args: [...getJavaArgsPref()],
                compiler: 'javac',
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
