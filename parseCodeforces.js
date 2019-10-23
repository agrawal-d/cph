/**
 * Parses a given string and searches for testcases. Assumes string is a codeforces HTML page.
 */
function findTestCases(document) {
    var inp = [];
    var op = [];
    var lines = document.split('\n');
    var tc = "";
    var isTestcase = false;
    for (var element of lines) {
        if (element.includes('</pre></div>') && !element.includes('class="output') && !element.includes('class="input')) {
            isTestcase = false;
            op.push(tc);
        }
        else if (element.includes('<div class="input"><div class="title">Input</div>')) {
            if (tc != "") {
                op.push(tc);
                tc = ""
            }
            isTestcase = true;
        } else if (element.includes('<div class="output"><div class="title">Output</div>')) {
            if (tc != "") {
                inp.push(tc);
                tc = "";
            }
            isTestcase = true;
        }
        else if (isTestcase) {
            tc += element + "\n";
        }

    }

    return [inp, op];
}

module.exports = findTestCases;