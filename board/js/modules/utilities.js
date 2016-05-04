"use strict";
var Point = require('./point.js');

//Module export
var m = module.exports;

// returns mouse position in local coordinate system of element
m.getMouse = function(e){
    return new Point((e.pageX - e.target.offsetLeft), (e.pageY - e.target.offsetTop));
}

//returns a value relative to the ratio it has with a specific range "mapped" to a different range
m.map = function(value, min1, max1, min2, max2){
    return min2 + (max2 - min2) * ((value - min1) / (max1 - min1));
}

//if a value is higher or lower than the min and max, it is "clamped" to that outer limit
m.clamp = function(value, min, max){
    return Math.max(min, Math.min(max, value));
}

//determines whether the mouse is intersecting the active element
m.mouseIntersect = function(pMouseState, pElement, pOffsetter){
    if(pMouseState.virtualPosition.x > pElement.position.x - pElement.width/2 - pOffsetter.x && pMouseState.virtualPosition.x < pElement.position.x + pElement.width/2 - pOffsetter.x){
        if(pMouseState.virtualPosition.y > pElement.position.y - pElement.height/2 - pOffsetter.y && pMouseState.virtualPosition.y < pElement.position.y + pElement.height/2 - pOffsetter.y){
            //pElement.mouseOver = true;
            return true;
            pMouseState.hasTarget = true;
        }
        else{
            //pElement.mouseOver = false;
            return false;
        }
    }
    else{
    	return false;
        //pElement.mouseOver = false;
    }
}

// gets the xml object of a string
m.getXml = function(xml){
	var xmlDoc;
	if (window.DOMParser){
		var parser = new DOMParser();
		xmlDoc = parser.parseFromString(xml, "text/xml");
	}
	else{ // IE
		xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = false;
		xmlDoc.loadXML(xml);
	}
	return xmlDoc;
}

// gets the scale of the first parameter to the second (with the second fitting inside the first)
m.getScale = function(virtual, actual){
	return actual.y/virtual.x*virtual.y < actual.x ? actual.y/virtual.y : actual.x/virtual.x;
}

// Gets the blob of the given file in the given zip
m.getBlob = function(zip, file, callback){
	zip.file(file).async("arraybuffer").then(function (data) {
		callback(new Blob([data], {type: m.getMimeType(file)}));
	});
}

//Gets the xml of the given file in the given zip
m.getXMLFromZip = function(zip, file, callback){
	zip.file(file).async("string").then(function (xml) {
		callback(m.getXml(xml));
	});
}

// Gets the mimetype of the given file
m.getMimeType(file){
	switch(file.toLowerCase().substr(file.lastIndexOf('.')+1)){
		case 'png':
			return 'image/png';
		case 'jpeg':
		case 'jpg':
			return 'image/jpeg';
		case 'pdf':
			return 'application/pdf';
		case 'docx':
		case 'doc':
			return 'application/msword';
		case 'rtf':
			return 'text/richtext';
		case 'ipardata':
			return 'text/xml';
		default:
			return 'text/plain';
	}
}