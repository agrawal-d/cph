module.exports = {
    silent: true,
    roots: ['<rootDir>/out'],
    testMatch: ['**/*.test.js'],
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/tests/__mocks__/vscode.js',
    },
};
