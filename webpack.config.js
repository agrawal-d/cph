//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const child_process = require('child_process');
const fs = require('fs');


/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        // devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: false,
    externals: {
        vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/, /src\/webview\/frontend/],
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.compile.tap("CompileTimeData", () => {
                    const gitCommitHash = child_process.execSync('git rev-parse HEAD').toString() || "unknown git commit hash";
                    const licenseString = fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf8').toString() || "unknown license";
                    const dateTime = new Date().toISOString();
                    const generatedDict = {
                        gitCommitHash,
                        licenseString,
                        dateTime,
                    };

                    const generatedJsonPath = path.join(__dirname, 'dist', 'static', 'generated.json');
                    console.log(`Writing generated.json to ${generatedJsonPath}`);
                    fs.mkdirSync(path.dirname(generatedJsonPath), { recursive: true });
                    fs.writeFileSync(generatedJsonPath, JSON.stringify(generatedDict, null, 2));
                });

            },
        },
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/webview/frontend/index.html',
                    to: 'frontend/index.html',
                },
                { from: 'static', to: 'static' },
            ],
        }),
    ],
};
module.exports = config;
