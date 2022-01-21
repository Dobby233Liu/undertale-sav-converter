const crlfRegex = /(\r|)\n/g;
const ACTION_JSON_TO_SAVE = "jsonToSave";
const ACTION_SAVE_TO_JSON = "saveToJson";

function togglePleaseWait(action, status) {
    let isError = status instanceof Error;
    let message = "Complete";
    if (isError) {
        console.error(status);
        message = status.message;
    } else if (!status)
        message = "In progress";
    console.log("Status of \"" + action +  "\" changed to: " + message);
    let progressText = document.querySelector("#" + action + "Progress");
    progressText.innerHTML = message;
    return;
}

function mayBeBinary(str) {
    return str.includes("\uFFFE");
}
function toCrlf(str) {
    return str.replace(crlfRegex, "\r\n");
}
function fileError(message) {
    return new Error(message);
}
function onJSONRead(result) {
    result = result.trim().replace(/\0$/, ""); // file shit
    if (mayBeBinary(result))
        throw fileError("File contains unencodable characters, are you sure this is not a binary file?");
    let files = JSON.parse(result);
    let zip = new JSZip();
    for (const [fileName, fileContent] of Object.entries(files)) {
        if (fileName == "default") // GMS thing???
            continue;
        zip.file(fileName, toCrlf(fileContent));
    }
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            // see FileSaver.js
            saveAs(content, "save.zip");
    });
}
function onJSONToRawSubmit(event) {
    event.preventDefault();
    togglePleaseWait(ACTION_JSON_TO_SAVE, false);
    // .sav file
    const form = document.querySelector("#jsonToSaveForm");
    const fileInput = document.querySelector("#jsonToSaveFile");
    const file = fileInput.files[0];
    // read with Promise API
    file.text()
        .then(onJSONRead)
        .then(_ => togglePleaseWait(ACTION_JSON_TO_SAVE, true))
        .then(_ => form.reset())
        .catch(e => togglePleaseWait(ACTION_JSON_TO_SAVE, e));
    return false;
}
document.querySelector("#jsonToSaveForm").addEventListener("submit", onJSONToRawSubmit);

function onFileRead(result, fn) {
    if (mayBeBinary(result))
        throw fileError("File " + fn + " contains unencodable characters, are you sure it is not a binary file?");
    return result;
}
function processFiles(fileList) {
    if (!fileList.hasOwnProperty("default"))
        fileList["default"] = ""; // GMS stuff???
    let savFileContent = JSON.stringify(fileList);
    var savFile = new Blob([savFileContent], {type: "application/json;charset=utf-8"});
    saveAs(savFile, "undertale.sav");
}
async function onRawToJSONSubmit() {
    const form = document.querySelector("#saveToJsonForm");
    const filesInput = document.querySelector("#saveToJsonFiles");
    let fileList = {};
    try {
        for (i of filesInput.files) {
            let result = await i.text();
            fileList[i.name] = onFileRead(result, i.name);
        }
        processFiles(fileList);
        form.reset();
        togglePleaseWait(ACTION_SAVE_TO_JSON, true);
    } catch (e) {
        togglePleaseWait(ACTION_SAVE_TO_JSON, e);
    }
}
function onRawToJSONSubmitNotAsync(event) {
    event.preventDefault();
    togglePleaseWait(ACTION_SAVE_TO_JSON, false);
    onRawToJSONSubmit();
    return false;
}
document.querySelector("#saveToJsonForm").addEventListener("submit", onRawToJSONSubmitNotAsync);