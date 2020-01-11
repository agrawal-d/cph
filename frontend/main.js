
let num_test_cases = -1;
num_test_cases = document.querySelectorAll("textarea").length;
const vscode = acquireVsCodeApi();
let newTestCaseString =
    `<div class="case">
<p><b>Unsaved Testcase</span>
<span class="right time">
<button class="btn btn-red" onclick="deleteTestCase(this)">&#x2A2F;</button>
</span></b></p>
Input :
<textarea  class="selectable"></textarea>
Expected Output:
<textarea  class="selectable"></textarea>
Received Output:
<textarea readonly class="selectable">Run to show output</textarea>
</div>`;

function showUnsavedMessage(message) {
    document.getElementById("unsaved").innerText = message;
}


var textareas = document.querySelectorAll("textarea");
function resize(text) {
    text.style.height = 'auto';
    text.style.height = text.scrollHeight + 'px';
    showUnsavedMessage("Click Rerun all to save changes");
}

textareas.forEach((element) => {
    setTimeout(() => { resize(element) }, 200);
    element.addEventListener("input", () => {
        resize(element);
    })
    element.addEventListener("keypress", () => {
        resize(element);
    })
})

var x = document.getElementById("new-testcase");
console.log(x);



function addTestCase() {
    document.getElementById('app').innerHTML += newTestCaseString;
    let arr = document.querySelectorAll("textarea");
    arr.forEach(element => {
        element.addEventListener("input", () => {
            resize(element);
        })
        element.addEventListener("keypress", () => {
            resize(element);
        })
    })
    showUnsavedMessage("");
    window.scrollTo(0, document.body.scrollHeight);
}

function extractFilepath() {
    return document.getElementById("filepath").innerText;
}

function extractTestCases() {
    let caseElm = document.querySelectorAll("div.case");
    let ans = [];
    caseElm.forEach(elm => {
        let [e_inp, e_exp, e_op] = elm.querySelectorAll("textarea");
        let [inp, exp, op] = [e_inp.value, e_exp.value, e_op.value];
        ans.push({
            input: inp,
            output: exp
        })
    })
    return ans;
}


function rerunTestCase(casenum) {
    casenum = casenum - 1;
    const ans = extractTestCases();
    const filepath = extractFilepath();
    vscode.postMessage({ command: 'save-and-rerun-single', testcases: ans, casenum: casenum, filepath: filepath })
    console.log("Single done", casenum);

}

function saveAndRerunAll() {
    let ans = extractTestCases();
    const filepath = extractFilepath();

    vscode.postMessage({ command: 'save-and-rerun-all', testcases: ans, filepath: filepath })

}

function deleteTestCase(element) {
    let caseElm = document.querySelectorAll("div.case");
    if (caseElm.length == 1) {
        console.error("Cant delete this one");
        vscode.postMessage({ command: 'delete-single-testcase' });
        showUnsavedMessage("Cant delete. Minimum one testcase")
        return;

    }
    element.parentElement.parentElement.parentElement.parentElement.remove();
    showUnsavedMessage("You must click Rerun all to save changes");
}