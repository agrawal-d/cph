import React, { useState } from 'react';
import { WebViewpersistenceState } from '../../types';
import Page from './Page';

const FEEDBACK_URL =
    'https://script.google.com/macros/s/AKfycbzIoi7qv_BlY4k-pPPi-aM42OkcmpuG1SVG-iGZqXmpAP2ZP8NZh4Yxh4Px48S3Wp6HQw/exec';

interface FeedbackProps {
    webviewState: WebViewpersistenceState;
    updateWebviewState: (newState: WebViewpersistenceState) => void;
    t: (key: string) => string;
    notify: (msg: string) => void;
    feedbackPageVisible: boolean;
    setFeedbackPageVisible: (visible: boolean) => void;
}

export const Feedback: React.FC<FeedbackProps> = ({
    webviewState,
    updateWebviewState,
    t,
    notify,
    feedbackPageVisible,
    setFeedbackPageVisible,
}) => {
    const [feedbackName, setFeedbackName] = useState('');
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [feedbackComment, setFeedbackComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!feedbackName.trim()) {
            newErrors.name = 'Name is required';
        } else if (feedbackName.length > 100) {
            newErrors.name = 'Name must be less than 100 characters';
        }

        if (feedbackEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(feedbackEmail)) {
                newErrors.email = 'Invalid email address';
            }
        }

        if (!feedbackComment.trim()) {
            newErrors.comment = 'Comment is required';
        } else if (feedbackComment.length > 2000) {
            newErrors.comment = `Comment must be less than 2000 characters (currently ${feedbackComment.length})`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const closeFeedbackBox = () => {
        const newState = {
            ...webviewState,
            feedbackDialogCloseDate: Date.now(),
        };
        updateWebviewState(newState);
    };

    const sendFeedback = async () => {
        if (!validate()) {
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            await fetch(FEEDBACK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: feedbackName,
                    email: feedbackEmail,
                    comment: feedbackComment,
                    token: 'iiYNOEs4z1P2y3aGciErN8VAZZUWg4UuIz1pwCWK2n8=', // Must match Apps Script
                }),
            });
            notify(t('feedbackSent'));
            setFeedbackPageVisible(false);
            setFeedbackComment('');
            setFeedbackName('');
            setFeedbackEmail('');
            setErrors({});
            closeFeedbackBox();
        } catch (err) {
            console.error('Failed to send feedback', err);
            notify(t('feedbackFailed'));
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const renderFeedbackModal = () => {
        if (!feedbackPageVisible) {
            return null;
        }

        const content = (
            <div>
                <p>{t('feedbackDescription')}</p>
                <div className="pad-10">
                    <label>{t('nameLabel')}</label>
                    <textarea
                        className="selectable"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder={t('nameLabel')}
                        rows={1}
                        style={{
                            height: '30px',
                            borderColor: errors.name ? 'red' : undefined,
                        }}
                    />
                    {errors.name && (
                        <small style={{ color: 'red' }}>{errors.name}</small>
                    )}
                    <br />
                    <label>{t('emailLabel')}</label>
                    <textarea
                        className="selectable"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        placeholder={t('emailLabel')}
                        rows={1}
                        style={{
                            height: '30px',
                            borderColor: errors.email ? 'red' : undefined,
                        }}
                    />
                    {errors.email && (
                        <small style={{ color: 'red' }}>{errors.email}</small>
                    )}
                    <br />
                    <label>
                        {t('commentLabel')} ({feedbackComment.length} / 2000)
                    </label>
                    <textarea
                        className="selectable"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder={t('commentLabel')}
                        rows={5}
                        style={{
                            borderColor: errors.comment ? 'red' : undefined,
                        }}
                    />
                    {errors.comment && (
                        <small style={{ color: 'red' }}>{errors.comment}</small>
                    )}
                    <br />
                    <button
                        className="btn btn-green btn-block"
                        onClick={sendFeedback}
                        disabled={isSubmittingFeedback}
                    >
                        {isSubmittingFeedback ? (
                            <span className="loader"></span>
                        ) : (
                            <i className="codicon codicon-send"></i>
                        )}{' '}
                        {t('sendFeedback')}
                    </button>
                </div>
            </div>
        );

        return (
            <Page
                content={content}
                title={t('giveFeedback')}
                closePage={() => setFeedbackPageVisible(false)}
            />
        );
    };

    const renderFeedbackPopup = () => {
        if (!webviewState.feedbackDialogCloseDate) {
            return null;
        }
        const diff =
            new Date().getTime() - webviewState.feedbackDialogCloseDate;
        const diffInDays = diff / (1000 * 60 * 60 * 24);
        if (diffInDays < 14) {
            return null;
        }

        return (
            <div
                className="donate-box"
                style={{
                    background: 'linear-gradient(0deg, #82f38a67, transparent)',
                }}
            >
                <a
                    role="button"
                    className="right"
                    title={t('close')}
                    onClick={() => closeFeedbackBox()}
                >
                    <i className="codicon codicon-close"></i>
                </a>
                <h1>💬</h1>
                <h3>{t('feedbackTitle')}</h3>
                <p>{t('feedbackDescription')}</p>
                <button
                    className="btn btn-green"
                    onClick={() => setFeedbackPageVisible(true)}
                >
                    <i className="codicon codicon-feedback"></i>{' '}
                    {t('giveFeedback')}
                </button>
            </div>
        );
    };

    return (
        <>
            {renderFeedbackModal()}
            {renderFeedbackPopup()}
        </>
    );
};
