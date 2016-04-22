"use strict";
var Category = require("./category.js");
var Resource = require("./resources.js");
var Utilities = require('./utilities.js');
var Constants = require('./constants.js');
var Question = require('./question.js');

window.resolveLocalFileSystemURL  = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;

// Parses the xml case files
// ----------------------------
// known tags
/*
answer
button
categoryList
connections
element
feedback
instructions
resource
resourceList
resourceIndex
softwareList
question
questionText
qustionName
*/

// conversion
var stateConverter = {
	"hidden" : Question.SOLVE_STATE.HIDDEN,
	"unsolved" :  Question.SOLVE_STATE.UNSOLVED,
	"correct" :  Question.SOLVE_STATE.SOLVED
};
// conversion
var reverseStateConverter = ["hidden", "unsolved", "correct"];


// Module export
var m = module.exports;

// constructor
m.parseData = function(url, windowDiv, callback) {
    
    this.categories = [];
    this.questions = [];
    
	// get XML
    window.resolveLocalFileSystemURL(url+'active/caseFile.ipardata', function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();
			
			// hook up callback
			reader.onloadend = function() {

				// Get the raw data
				var xmlString = this.result;
				var rawData = Utilities.getXml(this.result);
				var categories = getCategoriesAndQuestions(rawData, url, windowDiv);
				loadSaveProgress(categories, url, windowDiv, callback, xmlString);
			   
			};
			reader.readAsText(file);
		   
		}, function(e){
			console.log("Error: "+e.message);
		});
	});
}

function loadSaveProgress(categories, url, windowDiv, callback, dataToSave) {
    var questions = [];
    
	// get XML
    window.resolveLocalFileSystemURL(url+'active/saveFile.ipardata', function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();
			
			// hook up callback
			reader.onloadend = function() {

				// Get the save data
				var saveData = Utilities.getXml(this.result);
				assignQuestionStates(categories, saveData.getElementsByTagName("question"));
				var stage = saveData.getElementsByTagName("case")[0].getAttribute("caseStatus");
				//createZip(dataToSave);
				callback(categories, stage);
			   
			};
			reader.readAsText(file);
		   
		}, function(e){
			console.log("Error: "+e.message);
		});
	});
}

function assignQuestionStates(categories, questionElems) {
	console.log(questionElems);
	
	var tally = 0; // track total index in nested loop
	
	// all questions
	for (var i=0; i<categories.length; i++) {
		for (var j=0; j<categories[i].questions.length; j++) {
		
			// store question  for easy reference
			var q = categories[i].questions[j];
			
			// store tag for easy reference
			var qElem = questionElems[tally];
			
			// state
			q.currentState = stateConverter[qElem.getAttribute("questionState")];
			// xpos
			q.positionPercentX = Utilities.map(parseInt(qElem.getAttribute("positionPercentX")), 0, 100, 0, Constants.boardSize.x);
			// ypos
			q.positionPercentY = Utilities.map(parseInt(qElem.getAttribute("positionPercentY")), 0, 100, 0, Constants.boardSize.y);
			
			// increment total
			tally++;
		}
	}
}

// takes the xml structure and fills in the data for the question object
function getCategoriesAndQuestions(rawData, url, windowDiv) {
	// if there is a case file
	if (rawData != null) {
		
		// First load the resources
		var resourceElements = rawData.getElementsByTagName("resourceList")[0].getElementsByTagName("resource");
		var resources = [];
		for (var i=0; i<resourceElements.length; i++) {
			// Load each resource
			resources[i] = new Resource(resourceElements[i], url);
		}
		
		// Then load the categories
		var categoryElements = rawData.getElementsByTagName("category");
		var categoryNames = rawData.getElementsByTagName("categoryList")[0].getElementsByTagName("element");
		var categories = [];
		for (var i=0; i<categoryElements.length; i++) {
			// Load each category (which loads each question)
			categories[i] = new Category(categoryNames[i].innerHTML, categoryElements[i], resources, url, windowDiv);
		}
		return categories;
	}
	return null
}

// this doesn't really do what we want but its a start
m.prepareZip = function(myBoards) {
	//var content = zip.generate();
	
	console.log("prepare zip");
	
	// code from site
	var blobLink = document.getElementById('blob');
	if (JSZip.support.blob) {
		console.log("supports blob");
		
		function downloadWithBlob(boards) {
		
			// create zip
			var zip = new JSZip();
		
		
			var dataToSave = m.createXMLSaveFile(boards);

			// Add a text file with the contents dataToSave
			zip.file("saveFile.iparData", dataToSave);
		
			console.log(zip.generateAsync);
			var content = zip.generateAsync({type:"blob"}).then(
			function (blob) {
				console.log("saving file");
				saveAs(blob, "hello.zip");
				location.href="data:application/zip;base64,"+content;
			}, function (err) {
				blobLink.innerHTML += " " + err;
			});
			return false;
		}
		blobLink.onclick = function() { downloadWithBlob(myBoards); };
  	}
	
	//location.href="data:application/zip;base64,"+content;
}

// creates the xml
m.createXMLSaveFile = function(boards) {
	// header
	var output = '<?xml version="1.0" encoding="utf-8"?>';
	// case data
	output += '<case categoryIndex="3" caseStatus="1" profileFirst="j" profileLast="j" profileMail="j">';
	// questions header
	output += '<questions>';
	
	// loop through questions
	for (var i=0; i<boards.length; i++) {
		for (var j=0; j<boards[i].lessonNodeArray.length; j++) {
			// shorthand
			var q = boards[i].lessonNodeArray[j].question;
			
			// tag start
			output += '<question ';
			
			// questionState
			output += 'questionState="' + reverseStateConverter[q.currentState] + '" ';
			// justification
			output += 'justification="' + q.justification + '" ';
			// animated
			output += 'animated="' + (q.currentState == 2) + '" '; // might have to fix this later
			// linesTranced
			output += 'linesTraced="0" '; // might have to fix this too
			// revealBuffer
			output += 'revealBuffer="0" '; // and this
			// positionPercentX
			output += 'positionPercentX="' + q.positionPercentX + '" ';
			// positionPercentY
			output += 'positionPercentY="' + q.positionPercentY + '" ';
			
			// tag end
			output += '/>';
		}
	}
	return output;
}
