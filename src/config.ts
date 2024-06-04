/**
 * Contains common configurations for use by the extension. Not modifiable by
 * the user.
 */

export default {
    telemetryKey: '560c1323-27e1-446c-98c0-f8424c435ab3',
    port: 27121, // companion listener server
    timeout: 10000, // for a testcase run
    extensions: {
        c: 'c',
        cpp: 'cpp',
        python: 'py',
        rust: 'rs',
        java: 'java',
        js: 'js',
        go: 'go',
        hs: 'hs',
    },
    compilers: {
        c: 'gcc',
        cpp: 'g++',
        python: 'python',
        rust: 'rustc',
        java: 'javac',
        js: 'node',
        go: 'go',
        hs: 'hs',
    },
    compilerToId: {
        'GNU G++17 7.3.0': 54,
        'GNU G++14 6.4.0': 50,
        'GNU G++11 5.1.0': 42,
        'GNU G++17 9.2.0 (64 bit, msys 2)': 61,
        'GNU G++20 13.2 (64 bit, winlibs)': 89,
        'Microsoft Visual C++ 2017': 59,
        'Microsoft Visual C++ 2010': 2,
        'Clang++17 Diagnostics': 52,
        'Java 11.0.6': 60,
        'Java 1.8.0_241': 36,
        'Node.js 15.8.0 (64bit)': 55,
        'PyPy 3.6.9 (7.3.0)': 41,
        'PyPy 3.9.10 (7.3.9, 64bit)': 70,
        'Python 3.8.10': 31,
        'PyPy 2.7.13 (7.3.0)': 40,
        'Python 2.7.18': 7,
        'GNU GCC C11 5.1.0': 43,
        'Go 1.19.5': 32,
        'Rust 1.66.0 (2021)': 75,
        'Haskell GHC 8.10.1': 12,
    },
    supportedExtensions: ['py', 'cpp', 'rs', 'c', 'java', 'js', 'go', 'hs'],
    skipCompile: ['py', 'js'],
};
