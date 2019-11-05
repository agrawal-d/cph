function getWebviewContent(results, isLastResult) {
    if (results.length === 0) {
        return "Error";
    }
    var modf = "";
    var count = 1;
    for (var element of results) {
        if (element.got.length > 200) { element.got = "Too long to display" }
        modf += `
    <div class="case">
        <p><b>Testcase ${count} <span class="${(element.passed) ? "pass" : "fail"}">${(element.passed) ? "PASSED" : "FAILED"}</span> <span class="right time">Took ${element.time}ms</span></b></p>
        Input :
        <pre>
${element.input.trim()}
        </pre>
        Expected Output:
        <pre>
${element.expected}</pre>
        Received Output:
        <pre>
${element.got}</pre>
    </div>
            `
        count++;
    }

    var pre = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <style>
        .case {
            background: rgba(0,0,0,0.1);
            padding: 10px;
            margin-bottom: 5px;
        }

        pre {
            background: rgba(0,0,0,0.2);
            color: bisque;
            max-width:100%;
            overflow-y:auto;
        }

        .right {
            float: right;
        }

        .time {
            color: rgb(185, 185, 84);
        }

        .fail {
            color: rgb(126, 38, 38);
        }

        .pass {
            color: rgb(37, 87, 37);
        }
    </style>
</head>

<body>
    <h4>Compilation Results</h4>
    `;
    pre += modf;
    if (!isLastResult) {
        pre += "<br><br><b>Running next testcase...</b>";
    }
    pre += `</body></html>`
    return pre;
}

module.exports = getWebviewContent;