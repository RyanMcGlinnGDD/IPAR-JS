"use strict";
var Question = require("./question.js");

// Creates a category with the given name and from the given xml
function Category(name, xml, resources, windowDiv, proceedContainer, windows){
	console.log("LOADING CATEG");
	// Save the name
	this.name = name;
	console.log("LOADING CATE");
	// Load all the questions
	var questionElements = xml.getElementsByTagName("button");
	this.questions = [];console.log("LOADING QUESTIONS");
	// create questions
	for (var i=0; i<questionElements.length; i++) 
	{console.log("LOADING QUES:"+i);
		// create a question object
		this.questions[i] = new Question(questionElements[i], resources, windowDiv, proceedContainer, windows);
	}console.log("LOADED QUESTIONS");
    
}

module.exports = Category;