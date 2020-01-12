# Competitive Programming Helper

Quickly compile, run and judge competitive programming problems. Download and testcases for a given problem automatically and/or add custom testcases.

**Supports tonnes of websites including AtCoder, Codeforces, Codechef, UVa Online Judge and more!**

**Whats new :** This new version adds lots of new features like Competitive Companion support, ability to run a single testcase, better stability, a welcome guide and lots more!

> ![Extension Overview](screenshots/video.gif)
> Overview

> **Competitive Companion support**
>
> Click on the ![Green plus](screenshots/companion.png) on your browser address bar to automatically download testcases and create .cpp file. You need to install the competitive companion extension to use this, and [set it up](#competitive-companion-setup).

### Tips

- Use the shortcut `Ctrl + Alt + B` to activate.
- You can choose additional compiler flags and save location from VSCode settings.

> ![Settings](screenshots/settings.gif)
> Change settings to hoose custom compiler flags and testcase/binary save location and more.

## Competitive Companion Setup

It is simple to use Competitive Companion with this extenison.

1. Download Competitive Companion for your browser : [Firefox](https://addons.mozilla.org/en-US/firefox/addon/competitive-companion/) [Google Chrome](https://chrome.google.com/webstore/detail/competitive-companion/cjnmckjndlpiamhfimnnjmnckgghkjbl)

1. Go to your extensions page and open the settings for Competitive Companion. In the list of ports, enter the port `27121`.

1. That's it! Now just click on the ![Green plus](screenshots/companion.png) to download problem and testcases. You must open VS Code in a folder to use this. To open in a folder, just press `File> Open Folder` or `Ctrl+K then Ctrl+O`.

**(See [firefox help video](https://github.com/agrawal-d/competitive-programming-helper/blob/master/screenshots/companion-help-firefox.webm?raw=true) or [chrome help video](https://github.com/agrawal-d/competitive-programming-helper/blob/master/screenshots/companion-help-chrome.webm?raw=true))**

## How to use

- Click on the ![Run testcases button](screenshots/run_testcases.png) button on the bottom left of VSCode.

- Or Type `Ctrl+ Shift + P` and select "_Run Testcases Command_".

- Or Use the shortcut `Ctrl + Alt + B` to activate.

## Dependencies

The GNU C++ Compiler ( g++ ) and GNU C compiler (gcc ) must be installed and should be accesible from the terminal/command prompt.
For competitive companion support, download the extension.

## About

This extension was created by Divyanshu Agrawal (https://github.com/agrawal-d). Please report bugs by creating an issue using the link above. Thank you for using this extension.

## Support

If you need help using this extension, create an issue [here](https://github.com/agrawal-d) and the developers will get back to you.

---

## Release Notes

- Version 2.2.1
  - Fixed minor settings bug
- Version 2.2.0
  - Added support for C language. ( Overall, now, C and C++ are supported)
- Version 2.1.0
  - Added support for custom compiler flags and generated testcases and binaries storage location.
  - Added usage GIF to readme.
- Version 2.0.X
  - Rich GUI editor for testcases.
- Version 1.0
  - Formatting or results improved. Minor Bug-Fixes.
- Version 0.0.9
  - Handles process exit signals and codes gracefully with detailed output.
- Version 0.0.8i
  - Fixes cross platform checker issues.
- Version 0.0.7
  - Fixes many UI and UX issues
  - Files are auto saved on execution.
  - .bin files are deleted after testcase evauation
  - .testcases files as now .tcs
  - The UI adapts to VS Code theme
- Version 0.0.6
  - Use cheerio for DOM traversal to fix testcase parsing issues.
- Version 0.0.5
  - Add command to open testcase file
  - Grouped all commands by category "Competitive" for easy search
- Version 0.0.4
  - You can now create a testcase file without a codeforces url
  - Prompts for Codeforces URL if not present in first line of C++ file
- Version 0.0.3
  - Testcases are now run sequentially instead of in parallel, giving much more accurate run times.
  - Optimized handling of some special and infinite testcases.
- Version 0.0.2
  - Handles infinite loops, and testcase errors
  - Bugfixes for undefined testcases, parsing errors and more.
- Version 0.0.1
  - Initial Release.
