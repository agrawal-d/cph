/**
 * This file only stores the globally used variables and functionalites to be
 * used across files, such as the vscode api or the current working directory,
 * configuration etc.
 *
 * Include this file only once, as it uses globals. Do not leak vscode api to
 * global scope.
 */
const vscode = require("vscode");

global.api = {};

module.exports = api;
