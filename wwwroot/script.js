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
async function uploadAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('audio', file);

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
  pointHead.innerHTML = "Key Points;"
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

  uploadAudio().then(transcription =>{
    handleAPI(transcription, password).then(result =>{
      let responseJSON = JSON.parse(result);
      createSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
    });
  })
});


//deals with the recording part
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
//determines recognition language based on dropdown selection
var selector = document.getElementById("languageDrop");
var selectedLang = selector.value;
recognition.lang = "en-US";
recognition.continuous = true;
var transStore = [];

selector.addEventListener("change", function(){
  var selectedLang = this.value;
  console.log(selectedLang);
  if (selectedLang == "English"){
    recognition.lang = "en-US";
    taskInput.placeholder = "Hello, what would you like to talk about today?"
  }
  if (selectedLang == "Chinese"){
    recognition.lang = "zh-TW"; 
    taskInput.placeholder = "你好，你今天想聊些什麼？"
  }
  if (selectedLang == "Japanese"){
    recognition.lang = "ja";
    taskInput.placeholder = "こんにちは、今日は何を話したいですか？"
  }
  if (selectedLang == "German"){
    recognition.lang = "de";
    taskInput.placeholder = "Hallo, worüber möchtest du heute sprechen?"
  }
  if (selectedLang == "French"){
    recognition.lang = "fr";
    taskInput.placeholder = "Bonjour, de quoi veux-tu parler aujourd'hui ?"
  }
  if (selectedLang == "Italian"){
    recognition.lang = "it";
    taskInput.placeholder = "Ciao, di cosa vuoi parlare oggi?"
  }
  if (selectedLang == "Spanish"){
    recognition.lang = "es";
    taskInput.placeholder = "Hola, ¿de qué te gustaría hablar hoy?"
  }
});

//stores every part of the recording into the transcript storage
recognition.onresult = (event) => {
    const transcript = event.results[event.resultIndex][0].transcript;
    transStore.push(transcript);
};

//handles what happens when you click the record button
document.getElementById("recordBtn").addEventListener("click", ()=>{
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "infinite";
  });
  document.getElementById("recordBtn").style.display = "none";
  document.getElementById("stopRecord").style.display = "flex";

  recognition.start();
  document.getElementById("status").innerHTML = "Recording...";
});

//handles what happens when you click the stop record button
document.getElementById("stopRecord").addEventListener("click", ()=>{
  document.querySelectorAll(".box").forEach((box) =>{
    box.style.animationIterationCount = "0";
  });
  document.getElementById("stopRecord").style.display = "none";
  document.getElementById("recordBtn").style.display = "flex";

  recognition.stop();

  let transcript = "";
  for(let i = 0; i < transStore.length; i++){
    transcript += transStore[i];
  }

  document.getElementById("status").innerHTML = "Generating Response from AI...";

  handleAPI(transcript, password).then(result =>{
    let responseJSON = JSON.parse(result);
    createSummary(responseJSON.purpose, responseJSON.key_points, responseJSON.action_items);
  })
});