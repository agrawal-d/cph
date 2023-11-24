import { TestCase, Problem, Case } from './types';
/**
 * Judge whether the testcase stdout is correct
 *
 * @param testCase a single testcase
 * @param stdout stdout of a testcase run
 */
export const isResultCorrect = (
    testCase: TestCase,
    stdout: string,
): boolean => {
    // convert crlf to lf
    const expected = testCase.output.replace(/\r\n/g, '\n');
    const result = stdout.replace(/\r\n/g, '\n');

    const expectedLines = expected.trim().split('\n');
    const resultLines = result.trim().split('\n');
    console.log('res', resultLines);
    if (expectedLines.length !== resultLines.length) {
        console.log('Failed precheck', expectedLines, resultLines);
        return false;
    }

    const len = expectedLines.length;

    for (let i = 0; i < len; i++) {
        if (expectedLines[i].trim() !== resultLines[i].trim()) {
            console.log(
                'Judge Failed here: ',
                expectedLines[i].trim(),
                resultLines[i].trim(),
            );
            return false;
        }
    }

    return true;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getBlankCase = (_problem: Problem): Case => {
    const id = Date.now();
    return {
        id,
        result: null,
        testcase: {
            input: '',
            output: '',
            id,
        },
    };
};
