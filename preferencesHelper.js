const workspace = require("vscode").workspace;

let preferences = workspace.getConfiguration(
    "competitive-programming-helper"
);

module.exports = preferences;