// CONSTS
const BETTIME = 14;

// Global or say client local variables.
let timerId;
let websocket;
let wsUri;
let debug_cache;
let state = "";
let state_id = "";
let raiseToCall = false;
let community = new Array();
let debug_comm;
let hand = new Array();

// VARIABLES
// Element caches.
// >>>--------------------------------------------
let stateDiv = document.querySelector("#state");
let timerCount = document.querySelector("#count");
let outputDiv = document.querySelector("#output");

let communityDiv = document.querySelector("#community");
let handDiv = document.querySelector("#hand");

let connBtn = document.querySelector("#conn");
let disBtn = document.querySelector("#dis");

let checkBtn = document.querySelector("#check");
let raiseBtn = document.querySelector("#raise");
let foldBtn = document.querySelector("#fold");
let msgBtn = document.querySelector("#msg");
// --------------------------------------------<<<

// EVENT
// Event listeners
// >>>--------------------------------------------
connBtn.addEventListener('click', () => {
	wsUri = document.querySelector("#url").value;
	createSocket();
});

disBtn.addEventListener('click', () => {
	websocket.close();
});

checkBtn.addEventListener('click', () => {
	let obj = CreateRequest("Check", 0);
	disableButtons(true);
	websocket.send(JSON.stringify(obj));
});

raiseBtn.addEventListener('click', () => {
	let obj; 
	if (!raiseToCall) {
		obj = CreateRequest("Raise", 1);
	} else {
		obj = CreateRequest("Call", 1);
		raiseToCall = false;
		raiseBtn.textContent = "Raise";
	}
	disableButtons(true);
	websocket.send(JSON.stringify(obj));
});

foldBtn.addEventListener('click', () => {
	let obj = CreateRequest("Fold", null);
	disableButtons(true);
	websocket.send(JSON.stringify(obj));
});

msgBtn.addEventListener('click', () => {
	let obj = CreateRequest("Message", null);
	disableButtons(true);
	websocket.send(JSON.stringify(obj));
});
// --------------------------------------------<<<

function CreateRequest(action, value) {
	// value is an object not a key
	// which is interpreted as option in rust server side.
	let obj = { "state_id": state_id ,"action": action , value: value};
	return obj;
}

function init()
{
	// Initialization
	disableButtons(true);
	disBtn.disabled = true;
}

function createSocket()
{
	websocket = new WebSocket(wsUri);
	websocket.onopen = function(evt) { onOpen(evt) };
	websocket.onclose = function(evt) { onClose(evt) };
	websocket.onmessage = function(evt) { onMessage(evt) };
	websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt)
{
	writeToScreen("CONNECTED");
	connBtn.disabled = true;
	disBtn.disabled = false;
	//doSend("WebSocket rocks");
}

function onError(evt)
{
	writeToScreen('<span style="color: red;">ERROR:</span> ' + evt.data);
}

function onClose(evt)
{
	writeToScreen("DISCONNECTED");
	clearInterval(timerId);
	disableButtons(true);
	connBtn.disabled = false;
	disBtn.disabled = true;
}

function onMessage(evt)
{
	writeToScreen('<span style="color: blue;">RESPONSE: ' + evt.data+'</span>');
	let json = JSON.parse(evt.data);
	switch (json.response_type) {
		// Save State
		case 'State':
			state = json.value.State[0];
			state_id = json.value.State[1];
			stateDiv.textContent = state;
			timeOut();
			disableButtons(false);
			break;
		case 'Community':
			console.log(json.value);
			updateCommunity(json.value.Card)
			break;
		case 'Hand':
			updateHand(json.value.Card)
			break;
		case 'Message':
			break;
		case 'Raise':
			timeOut();
			raiseBtn.textContent = "Call";
			raiseBtn.disabled = false;
			raiseToCall = true;
			break;
		case 'Delay':
			timeOut();
			break;
		
		default:
			break;
	}
	// DEBUG
	// This is to be debuggfed from browser
	debug_cache = evt.data;
}

function disableButtons(bool) {
	checkBtn.disabled = bool;
	raiseBtn.disabled = bool;
	foldBtn.disabled = bool;
}

function timeOut() {
	// it should be undefined if it's first to using timeOut
	clearInterval(timerId);
	timerCount.textContent = BETTIME;
	timerId = setInterval(displayTime, 1000);
}

// communiyCards : any[]
function updateCommunity(communityCards) {
	// TODO make this work
	debug_comm = communityCards;
	community = community.concat(communityCards);
	community.forEach((card) => {
		console.log(card);
		communityDiv.appendChild(getCardElem(card));
	});
}

// handCards : any[]
function updateHand(handCards) {
	// TODO make this work
	hand = hand.concat(handCards);
	hand.forEach((card) => {
		handDiv.appendChild(getCardElem(card));
	});
}

function getCardElem(cardObject) {
	let elem = document.createElement("div");
	elem.textContent = cardObject.card_type + " / " + cardObject.number;
	return elem;
}

function displayTime() {
	// TODO :: Check if parseInt fails
	let time = parseInt(timerCount.textContent);
	timerCount.textContent = time - 1;

	if (time - 1 <= 0) {
		clearInterval(timerId);
	}
}

function writeToScreen(message)
{
	var pre = document.createElement("p");
	pre.style.wordWrap = "break-word";
	pre.innerHTML = message;
	outputDiv.appendChild(pre);
}

window.addEventListener("load", init, false);


