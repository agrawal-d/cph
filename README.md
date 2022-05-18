# Competitive Programming Helper (cph)

[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fagrawal-d%2Fcph%2Fbadge%3Fref%3Dmain&style=flat)](https://actions-badge.atrox.dev/agrawal-d/cph/goto?ref=main)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/DivyanshuAgrawal.competitive-programming-helper)](https://marketplace.visualstudio.com/items?itemName=DivyanshuAgrawal.competitive-programming-helper)

This extension allows you to quickly compile, run and judge competitive
programming problems from within VS Code. You can automatically download
testcases write & test your own problems. Once you are done, you can submit your
solutions directly with the click of a button!

Using the competitive companion browser extension, cph supports a large number
of popular platforms like Codeforces, Codechef, TopCoder etc.

![Screenshot](screenshots/screenshot-main.png)

## Quick start

1. [Install cph](https://marketplace.visualstudio.com/items?itemName=DivyanshuAgrawal.competitive-programming-helper)
   in VS Code and open any folder.
1. [Install competitive companion](https://github.com/jmerle/competitive-companion#readme)
   in your browser.
1. Use Companion by pressing the green plus (+) circle from the browser toolbar
   when visiting any problem page.
1. The file opens in VS Code with testcases preloaded. Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>B</kbd> to run
   them.

-   (Optional) Install the [cph-submit](https://github.com/agrawal-d/cph-submit)
    browser extension to enable submitting directly on CodeForces.
-   (Optional) Install submit client and config file from the
    [Kattis help page](https://open.kattis.com/help/submit) after logging in.

You can also use this extension locally, just open any supported file and press
'Run Testcases' (or <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>B</kbd>) to manually enter testcases.

[![See detailed user guide](https://img.shields.io/badge/-Read%20detailed%20usage%20guide-blue?style=for-the-badge)](docs/user-guide.md)

## Features

-   Automatic compilation with display for compilation errors.
-   Intelligent judge with support for signals, timeouts and runtime errors.
-   Works with Competitive Companion.
-   [Codeforces auto-submit](https://github.com/agrawal-d/cph-submit)
    integration.
-   [Kattis auto-submit](docs/user-guide.md) integration.
-   Works locally for your own problems.
-   Support for several languages.

## Supported Languages

-   C++
-   C
-   Rust
-   Python
-   Java

## Contributing

**CPH is in a steady-state.** There are no new features planned for the extension. Only bug-fixes will be worked on.

You can contribute to this extension in many ways:

-   File bug reports by creating issues.
-   Develop this extension further - see [developer guide](docs/dev-guide.md).
-   Spreading the word about this extension.

**Before creating a Pull Request, please create an issue to discuss the approach. It makes reviewing and accepting the PR much easier.**

## License

Copyright (C) 2021 Divyanshu Agrawal

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.
