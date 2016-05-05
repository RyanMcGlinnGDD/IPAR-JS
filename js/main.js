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
document.addEventListener('DOMContentLoaded', function() {
	
	createPages();
	titlePage.open();
	
});

// Create all pages
function createPages(){
	
	// Create the title page
	titlePage = new TitlePage();
	titlePage.onclose = function(){
		casePage.open(titlePage.caseZip);
	};
		
	
	// Create the case page
	casePage = new CasePage();
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
	
	// Create the profile page
	profilePage = new ProfilePage();
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
	
	// Create the board page
	boardPage = new BoardPage();
	boardPage.onclose = function(){
		titlePage.open();
	};
	
}

// Make sure the player knows they will lose everything on exit
window.onbeforeunload = function (event) {
	var message = 'If you reload you will lose all unsaved data!';
	event = event || window.event;
	if(event)
		event.returnValue = message;
	else
		return message;
}