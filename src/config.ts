/**
 * Contains common configurations for use by the extension. Not modifiable by
 * the user.
 */

export default {
    remoteMessageUrl: new URL(
        'https://raw.githubusercontent.com/agrawal-d/cph-remote-message/refs/heads/main/remote-message.txt',
    ),
    telemetryKey: '',
    port: 27121, // companion listener server
    timeout: 10000, // for a testcase run
    extensions: {
        c: 'c',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        csharp: 'cs',
        python: 'py',
        ruby: 'rb',
        rust: 'rs',
        java: 'java',
        js: 'js',
        go: 'go',
        hs: 'hs',
        cangjie: 'cj',
    },
    compilers: {
        c: 'gcc',
        cpp: 'g++',
        csharp: 'dotnet',
        python: 'python',
        ruby: 'ruby',
        rust: 'rustc',
        java: 'javac',
        js: 'node',
        go: 'go',
        hs: 'hs',
        cj: 'cjc',
    },
    compilerToId: {
        'GNU G++17 7.3.0': 54,
        'GNU G++14 6.4.0': 50,
        'GNU G++11 5.1.0': 42,
        'GNU G++17 9.2.0 (64 bit, msys 2)': 61,
        'GNU G++20 13.2 (64 bit, winlibs)': 89,
        'GNU G++23 14.2 (64 bit, msys2)': 91,
        'Microsoft Visual C++ 2017': 59,
        'Microsoft Visual C++ 2010': 2,
        'Clang++17 Diagnostics': 52,
        'C# 8, .NET Core 3.1': 65,
        'C# 10, .NET SDK 6.0': 79,
        'C# Mono 6.8': 9,
        'D DMD32 v2.105.0': 28,
        'Java 21 64bit': 87,
        'Java 11.0.6': 60,
        'Java 8 32bit': 36,
        'Kotlin 1.7.20': 83,
        'Kotlin 1.9.21': 88,
        'OCaml 4.02.1': 19,
        'Delphi 7': 3,
        'Free Pascal 3.2.2': 4,
        'PascalABC.NET 3.8.3': 51,
        'Perl 5.20.1': 13,
        'PHP 8.1.7': 6,
        'JavaScript V8 4.8.0': 34,
        'Node.js 15.8.0 (64bit)': 55,
        'PyPy 2.7.13 (7.3.0)': 40,
        'PyPy 3.6.9 (7.3.0)': 41,
        'PyPy 3.10 (7.3.15, 64bit)': 70,
        'Python 3.13.2': 31,
        'Python 2.7.18': 7,
        'Ruby 3.2.2': 67,
        'GNU GCC C11 5.1.0': 43,
        'Go 1.22.2': 32,
        'Rust 1.75.0 (2021)': 75,
        'Scala 2.12.8': 20,
        'Haskell GHC 8.10.1': 12,
    },
    supportedExtensions: [
        'py',
        'cpp',
        'cc',
        'cxx',
        'rs',
        'c',
        'java',
        'js',
        'go',
        'hs',
        'rb',
        'cs',
        'cj',
    ],
    skipCompile: ['py', 'js', 'rb'],
    templateVariables: {
        // Idea from: https://code.visualstudio.com/docs/editing/userdefinedsnippets

        // Special variable to place the starting cursor in the file
        CURSOR_PLACEHOLDER: 'CURSOR_PLACEHOLDER',

        // For inserting the class name:
        CLASS_NAME: 'CLASS_NAME', // CLASS_NAME

        // Problem metadata:
        PROBLEM_NAME: 'PROBLEM_NAME', // The name of the problem
        PROBLEM_FILE_NAME: 'PROBLEM_FILE_NAME', // The file name of the problem
        PROBLEM_URL: 'PROBLEM_URL', // The URL of the problem
        PROBLEM_GROUP: 'PROBLEM_GROUP', // The group of the problem

        // For inserting the current date and time:
        CURRENT_YEAR: 'CURRENT_YEAR', // The current year
        CURRENT_YEAR_SHORT: 'CURRENT_YEAR_SHORT', // The current year's last two digits
        CURRENT_MONTH: 'CURRENT_MONTH', // The month as two digits (e.g. '02')
        CURRENT_MONTH_NAME: 'CURRENT_MONTH_NAME', // The full name of the month (e.g. 'July')
        CURRENT_MONTH_NAME_SHORT: 'CURRENT_MONTH_NAME_SHORT', // The short name of the month (e.g. 'Jul')
        CURRENT_DATE: 'CURRENT_DATE', // The day of the month as two digits (e.g. '08')
        CURRENT_DAY_NAME: 'CURRENT_DAY_NAME', // The name of day (e.g. 'Monday')
        CURRENT_DAY_NAME_SHORT: 'CURRENT_DAY_NAME_SHORT', // The short name of the day (e.g. 'Mon')
        CURRENT_HOUR_24: 'CURRENT_HOUR_24', // The current hour in 24-hour clock format
        CURRENT_HOUR_12: 'CURRENT_HOUR_12', // The current hour in 12-hour clock format
        CURRENT_HOUR_AM_PM: 'CURRENT_HOUR_AM_PM', // The current hour in 12-hour clock format either "AM" or "PM"
        CURRENT_MINUTE: 'CURRENT_MINUTE', // The current minute as two digits
        CURRENT_SECOND: 'CURRENT_SECOND', // The current second as two digits
        CURRENT_SECONDS_UNIX: 'CURRENT_SECONDS_UNIX', // The number of seconds since the Unix epoch
        CURRENT_TIMEZONE_OFFSET: 'CURRENT_TIMEZONE_OFFSET', // The current UTC time zone offset as +HH:MM or -HH:MM (e.g. -07:00)
    },
};
