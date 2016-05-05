"use strict";
var Question = require("./question.js");
var Utilities = require("./utilities.js");

// Creates a category with the given name and from the given xml
function Resource(xml, caseZip, callback){
	
	// First get the icon
	  var type = parseInt(xml.getAttribute("type"));
	  switch(type){
	    case 0:
	      this.icon = 'img/iconResourceFile.png';
	      break;
	    case 1:
	      this.icon = 'img/iconResourceLink.png';
	      break;
	    case 2:
    	  this.icon = 'img/iconResourceVideo.png';
	      break;
	    default:
	      this.icon = '';
	      break;
	  }

	  // Next get the title
	  this.title = xml.getAttribute("text");

	  // Last get the link
	  if(type>0){
	    this.link = xml.getAttribute("link");
	    if(callback)
	    	callback();
	  }
	  else{
		  var resource = this;
		  Utilities.getBlob(caseZip, 'case\\assets\\files\\'+xml.getAttribute("link").replace(/\//g, '\\'), function(blob){
			  var URL = window.URL || window.webkitURL
			  URL.createObjectURL(blob);
			  resource.link = URL;
			  if(callback)
				  callback();
		  });
	  }
    
}

module.exports = Resource;