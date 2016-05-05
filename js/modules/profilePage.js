"use strict";
var Utilities = require('./utilities.js');
var Pages = require('./pages.js');

// The parts of the html
var firstNameInput;
var lastNameInput;
var emailInput;
var backButton;
var proceedButton;

var saveFile;

//Creates a case page object
function ProfilePage(callback){
	
}

ProfilePage.NEXT_TYPE = Object.freeze({NEXT: 0, BACK: 1});

//prototype
var p = ProfilePage.prototype;

// Open the page
p.open = function(caseZip, isNew){
	
	// Set the html to this page
	document.body.innerHTML = Pages.ProfilePage;
	
	// Save the zip for when saving
	this.caseZip = caseZip;
	
	// Get the save file
	var page = this;
	saveFile = Utilities.getXMLFromZip(this.caseZip, 'case\\active\\saveFile.ipardata', function(xml){
		
		saveFile = xml;
		
		// Check if new profile or not
		if(isNew)
			page.displayNew();
		else
			page.displaySave();
		
		// Setup the buttons
		backButton = document.getElementById("back-button");
		backButton.onclick = function(){
			page.next = ProfilePage.NEXT_TYPE.BACK;
			page.close();
		};
		proceedButton = document.getElementById("proceed-button");
		proceedButton.onclick = function(){
			if(firstNameInput!=null)
				page.save();
			page.next = ProfilePage.NEXT_TYPE.NEXT;
			page.close();
		};
		
	});
	
}

p.displayNew = function(){
	
	// Update the title
	document.getElementById("title").innerHTML = "Enter "+document.getElementById("title").innerHTML;
	document.title = document.getElementById("title").innerHTML;
	
	// Create the inputs for first, last, and email
	firstNameInput = document.createElement("input");
	document.getElementById("first-name").appendChild(firstNameInput);
	lastNameInput = document.createElement("input");
	document.getElementById("last-name").appendChild(lastNameInput);
	emailInput = document.getElementById("input-email");
	
	// Make it so that proceed is disabled until all three inputs have values
	var checkProceed = function(){
		var proceedButton = document.getElementById("proceed-button");
		if(firstNameInput.value=="" ||
			lastNameInput.value=="" ||
			emailInput.value=="")
			proceedButton.disabled = true;
		else
			proceedButton.disabled = false;
	};
	firstNameInput.addEventListener('change', checkProceed);
	lastNameInput.addEventListener('change', checkProceed);
	emailInput.addEventListener('change', checkProceed);
	checkProceed();
	
}

p.displaySave = function(){
	
	// Get the save's case
	var curCase = saveFile.getElementsByTagName("case")[0];
	
	// Update the title
	document.getElementById("title").innerHTML = "Confirm "+document.getElementById("title").innerHTML;
	document.title = document.getElementById("title").innerHTML;
	
	// Hide the email and display the current name
	document.getElementById("email").style.display = 'none';
	var firstName = document.getElementById("first-name");
	firstName.innerHTML = curCase.getAttribute("profileFirst");
	firstName.style.fontWeight = 'bold';
	var lastName = document.getElementById("last-name");
	lastName.innerHTML = curCase.getAttribute("profileLast");
	lastName.style.fontWeight = 'bold';
	
}

// Save the data in the inputs to the save file
p.save = function(callback){
	
	// Change the profile values in the save xml
	var curCase = saveFile.getElementsByTagName("case")[0];
	curCase.setAttribute("caseStatus", "1");
	curCase.setAttribute("profileFirst", firstNameInput.value);
	curCase.setAttribute("profileLast", lastNameInput.value);
	curCase.setAttribute("profileMail", emailInput.value);
	var questions = curCase.getElementsByTagName("question");
	for(var i=0;i<questions.length;i++)
		questions[i].setAttribute("positionPercentX", "-1");
	var xmlFinal = new XMLSerializer().serializeToString(saveFile);
	
	// Write the result back to file
	this.caseZip.file('case/active/saveFile.ipardata', xmlFinal);
	
}

p.close = function(){
	document.body.innerHTML = '';
	if(this.onclose)
		this.onclose();
}

module.exports = ProfilePage;   