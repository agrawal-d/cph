const config = {
  port: 27121,
  timeout: 10000,
  extensions: {
    "C": "c",
    "C++": "cpp",
    "Python": "py"
  },
  compilers: {
    "C": "gcc",
    "C++": "g++",
    "Python": "python3"
  }
};

module.exports = config;
