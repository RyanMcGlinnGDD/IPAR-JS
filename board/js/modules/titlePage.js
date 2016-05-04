"use strict";

//Html and its parts
var html;
var loadInput;
var loadButton;

// Creates a title page object and loads it
function TitlePage(callback){
	
	// Get the html for the title page
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the HTML
	    	html = request.responseText;
	    	if(callback)
	    	  callback();
	    }
	}
	request.open("GET", "title.html", true);
	request.send();
	
}

//prototype
var p = TitlePage.prototype;

p.open = function(){
	
	// Delete the current zip if one
	this.caseZip = null;
	
	// Set the html to this page
	document.body.innerHTML = html;
	
	// Get the parts of the html
	loadInput = document.getElementById('load-input');
	loadButton = document.getElementById('load-button');
	
	// When click the load button call the load input
	loadButton.onclick = function() {
		loadInput.click();
	}
	
	// add the input listener
	loadInput.addEventListener('change', this.inputChange);
}

p.inputChange = function(e){
	
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
		page.caseZip = new JSZip(message.data);
		page.close();
		
	};
	reader.readAsArrayBuffer(event.target.files[0]);
	
}

p.close = function(){
	document.body.innerHTML = '';
	if(this.onclose)
		this.onclose();
}

module.exports = TitlePage;    