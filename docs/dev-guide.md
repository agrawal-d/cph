# cph development guide

This document contains a basic developer guide to get started with the extension
development. In case of any confusions/ need for additional information, please
create an issue in the [repo](https://github.com/agrawal-d/cph). You should also
take a look at the [user guide](user-guide.md) to understand the
user-facingterms.

## Architecture

The extension runs in a Node.JS context with the
[VS Code API](https://code.visualstudio.com/api/references/vscode-api). The
extension shows the results in a web-view (code in `src/webview`). It
communicates to-and-from the extension by posting messages. See the [webview API](https://code.visualstudio.com/api/extension-guides/webview) for details.
The webview is currently a React App.

It compiles and runs code by spawning binaries, and pipes input to STDIN and
compares each line of STDOUT with expected output to judge results.

Generated testcases are stored as JSON files (`.prob` extension) either in the
folder of the source code or the folder mentioned in extension preferences.

## Competitive Companion Integration

The extension is integrated with the
[competitive companion](https://github.com/jmerle/competitive-companion) browser
extension. Our extension runs a HTTP server on port `27121`, and companion
`POST`s a new problem to this server, and we process it.

## Kattis Auto-Submit Integration

The extension summons a python shell when the `Submit to Kattis` button is
clicked, calling the
[Kattis submission client python file](https://github.com/Kattis/kattis-cli/blob/main/submit.py),
with tag `-f` to force the guessing of the submission. This is ensured to work
as the naming system for Kattis problems uses the problem ID. The
[Kattis configuration file](https://open.kattis.com/help/submit) is also needed
for submission.

The submission process checks for these two files in a `.kattisrc` folder in the
home directory of the user.

## Developer Tools

Currently, TypeScript is used to develop both the Node.JS and the webview parts
of the extension. ESLint with Prettier is used to enforce linting and formatting
rules. Webpack is used to bundle the extension to reduce extension size and
number of individual components.

Most of the TypeScript type definitions are stored in `src/types.ts`, the most
important of which is `Problem` and `Case`.

Several common functions have brief JSDocs on their purpose/ workings.

## Building and Hacking the extension in VS Code

The root source file is `src/extension.ts`, which registers the commands etc.

After making changes to code, you will want to test the extension. It's easy.
The launch config is in `.vscode/launch/json`. To launch the extension, just
press `F5`. It will bundle the extension using Webpack first, saving the output
in `dist/`.

We recommend installing `Prettier` and `ESLint` VS Code extensions. Before
commiting, make sure you are passing the following tests:

-   ESLint lint: `npm run lint`.
-   Jest unit tests: `npm run jest`.
-   Typescript compilation: `npm run test-compile`.
-   Pre-publish bundling: `npm run vscode:prepublish`.

## Bundling as `.vsix`

To generate the extension bundle for publishing, install
[VSCE package](https://www.npmjs.com/package/vsce) first (globally).

Then, in the root directory, run `vsce package` to generate the extension file.

## Getting help

To discuss ideas and problems while development, please create an issue in the
[repo](https://github.com/agrawal-d/cph).
