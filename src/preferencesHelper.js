const workspace = require("vscode").workspace;

function preferences() {
    return workspace.getConfiguration(
        "competitive-programming-helper"
    );
}

module.exports = preferences;