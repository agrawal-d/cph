import React from 'react';

export default function Page(props: {
    content: React.ReactNode;
    title: string;
    closePage: () => void;
}) {
    return (
        <div className="page selectable">
            <a
                className="right"
                title="Close dialog"
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
