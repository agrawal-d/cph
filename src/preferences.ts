import { workspace } from 'vscode';
import type { prefSection } from './types';
import config from './config';
import path from 'path';

const getPreference = (section: prefSection): any => {
    const ret = workspace.getConfiguration('cph').get(section);

    console.log('Read preference for ', section, ret);
    return ret;
};

export const updatePreference = (section: prefSection, value: any) => {
    return workspace
        .getConfiguration('competitive-programming-helper')
        .update(section, value);
};

export const getAutoShowJudgePref = (): boolean =>
    getPreference('general.autoShowJudge');

export const getSaveLocationPref = (): string =>
    getPreference('general.saveLocation');

export const getIgnoreSTDERRORPref = (): string =>
    getPreference('general.ignoreSTDERROR');

export const getTimeOutPref = (): number =>
    getPreference('general.timeOut') || 3000;

export const getRetainWebviewContextPref = (): boolean =>
    getPreference('general.retainWebviewContext');

export const getCppArgsPref = (): string[] =>
    getPreference('language.cpp.Args').split(' ') || [];

export const getCArgsPref = (): string[] =>
    getPreference('language.c.Args').split(' ') || [];

export const getPythonArgsPref = (): string[] =>
    getPreference('language.python.Args').split(' ') || [];

export const getRustArgsPref = (): string[] =>
    getPreference('language.rust.Args').split(' ') || [];

export const getJavaArgsPref = (): string[] =>
    getPreference('language.java.Args').split(' ') || [];

export const getFirstTimePref = (): boolean =>
    getPreference('general.firstTime') || 'true';

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
export const getRustCommand = (): string =>
    getPreference('language.rust.Command') || 'rustc';
export const getJavaCommand = (): string =>
    getPreference('language.java.Command') || 'javac';

export const getMenuChoices = (): string[] =>
    getPreference('general.menuChoices').split(' ');

/** The language ID preference for a particular extension. */
export const getLanguageId = (srcPath: string): number => {
    const extension = path.extname(srcPath);
    let compiler = null;
    switch (extension) {
        case '.cpp': {
            compiler = getPreference('language.cpp.SubmissionCompiler');
            break;
        }

        case '.java': {
            compiler = getPreference('language.java.SubmissionCompiler');
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
    }
    if (compiler == null) return -1;
    for (const [_compiler, id] of Object.entries(config.compilerToId)) {
        if (_compiler === compiler) {
            return id;
        }
    }
    console.error("Couldn't find id for compiler " + compiler);
    return -1;
};
