globalThis.logger = { ...console };

import { getCodeforcesFileName } from '../fileNameGenerator';

describe('Codeforces filename styles', () => {
    const problemName = 'A. Line Trip';
    const problemUrl = 'https://codeforces.com/problemset/problem/1901/A';

    test('name style', () => {
        expect(
            getCodeforcesFileName(
                problemName,
                problemUrl,
                'name',
                false,
                'cpp',
            ),
        ).toBe('A_Line_Trip.cpp');
    });

    test('shortcode style', () => {
        expect(
            getCodeforcesFileName(
                problemName,
                problemUrl,
                'shortcode',
                false,
                'cpp',
            ),
        ).toBe('1901A.cpp');
    });

    test('both style', () => {
        expect(
            getCodeforcesFileName(
                problemName,
                problemUrl,
                'both',
                false,
                'cpp',
            ),
        ).toBe('1901A_Line_Trip.cpp');
        // if your implementation currently returns
        // 1901A_Line_Trip.cpp
        // update this expectation accordingly
    });

    test('legacy style with short names disabled', () => {
        expect(
            getCodeforcesFileName(
                problemName,
                problemUrl,
                'legacy',
                false,
                'cpp',
            ),
        ).toBe('A_Line_Trip.cpp');
    });

    test('legacy style with short names enabled', () => {
        expect(
            getCodeforcesFileName(
                problemName,
                problemUrl,
                'legacy',
                true,
                'cpp',
            ),
        ).toBe('1901A.cpp');
    });

    test('both style removes problem prefix', () => {
        expect(
            getCodeforcesFileName(
                'B. Chip and Ribbon',
                'https://codeforces.com/problemset/problem/1901/B',
                'both',
                false,
                'cpp',
            ),
        ).toBe('1901B_Chip_and_Ribbon.cpp');
    });
});
