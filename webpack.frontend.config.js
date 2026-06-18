//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'web', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    entry: './src/webview/frontend/App.tsx', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'frontend.module.js',
        libraryTarget: 'window',
        devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: false,
    externals: {
        vscode: 'vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /(\.tsx|\.ts)\b/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/webview/frontend/app.css',
                    to: 'app.css',
                },
                { from: 'src/webview/frontend/index.html', to: 'index.html' },
                {
                    from: 'src/webview/frontend/meow.mp3',
                    to: 'meow.mp3',
                },
                {
                    from: 'node_modules/@vscode/codicons/dist/codicon.css',
                    to: 'codicon.css',
                },
                {
                    from: 'node_modules/@vscode/codicons/dist/codicon.ttf',
                    to: 'codicon.ttf',
                },
            ],
        }),
    ],
};
module.exports = config;
