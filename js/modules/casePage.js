"use strict";
var Utilities = require('./utilities.js');
var Pages = require('./pages.js');

var caseStatus = '0';

// Creates a case page object
function CasePage(callback){
	
}

CasePage.NEXT_TYPE = Object.freeze({RESUME: 0, NEW: 1, BACK: 2});

//prototype
var p = CasePage.prototype;

// Open the page
p.open = function(caseZip){
	
	// Set the html to this page
	document.body.innerHTML = Pages.CasePage;
	
	// Keep track if page is fully loaded
	var loaded = false;
	var page = this;
	// Load the case file
	Utilities.getXMLFromZip(caseZip, 'case\\active\\caseFile.ipardata', function(xml){
		page.displayCase(xml);
		
		// Setup the buttons on full page load
		if(loaded)
			page.setupButtons();
		else
			loaded = true;
	});
	
	// Load the save file
	Utilities.getXMLFromZip(caseZip, 'case\\active\\saveFile.ipardata', function(xml){
		page.displaySave(xml);
		
		// Setup the buttons on full page load
		if(loaded)
			page.setupButtons();
		else
			loaded = true;
	});
	
}

p.setupButtons = function(){
	
	var page = this;
	document.getElementById("resume-button").onclick = function(){
		page.next = CasePage.NEXT_TYPE.RESUME;
		page.close();
	}
	document.getElementById("start-button").onclick = function(){
		page.next = CasePage.NEXT_TYPE.NEW;
		page.close();
	}
	document.getElementById("back-button").onclick = function(){
		page.next = CasePage.NEXT_TYPE.BACK;
		page.close();
	}
	
}

p.displayCase = function(xml){
	
	// Get the case name and description from the xml
	var curCase = xml.getElementsByTagName("case")[0];
	document.getElementById("title").innerHTML = curCase.getAttribute("caseName")+document.getElementById("title").innerHTML;
	document.title = document.getElementById("title").innerHTML;
	document.getElementById("description").innerHTML = curCase.getAttribute("description");
	
}

p.displaySave = function(xml){
	
	// Display the state of the save file from the xml
	caseStatus = xml.getElementsByTagName("case")[0].getAttribute("caseStatus");
	var statusMessage = "";
	switch(caseStatus){
		case '0':
			statusMessage = "";
			document.getElementById("resume-button").disabled = true;
			break;
		case '1':
			statusMessage = " [In Progress]";
			break;
		case '2':
			statusMessage = " [Completed]";
			break;
	}
    document.getElementById("title").innerHTML += statusMessage;
	
}

p.close = function(){
	document.body.innerHTML = '';
	if(this.onclose)
		this.onclose();
}

module.exports = CasePage;   