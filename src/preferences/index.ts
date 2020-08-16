import { workspace } from 'vscode';
import type { prefSection } from '../types';
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

export const getSaveLocationPref = (): string => getPreference('saveLocation');

export const getTimeOutPref = (): number => getPreference('timeOut') || 3000;

export const getCppArgsPref = (): string[] =>
    getPreference('argsCpp').split(' ') || [];

export const getCArgsPref = (): string[] =>
    getPreference('argsC').split(' ') || [];

export const getPythonArgsPref = (): string[] =>
    getPreference('argsPython').split(' ') || [];

export const getRustArgsPref = (): string[] =>
    getPreference('argsRust').split(' ') || [];

export const getFirstTimePref = (): boolean =>
    getPreference('firstTime') || 'true';

export const getDefaultLangPref = (): string | null => {
    const pref = getPreference('defaultLanguage');
    if (pref === 'none' || pref == ' ' || !pref) {
        return null;
    }
    return pref;
};

/** The language ID preference for a particular extension. */
export const getLanguageId = (srcPath: string): number => {
    const extension = path.extname(srcPath);
    switch (extension) {
        case '.cpp': {
            return getPreference('languageIdCpp');
        }

        case '.c': {
            return getPreference('languageIdC');
        }

        case '.rs': {
            return getPreference('languageIdRust');
        }

        case '.py': {
            return getPreference('languageIdPython');
        }

        default: {
            return -1;
        }
    }
};
