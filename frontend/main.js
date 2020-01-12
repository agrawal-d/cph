// @ts-nocheck

let num_test_cases = -1;
num_test_cases = document.querySelectorAll("textarea").length;
const vscode = acquireVsCodeApi();


function showUnsavedMessage(message) {
    document.getElementById("unsaved").innerText = message;
}


function reNumber() {
    let caseBoxes = document.getElementsByClassName("case");
    let casenum = 0;
    for (element of caseBoxes) {
        element.class = `case case-${casenum}`;
        element.firstElementChild.firstElementChild.childNodes[0].nodeValue = `Testcase ${casenum + 1}`;
        casenum++;
    }
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

function addTestCase() {
    let numCases = document.querySelectorAll(".case").length;
    let caseId = "cid" + Date.now() + Math.random();
    let newTestCaseString =
        `<div class="case case-${numCases}" data-casenum="${numCases}" id="${caseId}">
    <p><b>Testcase ${numCases + 1} <span class="passorfail" ></span > <span class="exec-time">...</span>

        <span class="right time">
            <button class="btn btn-green" onclick="rerunTestCase(this)">&#x21BA; </button>
            <button class="btn btn-red" onclick="deleteTestCase(this)">&#x2A2F;  </button>
        </span></b ></p >
            Input :
    <textarea class="selectable input-textarea"></textarea>
    Expected Output:
    <textarea class="selectable expected-textarea"></textarea>
    Received Output:
    <textarea readonly class="selectable received-textarea">Run to evaluate</textarea>
</div > `;
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


function rerunTestCase(button) {
    console.log(button);
    let caseBox = button.parentElement.parentElement.parentElement.parentElement;
    let caseId = caseBox.id;
    let casenum = caseBox.getAttribute("data-casenum");
    const ans = extractTestCases();
    const filepath = extractFilepath();
    console.log({ command: 'save-and-rerun-single', testcases: ans, casenum: casenum, filepath: filepath, caseId: caseId });
    vscode.postMessage({ command: 'save-and-rerun-single', testcases: ans, casenum: casenum, filepath: filepath, caseId: caseId })
    console.log("Single done", casenum, caseId);
    caseBox.querySelector("textarea.received-textarea").value = "...";


}

function saveAndRerunAll() {
    let ans = extractTestCases();
    const filepath = extractFilepath();

    vscode.postMessage({ command: 'save-and-rerun-all', testcases: ans, filepath: filepath })

}

function stopRunning() {
    vscode.postMessage({
        command: "kill-all"
    });
    console.log("stop-all emitted");
}

function deleteTestCase(element) {
    let caseElm = document.querySelectorAll("div.case");
    if (caseElm.length == 1) {
        let caseBox = element.parentElement.parentElement.parentElement.parentElement;
        caseBox.id = "cid" + Date.now() + Math.random();
        caseBox.querySelectorAll("textarea").forEach(element => {
            element.value = "";
        })
        return;

    }
    element.parentElement.parentElement.parentElement.parentElement.remove();
    showUnsavedMessage("You must run to save changes");
    reNumber();
}

window.addEventListener("message", event => {
    const data = event.data;
    switch (data.command) {
        case "singe-case-rerun-evaluation": {
            let evaluation = data.evaluation;
            let caseBox = document.getElementById(data.caseId);
            console.log("CB", caseBox);
            caseBox.querySelector("span.exec-time").innerText = evaluation.time + "ms";
            caseBox.querySelector("span.passorfail").innerText = evaluation.evaluation ? "PASSED" : "FAILED";
            caseBox.querySelector("span.passorfail").className = `passorfail ${evaluation.evaluation ? "pass" : "fail"} `;
            caseBox.querySelector("textarea.received-textarea").value = evaluation.got;
        }

    }
})