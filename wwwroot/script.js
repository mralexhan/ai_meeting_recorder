//AI Stuff
let baseURL = "http://localhost:5000";
let password = "";

if (window.location.hostname !== "localhost") {
  baseURL = "https://openaitag-eda7ath0c2dheyfg.japaneast-01.azurewebsites.net";  // Replace with your actual Azure app URL
}

//handles the API (both login and openai)
async function handleAPI(prompt, pass, service) {
  const response = await fetch(`${baseURL}/openai/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, pass, service }),
  });

  const data = await response.json();

  if (data.success && prompt == ""){
    password = pass;
    document.getElementById("chooseService").style.display = "flex";
    document.getElementById("loginForm").style.display = "none";
    return null;
  }
  else if (data.success && prompt != ""){
    let json = "";
    //extracts the json from the openai response
    for(let i = 0; i < data.message.length; i++){
      if (data.message.indexOf("{") ==  i){
        json = data.message.substring(i, data.message.lastIndexOf("}") + 1);
      }
    }
    return json;
  }
  else{
    alert(data.message);
    return null;
  }

}

//handles the login form
document.getElementById("loginForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  let pass = document.getElementById("password").value;
  handleAPI("", pass, "");
});

//code for the document tagging
document.getElementById("enterPDF").addEventListener("click", ()=>{
  document.getElementById("tagger").style.display = "flex";
  document.getElementById("chooseService").style.display = "none";
});

//pdf display
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const fileInput = document.getElementById('formatfile');
const pdfContainer = document.getElementById('pdfContainer');

let extractedText = ""; //saves text extracted from pdf
let currentRender = 0; //saves which pdf is currently being rendered on screen
let indPDF = []; //saves individual pdfs into an array

let screenUploadBtn = document.getElementById("uploadTitle");
let actualUploadBtn = document.getElementById("uploadBtn");

// Handle the file input change event
fileInput.addEventListener('change', async (event) => {
  indPDF = []; //resets the individual pdfs every time the user selects new files
  const selectedFiles = event.target.files;
  screenUploadBtn.innerHTML = "Loading<div id='loader'></div>";

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    indPDF.push({}); //saves each individual pdf as an object into an array
    indPDF[i].filename = file.name.substring(0, file.name.length - 4); //gets the name of the file without the .pdf extension

    // Wrap FileReader in a Promise
    const pdfData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        resolve(new Uint8Array(e.target.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const pdf = await pdfjsLib.getDocument(pdfData).promise; // Use PDF.js to render the PDF
    
    indPDF[i].pdf = pdf;

    //does the text extract stuff
    extractedText += `\n File Name: ${indPDF[i].filename} \n`;
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum); // Wait for the page to be fetched

      // Extract and display text content from the page
      const textContent = await page.getTextContent();
      let text = '';
      textContent.items.forEach(function (item) {
        text += item.str + ' ';
      });

      extractedText += text;
    }
  }

  //sends extracted pdf text to OpenAI API and deals with the consequences
  handleAPI(extractedText, password, "tag").then(response =>{
    let responseJSON = JSON.parse(response); //parses the JSON returned by openai API
    //saves the tags, summaries, and dates into the individual file objects
    for(let i = 0; i < responseJSON.files.length; i++){
      console.log(responseJSON);
      indPDF[i].tags = responseJSON.files[i].tags;
      indPDF[i].summary = responseJSON.files[i].summary;
      const time = new Date();
      const month = String(time.getMonth() + 1).padStart(2, '0'); // pads a zero in the front of the month
      const day = String(time.getDate()).padStart(2, '0');
      const year = time.getFullYear();

      indPDF[i].date = `${month}-${day}-${year}`;
      document.getElementById("downloadCSV").style.display = "initial";
      if(indPDF.length > 1){
        document.getElementById("nextPDF").style.opacity = "1";
        document.getElementById("nextPDF").style.pointerEvents = "auto";
      }
    };

    createPDFSummary(indPDF[0].filename, indPDF[0].tags, indPDF[0].date, indPDF[0].summary);
    renderPDF(indPDF[0].pdf);
    
    screenUploadBtn.innerHTML = "Choose File to Upload";
    extractedText = ""; //resets the extractedText

  });
});

document.getElementById("prevPDF").addEventListener("click", ()=>{
  if(currentRender-1 >= 0){
    currentRender -= 1;
    renderPDF(indPDF[currentRender].pdf);
    createPDFSummary(indPDF[currentRender].filename, indPDF[currentRender].tags, indPDF[currentRender].date, indPDF[currentRender].summary);
    document.getElementById("nextPDF").style.opacity = "1";
    document.getElementById("nextPDF").style.pointerEvents = "auto";
    if(currentRender == 0){
      document.getElementById("prevPDF").style.opacity = "0";
      document.getElementById("prevPDF").style.pointerEvents = "none";
    }
  }

});

document.getElementById("nextPDF").addEventListener("click", ()=>{
  if(currentRender+1 < indPDF.length){
    currentRender += 1;
    renderPDF(indPDF[currentRender].pdf);
    createPDFSummary(indPDF[currentRender].filename, indPDF[currentRender].tags, indPDF[currentRender].date, indPDF[currentRender].summary);
    document.getElementById("prevPDF").style.opacity = "1";
    document.getElementById("prevPDF").style.pointerEvents = "auto";
    if(currentRender == indPDF.length-1){
      document.getElementById("nextPDF").style.opacity = "0";
      document.getElementById("nextPDF").style.pointerEvents = "none";
    }
  }
});

//deals with download csv button
document.getElementById("downloadCSV").addEventListener("click", ()=>{
  let data = [];
  data.push(["File Name", "Tags", "Summary", "Creation Date"]);

  for(let i = 0; i < indPDF.length; i++){
    data.push([escapeCSVField(indPDF[i].filename), escapeCSVField(indPDF[i].tags), escapeCSVField(indPDF[i].summary), escapeCSVField(indPDF[i].date)]);
  }

  const csvContent = data.map(row => row.join(",")).join("\n");

  // Create a Blob from the CSV string
  const blob = new Blob([csvContent], { type: "text/csv" });

  // Create a temporary link to download the Blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Free up memory

});

//deals with handling quotes, commas, and line breaks in the data when converting to csv
function escapeCSVField(field) {
  if (field == null) {
    return '';
  }
  //converts data to string
  let str;
  if (Array.isArray(field)){
    str = field.join(",");
  }
  else{
    str = field.toString();
  }
  // checks if the data includes commas, quotes, or line breaks
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

//function to render a pdf on screen
async function renderPDF(pdf){
  pdfContainer.innerHTML = ""; //clears previous contents
  // Loop through each page and render it
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum); // Wait for the page to be fetched

    const scale = window.innerWidth / 1500; // Adjust scale for better visibility
    const viewport = page.getViewport({ scale: scale });

    // Create a canvas element to render the page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    pdfContainer.appendChild(canvas); // Append the canvas to the container

    const context = canvas.getContext('2d'); // Get the rendering context

    // Render the page on the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    });
  }
}

function createPDFSummary(filename, tags, date, summary){
  let wordList = "";
  for(let i = 0; i < tags.length; i++){
    if(i != 0){
      wordList += ", " + tags[i];
    }
    else{
      wordList += tags[i];
    }
  }

  document.getElementById("name").innerHTML = "<b>File name: </b>" + filename;
  document.getElementById("date").innerHTML = "<b>Upload Date: </b>" + date;
  document.getElementById("keywords").innerHTML = "<b>Keywords: </b>" + wordList;
  document.getElementById("summary").innerHTML = "<b>Summary: </b>" + summary;
}






//code for the meeting recorder
document.getElementById("enterRecorder").addEventListener("click", ()=>{
  document.getElementById("meetingRecorder").style.display = "flex";
  document.getElementById("chooseService").style.display = "none";
});

//creates the AI generated summaries on the screen for the meeting recorder
function createRecordSummary(purpose, key_points, action_items){
  let bigHead = document.createElement("h1");
  bigHead.innerHTML = "Meeting Recorder";
  let breakLine = document.createElement("br");

  let purposeHead = document.createElement("h2");
  purposeHead.innerHTML = "Meeting Purpose: ";
  let purposeWords = document.createElement("p");
  purposeWords.innerHTML = purpose;
  let pointHead = document.createElement("h2");
  pointHead.innerHTML = "Key Points: "
  let bigList = document.createElement("ul");
  for(let i = 0; i < key_points.length; i++){
    let pointTitle = document.createElement("li");
    pointTitle.innerHTML = key_points[i].point_title;
    let smallList = document.createElement("ul");
    for(let j = 0; j < key_points[i].points.length; j++){
      let point = document.createElement("li");
      point.innerHTML = key_points[i].points[j];
      smallList.appendChild(point);
    }
    bigList.appendChild(pointTitle);
    bigList.appendChild(smallList);
  }
  let actionHead = document.createElement("h2");
  actionHead.innerHTML = "Action Items: ";
  let actionList = document.createElement("ul");
  for(let i = 0; i < action_items.length; i++){
    let action = document.createElement("li");
    action.innerHTML = action_items[i];
    actionList.appendChild(action);
  }

  let info = document.getElementById("extractedInfo");
  info.innerHTML = "";
  info.appendChild(bigHead);
  info.appendChild(breakLine);
  info.appendChild(purposeHead);
  info.appendChild(purposeWords);
  info.appendChild(pointHead);
  info.appendChild(bigList);
  info.appendChild(actionHead);
  info.appendChild(actionList);
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "0";
  });
}

//handles what happens when you upload an audio file
document.getElementById("audioFile").addEventListener("change", function(){
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "infinite";
  });

  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('audio', file);

  uploadAudio(formData).then(transcription =>{
    handleAPI(transcription, password, "record").then(result =>{
      let responseJSON = JSON.parse(result);
      createRecordSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
    });
  });
});

async function startRecord() {
  const response = await fetch('/record/start', {
      method: 'POST'
  });
  const data = await response.json();
  console.log(data.message);
}

async function stopRecord() {
  const response = await fetch('/record/stop', {
      method: 'POST'
  });
  const blob = await response.blob();
  const file = new File([blob], "audiofile.wav", { type: blob.type});
  const formData = new FormData();
  formData.append('audio', file);

  console.log("Recording Ended");
  
  return formData;
}

//handles what happens when you click the record button
document.getElementById("recordBtn").addEventListener("click", ()=>{
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "infinite";
  });
  document.getElementById("recordBtn").style.display = "none";
  document.getElementById("stopRecord").style.display = "flex";

  startRecord();
  document.getElementById("status").innerHTML = "Recording...";
});

//handles what happens when you click the stop record button
document.getElementById("stopRecord").addEventListener("click", ()=>{
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "0";
  });
  document.getElementById("stopRecord").style.display = "none";
  document.getElementById("recordBtn").style.display = "flex";

  stopRecord().then(audio =>{
    uploadAudio(audio).then(transcription =>{
    handleAPI(transcription, password, "record").then(result =>{
      let responseJSON = JSON.parse(result);
      createRecordSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
    });
  });
  })
});

//handles sending the audio file to the backend to be processed
async function uploadAudio(formData) {
  document.getElementById("status").innerHTML = "Processing Upload...";
  const response = await fetch('/upload', {
      method: 'POST',
      body: formData
  });

  const data = await response.json();
  document.getElementById("status").innerHTML = "Audio Processing Complete; Retrieving Information...";
  console.log(data.transcription.replace(/\uFFFD/g, ''));
  return data.transcription.replace(/\uFFFD/g, '');
}