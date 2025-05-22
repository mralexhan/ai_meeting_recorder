//AI Stuff
let baseURL = "http://localhost:5000";
let password = "";

if (window.location.hostname !== "localhost") {
  baseURL = "https://openaitag-eda7ath0c2dheyfg.japaneast-01.azurewebsites.net";  // Replace with your actual Azure app URL
}

//handles the login form
document.getElementById("loginForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  let pass = document.getElementById("password").value;
  handleAPI("", pass);
});

//handles the API (both login and openai)
async function handleAPI(prompt, pass) {
  const response = await fetch(`${baseURL}/openai/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, pass }),
  });

  const data = await response.json();

  if (data.success && prompt == ""){
    password = pass;
    document.getElementById("soundThings").style.display = "flex";
    document.getElementById("extractedInfo").style.display = "initial";
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

//creates the AI generated summaries on the screen
function createSummary(purpose, key_points, action_items){
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
    handleAPI(transcription, password).then(result =>{
      let responseJSON = JSON.parse(result);
      createSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
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
    handleAPI(transcription, password).then(result =>{
      let responseJSON = JSON.parse(result);
      createSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
    });
  });
  })
});