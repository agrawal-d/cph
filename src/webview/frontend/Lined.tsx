import React, { useEffect, useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

type LinedTextareaProps = {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    autoFocus?: boolean;
    inputRef?: React.RefObject<HTMLTextAreaElement>;
    readOnly?: boolean;
    externalHoverLine?: number | null;
    onHoverLineChange?: (line: number | null) => void;
    diffAgainst?: string;
    gutterLabelForLine?: (lineIndex: number, allLines: string[]) => string;
    hoverHighlightForLine?: (
        lineIndex: number,
        allLines: string[],
    ) => { startLine: number; endLineExclusive: number } | null;
};

export function LinedTextarea(props: LinedTextareaProps) {
    const {
        value,
        onChange,
        className,
        autoFocus,
        inputRef,
        readOnly,
        externalHoverLine,
        onHoverLineChange,
        diffAgainst,
        gutterLabelForLine,
        hoverHighlightForLine,
    } = props;
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const gutterRef = useRef<HTMLDivElement | null>(null);
    const overlayInnerRef = useRef<HTMLDivElement | null>(null);
    //
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);
    const [lineHeightPx, setLineHeightPx] = useState<number>(18);
    const [overlayFontFamily, setOverlayFontFamily] = useState<
        string | undefined
    >(undefined);
    const [overlayFontSize, setOverlayFontSize] = useState<string | undefined>(
        undefined,
    );
    const [overlayPadding, setOverlayPadding] = useState<{
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    }>({});

    const lines = useMemo(() => Math.max(1, value.split('\n').length), [value]);

    useEffect(() => {
        const ta = inputRef?.current ?? internalRef.current;
        const gutter = gutterRef.current;
        if (!ta || !gutter) return;
        const onScroll = () => {
            if (gutter) gutter.scrollTop = ta.scrollTop;
            if (overlayInnerRef.current) {
                overlayInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
            }
        };
        ta.addEventListener('scroll', onScroll);
        // Forward wheel events from gutter to textarea for unified scrolling
        const onWheel = (e: WheelEvent) => {
            ta.scrollTop += e.deltaY;
        };
        gutter.addEventListener('wheel', onWheel);
        return () => {
            ta.removeEventListener('scroll', onScroll);
            gutter.removeEventListener('wheel', onWheel as EventListener);
        };
    }, [inputRef]);

    useEffect(() => {
        const ta = inputRef?.current ?? internalRef.current;
        if (!ta) return;
        const computed = window.getComputedStyle(ta);
        const lh = parseFloat(computed.lineHeight);
        if (!Number.isNaN(lh)) setLineHeightPx(lh);
        setOverlayFontFamily(computed.fontFamily);
        setOverlayFontSize(computed.fontSize);
        setOverlayPadding({
            top: computed.paddingTop,
            right: computed.paddingRight,
            bottom: computed.paddingBottom,
            left: computed.paddingLeft,
        });
    }, [inputRef]);

    const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        const ta = inputRef?.current ?? internalRef.current;
        if (!ta) return;
        const rect = ta.getBoundingClientRect();
        const localY = e.clientY - rect.top + ta.scrollTop;
        const idx = Math.max(
            0,
            Math.min(lines - 1, Math.floor(localY / lineHeightPx)),
        );
        setHoveredLine(idx);
        onHoverLineChange?.(idx);
    };

    const handleMouseLeave = () => {
        setHoveredLine(null);
        onHoverLineChange?.(null);
    };

    type TAStyle = React.ComponentProps<typeof TextareaAutosize>['style'];
    const displayHoverLine = externalHoverLine ?? hoveredLine;
    const allLines = useMemo(() => value.split('\n'), [value]);
    const hoverRange = useMemo(() => {
        if (displayHoverLine == null) return null;
        const custom = hoverHighlightForLine?.(displayHoverLine, allLines);
        if (custom) return custom;
        return {
            startLine: displayHoverLine,
            endLineExclusive: displayHoverLine + 1,
        };
    }, [displayHoverLine, hoverHighlightForLine, allLines]);

    const highlightedNodes = useMemo(() => {
        if (diffAgainst == null) return null;
        const nodes: React.ReactNode[] = [];
        const tokenRegex = /\S+/gu;
        const actualLines = value.split('\n');
        const expectedLines = diffAgainst.split('\n');
        for (let lineIdx = 0; lineIdx < actualLines.length; lineIdx++) {
            const aLine = actualLines[lineIdx];
            const eLine = expectedLines[lineIdx] ?? '';
            const expectedTokens = eLine.match(tokenRegex) || [];
            const actualTokens = aLine.match(tokenRegex) || [];
            const countMismatch = actualTokens.length !== expectedTokens.length;
            let lastIndex = 0;
            let tokenIndex = 0;
            for (const match of aLine.matchAll(tokenRegex)) {
                const start = match.index ?? 0;
                const end = start + match[0].length;
                if (start > lastIndex)
                    nodes.push(aLine.slice(lastIndex, start));
                const token = match[0];
                const expectedToken = expectedTokens[tokenIndex];
                const ok =
                    !countMismatch &&
                    expectedToken !== undefined &&
                    expectedToken === token;
                nodes.push(
                    <span
                        className={ok ? 'token-ok' : 'token-bad'}
                        key={`ol${lineIdx}t${start}`}
                    >
                        {token}
                    </span>,
                );
                lastIndex = end;
                tokenIndex++;
            }
            if (lastIndex < aLine.length) nodes.push(aLine.slice(lastIndex));
            if (lineIdx < actualLines.length - 1) nodes.push('\n');
        }
        return nodes;
    }, [value, diffAgainst]);
    const bgStyle = useMemo(() => {
        if (!hoverRange) return {} as TAStyle;
        const top = hoverRange.startLine * lineHeightPx;
        const bottom = hoverRange.endLineExclusive * lineHeightPx;
        const from = `${Math.max(0, top)}px`;
        const to = `${bottom}px`;
        const color = 'rgba(200, 200, 200, 0.08)';
        return {
            backgroundImage: `linear-gradient(to bottom, transparent ${from}, ${color} ${from}, ${color} ${to}, transparent ${to})`,
            backgroundAttachment: 'local',
        } as TAStyle;
    }, [hoverRange, lineHeightPx]);

    return (
        <div className="lined-container">
            <div
                className="lined-gutter"
                ref={gutterRef}
                aria-hidden="true"
                style={{ paddingTop: 0, paddingBottom: overlayPadding.bottom }}
            >
                {Array.from({ length: lines }, (_, i) => {
                    const inRange =
                        hoverRange &&
                        i >= hoverRange.startLine &&
                        i < hoverRange.endLineExclusive;
                    return (
                        <div
                            key={i}
                            className={`lined-number${
                                inRange ? ' is-hovered' : ''
                            }`}
                            style={{
                                height: `${lineHeightPx}px`,
                                lineHeight: `${lineHeightPx}px`,
                            }}
                        >
                            {gutterLabelForLine
                                ? gutterLabelForLine(i, allLines)
                                : i + 1}
                        </div>
                    );
                })}
            </div>
            <div className="lined-content">
                {diffAgainst != null && (
                    <div className="lined-overlay" aria-hidden="true">
                        <div
                            className={`lined-overlay-inner ${className ?? ''}`}
                            ref={overlayInnerRef}
                            style={{
                                ...(bgStyle as React.CSSProperties),
                                lineHeight: `${lineHeightPx}px`,
                                fontFamily: overlayFontFamily,
                                fontSize: overlayFontSize,
                                paddingTop: overlayPadding.top,
                                paddingRight: overlayPadding.right,
                                paddingBottom: overlayPadding.bottom,
                                paddingLeft: overlayPadding.left,
                            }}
                        >
                            {highlightedNodes}
                        </div>
                    </div>
                )}
                <TextareaAutosize
                    className={className}
                    onChange={onChange}
                    value={value}
                    ref={inputRef ?? internalRef}
                    autoFocus={autoFocus}
                    readOnly={readOnly}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        ...(bgStyle as TAStyle),
                        backgroundColor:
                            diffAgainst != null ? 'transparent' : undefined,
                        color: diffAgainst != null ? 'transparent' : undefined,
                        caretColor:
                            diffAgainst != null ? 'transparent' : undefined,
                        overflowY: 'auto',
                    }}
                />
            </div>
        </div>
    );
}
