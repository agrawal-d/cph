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
    },
    compilerToId: {
  "GNU GCC C11 5.1.0": "43",
  "GNU G++17 7.3.0": "54",
  "GNU G++20 13.2 (64 bit, winlibs)": "89",
  "GNU G++23 14.2 (64 bit, msys2)": "91",
  "C# 8, .NET Core 3.1": "65",
  "C# 10, .NET SDK 6.0": "79",
  "C# Mono 6.8": "9",
  "D DMD32 v2.105.0": "28",
  "Go 1.22.2": "32",
  "Haskell GHC 8.10.1": "12",
  "Java 21 64bit": "87",
  "Java 8 32bit": "36",
  "Kotlin 1.7.20": "83",
  "Kotlin 1.9.21": "88",
  "OCaml 4.02.1": "19",
  "Delphi 7": "3",
  "Free Pascal 3.2.2": "4",
  "PascalABC.NET 3.8.3": "51",
  "Perl 5.20.1": "13",
  "PHP 8.1.7": "6",
  "Python 2.7.18": "7",
  "Python 3.13.2": "31",
  "PyPy 2.7.13 (7.3.0)": "40",
  "PyPy 3.6.9 (7.3.0)": "41",
  "PyPy 3.10 (7.3.15, 64bit)": "70",
  "Ruby 3.2.2": "67",
  "Rust 1.75.0 (2021)": "75",
  "Scala 2.12.8": "20",
  "JavaScript V8 4.8.0": "34",
  "Node.js 15.8.0 (64bit)": "55"
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
    ],
    skipCompile: ['py', 'js', 'rb'],
};
