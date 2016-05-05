"use strict";
var Pages = require('./pages.js');

// The parts of the html
var loadInput;
var loadButton;

// Creates a title page object
function TitlePage(){
	
}

//prototype
var p = TitlePage.prototype;

p.open = function(){
	
	// Delete the current zip if one
	this.caseZip = null;
	
	// Set the html to this page
	document.body.innerHTML = Pages.TitlePage;
	
	// Get the parts of the html
	loadInput = document.getElementById('load-input');
	loadButton = document.getElementById('load-button');
	
	// When click the load button call the load input
	loadButton.onclick = function() {
		loadInput.click();
	}
	
	// add the input listener
	loadInput.addEventListener('change', this.inputChange.bind(this));
}

p.inputChange = function(event){
	
	// Make sure a ipar file was choosen
	if(!loadInput.value.match(/.+\.ipar$/)){
		alert("You didn't choose an ipar file! you can only load ipar files!");
		return;
	}

	// Set the button to disabled so that it can't be pressed while loading
	loadButton.disabled = true;
	loadInput.disabled = true;
	
	// Create a reader and read the zip
	var reader = new FileReader();
	var page = this;
	reader.onload = function(event){
		
		// Save the zip of the data
		JSZip.loadAsync(event.target.result).then(function(zip){
			page.caseZip = zip;
			page.close();
		});
		
	};
	reader.readAsArrayBuffer(event.target.files[0]);
	
}

p.close = function(){
	document.body.innerHTML = '';
	if(this.onclose)
		this.onclose();
}

module.exports = TitlePage;    