import { DiffLine, DiffResult, TokenDiff } from '../types';

function normalizeLines(raw: string): string[] {
    return raw
        .replace(/\r\n/g, '\n')
        .trim()
        .split('\n')
        .map((l) => l.trim());
}

function tokenize(raw: string): string[] {
    return raw
        .replace(/\r\n/g, '\n')
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
}

/**
 * LCS-based token diff.
 * Returns a flat list of tokens annotated as match / extra / missing.
 *   match   → token exists in both at the right position
 *   extra   → token is in received but not expected (pink + strikethrough)
 *   missing → token is in expected but not received (blue underline)
 */
function lcsTokenDiff(expected: string[], received: string[]): TokenDiff[] {
    const m = expected.length;
    const n = received.length;

    // Build DP table
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0),
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                expected[i - 1] === received[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack to build diff
    const result: TokenDiff[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && expected[i - 1] === received[j - 1]) {
            result.unshift({ token: received[j - 1], status: 'match' });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ token: received[j - 1], status: 'extra' });
            j--;
        } else {
            result.unshift({ token: expected[i - 1], status: 'missing' });
            i--;
        }
    }

    return result;
}

/**
 * Compares expected and received program output.
 * Produces both a line-level summary and a token-level LCS diff
 * for GFG-style inline rendering.
 *
 * @param expected - The expected output string (from the testcase)
 * @param received - The actual stdout from the program run
 */
export function diffOutput(expected: string, received: string): DiffResult {
    // Line-level diff (for summary counts)
    const expLines = normalizeLines(expected);
    const recLines = normalizeLines(received);
    const maxLen = Math.max(expLines.length, recLines.length);
    const lines: DiffLine[] = [];

    for (let i = 0; i < maxLen; i++) {
        const exp = i < expLines.length ? expLines[i] : null;
        const rec = i < recLines.length ? recLines[i] : null;

        let type: DiffLine['type'];
        if (exp === null) {
            type = 'extra';
        } else if (rec === null) {
            type = 'missing';
        } else if (exp === rec) {
            type = 'match';
        } else {
            type = 'changed';
        }

        lines.push({ lineNumber: i + 1, expected: exp, received: rec, type });
    }

    const isMatch = lines.every((l) => l.type === 'match');
    const diffCount = lines.filter((l) => l.type !== 'match').length;
    const summary = isMatch
        ? 'All lines match.'
        : `${diffCount} line${diffCount === 1 ? '' : 's'} differ${
              diffCount === 1 ? 's' : ''
          }.`;

    // Token-level LCS diff (for inline GFG-style rendering)
    const expTokens = tokenize(expected);
    const recTokens = tokenize(received);
    const tokenDiff = lcsTokenDiff(expTokens, recTokens);

    return { isMatch, lines, summary, tokenDiff };
}
