import * as vscode from 'vscode';
export const registerCppSTLCompletionProviders = (
    context: vscode.ExtensionContext,
) => {
    console.log('Registering Completion Providers');
    const cppStlCompletions = vscode.languages.registerCompletionItemProvider(
        'cpp',
        {
            provideCompletionItems(
                document: vscode.TextDocument,
                position: vscode.Position,
            ) {
                const pattern = document.getText(
                    document.getWordRangeAtPosition(position),
                );
                const expansionRules = {
                    v: [1, 'vector'],
                    s: [0, 'string'],
                    p: [2, 'pair'],
                    i: [0, 'int'],
                    c: [0, 'char'],
                    S: [1, 'set'],
                    m: [2, 'map'],
                    d: [1, 'deque'],
                    q: [1, 'queue'],
                    l: [0, 'long long'],
                };

                const getExpansionString = (ch: string) => {
                    return expansionRules[
                        ch as keyof typeof expansionRules
                    ][1] as string;
                };

                const getSize = (ch: string) => {
                    return expansionRules[
                        ch as keyof typeof expansionRules
                    ][0] as number;
                };

                if (pattern[0] in expansionRules && getSize(pattern[0]) > 0) {
                    const stack = [];
                    let endOfPatternReached = false;
                    let expandedString = '';
                    for (const c of pattern) {
                        if (!endOfPatternReached && c in expansionRules) {
                            expandedString = expandedString.concat(
                                getExpansionString(c),
                            );
                            const tmp = getSize(c);
                            if (tmp != 0) {
                                expandedString = expandedString.concat('<');
                            }
                            stack.push(tmp);
                            while (stack[stack.length - 1] == 0) {
                                stack.pop();
                                if (stack.length != 0) {
                                    stack[stack.length - 1]--;
                                    if (stack[stack.length - 1] == 0) {
                                        expandedString =
                                            expandedString.concat('>');
                                    } else {
                                        expandedString =
                                            expandedString.concat(',');
                                    }
                                }
                            }
                            if (stack.length == 0) {
                                endOfPatternReached = true;
                            }
                        } else {
                            /** Do not expand if:
                             *  - End has been reached already (balance = 0)
                             *  - a character not present in the expansionRules is encountered
                             */
                            return [];
                        }
                    }
                    const stlCompletionItem = new vscode.CompletionItem(
                        expandedString,
                    );
                    stlCompletionItem.filterText = pattern;
                    return [stlCompletionItem];
                }
                return [];
            },
        },
    );
    context.subscriptions.push(cppStlCompletions);
};
