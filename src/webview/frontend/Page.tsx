import React from 'react';

interface CustomWindow extends Window {
    translations: Record<string, string>;
}
declare const window: CustomWindow;

const t = (key: string): string => {
    return window.translations[key] || key;
};

export default function Page(props: {
    content: React.ReactNode;
    title: string;
    closePage: () => void;
}) {
    return (
        <div className="page selectable">
            <a
                role="button"
                className="right"
                title={t('close')}
                onClick={() => props.closePage()}
            >
                <i className="codicon codicon-close"></i>
            </a>
            <h2>{props.title}</h2>
            <hr />
            {props.content}
        </div>
    );
}
