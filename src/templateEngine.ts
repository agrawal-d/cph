import { readFileSync } from 'fs';
import {
    getDefaultLangPref,
    getDefaultLanguageTemplateFileLocation,
} from './preferences';
import * as vscode from 'vscode';
import path from 'path';
import { existsSync, writeFileSync } from 'fs';
import { Problem } from './types';
import config from './config';
import { format } from 'date-fns';


/**
 * Writes the template contents to the problem file
 * @param problem - The problem object
 * @param extn - The extension of the file
 */
export const writeTemplateContents = (problem: Problem, extn: string) => {
    const defaultLanguage = getDefaultLangPref();

    // Only write template if the extension of the file matches the default language extension
    if (extn !== defaultLanguage) {
        return;
    }

    const templateLocation = getDefaultLanguageTemplateFileLocation();

    // If the user has not set a default language template file location, do nothing
    if (!templateLocation) {
        return;
    }

    const templateExists = existsSync(templateLocation);
    if (!templateExists) {
        vscode.window.showErrorMessage(
            `Template file does not exist: ${templateLocation}`,
        );
        return;
    }

    let templateContents = readFileSync(templateLocation).toString();
    const newTemplateContents = getTemplateContents(templateContents, extn, problem);

    writeFileSync(problem.srcPath, newTemplateContents);
};

/**
 * Gets the contents of the template file with the placeholders replaced
 * @param templateContents - The contents of the template file
 * @param extn - The extension of the file
 * @param problem - The problem object
 * @returns The contents of the template file with the placeholders replaced
 */
export const getTemplateContents = (templateContents: string, extn: string, problem: Problem) => {

    const srcPath = problem.srcPath;
    const problemFileName = path.basename(srcPath);

    // Replace the class name in the template if the file is a Java file
    if (extn == config.extensions.java) {
        const className = path.basename(problemFileName, '.' + extn);
        templateContents = templateContents.replace(config.templateVariables.CLASS_NAME, className);
    }

    // Replace longest placeholders first so e.g. CURRENT_SECONDS_UNIX is not partially replaced by CURRENT_SECOND
    const entriesByLength = Object.entries(config.templateVariables).sort(
        (a, b) => b[1].length - a[1].length,
    );
    entriesByLength.forEach(([key, value]) => {
        let templateKeyValue: string = "";
        let shouldReplace: boolean = true;

        const now = new Date();

        switch (key) {
            case config.templateVariables.PROBLEM_FILE_NAME:
                templateKeyValue = problemFileName;
                break;
            case config.templateVariables.PROBLEM_NAME:
                templateKeyValue = problem.name;
                break;
            case config.templateVariables.PROBLEM_URL:
                templateKeyValue = problem.url;
                break;
            case config.templateVariables.PROBLEM_GROUP:
                templateKeyValue = problem.group;
                break;

            // Year
            case config.templateVariables.CURRENT_YEAR:
                templateKeyValue = format(now, 'yyyy');
                break;
            case config.templateVariables.CURRENT_YEAR_SHORT:
                templateKeyValue = format(now, 'yy');
                break;

            // Month
            case config.templateVariables.CURRENT_MONTH:
                templateKeyValue = format(now, 'MM'); // '02'
                break;
            case config.templateVariables.CURRENT_MONTH_NAME:
                templateKeyValue = format(now, 'MMMM'); // 'February'
                break;
            case config.templateVariables.CURRENT_MONTH_NAME_SHORT:
                templateKeyValue = format(now, 'MMM'); // 'Feb'
                break;

            // Date/Day
            case config.templateVariables.CURRENT_DATE:
                templateKeyValue = format(now, 'dd');
                break;
            case config.templateVariables.CURRENT_DAY_NAME:
                templateKeyValue = format(now, 'EEEE'); // 'Sunday'
                break;
            case config.templateVariables.CURRENT_DAY_NAME_SHORT:
                templateKeyValue = format(now, 'EEE'); // 'Sun'
                break;

            // Time
            case config.templateVariables.CURRENT_HOUR_24:
                templateKeyValue = format(now, 'HH');
                break;
            case config.templateVariables.CURRENT_HOUR_12:
                templateKeyValue = format(now, 'hh');
                break;
            case config.templateVariables.CURRENT_HOUR_AM_PM:
                templateKeyValue = format(now, 'aa'); // 'AM' or 'PM'
                break;
            case config.templateVariables.CURRENT_MINUTE:
                templateKeyValue = format(now, 'mm');
                break;
            case config.templateVariables.CURRENT_SECOND:
                templateKeyValue = format(now, 'ss');
                break;

            // Unix & Timezone
            case config.templateVariables.CURRENT_SECONDS_UNIX:
                templateKeyValue = format(now, 't'); // Unix timestamp in seconds
                break;
            case config.templateVariables.CURRENT_TIMEZONE_OFFSET:
                templateKeyValue = format(now, 'xxx'); // '+05:30'
                break;
            default:
                shouldReplace = false;
                break;
        }

        if (shouldReplace) {
            templateContents = templateContents.replace(value, templateKeyValue);
        }
    });

    return templateContents;
}
