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

export const getSaveLocationPref = (): string =>
    getPreference('general.saveLocation');

export const getTimeOutPref = (): number =>
    getPreference('general.timeOut') || 3000;

export const getCppArgsPref = (): string[] =>
    getPreference('language.cppArgs').split(' ') || [];

export const getCArgsPref = (): string[] =>
    getPreference('language.cArgs').split(' ') || [];

export const getPythonArgsPref = (): string[] =>
    getPreference('language.pythonArgs').split(' ') || [];

export const getRustArgsPref = (): string[] =>
    getPreference('language.rustArgs').split(' ') || [];

export const getJavaArgsPref = (): string[] =>
    getPreference('language.javaArgs').split(' ') || [];

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
    return getPreference('general.useShortCodeforcesName');
};

export const getPythonCommand = (): string =>
    getPreference('language.pythonCommand') || 'python';

export const getMenuChoices = (): string[] =>
    getPreference('general.menuChoices').split(' ') || [];

/** The language ID preference for a particular extension. */
export const getLanguageId = (srcPath: string): number => {
    const extension = path.extname(srcPath);
    let compiler = null;
    switch (extension) {
        case '.cpp': {
            compiler = getPreference('language.cppCompiler');
            break;
        }

        case '.java': {
            compiler = getPreference('language.javaCompiler');
            break;
        }

        case '.c': {
            compiler = getPreference('language.cCompiler');
            break;
        }

        case '.rs': {
            compiler = getPreference('language.rustCompiler');
            break;
        }

        case '.py': {
            compiler = getPreference('language.pythonCompiler');
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
