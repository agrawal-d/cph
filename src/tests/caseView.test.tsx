import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RunResult } from '../types';
import CaseView from '../webview/frontend/CaseView';
import { translations } from '../webview/translations';

const result: RunResult = {
    id: 1,
    pass: false,
    stdout: '',
    stderr: '',
    code: -1073741571,
    signal: null,
    time: 20,
    timeOut: false,
    failure: { reason: 'runStackOverflow', detail: '0xC00000FD' },
};

function renderCase(result: RunResult) {
    return renderToStaticMarkup(
        <CaseView
            num={1}
            case={{ id: 1, result, testcase: { id: 1, input: '', output: '' } }}
            rerun={jest.fn()}
            updateCase={jest.fn()}
            remove={jest.fn()}
            notify={jest.fn()}
            stop={jest.fn()}
            forceRunning={false}
            forceChecking={false}
        />,
    );
}

beforeAll(() => {
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { translations: translations['zh-cn'] },
    });
});

afterAll(() => {
    Reflect.deleteProperty(globalThis, 'window');
});

test('renders the localized failure even with no output', () => {
    const html = renderCase(result);
    expect(html).toContain('role="status"');
    expect(html).toContain('栈溢出（0xC00000FD）');
    expect(html).not.toContain('received-textarea');
});

test('keeps partial stdout and stderr separate and disables setting expected output', () => {
    const html = renderCase({ ...result, stdout: 'partial', stderr: 'trace' });
    expect(html).toMatch(/received-textarea[^>]*>partial<\/textarea>/);
    expect(html).toMatch(/stderror-textarea[^>]*>trace<\/textarea>/);
    expect(html).not.toContain('class="expectedoutput"');
});

test('does not label an output mismatch as a runtime failure', () => {
    const html = renderCase({ ...result, code: 0, failure: undefined });
    expect(html).not.toContain('run-failure');
    expect(html).toContain('received-textarea');
    expect(html).toContain('class="expectedoutput"');
});
