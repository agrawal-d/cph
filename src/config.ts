/**
 * Contains common configurations for use by the extension. Not modifiable by
 * the user.
 */

export default {
    port: 27121, // companion listener server
    timeout: 10000, // for a testcase run
    extensions: {
        c: 'c',
        cpp: 'cpp',
        python: 'py',
        rust: 'rs',
        java: 'java',
    },
    compilers: {
        c: 'gcc',
        cpp: 'g++',
        python: 'python',
        rust: 'rustc',
        java: 'javac',
    },
    compilerToId: {
        'GNU G++17 7.3.0': 54,
        'GNU G++14 6.4.0': 50,
        'GNU G++11 5.1.0': 42,
        'GNU G++17 9.2.0 (64 bit, msys 2)': 61,
        'GNU G++20 11.2.0 (64 bit, winlibs)': 73,
        'Microsoft Visual C++ 2017': 59,
        'Microsoft Visual C++ 2010': 2,
        'Clang++17 Diagnostics': 52,
        'Java 11.0.6': 60,
        'Java 1.8.0_241': 36,
        'PyPy 3.6 (7.2.0)': 41,
        'Python 3.7.2': 31,
        'PyPy 2.7 (7.2.0)': 40,
        'Python 2.7.15': 7,
        'GNU GCC C11 5.1.0': 43,
        'Rust 1.42.0': 49,
    },
    supportedExtensions: ['py', 'cpp', 'rs', 'c', 'java'],
    skipCompile: ['py'],
};
