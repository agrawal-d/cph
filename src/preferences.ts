import { workspace } from 'vscode';
import type { prefSection } from './types';
import config from './config';
import path from 'path';
import fs from 'fs';
import * as vscode from 'vscode';

const getPreference = (section: prefSection): any => {
    const ret = workspace.getConfiguration('cph').get(section);

    globalThis.logger.log('Read preference for ', section, ret);
    return ret;
};

export const updatePreference = (
    section: prefSection,
    value: any,
    target: vscode.ConfigurationTarget,
) => {
    return workspace.getConfiguration('cph').update(section, value, target);
};

export const getAutoShowJudgePref = (): boolean =>
    getPreference('general.autoShowJudge');

export const getSaveLocationPref = (): string => {
    const pref = getPreference('general.saveLocation');
    const validSaveLocation = pref == '' || fs.existsSync(pref);
    if (!validSaveLocation) {
        vscode.window.showErrorMessage(
            `Invalid save location, reverting to default. path not exists: ${pref}`,
        );
        updatePreference(
            'general.saveLocation',
            '',
            vscode.ConfigurationTarget.Global,
        );
        return '';
    }
    return pref;
};

export const getHideStderrorWhenCompiledOK = (): boolean =>
    getPreference('general.hideStderrorWhenCompiledOK');

export const getIgnoreSTDERRORPref = (): string =>
    getPreference('general.ignoreSTDERROR');

export const getTimeOutPref = (): number =>
    getPreference('general.timeOut') || 3000;

export const getRetainWebviewContextPref = (): boolean =>
    getPreference('general.retainWebviewContext');

export const getCArgsPref = (): string[] =>
    getPreference('language.c.Args').split(' ') || [];

export const getCOutputArgPref = (): string =>
    getPreference('language.c.OutputArg');

export const getCppArgsPref = (): string[] =>
    getPreference('language.cpp.Args').split(' ') || [];

export const getCppOutputArgPref = (): string =>
    getPreference('language.cpp.OutputArg');

export const getPythonArgsPref = (): string[] =>
    getPreference('language.python.Args').split(' ') || [];

export const getRubyArgsPref = (): string[] =>
    getPreference('language.ruby.Args').split(' ').filter(Boolean) || [];

export const getHaskellArgsPref = (): string[] =>
    getPreference('language.haskell.Args').split(' ') || [];

export const getRustArgsPref = (): string[] =>
    getPreference('language.rust.Args').split(' ') || [];

export const getJavaArgsPref = (): string[] =>
    getPreference('language.java.Args').split(' ') || [];

export const getJsArgsPref = (): string[] =>
    getPreference('language.js.Args').split(' ') || [];

export const getGoArgsPref = (): string[] =>
    getPreference('language.go.Args').split(' ') || [];

export const getCSharpArgsPref = (): string[] =>
    getPreference('language.csharp.Args').split(' ') || [];

export const getRemoteServerAddressPref = (): string =>
    getPreference('general.remoteServerAddress') || '';

export const getLiveUserCountPref = (): boolean =>
    getPreference('general.showLiveUserCount') || false;

export const getDefaultLangPref = (): string | null => {
    const pref = getPreference('general.defaultLanguage');
    if (pref === 'none' || pref == ' ' || !pref) {
        return null;
    }
    return pref;
};

export const useShortCodeForcesName = (): boolean => {
    return getPreference('general.useShortCodeForcesName');
};
export const getDefaultLanguageTemplateFileLocation = (): string | null => {
    const pref = getPreference('general.defaultLanguageTemplateFileLocation');
    if (pref === '') {
        return null;
    }
    return pref;
};

export const getCCommand = (): string =>
    getPreference('language.c.Command') || 'gcc';
export const getCppCommand = (): string =>
    getPreference('language.cpp.Command') || 'g++';
export const getPythonCommand = (): string =>
    getPreference('language.python.Command') || 'python3';
export const getRubyCommand = (): string =>
    getPreference('language.ruby.Command') || 'ruby';
export const getRustCommand = (): string =>
    getPreference('language.rust.Command') || 'rustc';
export const getJavaCommand = (): string =>
    getPreference('language.java.Command') || 'javac';
export const getJsCommand = (): string =>
    getPreference('language.js.Command') || 'node';
export const getGoCommand = (): string =>
    getPreference('language.go.Command') || 'go';
export const getHaskellCommand = (): string =>
    getPreference('language.haskell.Command') || 'ghc';
export const getCSharpCommand = (): string =>
    getPreference('language.csharp.Command') || 'dotnet';

export const getMenuChoices = (): string[] =>
    getPreference('general.menuChoices').split(' ');

/** The language ID preference for a particular extension. */
export const getLanguageId = (srcPath: string): number => {
    const extension = path.extname(srcPath);
    let compiler = null;
    switch (extension) {
        case '.cpp':
        case '.cc':
        case '.cxx': {
            compiler = getPreference('language.cpp.SubmissionCompiler');
            break;
        }

        case '.java': {
            compiler = getPreference('language.java.SubmissionCompiler');
            break;
        }

        case '.js': {
            compiler = getPreference('language.js.SubmissionCompiler');
            break;
        }

        case '.c': {
            compiler = getPreference('language.c.SubmissionCompiler');
            break;
        }

        case '.rs': {
            compiler = getPreference('language.rust.SubmissionCompiler');
            break;
        }

        case '.py': {
            compiler = getPreference('language.python.SubmissionCompiler');
            break;
        }

        case '.rb': {
            compiler = getPreference('language.ruby.SubmissionCompiler');
            break;
        }

        case '.go': {
            compiler = getPreference('language.go.SubmissionCompiler');
            break;
        }

        case '.hs': {
            compiler = getPreference('language.haskell.SubmissionCompiler');
            break;
        }

        case '.cs': {
            compiler = getPreference('language.csharp.SubmissionCompiler');
            break;
        }
    }
    if (compiler == null) return -1;
    for (const [_compiler, id] of Object.entries(config.compilerToId)) {
        if (_compiler === compiler) {
            return id;
        }
    }
    globalThis.logger.error("Couldn't find id for compiler " + compiler);
    return -1;
};
