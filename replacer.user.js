// ==UserScript==
// @name        Custom Server für City Guesser
// @namespace   Violentmonkey Scripts
// @match       https://virtualvacation.us/private-room*
// @grant       none
// @version     1.0
// @author      Profi
// @description Custom Server für City Guesser
// ==/UserScript==

let _socketReplaceInterval = setInterval(() => {
	// haben wir jetzt socket?
	if (!socket) return;
	console.log("Got socket");
	socket.io.uri = "http://localhost:6969";
	socket.disconnect().connect();
  
	clearInterval(_socketReplaceInterval);
	delete _socketReplaceInterval;
  }, 50);