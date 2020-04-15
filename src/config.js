const config = {
  port: 27121,
  timeout: 10000,
  extensions: {
    C: "c",
    "C++": "cpp",
    Python: "py",
    Rust: "rs"
  },
  compilers: {
    "C": "gcc",
    "C++": "g++",
    "Python": "python3",
    "Rust":"rustc"
  }
};

module.exports = config;
