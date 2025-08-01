import React, { forwardRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

interface TestCasePanelProps {
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    value: string;
    autoFocus?: boolean;
    onRequestEdit?: () => void;
    onBlur?: () => void;
}

const TestCasePanel = forwardRef<HTMLTextAreaElement, TestCasePanelProps>(
    ({ onChange, value, autoFocus, onRequestEdit, onBlur }, ref) => {
        const [focused, setFocused] = React.useState(false);
        const [hoveredLine, setHoveredLine] = React.useState<number | null>(
            null,
        );
        const lines = value.split(/\r?\n/);

        return (
            <div
                className={`testcase-panel-container${
                    focused ? ' highlighted' : ''
                }`}
                tabIndex={-1}
                style={{ outline: 'none', position: 'relative' }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                }}
                onClick={() => {
                    if (onRequestEdit) onRequestEdit();
                }}
            >
                <div className="lines-container">
                    {lines.map((line, idx) => (
                        <div
                            className={`line-row${
                                hoveredLine === idx ? ' highlight' : ''
                            }`}
                            key={idx}
                            onMouseEnter={() => setHoveredLine(idx)}
                            onMouseLeave={() => setHoveredLine(null)}
                        >
                            <span className="line-number">{idx + 1}</span>
                            <span className="line-content">
                                {line === '' ? '\u00A0' : line}
                            </span>
                        </div>
                    ))}
                </div>
                <TextareaAutosize
                    className="selectable input-textarea testcase-panel-textarea"
                    onChange={onChange}
                    value={value}
                    ref={ref}
                    autoFocus={autoFocus}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                        setFocused(false);
                        if (onBlur) onBlur();
                    }}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        pointerEvents: 'none',
                        height: 0,
                    }}
                    tabIndex={-1}
                />
            </div>
        );
    },
);

TestCasePanel.displayName = 'TestCasePanel';

export default TestCasePanel;
