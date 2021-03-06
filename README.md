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
1. The file opens in VS Code with testcases preloaded. Press `Ctrl+Alt+B` to run
   them.

-   (Optional) Install the [cph-submit](https://github.com/agrawal-d/cph-submit)
    browser extension to enable submitting directly on CodeForces.
-   (Optional) Install submit client and config file from the
    [Kattis help page](https://open.kattis.com/help/submit) after logging in.

You can also use this extension locally, just open any supported file and press
'Run Testcases' (or `Ctrl+Alt+B`) to manually enter testcases.

[![See detailed user guide](https://img.shields.io/badge/-Read%20detailed%20usage%20guide-blue?style=for-the-badge)](docs/user-guide.md)

## Features

-   Autmatic compilation with display for compilation errors.
-   Intelligent judge with support for signals, time outs and run time errors.
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

You can contribute to this extension in many ways:

-   File bug reports by creating issues.
-   Develop this extension further - see [developer guide](docs/dev-guide.md).
-   Spreading the word about this extension.

## Telemetry

The extension aggregates how many times the extension was used. Only this
information is sent to AppInsights - no private information is collected. The
extension respects your VS Code telemetery settings, if it's disabled, the
extension does not collect any statistics.

## License

This software is licensed under [GPL Version 3](LICENSE) or later ( at your
choice ).
