'use strict'

// Env variables
// This is updated from server.
let bet_time = 14;
let default_hp = 30;
let initial_bet = 2; // Currently this is not given from server.
const CREATE_ADDRESS = "ws://localhost:3030/create";
const JOIN_ADDRESS = "ws://localhost:3030/join/";

// TODO Make class instance which includes all variables below.

// Global or say client local variables.
let event_log;
let timerId;
let websocket;
let wsUri;
let state = "";
let state_id = "";
let raiseToCall = false;
let community = new Array();
let hand = new Array();

let opp_hp;
let current_hp;

// VARIABLES
// Element caches.
// >>>--------------------------------------------
let hpDiv = document.querySelector("#hp");
let oppHpDiv = document.querySelector("#oppHp");
let betsDiv = document.querySelector("#bets");
let stateDiv = document.querySelector("#state");
let timerCount = document.querySelector("#count");
let outputDiv = document.querySelector("#output");
let logDiv = document.querySelector("#log");

let communityDiv = document.querySelector("#community");
let handDiv = document.querySelector("#hand");

let createBtn = document.querySelector("#create");
let joinBtn = document.querySelector("#join");
let disBtn = document.querySelector("#dis");
let roomIdInput = document.querySelector("#roomId");
let copyBtn = document.querySelector("#copy");

let checkBtn = document.querySelector("#check");
let raiseBtn = document.querySelector("#raise");
let foldBtn = document.querySelector("#fold");
// --------------------------------------------<<<

// EVENT
// Event listeners
// >>>--------------------------------------------
createBtn.addEventListener('click', ()=> {
	joinBtn.disabled = true;
	wsUri = CREATE_ADDRESS;
	createSocket();
	displayLog("Connected to room");
}, false);

joinBtn.addEventListener('click', () => {
	// TODO 
	// If roomId is not empty, try connect
	// If not deny.
	if (roomIdInput.value === "") {
		displayLog("No roomId is given to join");
		return;
	}
	roomIdInput.readOnly = true;
	clearLog();
	let roomId = roomIdInput.value;
	wsUri = JOIN_ADDRESS + roomId;
	createSocket();
	displayLog("Connected to room");
});

disBtn.addEventListener('click', () => {
	websocket.close();
});

checkBtn.addEventListener('click', () => {
	let obj = CreateRequest("Check", 0);
	disableButtons(true);
	websocket.send(JSON.stringify(obj));
});

copyBtn.addEventListener('click', () => {
	copyBtn.textContent = "Copy room id ✓";
}, false);

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

// --------------------------------------------<<<

function CreateRequest(action, value) {
	// value is an object not a key
	// which is interpreted as option in rust server side.
	let obj = { "state_id": state_id ,"action": action , value: value};
	return obj;
}

function init()
{
	// Enable clipboard.
	// This should require cdn script to be imported.
	new ClipboardJS('#copy');
	// Initialization
	disableButtons(true);
	disBtn.disabled = true;
	betsDiv.textContent = initial_bet;

	//hpDiv.textContent = default_hp;
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
	reset();
	writeToBackLog("CONNECTED");
	createBtn.disabled = true;
	joinBtn.disabled = true;
	disBtn.disabled = false;
	clearLog();
	displayLog("Connected to game");
}

function reset() {
	community = new Array();
	hand = new Array();
	state = "";
	state_id = "";
	raiseToCall = false;
}

function onError(evt)
{
	writeToBackLog('<span style="color: red;">ERROR:</span> ' + evt.data);
	displayLog("Failed to connect to server");
	roomIdInput.readOnly = false;
}

function onClose(evt)
{
	console.log("DISCONNECTED");
	writeToBackLog("DISCONNECTED");
	displayLog("Disconnected", true);
	clearInterval(timerId);
	disableButtons(true);
	createBtn.disabled = false;
	joinBtn.disabled = false;
	disBtn.disabled = true;
	roomIdInput.readOnly = false;
}

function onMessage(evt)
{
	writeToBackLog('<span style="color: blue;">RESPONSE: ' + evt.data+'</span>');
	console.log(evt.data);
	let json;
	try {
		json = JSON.parse(evt.data);
	} catch {
		// Received non json message;
		return;
	}
	switch (json.response_type) {
		// Save State
		case 'RoomId':
			roomIdInput.value = json.value.Message;
			roomIdInput.readOnly = true;
			break;
		case 'Env':
			default_hp = json.value.Env.hp;
			bet_time = json.value.Env.bet_time - 1;
			current_hp = default_hp;
			opp_hp = default_hp;
			hpDiv.textContent = current_hp;
			oppHpDiv.textContent = opp_hp;
			break;
		case 'State':
			updateState(json.value);
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
		case 'Error':
			clearLog();
			displayLog(json.value.Message);
			break;
		case 'Raise':
			timeOut();
			raiseBtn.textContent = "Call";
			raiseBtn.disabled = false;
			raiseToCall = true;
			checkBtn.disabled = true;
			displayLog("Opponent has raised. Call?")
			break;
		case 'Delay':
			timeOut();
			break;
		case 'BetResult':
			betsDiv.textContent = json.value.BetResult.total_bet;
			displayLog("Opponent's action : " + json.value.BetResult.opponent_action);
			break;
		case 'RoundResult':
			var result = json.value.RoundResult;
			opp_hp = result.opp_hp;
			current_hp = result.hp;
			oppHpDiv.textContent = opp_hp;
			hpDiv.textContent = current_hp;

			let logString = "";
			// TODO ::: Log informations 
			if ( result.win === null ) {
				logString += "Draw<br/>";
			} else if (result.win) {
				logString += "You've won<br/>";
			} else {
				logString += "You've lost";
				if (result.fold) {
					logString += "(Fold)<br/>";
				} else {
					logString += "<br/>";
				}
			}

			if (!result.fold) 
				logString += "You played : " + result.comb + "<br/>";
			if (!result.opp_fold) {
				logString += "Opponent played : " + result.opp_comb + "<br/>";
			} else {
				logString += "Opponent folded.<br/>";
			}

			displayLog(logString);
			break;

		case 'GameResult':
			if (json.value.GameResult) {
				displayLog("You won a game!", true);
			} else {
				displayLog("You lost a game", true);
			}
			// Disable timer
			clearInterval(timerId);

			break;
		
		default:
			break;
	}
	//// DEBUG
	//// This is to be debugged from browser
	//debug_cache = evt.data;
}

function displayLog(text, additive = false) {
	if (additive) {
		logDiv.innerHTML += "<br/> " + text;
	} else {
		logDiv.innerHTML = text;
	}
}

function clearLog() {
	logDiv.innerHTML = "";
}

function updateState(stateObject) {
	raiseBtn.textContent = "Raise";
	state = stateObject.State[0];
	state_id = stateObject.State[1];
	stateDiv.textContent = state;
	clearInterval(timerId);
	// Ignore timeout when showdown.
	if (state === "ShowDown") {
		timerCount.textContent = "Showdown";
		disableButtons(true);
		reset();
	} 
	else {
		if (state === "Flop") {
			outputDiv.textContent = "";
		}
		timeOut();
		disableButtons(false);
	}
}

function disableButtons(bool) {
	checkBtn.disabled = bool;
	raiseBtn.disabled = bool;
	foldBtn.disabled = bool;
}

function timeOut() {
	// it should be undefined if it's first to using timeOut
	clearInterval(timerId);
	timerCount.textContent = "Showdown";
	timerCount.textContent = bet_time;
	timerId = setInterval(displayTime, 1000);
}

// communiyCards : any[]
function updateCommunity(communityCards) {
	communityDiv.textContent = '';
	community = community.concat(communityCards);
	community.forEach((card) => {
		console.log(card);
		communityDiv.appendChild(getCardElem(card));
	});
}

// handCards : any[]
function updateHand(handCards) {
	handDiv.textContent = '';
	hand = hand.concat(handCards);
	hand.forEach((card) => {
		handDiv.appendChild(getCardElem(card));
	});
}

function getCardElem(cardObject) {
	let wrapper = document.createElement("div");
	wrapper.style = "margin-right: 15px; display:inline-block;";
	let parentElem = document.createElement("div");
	parentElem.style = `
		display: table-cell;
		vertical-align: middle;
		text-align: center;
		width: 50px; 
		height: 80px; 
		color: black;
		border-style: solid;
		border-width: 2px;
	`;
	let cardTypeText = document.createElement("span");
	let cardNumberText = document.createElement("span");
	wrapper.appendChild(parentElem);
	parentElem.appendChild(cardTypeText);
	parentElem.appendChild(cardNumberText);

	switch (cardObject.card_type) {
		// Cases are all pascal case
		case 'Spade':
			parentElem.style.color = "black";
			cardTypeText.textContent = "♠";
			break;
		case 'Heart':
			parentElem.style.color = "red";
			cardTypeText.textContent = "♥";
			break;
		case 'Diamond':
			parentElem.style.color = "blue";
			cardTypeText.textContent = "♦";
			break;
		case 'Clover':
			parentElem.style.color = "darkgreen";
			cardTypeText.textContent = "♣";
			break;
		default:
			break;
	}

	switch (cardObject.number) {
		case 11:
			cardNumberText.textContent = "J";
			break;
		case 12:
			cardNumberText.textContent = "Q";
			break;
		case 13:
			cardNumberText.textContent = "K";
			break;
		default:
			cardNumberText.textContent = cardObject.number;
			break;
	}

	return wrapper;
}

function displayTime() {
	// TODO :: Check if parseInt fails
	let time = parseInt(timerCount.textContent);
	timerCount.textContent = time - 1;

	if (time - 1 <= 0) {
		clearInterval(timerId);
	}
}

function writeToBackLog(message)
{
	var pre = document.createElement("p");
	pre.style.wordWrap = "break-word";
	pre.innerHTML = message;
	outputDiv.appendChild(pre);
}

window.addEventListener("load", init, false);


