import React, { useState } from 'react';
import Page from './Page';

interface ImportCasesProps {
    t: (key: string) => string;
    notify: (msg: string) => void;
    importPageVisible: boolean;
    setImportPageVisible: (visible: boolean) => void;
    importCases: (cases: { input: string; output: string }[]) => void;
}

export const ImportCases: React.FC<ImportCasesProps> = ({
    t,
    notify,
    importPageVisible,
    setImportPageVisible,
    importCases,
}) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [parsedCases, setParsedCases] = useState<
        { input: string; output: string }[] | null
    >(null);

    if (!importPageVisible) {
        return null;
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        setFileName(file.name);
        setValidationError(null);
        setParsedCases(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const json = JSON.parse(text);
                if (!Array.isArray(json)) {
                    setValidationError(t('jsonRootMustBeArray'));
                    return;
                }

                const casesList: { input: string; output: string }[] = [];
                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    if (item === null || typeof item !== 'object') {
                        setValidationError(
                            t('itemNotValidObject').replace(
                                '{index}',
                                i.toString(),
                            ),
                        );
                        return;
                    }
                    if (typeof item.input !== 'string') {
                        setValidationError(
                            t('itemMissingInput').replace(
                                '{index}',
                                i.toString(),
                            ),
                        );
                        return;
                    }
                    if (typeof item.output !== 'string') {
                        setValidationError(
                            t('itemMissingOutput').replace(
                                '{index}',
                                i.toString(),
                            ),
                        );
                        return;
                    }
                    casesList.push({
                        input: item.input,
                        output: item.output,
                    });
                }

                if (casesList.length === 0) {
                    setValidationError(t('arrayContainsNoCases'));
                    return;
                }

                setParsedCases(casesList);
            } catch (err: any) {
                setValidationError(
                    t('invalidJsonFormat').replace('{message}', err.message),
                );
            }
        };
        reader.onerror = () => {
            setValidationError(t('failedToReadFile'));
        };
        reader.readAsText(file);
    };

    const handleImport = () => {
        if (parsedCases && parsedCases.length > 0) {
            importCases(parsedCases);
            notify(t('testcasesImported'));
            setImportPageVisible(false);
            // reset state
            setFileName(null);
            setValidationError(null);
            setParsedCases(null);
        }
    };

    const exampleJson = JSON.stringify(
        [
            {
                input: 'Tim Apple\n4 6',
                output: '3\n12',
            },
            {
                input: 'John Doe\n10 20',
                output: 'No',
            },
        ],
        null,
        2,
    );

    const content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ opacity: 0.85, fontSize: '0.95em' }}>
                {t('importCasesDescription')}
            </p>

            <div>
                <h4 style={{ marginBottom: '8px' }}>{t('exampleFormat')}</h4>
                <textarea
                    className="selectable"
                    readOnly
                    value={exampleJson}
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '0.9em',
                        height: '140px',
                        width: '100%',
                        display: 'block',
                        margin: 0,
                    }}
                />
            </div>

            <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
                <input
                    type="file"
                    id="cph-import-file-picker"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <label
                    htmlFor="cph-import-file-picker"
                    className="btn btn-blue"
                    style={{
                        display: 'inline-block',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        textAlign: 'center',
                        margin: 0,
                        width: 'fit-content',
                    }}
                >
                    <i className="codicon codicon-folder-opened"></i>{' '}
                    {t('chooseFile')}
                </label>
                {fileName && (
                    <div style={{ fontSize: '0.9em', opacity: 0.9 }}>
                        {t('selectedFile')} <strong>{fileName}</strong>
                    </div>
                )}
            </div>

            {validationError && (
                <p>
                    <strong>{t('validationError')}</strong> {validationError}
                </p>
            )}

            <button
                className="btn btn-green btn-block"
                onClick={handleImport}
                disabled={!parsedCases}
                style={{
                    marginTop: '10px',
                    padding: '8px',
                    fontSize: '1em',
                }}
            >
                <i className="codicon codicon-check"></i>{' '}
                {parsedCases
                    ? t('importNTestcases').replace(
                          '{count}',
                          parsedCases.length.toString(),
                      )
                    : t('importCasesTitle')}
            </button>
        </div>
    );

    return (
        <Page
            content={content}
            title={t('importCasesTitle')}
            closePage={() => {
                setImportPageVisible(false);
                setFileName(null);
                setValidationError(null);
                setParsedCases(null);
            }}
        />
    );
};
