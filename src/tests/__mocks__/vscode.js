/**
 * Mock for the 'vscode' module so tests can run in Node without the VS Code runtime.
 */
module.exports = {
    workspace: {
        getConfiguration: () => ({
            get: () => undefined,
            update: () => Promise.resolve(),
        }),
    },
    window: {
        showErrorMessage: () => {},
    },
    ConfigurationTarget: { Global: 1 },
};
