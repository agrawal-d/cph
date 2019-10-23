/**
 * Compiles a given .cpp file
 */

function compileFile(filepath) {
    const gpp = spawn('g++', [filepath]);
    gpp.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
    })
    gpp.stderr.on('data', (data) => {
        vscode.window.showErrorMessage("Error while compining current file");
        oc.clear();
        oc.append("Errors while compiling\n" + data.toString());
        oc.show();
        compilationError = true;
    });

    gpp.on('exit', async (exitCode) => {
        if (!compilationError) {
            await runTestCases();
        }
        console.log(`Child exited with code ${exitCode}`);
    });
}