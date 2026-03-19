import { diffOutput } from '../utils/diffOutput';

describe('diffOutput — line-level', () => {
    it('exact match returns isMatch true', () => {
        expect(diffOutput('42\n', '42\n').isMatch).toBe(true);
    });

    it('single changed line is detected', () => {
        const r = diffOutput('42\n', '43\n');
        expect(r.isMatch).toBe(false);
        expect(r.lines[0].type).toBe('changed');
        expect(r.lines[0].expected).toBe('42');
        expect(r.lines[0].received).toBe('43');
    });

    it('extra line in received is detected', () => {
        const r = diffOutput('1\n2\n', '1\n2\n3\n');
        expect(r.isMatch).toBe(false);
        expect(r.lines[2].type).toBe('extra');
        expect(r.lines[2].received).toBe('3');
        expect(r.lines[2].expected).toBeNull();
    });

    it('missing line in received is detected', () => {
        const r = diffOutput('1\n2\n3\n', '1\n2\n');
        expect(r.isMatch).toBe(false);
        expect(r.lines[2].type).toBe('missing');
        expect(r.lines[2].received).toBeNull();
    });

    it('CRLF line endings are normalised', () => {
        expect(diffOutput('42\r\n', '42\n').isMatch).toBe(true);
    });

    it('trailing whitespace per line is normalised', () => {
        expect(diffOutput('42  \n', '42\n').isMatch).toBe(true);
    });

    it('multiline exact match', () => {
        const r = diffOutput('1\n2\n3\n', '1\n2\n3\n');
        expect(r.isMatch).toBe(true);
        expect(r.lines).toHaveLength(3);
        r.lines.forEach((l) => expect(l.type).toBe('match'));
    });

    it('summary text is correct for a single diff', () => {
        expect(diffOutput('1\n', '2\n').summary).toBe('1 line differs.');
    });

    it('summary text is correct for multiple diffs', () => {
        expect(diffOutput('1\n2\n', '3\n4\n').summary).toBe('2 lines differ.');
    });

    it('summary text is correct when all match', () => {
        expect(diffOutput('42\n', '42\n').summary).toBe('All lines match.');
    });

    it('line numbers are 1-based', () => {
        const r = diffOutput('a\nb\n', 'a\nb\n');
        expect(r.lines[0].lineNumber).toBe(1);
        expect(r.lines[1].lineNumber).toBe(2);
    });
});

describe('diffOutput — token-level LCS diff', () => {
    it('extra tokens in received are marked extra', () => {
        const r = diffOutput('0 2 3 6 1 5', '0 2 3 9 6 1 5 10 15');
        const extras = r.tokenDiff.filter((t) => t.status === 'extra');
        expect(extras.map((t) => t.token)).toEqual(['9', '10', '15']);
    });

    it('matching tokens are marked match', () => {
        const r = diffOutput('0 2 3 6 1 5', '0 2 3 9 6 1 5 10 15');
        const matches = r.tokenDiff.filter((t) => t.status === 'match');
        expect(matches.map((t) => t.token)).toEqual([
            '0',
            '2',
            '3',
            '6',
            '1',
            '5',
        ]);
    });

    it('missing tokens are marked missing', () => {
        const r = diffOutput('1 2 3 4', '1 2 3');
        const missing = r.tokenDiff.filter((t) => t.status === 'missing');
        expect(missing.map((t) => t.token)).toEqual(['4']);
    });

    it('tokens across multiple lines are flattened — swapped token produces missing + extra', () => {
        // '3' is in expected but not received → missing; '4' is in received but not expected → extra
        const r = diffOutput('1\n2\n3', '1\n2\n4');
        const changed = r.tokenDiff.filter((t) => t.status !== 'match');
        expect(changed).toHaveLength(2);
        expect(changed.find((t) => t.status === 'missing')?.token).toBe('3');
        expect(changed.find((t) => t.status === 'extra')?.token).toBe('4');
    });

    it('completely correct output has all match tokens', () => {
        const r = diffOutput('1 2 3', '1 2 3');
        expect(r.tokenDiff.every((t) => t.status === 'match')).toBe(true);
    });

    it('tokenDiff is empty when both outputs are empty', () => {
        const r = diffOutput('', '');
        expect(r.tokenDiff).toHaveLength(0);
    });
});
