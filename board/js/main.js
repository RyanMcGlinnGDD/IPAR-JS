"use strict";
var TitlePage = require('./modules/titlePage.js');
var CasePage = require('./modules/casePage.js');
var ProfilePage = require('./modules/profilePage.js');
var BoardPage = require('./modules/boardPage.js');

// All the pages
var titlePage;
var casePage;
var profilePage;
var boardPage;

// Create all pages and then display the title on load
window.onload = function(e){
	
	createPages(function(){
		
		titlePage.open();
		
	});
	
}

// Create all pages
function createPages(callback){
	
	// Counter for callbacks
	var callbackCount = 0, callbackTotal = 1;
	
	// Create the title page
	callbackTotal++;
	titlePage = new TitlePage(function(){
		
		titlePage.onclose = function(){
			casePage.open(titlePage.caseZip);
		};
		
		if(++callbackCount>=callbackTotal && callback)
			callback();
	});
	
	// Create the case page
	callbackTotal++;
	casePage = new CasePage(function(){
		
		casePage.onclose = function(){
			switch(casePage.next){
			case CasePage.NEXT_TYPE.RESUME:
				profilePage.open(titlePage.caseZip, false);
				break;
			case CasePage.NEXT_TYPE.NEW:
				profilePage.open(titlePage.caseZip, true);
				break;
			case CasePage.NEXT_TYPE.BACK:
				titlePage.open();
				break;
			}
		};
		
		if(++callbackCount>=callbackTotal && callback)
			callback();
	});
	
	// Create the profile page
	callbackTotal++;
	profilePage = new ProfilePage(function(){
		
		profilePage.onclose = function(){
			switch(profilePage.next){
			case ProfilePage.NEXT_TYPE.NEXT:
				boardPage.open(profilePage.caseZip);
				break;
			case ProfilePage.NEXT_TYPE.BACK:
				casePage.open(titlePage.caseZip);
				break;
			}
		};
		
		if(++callbackCount>=callbackTotal && callback)
			callback();
	});
	
	// Create the board page
	callbackTotal++;
	boardPage = new BoardPage(function(){
		
		boardPage.onclose = function(){
			titlePage.open();
		};
		
		if(++callbackCount>=callbackTotal && callback)
			callback();
	});
	
	// Call the callback if all pages have loaded otherwise wait
	if(++callbackCount>=callbackTotal && callback)
		callback();
}

// Make sure the player knows they will lose everything on exit
window.onbeforeunload = function (event) {
	var message = 'Are you sure you want to quit? You will lose all unsaved data!';
	event = event || window.event;
	if(event)
		event.returnValue = message;
	return message;
}