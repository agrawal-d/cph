/**
 * Parses a given string and searches for testcases. Assumes string is a codeforces HTML page.
 */
const cheerio = require('cheerio');
function findTestCases(document) {
    const $ = cheerio.load(document);
    var inp = [];
    var op = [];
    var lines = document.split('\n');
    var tcs = $(".problem-statement .sample-tests pre").each((i, elem) => {
        let text = $(elem).html();
        console.log("before", text);
        text = text.replace(/<br>/gi, "\n");
        text = text.replace(/<br\/>/gi, "\n");

        console.log("aft", text);
        text += "\n";
        if (i % 2) {
            op.push(text);
        } else {
            inp.push(text);
        }
    })

    // var isTestcase = false;
    // for (var element of lines) {
    //     if (element.includes('</pre></div>') && !element.includes('class="output') && !element.includes('class="input')) {
    //         isTestcase = false;
    //         op.push(tc);
    //     }
    //     else if (element.includes('<div class="input"><div class="title">Input</div>')) {
    //         if (tc != "") {
    //             op.push(tc);
    //             tc = ""
    //         }
    //         isTestcase = true;
    //     } else if (element.includes('<div class="output"><div class="title">Output</div>')) {
    //         if (tc != "") {
    //             inp.push(tc);
    //             tc = "";
    //         }
    //         isTestcase = true;
    //     }
    //     else if (isTestcase) {
    //         tc += element + "\n";
    //     }

    // }

    return [inp, op];
}

module.exports = findTestCases;