/**
 * 
 * @param {*} results an object containing the evaluated testcase results
 * @param {*} isLastResult boolean wether the results are final or any evaluation is pending
 */
function getWebviewContent(results, isLastResult, jspath) {
    var modf = "";
    var count = 1;
    for (var element of results) {
        if (element.got.length > 200) { element.got = "Too long to display" }
        modf += `
    <div class="case">
        <p><b>Testcase ${count} <span class="${(element.passed) ? "pass" : "fail"}">${(element.passed) ? "PASSED" : "FAILED"} , Took ${element.time}ms</span>

         <span class="right time">
            <button class="btn btn-red" onclick="deleteTestCase(this)">Delete</button>
         </span></b></p>
        Input :
        <textarea class="selectable">${element.input.trim()}</textarea>
        Expected Output:
        <textarea class="selectable">${element.expected.trim()}</textarea>
        Received Output:
        <textarea readonly class="selectable">${element.got.trim()}</textarea>
    </div>
            `
        count++;
    }

    var pre = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, text-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <style>
    * {
        -webkit-touch-callout: none; /* iOS Safari */
          -webkit-user-select: none; /* Safari */
           -khtml-user-select: none; /* Konqueror HTML */
             -moz-user-select: none; /* Firefox */
              -ms-user-select: none; /* Internet Explorer/Edge */
                  user-select: none; /* Non-prefixed version, currently
                                        supported by Chrome and Opera */;
        cursor:default !important;
      }
      .selectable {
        -webkit-touch-callout: text; /* iOS Safari */
          -webkit-user-select: text; /* Safari */
           -khtml-user-select: text; /* Konqueror HTML */
             -moz-user-select: text; /* Firefox */
              -ms-user-select: text; /* Internet Explorer/Edge */
                  user-select: text; /* Non-prefixed version, currently
                                        supported by Chrome and Opera */;
        cursor:text !important;
      }
      body{
          margin-bottom:100px;
      }
      #pane{
          position:fixed;
          bottom:0px;
          left:0px;
          width:100%;
          padding:15px;
          background:var(--vscode-sideBar-background);
          box-shadow:0px 0px 10px 0px rgba(50,50,50,0.3);
      }
        .case {
            background: rgba(0,0,0,0.1);
            padding: 10px;
            margin-bottom: 5px;
        }

        .pre, pre, textarea {
            background: var(--input.background);
            width:100%;
            display:block;
            background:rgba(0,0,0,0.2);
            outline:none !important;
            border:0px;
            color: bisque;
            max-width:100%;
            overflow-x:auto;
            resize:none;
        }
        textarea:focus, textarea:active{
            background:black;
            outline:none !important;
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
        .btn{
            padding:5px 10px 5px 10px;
            background:#3393CC91;
            color:white;
            outline:none;
            margin-right:2px;
            margin-bottom:5px;
            border:0px;
        }
        .btn-green{
            background:#70B92791;
        }
        .btn-red{
            background:#B9274391
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
    pre += `
<div id="app"></div>
<div id="pane">
<button class="btn" id="new-testcase" onclick="addTestCase()">New Testcase</button>
<button class="btn btn-green" onClick="saveAndRerunAll()">Save & Rerun all</button>
<br>
<span id="unsaved"></span>
</div>
</body>
<script src="${jspath}"></script>
</html>
`
    return pre;
}

module.exports = getWebviewContent;