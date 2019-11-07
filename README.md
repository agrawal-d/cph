# Competitive Programming Helper (v0.0.9)

Download from here : https://marketplace.visualstudio.com/items?itemName=DivyanshuAgrawal.competitive-programming-helper or search in the VS Code Extensions within the application.

This extension helps you to quickly run codeforces testcases for a given problem automatically. You can also add custom testcases to the generated ```.tcs``` file. If the file you are testing in ```A.cpp``` then the generated testcases file is ```A.cpp.tcs```, in which you can add your own testcases.

Tip : Use the shortcut ```Ctrl/Cmd + Alt + B``` to activate.
Tip : Use the shortcut ```Ctrl/Cmd + Alt + 0``` to open testcases file.

![Extension Overview](screenshots/overall.png)


## Usage

Type ```Ctrl/Cmd + Shift + P``` and search for "*Run Codeforces Testcases Command*" or Click on the "*Run Testcases*" text on the bottom left of the VSCode ( the bottom statusbar ).

Or Use the shortcut ```Ctrl/Cmd + Alt + B``` to activate.


* The first line of your C++ code should be a comment containing the URL of the codeforces page. The comment should be single line, ie,  start with ```//``` and not ```/*```
* You can edit the generated .tcs file to add your own testcases.

![Use a comment as the first line](screenshots/1.png)

↑ Use a comment as the first line of your code as the URL of the problem



![Run Command ](screenshots/run-command.png)

↑ Press Ctrl/Cmd+Shift+P and type ```codeforces````




![Use a comment as the first line](screenshots/example-result.png)

↑ Rich analysis of your code

## Requirements

The GNU C++ Compiler ( GCC ) must be installed and should be accesible from the terminal/command prompt.

## About
This extension was created by Divyanshu Agrawal (https://github.com/agrawal-d). Please report bugs to hereisdx@gmail.com. Thank you for using this extension.

## Release Notes
* Version 1.0
    * Formatting or results improved. Minor Bug-Fixes.
* Version 0.0.9
    * Handles process exit signals and codes gracefully with detailed output.
* Version 0.0.8i
    * Fixes cross platform checker issues.
* Version 0.0.7
    * Fixes many UI and UX issues
    * Files are auto saved on execution.
    * .bin files are deleted after testcase evauation
    * .testcases files as now .tcs
    * The UI adapts to VS Code theme
* Version 0.0.6
    * Use cheerio for DOM traversal to fix testcase parsing issues.
* Version 0.0.5
    * Add command to open testcase file
    * Grouped all commands by category "Competitive" for easy search
* Version 0.0.4
    * You can now create a testcase file without a codeforces url
    * Prompts for Codeforces URL if not present in first line of C++ file
* Version 0.0.3
    * Testcases are now run sequentially instead of in parallel, giving much more accurate run times.
    * Optimized handling of some special and infinite testcases.
* Version 0.0.2
    * Handles infinite loops, and testcase errors
    * Bugfixes for undefined testcases, parsing errors and more.
* Version 0.0.1
    * Initial Release.

<!-- 
> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

-----------------------------------------------------------------------------------------------------------

## Working with Markdown

**Note:** You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+CMD+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (macOS) to see a list of Markdown snippets

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!** -->
