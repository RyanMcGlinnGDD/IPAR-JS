(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

document.documentElement.requestFullScreen = document.documentElement.requestFullScreen || document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen;

//imports
var Game = require('./modules/game/game.js');
var Point = require('./modules/helper/point.js');
var Constants = require('./modules/game/constants.js');
var Utilities = require('./modules/helper/utilities.js');
var TitleMenu = require('./modules/menus/titleMenu.js');
var CreateMenu = require('./modules/menus/createMenu.js');

// The current game
var game;

// The section holding the board
var boardSection;

// The current page the website is on
var curPage;
var menus = [];
var PAGE = Object.freeze({TITLE: 0, CREATE: 1, BOARD: 2});

//fires when the window loads
window.onload = function(e){
	
	// Get the sections
	boardSection = document.getElementById("board");
	
	// Setup title menu
	menus[PAGE.TITLE] = new TitleMenu(document.getElementById("titleMenu"));
	menus[PAGE.TITLE].onclose = function(){
		switch(this.next){
		case TitleMenu.NEXT.BOARD:
			curPage = PAGE.BOARD;
			createCase();
			break;
		case TitleMenu.NEXT.CREATE:
			curPage = PAGE.CREATE;
			menus[curPage].open();
			break;
		}
	}
	

	// Setup create menu
	menus[PAGE.CREATE] = new CreateMenu(document.getElementById("createMenu"));
	menus[PAGE.CREATE].onclose = function(){
		switch(this.next){
		case CreateMenu.NEXT.BOARD:
			curPage = PAGE.BOARD;
			createCase();
			break;
		case CreateMenu.NEXT.TITLE:
			curPage = PAGE.TITLE;
			menus[curPage].open();
			break;
		}
	}
	
	// Open the title menu
    curPage = PAGE.TITLE;
    menus[PAGE.TITLE].open();
    
}

// create the game object and start the loop with a dt
function createCase(){
	console.log("GAME");
	// Show the section for the game
	boardSection.style.display = 'block';
	
    // Create the game
    game = new Game(document.getElementById("board"), Utilities.getScale(Constants.boardSize, new Point(window.innerWidth, window.innerHeight)));
    
    // Start the game loop
    gameLoop(Date.now());
    
}

//fires once per frame for the game
function gameLoop(prevTime){
    
    // update game
    game.update(Date.now() - prevTime);
    
	// loop
    window.requestAnimationFrame(gameLoop.bind(this, Date.now()));
    
}

//listens for changes in size of window and scales the game accordingly
window.addEventListener("resize", function(e){
	
	// Scale the game to the new size
	if(curPage==PAGE.BOARD)
		game.setScale(Utilities.getScale(Constants.boardSize, new Point(window.innerWidth, window.innerHeight)));
	
});

// Listen for touch for fullscreen while in game on mobile
window.addEventListener('touchstart', function(event){
	
	if(curPage==PAGE.BOARD && window.matchMedia("only screen and (max-width: 760px)"))
		document.documentElement.requestFullScreen();
	
}, false);

// Stop the default context menu from working
window.addEventListener("contextmenu", function(e){
	e.preventDefault();
});
},{"./modules/game/constants.js":6,"./modules/game/game.js":7,"./modules/helper/point.js":14,"./modules/helper/utilities.js":15,"./modules/menus/createMenu.js":18,"./modules/menus/titleMenu.js":20}],2:[function(require,module,exports){
"use strict";
var Question = require("./question.js");

// Creates a category with the given name and from the given xml
function Category(name, xml, resources, windowDiv){
	
	// Save the name
	this.name = name;
	
	// Load all the questions
	var questionElements = xml.getElementsByTagName("button");
	this.questions = [];
	// create questions
	for (var i=0; i<questionElements.length; i++) 
	{
		// create a question object
		this.questions[i] = new Question(questionElements[i], resources, windowDiv, i);
	}
    
}

var p = Category.prototype;

p.xml = function(xmlDoc, catDes){
	var xml = xmlDoc.createElement("category");
	xml.setAttribute("categoryDesignation", catDes);
	xml.setAttribute("questionCount", this.questions.length);
	for (var i=0; i<this.questions.length; i++) 
		xml.appendChild(this.questions[i].xml);
	return xml;
}

module.exports = Category;
},{"./question.js":3}],3:[function(require,module,exports){
"use strict";
var Utilities = require('../helper/utilities.js');
var Constants = require('../game/constants.js');
var Windows = require('../html/questionWindows.js');
var Popup = require('../menus/popup.js');

var SOLVE_STATE = Object.freeze({HIDDEN: 0, UNSOLVED: 1, SOLVED: 2});
var QUESTION_TYPE = Object.freeze({JUSTIFICATION: 1, MULTIPLE_CHOICE: 2, SHORT_RESPONSE: 3, FILE: 4, MESSAGE: 5});

/* Question properties:
currentState: SOLVE_STATE
windowDiv: element
correct: int
positionPercentX: float
positionPercentY: float
revealThreshold: int
imageLink: string
feedbacks: string[]
connectionElements: element[]
connections: int[]
questionType: SOLVE_STATE
justification: string
wrongAnswer: string
correctAnswer: string
*/
//parameter is a point that denotes starting position
function Question(xml, resources, windowDiv, num){
	
	// Set the current state to default at hidden and store the window div
    this.currentState = SOLVE_STATE.HIDDEN;
    this.windowDiv = windowDiv;
    this.num = num;
    this.xml = xml;
    this.resources = resources;
    
    this.refresh();
    
}

var p = Question.prototype;

p.refresh = function() {

    // Get and save the given index, correct answer, position, reveal threshold, image link, feedback, and connections
    this.correct = parseInt(this.xml.getAttribute("correctAnswer"));
    this.positionPercentX = Number(this.xml.getAttribute("xPositionPercent"));
    this.positionPercentY = Number(this.xml.getAttribute("yPositionPercent"));
    this.revealThreshold = parseInt(this.xml.getAttribute("revealThreshold"));
    //console.log(xml);
    this.imageLink = this.xml.getAttribute("imageLink");
    this.feedbacks = this.xml.getElementsByTagName("feedback");
    var scale = this.xml.getAttribute("scale");
    if(scale==="" || !scale)
    	this.scale = 1;
    else
    	this.scale = Number(scale);
    this.save = false;
    var connectionElements = this.xml.getElementsByTagName("connections");
    this.connections = [];
    for(var i=0;i<connectionElements.length;i++)
    	this.connections[i] = parseInt(connectionElements[i].innerHTML);
    
    // Create the windows for this question based on the question type
    this.questionType = parseInt(this.xml.getAttribute("questionType"));
    this.createWindows();
	this.createTypeWindow();
}

p.saveXML = function(){
	this.xml.setAttribute("xPositionPercent", this.positionPercentX);
	this.xml.setAttribute("yPositionPercent", this.positionPercentY);
	this.xml.setAttribute("revealThreshold", this.revealThreshold);
	this.xml.setAttribute("scale", this.scale);
	this.xml.setAttribute("correctAnswer", this.correct);
	this.xml.setAttribute("questionType", this.questionType);
	var connectionElement = this.xml.getElementsByTagName("connections")[0];
	while(connectionElement!=null){
		this.xml.removeChild(connectionElement);
		connectionElement = this.xml.getElementsByTagName("connections")[0];
	}
	for(var i=0;i<this.connections.length;i++){
		var connection = this.xml.ownerDocument.createElement("connections");
		connection.innerHTML = this.connections[i];
		this.xml.appendChild(connection);
	}
}

p.createWindows = function(){
	this.justification = this.questionType==1 || this.questionType==3;
	if(this.questionType!=5){
		this.createTaskWindow();
		this.createResourceWindow(this.resources);
		if(this.questionType<=2)
			this.createAnswerWindow();
	}
	else
		this.createMessageWindow();
}

p.displayWindows = function(){
	
	// Add the windows to the window div
	this.windowDiv.innerHTML = '';
	var windowNode = this.windowDiv;
	var exitButton = new Image();
	exitButton.src = "../img/iconClose.png";
	exitButton.className = "exit-button";
	var question = this;
	exitButton.onclick = function() { question.windowDiv.innerHTML = ''; };
	if(this.questionType===5){
		windowNode.appendChild(this.message);
	    exitButton.style.left = "75vw";
		this.typeWindow.style.left = "35vw";
	}
	else{
		windowNode.appendChild(this.task);
		windowNode.appendChild(this.resource);
		if(this.questionType<=2){
			windowNode.appendChild(this.answer);
			this.typeWindow.style.left = "";
			this.task.style.left = "";
			this.resource.style.left = "";
			exitButton.style.left = "85vw";
		}
		else{
			this.typeWindow.style.left = "35vw";
			this.task.style.left = "35vw";
			this.resource.style.left = "35vw";
			exitButton.style.left = "75vw";
		}
	}
	
	windowNode.appendChild(this.typeWindow);
	windowNode.appendChild(exitButton);
	
}

p.createTypeWindow = function(){
	
	// Create the task window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.questionTypeWindow;
    this.typeWindow = tempDiv.firstChild;
    
    this.typeWindow.getElementsByTagName("img")[0].src = this.imageLink;
    
    // Setup the image button
    var question = this;
    var button = this.typeWindow.getElementsByClassName("imageButton")[0];
    var icon = button.getElementsByTagName("img")[0];
    button.onclick = function(){
    	Popup.prompt(question.windowDiv, "Select Image", "Image URL:", "", "Load Image", function(newImage){
    		if(newImage){
    			question.imageLink = newImage;
    			question.xml.setAttribute("imageLink", newImage);
    			icon.src = newImage;
    		}
    		question.displayWindows();
    	});
    }
    
    // Setup the combo box
    var typeCombo = this.typeWindow.getElementsByTagName("select")[0];
    typeCombo.value = this.questionType;
    typeCombo.onchange = function(){
    	question.questionType = Number(this.value);
    	question.createWindows();
		question.displayWindows();
    }
    
    // Setup the save button
    this.typeWindow.getElementsByClassName("windowButtons")[0].getElementsByTagName("button")[0].onclick = function(){
    	question.save = true;
    	question.windowDiv.innerHTML = '';
    }
}

p.createTaskWindow = function(){
	this.proceedElement = document.getElementById("proceedContainer");
	
	// Create the task window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.taskWindow;
    this.task = tempDiv.firstChild;
    this.task.innerHTML = this.task.innerHTML.replace("%title%", this.xml.getElementsByTagName("questionName")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%instructions%", this.xml.getElementsByTagName("instructions")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%question%", this.xml.getElementsByTagName("questionText")[0].innerHTML.replace(/\n/g, '<br/>'));
    
    // Setup to update xml on changing
    var textBoxes = this.task.getElementsByClassName("text-box");
    for(var i=0;i<textBoxes.length;i++)
    	textBoxes[i].onblur = this.updateXML.bind(this, textBoxes);
}

p.updateXML = function(textBoxes){
	this.xml.getElementsByTagName("questionName")[0].innerHTML = textBoxes[0].innerHTML;
	this.xml.getElementsByTagName("instructions")[0].innerHTML = textBoxes[1].innerHTML;
	this.xml.getElementsByTagName("questionText")[0].innerHTML = textBoxes[2].innerHTML;
}

p.createResourceWindow = function(resourceFiles){
	
	// Create the resource window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.resourceWindow;
    this.resource = tempDiv.firstChild;
    
    // Create the basic resources from save
	this.resourceDiv = this.resource.getElementsByClassName("resourceContent")[0];
	this.updateResources(resourceFiles);
    
    // Setup the add button
    var question = this;
    this.resource.getElementsByTagName("button")[0].onclick = function(){
    	resourceFiles.openWindow(question.windowDiv, true, function(selectedResource){
    		if(selectedResource!=null){
    			var newResource = question.xml.ownerDocument.createElement("resourceIndex");
    			newResource.innerHTML = selectedResource;
    			question.xml.appendChild(newResource);
    			question.updateResources(this);
    		}
    		question.displayWindows();
    	});
    }
}

p.updateResources = function(resourceFiles){
	
	var resources = this.xml.getElementsByTagName("resourceIndex");
	var question = this;
	
	if(resources.length==0){
		this.resourceDiv.color = "grey";
		this.resourceDiv.className = "resourceContent center";
		this.resourceDiv.innerHTML = "No resources have been added.";
	}else{
		this.resourceDiv.color = "";
		this.resourceDiv.className = "resourceContent";
		this.resourceDiv.innerHTML = '';
		var used = [];
		for(var i=0;i<resources.length;i++){
			    	
			    	if(used.indexOf(resources[i].innerHTML)==-1)
			    		used.push(resources[i].innerHTML);
			    	else{
			    		this.xml.removeChild(resources[i]);
			    		i = 0;
			    		resources = this.xml.getElementsByTagName("resourceIndex");
			    	}
		}
	    for(var i=0;i<resources.length;i++){
	    	
	    	// Create the current resource element
    		var curResource = Windows.resource.replace("%icon%", resourceFiles[parseInt(resources[i].innerHTML)].icon);
	    	curResource = curResource.replace("%title%", resourceFiles[parseInt(resources[i].innerHTML)].title);
	    	curResource = curResource.replace("%link%", resourceFiles[parseInt(resources[i].innerHTML)].link);
	    	var tempDiv = document.createElement("DIV");
	    	tempDiv.innerHTML = curResource;
	        curResource = tempDiv.firstChild;
	    	this.resourceDiv.appendChild(curResource);
	    	
	    	// Setup delete button
	    	(function(resourceXml){
	    		curResource.getElementsByClassName("delete")[0].onclick = function(){
	    			question.xml.removeChild(resourceXml);
	    			question.updateResources(resourceFiles);
	    		}
	    	})(resources[i]);
	    }
	}
}

p.createAnswerWindow = function(){
	
	// Create the answer window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.answerWindow;
    this.answer = tempDiv.firstChild;
    
    // Setup the combox for number of answers
    var question = this;
    this.answerForm = this.answer.getElementsByTagName("form")[0];
    var select = this.answer.getElementsByTagName("select")[0];
    select.onchange = function(){
    	question.setNumberAnswers(Number(this.value));
    }
    this.setNumberAnswers(Number(this.xml.getAttribute("numAnswers")));
    select.value = this.xml.getAttribute("numAnswers");
	this.answerForm.elements["answer"].value = this.correct+1;
	
	// Setup the from to update the xml
	this.answerForm.onchange = function(){

	    // Setup the radio buttons for the form if justification
		if(question.justification && Number(this.elements["answer"].value)-1!=question.correct){
			for(var i=0;i<this.elements.length;i++)
				this.elements[i].disabled = false;
			this.elements["feedback"+this.elements["answer"].value].disabled = true;
		}
		
		question.correct = Number(this.elements["answer"].value)-1;
		var answers = question.xml.getElementsByTagName("answer");
		var feedback = question.xml.getElementsByTagName("feedback");
		for(var i=0;i<answers.length;i++){
			answers[i].innerHTML = this.elements["answer"+(i+1)].value;
			feedback[i].innerHTML = this.elements["feedback"+(i+1)].value;
		}
	}
	this.correct = -1;
	this.answerForm.onchange();
	
    
}

p.setNumberAnswers = function(num){

    var answersXml = this.xml.getElementsByTagName("answer");
    var feedbackXml = this.xml.getElementsByTagName("feedback");
	var answers = this.answerForm.getElementsByTagName("div");
	for(var i=0;i<answers.length;i++){
		var inputs = answers[i].getElementsByTagName("input");
		answersXml[i].innerHTML = inputs[0].value;
		feedbackXml[i].innerHTML = inputs[1].value;
	}
	
	this.xml.setAttribute("numAnswers", num);
	
	if(answersXml.length<num){
		for(var i=answersXml.length;i<num;i++){
			this.xml.appendChild(this.xml.ownerDocument.createElement("answer"));
			this.xml.appendChild(this.xml.ownerDocument.createElement("feedback"));
		}
	}
	else if(answersXml.length>num){
		while(answersXml.length>num){
			this.xml.removeChild(answersXml[answersXml.length-1]);
			this.xml.removeChild(feedbackXml[feedbackXml.length-1]);
		    var feedbackXml = this.xml.getElementsByTagName("feedback");
			answersXml = this.xml.getElementsByTagName("answer");
		}
	}

	this.answerForm.innerHTML = '';
	for(var i=0;i<answersXml.length;i++)
		this.answerForm.innerHTML += Windows.answer.replace(/%num%/g, i+1).replace(/%answer%/g, answersXml[i].innerHTML).replace(/%feedback%/g, feedbackXml[i].innerHTML);
	if(this.correct<answersXml.length)
		this.answerForm.elements["answer"].value = this.correct+1;
	else{
		this.answerForm.elements["answer"].value = 1;
		this.correct=0;
	}
}

p.createFileWindow = function(){
	
	// Create the file window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.fileWindow;
    this.answer = tempDiv.firstChild;
    this.fileInput = this.answer.getElementsByTagName("input")[0];
    var question = this;
    this.fileInput.addEventListener("change", function(event){
    	question.newFiles = true;
    	question.files = [];
    	for(var i=0;i<event.target.files.length;i++)
    		question.files[i] = event.target.files[i].name;
	    question.correctAnswer();
    });
    
}

p.createMessageWindow = function(){
	
	// Create the message window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.messageWindow;
    this.message = tempDiv.firstChild;
    this.message.innerHTML = this.message.innerHTML.replace("%title%", this.xml.getElementsByTagName("questionName")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.message.innerHTML = this.message.innerHTML.replace("%instructions%", this.xml.getElementsByTagName("instructions")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.message.innerHTML = this.message.innerHTML.replace("%question%", this.xml.getElementsByTagName("questionText")[0].innerHTML.replace(/\n/g, '<br/>'));

    // Setup to update xml on changing
    var textBoxes = this.message.getElementsByClassName("text-box");
    for(var i=0;i<textBoxes.length;i++)
    	textBoxes[i].onblur = this.updateXML.bind(this, textBoxes);

}

module.exports = Question;
module.exports.SOLVE_STATE = SOLVE_STATE;
},{"../game/constants.js":6,"../helper/utilities.js":15,"../html/questionWindows.js":17,"../menus/popup.js":19}],4:[function(require,module,exports){
"use strict";
var Windows = require('../html/popupWindows.js');
var Utilities = require('../helper/utilities.js');


// Creates a category with the given name and from the given xml
function Resource(xml){
	
	// First get the icon
	this.xml = xml;
	var type = parseInt(xml.getAttribute("type"));
	this.type = type;
	switch(type){
	  case 0:
	    this.icon = '../img/iconResourceFile.png';
	    break;
	  case 1:
	    this.icon = '../img/iconResourceLink.png';
	    break;
	  case 2:
    	this.icon = '../img/iconResourceVideo.png';
	    break;
	  default:
	    this.icon = '';
	    break;
	}

	// Next get the title
	this.title = xml.getAttribute("text");

	// Last get the link
	this.link = xml.getAttribute("link");
    
}

function Resources(resourceElements, doc){
	for (var i=0; i<resourceElements.length; i++) {
		// Load each resource
		this[i] = new Resource(resourceElements[i]);
	}
	this.length = resourceElements.length;
	this.doc = doc;
	
	// Create the resource window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.resourcesWindow;
    this.resource = tempDiv.firstChild;
	this.resourceDiv = this.resource.getElementsByClassName("resourceContent")[0];
	this.updateResources();
	
	// Store the buttons
	this.buttons = this.resource.getElementsByTagName("button");
	
}

var p = Resources.prototype;

p.openWindow = function(windowDiv, select, callback){
	
	// Setup the buttons
	var resources = this;
    this.buttons[0].onclick = function(){
    	windowDiv.innerHTML = '';
    	resources.windowDiv = null;
    	callback();
    }
	this.buttons[1].onclick = function(){
		resources.edit(null, function(){
			resources.updateResources();
			if(resources.windowDiv)
				resources.openWindow(resources.windowDiv, resources.select, resources.onclose);
		});
	}
    this.onclose = callback;
    this.windowDiv = windowDiv;
    this.select = select;
	
	var icons = this.resource.getElementsByClassName("icon");
	for(var i=0;i<icons.length;i++){
		if(this.select)
			icons[i].className = "iconSelect icon";
		else
			icons[i].className = "icon";
	}
    
	windowDiv.innerHTML = '';
	windowDiv.appendChild(this.resource);
	
}

p.updateResources = function(){
	
	if(this.length==0){
		this.resourceDiv.color = "grey";
		this.resourceDiv.className = "resourceContent center";
		this.resourceDiv.innerHTML = "No Resources Loaded";
	}else{
		var resources = this;
		this.resourceDiv.color = "";
		this.resourceDiv.className = "resourceContent";
		this.resourceDiv.innerHTML = '';
	    for(var i=0;i<this.length;i++){
	    	
	    	// Create the current resource element
    		var curResource = Windows.resource.replace("%icon%", this[i].icon);
	    	curResource = curResource.replace("%title%", this[i].title);
	    	curResource = curResource.replace("%link%", this[i].link);
	    	var tempDiv = document.createElement("DIV");
	    	tempDiv.innerHTML = curResource;
	        curResource = tempDiv.firstChild;
	    	this.resourceDiv.appendChild(curResource);
	    	
	    	// Setup delete and edit buttons
	    	(function(index){
	    		curResource.getElementsByClassName("delete")[0].onclick = function(){
	    			for(var i=index;i<resources.length-1;i++)
	    				resources[i] = resources[i+1];
	    			delete resources[--resources.length];
	    			resources.updateResources();
	    		}
	    		curResource.getElementsByClassName("edit")[0].onclick = function(){
	    			resources.edit(index, function(){
	    				resources.updateResources();
	    				if(resources.windowDiv)
	    					resources.openWindow(resources.windowDiv, resources.select, resources.onclose);
	    			});
	    		}
	    		
	    	    // If select setup the resources as buttons
	    		curResource.getElementsByClassName("icon")[0].onclick = function(){
		    	    if(resources.windowDiv && resources.select){
		    	    	resources.windowDiv.innerHTML = '';
		    	    	resources.windowDiv = null;
		    	    	resources.onclose(index);
		    	    	
		    	    }
	    		}
	    		
	    	})(i);
	    }
	}
	
}

p.edit = function(index, callback){
	
	// Create the popup window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.resourceEditor;
    var editInfo = tempDiv.firstChild;
    var form = editInfo.getElementsByTagName("form")[0];
	
	if(index==null){
		editInfo.innerHTML = editInfo.innerHTML.replace(/%edit%/g, "Create").replace(/%apply%/g, "Create Resource").replace(/%name%/g, '').replace(/%link%/g, '');
	}
	else{
		editInfo.innerHTML = editInfo.innerHTML.replace(/%edit%/g, "Edit").replace(/%apply%/g, "Apply Changes").replace(/%name%/g, this[index].title).replace(/%link%/g, this[index].link);
		editInfo.getElementsByTagName("select")[0].value = this[index].type;
	}
	
	// Setup cancel button
	var resources = this;
	var buttons = editInfo.getElementsByTagName("button");
	buttons[0].onclick = function(){
		resources.windowDiv.innerHTML = '';
    	callback();
	}
	
	// Setup confirm button
	buttons[1].onclick = function(){
		if(index==null)
			index = resources.length++;
		var newResource = resources.doc.createElement("resource");
		var form = editInfo.getElementsByTagName("form")[0];
		newResource.setAttribute("type", form.elements["type"].value);
		newResource.setAttribute("text", form.elements["name"].value);
		newResource.setAttribute("link", form.elements["link"].value);
		resources[index] = new Resource(newResource);
		resources.windowDiv.innerHTML = '';
    	callback();
	}
	

	// Display the edit window
	this.windowDiv.innerHTML = '';
	this.windowDiv.appendChild(editInfo);
}

p.xml = function(xmlDoc){
	var xml = xmlDoc.createElement("resourceList");
	xml.setAttribute("resourceCount", this.length);
	for(var i=0;i<this.length;i++)
		xml.appendChild(this[i].xml);
	return xml;
}

module.exports = Resources;
},{"../helper/utilities.js":15,"../html/popupWindows.js":16}],5:[function(require,module,exports){
"use strict";
var Utilities = require('../helper/utilities.js');
var Point = require('../helper/point.js');
var Question = require("../case/question.js");
var Constants = require("./constants.js");
var DrawLib = require("../helper/drawlib.js");

//parameter is a point that denotes starting position
function board(section, boardContext, nodeContext, mouseState, startPosition, lessonNodes, save){
	
	// Create the canvas for this board and add it to the section
	this.canvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext('2d');
	this.canvas.style.display = 'none';
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
	this.save = save;
	mouseState.addCanvas(this.canvas);
	section.appendChild(this.canvas);
	
	var board = this;
	this.canvas.addEventListener('animationend', function(){
		if(board.loaded)
			board.loaded();
	}, false);
	
	this.boardContext = boardContext;
	this.nodeContext = nodeContext;
    this.lessonNodeArray = lessonNodes;
    this.boardOffset = startPosition;
    this.prevBoardOffset = {x:0,y:0};
    this.zoom = Constants.startZoom;
    this.stage = 0;
    this.lastSaveTime = 0; // assume no cookie
    this.lastQuestion = null;
    this.lastQuestionNum = -1;
    
    //if (document.cookie) this.loadCookie(); 

	// Check if all nodes are solved
	var done = true;
	for(var i=0;i<this.lessonNodeArray.length && done;i++)
		if(this.lessonNodeArray[i].question.currentState!=Question.SOLVE_STATE.SOLVED)
			done = false;
	if(done)
		this.finished = true;
	else
		this.finished = false;
}

//prototype
var p = board.prototype;

p.act = function(gameScale, pMouseState, dt) {
    
    // Check mouse events if given a mouse state
    if(pMouseState) {
	    
		
	    if (!pMouseState.mouseDown && this.target) {
			this.target.dragPosition = undefined; // clear drag behavior
			this.target.dragging = false;
			this.target = null;
		}
	    
	    if(pMouseState.mouseDown){
			var bounds = this.boardContext.getBoundingClientRect();
			if(bounds.left >= pMouseState.mousePosition.x || bounds.right <= pMouseState.mousePosition.x || bounds.top >= pMouseState.mousePosition.y || bounds.bottom <= pMouseState.mousePosition.y)
				this.boardContext.style.display = '';
			bounds = this.nodeContext.getBoundingClientRect();
			if(bounds.left >= pMouseState.mousePosition.x || bounds.right <= pMouseState.mousePosition.x || bounds.top >= pMouseState.mousePosition.y || bounds.bottom <= pMouseState.mousePosition.y)
				this.nodeContext.style.display = '';
	    }
	    
		for (var i=this.lessonNodeArray.length-1, nodeChosen; i>=0 && this.target==null; i--) {
			var lNode = this.lessonNodeArray[i];
			
			lNode.mouseOver = false;
			
			//console.log("node update");
			// if hovering, show hover glow
			/*if (pMouseState.relativePosition.x > lNode.position.x-lNode.width/2 
			&& pMouseState.relativePosition.x < lNode.position.x+lNode.width/2
			&& pMouseState.relativePosition.y > lNode.position.y-lNode.height/2
			&& pMouseState.relativePosition.y < lNode.position.y+lNode.height/2) {*/
			if (Utilities.mouseIntersect(pMouseState,lNode,this.boardOffset)) {
				lNode.mouseOver = true;
				this.target = lNode;
				
				//console.log(pMouseState.hasTarget);
			}
		}

    	if(this.addCon){

    		if(pMouseState.mouseClicked){
    			this.addCon = false;
    			if(this.target && this.target!=this.startCon){
    				if(!this.subConnection(this.target.question, this.startCon.question)){
    					this.target.question.revealThreshold++;
        				this.startCon.question.connections.push(this.target.question.num+1);
        				this.save();
    				}
    			}
    		}
    		if(this.target==null)
    			this.canvas.style.cursor = 'crosshair';
    		
    	}
    	else if(this.removeCon){
    		if(pMouseState.mouseClicked){
    			this.removeCon = false;
    			if(this.target && this.target!=this.startCon && confirm("Are you sure you want to remove this connection? This action can't be undone!")){
    				var contains = -1;
    				for(var i=0;i<this.startCon.question.connections.length && contains == -1;i++)
    					if(this.lessonNodeArray[this.startCon.question.connections[i]-1]==this.target)
    						contains = this.startCon.question.connections[i];
    				if(contains>=0){
    					this.target.question.revealThreshold--;
    					this.startCon.question.connections.splice(this.startCon.question.connections.indexOf(contains), 1);
    					this.save();
    				}
    			}
    		}
    		if(this.target==null)
    			this.canvas.style.cursor = 'crosshair';
    	}
    	else if(this.target){
	
			if(!this.target.dragging){
				if (pMouseState.mouseDown) {
					// drag
					this.target.dragging = true;
					this.target.dragPosition = new Point(
					pMouseState.virtualPosition.x - this.target.position.x,
					pMouseState.virtualPosition.y - this.target.position.y
					);
				}
				if (pMouseState.mouseClicked) {
					// handle click code
					this.target.click(pMouseState);
					this.lastQuestion = this.target.question;
				}
				if (pMouseState.leftMouseClicked()) {
					// handle left click code
					this.nodeContext.style.top = pMouseState.mousePosition.y+"px";
					this.nodeContext.style.left = pMouseState.mousePosition.x+"px";
					this.nodeContext.style.display = 'block';
					this.nodeContext.virtualPosition = pMouseState.virtualPosition;
					this.boardContext.style.display = '';
					this.contextNode = this.target;
				}
			}
			else{
				var naturalX = pMouseState.virtualPosition.x - this.target.dragPosition.x;
				this.target.position.x = Math.max(Constants.boardOutline,Math.min(naturalX,Constants.boardSize.x - Constants.boardOutline));
				var naturalY = pMouseState.virtualPosition.y - this.target.dragPosition.y;
				this.target.position.y = Math.max(Constants.boardOutline,Math.min(naturalY,Constants.boardSize.y - Constants.boardOutline));
			}
			
	  }
		
		// drag the board around
		else {
			if (pMouseState.mouseDown) {
				this.canvas.style.cursor = '-webkit-grabbing';
				this.canvas.style.cursor = '-moz-grabbing';
				this.canvas.style.cursor = 'grabbing';
				if (!this.mouseStartDragBoard) {
					this.mouseStartDragBoard = pMouseState.virtualPosition;
					this.prevBoardOffset.x = this.boardOffset.x;
					this.prevBoardOffset.y = this.boardOffset.y;
				}
				else {
					this.boardOffset.x = this.prevBoardOffset.x - (pMouseState.virtualPosition.x - this.mouseStartDragBoard.x);
					if (this.boardOffset.x > this.maxBoardWidth/2) this.boardOffset.x = this.maxBoardWidth/2;
					if (this.boardOffset.x < -1*this.maxBoardWidth/2) this.boardOffset.x = -1*this.maxBoardWidth/2;
					this.boardOffset.y = this.prevBoardOffset.y - (pMouseState.virtualPosition.y - this.mouseStartDragBoard.y);
					if (this.boardOffset.y > this.maxBoardHeight/2) this.boardOffset.y = this.maxBoardHeight/2;
					if (this.boardOffset.y < -1*this.maxBoardHeight/2) this.boardOffset.y = -1*this.maxBoardHeight/2;
				}
			} else {
				this.mouseStartDragBoard = undefined;
				this.canvas.style.cursor = '';
				if (pMouseState.leftMouseClicked()) {
					// handle left click code
					this.boardContext.style.top = pMouseState.mousePosition.y+"px";
					this.boardContext.style.left = pMouseState.mousePosition.x+"px";
					this.boardContext.style.display = 'block';
					this.boardContext.virtualPosition = pMouseState.virtualPosition;
					this.nodeContext.style.display = '';
				}
			}
	    }
    }
}

p.subConnection = function(question, searchQues){
	var found = false;
	for(var i=0;i<question.connections.length && !found;i++){
		var cur = this.lessonNodeArray[question.connections[i]-1].question;
		if(cur==searchQues)
			found = true;
		else
			found = this.subConnection(cur, searchQues);
	}
	return found;
}

p.draw = function(gameScale, pMouseState){
    
    // save canvas state because we are about to alter properties
    this.ctx.save();   
    
    // Clear before drawing new stuff
	DrawLib.rect(this.ctx, 0, 0, this.canvas.width, this.canvas.height, "#15718F");

	
	// Scale the game
    this.ctx.save();
    this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
	this.ctx.scale(gameScale, gameScale);
	this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);

    // Translate to center of screen and scale for zoom then translate back
    this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
    // move the board to where the user dragged it
    //translate to the center of the board
    //console.log(this);
    this.ctx.translate(this.canvas.width/2 - this.boardOffset.x, this.canvas.height/2 - this.boardOffset.y);
    
	
    // Draw the background of the board
    DrawLib.rect(this.ctx, 0, 0, Constants.boardSize.x, Constants.boardSize.y, "#D3B185");
    DrawLib.strokeRect(this.ctx, -Constants.boardOutline/2, -Constants.boardOutline/2, Constants.boardSize.x+Constants.boardOutline/2, Constants.boardSize.y+Constants.boardOutline/2, Constants.boardOutline, "#CB9966");
    


	// draw the nodes itself
	for(var i=0; i<this.lessonNodeArray.length; i++)
        this.lessonNodeArray[i].draw(this.ctx, this.canvas);
    
	// draw the lines
	for(var i=0; i<this.lessonNodeArray.length; i++){
		
		// get the pin position
        var oPos = this.lessonNodeArray[i].getNodePoint();
        
		// set line style
        
        // draw lines
        for (var j=0; j<this.lessonNodeArray[i].question.connections.length; j++) {
        	var connection = this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1];
        	
        	var size = Constants.arrowSize,
        		color = "red";
        	if((!this.removeCon && this.lessonNodeArray[i]==this.target) || 
        			(this.removeCon && this.lessonNodeArray[i]==this.startCon && connection==this.target)){
        		size *= 2;
        		color =  "blue";
        	}

        	// -1 becase node connection index values are 1-indexed but connections is 0-indexed
        	// go to the index in the array that corresponds to the connected node on this board and save its position
        	// connection index saved in the lessonNode's question
        	var cPos = connection.getNodePoint();
            DrawLib.arrow(this.ctx, oPos, cPos, Constants.arrowHeadSize, size, color);
            
        }
    }

	if(this.addCon)
        DrawLib.arrow(this.ctx, this.startCon.getNodePoint(), new Point(pMouseState.virtualPosition.x+this.boardOffset.x, pMouseState.virtualPosition.y+this.boardOffset.y), Constants.arrowHeadSize, Constants.arrowSize, "darkRed");
	
	this.ctx.restore();
};

// Gets a free node in this board (i.e. not unsolved) returns null if none
p.getFreeNode = function() {
	for(var i=0; i<this.lessonNodeArray.length; i++)
		if(this.lessonNodeArray[i].currentState == Question.SOLVE_STATE.UNSOLVED)
			return this.lessonNodeArray[i];
	return null;
}

// Moves this board towards the given point
p.moveTowards = function(point, dt, speed){
	
	// Get the vector towards the given point
	var toPoint = new Point(point.x-this.boardOffset.x, point.y-this.boardOffset.y);
	
	// Get the distance of said vector
	var distance = Math.sqrt(toPoint.x*toPoint.x+toPoint.y*toPoint.y);
	
	// Get the new offset of the board after moving towards the point
	var newOffset = new Point( this.boardOffset.x + toPoint.x/distance*dt*speed,
								this.boardOffset.y + toPoint.y/distance*dt*speed);
	
	// Check if passed point on x axis and if so set to point's x
	if(this.boardOffset.x !=point.x &&
		Math.abs(point.x-newOffset.x)/(point.x-newOffset.x)==Math.abs(point.x-this.boardOffset.x)/(point.x-this.boardOffset.x))
		this.boardOffset.x = newOffset.x;
	else
		this.boardOffset.x = point.x;
	

	// Check if passed point on y axis and if so set to point's y
	if(this.boardOffset.y != point.y &&
		Math.abs(point.y-newOffset.y)/(point.y-newOffset.y)==Math.abs(point.y-this.boardOffset.y)/(point.y-this.boardOffset.y))
		this.boardOffset.y = newOffset.y;
	else
		this.boardOffset.y = point.y;
}

p.windowClosed = function(){
	var xml;
	if(this.lastQuestion){
		var question = this.lastQuestion;
		this.lastQuestion = null;
		if(question.save){
			question.save = false;
			xml = question.xml;
			for(var i=0;i<this.lessonNodeArray.length;i++)
				this.lessonNodeArray[i].updateImage();
		}
		return {xml:xml, num:question.num};
	}
	return null;
}

p.addConnection = function(){
	this.addCon = true;
	this.canvas.style.cursor = 'crosshair';
	this.startCon = this.contextNode;
}

p.removeConnection = function(){
	this.removeCon = true;
	this.canvas.style.cursor = 'crosshair';
	this.startCon = this.contextNode;
}

p.show = function(dir){
	if(dir!=null)
		this.canvas.style.animation = 'canvasEnter' + (dir ? 'L' : 'R') + ' 1s';
	this.canvas.style.display = 'inline-block';
}

p.hide = function(dir){
	if(dir!=null){
		this.canvas.style.animation = 'canvasLeave' + (dir ? 'R' : 'L') + ' 1s';
		var board = this;
		this.loaded = function(){
			board.canvas.style.display = 'none';
		}
	}
	else{
		board.canvas.style.display = 'none';
	}
}

p.updateSize = function(){
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
}

module.exports = board;    

},{"../case/question.js":3,"../helper/drawlib.js":10,"../helper/point.js":14,"../helper/utilities.js":15,"./constants.js":6}],6:[function(require,module,exports){
"use strict";
var Point = require('../helper/point.js');

//Module export
var m = module.exports;

// The size of the board in game units at 100% zoom
m.boardSize = new Point(1920, 1080);
m.boundSize = 3;

//The size of the board outline in game units at 100% zoom
m.boardOutline = m.boardSize.x > m.boardSize.y ? m.boardSize.x/20 : m.boardSize.y/20;

// The zoom values at start and end of animation
m.startZoom = 0.5;
m.endZoom = 1.5;

// The speed of the zoom animation
m.zoomSpeed = 0.001;
m.zoomMoveSpeed = 0.75;

// The speed of the line animation
m.lineSpeed = 0.002;

// The time between zoom checks
m.pinchSpeed = .0025;

// Used for resizing nodes
m.nodeStep = 0.1;
m.maxNodeScale = 2;
m.minNodeScale = 0.5;
m.nodeEdgeWidth = 25;

// Used for drawing arrows
m.arrowHeadSize = 50;
m.arrowSize = 5;
},{"../helper/point.js":14}],7:[function(require,module,exports){
"use strict";
var Board = require('./board.js');
var Point = require('../helper/point.js');
var LessonNode = require('./lessonNode.js');
var Constants = require('./constants.js');
var DrawLib = require('../helper/drawlib.js');
var DataParser = require('../helper/iparDataParser.js');
var MouseState = require('../helper/mouseState.js');
var FileManager = require('../helper/fileManager.js');
var Utilities = require('../helper/utilities.js');
var Question = require('../case/question.js');
var Category = require('../case/category.js');
var Popup = require('../menus/popup.js');

//mouse management
var mouseState;
var previousMouseState;
var draggingDisabled;
var mouseTarget;
var mouseSustainedDown;

// HTML elements
var zoomSlider;
var windowDiv;
var windowFilm;

// Used for pinch zoom
var pinchStart;

// Used for waiting a second to close windows
var pausedTime = 0;

//phase handling
var phaseObject;

function game(section, baseScale){
	var game = this;
	this.active = false;
	this.section = section;
	this.saveFiles = [];
	
	// Get and setup the window elements
	windowDiv = document.getElementById('window');
	windowFilm = document.getElementById('windowFlim');
	
	// Get and setup the zoom slider
	zoomSlider = document.querySelector('#'+section.id+' #zoom-slider');
	zoomSlider.oninput = function(){
		game.setZoom(-parseFloat(zoomSlider.value));
	};
	document.querySelector('#'+section.id+' #zoom-in').onclick = function() {
    	zoomSlider.stepDown();
		game.setZoom(-parseFloat(zoomSlider.value));
    };
    document.querySelector('#'+section.id+' #zoom-out').onclick = function() { 
		zoomSlider.stepUp(); 
		game.setZoom(-parseFloat(zoomSlider.value));
	};
	
	// Get and setup the board context menu
	var boardContext = document.querySelector('#'+section.id+' #board-context');
	document.querySelector('#'+section.id+' #board-context #add-question').onclick = function(e){
		var board = game.boardArray[game.activeBoardIndex];
		game.addQuestion((boardContext.virtualPosition.x+Constants.boardSize.x/2)/Constants.boardSize.x*100,
				(boardContext.virtualPosition.y+Constants.boardSize.y/2)/Constants.boardSize.y*100);
		boardContext.style.display = '';
	};


	document.querySelector('#'+section.id+' #board-context #add-category').onclick = function(e){
		Popup.prompt(windowDiv, "Create Category", "Category Name:", "", "Create", function(newName){
    		if(newName)
    			game.addCategory(newName);
    	});
		boardContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #board-context #rename-category').onclick = function(e){
		Popup.prompt(windowDiv, "Rename Category", "Category Name:", game.categories[game.activeBoardIndex].name, "Rename", function(newName){
    		if(newName){
    			game.categories[game.activeBoardIndex].name = newName;
    			game.boardArray[game.activeBoardIndex].button.innerHTML = newName;
    			var caseData = JSON.parse(localStorage['caseDataCreate']);
    			var caseFile = Utilities.getXml(caseData.caseFile);
    			caseFile.getElementsByTagName("categoryList")[0].getElementsByTagName("element")[game.activeBoardIndex].innerHTML = newName;
    			caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
    			localStorage['caseDataCreate'] = JSON.stringify(caseData);
    		}
    	});
		boardContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #board-context #delete-category').onclick = function(e){
		if(game.boardArray.length>1 && confirm("Are you sure you want to delete the current category You can't undo this action!"))
			game.deleteCategory();
		boardContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #board-context #forward-category').onclick = function(e){
		if(game.activeBoardIndex+1<game.categories.length)
			game.moveCategory(1);
		boardContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #board-context #backward-category').onclick = function(e){
		if(game.activeBoardIndex-1>=0)
			game.moveCategory(-1);
		boardContext.style.display = '';
	};
	
	
	document.querySelector('#'+section.id+' #board-context #edit-info').onclick = function(e){
		var caseData = JSON.parse(localStorage['caseDataCreate']);
		Popup.editInfo(windowDiv, Utilities.getXml(caseData.caseFile), function(newCaseFile, name){
	    	localStorage['caseName'] =name+".ipar";
			caseData = JSON.parse(localStorage['caseDataCreate']);
			caseData.caseFile = new XMLSerializer().serializeToString(newCaseFile);
			localStorage['caseDataCreate'] = JSON.stringify(caseData);
		});
		boardContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #board-context #edit-resources').onclick = function(e){
		game.resources.openWindow(windowDiv, false, function(){
			var caseData = JSON.parse(localStorage['caseDataCreate']);
			var caseFile = Utilities.getXml(caseData.caseFile);
			var resourceList = caseFile.getElementsByTagName("resourceList")[0];
			resourceList.parentNode.replaceChild(game.resources.xml(caseFile), resourceList);
			caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
			localStorage['caseDataCreate'] = JSON.stringify(caseData);
		});
		game.save();
		boardContext.style.display = '';
	};
	

	// Get and setup the node context menu
	var nodeContext = document.querySelector('#'+this.section.id+' #node-context');
	document.querySelector('#'+section.id+' #node-context #add-connection').onclick = function(e){
		game.boardArray[game.activeBoardIndex].addConnection();
		game.save();
		nodeContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #node-context #remove-connection').onclick = function(e){
		if(game.boardArray[game.activeBoardIndex].contextNode.question.connections.length>0){
			game.boardArray[game.activeBoardIndex].removeConnection();
			game.save();
		}
		nodeContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #node-context #delete-question').onclick = function(e){
		if(confirm("Are you sure want to delete this question? You can't undo this action!")){
			var board = game.boardArray[game.activeBoardIndex],
				cat = game.categories[game.activeBoardIndex];
			for(var i=0;i<cat.questions.length;i++){
				if(cat.questions[i].num>board.contextNode.question.num)
					cat.questions[i].num--;
				var con = cat.questions[i].connections.indexOf(board.contextNode.question.num+1);
				while(con!=-1){
					cat.questions[i].connections.splice(con, 1);
					con = cat.questions[i].connections.indexOf(board.contextNode.question.num+1);
				}
				for(var j=0;j<cat.questions[i].connections.length;j++)
					if(cat.questions[i].connections[j]-1>board.contextNode.question.num)
						cat.questions[i].connections[j]--;
			}
			board.lessonNodeArray.splice(board.contextNode.question.num, 1);
			cat.questions.splice(board.contextNode.question.num, 1);
			game.save();
		}
		nodeContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #node-context #make-larger').onclick = function(e){
		var board = game.boardArray[game.activeBoardIndex];
		if(board.lessonNodeArray[board.contextNode.question.num].question.scale<Constants.maxNodeScale){
			board.lessonNodeArray[board.contextNode.question.num].question.scale += Constants.nodeStep;
			board.lessonNodeArray[board.contextNode.question.num].updateImage();
		}
		game.save();
		nodeContext.style.display = '';
	};
	document.querySelector('#'+section.id+' #node-context #make-smaller').onclick = function(e){
		var board = game.boardArray[game.activeBoardIndex];
		if(board.lessonNodeArray[board.contextNode.question.num].question.scale>Constants.minNodeScale){
			board.lessonNodeArray[board.contextNode.question.num].question.scale -= Constants.nodeStep;
			board.lessonNodeArray[board.contextNode.question.num].updateImage();
		}
		game.save();
		nodeContext.style.display = '';
	};
	
	
	
	// Save the given scale
	this.scale = baseScale;
	
	// Load the case file
	var loadData = FileManager.loadCase(JSON.parse(localStorage['caseDataCreate']), document.querySelector('#'+section.id+' #window'));
	
	// Create the boards
	this.resources = loadData.resources;
	this.categories = loadData.categories;
	this.nodeContext = nodeContext;
	this.boardContext = boardContext;
	this.createLessonNodes();
	
	// Display the current board
	this.activeBoardIndex = loadData.category;
	this.active = true;
	this.boardArray[this.activeBoardIndex].show();
	zoomSlider.value = -this.getZoom();
	
	// Setup the save button
	FileManager.prepareZip(document.querySelector('#'+section.id+' #blob'));
}

var p = game.prototype;

p.addCategory = function(name){
	
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	var caseFile = Utilities.getXml(caseData.caseFile);
	var cat = caseFile.createElement("category");
	cat.setAttribute("categoryDesignation", this.categories.length);
	cat.setAttribute("questionCount", 0);
	caseFile.getElementsByTagName("case")[0].appendChild(cat);
	this.categories.push(new Category(name, cat, this.resources, windowDiv));
	this.createBoard(this.categories[this.categories.length-1], this.categories.length-1);
	
	caseFile.getElementsByTagName("case")[0].appendChild(cat);
	var list = caseFile.getElementsByTagName("categoryList")[0];
	list.setAttribute("categoryCount", this.categories.length);
	var newElement = caseFile.createElement("element");
	newElement.innerHTML = name;
	list.appendChild(newElement);
	caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
	localStorage['caseDataCreate'] = JSON.stringify(caseData);
	console.log("ADDING CAT");
	console.log(caseFile);
	
}

p.moveCategory = function(dir){
	
	// Flip the categories first
	var temp = this.categories[this.activeBoardIndex];
	this.categories[this.activeBoardIndex] = this.categories[dir+this.activeBoardIndex];
	this.categories[this.activeBoardIndex+dir] = temp;
	
	// Next flip the button names
	this.boardArray[this.activeBoardIndex].button.innerHTML = this.categories[this.activeBoardIndex].name;
	this.boardArray[this.activeBoardIndex+dir].button.innerHTML = this.categories[this.activeBoardIndex+dir].name;
	
	// Then flip the buttons
	temp = this.boardArray[this.activeBoardIndex+dir].button;
	this.boardArray[this.activeBoardIndex+dir].button = this.boardArray[this.activeBoardIndex].button;
	this.boardArray[this.activeBoardIndex].button = temp;
	
	// Then, flip the boards
	temp = this.boardArray[this.activeBoardIndex+dir];
	this.boardArray[this.activeBoardIndex+dir] = this.boardArray[this.activeBoardIndex];
	this.boardArray[this.activeBoardIndex] = temp;
	
	// Finally, flip the data in the xml and save
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	var caseFile = Utilities.getXml(caseData.caseFile);
	var list = caseFile.getElementsByTagName("categoryList")[0].getElementsByTagName("element");
	list[this.activeBoardIndex].innerHTML = this.categories[this.activeBoardIndex].name;
	list[this.activeBoardIndex+dir].innerHTML = this.categories[this.activeBoardIndex+dir].name;
	var cats = caseFile.getElementsByTagName("category");
	for(var i=0;i<cats.length;i++){
		if(Number(cats[i].getAttribute("categoryDesignation"))==this.activeBoardIndex)
			cats[i].setAttribute("categoryDesignation", this.activeBoardIndex+dir);
		else if(Number(cats[i].getAttribute("categoryDesignation"))==this.activeBoardIndex+dir)
			cats[i].setAttribute("categoryDesignation", this.activeBoardIndex);
	}
	caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
	localStorage['caseDataCreate'] = JSON.stringify(caseData);
	
	
	this.boardArray[this.activeBoardIndex+dir].button.className = "active";
	this.boardArray[this.activeBoardIndex].button.className = "";
	this.activeBoardIndex += dir;
}

p.deleteCategory = function() {
	
	// Remove the button, board, and cat first
	this.boardArray[this.boardArray.length-1].button.parentNode.removeChild(this.boardArray[this.boardArray.length-1].button);
	this.boardArray[this.activeBoardIndex].canvas.parentNode.removeChild(this.boardArray[this.activeBoardIndex].canvas);
	for(var i=this.boardArray.length-1;i>this.activeBoardIndex;i--){
		this.boardArray[i].button = this.boardArray[i-1].button;
		this.boardArray[i].button.innerHTML = this.categories[i].name;
	}
	for(var i=this.activeBoardIndex+1;i<this.boardArray.length;i++){
		this.boardArray[i-1] = this.boardArray[i];
		this.categories[i-1] = this.categories[i];
	}
	this.boardArray.pop();
	this.categories.pop();
	
	// Then remove it from the xml
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	var caseFile = Utilities.getXml(caseData.caseFile);
	var list = caseFile.getElementsByTagName("categoryList")[0];
	list.setAttribute("categoryCount", this.categories.length);
	list.removeChild(list.getElementsByTagName("element")[this.activeBoardIndex]);
	var cats = caseFile.getElementsByTagName("category");
	for(var i=0;i<cats.length;i++){
		if(Number(cats[i].getAttribute("categoryDesignation"))==this.activeBoardIndex){
			cats[i].parentNode.removeChild(cats[i]);
			break;
		}
	}
	cats = caseFile.getElementsByTagName("category");
	for(var i=0;i<cats.length;i++)
		if(Number(cats[i].getAttribute("categoryDesignation"))>this.activeBoardIndex)
			cats[i].setAttribute("categoryDesignation", this.activeBoardIndex-1);
	caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
	localStorage['caseDataCreate'] = JSON.stringify(caseData);
	
	if(this.activeBoardIndex>=this.boardArray.length)
		this.activeBoardIndex = this.boardArray.length-1;
	this.boardArray[this.activeBoardIndex].button.className = "active";
	this.newBoard = this.activeBoardIndex;
	this.zoomout = true;
}

p.createLessonNodes = function(){
	this.boardArray = [];
	this.bottomBar = document.querySelector('#'+this.section.id+' #bottomBar');
	this.mouseState = new MouseState();
	for(var i=0;i<this.categories.length;i++)
		this.createBoard(this.categories[i], i);
	
}

p.createBoard = function(cat, num){
	this.lessonNodes = [];
	// add a node per question
	for (var j = 0; j < cat.questions.length; j++) {
		// create a new lesson node
		this.lessonNodes.push(new LessonNode( cat.questions[j] ) );
		// attach question object to lesson node
		this.lessonNodes[this.lessonNodes.length-1].question = cat.questions[j];
	
	}

	// create a board
	this.boardArray[num] = new Board(this.section, this.boardContext, this.nodeContext, this.mouseState, new Point(Constants.boardSize.x/2, Constants.boardSize.y/2), this.lessonNodes, this.save.bind(this));
	var button = document.createElement("BUTTON");
	button.innerHTML = cat.name;
	var game = this;
	button.onclick = (function(i){ 
		return function() {
			if(game.active){
				game.changeBoard(i);
			}
	}})(num);
	this.bottomBar.appendChild(button);
	this.boardArray[num].button = button;
}

p.update = function(dt){

    if(this.active){
    
    	// perform game actions
    	this.act(dt);
    	
	    // draw stuff
	    this.boardArray[this.activeBoardIndex].draw(this.scale, this.mouseState);
	    
    }
    else if(pausedTime!=0 && windowDiv.innerHTML=='')
    	this.windowClosed();
    
}

p.act = function(dt){

    // Update the mouse state
	this.mouseState.update(dt, this.scale*this.getZoom());
	
	/*if (this.mouseState.mouseClicked) {
		//localStorage.setItem("autosave",DataParser.createXMLSaveFile(this.boardArray, false));
		//console.log(localStorage.getItem("autosave"));
	}*/
	
    // Update the current board (give it the mouse only if not zooming)
    this.boardArray[this.activeBoardIndex].act(this.scale, (this.zoomout ? null : this.mouseState), dt);
    
    // Check if new board available
    if(this.activeBoardIndex < this.boardArray.length-1 &&
    		this.boardArray[this.activeBoardIndex+1].button.disabled && 
    		this.boardArray[this.activeBoardIndex].finished){
    	this.boardArray[this.activeBoardIndex+1].button.disabled = false;
    }
	

	// If the needs to zoom out to center
	if(this.zoomout){
		
		// Get the current board
		var board = this.boardArray[this.activeBoardIndex];
		
		// Zoom out and move towards center
		if(this.getZoom()>Constants.startZoom)
			board.zoom -= dt*Constants.zoomSpeed;
		else if(this.getZoom()<Constants.startZoom)
			board.zoom = Constants.startZoom;
		board.moveTowards(new Point(Constants.boardSize.x/2, Constants.boardSize.y/2), dt, Constants.zoomMoveSpeed);
		
		// Update the zoom slider
		zoomSlider.value = -this.getZoom();
		
		// If fully zoomed out and in center stop
		if(this.getZoom()==Constants.startZoom && board.boardOffset.x==Constants.boardSize.x/2 && board.boardOffset.y==Constants.boardSize.y/2){				
			this.zoomout = false;
			
			// If changing board start that process
			if(this.newBoard!=null){
				var dir = this.newBoard < this.activeBoardIndex;
				this.boardArray[this.activeBoardIndex].hide(dir);
				this.activeBoardIndex = this.newBoard;
				this.boardArray[this.activeBoardIndex].show(dir);
				zoomSlider.value = -this.getZoom();
				this.active = false;
				var game = this;
				this.boardArray[this.activeBoardIndex].loaded = function(){
					game.active = true;
					game.newBoard = null;
				}
			}
		}
	}
	else{ // Only handle zooming if not performing animation zoom
	
		// Handle pinch zoom
	    if(this.mouseState.zoomDiff!=0){
	    	zoomSlider.value = pinchStart + this.mouseState.zoomDiff * Constants.pinchSpeed;
	    	this.updateZoom(-parseFloat(zoomSlider.value)); 
	    }
	    else
	    	pinchStart = Number(zoomSlider.value);
	    
	    // Handle mouse zoom
	    if(this.mouseState.mouseWheelDY!=0)
	    	this.zoom(this.mouseState.mouseWheelDY<0);
	}

    
    // Check if should pause
    if(windowDiv.innerHTML!='' && pausedTime++>3){
    	this.active = false;
    	windowDiv.style.display = 'block';
    	windowFilm.style.display = 'block';
    }
    
}

p.getZoom = function(){
	return this.boardArray[this.activeBoardIndex].zoom;
}

p.setZoom = function(zoom){
	this.boardArray[this.activeBoardIndex].zoom = zoom;
}

p.zoom = function(dir){
	if(dir)
    	zoomSlider.stepDown();
    else
    	zoomSlider.stepUp();
	this.setZoom(-parseFloat(zoomSlider.value));
}

p.setScale = function(scale){
	for(var i=0;i<this.boardArray.length;i++)
		this.boardArray[i].updateSize();
	this.scale = scale;
}

p.changeBoard = function(num){
	if(num!=this.activeBoardIndex){
		this.boardArray[num].button.className = "active";
		this.boardArray[this.activeBoardIndex].button.className = "";
		this.newBoard = num;
		this.zoomout = true;
	}
}

p.windowClosed = function() {
	
	// Unpause the game and fully close the window
	pausedTime = 0;
	this.active = true;
	windowDiv.style.display = 'none';
	windowFilm.style.display = 'none';
	
	var save = this.boardArray[this.activeBoardIndex].windowClosed();
	
	if(save){
		var caseData = JSON.parse(localStorage['caseDataCreate']);
		var caseFile = Utilities.getXml(caseData.caseFile);
		if(save.xml){
			var cat = caseFile.getElementsByTagName('category')[this.activeBoardIndex];
			cat.replaceChild(save.xml, cat.getElementsByTagName('button')[save.num]);
			caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
			localStorage['caseDataCreate'] = JSON.stringify(caseData);
		}
		else{
			this.categories[this.activeBoardIndex].questions[save.num].xml = caseFile.getElementsByTagName('category')[this.activeBoardIndex].getElementsByTagName('button')[save.num];
			this.categories[this.activeBoardIndex].questions[save.num].refresh();
		}
	}
	
	this.save();
	
}

p.save = function(){
	
	var lessonNodes = this.boardArray[this.activeBoardIndex].lessonNodeArray;
	for(var i=0;i<lessonNodes.length;i++)
		lessonNodes[i].save();
	
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	var caseFile = Utilities.getXml(caseData.caseFile);
	var caseNode = caseFile.getElementsByTagName("case")[0];
	var cat = caseNode.getElementsByTagName("category")[0];
	while(cat){
		caseNode.removeChild(cat);
		cat = caseNode.getElementsByTagName("category")[0];
	}
	for(var i=0;i<this.categories.length;i++)
		caseNode.appendChild(this.categories[i].xml(caseFile, i));
	caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
	localStorage['caseDataCreate'] = JSON.stringify(caseData);
	console.log(caseFile);
	console.log(caseNode.getElementsByTagName("category").length);
	
}

p.addQuestion = function(x, y){
	
	// Get the case to add the question
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	var caseFile = Utilities.getXml(caseData.caseFile);
	var newQuestion = caseFile.createElement('button');
	newQuestion.setAttribute('xPositionPercent', x);
	newQuestion.setAttribute('yPositionPercent', y);
	newQuestion.setAttribute('scale', '1');
	newQuestion.setAttribute('numConnections', '0');
	newQuestion.setAttribute('numAnswers', '3');
	newQuestion.setAttribute('correctAnswer', '0');
	newQuestion.setAttribute('imageLink', 'https://i.gyazo.com/eb1832a80fa41e395491571d4930119b.png');
	newQuestion.setAttribute('revealThreshold', '0');
	newQuestion.setAttribute('questionType', '2');
	newQuestion.setAttribute('resourceCount', '0');
	newQuestion.appendChild(caseFile.createElement('questionName'));
	newQuestion.appendChild(caseFile.createElement('instructions'));
	newQuestion.appendChild(caseFile.createElement('questionText'));
	newQuestion.appendChild(caseFile.createElement('answer'));
	newQuestion.appendChild(caseFile.createElement('answer'));
	newQuestion.appendChild(caseFile.createElement('answer'));
	newQuestion.appendChild(caseFile.createElement('feedback'));
	newQuestion.appendChild(caseFile.createElement('feedback'));
	newQuestion.appendChild(caseFile.createElement('feedback'));
	var cats = caseFile.getElementsByTagName('category');
	for(var i=0;i<cats.length;i++){
		if(Number(cats[i].getAttribute("categoryDesignation"))==this.activeBoardIndex)
		{
			cats[i].appendChild(newQuestion);
			break;
		}
	}
	
	var question = new Question(newQuestion, this.resources, windowDiv, this.categories[this.activeBoardIndex].questions.length);
	this.categories[this.activeBoardIndex].questions.push(question);
	var lessonNodes = this.boardArray[this.activeBoardIndex].lessonNodeArray;
	lessonNodes.push(new LessonNode( question ) );
	// attach question object to lesson node
	lessonNodes[lessonNodes.length-1].question = question;
	this.boardArray[this.activeBoardIndex].lessonNodeArray = lessonNodes;
	
	// Save the changes to local storage
	this.save();
	
}

module.exports = game;

},{"../case/category.js":2,"../case/question.js":3,"../helper/drawlib.js":10,"../helper/fileManager.js":11,"../helper/iparDataParser.js":12,"../helper/mouseState.js":13,"../helper/point.js":14,"../helper/utilities.js":15,"../menus/popup.js":19,"./board.js":5,"./constants.js":6,"./lessonNode.js":8}],8:[function(require,module,exports){
"use strict";
var DrawLib = require('../helper/drawLib.js');
var Question = require("../case/question.js");
var Constants = require("./constants.js");
var Point = require('../helper/point.js');

var CHECK_IMAGE = "../img/iconPostItCheck.png";

//parameter is a point that denotes starting position
function lessonNode(pQuestion){
    
    this.position = new Point(pQuestion.positionPercentX/100*Constants.boardSize.x, pQuestion.positionPercentY/100*Constants.boardSize.y);
    this.dragLocation = undefined;
    this.mouseOver = false;
    this.dragging = false;
    this.type = "lessonNode";
    this.image = new Image();
    this.check = new Image();
    this.width;
    this.height;
    this.question = pQuestion;
    this.connections = 0;
    this.currentState = 0;
    this.linePercent = 0;
    
    // skip animations for solved
    if (pQuestion.currentState == Question.SOLVE_STATE.SOLVED) this.linePercent = 1;
    
    var that = this;
    //image loading and resizing
    this.image.onload = function() {
        that.width = that.image.naturalWidth;
        that.height = that.image.naturalHeight;
        var maxDimension = Constants.boardSize.x/10;
        //too small?
        if(that.width < maxDimension && that.height < maxDimension){
            var x;
            if(that.width > that.height){
                x = maxDimension / that.width;
            }
            else{
                x = maxDimension / that.height;
            }
            that.width = that.width * x * that.question.scale;
            that.height = that.height * x * that.question.scale;
        }
        if(that.width > maxDimension || that.height > maxDimension){
            var x;
            if(that.width > that.height){
                x = that.width / maxDimension;
            }
            else{
                x = that.height / maxDimension;
            }
            that.width = that.width / x * that.question.scale;
            that.height = that.height / x * that.question.scale;
        }
        
    };
    
    this.image.src = this.question.imageLink;
    this.check.src = CHECK_IMAGE;
}

var p = lessonNode.prototype;

p.draw = function(ctx, canvas){

    //lessonNode.drawLib.circle(ctx, this.position.x, this.position.y, 10, "red");
    //draw the image, shadow if hovered
    ctx.save();
    if(this.dragging) {
    	ctx.shadowColor = 'yellow';
        ctx.shadowBlur = 5;
		canvas.style.cursor = '-webkit-grabbing';
		canvas.style.cursor = '-moz-grabbing';
		canvas.style.cursor = 'grabbing';
    }
    else if(this.mouseOver){
        ctx.shadowColor = 'dodgerBlue';
        ctx.shadowBlur = 5;
        canvas.style.cursor = 'pointer';
    }
    //drawing the button image
    ctx.drawImage(this.image, this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height);
    
    //drawing the pin
	ctx.fillStyle = "blue";
	ctx.strokeStyle = "cyan";
	var smaller = this.width < this.height ? this.width : this.height;
	ctx.lineWidth = smaller/32;

	ctx.beginPath();
	var nodePoint = this.getNodePoint();
	ctx.arc(nodePoint.x, nodePoint.y, smaller*3/32, 0, 2*Math.PI);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
    
    ctx.restore();
};

p.getNodePoint = function(){
	var smaller = this.width < this.height ? this.width : this.height;
	return new Point(this.position.x - this.width/2 + smaller*3/16, this.position.y - this.height/2 + smaller*3/16);
}

p.click = function(mouseState){
    this.question.displayWindows();
}

p.updateImage = function(){
    this.image.src = this.question.imageLink;
}

p.save = function(){
	this.question.positionPercentX = this.position.x/Constants.boardSize.x*100;
	this.question.positionPercentY = this.position.y/Constants.boardSize.y*100;
	this.question.saveXML();
}

module.exports = lessonNode;
},{"../case/question.js":3,"../helper/drawLib.js":9,"../helper/point.js":14,"./constants.js":6}],9:[function(require,module,exports){
"use strict";

//Module export
var m = module.exports;

m.clear = function(ctx, x, y, w, h) {
    ctx.clearRect(x, y, w, h);
}

m.rect = function(ctx, x, y, w, h, col, centerOrigin) {
    ctx.save();
    ctx.fillStyle = col;
    if(centerOrigin){
        ctx.fillRect(x - (w / 2), y - (h / 2), w, h);
    }
    else{
        ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
}

m.strokeRect = function(ctx, x, y, w, h, line, col, centerOrigin) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = line;
    if(centerOrigin){
        ctx.strokeRect(x - (w / 2), y - (h / 2), w, h);
    }
    else{
        ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
}

m.line = function(ctx, x1, y1, x2, y2, thickness, color) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
}

m.circle = function(ctx, x, y, radius, color){
    ctx.save();
    ctx.beginPath();
    ctx.arc(x,y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

// http://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag 
m.arrow = function(ctx, start, end, headlen, thickness, color){

    var angle = Math.atan2(end.y-start.y, end.x-start.x);
	
    ctx.save();
	ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(end.x-headlen*Math.cos(angle-Math.PI/6), end.y-headlen*Math.sin(angle-Math.PI/6));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x-headlen*Math.cos(angle+Math.PI/6), end.y-headlen*Math.sin(angle+Math.PI/6))
    ctx.closePath();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
}

function boardButton(ctx, position, width, height, hovered){
    //ctx.save();
    if(hovered){
        ctx.fillStyle = "dodgerblue";
    }
    else{
        ctx.fillStyle = "lightblue";
    }
    //draw rounded container
    ctx.rect(position.x - width/2, position.y - height/2, width, height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.fill();
    //ctx.restore();
}
},{}],10:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],11:[function(require,module,exports){
"use strict";
var Category = require("../case/category.js");
var Resource = require("../case/resources.js");
var Utilities = require('./utilities.js');
var Parser = require('./iparDataParser.js');

// Module export
var m = module.exports;

// ********************** LOADING ************************

// load the file entry and parse the xml
m.loadCase = function(caseData, windowDiv) {
    
    this.categories = [];
    this.questions = [];
	
	// Get the xml data
	var xmlData = Utilities.getXml(caseData.caseFile);
	var resources = Parser.getResources(xmlData);
	var categories = Parser.getCategoriesAndQuestions(xmlData, resources, windowDiv);
	
	// load the most recent progress from saveFile.ipardata
	var questions = [];
    
	// Get the save data
	var saveData = Utilities.getXml(caseData.saveFile);
	// alert user if there is an error
	if (!saveData) { alert ("ERROR no save data found, or save data was unreadable"); return; }
	// progress
	var stage = saveData.getElementsByTagName("case")[0].getAttribute("caseStatus");
	
	// parse the save data if not new
	if(stage>0){
		for(var file in caseData.submitted){
			if (!caseData.submitted.hasOwnProperty(file)) continue;
			file = file.substr(file.lastIndexOf("/")+1);
			var cat = file.indexOf("-"),
				que = file.indexOf("-", cat+1),
				fil = file.indexOf("-", que+1);
			categories[Number(file.substr(0, cat))].
				questions[Number(file.substr(cat+1, que-cat-1))].
				files[Number(file.substr(que+1, fil-que-1))] = 
					file.substr(file.indexOfAt("-", 3)+1);
		}
		Parser.assignQuestionStates(categories, saveData.getElementsByTagName("question"));
	}
	else
		stage = 1;
	
	// return results
	return {categories: categories, category:stage-1, resources:resources}; // maybe stage + 1 would be better because they are not zero indexed?
			   
}
					 
// ********************** SAVING ************************

/* here's the general outline of what is happening:
selectSaveLocation was the old way of doing things
now we use createZip
 - when this whole thing starts, we request a file system and save all the entries (directories and files) to the allEntries variable
 - then we get the blobs using readAsBinaryString and store those in an array when we are saving 
  - - could do that on page load to save time later..?
 - anyway, then we - in theory - take the blobs and use zip.file(entry.name, blob) to recreate the structure
 - and finally we download the zip with download()
 
*/

// called when the game is loaded, add onclick to save button that actually does the saving
m.prepareZip = function(saveButton) {
	//var content = zip.generate();
	
	//console.log("prepare zip");
	
	// code from JSZip site
	if (JSZip.support.blob) {
		//console.log("supports blob");
		
		// link download to click
		saveButton.onclick = saveIPAR;
  	}
}

// create IPAR file and download it
function saveIPAR() {
	
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	
	var zip = new JSZip();
	zip.file("caseFile.ipardata", caseData.caseFile);
	zip.file("saveFile.ipardata", caseData.saveFile);
	var submitted = zip.folder('submitted');
	console.log(caseData.submitted);
	for (var file in caseData.submitted) {
		if (!caseData.submitted.hasOwnProperty(file)) continue;
		var start = caseData.submitted[file].indexOf("base64,")+"base64,".length;
		submitted.file(file, caseData.submitted[file].substr(start), {base64: true});
	}

	
	zip.generateAsync({type:"base64"}).then(function (base64) {
		var a = document.createElement("a");
		a.style.display = 'none';
		a.href = "data:application/zip;base64," + base64;
		a.download = localStorage['caseName'];
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	});
	
}

/***************** CACHING *******************/

m.removeFilesFor = function(caseData, toRemove){

	var questionData = toRemove.board+"-"+toRemove.question+"-";
	for(var file in caseData.submitted){
		if (!caseData.submitted.hasOwnProperty(file) || !file.startsWith(questionData)) continue;
		delete caseData.submitted[file];
	}
	
}

// Adds a submitted file to the local stoarge
m.addNewFilesToSystem = function(caseData, toStore, callback){

	// Used for callback
	var totalCB = 1, curCB = 0;
	var finished = function(){
		if(++curCB>=totalCB){
			callback(caseData);
		}
	}
	
	for(var i=0;i<toStore.files.length;i++){
		(function(){
			var fileReader = new FileReader();
			var filename = toStore.board+"-"+toStore.question+"-"+i+"-"+toStore.files[i].name;
			totalCB++;
			fileReader.onload = function (event) {
				caseData.submitted[filename] =  event.target.result;
				finished();
		    };
		    fileReader.readAsDataURL(toStore.files[i]);
		})();
	}
	
	finished();
}
},{"../case/category.js":2,"../case/resources.js":4,"./iparDataParser.js":12,"./utilities.js":15}],12:[function(require,module,exports){
"use strict";
var Category = require("../case/category.js");
var Resources = require("../case/resources.js");
var Utilities = require('./utilities.js');
var Constants = require('../game/constants.js');
var Question = require('../case/question.js');

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
}
// conversion
var reverseStateConverter = ["hidden", "unsolved", "correct"];

var firstName = "unassigned";
var lastName = "unassigned";
var email = "email";

// Module export
var m = module.exports;
				
// ********************** LOADING ************************

// set the question states
m.assignQuestionStates = function(categories, questionElems) {
	console.log("qelems: " + questionElems.length);
	var tally = 0; // track total index in nested loop
	
	// all questions
	for (var i=0; i<categories.length; i++) {
		console.log("CATEGORY " + i);
		for (var j=0; j<categories[i].questions.length; j++, tally++) {
			// store question  for easy reference
			var q = categories[i].questions[j];
			
			// store tag for easy reference
			var qElem = questionElems[tally];
			
			// state
			q.currentState = stateConverter[qElem.getAttribute("questionState")];
			
			// justification
			if(q.justification)
				q.justification.value = qElem.getAttribute("justification");
			
			// Call correct answer if state is correct
			if(q.currentState==Question.SOLVE_STATE.SOLVED)
			  q.correctAnswer();
				
			// xpos
			q.positionPercentX = Utilities.map(parseInt(qElem.getAttribute("positionPercentX")), 0, 100, 0, Constants.boardSize.x);
			// ypos
			q.positionPercentY = Utilities.map(parseInt(qElem.getAttribute("positionPercentY")), 0, 100, 0, Constants.boardSize.y);
			
		}
	}
}

m.getResources = function(xmlData){
	var resourceElements = xmlData.getElementsByTagName("resourceList")[0].getElementsByTagName("resource");
	return new Resources(resourceElements, xmlData);
}

// takes the xml structure and fills in the data for the question object
m.getCategoriesAndQuestions = function(xmlData, resources, windowDiv) {
	// if there is a case file
	if (xmlData != null) {
		
		// Get player data 
		firstName = xmlData.getElementsByTagName("case")[0].getAttribute("profileFirst");
		lastName = xmlData.getElementsByTagName("case")[0].getAttribute("profileLast");
		xmlData.getElementsByTagName("case")[0].getAttribute("profileMail");
		
		// Then load the categories
		var categoryElements = xmlData.getElementsByTagName("category");
		var categoryNames = xmlData.getElementsByTagName("categoryList")[0].getElementsByTagName("element");
		var categories = [];
		for (var i=0; i<categoryElements.length; i++) {
			// Load each category (which loads each question)
			console.log(categoryElements[i]);
			console.log(parseInt(categoryElements[i].getAttribute("categoryDesignation")));
			categories[parseInt(categoryElements[i].getAttribute("categoryDesignation"))] = new Category(categoryNames[i].innerHTML, categoryElements[i], resources, windowDiv);
		}
		return categories;
	}
	return null
}

// creates a case file for zipping
m.recreateCaseFile = function(boards) {

	// create save file text
	var dataToSave = m.createXMLSaveFile(boards, true);
	
	console.log ("saveData.ipar data created");
	
	//if (callback) callback(dataToSave);
	return dataToSave;
	
}

// creates the xml
m.createXMLSaveFile = function(activeIndex, boards, includeNewline) {
	// newline
	var nl;
	includeNewline ? nl = "\n" : nl = "";
	// header
	var output = '<?xml version="1.0" encoding="utf-8"?>' + nl;
	// case data
	output += '<case categoryIndex="3" caseStatus="'+(activeIndex+1)+'" profileFirst="'+ firstName +'" profileLast="' + lastName + '" profileMail="'+ email +'">' + nl;
	// questions header
	output += '<questions>' + nl;
	
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
			var newJustification = q.justification.value;
			var justification;
			newJustification ? justification = newJustification : justification = q.justificationString;
			// handle undefined
			if (!justification) justification = "";
			output += 'justification="' + justification + '" ';
			// animated
			output += 'animated="' + (q.currentState == 2) + '" '; // might have to fix this later
			// linesTranced
			output += 'linesTraced="0" '; // might have to fix this too
			// revealThreshold
			output += 'revealThreshold  ="' + q.revealThreshold  +'" '; // and this
			// positionPercentX
			output += 'positionPercentX="' + Utilities.map(q.positionPercentX, 0, Constants.boardSize.x, 0, 100) + '" ';
			// positionPercentY
			output += 'positionPercentY="' + Utilities.map(q.positionPercentY, 0, Constants.boardSize.y, 0, 100) + '" ';
			
			// tag end
			output += '/>' + nl;
		}
	}
	output += "</questions>" + nl;
	output += "</case>" + nl;
	return output;
}

},{"../case/category.js":2,"../case/question.js":3,"../case/resources.js":4,"../game/constants.js":6,"./utilities.js":15}],13:[function(require,module,exports){
"use strict";
var Point = require('./point.js');

// private variables
var relativeMousePosition;
var mouseDownTimer, leftMouseClicked, maxClickDuration;
var mouseWheelVal;
var prevTime;
var deltaY;
var scaling, touchZoom, startTouchZoom;

function mouseState(){
	this.mousePosition = new Point(0,0);
    relativeMousePosition = new Point(0,0);
    this.virtualPosition = new Point(0,0);
    
    // Set variable defaults
    this.mouseDown = false;
    this.mouseIn = false;
    mouseDownTimer = 0;
    deltaY = 0;
    this.mouseWheelDY = 0;
    this.zoomDiff = 0;
    touchZoom = 0;
    this.mouseClicked = false;
    leftMouseClicked = false;
    maxClickDuration = 200;
	
}

var p = mouseState.prototype;

//event listeners for mouse interactions with the canvases
p.addCanvas = function(canvas){
    var mouseState = this;
    canvas.addEventListener("mousemove", function(e){
    	e.preventDefault();
    	mouseState.updatePosition(e);
    });
    canvas.addEventListener("touchmove", function(e){
    	e.preventDefault();
    	if(scaling)
    		mouseState.updateTouchPositions(e);
    	else
    		mouseState.updatePosition(e.touches[0]);
    });
    canvas.addEventListener("mousedown", function(e){
    	e.preventDefault();
    	if (e.which && e.which!=3 || e.button && e.button!=2)
	    	mouseState.mouseDown = true;
    });
    canvas.addEventListener("contextmenu", function(e){
    	leftMouseClicked = true;
    });
    canvas.addEventListener("touchstart", function(e){
    	e.preventDefault();
    	if(e.touches.length == 1 && !scaling){
    		mouseState.updatePosition(e.touches[0]);
	        setTimeout(function(){
	        	mouseState.mouseDown = true;
	        });
    	}
    	else if(e.touches.length == 2){
    		mouseState.mouseDown = false;
    		scaling = true;
    		mouseState.updateTouchPositions(e);
    		startTouchZoom = touchZoom;
    	}
    });
    canvas.addEventListener("mouseup", function(e){
    	e.preventDefault();
    	if (e.which && e.which!=3 || e.button && e.button!=2)
	    	mouseState.mouseDown = false;
    });
    canvas.addEventListener("touchend", function(e){
    	e.preventDefault();
    	if(scaling){
    		scaling = false;
    	    touchZoom = 0;
    	    startTouchZoom = 0;
    	}
    	mouseState.mouseDown = false;
    });
    canvas.addEventListener("mouseover", function(e){
    	mouseState.mouseIn = true;
    });
    canvas.addEventListener("mouseout", function(e){
    	mouseState.mouseIn = false;
    	mouseState.mouseDown = false;
    });
    canvas.addEventListener('mousewheel',function(event){
    	event.preventDefault();
        deltaY += event.deltaY;
    }, false);
}

p.updatePosition = function(e){
    this.mousePosition = new Point(e.clientX, e.clientY);
    relativeMousePosition = new Point(this.mousePosition.x - (window.innerWidth/2.0), this.mousePosition.y - (window.innerHeight/2.0));
}

p.updateTouchPositions = function(e){
	var curTouches = [
	               new Point(e.touches[0].clientX, e.touches[0].clientY),
	               new Point(e.touches[1].clientX, e.touches[1].clientY)
	];
	touchZoom = Math.sqrt(Math.pow(curTouches[0].x-curTouches[1].x, 2)+Math.pow(curTouches[0].y-curTouches[1].y, 2));
}

// Update the mouse to the current state
p.update = function(dt, scale){
    
	// Save the current virtual position from scale
	this.virtualPosition = new Point(relativeMousePosition.x/scale, relativeMousePosition.y/scale);;
	
	// Get the currtenl delta y for the mouse wheel
    this.mouseWheelDY = deltaY;
    deltaY = 0;
	
	// Save the zoom diff and prev zoom
	if(scaling)
		this.zoomDiff = startTouchZoom - touchZoom;
	else
		this.zoomDiff = 0;
    
    // check mouse click
    this.mouseClicked = false;
    if (this.mouseDown)
    	mouseDownTimer += dt;
    else{
    	if (mouseDownTimer > 0 && mouseDownTimer < maxClickDuration)
    		this.mouseClicked = true;
    	mouseDownTimer = 0;
    }
    
    this.prevMouseDown = this.mouseDown;
    this.hasTarget = false;
    
}

p.leftMouseClicked = function() {
	var temp = leftMouseClicked;
	leftMouseClicked = false;
	return temp;
}

module.exports = mouseState;
},{"./point.js":14}],14:[function(require,module,exports){
"use strict";
function Point(pX, pY){
    this.x = pX;
    this.y = pY;
}

var p = Point.prototype;

p.add = function(pX, pY){
	if(pY)
		return new Point(this.x+pX, this.y+pY);
	else
		return new Point(this.x+pX.x, this.y+pX.y);
}

p.mult = function(pX, pY){
	if(pY)
		return new Point(this.x*pX, this.y*pY);
	else
		return new Point(this.x*pX.x, this.y*pX.y);
}

p.scale = function(scale){
	return new Point(this.x*scale, this.y*scale);
}

module.exports = Point;
},{}],15:[function(require,module,exports){
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

//determines whether the mouse is intersecting the area
m.mouseIntersect = function(pMouseState, area, pOffsetter){
    if(pMouseState.virtualPosition.x > area.position.x - area.width/2 - pOffsetter.x && pMouseState.virtualPosition.x < area.position.x + area.width/2 - pOffsetter.x &&
    		pMouseState.virtualPosition.y > area.position.y - area.height/2 - pOffsetter.y && pMouseState.virtualPosition.y < area.position.y + area.height/2 - pOffsetter.y)
            return true;
    else
    	return false;
}

//determines whether the mouse is intersecting the area around the given area and at what side (result is side n - north, w - west, s - south, e - east, nw - northwest, etc.)
m.mouseIntersectEdge = function(pMouseState, area, outline, pOffsetter){
	var bounds = {left: area.position.x - area.width/2 - pOffsetter.x,
					right: area.position.x + area.width/2 - pOffsetter.x,
					top: area.position.y - area.height/2 - pOffsetter.y,
					bottom: area.position.y + area.height/2 - pOffsetter.y};
    if (pMouseState.virtualPosition.x > bounds.left - outline && pMouseState.virtualPosition.x < bounds.right + outline &&
    		pMouseState.virtualPosition.y > bounds.top - outline && pMouseState.virtualPosition.y < bounds.bottom + outline){
    	var side = '';
    	if(pMouseState.virtualPosition.y <= bounds.top)
    		side += 'n';
    	if(pMouseState.virtualPosition.y >= bounds.bottom)
    		side += 's';
    	if(pMouseState.virtualPosition.x <= bounds.left)
    		side += 'w';
    	if(pMouseState.virtualPosition.x >= bounds.right)
    		side += 'e';
    	if(side!=1)
    		return side
    }
    return null;
}


// gets the xml object of a string
m.getXml = function(xml){
	
	// Clean up the xml
	xml = xml.trim();
	while(xml.charCodeAt(0)<=32)
		xml = xml.substr(1);
	xml = xml.trim();
	
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

m.replaceAll = function (str, target, replacement) {
	while (str.indexOf(target) > -1) {
		str = str.replace(target,replacement);
	}
	return str;
}

// Gets the index of the nth search string (starting at 1, 0 will always return 0)
String.prototype.indexOfAt = function(search, num){
	var curIndex = 0;
	for(var i=0;i<num && curIndex!=-1;i++)
		curIndex = this.indexOf(search, curIndex+1);
	return curIndex;
}

},{"./point.js":14}],16:[function(require,module,exports){

var m = module.exports;

m.editInfo = '\
<div class="window popup">\
	<div class="title">\
		Case Info\
	</div>\
	<div class="windowContent" style="min-height:35vh;">\
		<form onsubmit="return false;">\
			<b>Name</b><br>\
			<input name="caseName" value="%caseName%"><br>\
			<b>Description</b><br>\
		 	<p><div class="text-box large" contenteditable>%description%</div></p>\
			<b>Conclusion</b><br>\
	 		<p><div class="text-box large" contenteditable>%conclusion%</div></p>\
			<button class="halfButton">Back</button><button class="halfButton">Apply Changes</button>\
		</form>\
	</div>\
</div>\
';

m.resourcesWindow = '\
<div class="window popup">\
	<div class="title">\
		Resources\
	</div>\
	<div class="windowContent">\
		<div class="resourceContent" style="overflow-y:scroll;height:35vh;">\
		</div>\
		<br>\
		<button class="halfButton">Back</button><button class="halfButton">Create New Resources</button>\
	</div>\
</div>\
';

m.resource = '\
<div class="resourceItem">\
  <img src="%icon%" class="icon"/>\
  <img src="../img/iconClose.png" class="delete"/>\
  <img src="../img/iconTools.png" class="edit"/>\
  <div class="resourceText">%title%\
  <br>\
  <span style="color:gray;">%link%</span></div>\
</div>\
';

m.resourceEditor = '\
<div class="window popup">\
	<div class="title">\
		%edit% Resource\
	</div>\
	<div class="windowContent">\
		<form onsubmit="return false;">\
			<select name="type" class="full">\
				<option value="0">File Refrence</option>\
				<option value="1">Web Link</option>\
				<option value="2">Video Link</option>\
			</select>\
			<b>Display Name</b><br>\
			<input name="name" value="%name%"><br>\
			<b>Link Address (www. needed)</b><br>\
			<input name="link" value="%link%">\
		</form>\
		<br>\
		<button class="halfButton">Cancel</button><button class="halfButton">%apply%</button>\
	</div>\
</div>\
';

m.textInput = '\
<div class="window popup">\
	<div class="title">\
		%title%\
	</div>\
	<div class="windowContent">\
		<form onsubmit="return false;">\
			<b>%prompt%</b><br>\
			<input name="text" value="%value%"><br>\
		</form>\
		<br>\
		<button class="halfButton">Cancel</button><button class="halfButton">%apply%</button>\
	</div>\
</div>\
';
},{}],17:[function(require,module,exports){

var m = module.exports;

m.taskWindow = '\
<div class="window task">\
	<div class="title">\
		Task\
	</div>\
	<div class="windowContent" style="overflow-y: scroll;height:30vh;">\
		<h3><b>Question Name</b></h3>\
		<h3><b><div class="text-box" contenteditable>%title%</div></b></h3><br>\
		<p>Instructions</p>\
		<p><div class="text-box large" contenteditable>%instructions%</div></p>\
		<hr>\
		<p><b>Question</b></p>\
		<p><b><div class="text-box large" contenteditable>%question%</div></b></p>\
	</div>\
</div>\
';


m.resourceWindow = '\
<div class="window resource">\
	<div class="title">\
		Resource\
	</div>\
	<div class="windowContent" style="overflow-y: scroll; height:20vh;">\
		<div class="resourceContent">\
		</div>\
		<br>\
		<button class="full">Add Resource</button>\
	</div>\
</div>\
';

m.resource = '\
<div class="resourceItem">\
  <img src="%icon%" class="icon"/>\
  <img src="../img/iconClose.png" class="delete"/>\
  <div class="resourceText">%title%</div>\
  <a href="%link%" target="_blank">\
    <div class="center">\
      Open\
      <img src="../img/iconLaunch.png"/>\
    </div>\
  </a>\
</div>\
';

m.answerWindow = '\
<div class="window answer">\
	<div class="title">\
		Answers\
	</div>\
	<div class="windowContent" style="min-height:20vh;">\
		<select>\
			<option value="2">2</option>\
			<option value="3">3</option>\
			<option value="4">4</option>\
			<option value="5">5</option>\
		</select>\
		answers. Select correct answer with radio button.\
		<form onsubmit="return false;">\
		\
		</form>\
	</div>\
</div>\
';

m.answer ='\
<input type="radio" name="answer" value="%num%" class="answerRadio">\
<div class="answerInputs">\
	<b>Choice %num%</b><br>\
	<input name="answer%num%" value="%answer%"><br>\
	Feedback<br>\
	<input name="feedback%num%" value="%feedback%"><br>\
</div>\
';

m.messageWindow = '\
<div class="window message">\
	<div class="title">\
		Message\
	</div>\
	<div class="windowContent" style="height:60vh;overflow-y:scroll;">\
		<p><b>From </b>\
		<div class="text-box" contenteditable>%title%</div></p>\
		<hr>\
		<p><b>Subject </b>\
		<div class="text-box" contenteditable>%instructions%</div></p>\
		<hr>\
		<p>Message</p>\
		<p><div class="text-box tall" contenteditable>%question%</div></p>\
	</div>\
</div>\
';

m.questionTypeWindow = '\
<div class="window type">\
	<div class="title">\
		Question Type\
	</div>\
	<div class="windowContent">\
		<select class="full">\
			<option value="1">Justification Multiple Choice</option>\
			<option value="2">Standard Multiple Choice</option>\
			<option value="3">Short Response</option>\
			<option value="4">File Submisson</option>\
			<option value="5">Message</option>\
		</select>\
		<button class="imageButton">\
		  <div><img src="../img/placeholder.png"/></div>\
		  <div> Select Image </div>\
		</button>\
	</div>\
	<div class="windowButtons">\
		<button>Save</button>\
	</div>\
</div>\
';
},{}],18:[function(require,module,exports){
var Utilities = require('../helper/utilities.js');

// HTML
var section;

//Elements
var nameInput, descriptionInput, cat1Input;
var create, back;

// The cur case
var caseFile;

// The next page to open when this one closes
var next;

var NEXT = Object.freeze({NONE: 0, TITLE: 1, BOARD: 2});

function CreateMenu(pSection){
	section = pSection;
	next = NEXT.NONE;
	
	// Get the html elements
	nameInput = document.querySelector('#'+section.id+' #input-name');
	descriptionInput = document.querySelector('#'+section.id+' #input-description');
	conclusionInput = document.querySelector('#'+section.id+' #input-conclusion');
	cat1Input = document.querySelector('#'+section.id+' #input-cat1');
	create = document.querySelector('#'+section.id+' #create-button');
	back = document.querySelector('#'+section.id+' #back-button');
    
	// Setup the buttons
	back.onclick = function(){
    	page.next = NEXT.TITLE;
    	page.close();
    };
	var page = this;
    create.onclick = function(){
    	page.next = NEXT.BOARD;
    	
    	// Set the inputs to the current case
    	var curCase = caseFile.getElementsByTagName("case")[0];
    	curCase.setAttribute('caseName', nameInput.value);
    	curCase.setAttribute('description', descriptionInput.innerHTML);
    	curCase.setAttribute('conclusion', conclusionInput.innerHTML);
    	var catList = curCase.getElementsByTagName('categoryList')[0];
    	catList.setAttribute('categoryCount', '1');
    	catList.innerHTML = '<element>'+cat1Input.value+'</element>';
    	var cat1 = caseFile.createElement('category');
    	cat1.setAttribute('categoryDesignation', '0');
    	cat1.setAttribute('questionCount', '0');
    	curCase.appendChild(cat1);
    	
    	// Save the changes to local storage
    	localStorage['caseName'] = nameInput.value+".ipar";
    	var caseData = JSON.parse(localStorage['caseDataCreate']);
    	caseData.caseFile = new XMLSerializer().serializeToString(caseFile);
		localStorage['caseDataCreate'] = JSON.stringify(caseData);
    	page.close();
    };
}

var p = CreateMenu.prototype;

p.open = function(pNewProfile){

	
	// Save the status of new profile for the procceed button
	newProfile = pNewProfile;
	
	// Make the menu visible
	section.style.display = '';
	
	// The case data and the title element
	var caseData = JSON.parse(localStorage['caseDataCreate']);
	
	// Get the case
	caseFile = Utilities.getXml(caseData.caseFile);
		
	// Make it so that create is disabled until you at least have a name and 1st cat
	var checkProceed = function(){
		if(nameInput.value=="" ||
			cat1Input.value=="")
			create.disabled = true;
		else
			create.disabled = false;
	};
	nameInput.addEventListener('change', checkProceed);
	cat1Input.addEventListener('change', checkProceed);
	checkProceed();
	
}

p.close = function(){
	section.style.display = 'none';
	if(this.onclose)
		this.onclose();
}

module.exports = CreateMenu;
module.exports.NEXT = NEXT;
},{"../helper/utilities.js":15}],19:[function(require,module,exports){
var Windows = require('../html/popupWindows.js');

var m = module.exports;

m.editInfo = function(windowDiv, caseFile, callback){
	
	// Create the popup window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.editInfo;
    var editInfo = tempDiv.firstChild;
    
    // Fill it with the given info
    var caseInfo = caseFile.getElementsByTagName("case")[0];
    editInfo.innerHTML = editInfo.innerHTML.replace(/%caseName%/g, caseInfo.getAttribute("caseName")).replace(/%description%/g, caseInfo.getAttribute("description")).replace(/%conclusion%/g, caseInfo.getAttribute("conclusion"));
    
    // Setup the buttons
    var buttons = editInfo.getElementsByTagName("button");
    buttons[0].onclick = function(){
    	windowDiv.innerHTML = '';
    	callback(caseFile, caseInfo.getAttribute("caseName"));
    }
    buttons[1].onclick = function(){
    	windowDiv.innerHTML = '';
    	var form = editInfo.getElementsByTagName("form")[0];
    	var divs = form.getElementsByTagName("div");
    	caseInfo.setAttribute("caseName", form.elements["caseName"].value);
    	caseInfo.setAttribute("description", divs[0].innerHTML);
    	caseInfo.setAttribute("conclusion", divs[1].innerHTML);
    	callback(caseFile, form.elements["caseName"].value);
    }

    // Display the window
    windowDiv.innerHTML = '';
    windowDiv.appendChild(editInfo);
    
    
}

m.prompt = function(windowDiv, title, prompt, defaultValue, applyText, callback){
	
	// Create the popup window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.textInput;
    var promptWindow = tempDiv.firstChild;
    
    // Fill it with the given info
    promptWindow.innerHTML = promptWindow.innerHTML.replace(/%title%/g, title).replace(/%prompt%/g, prompt).replace(/%value%/g, defaultValue).replace(/%apply%/g, applyText);
    
    // Setup the buttons
    var buttons = promptWindow.getElementsByTagName("button");
    buttons[0].onclick = function(){
    	windowDiv.innerHTML = '';
    	callback();
    }
    buttons[1].onclick = function(){
    	windowDiv.innerHTML = '';
    	callback(promptWindow.getElementsByTagName("form")[0].elements["text"].value);
    }

    // Display the window
    windowDiv.innerHTML = '';
    windowDiv.appendChild(promptWindow);
	
}
},{"../html/popupWindows.js":16}],20:[function(require,module,exports){

// HTML
var section;

// Parts of the html
var loadInput, loadButton, createButton, continueButton, menuButton;

// The next page to open when this one closes
var next;

var NEXT = Object.freeze({NONE: 0, BOARD: 1, CREATE: 2});

function TitleMenu(pSection){
	section = pSection;
	next = NEXT.NONE;
	
	// Get the load button and input
	loadInput = document.querySelector('#'+section.id+' #load-input');
	loadButton = document.querySelector('#'+section.id+' #load-button');
	createButton = document.querySelector('#'+section.id+' #create-button');
	continueButton = document.querySelector('#'+section.id+' #continue-button');
	menuButton = document.querySelector('#'+section.id+' #menu-button');
	
	// Setup the buttons
	createButton.onclick = this.create.bind(this);
	loadButton.onclick = function(){
		if(localStorage['caseDataCreate'] && !confirm("Are you sure you want to start a new case? Your autosave data will be lost!"))
			return;
		loadInput.click.bind(loadInput);
	}
	loadInput.addEventListener('change', this.loadFile.bind(this), false);
	continueButton.onclick = this.close.bind(this);
	menuButton.onclick = function(){window.location.href = "../index.html";};
}

var p = TitleMenu.prototype;

p.open = function(){
	
	// Display the section holding the menu
	section.style.display = '';
	
	// Setup continue button based on local stoarge
	if(localStorage['caseDataCreate'])
		continueButton.disabled = false;
	else
		continueButton.disabled = true;
	this.next = NEXT.BOARD;
	
	// Set the button to not disabled in case coming back to this menu
	loadButton.disabled = false;
	loadInput.disabled = false;
	menuButton.disabled = false;
	
}

p.create = function(){

	if(localStorage['caseDataCreate'] && !confirm("Are you sure you want to start a new case? Your autosave data will be lost!"))
		return;
	
	// Set the button to disabled so that it can't be pressed while loading
	loadButton.disabled = true;
	loadInput.disabled = true;
	createButton.disabled = true;
	continueButton.disabled = true;
	continueButton.disabled = true;
	
	var page = this;
	var request = new XMLHttpRequest();
	request.responseType = "arraybuffer";
	request.onreadystatechange = function() {
	  if (request.readyState == 4 && request.status == 200) {
		  	
			// Create a worker for unzipping the file
			var zipWorker = new Worker("../lib/unzip.js");
			zipWorker.onmessage = function(message) {
				
				// Save the base url to local storage
				localStorage['caseDataCreate'] = JSON.stringify(message.data);
				
				// go to the next page
				page.next = NEXT.CREATE;
				page.close();
			}
			
			// Start the worker
			zipWorker.postMessage(request.response);
	  }
	};
	request.open("GET", "base.ipar", true);
	request.send();
	
}

p.loadFile = function(event){
	
	// Make sure a ipar file was choosen
	if(!loadInput.value.endsWith("ipar")){
		alert("You didn't choose an ipar file! you can only load ipar files!");
		return;
	}
	localStorage['caseName'] = event.target.files[0].name;

	// Set the button to disabled so that it can't be pressed while loading
	loadButton.disabled = true;
	loadInput.disabled = true;
	createButton.disabled = true;
	
	// Create a reader and read the zip
	var page = this;
	var reader = new FileReader();
	reader.onload = function(event){
	
		// since the user is loading a fresh file, clear the autosave (soon we won't use this at all)
		localStorage.setItem("autosave","");
		
		// Create a worker for unzipping the file
		var zipWorker = new Worker("lib/unzip.js");
		zipWorker.onmessage = function(message) {
			
			// Save the base url to local storage
			localStorage['caseDataCreate'] = JSON.stringify(message.data);
			
			// Redirect to the next page
			page.next = NEXT.BOARD;
			page.close();
			
		}
		
		// Start the worker
		zipWorker.postMessage(event.target.result);
		
	};
	reader.readAsArrayBuffer(event.target.files[0]);
	
}

p.close = function(){
	section.style.display = 'none';
	if(this.onclose)
		this.onclose();
}

module.exports = TitleMenu;
module.exports.NEXT = NEXT;
},{}]},{},[1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3IvanMvbWFpbi5qcyIsImVkaXRvci9qcy9tb2R1bGVzL2Nhc2UvY2F0ZWdvcnkuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9jYXNlL3F1ZXN0aW9uLmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvY2FzZS9yZXNvdXJjZXMuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9nYW1lL2JvYXJkLmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvZ2FtZS9jb25zdGFudHMuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9nYW1lL2dhbWUuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9nYW1lL2xlc3Nvbk5vZGUuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9oZWxwZXIvZHJhd0xpYi5qcyIsImVkaXRvci9qcy9tb2R1bGVzL2hlbHBlci9maWxlTWFuYWdlci5qcyIsImVkaXRvci9qcy9tb2R1bGVzL2hlbHBlci9pcGFyRGF0YVBhcnNlci5qcyIsImVkaXRvci9qcy9tb2R1bGVzL2hlbHBlci9tb3VzZVN0YXRlLmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvaGVscGVyL3BvaW50LmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvaGVscGVyL3V0aWxpdGllcy5qcyIsImVkaXRvci9qcy9tb2R1bGVzL2h0bWwvcG9wdXBXaW5kb3dzLmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvaHRtbC9xdWVzdGlvbldpbmRvd3MuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9tZW51cy9jcmVhdGVNZW51LmpzIiwiZWRpdG9yL2pzL21vZHVsZXMvbWVudXMvcG9wdXAuanMiLCJlZGl0b3IvanMvbW9kdWxlcy9tZW51cy90aXRsZU1lbnUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcllBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMza0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsU2NyZWVuID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsU2NyZWVuIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbFNjcmVlbiB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW47XHJcblxyXG4vL2ltcG9ydHNcclxudmFyIEdhbWUgPSByZXF1aXJlKCcuL21vZHVsZXMvZ2FtZS9nYW1lLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oZWxwZXIvcG9pbnQuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9nYW1lL2NvbnN0YW50cy5qcycpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9tb2R1bGVzL2hlbHBlci91dGlsaXRpZXMuanMnKTtcclxudmFyIFRpdGxlTWVudSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tZW51cy90aXRsZU1lbnUuanMnKTtcclxudmFyIENyZWF0ZU1lbnUgPSByZXF1aXJlKCcuL21vZHVsZXMvbWVudXMvY3JlYXRlTWVudS5qcycpO1xyXG5cclxuLy8gVGhlIGN1cnJlbnQgZ2FtZVxyXG52YXIgZ2FtZTtcclxuXHJcbi8vIFRoZSBzZWN0aW9uIGhvbGRpbmcgdGhlIGJvYXJkXHJcbnZhciBib2FyZFNlY3Rpb247XHJcblxyXG4vLyBUaGUgY3VycmVudCBwYWdlIHRoZSB3ZWJzaXRlIGlzIG9uXHJcbnZhciBjdXJQYWdlO1xyXG52YXIgbWVudXMgPSBbXTtcclxudmFyIFBBR0UgPSBPYmplY3QuZnJlZXplKHtUSVRMRTogMCwgQ1JFQVRFOiAxLCBCT0FSRDogMn0pO1xyXG5cclxuLy9maXJlcyB3aGVuIHRoZSB3aW5kb3cgbG9hZHNcclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgc2VjdGlvbnNcclxuXHRib2FyZFNlY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJvYXJkXCIpO1xyXG5cdFxyXG5cdC8vIFNldHVwIHRpdGxlIG1lbnVcclxuXHRtZW51c1tQQUdFLlRJVExFXSA9IG5ldyBUaXRsZU1lbnUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0aXRsZU1lbnVcIikpO1xyXG5cdG1lbnVzW1BBR0UuVElUTEVdLm9uY2xvc2UgPSBmdW5jdGlvbigpe1xyXG5cdFx0c3dpdGNoKHRoaXMubmV4dCl7XHJcblx0XHRjYXNlIFRpdGxlTWVudS5ORVhULkJPQVJEOlxyXG5cdFx0XHRjdXJQYWdlID0gUEFHRS5CT0FSRDtcclxuXHRcdFx0Y3JlYXRlQ2FzZSgpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgVGl0bGVNZW51Lk5FWFQuQ1JFQVRFOlxyXG5cdFx0XHRjdXJQYWdlID0gUEFHRS5DUkVBVEU7XHJcblx0XHRcdG1lbnVzW2N1clBhZ2VdLm9wZW4oKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cclxuXHQvLyBTZXR1cCBjcmVhdGUgbWVudVxyXG5cdG1lbnVzW1BBR0UuQ1JFQVRFXSA9IG5ldyBDcmVhdGVNZW51KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlTWVudVwiKSk7XHJcblx0bWVudXNbUEFHRS5DUkVBVEVdLm9uY2xvc2UgPSBmdW5jdGlvbigpe1xyXG5cdFx0c3dpdGNoKHRoaXMubmV4dCl7XHJcblx0XHRjYXNlIENyZWF0ZU1lbnUuTkVYVC5CT0FSRDpcclxuXHRcdFx0Y3VyUGFnZSA9IFBBR0UuQk9BUkQ7XHJcblx0XHRcdGNyZWF0ZUNhc2UoKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIENyZWF0ZU1lbnUuTkVYVC5USVRMRTpcclxuXHRcdFx0Y3VyUGFnZSA9IFBBR0UuVElUTEU7XHJcblx0XHRcdG1lbnVzW2N1clBhZ2VdLm9wZW4oKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8vIE9wZW4gdGhlIHRpdGxlIG1lbnVcclxuICAgIGN1clBhZ2UgPSBQQUdFLlRJVExFO1xyXG4gICAgbWVudXNbUEFHRS5USVRMRV0ub3BlbigpO1xyXG4gICAgXHJcbn1cclxuXHJcbi8vIGNyZWF0ZSB0aGUgZ2FtZSBvYmplY3QgYW5kIHN0YXJ0IHRoZSBsb29wIHdpdGggYSBkdFxyXG5mdW5jdGlvbiBjcmVhdGVDYXNlKCl7XHJcblx0Y29uc29sZS5sb2coXCJHQU1FXCIpO1xyXG5cdC8vIFNob3cgdGhlIHNlY3Rpb24gZm9yIHRoZSBnYW1lXHJcblx0Ym9hcmRTZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cdFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBnYW1lXHJcbiAgICBnYW1lID0gbmV3IEdhbWUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib2FyZFwiKSwgVXRpbGl0aWVzLmdldFNjYWxlKENvbnN0YW50cy5ib2FyZFNpemUsIG5ldyBQb2ludCh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KSkpO1xyXG4gICAgXHJcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBsb29wXHJcbiAgICBnYW1lTG9vcChEYXRlLm5vdygpKTtcclxuICAgIFxyXG59XHJcblxyXG4vL2ZpcmVzIG9uY2UgcGVyIGZyYW1lIGZvciB0aGUgZ2FtZVxyXG5mdW5jdGlvbiBnYW1lTG9vcChwcmV2VGltZSl7XHJcbiAgICBcclxuICAgIC8vIHVwZGF0ZSBnYW1lXHJcbiAgICBnYW1lLnVwZGF0ZShEYXRlLm5vdygpIC0gcHJldlRpbWUpO1xyXG4gICAgXHJcblx0Ly8gbG9vcFxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcC5iaW5kKHRoaXMsIERhdGUubm93KCkpKTtcclxuICAgIFxyXG59XHJcblxyXG4vL2xpc3RlbnMgZm9yIGNoYW5nZXMgaW4gc2l6ZSBvZiB3aW5kb3cgYW5kIHNjYWxlcyB0aGUgZ2FtZSBhY2NvcmRpbmdseVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbihlKXtcclxuXHRcclxuXHQvLyBTY2FsZSB0aGUgZ2FtZSB0byB0aGUgbmV3IHNpemVcclxuXHRpZihjdXJQYWdlPT1QQUdFLkJPQVJEKVxyXG5cdFx0Z2FtZS5zZXRTY2FsZShVdGlsaXRpZXMuZ2V0U2NhbGUoQ29uc3RhbnRzLmJvYXJkU2l6ZSwgbmV3IFBvaW50KHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpKSk7XHJcblx0XHJcbn0pO1xyXG5cclxuLy8gTGlzdGVuIGZvciB0b3VjaCBmb3IgZnVsbHNjcmVlbiB3aGlsZSBpbiBnYW1lIG9uIG1vYmlsZVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcclxuXHRpZihjdXJQYWdlPT1QQUdFLkJPQVJEICYmIHdpbmRvdy5tYXRjaE1lZGlhKFwib25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2MHB4KVwiKSlcclxuXHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbFNjcmVlbigpO1xyXG5cdFxyXG59LCBmYWxzZSk7XHJcblxyXG4vLyBTdG9wIHRoZSBkZWZhdWx0IGNvbnRleHQgbWVudSBmcm9tIHdvcmtpbmdcclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLCBmdW5jdGlvbihlKXtcclxuXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxuXHJcbi8vIENyZWF0ZXMgYSBjYXRlZ29yeSB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBmcm9tIHRoZSBnaXZlbiB4bWxcclxuZnVuY3Rpb24gQ2F0ZWdvcnkobmFtZSwgeG1sLCByZXNvdXJjZXMsIHdpbmRvd0Rpdil7XHJcblx0XHJcblx0Ly8gU2F2ZSB0aGUgbmFtZVxyXG5cdHRoaXMubmFtZSA9IG5hbWU7XHJcblx0XHJcblx0Ly8gTG9hZCBhbGwgdGhlIHF1ZXN0aW9uc1xyXG5cdHZhciBxdWVzdGlvbkVsZW1lbnRzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYnV0dG9uXCIpO1xyXG5cdHRoaXMucXVlc3Rpb25zID0gW107XHJcblx0Ly8gY3JlYXRlIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxxdWVzdGlvbkVsZW1lbnRzLmxlbmd0aDsgaSsrKSBcclxuXHR7XHJcblx0XHQvLyBjcmVhdGUgYSBxdWVzdGlvbiBvYmplY3RcclxuXHRcdHRoaXMucXVlc3Rpb25zW2ldID0gbmV3IFF1ZXN0aW9uKHF1ZXN0aW9uRWxlbWVudHNbaV0sIHJlc291cmNlcywgd2luZG93RGl2LCBpKTtcclxuXHR9XHJcbiAgICBcclxufVxyXG5cclxudmFyIHAgPSBDYXRlZ29yeS5wcm90b3R5cGU7XHJcblxyXG5wLnhtbCA9IGZ1bmN0aW9uKHhtbERvYywgY2F0RGVzKXtcclxuXHR2YXIgeG1sID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoXCJjYXRlZ29yeVwiKTtcclxuXHR4bWwuc2V0QXR0cmlidXRlKFwiY2F0ZWdvcnlEZXNpZ25hdGlvblwiLCBjYXREZXMpO1xyXG5cdHhtbC5zZXRBdHRyaWJ1dGUoXCJxdWVzdGlvbkNvdW50XCIsIHRoaXMucXVlc3Rpb25zLmxlbmd0aCk7XHJcblx0Zm9yICh2YXIgaT0wOyBpPHRoaXMucXVlc3Rpb25zLmxlbmd0aDsgaSsrKSBcclxuXHRcdHhtbC5hcHBlbmRDaGlsZCh0aGlzLnF1ZXN0aW9uc1tpXS54bWwpO1xyXG5cdHJldHVybiB4bWw7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2F0ZWdvcnk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuLi9oZWxwZXIvdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuLi9nYW1lL2NvbnN0YW50cy5qcycpO1xyXG52YXIgV2luZG93cyA9IHJlcXVpcmUoJy4uL2h0bWwvcXVlc3Rpb25XaW5kb3dzLmpzJyk7XHJcbnZhciBQb3B1cCA9IHJlcXVpcmUoJy4uL21lbnVzL3BvcHVwLmpzJyk7XHJcblxyXG52YXIgU09MVkVfU1RBVEUgPSBPYmplY3QuZnJlZXplKHtISURERU46IDAsIFVOU09MVkVEOiAxLCBTT0xWRUQ6IDJ9KTtcclxudmFyIFFVRVNUSU9OX1RZUEUgPSBPYmplY3QuZnJlZXplKHtKVVNUSUZJQ0FUSU9OOiAxLCBNVUxUSVBMRV9DSE9JQ0U6IDIsIFNIT1JUX1JFU1BPTlNFOiAzLCBGSUxFOiA0LCBNRVNTQUdFOiA1fSk7XHJcblxyXG4vKiBRdWVzdGlvbiBwcm9wZXJ0aWVzOlxyXG5jdXJyZW50U3RhdGU6IFNPTFZFX1NUQVRFXHJcbndpbmRvd0RpdjogZWxlbWVudFxyXG5jb3JyZWN0OiBpbnRcclxucG9zaXRpb25QZXJjZW50WDogZmxvYXRcclxucG9zaXRpb25QZXJjZW50WTogZmxvYXRcclxucmV2ZWFsVGhyZXNob2xkOiBpbnRcclxuaW1hZ2VMaW5rOiBzdHJpbmdcclxuZmVlZGJhY2tzOiBzdHJpbmdbXVxyXG5jb25uZWN0aW9uRWxlbWVudHM6IGVsZW1lbnRbXVxyXG5jb25uZWN0aW9uczogaW50W11cclxucXVlc3Rpb25UeXBlOiBTT0xWRV9TVEFURVxyXG5qdXN0aWZpY2F0aW9uOiBzdHJpbmdcclxud3JvbmdBbnN3ZXI6IHN0cmluZ1xyXG5jb3JyZWN0QW5zd2VyOiBzdHJpbmdcclxuKi9cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gUXVlc3Rpb24oeG1sLCByZXNvdXJjZXMsIHdpbmRvd0RpdiwgbnVtKXtcclxuXHRcclxuXHQvLyBTZXQgdGhlIGN1cnJlbnQgc3RhdGUgdG8gZGVmYXVsdCBhdCBoaWRkZW4gYW5kIHN0b3JlIHRoZSB3aW5kb3cgZGl2XHJcbiAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IFNPTFZFX1NUQVRFLkhJRERFTjtcclxuICAgIHRoaXMud2luZG93RGl2ID0gd2luZG93RGl2O1xyXG4gICAgdGhpcy5udW0gPSBudW07XHJcbiAgICB0aGlzLnhtbCA9IHhtbDtcclxuICAgIHRoaXMucmVzb3VyY2VzID0gcmVzb3VyY2VzO1xyXG4gICAgXHJcbiAgICB0aGlzLnJlZnJlc2goKTtcclxuICAgIFxyXG59XHJcblxyXG52YXIgcCA9IFF1ZXN0aW9uLnByb3RvdHlwZTtcclxuXHJcbnAucmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIC8vIEdldCBhbmQgc2F2ZSB0aGUgZ2l2ZW4gaW5kZXgsIGNvcnJlY3QgYW5zd2VyLCBwb3NpdGlvbiwgcmV2ZWFsIHRocmVzaG9sZCwgaW1hZ2UgbGluaywgZmVlZGJhY2ssIGFuZCBjb25uZWN0aW9uc1xyXG4gICAgdGhpcy5jb3JyZWN0ID0gcGFyc2VJbnQodGhpcy54bWwuZ2V0QXR0cmlidXRlKFwiY29ycmVjdEFuc3dlclwiKSk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFggPSBOdW1iZXIodGhpcy54bWwuZ2V0QXR0cmlidXRlKFwieFBvc2l0aW9uUGVyY2VudFwiKSk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFkgPSBOdW1iZXIodGhpcy54bWwuZ2V0QXR0cmlidXRlKFwieVBvc2l0aW9uUGVyY2VudFwiKSk7XHJcbiAgICB0aGlzLnJldmVhbFRocmVzaG9sZCA9IHBhcnNlSW50KHRoaXMueG1sLmdldEF0dHJpYnV0ZShcInJldmVhbFRocmVzaG9sZFwiKSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKHhtbCk7XHJcbiAgICB0aGlzLmltYWdlTGluayA9IHRoaXMueG1sLmdldEF0dHJpYnV0ZShcImltYWdlTGlua1wiKTtcclxuICAgIHRoaXMuZmVlZGJhY2tzID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJmZWVkYmFja1wiKTtcclxuICAgIHZhciBzY2FsZSA9IHRoaXMueG1sLmdldEF0dHJpYnV0ZShcInNjYWxlXCIpO1xyXG4gICAgaWYoc2NhbGU9PT1cIlwiIHx8ICFzY2FsZSlcclxuICAgIFx0dGhpcy5zY2FsZSA9IDE7XHJcbiAgICBlbHNlXHJcbiAgICBcdHRoaXMuc2NhbGUgPSBOdW1iZXIoc2NhbGUpO1xyXG4gICAgdGhpcy5zYXZlID0gZmFsc2U7XHJcbiAgICB2YXIgY29ubmVjdGlvbkVsZW1lbnRzID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjb25uZWN0aW9uc1wiKTtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBbXTtcclxuICAgIGZvcih2YXIgaT0wO2k8Y29ubmVjdGlvbkVsZW1lbnRzLmxlbmd0aDtpKyspXHJcbiAgICBcdHRoaXMuY29ubmVjdGlvbnNbaV0gPSBwYXJzZUludChjb25uZWN0aW9uRWxlbWVudHNbaV0uaW5uZXJIVE1MKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSB3aW5kb3dzIGZvciB0aGlzIHF1ZXN0aW9uIGJhc2VkIG9uIHRoZSBxdWVzdGlvbiB0eXBlXHJcbiAgICB0aGlzLnF1ZXN0aW9uVHlwZSA9IHBhcnNlSW50KHRoaXMueG1sLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uVHlwZVwiKSk7XHJcbiAgICB0aGlzLmNyZWF0ZVdpbmRvd3MoKTtcclxuXHR0aGlzLmNyZWF0ZVR5cGVXaW5kb3coKTtcclxufVxyXG5cclxucC5zYXZlWE1MID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLnhtbC5zZXRBdHRyaWJ1dGUoXCJ4UG9zaXRpb25QZXJjZW50XCIsIHRoaXMucG9zaXRpb25QZXJjZW50WCk7XHJcblx0dGhpcy54bWwuc2V0QXR0cmlidXRlKFwieVBvc2l0aW9uUGVyY2VudFwiLCB0aGlzLnBvc2l0aW9uUGVyY2VudFkpO1xyXG5cdHRoaXMueG1sLnNldEF0dHJpYnV0ZShcInJldmVhbFRocmVzaG9sZFwiLCB0aGlzLnJldmVhbFRocmVzaG9sZCk7XHJcblx0dGhpcy54bWwuc2V0QXR0cmlidXRlKFwic2NhbGVcIiwgdGhpcy5zY2FsZSk7XHJcblx0dGhpcy54bWwuc2V0QXR0cmlidXRlKFwiY29ycmVjdEFuc3dlclwiLCB0aGlzLmNvcnJlY3QpO1xyXG5cdHRoaXMueG1sLnNldEF0dHJpYnV0ZShcInF1ZXN0aW9uVHlwZVwiLCB0aGlzLnF1ZXN0aW9uVHlwZSk7XHJcblx0dmFyIGNvbm5lY3Rpb25FbGVtZW50ID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjb25uZWN0aW9uc1wiKVswXTtcclxuXHR3aGlsZShjb25uZWN0aW9uRWxlbWVudCE9bnVsbCl7XHJcblx0XHR0aGlzLnhtbC5yZW1vdmVDaGlsZChjb25uZWN0aW9uRWxlbWVudCk7XHJcblx0XHRjb25uZWN0aW9uRWxlbWVudCA9IHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY29ubmVjdGlvbnNcIilbMF07XHJcblx0fVxyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5jb25uZWN0aW9ucy5sZW5ndGg7aSsrKXtcclxuXHRcdHZhciBjb25uZWN0aW9uID0gdGhpcy54bWwub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY29ubmVjdGlvbnNcIik7XHJcblx0XHRjb25uZWN0aW9uLmlubmVySFRNTCA9IHRoaXMuY29ubmVjdGlvbnNbaV07XHJcblx0XHR0aGlzLnhtbC5hcHBlbmRDaGlsZChjb25uZWN0aW9uKTtcclxuXHR9XHJcbn1cclxuXHJcbnAuY3JlYXRlV2luZG93cyA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy5qdXN0aWZpY2F0aW9uID0gdGhpcy5xdWVzdGlvblR5cGU9PTEgfHwgdGhpcy5xdWVzdGlvblR5cGU9PTM7XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGUhPTUpe1xyXG5cdFx0dGhpcy5jcmVhdGVUYXNrV2luZG93KCk7XHJcblx0XHR0aGlzLmNyZWF0ZVJlc291cmNlV2luZG93KHRoaXMucmVzb3VyY2VzKTtcclxuXHRcdGlmKHRoaXMucXVlc3Rpb25UeXBlPD0yKVxyXG5cdFx0XHR0aGlzLmNyZWF0ZUFuc3dlcldpbmRvdygpO1xyXG5cdH1cclxuXHRlbHNlXHJcblx0XHR0aGlzLmNyZWF0ZU1lc3NhZ2VXaW5kb3coKTtcclxufVxyXG5cclxucC5kaXNwbGF5V2luZG93cyA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gQWRkIHRoZSB3aW5kb3dzIHRvIHRoZSB3aW5kb3cgZGl2XHJcblx0dGhpcy53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcblx0dmFyIHdpbmRvd05vZGUgPSB0aGlzLndpbmRvd0RpdjtcclxuXHR2YXIgZXhpdEJ1dHRvbiA9IG5ldyBJbWFnZSgpO1xyXG5cdGV4aXRCdXR0b24uc3JjID0gXCIuLi9pbWcvaWNvbkNsb3NlLnBuZ1wiO1xyXG5cdGV4aXRCdXR0b24uY2xhc3NOYW1lID0gXCJleGl0LWJ1dHRvblwiO1xyXG5cdHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcblx0ZXhpdEJ1dHRvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IHF1ZXN0aW9uLndpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJzsgfTtcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTUpe1xyXG5cdFx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLm1lc3NhZ2UpO1xyXG5cdCAgICBleGl0QnV0dG9uLnN0eWxlLmxlZnQgPSBcIjc1dndcIjtcclxuXHRcdHRoaXMudHlwZVdpbmRvdy5zdHlsZS5sZWZ0ID0gXCIzNXZ3XCI7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMudGFzayk7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMucmVzb3VyY2UpO1xyXG5cdFx0aWYodGhpcy5xdWVzdGlvblR5cGU8PTIpe1xyXG5cdFx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VyKTtcclxuXHRcdFx0dGhpcy50eXBlV2luZG93LnN0eWxlLmxlZnQgPSBcIlwiO1xyXG5cdFx0XHR0aGlzLnRhc2suc3R5bGUubGVmdCA9IFwiXCI7XHJcblx0XHRcdHRoaXMucmVzb3VyY2Uuc3R5bGUubGVmdCA9IFwiXCI7XHJcblx0XHRcdGV4aXRCdXR0b24uc3R5bGUubGVmdCA9IFwiODV2d1wiO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0dGhpcy50eXBlV2luZG93LnN0eWxlLmxlZnQgPSBcIjM1dndcIjtcclxuXHRcdFx0dGhpcy50YXNrLnN0eWxlLmxlZnQgPSBcIjM1dndcIjtcclxuXHRcdFx0dGhpcy5yZXNvdXJjZS5zdHlsZS5sZWZ0ID0gXCIzNXZ3XCI7XHJcblx0XHRcdGV4aXRCdXR0b24uc3R5bGUubGVmdCA9IFwiNzV2d1wiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMudHlwZVdpbmRvdyk7XHJcblx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZChleGl0QnV0dG9uKTtcclxuXHRcclxufVxyXG5cclxucC5jcmVhdGVUeXBlV2luZG93ID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHRhc2sgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MucXVlc3Rpb25UeXBlV2luZG93O1xyXG4gICAgdGhpcy50eXBlV2luZG93ID0gdGVtcERpdi5maXJzdENoaWxkO1xyXG4gICAgXHJcbiAgICB0aGlzLnR5cGVXaW5kb3cuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbWdcIilbMF0uc3JjID0gdGhpcy5pbWFnZUxpbms7XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRoZSBpbWFnZSBidXR0b25cclxuICAgIHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcbiAgICB2YXIgYnV0dG9uID0gdGhpcy50eXBlV2luZG93LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJpbWFnZUJ1dHRvblwiKVswXTtcclxuICAgIHZhciBpY29uID0gYnV0dG9uLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1nXCIpWzBdO1xyXG4gICAgYnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHRQb3B1cC5wcm9tcHQocXVlc3Rpb24ud2luZG93RGl2LCBcIlNlbGVjdCBJbWFnZVwiLCBcIkltYWdlIFVSTDpcIiwgXCJcIiwgXCJMb2FkIEltYWdlXCIsIGZ1bmN0aW9uKG5ld0ltYWdlKXtcclxuICAgIFx0XHRpZihuZXdJbWFnZSl7XHJcbiAgICBcdFx0XHRxdWVzdGlvbi5pbWFnZUxpbmsgPSBuZXdJbWFnZTtcclxuICAgIFx0XHRcdHF1ZXN0aW9uLnhtbC5zZXRBdHRyaWJ1dGUoXCJpbWFnZUxpbmtcIiwgbmV3SW1hZ2UpO1xyXG4gICAgXHRcdFx0aWNvbi5zcmMgPSBuZXdJbWFnZTtcclxuICAgIFx0XHR9XHJcbiAgICBcdFx0cXVlc3Rpb24uZGlzcGxheVdpbmRvd3MoKTtcclxuICAgIFx0fSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRoZSBjb21ibyBib3hcclxuICAgIHZhciB0eXBlQ29tYm8gPSB0aGlzLnR5cGVXaW5kb3cuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzZWxlY3RcIilbMF07XHJcbiAgICB0eXBlQ29tYm8udmFsdWUgPSB0aGlzLnF1ZXN0aW9uVHlwZTtcclxuICAgIHR5cGVDb21iby5vbmNoYW5nZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICBcdHF1ZXN0aW9uLnF1ZXN0aW9uVHlwZSA9IE51bWJlcih0aGlzLnZhbHVlKTtcclxuICAgIFx0cXVlc3Rpb24uY3JlYXRlV2luZG93cygpO1xyXG5cdFx0cXVlc3Rpb24uZGlzcGxheVdpbmRvd3MoKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gU2V0dXAgdGhlIHNhdmUgYnV0dG9uXHJcbiAgICB0aGlzLnR5cGVXaW5kb3cuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0J1dHRvbnNcIilbMF0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIilbMF0ub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcbiAgICBcdHF1ZXN0aW9uLnNhdmUgPSB0cnVlO1xyXG4gICAgXHRxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICB9XHJcbn1cclxuXHJcbnAuY3JlYXRlVGFza1dpbmRvdyA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy5wcm9jZWVkRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvY2VlZENvbnRhaW5lclwiKTtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHRhc2sgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MudGFza1dpbmRvdztcclxuICAgIHRoaXMudGFzayA9IHRlbXBEaXYuZmlyc3RDaGlsZDtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25OYW1lXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHRoaXMudGFzay5pbm5lckhUTUwucmVwbGFjZShcIiVpbnN0cnVjdGlvbnMlXCIsIHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5zdHJ1Y3Rpb25zXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHRoaXMudGFzay5pbm5lckhUTUwucmVwbGFjZShcIiVxdWVzdGlvbiVcIiwgdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRvIHVwZGF0ZSB4bWwgb24gY2hhbmdpbmdcclxuICAgIHZhciB0ZXh0Qm94ZXMgPSB0aGlzLnRhc2suZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcInRleHQtYm94XCIpO1xyXG4gICAgZm9yKHZhciBpPTA7aTx0ZXh0Qm94ZXMubGVuZ3RoO2krKylcclxuICAgIFx0dGV4dEJveGVzW2ldLm9uYmx1ciA9IHRoaXMudXBkYXRlWE1MLmJpbmQodGhpcywgdGV4dEJveGVzKTtcclxufVxyXG5cclxucC51cGRhdGVYTUwgPSBmdW5jdGlvbih0ZXh0Qm94ZXMpe1xyXG5cdHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25OYW1lXCIpWzBdLmlubmVySFRNTCA9IHRleHRCb3hlc1swXS5pbm5lckhUTUw7XHJcblx0dGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MID0gdGV4dEJveGVzWzFdLmlubmVySFRNTDtcclxuXHR0aGlzLnhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uVGV4dFwiKVswXS5pbm5lckhUTUwgPSB0ZXh0Qm94ZXNbMl0uaW5uZXJIVE1MO1xyXG59XHJcblxyXG5wLmNyZWF0ZVJlc291cmNlV2luZG93ID0gZnVuY3Rpb24ocmVzb3VyY2VGaWxlcyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSByZXNvdXJjZSB3aW5kb3cgXHJcblx0dmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG5cdHRlbXBEaXYuaW5uZXJIVE1MID0gV2luZG93cy5yZXNvdXJjZVdpbmRvdztcclxuICAgIHRoaXMucmVzb3VyY2UgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgYmFzaWMgcmVzb3VyY2VzIGZyb20gc2F2ZVxyXG5cdHRoaXMucmVzb3VyY2VEaXYgPSB0aGlzLnJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJyZXNvdXJjZUNvbnRlbnRcIilbMF07XHJcblx0dGhpcy51cGRhdGVSZXNvdXJjZXMocmVzb3VyY2VGaWxlcyk7XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRoZSBhZGQgYnV0dG9uXHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgIFx0cmVzb3VyY2VGaWxlcy5vcGVuV2luZG93KHF1ZXN0aW9uLndpbmRvd0RpdiwgdHJ1ZSwgZnVuY3Rpb24oc2VsZWN0ZWRSZXNvdXJjZSl7XHJcbiAgICBcdFx0aWYoc2VsZWN0ZWRSZXNvdXJjZSE9bnVsbCl7XHJcbiAgICBcdFx0XHR2YXIgbmV3UmVzb3VyY2UgPSBxdWVzdGlvbi54bWwub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicmVzb3VyY2VJbmRleFwiKTtcclxuICAgIFx0XHRcdG5ld1Jlc291cmNlLmlubmVySFRNTCA9IHNlbGVjdGVkUmVzb3VyY2U7XHJcbiAgICBcdFx0XHRxdWVzdGlvbi54bWwuYXBwZW5kQ2hpbGQobmV3UmVzb3VyY2UpO1xyXG4gICAgXHRcdFx0cXVlc3Rpb24udXBkYXRlUmVzb3VyY2VzKHRoaXMpO1xyXG4gICAgXHRcdH1cclxuICAgIFx0XHRxdWVzdGlvbi5kaXNwbGF5V2luZG93cygpO1xyXG4gICAgXHR9KTtcclxuICAgIH1cclxufVxyXG5cclxucC51cGRhdGVSZXNvdXJjZXMgPSBmdW5jdGlvbihyZXNvdXJjZUZpbGVzKXtcclxuXHRcclxuXHR2YXIgcmVzb3VyY2VzID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZUluZGV4XCIpO1xyXG5cdHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcblx0XHJcblx0aWYocmVzb3VyY2VzLmxlbmd0aD09MCl7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNvbG9yID0gXCJncmV5XCI7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNsYXNzTmFtZSA9IFwicmVzb3VyY2VDb250ZW50IGNlbnRlclwiO1xyXG5cdFx0dGhpcy5yZXNvdXJjZURpdi5pbm5lckhUTUwgPSBcIk5vIHJlc291cmNlcyBoYXZlIGJlZW4gYWRkZWQuXCI7XHJcblx0fWVsc2V7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNvbG9yID0gXCJcIjtcclxuXHRcdHRoaXMucmVzb3VyY2VEaXYuY2xhc3NOYW1lID0gXCJyZXNvdXJjZUNvbnRlbnRcIjtcclxuXHRcdHRoaXMucmVzb3VyY2VEaXYuaW5uZXJIVE1MID0gJyc7XHJcblx0XHR2YXIgdXNlZCA9IFtdO1xyXG5cdFx0Zm9yKHZhciBpPTA7aTxyZXNvdXJjZXMubGVuZ3RoO2krKyl7XHJcblx0XHRcdCAgICBcdFxyXG5cdFx0XHQgICAgXHRpZih1c2VkLmluZGV4T2YocmVzb3VyY2VzW2ldLmlubmVySFRNTCk9PS0xKVxyXG5cdFx0XHQgICAgXHRcdHVzZWQucHVzaChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKTtcclxuXHRcdFx0ICAgIFx0ZWxzZXtcclxuXHRcdFx0ICAgIFx0XHR0aGlzLnhtbC5yZW1vdmVDaGlsZChyZXNvdXJjZXNbaV0pO1xyXG5cdFx0XHQgICAgXHRcdGkgPSAwO1xyXG5cdFx0XHQgICAgXHRcdHJlc291cmNlcyA9IHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VJbmRleFwiKTtcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0fVxyXG5cdCAgICBmb3IodmFyIGk9MDtpPHJlc291cmNlcy5sZW5ndGg7aSsrKXtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBDcmVhdGUgdGhlIGN1cnJlbnQgcmVzb3VyY2UgZWxlbWVudFxyXG4gICAgXHRcdHZhciBjdXJSZXNvdXJjZSA9IFdpbmRvd3MucmVzb3VyY2UucmVwbGFjZShcIiVpY29uJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS5pY29uKTtcclxuXHQgICAgXHRjdXJSZXNvdXJjZSA9IGN1clJlc291cmNlLnJlcGxhY2UoXCIldGl0bGUlXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLnRpdGxlKTtcclxuXHQgICAgXHRjdXJSZXNvdXJjZSA9IGN1clJlc291cmNlLnJlcGxhY2UoXCIlbGluayVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0ubGluayk7XHJcblx0ICAgIFx0dmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG5cdCAgICBcdHRlbXBEaXYuaW5uZXJIVE1MID0gY3VyUmVzb3VyY2U7XHJcblx0ICAgICAgICBjdXJSZXNvdXJjZSA9IHRlbXBEaXYuZmlyc3RDaGlsZDtcclxuXHQgICAgXHR0aGlzLnJlc291cmNlRGl2LmFwcGVuZENoaWxkKGN1clJlc291cmNlKTtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTZXR1cCBkZWxldGUgYnV0dG9uXHJcblx0ICAgIFx0KGZ1bmN0aW9uKHJlc291cmNlWG1sKXtcclxuXHQgICAgXHRcdGN1clJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJkZWxldGVcIilbMF0ub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcblx0ICAgIFx0XHRcdHF1ZXN0aW9uLnhtbC5yZW1vdmVDaGlsZChyZXNvdXJjZVhtbCk7XHJcblx0ICAgIFx0XHRcdHF1ZXN0aW9uLnVwZGF0ZVJlc291cmNlcyhyZXNvdXJjZUZpbGVzKTtcclxuXHQgICAgXHRcdH1cclxuXHQgICAgXHR9KShyZXNvdXJjZXNbaV0pO1xyXG5cdCAgICB9XHJcblx0fVxyXG59XHJcblxyXG5wLmNyZWF0ZUFuc3dlcldpbmRvdyA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBhbnN3ZXIgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MuYW5zd2VyV2luZG93O1xyXG4gICAgdGhpcy5hbnN3ZXIgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRoZSBjb21ib3ggZm9yIG51bWJlciBvZiBhbnN3ZXJzXHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5hbnN3ZXJGb3JtID0gdGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJmb3JtXCIpWzBdO1xyXG4gICAgdmFyIHNlbGVjdCA9IHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2VsZWN0XCIpWzBdO1xyXG4gICAgc2VsZWN0Lm9uY2hhbmdlID0gZnVuY3Rpb24oKXtcclxuICAgIFx0cXVlc3Rpb24uc2V0TnVtYmVyQW5zd2VycyhOdW1iZXIodGhpcy52YWx1ZSkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5zZXROdW1iZXJBbnN3ZXJzKE51bWJlcih0aGlzLnhtbC5nZXRBdHRyaWJ1dGUoXCJudW1BbnN3ZXJzXCIpKSk7XHJcbiAgICBzZWxlY3QudmFsdWUgPSB0aGlzLnhtbC5nZXRBdHRyaWJ1dGUoXCJudW1BbnN3ZXJzXCIpO1xyXG5cdHRoaXMuYW5zd2VyRm9ybS5lbGVtZW50c1tcImFuc3dlclwiXS52YWx1ZSA9IHRoaXMuY29ycmVjdCsxO1xyXG5cdFxyXG5cdC8vIFNldHVwIHRoZSBmcm9tIHRvIHVwZGF0ZSB0aGUgeG1sXHJcblx0dGhpcy5hbnN3ZXJGb3JtLm9uY2hhbmdlID0gZnVuY3Rpb24oKXtcclxuXHJcblx0ICAgIC8vIFNldHVwIHRoZSByYWRpbyBidXR0b25zIGZvciB0aGUgZm9ybSBpZiBqdXN0aWZpY2F0aW9uXHJcblx0XHRpZihxdWVzdGlvbi5qdXN0aWZpY2F0aW9uICYmIE51bWJlcih0aGlzLmVsZW1lbnRzW1wiYW5zd2VyXCJdLnZhbHVlKS0xIT1xdWVzdGlvbi5jb3JyZWN0KXtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmVsZW1lbnRzLmxlbmd0aDtpKyspXHJcblx0XHRcdFx0dGhpcy5lbGVtZW50c1tpXS5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmVsZW1lbnRzW1wiZmVlZGJhY2tcIit0aGlzLmVsZW1lbnRzW1wiYW5zd2VyXCJdLnZhbHVlXS5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdHF1ZXN0aW9uLmNvcnJlY3QgPSBOdW1iZXIodGhpcy5lbGVtZW50c1tcImFuc3dlclwiXS52YWx1ZSktMTtcclxuXHRcdHZhciBhbnN3ZXJzID0gcXVlc3Rpb24ueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYW5zd2VyXCIpO1xyXG5cdFx0dmFyIGZlZWRiYWNrID0gcXVlc3Rpb24ueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZmVlZGJhY2tcIik7XHJcblx0XHRmb3IodmFyIGk9MDtpPGFuc3dlcnMubGVuZ3RoO2krKyl7XHJcblx0XHRcdGFuc3dlcnNbaV0uaW5uZXJIVE1MID0gdGhpcy5lbGVtZW50c1tcImFuc3dlclwiKyhpKzEpXS52YWx1ZTtcclxuXHRcdFx0ZmVlZGJhY2tbaV0uaW5uZXJIVE1MID0gdGhpcy5lbGVtZW50c1tcImZlZWRiYWNrXCIrKGkrMSldLnZhbHVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHR0aGlzLmNvcnJlY3QgPSAtMTtcclxuXHR0aGlzLmFuc3dlckZvcm0ub25jaGFuZ2UoKTtcclxuXHRcclxuICAgIFxyXG59XHJcblxyXG5wLnNldE51bWJlckFuc3dlcnMgPSBmdW5jdGlvbihudW0pe1xyXG5cclxuICAgIHZhciBhbnN3ZXJzWG1sID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhbnN3ZXJcIik7XHJcbiAgICB2YXIgZmVlZGJhY2tYbWwgPSB0aGlzLnhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImZlZWRiYWNrXCIpO1xyXG5cdHZhciBhbnN3ZXJzID0gdGhpcy5hbnN3ZXJGb3JtLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZGl2XCIpO1xyXG5cdGZvcih2YXIgaT0wO2k8YW5zd2Vycy5sZW5ndGg7aSsrKXtcclxuXHRcdHZhciBpbnB1dHMgPSBhbnN3ZXJzW2ldLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIik7XHJcblx0XHRhbnN3ZXJzWG1sW2ldLmlubmVySFRNTCA9IGlucHV0c1swXS52YWx1ZTtcclxuXHRcdGZlZWRiYWNrWG1sW2ldLmlubmVySFRNTCA9IGlucHV0c1sxXS52YWx1ZTtcclxuXHR9XHJcblx0XHJcblx0dGhpcy54bWwuc2V0QXR0cmlidXRlKFwibnVtQW5zd2Vyc1wiLCBudW0pO1xyXG5cdFxyXG5cdGlmKGFuc3dlcnNYbWwubGVuZ3RoPG51bSl7XHJcblx0XHRmb3IodmFyIGk9YW5zd2Vyc1htbC5sZW5ndGg7aTxudW07aSsrKXtcclxuXHRcdFx0dGhpcy54bWwuYXBwZW5kQ2hpbGQodGhpcy54bWwub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYW5zd2VyXCIpKTtcclxuXHRcdFx0dGhpcy54bWwuYXBwZW5kQ2hpbGQodGhpcy54bWwub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZmVlZGJhY2tcIikpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIGlmKGFuc3dlcnNYbWwubGVuZ3RoPm51bSl7XHJcblx0XHR3aGlsZShhbnN3ZXJzWG1sLmxlbmd0aD5udW0pe1xyXG5cdFx0XHR0aGlzLnhtbC5yZW1vdmVDaGlsZChhbnN3ZXJzWG1sW2Fuc3dlcnNYbWwubGVuZ3RoLTFdKTtcclxuXHRcdFx0dGhpcy54bWwucmVtb3ZlQ2hpbGQoZmVlZGJhY2tYbWxbZmVlZGJhY2tYbWwubGVuZ3RoLTFdKTtcclxuXHRcdCAgICB2YXIgZmVlZGJhY2tYbWwgPSB0aGlzLnhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImZlZWRiYWNrXCIpO1xyXG5cdFx0XHRhbnN3ZXJzWG1sID0gdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhbnN3ZXJcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHR0aGlzLmFuc3dlckZvcm0uaW5uZXJIVE1MID0gJyc7XHJcblx0Zm9yKHZhciBpPTA7aTxhbnN3ZXJzWG1sLmxlbmd0aDtpKyspXHJcblx0XHR0aGlzLmFuc3dlckZvcm0uaW5uZXJIVE1MICs9IFdpbmRvd3MuYW5zd2VyLnJlcGxhY2UoLyVudW0lL2csIGkrMSkucmVwbGFjZSgvJWFuc3dlciUvZywgYW5zd2Vyc1htbFtpXS5pbm5lckhUTUwpLnJlcGxhY2UoLyVmZWVkYmFjayUvZywgZmVlZGJhY2tYbWxbaV0uaW5uZXJIVE1MKTtcclxuXHRpZih0aGlzLmNvcnJlY3Q8YW5zd2Vyc1htbC5sZW5ndGgpXHJcblx0XHR0aGlzLmFuc3dlckZvcm0uZWxlbWVudHNbXCJhbnN3ZXJcIl0udmFsdWUgPSB0aGlzLmNvcnJlY3QrMTtcclxuXHRlbHNle1xyXG5cdFx0dGhpcy5hbnN3ZXJGb3JtLmVsZW1lbnRzW1wiYW5zd2VyXCJdLnZhbHVlID0gMTtcclxuXHRcdHRoaXMuY29ycmVjdD0wO1xyXG5cdH1cclxufVxyXG5cclxucC5jcmVhdGVGaWxlV2luZG93ID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGZpbGUgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MuZmlsZVdpbmRvdztcclxuICAgIHRoaXMuYW5zd2VyID0gdGVtcERpdi5maXJzdENoaWxkO1xyXG4gICAgdGhpcy5maWxlSW5wdXQgPSB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlucHV0XCIpWzBdO1xyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgXHRxdWVzdGlvbi5uZXdGaWxlcyA9IHRydWU7XHJcbiAgICBcdHF1ZXN0aW9uLmZpbGVzID0gW107XHJcbiAgICBcdGZvcih2YXIgaT0wO2k8ZXZlbnQudGFyZ2V0LmZpbGVzLmxlbmd0aDtpKyspXHJcbiAgICBcdFx0cXVlc3Rpb24uZmlsZXNbaV0gPSBldmVudC50YXJnZXQuZmlsZXNbaV0ubmFtZTtcclxuXHQgICAgcXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG4gICAgfSk7XHJcbiAgICBcclxufVxyXG5cclxucC5jcmVhdGVNZXNzYWdlV2luZG93ID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIG1lc3NhZ2Ugd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MubWVzc2FnZVdpbmRvdztcclxuICAgIHRoaXMubWVzc2FnZSA9IHRlbXBEaXYuZmlyc3RDaGlsZDtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25OYW1lXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiVpbnN0cnVjdGlvbnMlXCIsIHRoaXMueG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5zdHJ1Y3Rpb25zXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiVxdWVzdGlvbiVcIiwgdGhpcy54bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcblxyXG4gICAgLy8gU2V0dXAgdG8gdXBkYXRlIHhtbCBvbiBjaGFuZ2luZ1xyXG4gICAgdmFyIHRleHRCb3hlcyA9IHRoaXMubWVzc2FnZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwidGV4dC1ib3hcIik7XHJcbiAgICBmb3IodmFyIGk9MDtpPHRleHRCb3hlcy5sZW5ndGg7aSsrKVxyXG4gICAgXHR0ZXh0Qm94ZXNbaV0ub25ibHVyID0gdGhpcy51cGRhdGVYTUwuYmluZCh0aGlzLCB0ZXh0Qm94ZXMpO1xyXG5cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbjtcclxubW9kdWxlLmV4cG9ydHMuU09MVkVfU1RBVEUgPSBTT0xWRV9TVEFURTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFdpbmRvd3MgPSByZXF1aXJlKCcuLi9odG1sL3BvcHVwV2luZG93cy5qcycpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi4vaGVscGVyL3V0aWxpdGllcy5qcycpO1xyXG5cclxuXHJcbi8vIENyZWF0ZXMgYSBjYXRlZ29yeSB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBmcm9tIHRoZSBnaXZlbiB4bWxcclxuZnVuY3Rpb24gUmVzb3VyY2UoeG1sKXtcclxuXHRcclxuXHQvLyBGaXJzdCBnZXQgdGhlIGljb25cclxuXHR0aGlzLnhtbCA9IHhtbDtcclxuXHR2YXIgdHlwZSA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpKTtcclxuXHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdHN3aXRjaCh0eXBlKXtcclxuXHQgIGNhc2UgMDpcclxuXHQgICAgdGhpcy5pY29uID0gJy4uL2ltZy9pY29uUmVzb3VyY2VGaWxlLnBuZyc7XHJcblx0ICAgIGJyZWFrO1xyXG5cdCAgY2FzZSAxOlxyXG5cdCAgICB0aGlzLmljb24gPSAnLi4vaW1nL2ljb25SZXNvdXJjZUxpbmsucG5nJztcclxuXHQgICAgYnJlYWs7XHJcblx0ICBjYXNlIDI6XHJcbiAgICBcdHRoaXMuaWNvbiA9ICcuLi9pbWcvaWNvblJlc291cmNlVmlkZW8ucG5nJztcclxuXHQgICAgYnJlYWs7XHJcblx0ICBkZWZhdWx0OlxyXG5cdCAgICB0aGlzLmljb24gPSAnJztcclxuXHQgICAgYnJlYWs7XHJcblx0fVxyXG5cclxuXHQvLyBOZXh0IGdldCB0aGUgdGl0bGVcclxuXHR0aGlzLnRpdGxlID0geG1sLmdldEF0dHJpYnV0ZShcInRleHRcIik7XHJcblxyXG5cdC8vIExhc3QgZ2V0IHRoZSBsaW5rXHJcblx0dGhpcy5saW5rID0geG1sLmdldEF0dHJpYnV0ZShcImxpbmtcIik7XHJcbiAgICBcclxufVxyXG5cclxuZnVuY3Rpb24gUmVzb3VyY2VzKHJlc291cmNlRWxlbWVudHMsIGRvYyl7XHJcblx0Zm9yICh2YXIgaT0wOyBpPHJlc291cmNlRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdC8vIExvYWQgZWFjaCByZXNvdXJjZVxyXG5cdFx0dGhpc1tpXSA9IG5ldyBSZXNvdXJjZShyZXNvdXJjZUVsZW1lbnRzW2ldKTtcclxuXHR9XHJcblx0dGhpcy5sZW5ndGggPSByZXNvdXJjZUVsZW1lbnRzLmxlbmd0aDtcclxuXHR0aGlzLmRvYyA9IGRvYztcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHJlc291cmNlIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLnJlc291cmNlc1dpbmRvdztcclxuICAgIHRoaXMucmVzb3VyY2UgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcblx0dGhpcy5yZXNvdXJjZURpdiA9IHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcInJlc291cmNlQ29udGVudFwiKVswXTtcclxuXHR0aGlzLnVwZGF0ZVJlc291cmNlcygpO1xyXG5cdFxyXG5cdC8vIFN0b3JlIHRoZSBidXR0b25zXHJcblx0dGhpcy5idXR0b25zID0gdGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKTtcclxuXHRcclxufVxyXG5cclxudmFyIHAgPSBSZXNvdXJjZXMucHJvdG90eXBlO1xyXG5cclxucC5vcGVuV2luZG93ID0gZnVuY3Rpb24od2luZG93RGl2LCBzZWxlY3QsIGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG5cdHZhciByZXNvdXJjZXMgPSB0aGlzO1xyXG4gICAgdGhpcy5idXR0b25zWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHR3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICBcdHJlc291cmNlcy53aW5kb3dEaXYgPSBudWxsO1xyXG4gICAgXHRjYWxsYmFjaygpO1xyXG4gICAgfVxyXG5cdHRoaXMuYnV0dG9uc1sxXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuXHRcdHJlc291cmNlcy5lZGl0KG51bGwsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJlc291cmNlcy51cGRhdGVSZXNvdXJjZXMoKTtcclxuXHRcdFx0aWYocmVzb3VyY2VzLndpbmRvd0RpdilcclxuXHRcdFx0XHRyZXNvdXJjZXMub3BlbldpbmRvdyhyZXNvdXJjZXMud2luZG93RGl2LCByZXNvdXJjZXMuc2VsZWN0LCByZXNvdXJjZXMub25jbG9zZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbiAgICB0aGlzLm9uY2xvc2UgPSBjYWxsYmFjaztcclxuICAgIHRoaXMud2luZG93RGl2ID0gd2luZG93RGl2O1xyXG4gICAgdGhpcy5zZWxlY3QgPSBzZWxlY3Q7XHJcblx0XHJcblx0dmFyIGljb25zID0gdGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiaWNvblwiKTtcclxuXHRmb3IodmFyIGk9MDtpPGljb25zLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYodGhpcy5zZWxlY3QpXHJcblx0XHRcdGljb25zW2ldLmNsYXNzTmFtZSA9IFwiaWNvblNlbGVjdCBpY29uXCI7XHJcblx0XHRlbHNlXHJcblx0XHRcdGljb25zW2ldLmNsYXNzTmFtZSA9IFwiaWNvblwiO1xyXG5cdH1cclxuICAgIFxyXG5cdHdpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuXHR3aW5kb3dEaXYuYXBwZW5kQ2hpbGQodGhpcy5yZXNvdXJjZSk7XHJcblx0XHJcbn1cclxuXHJcbnAudXBkYXRlUmVzb3VyY2VzID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHRpZih0aGlzLmxlbmd0aD09MCl7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNvbG9yID0gXCJncmV5XCI7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNsYXNzTmFtZSA9IFwicmVzb3VyY2VDb250ZW50IGNlbnRlclwiO1xyXG5cdFx0dGhpcy5yZXNvdXJjZURpdi5pbm5lckhUTUwgPSBcIk5vIFJlc291cmNlcyBMb2FkZWRcIjtcclxuXHR9ZWxzZXtcclxuXHRcdHZhciByZXNvdXJjZXMgPSB0aGlzO1xyXG5cdFx0dGhpcy5yZXNvdXJjZURpdi5jb2xvciA9IFwiXCI7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmNsYXNzTmFtZSA9IFwicmVzb3VyY2VDb250ZW50XCI7XHJcblx0XHR0aGlzLnJlc291cmNlRGl2LmlubmVySFRNTCA9ICcnO1xyXG5cdCAgICBmb3IodmFyIGk9MDtpPHRoaXMubGVuZ3RoO2krKyl7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gQ3JlYXRlIHRoZSBjdXJyZW50IHJlc291cmNlIGVsZW1lbnRcclxuICAgIFx0XHR2YXIgY3VyUmVzb3VyY2UgPSBXaW5kb3dzLnJlc291cmNlLnJlcGxhY2UoXCIlaWNvbiVcIiwgdGhpc1tpXS5pY29uKTtcclxuXHQgICAgXHRjdXJSZXNvdXJjZSA9IGN1clJlc291cmNlLnJlcGxhY2UoXCIldGl0bGUlXCIsIHRoaXNbaV0udGl0bGUpO1xyXG5cdCAgICBcdGN1clJlc291cmNlID0gY3VyUmVzb3VyY2UucmVwbGFjZShcIiVsaW5rJVwiLCB0aGlzW2ldLmxpbmspO1xyXG5cdCAgICBcdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHQgICAgXHR0ZW1wRGl2LmlubmVySFRNTCA9IGN1clJlc291cmNlO1xyXG5cdCAgICAgICAgY3VyUmVzb3VyY2UgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcblx0ICAgIFx0dGhpcy5yZXNvdXJjZURpdi5hcHBlbmRDaGlsZChjdXJSZXNvdXJjZSk7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2V0dXAgZGVsZXRlIGFuZCBlZGl0IGJ1dHRvbnNcclxuXHQgICAgXHQoZnVuY3Rpb24oaW5kZXgpe1xyXG5cdCAgICBcdFx0Y3VyUmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImRlbGV0ZVwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuXHQgICAgXHRcdFx0Zm9yKHZhciBpPWluZGV4O2k8cmVzb3VyY2VzLmxlbmd0aC0xO2krKylcclxuXHQgICAgXHRcdFx0XHRyZXNvdXJjZXNbaV0gPSByZXNvdXJjZXNbaSsxXTtcclxuXHQgICAgXHRcdFx0ZGVsZXRlIHJlc291cmNlc1stLXJlc291cmNlcy5sZW5ndGhdO1xyXG5cdCAgICBcdFx0XHRyZXNvdXJjZXMudXBkYXRlUmVzb3VyY2VzKCk7XHJcblx0ICAgIFx0XHR9XHJcblx0ICAgIFx0XHRjdXJSZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZWRpdFwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuXHQgICAgXHRcdFx0cmVzb3VyY2VzLmVkaXQoaW5kZXgsIGZ1bmN0aW9uKCl7XHJcblx0ICAgIFx0XHRcdFx0cmVzb3VyY2VzLnVwZGF0ZVJlc291cmNlcygpO1xyXG5cdCAgICBcdFx0XHRcdGlmKHJlc291cmNlcy53aW5kb3dEaXYpXHJcblx0ICAgIFx0XHRcdFx0XHRyZXNvdXJjZXMub3BlbldpbmRvdyhyZXNvdXJjZXMud2luZG93RGl2LCByZXNvdXJjZXMuc2VsZWN0LCByZXNvdXJjZXMub25jbG9zZSk7XHJcblx0ICAgIFx0XHRcdH0pO1xyXG5cdCAgICBcdFx0fVxyXG5cdCAgICBcdFx0XHJcblx0ICAgIFx0ICAgIC8vIElmIHNlbGVjdCBzZXR1cCB0aGUgcmVzb3VyY2VzIGFzIGJ1dHRvbnNcclxuXHQgICAgXHRcdGN1clJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJpY29uXCIpWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdFx0ICAgIFx0ICAgIGlmKHJlc291cmNlcy53aW5kb3dEaXYgJiYgcmVzb3VyY2VzLnNlbGVjdCl7XHJcblx0XHQgICAgXHQgICAgXHRyZXNvdXJjZXMud2luZG93RGl2LmlubmVySFRNTCA9ICcnO1xyXG5cdFx0ICAgIFx0ICAgIFx0cmVzb3VyY2VzLndpbmRvd0RpdiA9IG51bGw7XHJcblx0XHQgICAgXHQgICAgXHRyZXNvdXJjZXMub25jbG9zZShpbmRleCk7XHJcblx0XHQgICAgXHQgICAgXHRcclxuXHRcdCAgICBcdCAgICB9XHJcblx0ICAgIFx0XHR9XHJcblx0ICAgIFx0XHRcclxuXHQgICAgXHR9KShpKTtcclxuXHQgICAgfVxyXG5cdH1cclxuXHRcclxufVxyXG5cclxucC5lZGl0ID0gZnVuY3Rpb24oaW5kZXgsIGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHBvcHVwIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLnJlc291cmNlRWRpdG9yO1xyXG4gICAgdmFyIGVkaXRJbmZvID0gdGVtcERpdi5maXJzdENoaWxkO1xyXG4gICAgdmFyIGZvcm0gPSBlZGl0SW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZShcImZvcm1cIilbMF07XHJcblx0XHJcblx0aWYoaW5kZXg9PW51bGwpe1xyXG5cdFx0ZWRpdEluZm8uaW5uZXJIVE1MID0gZWRpdEluZm8uaW5uZXJIVE1MLnJlcGxhY2UoLyVlZGl0JS9nLCBcIkNyZWF0ZVwiKS5yZXBsYWNlKC8lYXBwbHklL2csIFwiQ3JlYXRlIFJlc291cmNlXCIpLnJlcGxhY2UoLyVuYW1lJS9nLCAnJykucmVwbGFjZSgvJWxpbmslL2csICcnKTtcclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdGVkaXRJbmZvLmlubmVySFRNTCA9IGVkaXRJbmZvLmlubmVySFRNTC5yZXBsYWNlKC8lZWRpdCUvZywgXCJFZGl0XCIpLnJlcGxhY2UoLyVhcHBseSUvZywgXCJBcHBseSBDaGFuZ2VzXCIpLnJlcGxhY2UoLyVuYW1lJS9nLCB0aGlzW2luZGV4XS50aXRsZSkucmVwbGFjZSgvJWxpbmslL2csIHRoaXNbaW5kZXhdLmxpbmspO1xyXG5cdFx0ZWRpdEluZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzZWxlY3RcIilbMF0udmFsdWUgPSB0aGlzW2luZGV4XS50eXBlO1xyXG5cdH1cclxuXHRcclxuXHQvLyBTZXR1cCBjYW5jZWwgYnV0dG9uXHJcblx0dmFyIHJlc291cmNlcyA9IHRoaXM7XHJcblx0dmFyIGJ1dHRvbnMgPSBlZGl0SW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKTtcclxuXHRidXR0b25zWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdFx0cmVzb3VyY2VzLndpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuICAgIFx0Y2FsbGJhY2soKTtcclxuXHR9XHJcblx0XHJcblx0Ly8gU2V0dXAgY29uZmlybSBidXR0b25cclxuXHRidXR0b25zWzFdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdFx0aWYoaW5kZXg9PW51bGwpXHJcblx0XHRcdGluZGV4ID0gcmVzb3VyY2VzLmxlbmd0aCsrO1xyXG5cdFx0dmFyIG5ld1Jlc291cmNlID0gcmVzb3VyY2VzLmRvYy5jcmVhdGVFbGVtZW50KFwicmVzb3VyY2VcIik7XHJcblx0XHR2YXIgZm9ybSA9IGVkaXRJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZm9ybVwiKVswXTtcclxuXHRcdG5ld1Jlc291cmNlLnNldEF0dHJpYnV0ZShcInR5cGVcIiwgZm9ybS5lbGVtZW50c1tcInR5cGVcIl0udmFsdWUpO1xyXG5cdFx0bmV3UmVzb3VyY2Uuc2V0QXR0cmlidXRlKFwidGV4dFwiLCBmb3JtLmVsZW1lbnRzW1wibmFtZVwiXS52YWx1ZSk7XHJcblx0XHRuZXdSZXNvdXJjZS5zZXRBdHRyaWJ1dGUoXCJsaW5rXCIsIGZvcm0uZWxlbWVudHNbXCJsaW5rXCJdLnZhbHVlKTtcclxuXHRcdHJlc291cmNlc1tpbmRleF0gPSBuZXcgUmVzb3VyY2UobmV3UmVzb3VyY2UpO1xyXG5cdFx0cmVzb3VyY2VzLndpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuICAgIFx0Y2FsbGJhY2soKTtcclxuXHR9XHJcblx0XHJcblxyXG5cdC8vIERpc3BsYXkgdGhlIGVkaXQgd2luZG93XHJcblx0dGhpcy53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcblx0dGhpcy53aW5kb3dEaXYuYXBwZW5kQ2hpbGQoZWRpdEluZm8pO1xyXG59XHJcblxyXG5wLnhtbCA9IGZ1bmN0aW9uKHhtbERvYyl7XHJcblx0dmFyIHhtbCA9IHhtbERvYy5jcmVhdGVFbGVtZW50KFwicmVzb3VyY2VMaXN0XCIpO1xyXG5cdHhtbC5zZXRBdHRyaWJ1dGUoXCJyZXNvdXJjZUNvdW50XCIsIHRoaXMubGVuZ3RoKTtcclxuXHRmb3IodmFyIGk9MDtpPHRoaXMubGVuZ3RoO2krKylcclxuXHRcdHhtbC5hcHBlbmRDaGlsZCh0aGlzW2ldLnhtbCk7XHJcblx0cmV0dXJuIHhtbDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZXM7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuLi9oZWxwZXIvdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4uL2hlbHBlci9wb2ludC5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi4vY2FzZS9xdWVzdGlvbi5qc1wiKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbnN0YW50cy5qc1wiKTtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKFwiLi4vaGVscGVyL2RyYXdsaWIuanNcIik7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBib2FyZChzZWN0aW9uLCBib2FyZENvbnRleHQsIG5vZGVDb250ZXh0LCBtb3VzZVN0YXRlLCBzdGFydFBvc2l0aW9uLCBsZXNzb25Ob2Rlcywgc2F2ZSl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBjYW52YXMgZm9yIHRoaXMgYm9hcmQgYW5kIGFkZCBpdCB0byB0aGUgc2VjdGlvblxyXG5cdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuXHR0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcblx0dGhpcy5jYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHR0aGlzLmNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG5cdHRoaXMuY2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuXHR0aGlzLnNhdmUgPSBzYXZlO1xyXG5cdG1vdXNlU3RhdGUuYWRkQ2FudmFzKHRoaXMuY2FudmFzKTtcclxuXHRzZWN0aW9uLmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcclxuXHRcclxuXHR2YXIgYm9hcmQgPSB0aGlzO1xyXG5cdHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbmVuZCcsIGZ1bmN0aW9uKCl7XHJcblx0XHRpZihib2FyZC5sb2FkZWQpXHJcblx0XHRcdGJvYXJkLmxvYWRlZCgpO1xyXG5cdH0sIGZhbHNlKTtcclxuXHRcclxuXHR0aGlzLmJvYXJkQ29udGV4dCA9IGJvYXJkQ29udGV4dDtcclxuXHR0aGlzLm5vZGVDb250ZXh0ID0gbm9kZUNvbnRleHQ7XHJcbiAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheSA9IGxlc3Nvbk5vZGVzO1xyXG4gICAgdGhpcy5ib2FyZE9mZnNldCA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxuICAgIHRoaXMuem9vbSA9IENvbnN0YW50cy5zdGFydFpvb207XHJcbiAgICB0aGlzLnN0YWdlID0gMDtcclxuICAgIHRoaXMubGFzdFNhdmVUaW1lID0gMDsgLy8gYXNzdW1lIG5vIGNvb2tpZVxyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb24gPSBudWxsO1xyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb25OdW0gPSAtMTtcclxuICAgIFxyXG4gICAgLy9pZiAoZG9jdW1lbnQuY29va2llKSB0aGlzLmxvYWRDb29raWUoKTsgXHJcblxyXG5cdC8vIENoZWNrIGlmIGFsbCBub2RlcyBhcmUgc29sdmVkXHJcblx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoICYmIGRvbmU7aSsrKVxyXG5cdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRpZihkb25lKVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG59XHJcblxyXG4vL3Byb3RvdHlwZVxyXG52YXIgcCA9IGJvYXJkLnByb3RvdHlwZTtcclxuXHJcbnAuYWN0ID0gZnVuY3Rpb24oZ2FtZVNjYWxlLCBwTW91c2VTdGF0ZSwgZHQpIHtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgbW91c2UgZXZlbnRzIGlmIGdpdmVuIGEgbW91c2Ugc3RhdGVcclxuICAgIGlmKHBNb3VzZVN0YXRlKSB7XHJcblx0ICAgIFxyXG5cdFx0XHJcblx0ICAgIGlmICghcE1vdXNlU3RhdGUubW91c2VEb3duICYmIHRoaXMudGFyZ2V0KSB7XHJcblx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IHVuZGVmaW5lZDsgLy8gY2xlYXIgZHJhZyBiZWhhdmlvclxyXG5cdFx0XHR0aGlzLnRhcmdldC5kcmFnZ2luZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnRhcmdldCA9IG51bGw7XHJcblx0XHR9XHJcblx0ICAgIFxyXG5cdCAgICBpZihwTW91c2VTdGF0ZS5tb3VzZURvd24pe1xyXG5cdFx0XHR2YXIgYm91bmRzID0gdGhpcy5ib2FyZENvbnRleHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdGlmKGJvdW5kcy5sZWZ0ID49IHBNb3VzZVN0YXRlLm1vdXNlUG9zaXRpb24ueCB8fCBib3VuZHMucmlnaHQgPD0gcE1vdXNlU3RhdGUubW91c2VQb3NpdGlvbi54IHx8IGJvdW5kcy50b3AgPj0gcE1vdXNlU3RhdGUubW91c2VQb3NpdGlvbi55IHx8IGJvdW5kcy5ib3R0b20gPD0gcE1vdXNlU3RhdGUubW91c2VQb3NpdGlvbi55KVxyXG5cdFx0XHRcdHRoaXMuYm9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHRcdFx0Ym91bmRzID0gdGhpcy5ub2RlQ29udGV4dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHRcdFx0aWYoYm91bmRzLmxlZnQgPj0gcE1vdXNlU3RhdGUubW91c2VQb3NpdGlvbi54IHx8IGJvdW5kcy5yaWdodCA8PSBwTW91c2VTdGF0ZS5tb3VzZVBvc2l0aW9uLnggfHwgYm91bmRzLnRvcCA+PSBwTW91c2VTdGF0ZS5tb3VzZVBvc2l0aW9uLnkgfHwgYm91bmRzLmJvdHRvbSA8PSBwTW91c2VTdGF0ZS5tb3VzZVBvc2l0aW9uLnkpXHJcblx0XHRcdFx0dGhpcy5ub2RlQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0ICAgIH1cclxuXHQgICAgXHJcblx0XHRmb3IgKHZhciBpPXRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aC0xLCBub2RlQ2hvc2VuOyBpPj0wICYmIHRoaXMudGFyZ2V0PT1udWxsOyBpLS0pIHtcclxuXHRcdFx0dmFyIGxOb2RlID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV07XHJcblx0XHRcdFxyXG5cdFx0XHRsTm9kZS5tb3VzZU92ZXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vY29uc29sZS5sb2coXCJub2RlIHVwZGF0ZVwiKTtcclxuXHRcdFx0Ly8gaWYgaG92ZXJpbmcsIHNob3cgaG92ZXIgZ2xvd1xyXG5cdFx0XHQvKmlmIChwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggPiBsTm9kZS5wb3NpdGlvbi54LWxOb2RlLndpZHRoLzIgXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCA8IGxOb2RlLnBvc2l0aW9uLngrbE5vZGUud2lkdGgvMlxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgPiBsTm9kZS5wb3NpdGlvbi55LWxOb2RlLmhlaWdodC8yXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSA8IGxOb2RlLnBvc2l0aW9uLnkrbE5vZGUuaGVpZ2h0LzIpIHsqL1xyXG5cdFx0XHRpZiAoVXRpbGl0aWVzLm1vdXNlSW50ZXJzZWN0KHBNb3VzZVN0YXRlLGxOb2RlLHRoaXMuYm9hcmRPZmZzZXQpKSB7XHJcblx0XHRcdFx0bE5vZGUubW91c2VPdmVyID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldCA9IGxOb2RlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vY29uc29sZS5sb2cocE1vdXNlU3RhdGUuaGFzVGFyZ2V0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuICAgIFx0aWYodGhpcy5hZGRDb24pe1xyXG5cclxuICAgIFx0XHRpZihwTW91c2VTdGF0ZS5tb3VzZUNsaWNrZWQpe1xyXG4gICAgXHRcdFx0dGhpcy5hZGRDb24gPSBmYWxzZTtcclxuICAgIFx0XHRcdGlmKHRoaXMudGFyZ2V0ICYmIHRoaXMudGFyZ2V0IT10aGlzLnN0YXJ0Q29uKXtcclxuICAgIFx0XHRcdFx0aWYoIXRoaXMuc3ViQ29ubmVjdGlvbih0aGlzLnRhcmdldC5xdWVzdGlvbiwgdGhpcy5zdGFydENvbi5xdWVzdGlvbikpe1xyXG4gICAgXHRcdFx0XHRcdHRoaXMudGFyZ2V0LnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCsrO1xyXG4gICAgICAgIFx0XHRcdFx0dGhpcy5zdGFydENvbi5xdWVzdGlvbi5jb25uZWN0aW9ucy5wdXNoKHRoaXMudGFyZ2V0LnF1ZXN0aW9uLm51bSsxKTtcclxuICAgICAgICBcdFx0XHRcdHRoaXMuc2F2ZSgpO1xyXG4gICAgXHRcdFx0XHR9XHJcbiAgICBcdFx0XHR9XHJcbiAgICBcdFx0fVxyXG4gICAgXHRcdGlmKHRoaXMudGFyZ2V0PT1udWxsKVxyXG4gICAgXHRcdFx0dGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2Nyb3NzaGFpcic7XHJcbiAgICBcdFx0XHJcbiAgICBcdH1cclxuICAgIFx0ZWxzZSBpZih0aGlzLnJlbW92ZUNvbil7XHJcbiAgICBcdFx0aWYocE1vdXNlU3RhdGUubW91c2VDbGlja2VkKXtcclxuICAgIFx0XHRcdHRoaXMucmVtb3ZlQ29uID0gZmFsc2U7XHJcbiAgICBcdFx0XHRpZih0aGlzLnRhcmdldCAmJiB0aGlzLnRhcmdldCE9dGhpcy5zdGFydENvbiAmJiBjb25maXJtKFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGNvbm5lY3Rpb24/IFRoaXMgYWN0aW9uIGNhbid0IGJlIHVuZG9uZSFcIikpe1xyXG4gICAgXHRcdFx0XHR2YXIgY29udGFpbnMgPSAtMTtcclxuICAgIFx0XHRcdFx0Zm9yKHZhciBpPTA7aTx0aGlzLnN0YXJ0Q29uLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aCAmJiBjb250YWlucyA9PSAtMTtpKyspXHJcbiAgICBcdFx0XHRcdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5zdGFydENvbi5xdWVzdGlvbi5jb25uZWN0aW9uc1tpXS0xXT09dGhpcy50YXJnZXQpXHJcbiAgICBcdFx0XHRcdFx0XHRjb250YWlucyA9IHRoaXMuc3RhcnRDb24ucXVlc3Rpb24uY29ubmVjdGlvbnNbaV07XHJcbiAgICBcdFx0XHRcdGlmKGNvbnRhaW5zPj0wKXtcclxuICAgIFx0XHRcdFx0XHR0aGlzLnRhcmdldC5xdWVzdGlvbi5yZXZlYWxUaHJlc2hvbGQtLTtcclxuICAgIFx0XHRcdFx0XHR0aGlzLnN0YXJ0Q29uLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLnNwbGljZSh0aGlzLnN0YXJ0Q29uLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmluZGV4T2YoY29udGFpbnMpLCAxKTtcclxuICAgIFx0XHRcdFx0XHR0aGlzLnNhdmUoKTtcclxuICAgIFx0XHRcdFx0fVxyXG4gICAgXHRcdFx0fVxyXG4gICAgXHRcdH1cclxuICAgIFx0XHRpZih0aGlzLnRhcmdldD09bnVsbClcclxuICAgIFx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9ICdjcm9zc2hhaXInO1xyXG4gICAgXHR9XHJcbiAgICBcdGVsc2UgaWYodGhpcy50YXJnZXQpe1xyXG5cdFxyXG5cdFx0XHRpZighdGhpcy50YXJnZXQuZHJhZ2dpbmcpe1xyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHRcdC8vIGRyYWdcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdnaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IG5ldyBQb2ludChcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueCxcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGNsaWNrIGNvZGVcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmNsaWNrKHBNb3VzZVN0YXRlKTtcclxuXHRcdFx0XHRcdHRoaXMubGFzdFF1ZXN0aW9uID0gdGhpcy50YXJnZXQucXVlc3Rpb247XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5sZWZ0TW91c2VDbGlja2VkKCkpIHtcclxuXHRcdFx0XHRcdC8vIGhhbmRsZSBsZWZ0IGNsaWNrIGNvZGVcclxuXHRcdFx0XHRcdHRoaXMubm9kZUNvbnRleHQuc3R5bGUudG9wID0gcE1vdXNlU3RhdGUubW91c2VQb3NpdGlvbi55K1wicHhcIjtcclxuXHRcdFx0XHRcdHRoaXMubm9kZUNvbnRleHQuc3R5bGUubGVmdCA9IHBNb3VzZVN0YXRlLm1vdXNlUG9zaXRpb24ueCtcInB4XCI7XHJcblx0XHRcdFx0XHR0aGlzLm5vZGVDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cdFx0XHRcdFx0dGhpcy5ub2RlQ29udGV4dC52aXJ0dWFsUG9zaXRpb24gPSBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb247XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0XHRcdFx0XHR0aGlzLmNvbnRleHROb2RlID0gdGhpcy50YXJnZXQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxYID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueDtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi54ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWCxDb25zdGFudHMuYm9hcmRTaXplLnggLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxZID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi55ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWSxDb25zdGFudHMuYm9hcmRTaXplLnkgLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0ICB9XHJcblx0XHRcclxuXHRcdC8vIGRyYWcgdGhlIGJvYXJkIGFyb3VuZFxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHR0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLXdlYmtpdC1ncmFiYmluZyc7XHJcblx0XHRcdFx0dGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJy1tb3otZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcblx0XHRcdFx0aWYgKCF0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQpIHtcclxuXHRcdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbjtcclxuXHRcdFx0XHRcdHRoaXMucHJldkJvYXJkT2Zmc2V0LnggPSB0aGlzLmJvYXJkT2Zmc2V0Lng7XHJcblx0XHRcdFx0XHR0aGlzLnByZXZCb2FyZE9mZnNldC55ID0gdGhpcy5ib2FyZE9mZnNldC55O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnggLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC54ID4gdGhpcy5tYXhCb2FyZFdpZHRoLzIpIHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMubWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueCA8IC0xKnRoaXMubWF4Qm9hcmRXaWR0aC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnggPSAtMSp0aGlzLm1heEJvYXJkV2lkdGgvMjtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnkgLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueSk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55ID4gdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSB0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55IDwgLTEqdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSAtMSp0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnJztcclxuXHRcdFx0XHRpZiAocE1vdXNlU3RhdGUubGVmdE1vdXNlQ2xpY2tlZCgpKSB7XHJcblx0XHRcdFx0XHQvLyBoYW5kbGUgbGVmdCBjbGljayBjb2RlXHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkQ29udGV4dC5zdHlsZS50b3AgPSBwTW91c2VTdGF0ZS5tb3VzZVBvc2l0aW9uLnkrXCJweFwiO1xyXG5cdFx0XHRcdFx0dGhpcy5ib2FyZENvbnRleHQuc3R5bGUubGVmdCA9IHBNb3VzZVN0YXRlLm1vdXNlUG9zaXRpb24ueCtcInB4XCI7XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRDb250ZXh0LnZpcnR1YWxQb3NpdGlvbiA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbjtcclxuXHRcdFx0XHRcdHRoaXMubm9kZUNvbnRleHQuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdCAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbnAuc3ViQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKHF1ZXN0aW9uLCBzZWFyY2hRdWVzKXtcclxuXHR2YXIgZm91bmQgPSBmYWxzZTtcclxuXHRmb3IodmFyIGk9MDtpPHF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aCAmJiAhZm91bmQ7aSsrKXtcclxuXHRcdHZhciBjdXIgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtxdWVzdGlvbi5jb25uZWN0aW9uc1tpXS0xXS5xdWVzdGlvbjtcclxuXHRcdGlmKGN1cj09c2VhcmNoUXVlcylcclxuXHRcdFx0Zm91bmQgPSB0cnVlO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHRmb3VuZCA9IHRoaXMuc3ViQ29ubmVjdGlvbihjdXIsIHNlYXJjaFF1ZXMpO1xyXG5cdH1cclxuXHRyZXR1cm4gZm91bmQ7XHJcbn1cclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGdhbWVTY2FsZSwgcE1vdXNlU3RhdGUpe1xyXG4gICAgXHJcbiAgICAvLyBzYXZlIGNhbnZhcyBzdGF0ZSBiZWNhdXNlIHdlIGFyZSBhYm91dCB0byBhbHRlciBwcm9wZXJ0aWVzXHJcbiAgICB0aGlzLmN0eC5zYXZlKCk7ICAgXHJcbiAgICBcclxuICAgIC8vIENsZWFyIGJlZm9yZSBkcmF3aW5nIG5ldyBzdHVmZlxyXG5cdERyYXdMaWIucmVjdCh0aGlzLmN0eCwgMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCwgXCIjMTU3MThGXCIpO1xyXG5cclxuXHRcclxuXHQvLyBTY2FsZSB0aGUgZ2FtZVxyXG4gICAgdGhpcy5jdHguc2F2ZSgpO1xyXG4gICAgdGhpcy5jdHgudHJhbnNsYXRlKHRoaXMuY2FudmFzLndpZHRoLzIsIHRoaXMuY2FudmFzLmhlaWdodC8yKTtcclxuXHR0aGlzLmN0eC5zY2FsZShnYW1lU2NhbGUsIGdhbWVTY2FsZSk7XHJcblx0dGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNhbnZhcy53aWR0aC8yLCAtdGhpcy5jYW52YXMuaGVpZ2h0LzIpO1xyXG5cclxuICAgIC8vIFRyYW5zbGF0ZSB0byBjZW50ZXIgb2Ygc2NyZWVuIGFuZCBzY2FsZSBmb3Igem9vbSB0aGVuIHRyYW5zbGF0ZSBiYWNrXHJcbiAgICB0aGlzLmN0eC50cmFuc2xhdGUodGhpcy5jYW52YXMud2lkdGgvMiwgdGhpcy5jYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgdGhpcy5jdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pO1xyXG4gICAgdGhpcy5jdHgudHJhbnNsYXRlKC10aGlzLmNhbnZhcy53aWR0aC8yLCAtdGhpcy5jYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgLy8gbW92ZSB0aGUgYm9hcmQgdG8gd2hlcmUgdGhlIHVzZXIgZHJhZ2dlZCBpdFxyXG4gICAgLy90cmFuc2xhdGUgdG8gdGhlIGNlbnRlciBvZiB0aGUgYm9hcmRcclxuICAgIC8vY29uc29sZS5sb2codGhpcyk7XHJcbiAgICB0aGlzLmN0eC50cmFuc2xhdGUodGhpcy5jYW52YXMud2lkdGgvMiAtIHRoaXMuYm9hcmRPZmZzZXQueCwgdGhpcy5jYW52YXMuaGVpZ2h0LzIgLSB0aGlzLmJvYXJkT2Zmc2V0LnkpO1xyXG4gICAgXHJcblx0XHJcbiAgICAvLyBEcmF3IHRoZSBiYWNrZ3JvdW5kIG9mIHRoZSBib2FyZFxyXG4gICAgRHJhd0xpYi5yZWN0KHRoaXMuY3R4LCAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngsIENvbnN0YW50cy5ib2FyZFNpemUueSwgXCIjRDNCMTg1XCIpO1xyXG4gICAgRHJhd0xpYi5zdHJva2VSZWN0KHRoaXMuY3R4LCAtQ29uc3RhbnRzLmJvYXJkT3V0bGluZS8yLCAtQ29uc3RhbnRzLmJvYXJkT3V0bGluZS8yLCBDb25zdGFudHMuYm9hcmRTaXplLngrQ29uc3RhbnRzLmJvYXJkT3V0bGluZS8yLCBDb25zdGFudHMuYm9hcmRTaXplLnkrQ29uc3RhbnRzLmJvYXJkT3V0bGluZS8yLCBDb25zdGFudHMuYm9hcmRPdXRsaW5lLCBcIiNDQjk5NjZcIik7XHJcbiAgICBcclxuXHJcblxyXG5cdC8vIGRyYXcgdGhlIG5vZGVzIGl0c2VsZlxyXG5cdGZvcih2YXIgaT0wOyBpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmRyYXcodGhpcy5jdHgsIHRoaXMuY2FudmFzKTtcclxuICAgIFxyXG5cdC8vIGRyYXcgdGhlIGxpbmVzXHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHJcblx0XHQvLyBnZXQgdGhlIHBpbiBwb3NpdGlvblxyXG4gICAgICAgIHZhciBvUG9zID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZ2V0Tm9kZVBvaW50KCk7XHJcbiAgICAgICAgXHJcblx0XHQvLyBzZXQgbGluZSBzdHlsZVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIGRyYXcgbGluZXNcclxuICAgICAgICBmb3IgKHZhciBqPTA7IGo8dGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICBcdHZhciBjb25uZWN0aW9uID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0dmFyIHNpemUgPSBDb25zdGFudHMuYXJyb3dTaXplLFxyXG4gICAgICAgIFx0XHRjb2xvciA9IFwicmVkXCI7XHJcbiAgICAgICAgXHRpZigoIXRoaXMucmVtb3ZlQ29uICYmIHRoaXMubGVzc29uTm9kZUFycmF5W2ldPT10aGlzLnRhcmdldCkgfHwgXHJcbiAgICAgICAgXHRcdFx0KHRoaXMucmVtb3ZlQ29uICYmIHRoaXMubGVzc29uTm9kZUFycmF5W2ldPT10aGlzLnN0YXJ0Q29uICYmIGNvbm5lY3Rpb249PXRoaXMudGFyZ2V0KSl7XHJcbiAgICAgICAgXHRcdHNpemUgKj0gMjtcclxuICAgICAgICBcdFx0Y29sb3IgPSAgXCJibHVlXCI7XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0Ly8gLTEgYmVjYXNlIG5vZGUgY29ubmVjdGlvbiBpbmRleCB2YWx1ZXMgYXJlIDEtaW5kZXhlZCBidXQgY29ubmVjdGlvbnMgaXMgMC1pbmRleGVkXHJcbiAgICAgICAgXHQvLyBnbyB0byB0aGUgaW5kZXggaW4gdGhlIGFycmF5IHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGNvbm5lY3RlZCBub2RlIG9uIHRoaXMgYm9hcmQgYW5kIHNhdmUgaXRzIHBvc2l0aW9uXHJcbiAgICAgICAgXHQvLyBjb25uZWN0aW9uIGluZGV4IHNhdmVkIGluIHRoZSBsZXNzb25Ob2RlJ3MgcXVlc3Rpb25cclxuICAgICAgICBcdHZhciBjUG9zID0gY29ubmVjdGlvbi5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICAgICAgRHJhd0xpYi5hcnJvdyh0aGlzLmN0eCwgb1BvcywgY1BvcywgQ29uc3RhbnRzLmFycm93SGVhZFNpemUsIHNpemUsIGNvbG9yKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHRpZih0aGlzLmFkZENvbilcclxuICAgICAgICBEcmF3TGliLmFycm93KHRoaXMuY3R4LCB0aGlzLnN0YXJ0Q29uLmdldE5vZGVQb2ludCgpLCBuZXcgUG9pbnQocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLngrdGhpcy5ib2FyZE9mZnNldC54LCBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSt0aGlzLmJvYXJkT2Zmc2V0LnkpLCBDb25zdGFudHMuYXJyb3dIZWFkU2l6ZSwgQ29uc3RhbnRzLmFycm93U2l6ZSwgXCJkYXJrUmVkXCIpO1xyXG5cdFxyXG5cdHRoaXMuY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbi8vIEdldHMgYSBmcmVlIG5vZGUgaW4gdGhpcyBib2FyZCAoaS5lLiBub3QgdW5zb2x2ZWQpIHJldHVybnMgbnVsbCBpZiBub25lXHJcbnAuZ2V0RnJlZU5vZGUgPSBmdW5jdGlvbigpIHtcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKylcclxuXHRcdGlmKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRClcclxuXHRcdFx0cmV0dXJuIHRoaXMubGVzc29uTm9kZUFycmF5W2ldO1xyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vLyBNb3ZlcyB0aGlzIGJvYXJkIHRvd2FyZHMgdGhlIGdpdmVuIHBvaW50XHJcbnAubW92ZVRvd2FyZHMgPSBmdW5jdGlvbihwb2ludCwgZHQsIHNwZWVkKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHZlY3RvciB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5cdHZhciB0b1BvaW50ID0gbmV3IFBvaW50KHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54LCBwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSk7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBkaXN0YW5jZSBvZiBzYWlkIHZlY3RvclxyXG5cdHZhciBkaXN0YW5jZSA9IE1hdGguc3FydCh0b1BvaW50LngqdG9Qb2ludC54K3RvUG9pbnQueSp0b1BvaW50LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgbmV3IG9mZnNldCBvZiB0aGUgYm9hcmQgYWZ0ZXIgbW92aW5nIHRvd2FyZHMgdGhlIHBvaW50XHJcblx0dmFyIG5ld09mZnNldCA9IG5ldyBQb2ludCggdGhpcy5ib2FyZE9mZnNldC54ICsgdG9Qb2ludC54L2Rpc3RhbmNlKmR0KnNwZWVkLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5ib2FyZE9mZnNldC55ICsgdG9Qb2ludC55L2Rpc3RhbmNlKmR0KnNwZWVkKTtcclxuXHRcclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geCBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB4XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC54ICE9cG9pbnQueCAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueC1uZXdPZmZzZXQueCkvKHBvaW50LngtbmV3T2Zmc2V0LngpPT1NYXRoLmFicyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkvKHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IG5ld09mZnNldC54O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHBvaW50Lng7XHJcblx0XHJcblxyXG5cdC8vIENoZWNrIGlmIHBhc3NlZCBwb2ludCBvbiB5IGF4aXMgYW5kIGlmIHNvIHNldCB0byBwb2ludCdzIHlcclxuXHRpZih0aGlzLmJvYXJkT2Zmc2V0LnkgIT0gcG9pbnQueSAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueS1uZXdPZmZzZXQueSkvKHBvaW50LnktbmV3T2Zmc2V0LnkpPT1NYXRoLmFicyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkvKHBvaW50LnktdGhpcy5ib2FyZE9mZnNldC55KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IG5ld09mZnNldC55O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHBvaW50Lnk7XHJcbn1cclxuXHJcbnAud2luZG93Q2xvc2VkID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgeG1sO1xyXG5cdGlmKHRoaXMubGFzdFF1ZXN0aW9uKXtcclxuXHRcdHZhciBxdWVzdGlvbiA9IHRoaXMubGFzdFF1ZXN0aW9uO1xyXG5cdFx0dGhpcy5sYXN0UXVlc3Rpb24gPSBudWxsO1xyXG5cdFx0aWYocXVlc3Rpb24uc2F2ZSl7XHJcblx0XHRcdHF1ZXN0aW9uLnNhdmUgPSBmYWxzZTtcclxuXHRcdFx0eG1sID0gcXVlc3Rpb24ueG1sO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDtpKyspXHJcblx0XHRcdFx0dGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0udXBkYXRlSW1hZ2UoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB7eG1sOnhtbCwgbnVtOnF1ZXN0aW9uLm51bX07XHJcblx0fVxyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG5wLmFkZENvbm5lY3Rpb24gPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuYWRkQ29uID0gdHJ1ZTtcclxuXHR0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnY3Jvc3NoYWlyJztcclxuXHR0aGlzLnN0YXJ0Q29uID0gdGhpcy5jb250ZXh0Tm9kZTtcclxufVxyXG5cclxucC5yZW1vdmVDb25uZWN0aW9uID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLnJlbW92ZUNvbiA9IHRydWU7XHJcblx0dGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2Nyb3NzaGFpcic7XHJcblx0dGhpcy5zdGFydENvbiA9IHRoaXMuY29udGV4dE5vZGU7XHJcbn1cclxuXHJcbnAuc2hvdyA9IGZ1bmN0aW9uKGRpcil7XHJcblx0aWYoZGlyIT1udWxsKVxyXG5cdFx0dGhpcy5jYW52YXMuc3R5bGUuYW5pbWF0aW9uID0gJ2NhbnZhc0VudGVyJyArIChkaXIgPyAnTCcgOiAnUicpICsgJyAxcyc7XHJcblx0dGhpcy5jYW52YXMuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xyXG59XHJcblxyXG5wLmhpZGUgPSBmdW5jdGlvbihkaXIpe1xyXG5cdGlmKGRpciE9bnVsbCl7XHJcblx0XHR0aGlzLmNhbnZhcy5zdHlsZS5hbmltYXRpb24gPSAnY2FudmFzTGVhdmUnICsgKGRpciA/ICdSJyA6ICdMJykgKyAnIDFzJztcclxuXHRcdHZhciBib2FyZCA9IHRoaXM7XHJcblx0XHR0aGlzLmxvYWRlZCA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGJvYXJkLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNle1xyXG5cdFx0Ym9hcmQuY2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0fVxyXG59XHJcblxyXG5wLnVwZGF0ZVNpemUgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcblx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJvYXJkOyAgICBcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4uL2hlbHBlci9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyBUaGUgc2l6ZSBvZiB0aGUgYm9hcmQgaW4gZ2FtZSB1bml0cyBhdCAxMDAlIHpvb21cclxubS5ib2FyZFNpemUgPSBuZXcgUG9pbnQoMTkyMCwgMTA4MCk7XHJcbm0uYm91bmRTaXplID0gMztcclxuXHJcbi8vVGhlIHNpemUgb2YgdGhlIGJvYXJkIG91dGxpbmUgaW4gZ2FtZSB1bml0cyBhdCAxMDAlIHpvb21cclxubS5ib2FyZE91dGxpbmUgPSBtLmJvYXJkU2l6ZS54ID4gbS5ib2FyZFNpemUueSA/IG0uYm9hcmRTaXplLngvMjAgOiBtLmJvYXJkU2l6ZS55LzIwO1xyXG5cclxuLy8gVGhlIHpvb20gdmFsdWVzIGF0IHN0YXJ0IGFuZCBlbmQgb2YgYW5pbWF0aW9uXHJcbm0uc3RhcnRab29tID0gMC41O1xyXG5tLmVuZFpvb20gPSAxLjU7XHJcblxyXG4vLyBUaGUgc3BlZWQgb2YgdGhlIHpvb20gYW5pbWF0aW9uXHJcbm0uem9vbVNwZWVkID0gMC4wMDE7XHJcbm0uem9vbU1vdmVTcGVlZCA9IDAuNzU7XHJcblxyXG4vLyBUaGUgc3BlZWQgb2YgdGhlIGxpbmUgYW5pbWF0aW9uXHJcbm0ubGluZVNwZWVkID0gMC4wMDI7XHJcblxyXG4vLyBUaGUgdGltZSBiZXR3ZWVuIHpvb20gY2hlY2tzXHJcbm0ucGluY2hTcGVlZCA9IC4wMDI1O1xyXG5cclxuLy8gVXNlZCBmb3IgcmVzaXppbmcgbm9kZXNcclxubS5ub2RlU3RlcCA9IDAuMTtcclxubS5tYXhOb2RlU2NhbGUgPSAyO1xyXG5tLm1pbk5vZGVTY2FsZSA9IDAuNTtcclxubS5ub2RlRWRnZVdpZHRoID0gMjU7XHJcblxyXG4vLyBVc2VkIGZvciBkcmF3aW5nIGFycm93c1xyXG5tLmFycm93SGVhZFNpemUgPSA1MDtcclxubS5hcnJvd1NpemUgPSA1OyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4uL2hlbHBlci9wb2ludC5qcycpO1xyXG52YXIgTGVzc29uTm9kZSA9IHJlcXVpcmUoJy4vbGVzc29uTm9kZS5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKCcuLi9oZWxwZXIvZHJhd2xpYi5qcycpO1xyXG52YXIgRGF0YVBhcnNlciA9IHJlcXVpcmUoJy4uL2hlbHBlci9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG52YXIgTW91c2VTdGF0ZSA9IHJlcXVpcmUoJy4uL2hlbHBlci9tb3VzZVN0YXRlLmpzJyk7XHJcbnZhciBGaWxlTWFuYWdlciA9IHJlcXVpcmUoJy4uL2hlbHBlci9maWxlTWFuYWdlci5qcycpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi4vaGVscGVyL3V0aWxpdGllcy5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKCcuLi9jYXNlL3F1ZXN0aW9uLmpzJyk7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL2Nhc2UvY2F0ZWdvcnkuanMnKTtcclxudmFyIFBvcHVwID0gcmVxdWlyZSgnLi4vbWVudXMvcG9wdXAuanMnKTtcclxuXHJcbi8vbW91c2UgbWFuYWdlbWVudFxyXG52YXIgbW91c2VTdGF0ZTtcclxudmFyIHByZXZpb3VzTW91c2VTdGF0ZTtcclxudmFyIGRyYWdnaW5nRGlzYWJsZWQ7XHJcbnZhciBtb3VzZVRhcmdldDtcclxudmFyIG1vdXNlU3VzdGFpbmVkRG93bjtcclxuXHJcbi8vIEhUTUwgZWxlbWVudHNcclxudmFyIHpvb21TbGlkZXI7XHJcbnZhciB3aW5kb3dEaXY7XHJcbnZhciB3aW5kb3dGaWxtO1xyXG5cclxuLy8gVXNlZCBmb3IgcGluY2ggem9vbVxyXG52YXIgcGluY2hTdGFydDtcclxuXHJcbi8vIFVzZWQgZm9yIHdhaXRpbmcgYSBzZWNvbmQgdG8gY2xvc2Ugd2luZG93c1xyXG52YXIgcGF1c2VkVGltZSA9IDA7XHJcblxyXG4vL3BoYXNlIGhhbmRsaW5nXHJcbnZhciBwaGFzZU9iamVjdDtcclxuXHJcbmZ1bmN0aW9uIGdhbWUoc2VjdGlvbiwgYmFzZVNjYWxlKXtcclxuXHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcclxuXHR0aGlzLnNlY3Rpb24gPSBzZWN0aW9uO1xyXG5cdHRoaXMuc2F2ZUZpbGVzID0gW107XHJcblx0XHJcblx0Ly8gR2V0IGFuZCBzZXR1cCB0aGUgd2luZG93IGVsZW1lbnRzXHJcblx0d2luZG93RGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dpbmRvdycpO1xyXG5cdHdpbmRvd0ZpbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luZG93RmxpbScpO1xyXG5cdFxyXG5cdC8vIEdldCBhbmQgc2V0dXAgdGhlIHpvb20gc2xpZGVyXHJcblx0em9vbVNsaWRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjem9vbS1zbGlkZXInKTtcclxuXHR6b29tU2xpZGVyLm9uaW5wdXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjem9vbS1pbicpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuICAgIH07XHJcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI3pvb20tb3V0Jykub25jbGljayA9IGZ1bmN0aW9uKCkgeyBcclxuXHRcdHpvb21TbGlkZXIuc3RlcFVwKCk7IFxyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuXHR9O1xyXG5cdFxyXG5cdC8vIEdldCBhbmQgc2V0dXAgdGhlIGJvYXJkIGNvbnRleHQgbWVudVxyXG5cdHZhciBib2FyZENvbnRleHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2JvYXJkLWNvbnRleHQnKTtcclxuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2JvYXJkLWNvbnRleHQgI2FkZC1xdWVzdGlvbicpLm9uY2xpY2sgPSBmdW5jdGlvbihlKXtcclxuXHRcdHZhciBib2FyZCA9IGdhbWUuYm9hcmRBcnJheVtnYW1lLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0Z2FtZS5hZGRRdWVzdGlvbigoYm9hcmRDb250ZXh0LnZpcnR1YWxQb3NpdGlvbi54K0NvbnN0YW50cy5ib2FyZFNpemUueC8yKS9Db25zdGFudHMuYm9hcmRTaXplLngqMTAwLFxyXG5cdFx0XHRcdChib2FyZENvbnRleHQudmlydHVhbFBvc2l0aW9uLnkrQ29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpL0NvbnN0YW50cy5ib2FyZFNpemUueSoxMDApO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cclxuXHJcblx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNib2FyZC1jb250ZXh0ICNhZGQtY2F0ZWdvcnknKS5vbmNsaWNrID0gZnVuY3Rpb24oZSl7XHJcblx0XHRQb3B1cC5wcm9tcHQod2luZG93RGl2LCBcIkNyZWF0ZSBDYXRlZ29yeVwiLCBcIkNhdGVnb3J5IE5hbWU6XCIsIFwiXCIsIFwiQ3JlYXRlXCIsIGZ1bmN0aW9uKG5ld05hbWUpe1xyXG4gICAgXHRcdGlmKG5ld05hbWUpXHJcbiAgICBcdFx0XHRnYW1lLmFkZENhdGVnb3J5KG5ld05hbWUpO1xyXG4gICAgXHR9KTtcclxuXHRcdGJvYXJkQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0fTtcclxuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2JvYXJkLWNvbnRleHQgI3JlbmFtZS1jYXRlZ29yeScpLm9uY2xpY2sgPSBmdW5jdGlvbihlKXtcclxuXHRcdFBvcHVwLnByb21wdCh3aW5kb3dEaXYsIFwiUmVuYW1lIENhdGVnb3J5XCIsIFwiQ2F0ZWdvcnkgTmFtZTpcIiwgZ2FtZS5jYXRlZ29yaWVzW2dhbWUuYWN0aXZlQm9hcmRJbmRleF0ubmFtZSwgXCJSZW5hbWVcIiwgZnVuY3Rpb24obmV3TmFtZSl7XHJcbiAgICBcdFx0aWYobmV3TmFtZSl7XHJcbiAgICBcdFx0XHRnYW1lLmNhdGVnb3JpZXNbZ2FtZS5hY3RpdmVCb2FyZEluZGV4XS5uYW1lID0gbmV3TmFtZTtcclxuICAgIFx0XHRcdGdhbWUuYm9hcmRBcnJheVtnYW1lLmFjdGl2ZUJvYXJkSW5kZXhdLmJ1dHRvbi5pbm5lckhUTUwgPSBuZXdOYW1lO1xyXG4gICAgXHRcdFx0dmFyIGNhc2VEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10pO1xyXG4gICAgXHRcdFx0dmFyIGNhc2VGaWxlID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5jYXNlRmlsZSk7XHJcbiAgICBcdFx0XHRjYXNlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5TGlzdFwiKVswXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVsZW1lbnRcIilbZ2FtZS5hY3RpdmVCb2FyZEluZGV4XS5pbm5lckhUTUwgPSBuZXdOYW1lO1xyXG4gICAgXHRcdFx0Y2FzZURhdGEuY2FzZUZpbGUgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGNhc2VGaWxlKTtcclxuICAgIFx0XHRcdGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSA9IEpTT04uc3RyaW5naWZ5KGNhc2VEYXRhKTtcclxuICAgIFx0XHR9XHJcbiAgICBcdH0pO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYm9hcmQtY29udGV4dCAjZGVsZXRlLWNhdGVnb3J5Jykub25jbGljayA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0aWYoZ2FtZS5ib2FyZEFycmF5Lmxlbmd0aD4xICYmIGNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoZSBjdXJyZW50IGNhdGVnb3J5IFlvdSBjYW4ndCB1bmRvIHRoaXMgYWN0aW9uIVwiKSlcclxuXHRcdFx0Z2FtZS5kZWxldGVDYXRlZ29yeSgpO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYm9hcmQtY29udGV4dCAjZm9yd2FyZC1jYXRlZ29yeScpLm9uY2xpY2sgPSBmdW5jdGlvbihlKXtcclxuXHRcdGlmKGdhbWUuYWN0aXZlQm9hcmRJbmRleCsxPGdhbWUuY2F0ZWdvcmllcy5sZW5ndGgpXHJcblx0XHRcdGdhbWUubW92ZUNhdGVnb3J5KDEpO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYm9hcmQtY29udGV4dCAjYmFja3dhcmQtY2F0ZWdvcnknKS5vbmNsaWNrID0gZnVuY3Rpb24oZSl7XHJcblx0XHRpZihnYW1lLmFjdGl2ZUJvYXJkSW5kZXgtMT49MClcclxuXHRcdFx0Z2FtZS5tb3ZlQ2F0ZWdvcnkoLTEpO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdFxyXG5cdFxyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYm9hcmQtY29udGV4dCAjZWRpdC1pbmZvJykub25jbGljayA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0dmFyIGNhc2VEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10pO1xyXG5cdFx0UG9wdXAuZWRpdEluZm8od2luZG93RGl2LCBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKSwgZnVuY3Rpb24obmV3Q2FzZUZpbGUsIG5hbWUpe1xyXG5cdCAgICBcdGxvY2FsU3RvcmFnZVsnY2FzZU5hbWUnXSA9bmFtZStcIi5pcGFyXCI7XHJcblx0XHRcdGNhc2VEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10pO1xyXG5cdFx0XHRjYXNlRGF0YS5jYXNlRmlsZSA9IG5ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcobmV3Q2FzZUZpbGUpO1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcblx0XHR9KTtcclxuXHRcdGJvYXJkQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0fTtcclxuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2JvYXJkLWNvbnRleHQgI2VkaXQtcmVzb3VyY2VzJykub25jbGljayA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0Z2FtZS5yZXNvdXJjZXMub3BlbldpbmRvdyh3aW5kb3dEaXYsIGZhbHNlLCBmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSk7XHJcblx0XHRcdHZhciBjYXNlRmlsZSA9IFV0aWxpdGllcy5nZXRYbWwoY2FzZURhdGEuY2FzZUZpbGUpO1xyXG5cdFx0XHR2YXIgcmVzb3VyY2VMaXN0ID0gY2FzZUZpbGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZUxpc3RcIilbMF07XHJcblx0XHRcdHJlc291cmNlTGlzdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChnYW1lLnJlc291cmNlcy54bWwoY2FzZUZpbGUpLCByZXNvdXJjZUxpc3QpO1xyXG5cdFx0XHRjYXNlRGF0YS5jYXNlRmlsZSA9IG5ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcoY2FzZUZpbGUpO1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcblx0XHR9KTtcclxuXHRcdGdhbWUuc2F2ZSgpO1xyXG5cdFx0Ym9hcmRDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdFxyXG5cclxuXHQvLyBHZXQgYW5kIHNldHVwIHRoZSBub2RlIGNvbnRleHQgbWVudVxyXG5cdHZhciBub2RlQ29udGV4dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3RoaXMuc2VjdGlvbi5pZCsnICNub2RlLWNvbnRleHQnKTtcclxuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI25vZGUtY29udGV4dCAjYWRkLWNvbm5lY3Rpb24nKS5vbmNsaWNrID0gZnVuY3Rpb24oZSl7XHJcblx0XHRnYW1lLmJvYXJkQXJyYXlbZ2FtZS5hY3RpdmVCb2FyZEluZGV4XS5hZGRDb25uZWN0aW9uKCk7XHJcblx0XHRnYW1lLnNhdmUoKTtcclxuXHRcdG5vZGVDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjbm9kZS1jb250ZXh0ICNyZW1vdmUtY29ubmVjdGlvbicpLm9uY2xpY2sgPSBmdW5jdGlvbihlKXtcclxuXHRcdGlmKGdhbWUuYm9hcmRBcnJheVtnYW1lLmFjdGl2ZUJvYXJkSW5kZXhdLmNvbnRleHROb2RlLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aD4wKXtcclxuXHRcdFx0Z2FtZS5ib2FyZEFycmF5W2dhbWUuYWN0aXZlQm9hcmRJbmRleF0ucmVtb3ZlQ29ubmVjdGlvbigpO1xyXG5cdFx0XHRnYW1lLnNhdmUoKTtcclxuXHRcdH1cclxuXHRcdG5vZGVDb250ZXh0LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjbm9kZS1jb250ZXh0ICNkZWxldGUtcXVlc3Rpb24nKS5vbmNsaWNrID0gZnVuY3Rpb24oZSl7XHJcblx0XHRpZihjb25maXJtKFwiQXJlIHlvdSBzdXJlIHdhbnQgdG8gZGVsZXRlIHRoaXMgcXVlc3Rpb24/IFlvdSBjYW4ndCB1bmRvIHRoaXMgYWN0aW9uIVwiKSl7XHJcblx0XHRcdHZhciBib2FyZCA9IGdhbWUuYm9hcmRBcnJheVtnYW1lLmFjdGl2ZUJvYXJkSW5kZXhdLFxyXG5cdFx0XHRcdGNhdCA9IGdhbWUuY2F0ZWdvcmllc1tnYW1lLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPGNhdC5xdWVzdGlvbnMubGVuZ3RoO2krKyl7XHJcblx0XHRcdFx0aWYoY2F0LnF1ZXN0aW9uc1tpXS5udW0+Ym9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtKVxyXG5cdFx0XHRcdFx0Y2F0LnF1ZXN0aW9uc1tpXS5udW0tLTtcclxuXHRcdFx0XHR2YXIgY29uID0gY2F0LnF1ZXN0aW9uc1tpXS5jb25uZWN0aW9ucy5pbmRleE9mKGJvYXJkLmNvbnRleHROb2RlLnF1ZXN0aW9uLm51bSsxKTtcclxuXHRcdFx0XHR3aGlsZShjb24hPS0xKXtcclxuXHRcdFx0XHRcdGNhdC5xdWVzdGlvbnNbaV0uY29ubmVjdGlvbnMuc3BsaWNlKGNvbiwgMSk7XHJcblx0XHRcdFx0XHRjb24gPSBjYXQucXVlc3Rpb25zW2ldLmNvbm5lY3Rpb25zLmluZGV4T2YoYm9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtKzEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmb3IodmFyIGo9MDtqPGNhdC5xdWVzdGlvbnNbaV0uY29ubmVjdGlvbnMubGVuZ3RoO2orKylcclxuXHRcdFx0XHRcdGlmKGNhdC5xdWVzdGlvbnNbaV0uY29ubmVjdGlvbnNbal0tMT5ib2FyZC5jb250ZXh0Tm9kZS5xdWVzdGlvbi5udW0pXHJcblx0XHRcdFx0XHRcdGNhdC5xdWVzdGlvbnNbaV0uY29ubmVjdGlvbnNbal0tLTtcclxuXHRcdFx0fVxyXG5cdFx0XHRib2FyZC5sZXNzb25Ob2RlQXJyYXkuc3BsaWNlKGJvYXJkLmNvbnRleHROb2RlLnF1ZXN0aW9uLm51bSwgMSk7XHJcblx0XHRcdGNhdC5xdWVzdGlvbnMuc3BsaWNlKGJvYXJkLmNvbnRleHROb2RlLnF1ZXN0aW9uLm51bSwgMSk7XHJcblx0XHRcdGdhbWUuc2F2ZSgpO1xyXG5cdFx0fVxyXG5cdFx0bm9kZUNvbnRleHQuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdH07XHJcblx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNub2RlLWNvbnRleHQgI21ha2UtbGFyZ2VyJykub25jbGljayA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0dmFyIGJvYXJkID0gZ2FtZS5ib2FyZEFycmF5W2dhbWUuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRpZihib2FyZC5sZXNzb25Ob2RlQXJyYXlbYm9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtXS5xdWVzdGlvbi5zY2FsZTxDb25zdGFudHMubWF4Tm9kZVNjYWxlKXtcclxuXHRcdFx0Ym9hcmQubGVzc29uTm9kZUFycmF5W2JvYXJkLmNvbnRleHROb2RlLnF1ZXN0aW9uLm51bV0ucXVlc3Rpb24uc2NhbGUgKz0gQ29uc3RhbnRzLm5vZGVTdGVwO1xyXG5cdFx0XHRib2FyZC5sZXNzb25Ob2RlQXJyYXlbYm9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtXS51cGRhdGVJbWFnZSgpO1xyXG5cdFx0fVxyXG5cdFx0Z2FtZS5zYXZlKCk7XHJcblx0XHRub2RlQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0fTtcclxuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI25vZGUtY29udGV4dCAjbWFrZS1zbWFsbGVyJykub25jbGljayA9IGZ1bmN0aW9uKGUpe1xyXG5cdFx0dmFyIGJvYXJkID0gZ2FtZS5ib2FyZEFycmF5W2dhbWUuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRpZihib2FyZC5sZXNzb25Ob2RlQXJyYXlbYm9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtXS5xdWVzdGlvbi5zY2FsZT5Db25zdGFudHMubWluTm9kZVNjYWxlKXtcclxuXHRcdFx0Ym9hcmQubGVzc29uTm9kZUFycmF5W2JvYXJkLmNvbnRleHROb2RlLnF1ZXN0aW9uLm51bV0ucXVlc3Rpb24uc2NhbGUgLT0gQ29uc3RhbnRzLm5vZGVTdGVwO1xyXG5cdFx0XHRib2FyZC5sZXNzb25Ob2RlQXJyYXlbYm9hcmQuY29udGV4dE5vZGUucXVlc3Rpb24ubnVtXS51cGRhdGVJbWFnZSgpO1xyXG5cdFx0fVxyXG5cdFx0Z2FtZS5zYXZlKCk7XHJcblx0XHRub2RlQ29udGV4dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0fTtcclxuXHRcclxuXHRcclxuXHRcclxuXHQvLyBTYXZlIHRoZSBnaXZlbiBzY2FsZVxyXG5cdHRoaXMuc2NhbGUgPSBiYXNlU2NhbGU7XHJcblx0XHJcblx0Ly8gTG9hZCB0aGUgY2FzZSBmaWxlXHJcblx0dmFyIGxvYWREYXRhID0gRmlsZU1hbmFnZXIubG9hZENhc2UoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10pLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI3dpbmRvdycpKTtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGJvYXJkc1xyXG5cdHRoaXMucmVzb3VyY2VzID0gbG9hZERhdGEucmVzb3VyY2VzO1xyXG5cdHRoaXMuY2F0ZWdvcmllcyA9IGxvYWREYXRhLmNhdGVnb3JpZXM7XHJcblx0dGhpcy5ub2RlQ29udGV4dCA9IG5vZGVDb250ZXh0O1xyXG5cdHRoaXMuYm9hcmRDb250ZXh0ID0gYm9hcmRDb250ZXh0O1xyXG5cdHRoaXMuY3JlYXRlTGVzc29uTm9kZXMoKTtcclxuXHRcclxuXHQvLyBEaXNwbGF5IHRoZSBjdXJyZW50IGJvYXJkXHJcblx0dGhpcy5hY3RpdmVCb2FyZEluZGV4ID0gbG9hZERhdGEuY2F0ZWdvcnk7XHJcblx0dGhpcy5hY3RpdmUgPSB0cnVlO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnNob3coKTtcclxuXHR6b29tU2xpZGVyLnZhbHVlID0gLXRoaXMuZ2V0Wm9vbSgpO1xyXG5cdFxyXG5cdC8vIFNldHVwIHRoZSBzYXZlIGJ1dHRvblxyXG5cdEZpbGVNYW5hZ2VyLnByZXBhcmVaaXAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNibG9iJykpO1xyXG59XHJcblxyXG52YXIgcCA9IGdhbWUucHJvdG90eXBlO1xyXG5cclxucC5hZGRDYXRlZ29yeSA9IGZ1bmN0aW9uKG5hbWUpe1xyXG5cdFxyXG5cdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddKTtcclxuXHR2YXIgY2FzZUZpbGUgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR2YXIgY2F0ID0gY2FzZUZpbGUuY3JlYXRlRWxlbWVudChcImNhdGVnb3J5XCIpO1xyXG5cdGNhdC5zZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIsIHRoaXMuY2F0ZWdvcmllcy5sZW5ndGgpO1xyXG5cdGNhdC5zZXRBdHRyaWJ1dGUoXCJxdWVzdGlvbkNvdW50XCIsIDApO1xyXG5cdGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5hcHBlbmRDaGlsZChjYXQpO1xyXG5cdHRoaXMuY2F0ZWdvcmllcy5wdXNoKG5ldyBDYXRlZ29yeShuYW1lLCBjYXQsIHRoaXMucmVzb3VyY2VzLCB3aW5kb3dEaXYpKTtcclxuXHR0aGlzLmNyZWF0ZUJvYXJkKHRoaXMuY2F0ZWdvcmllc1t0aGlzLmNhdGVnb3JpZXMubGVuZ3RoLTFdLCB0aGlzLmNhdGVnb3JpZXMubGVuZ3RoLTEpO1xyXG5cdFxyXG5cdGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5hcHBlbmRDaGlsZChjYXQpO1xyXG5cdHZhciBsaXN0ID0gY2FzZUZpbGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeUxpc3RcIilbMF07XHJcblx0bGlzdC5zZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeUNvdW50XCIsIHRoaXMuY2F0ZWdvcmllcy5sZW5ndGgpO1xyXG5cdHZhciBuZXdFbGVtZW50ID0gY2FzZUZpbGUuY3JlYXRlRWxlbWVudChcImVsZW1lbnRcIik7XHJcblx0bmV3RWxlbWVudC5pbm5lckhUTUwgPSBuYW1lO1xyXG5cdGxpc3QuYXBwZW5kQ2hpbGQobmV3RWxlbWVudCk7XHJcblx0Y2FzZURhdGEuY2FzZUZpbGUgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGNhc2VGaWxlKTtcclxuXHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcblx0Y29uc29sZS5sb2coXCJBRERJTkcgQ0FUXCIpO1xyXG5cdGNvbnNvbGUubG9nKGNhc2VGaWxlKTtcclxuXHRcclxufVxyXG5cclxucC5tb3ZlQ2F0ZWdvcnkgPSBmdW5jdGlvbihkaXIpe1xyXG5cdFxyXG5cdC8vIEZsaXAgdGhlIGNhdGVnb3JpZXMgZmlyc3RcclxuXHR2YXIgdGVtcCA9IHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdID0gdGhpcy5jYXRlZ29yaWVzW2Rpcit0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXSA9IHRlbXA7XHJcblx0XHJcblx0Ly8gTmV4dCBmbGlwIHRoZSBidXR0b24gbmFtZXNcclxuXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5idXR0b24uaW5uZXJIVE1MID0gdGhpcy5jYXRlZ29yaWVzW3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ubmFtZTtcclxuXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4K2Rpcl0uYnV0dG9uLmlubmVySFRNTCA9IHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXS5uYW1lO1xyXG5cdFxyXG5cdC8vIFRoZW4gZmxpcCB0aGUgYnV0dG9uc1xyXG5cdHRlbXAgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4K2Rpcl0uYnV0dG9uO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXS5idXR0b24gPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5idXR0b247XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYnV0dG9uID0gdGVtcDtcclxuXHRcclxuXHQvLyBUaGVuLCBmbGlwIHRoZSBib2FyZHNcclxuXHR0ZW1wID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleCtkaXJdO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXSA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdID0gdGVtcDtcclxuXHRcclxuXHQvLyBGaW5hbGx5LCBmbGlwIHRoZSBkYXRhIGluIHRoZSB4bWwgYW5kIHNhdmVcclxuXHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSk7XHJcblx0dmFyIGNhc2VGaWxlID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5jYXNlRmlsZSk7XHJcblx0dmFyIGxpc3QgPSBjYXNlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5TGlzdFwiKVswXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVsZW1lbnRcIik7XHJcblx0bGlzdFt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmlubmVySFRNTCA9IHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLm5hbWU7XHJcblx0bGlzdFt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXS5pbm5lckhUTUwgPSB0aGlzLmNhdGVnb3JpZXNbdGhpcy5hY3RpdmVCb2FyZEluZGV4K2Rpcl0ubmFtZTtcclxuXHR2YXIgY2F0cyA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIik7XHJcblx0Zm9yKHZhciBpPTA7aTxjYXRzLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYoTnVtYmVyKGNhdHNbaV0uZ2V0QXR0cmlidXRlKFwiY2F0ZWdvcnlEZXNpZ25hdGlvblwiKSk9PXRoaXMuYWN0aXZlQm9hcmRJbmRleClcclxuXHRcdFx0Y2F0c1tpXS5zZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIsIHRoaXMuYWN0aXZlQm9hcmRJbmRleCtkaXIpO1xyXG5cdFx0ZWxzZSBpZihOdW1iZXIoY2F0c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKT09dGhpcy5hY3RpdmVCb2FyZEluZGV4K2RpcilcclxuXHRcdFx0Y2F0c1tpXS5zZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIsIHRoaXMuYWN0aXZlQm9hcmRJbmRleCk7XHJcblx0fVxyXG5cdGNhc2VEYXRhLmNhc2VGaWxlID0gbmV3IFhNTFNlcmlhbGl6ZXIoKS5zZXJpYWxpemVUb1N0cmluZyhjYXNlRmlsZSk7XHJcblx0bG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddID0gSlNPTi5zdHJpbmdpZnkoY2FzZURhdGEpO1xyXG5cdFxyXG5cdFxyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrZGlyXS5idXR0b24uY2xhc3NOYW1lID0gXCJhY3RpdmVcIjtcclxuXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5idXR0b24uY2xhc3NOYW1lID0gXCJcIjtcclxuXHR0aGlzLmFjdGl2ZUJvYXJkSW5kZXggKz0gZGlyO1xyXG59XHJcblxyXG5wLmRlbGV0ZUNhdGVnb3J5ID0gZnVuY3Rpb24oKSB7XHJcblx0XHJcblx0Ly8gUmVtb3ZlIHRoZSBidXR0b24sIGJvYXJkLCBhbmQgY2F0IGZpcnN0XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0uYnV0dG9uLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0uYnV0dG9uKTtcclxuXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5jYW52YXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5jYW52YXMpO1xyXG5cdGZvcih2YXIgaT10aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTE7aT50aGlzLmFjdGl2ZUJvYXJkSW5kZXg7aS0tKXtcclxuXHRcdHRoaXMuYm9hcmRBcnJheVtpXS5idXR0b24gPSB0aGlzLmJvYXJkQXJyYXlbaS0xXS5idXR0b247XHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbaV0uYnV0dG9uLmlubmVySFRNTCA9IHRoaXMuY2F0ZWdvcmllc1tpXS5uYW1lO1xyXG5cdH1cclxuXHRmb3IodmFyIGk9dGhpcy5hY3RpdmVCb2FyZEluZGV4KzE7aTx0aGlzLmJvYXJkQXJyYXkubGVuZ3RoO2krKyl7XHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbaS0xXSA9IHRoaXMuYm9hcmRBcnJheVtpXTtcclxuXHRcdHRoaXMuY2F0ZWdvcmllc1tpLTFdID0gdGhpcy5jYXRlZ29yaWVzW2ldO1xyXG5cdH1cclxuXHR0aGlzLmJvYXJkQXJyYXkucG9wKCk7XHJcblx0dGhpcy5jYXRlZ29yaWVzLnBvcCgpO1xyXG5cdFxyXG5cdC8vIFRoZW4gcmVtb3ZlIGl0IGZyb20gdGhlIHhtbFxyXG5cdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddKTtcclxuXHR2YXIgY2FzZUZpbGUgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR2YXIgbGlzdCA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlMaXN0XCIpWzBdO1xyXG5cdGxpc3Quc2V0QXR0cmlidXRlKFwiY2F0ZWdvcnlDb3VudFwiLCB0aGlzLmNhdGVnb3JpZXMubGVuZ3RoKTtcclxuXHRsaXN0LnJlbW92ZUNoaWxkKGxpc3QuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbGVtZW50XCIpW3RoaXMuYWN0aXZlQm9hcmRJbmRleF0pO1xyXG5cdHZhciBjYXRzID0gY2FzZUZpbGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeVwiKTtcclxuXHRmb3IodmFyIGk9MDtpPGNhdHMubGVuZ3RoO2krKyl7XHJcblx0XHRpZihOdW1iZXIoY2F0c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKT09dGhpcy5hY3RpdmVCb2FyZEluZGV4KXtcclxuXHRcdFx0Y2F0c1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNhdHNbaV0pO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblx0Y2F0cyA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIik7XHJcblx0Zm9yKHZhciBpPTA7aTxjYXRzLmxlbmd0aDtpKyspXHJcblx0XHRpZihOdW1iZXIoY2F0c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKT50aGlzLmFjdGl2ZUJvYXJkSW5kZXgpXHJcblx0XHRcdGNhdHNbaV0uc2V0QXR0cmlidXRlKFwiY2F0ZWdvcnlEZXNpZ25hdGlvblwiLCB0aGlzLmFjdGl2ZUJvYXJkSW5kZXgtMSk7XHJcblx0Y2FzZURhdGEuY2FzZUZpbGUgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGNhc2VGaWxlKTtcclxuXHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcblx0XHJcblx0aWYodGhpcy5hY3RpdmVCb2FyZEluZGV4Pj10aGlzLmJvYXJkQXJyYXkubGVuZ3RoKVxyXG5cdFx0dGhpcy5hY3RpdmVCb2FyZEluZGV4ID0gdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmJ1dHRvbi5jbGFzc05hbWUgPSBcImFjdGl2ZVwiO1xyXG5cdHRoaXMubmV3Qm9hcmQgPSB0aGlzLmFjdGl2ZUJvYXJkSW5kZXg7XHJcblx0dGhpcy56b29tb3V0ID0gdHJ1ZTtcclxufVxyXG5cclxucC5jcmVhdGVMZXNzb25Ob2RlcyA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy5ib2FyZEFycmF5ID0gW107XHJcblx0dGhpcy5ib3R0b21CYXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJyt0aGlzLnNlY3Rpb24uaWQrJyAjYm90dG9tQmFyJyk7XHJcblx0dGhpcy5tb3VzZVN0YXRlID0gbmV3IE1vdXNlU3RhdGUoKTtcclxuXHRmb3IodmFyIGk9MDtpPHRoaXMuY2F0ZWdvcmllcy5sZW5ndGg7aSsrKVxyXG5cdFx0dGhpcy5jcmVhdGVCb2FyZCh0aGlzLmNhdGVnb3JpZXNbaV0sIGkpO1xyXG5cdFxyXG59XHJcblxyXG5wLmNyZWF0ZUJvYXJkID0gZnVuY3Rpb24oY2F0LCBudW0pe1xyXG5cdHRoaXMubGVzc29uTm9kZXMgPSBbXTtcclxuXHQvLyBhZGQgYSBub2RlIHBlciBxdWVzdGlvblxyXG5cdGZvciAodmFyIGogPSAwOyBqIDwgY2F0LnF1ZXN0aW9ucy5sZW5ndGg7IGorKykge1xyXG5cdFx0Ly8gY3JlYXRlIGEgbmV3IGxlc3NvbiBub2RlXHJcblx0XHR0aGlzLmxlc3Nvbk5vZGVzLnB1c2gobmV3IExlc3Nvbk5vZGUoIGNhdC5xdWVzdGlvbnNbal0gKSApO1xyXG5cdFx0Ly8gYXR0YWNoIHF1ZXN0aW9uIG9iamVjdCB0byBsZXNzb24gbm9kZVxyXG5cdFx0dGhpcy5sZXNzb25Ob2Rlc1t0aGlzLmxlc3Nvbk5vZGVzLmxlbmd0aC0xXS5xdWVzdGlvbiA9IGNhdC5xdWVzdGlvbnNbal07XHJcblx0XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgYSBib2FyZFxyXG5cdHRoaXMuYm9hcmRBcnJheVtudW1dID0gbmV3IEJvYXJkKHRoaXMuc2VjdGlvbiwgdGhpcy5ib2FyZENvbnRleHQsIHRoaXMubm9kZUNvbnRleHQsIHRoaXMubW91c2VTdGF0ZSwgbmV3IFBvaW50KENvbnN0YW50cy5ib2FyZFNpemUueC8yLCBDb25zdGFudHMuYm9hcmRTaXplLnkvMiksIHRoaXMubGVzc29uTm9kZXMsIHRoaXMuc2F2ZS5iaW5kKHRoaXMpKTtcclxuXHR2YXIgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkJVVFRPTlwiKTtcclxuXHRidXR0b24uaW5uZXJIVE1MID0gY2F0Lm5hbWU7XHJcblx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdGJ1dHRvbi5vbmNsaWNrID0gKGZ1bmN0aW9uKGkpeyBcclxuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYoZ2FtZS5hY3RpdmUpe1xyXG5cdFx0XHRcdGdhbWUuY2hhbmdlQm9hcmQoaSk7XHJcblx0XHRcdH1cclxuXHR9fSkobnVtKTtcclxuXHR0aGlzLmJvdHRvbUJhci5hcHBlbmRDaGlsZChidXR0b24pO1xyXG5cdHRoaXMuYm9hcmRBcnJheVtudW1dLmJ1dHRvbiA9IGJ1dHRvbjtcclxufVxyXG5cclxucC51cGRhdGUgPSBmdW5jdGlvbihkdCl7XHJcblxyXG4gICAgaWYodGhpcy5hY3RpdmUpe1xyXG4gICAgXHJcbiAgICBcdC8vIHBlcmZvcm0gZ2FtZSBhY3Rpb25zXHJcbiAgICBcdHRoaXMuYWN0KGR0KTtcclxuICAgIFx0XHJcblx0ICAgIC8vIGRyYXcgc3R1ZmZcclxuXHQgICAgdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uZHJhdyh0aGlzLnNjYWxlLCB0aGlzLm1vdXNlU3RhdGUpO1xyXG5cdCAgICBcclxuICAgIH1cclxuICAgIGVsc2UgaWYocGF1c2VkVGltZSE9MCAmJiB3aW5kb3dEaXYuaW5uZXJIVE1MPT0nJylcclxuICAgIFx0dGhpcy53aW5kb3dDbG9zZWQoKTtcclxuICAgIFxyXG59XHJcblxyXG5wLmFjdCA9IGZ1bmN0aW9uKGR0KXtcclxuXHJcbiAgICAvLyBVcGRhdGUgdGhlIG1vdXNlIHN0YXRlXHJcblx0dGhpcy5tb3VzZVN0YXRlLnVwZGF0ZShkdCwgdGhpcy5zY2FsZSp0aGlzLmdldFpvb20oKSk7XHJcblx0XHJcblx0LyppZiAodGhpcy5tb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0Ly9sb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9zYXZlXCIsRGF0YVBhcnNlci5jcmVhdGVYTUxTYXZlRmlsZSh0aGlzLmJvYXJkQXJyYXksIGZhbHNlKSk7XHJcblx0XHQvL2NvbnNvbGUubG9nKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b3NhdmVcIikpO1xyXG5cdH0qL1xyXG5cdFxyXG4gICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IGJvYXJkIChnaXZlIGl0IHRoZSBtb3VzZSBvbmx5IGlmIG5vdCB6b29taW5nKVxyXG4gICAgdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYWN0KHRoaXMuc2NhbGUsICh0aGlzLnpvb21vdXQgPyBudWxsIDogdGhpcy5tb3VzZVN0YXRlKSwgZHQpO1xyXG4gICAgXHJcbiAgICAvLyBDaGVjayBpZiBuZXcgYm9hcmQgYXZhaWxhYmxlXHJcbiAgICBpZih0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPCB0aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTEgJiZcclxuICAgIFx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4KzFdLmJ1dHRvbi5kaXNhYmxlZCAmJiBcclxuICAgIFx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5maW5pc2hlZCl7XHJcbiAgICBcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrMV0uYnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICB9XHJcblx0XHJcblxyXG5cdC8vIElmIHRoZSBuZWVkcyB0byB6b29tIG91dCB0byBjZW50ZXJcclxuXHRpZih0aGlzLnpvb21vdXQpe1xyXG5cdFx0XHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHRcdHZhciBib2FyZCA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHJcblx0XHQvLyBab29tIG91dCBhbmQgbW92ZSB0b3dhcmRzIGNlbnRlclxyXG5cdFx0aWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0Ym9hcmQuem9vbSAtPSBkdCpDb25zdGFudHMuem9vbVNwZWVkO1xyXG5cdFx0ZWxzZSBpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuc3RhcnRab29tKVxyXG5cdFx0XHRib2FyZC56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuXHRcdGJvYXJkLm1vdmVUb3dhcmRzKG5ldyBQb2ludChDb25zdGFudHMuYm9hcmRTaXplLngvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpLCBkdCwgQ29uc3RhbnRzLnpvb21Nb3ZlU3BlZWQpO1xyXG5cdFx0XHJcblx0XHQvLyBVcGRhdGUgdGhlIHpvb20gc2xpZGVyXHJcblx0XHR6b29tU2xpZGVyLnZhbHVlID0gLXRoaXMuZ2V0Wm9vbSgpO1xyXG5cdFx0XHJcblx0XHQvLyBJZiBmdWxseSB6b29tZWQgb3V0IGFuZCBpbiBjZW50ZXIgc3RvcFxyXG5cdFx0aWYodGhpcy5nZXRab29tKCk9PUNvbnN0YW50cy5zdGFydFpvb20gJiYgYm9hcmQuYm9hcmRPZmZzZXQueD09Q29uc3RhbnRzLmJvYXJkU2l6ZS54LzIgJiYgYm9hcmQuYm9hcmRPZmZzZXQueT09Q29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpe1x0XHRcdFx0XHJcblx0XHRcdHRoaXMuem9vbW91dCA9IGZhbHNlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgY2hhbmdpbmcgYm9hcmQgc3RhcnQgdGhhdCBwcm9jZXNzXHJcblx0XHRcdGlmKHRoaXMubmV3Qm9hcmQhPW51bGwpe1xyXG5cdFx0XHRcdHZhciBkaXIgPSB0aGlzLm5ld0JvYXJkIDwgdGhpcy5hY3RpdmVCb2FyZEluZGV4O1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmhpZGUoZGlyKTtcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPSB0aGlzLm5ld0JvYXJkO1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnNob3coZGlyKTtcclxuXHRcdFx0XHR6b29tU2xpZGVyLnZhbHVlID0gLXRoaXMuZ2V0Wm9vbSgpO1xyXG5cdFx0XHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcblx0XHRcdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmxvYWRlZCA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRnYW1lLmFjdGl2ZSA9IHRydWU7XHJcblx0XHRcdFx0XHRnYW1lLm5ld0JvYXJkID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZXsgLy8gT25seSBoYW5kbGUgem9vbWluZyBpZiBub3QgcGVyZm9ybWluZyBhbmltYXRpb24gem9vbVxyXG5cdFxyXG5cdFx0Ly8gSGFuZGxlIHBpbmNoIHpvb21cclxuXHQgICAgaWYodGhpcy5tb3VzZVN0YXRlLnpvb21EaWZmIT0wKXtcclxuXHQgICAgXHR6b29tU2xpZGVyLnZhbHVlID0gcGluY2hTdGFydCArIHRoaXMubW91c2VTdGF0ZS56b29tRGlmZiAqIENvbnN0YW50cy5waW5jaFNwZWVkO1xyXG5cdCAgICBcdHRoaXMudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdCAgICB9XHJcblx0ICAgIGVsc2VcclxuXHQgICAgXHRwaW5jaFN0YXJ0ID0gTnVtYmVyKHpvb21TbGlkZXIudmFsdWUpO1xyXG5cdCAgICBcclxuXHQgICAgLy8gSGFuZGxlIG1vdXNlIHpvb21cclxuXHQgICAgaWYodGhpcy5tb3VzZVN0YXRlLm1vdXNlV2hlZWxEWSE9MClcclxuXHQgICAgXHR0aGlzLnpvb20odGhpcy5tb3VzZVN0YXRlLm1vdXNlV2hlZWxEWTwwKTtcclxuXHR9XHJcblxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBpZiBzaG91bGQgcGF1c2VcclxuICAgIGlmKHdpbmRvd0Rpdi5pbm5lckhUTUwhPScnICYmIHBhdXNlZFRpbWUrKz4zKXtcclxuICAgIFx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcclxuICAgIFx0d2luZG93RGl2LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgXHR3aW5kb3dGaWxtLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgfVxyXG4gICAgXHJcbn1cclxuXHJcbnAuZ2V0Wm9vbSA9IGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJuIHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb207XHJcbn1cclxuXHJcbnAuc2V0Wm9vbSA9IGZ1bmN0aW9uKHpvb20pe1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb20gPSB6b29tO1xyXG59XHJcblxyXG5wLnpvb20gPSBmdW5jdGlvbihkaXIpe1xyXG5cdGlmKGRpcilcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG4gICAgZWxzZVxyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBVcCgpO1xyXG5cdHRoaXMuc2V0Wm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7XHJcbn1cclxuXHJcbnAuc2V0U2NhbGUgPSBmdW5jdGlvbihzY2FsZSl7XHJcblx0Zm9yKHZhciBpPTA7aTx0aGlzLmJvYXJkQXJyYXkubGVuZ3RoO2krKylcclxuXHRcdHRoaXMuYm9hcmRBcnJheVtpXS51cGRhdGVTaXplKCk7XHJcblx0dGhpcy5zY2FsZSA9IHNjYWxlO1xyXG59XHJcblxyXG5wLmNoYW5nZUJvYXJkID0gZnVuY3Rpb24obnVtKXtcclxuXHRpZihudW0hPXRoaXMuYWN0aXZlQm9hcmRJbmRleCl7XHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbbnVtXS5idXR0b24uY2xhc3NOYW1lID0gXCJhY3RpdmVcIjtcclxuXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmJ1dHRvbi5jbGFzc05hbWUgPSBcIlwiO1xyXG5cdFx0dGhpcy5uZXdCb2FyZCA9IG51bTtcclxuXHRcdHRoaXMuem9vbW91dCA9IHRydWU7XHJcblx0fVxyXG59XHJcblxyXG5wLndpbmRvd0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFxyXG5cdC8vIFVucGF1c2UgdGhlIGdhbWUgYW5kIGZ1bGx5IGNsb3NlIHRoZSB3aW5kb3dcclxuXHRwYXVzZWRUaW1lID0gMDtcclxuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XHJcblx0d2luZG93RGl2LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0d2luZG93RmlsbS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFxyXG5cdHZhciBzYXZlID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ud2luZG93Q2xvc2VkKCk7XHJcblx0XHJcblx0aWYoc2F2ZSl7XHJcblx0XHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSk7XHJcblx0XHR2YXIgY2FzZUZpbGUgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHRcdGlmKHNhdmUueG1sKXtcclxuXHRcdFx0dmFyIGNhdCA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYXRlZ29yeScpW3RoaXMuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRcdGNhdC5yZXBsYWNlQ2hpbGQoc2F2ZS54bWwsIGNhdC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYnV0dG9uJylbc2F2ZS5udW1dKTtcclxuXHRcdFx0Y2FzZURhdGEuY2FzZUZpbGUgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGNhc2VGaWxlKTtcclxuXHRcdFx0bG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddID0gSlNPTi5zdHJpbmdpZnkoY2FzZURhdGEpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0dGhpcy5jYXRlZ29yaWVzW3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ucXVlc3Rpb25zW3NhdmUubnVtXS54bWwgPSBjYXNlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2F0ZWdvcnknKVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdidXR0b24nKVtzYXZlLm51bV07XHJcblx0XHRcdHRoaXMuY2F0ZWdvcmllc1t0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnF1ZXN0aW9uc1tzYXZlLm51bV0ucmVmcmVzaCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHR0aGlzLnNhdmUoKTtcclxuXHRcclxufVxyXG5cclxucC5zYXZlID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHR2YXIgbGVzc29uTm9kZXMgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5sZXNzb25Ob2RlQXJyYXk7XHJcblx0Zm9yKHZhciBpPTA7aTxsZXNzb25Ob2Rlcy5sZW5ndGg7aSsrKVxyXG5cdFx0bGVzc29uTm9kZXNbaV0uc2F2ZSgpO1xyXG5cdFxyXG5cdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddKTtcclxuXHR2YXIgY2FzZUZpbGUgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR2YXIgY2FzZU5vZGUgPSBjYXNlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF07XHJcblx0dmFyIGNhdCA9IGNhc2VOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIilbMF07XHJcblx0d2hpbGUoY2F0KXtcclxuXHRcdGNhc2VOb2RlLnJlbW92ZUNoaWxkKGNhdCk7XHJcblx0XHRjYXQgPSBjYXNlTm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5XCIpWzBdO1xyXG5cdH1cclxuXHRmb3IodmFyIGk9MDtpPHRoaXMuY2F0ZWdvcmllcy5sZW5ndGg7aSsrKVxyXG5cdFx0Y2FzZU5vZGUuYXBwZW5kQ2hpbGQodGhpcy5jYXRlZ29yaWVzW2ldLnhtbChjYXNlRmlsZSwgaSkpO1xyXG5cdGNhc2VEYXRhLmNhc2VGaWxlID0gbmV3IFhNTFNlcmlhbGl6ZXIoKS5zZXJpYWxpemVUb1N0cmluZyhjYXNlRmlsZSk7XHJcblx0bG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddID0gSlNPTi5zdHJpbmdpZnkoY2FzZURhdGEpO1xyXG5cdGNvbnNvbGUubG9nKGNhc2VGaWxlKTtcclxuXHRjb25zb2xlLmxvZyhjYXNlTm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5XCIpLmxlbmd0aCk7XHJcblx0XHJcbn1cclxuXHJcbnAuYWRkUXVlc3Rpb24gPSBmdW5jdGlvbih4LCB5KXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIGNhc2UgdG8gYWRkIHRoZSBxdWVzdGlvblxyXG5cdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddKTtcclxuXHR2YXIgY2FzZUZpbGUgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR2YXIgbmV3UXVlc3Rpb24gPSBjYXNlRmlsZS5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ3hQb3NpdGlvblBlcmNlbnQnLCB4KTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ3lQb3NpdGlvblBlcmNlbnQnLCB5KTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ3NjYWxlJywgJzEnKTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ251bUNvbm5lY3Rpb25zJywgJzAnKTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ251bUFuc3dlcnMnLCAnMycpO1xyXG5cdG5ld1F1ZXN0aW9uLnNldEF0dHJpYnV0ZSgnY29ycmVjdEFuc3dlcicsICcwJyk7XHJcblx0bmV3UXVlc3Rpb24uc2V0QXR0cmlidXRlKCdpbWFnZUxpbmsnLCAnaHR0cHM6Ly9pLmd5YXpvLmNvbS9lYjE4MzJhODBmYTQxZTM5NTQ5MTU3MWQ0OTMwMTE5Yi5wbmcnKTtcclxuXHRuZXdRdWVzdGlvbi5zZXRBdHRyaWJ1dGUoJ3JldmVhbFRocmVzaG9sZCcsICcwJyk7XHJcblx0bmV3UXVlc3Rpb24uc2V0QXR0cmlidXRlKCdxdWVzdGlvblR5cGUnLCAnMicpO1xyXG5cdG5ld1F1ZXN0aW9uLnNldEF0dHJpYnV0ZSgncmVzb3VyY2VDb3VudCcsICcwJyk7XHJcblx0bmV3UXVlc3Rpb24uYXBwZW5kQ2hpbGQoY2FzZUZpbGUuY3JlYXRlRWxlbWVudCgncXVlc3Rpb25OYW1lJykpO1xyXG5cdG5ld1F1ZXN0aW9uLmFwcGVuZENoaWxkKGNhc2VGaWxlLmNyZWF0ZUVsZW1lbnQoJ2luc3RydWN0aW9ucycpKTtcclxuXHRuZXdRdWVzdGlvbi5hcHBlbmRDaGlsZChjYXNlRmlsZS5jcmVhdGVFbGVtZW50KCdxdWVzdGlvblRleHQnKSk7XHJcblx0bmV3UXVlc3Rpb24uYXBwZW5kQ2hpbGQoY2FzZUZpbGUuY3JlYXRlRWxlbWVudCgnYW5zd2VyJykpO1xyXG5cdG5ld1F1ZXN0aW9uLmFwcGVuZENoaWxkKGNhc2VGaWxlLmNyZWF0ZUVsZW1lbnQoJ2Fuc3dlcicpKTtcclxuXHRuZXdRdWVzdGlvbi5hcHBlbmRDaGlsZChjYXNlRmlsZS5jcmVhdGVFbGVtZW50KCdhbnN3ZXInKSk7XHJcblx0bmV3UXVlc3Rpb24uYXBwZW5kQ2hpbGQoY2FzZUZpbGUuY3JlYXRlRWxlbWVudCgnZmVlZGJhY2snKSk7XHJcblx0bmV3UXVlc3Rpb24uYXBwZW5kQ2hpbGQoY2FzZUZpbGUuY3JlYXRlRWxlbWVudCgnZmVlZGJhY2snKSk7XHJcblx0bmV3UXVlc3Rpb24uYXBwZW5kQ2hpbGQoY2FzZUZpbGUuY3JlYXRlRWxlbWVudCgnZmVlZGJhY2snKSk7XHJcblx0dmFyIGNhdHMgPSBjYXNlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2F0ZWdvcnknKTtcclxuXHRmb3IodmFyIGk9MDtpPGNhdHMubGVuZ3RoO2krKyl7XHJcblx0XHRpZihOdW1iZXIoY2F0c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKT09dGhpcy5hY3RpdmVCb2FyZEluZGV4KVxyXG5cdFx0e1xyXG5cdFx0XHRjYXRzW2ldLmFwcGVuZENoaWxkKG5ld1F1ZXN0aW9uKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHZhciBxdWVzdGlvbiA9IG5ldyBRdWVzdGlvbihuZXdRdWVzdGlvbiwgdGhpcy5yZXNvdXJjZXMsIHdpbmRvd0RpdiwgdGhpcy5jYXRlZ29yaWVzW3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ucXVlc3Rpb25zLmxlbmd0aCk7XHJcblx0dGhpcy5jYXRlZ29yaWVzW3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ucXVlc3Rpb25zLnB1c2gocXVlc3Rpb24pO1xyXG5cdHZhciBsZXNzb25Ob2RlcyA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmxlc3Nvbk5vZGVBcnJheTtcclxuXHRsZXNzb25Ob2Rlcy5wdXNoKG5ldyBMZXNzb25Ob2RlKCBxdWVzdGlvbiApICk7XHJcblx0Ly8gYXR0YWNoIHF1ZXN0aW9uIG9iamVjdCB0byBsZXNzb24gbm9kZVxyXG5cdGxlc3Nvbk5vZGVzW2xlc3Nvbk5vZGVzLmxlbmd0aC0xXS5xdWVzdGlvbiA9IHF1ZXN0aW9uO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmxlc3Nvbk5vZGVBcnJheSA9IGxlc3Nvbk5vZGVzO1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIGNoYW5nZXMgdG8gbG9jYWwgc3RvcmFnZVxyXG5cdHRoaXMuc2F2ZSgpO1xyXG5cdFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoJy4uL2hlbHBlci9kcmF3TGliLmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuLi9jYXNlL3F1ZXN0aW9uLmpzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY29uc3RhbnRzLmpzXCIpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9oZWxwZXIvcG9pbnQuanMnKTtcclxuXHJcbnZhciBDSEVDS19JTUFHRSA9IFwiLi4vaW1nL2ljb25Qb3N0SXRDaGVjay5wbmdcIjtcclxuXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIGxlc3Nvbk5vZGUocFF1ZXN0aW9uKXtcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBQb2ludChwUXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WC8xMDAqQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCBwUXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WS8xMDAqQ29uc3RhbnRzLmJvYXJkU2l6ZS55KTtcclxuICAgIHRoaXMuZHJhZ0xvY2F0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMudHlwZSA9IFwibGVzc29uTm9kZVwiO1xyXG4gICAgdGhpcy5pbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy5jaGVjayA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy53aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5xdWVzdGlvbiA9IHBRdWVzdGlvbjtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSAwO1xyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSAwO1xyXG4gICAgdGhpcy5saW5lUGVyY2VudCA9IDA7XHJcbiAgICBcclxuICAgIC8vIHNraXAgYW5pbWF0aW9ucyBmb3Igc29sdmVkXHJcbiAgICBpZiAocFF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIHRoaXMubGluZVBlcmNlbnQgPSAxO1xyXG4gICAgXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAvL2ltYWdlIGxvYWRpbmcgYW5kIHJlc2l6aW5nXHJcbiAgICB0aGlzLmltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoYXQud2lkdGggPSB0aGF0LmltYWdlLm5hdHVyYWxXaWR0aDtcclxuICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaW1hZ2UubmF0dXJhbEhlaWdodDtcclxuICAgICAgICB2YXIgbWF4RGltZW5zaW9uID0gQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzEwO1xyXG4gICAgICAgIC8vdG9vIHNtYWxsP1xyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPCBtYXhEaW1lbnNpb24gJiYgdGhhdC5oZWlnaHQgPCBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSBtYXhEaW1lbnNpb24gLyB0aGF0LndpZHRoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggKiB4ICogdGhhdC5xdWVzdGlvbi5zY2FsZTtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAqIHggKiB0aGF0LnF1ZXN0aW9uLnNjYWxlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGF0LndpZHRoID4gbWF4RGltZW5zaW9uIHx8IHRoYXQuaGVpZ2h0ID4gbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC53aWR0aCAvIG1heERpbWVuc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IHRoYXQuaGVpZ2h0IC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoIC8geCAqIHRoYXQucXVlc3Rpb24uc2NhbGU7XHJcbiAgICAgICAgICAgIHRoYXQuaGVpZ2h0ID0gdGhhdC5oZWlnaHQgLyB4ICogdGhhdC5xdWVzdGlvbi5zY2FsZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IHRoaXMucXVlc3Rpb24uaW1hZ2VMaW5rO1xyXG4gICAgdGhpcy5jaGVjay5zcmMgPSBDSEVDS19JTUFHRTtcclxufVxyXG5cclxudmFyIHAgPSBsZXNzb25Ob2RlLnByb3RvdHlwZTtcclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzKXtcclxuXHJcbiAgICAvL2xlc3Nvbk5vZGUuZHJhd0xpYi5jaXJjbGUoY3R4LCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgMTAsIFwicmVkXCIpO1xyXG4gICAgLy9kcmF3IHRoZSBpbWFnZSwgc2hhZG93IGlmIGhvdmVyZWRcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBpZih0aGlzLmRyYWdnaW5nKSB7XHJcbiAgICBcdGN0eC5zaGFkb3dDb2xvciA9ICd5ZWxsb3cnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLXdlYmtpdC1ncmFiYmluZyc7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy1tb3otZ3JhYmJpbmcnO1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKHRoaXMubW91c2VPdmVyKXtcclxuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnZG9kZ2VyQmx1ZSc7XHJcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSA1O1xyXG4gICAgICAgIGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICB9XHJcbiAgICAvL2RyYXdpbmcgdGhlIGJ1dHRvbiBpbWFnZVxyXG4gICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgIFxyXG4gICAgLy9kcmF3aW5nIHRoZSBwaW5cclxuXHRjdHguZmlsbFN0eWxlID0gXCJibHVlXCI7XHJcblx0Y3R4LnN0cm9rZVN0eWxlID0gXCJjeWFuXCI7XHJcblx0dmFyIHNtYWxsZXIgPSB0aGlzLndpZHRoIDwgdGhpcy5oZWlnaHQgPyB0aGlzLndpZHRoIDogdGhpcy5oZWlnaHQ7XHJcblx0Y3R4LmxpbmVXaWR0aCA9IHNtYWxsZXIvMzI7XHJcblxyXG5cdGN0eC5iZWdpblBhdGgoKTtcclxuXHR2YXIgbm9kZVBvaW50ID0gdGhpcy5nZXROb2RlUG9pbnQoKTtcclxuXHRjdHguYXJjKG5vZGVQb2ludC54LCBub2RlUG9pbnQueSwgc21hbGxlciozLzMyLCAwLCAyKk1hdGguUEkpO1xyXG5cdGN0eC5jbG9zZVBhdGgoKTtcclxuXHRjdHguZmlsbCgpO1xyXG5cdGN0eC5zdHJva2UoKTtcclxuICAgIFxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbnAuZ2V0Tm9kZVBvaW50ID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgc21hbGxlciA9IHRoaXMud2lkdGggPCB0aGlzLmhlaWdodCA/IHRoaXMud2lkdGggOiB0aGlzLmhlaWdodDtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMucG9zaXRpb24ueCAtIHRoaXMud2lkdGgvMiArIHNtYWxsZXIqMy8xNiwgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5oZWlnaHQvMiArIHNtYWxsZXIqMy8xNik7XHJcbn1cclxuXHJcbnAuY2xpY2sgPSBmdW5jdGlvbihtb3VzZVN0YXRlKXtcclxuICAgIHRoaXMucXVlc3Rpb24uZGlzcGxheVdpbmRvd3MoKTtcclxufVxyXG5cclxucC51cGRhdGVJbWFnZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IHRoaXMucXVlc3Rpb24uaW1hZ2VMaW5rO1xyXG59XHJcblxyXG5wLnNhdmUgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WCA9IHRoaXMucG9zaXRpb24ueC9Db25zdGFudHMuYm9hcmRTaXplLngqMTAwO1xyXG5cdHRoaXMucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WSA9IHRoaXMucG9zaXRpb24ueS9Db25zdGFudHMuYm9hcmRTaXplLnkqMTAwO1xyXG5cdHRoaXMucXVlc3Rpb24uc2F2ZVhNTCgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGxlc3Nvbk5vZGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vL01vZHVsZSBleHBvcnRcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHJcbm0uY2xlYXIgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgpIHtcclxuICAgIGN0eC5jbGVhclJlY3QoeCwgeSwgdywgaCk7XHJcbn1cclxuXHJcbm0ucmVjdCA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCwgY29sLCBjZW50ZXJPcmlnaW4pIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sO1xyXG4gICAgaWYoY2VudGVyT3JpZ2luKXtcclxuICAgICAgICBjdHguZmlsbFJlY3QoeCAtICh3IC8gMiksIHkgLSAoaCAvIDIpLCB3LCBoKTtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5zdHJva2VSZWN0ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoLCBsaW5lLCBjb2wsIGNlbnRlck9yaWdpbikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbDtcclxuICAgIGN0eC5saW5lV2lkdGggPSBsaW5lO1xyXG4gICAgaWYoY2VudGVyT3JpZ2luKXtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCh4IC0gKHcgLyAyKSwgeSAtIChoIC8gMiksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCh4LCB5LCB3LCBoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0ubGluZSA9IGZ1bmN0aW9uKGN0eCwgeDEsIHkxLCB4MiwgeTIsIHRoaWNrbmVzcywgY29sb3IpIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHgubW92ZVRvKHgxLCB5MSk7XHJcbiAgICBjdHgubGluZVRvKHgyLCB5Mik7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpY2tuZXNzO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLmNpcmNsZSA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgcmFkaXVzLCBjb2xvcil7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LHksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG4vLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzgwODgyNi9kcmF3LWFycm93LW9uLWNhbnZhcy10YWcgXHJcbm0uYXJyb3cgPSBmdW5jdGlvbihjdHgsIHN0YXJ0LCBlbmQsIGhlYWRsZW4sIHRoaWNrbmVzcywgY29sb3Ipe1xyXG5cclxuICAgIHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZW5kLnktc3RhcnQueSwgZW5kLngtc3RhcnQueCk7XHJcblx0XHJcbiAgICBjdHguc2F2ZSgpO1xyXG5cdGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oc3RhcnQueCwgc3RhcnQueSk7XHJcbiAgICBjdHgubGluZVRvKGVuZC54LCBlbmQueSk7XHJcbiAgICBjdHgubGluZVRvKGVuZC54LWhlYWRsZW4qTWF0aC5jb3MoYW5nbGUtTWF0aC5QSS82KSwgZW5kLnktaGVhZGxlbipNYXRoLnNpbihhbmdsZS1NYXRoLlBJLzYpKTtcclxuICAgIGN0eC5tb3ZlVG8oZW5kLngsIGVuZC55KTtcclxuICAgIGN0eC5saW5lVG8oZW5kLngtaGVhZGxlbipNYXRoLmNvcyhhbmdsZStNYXRoLlBJLzYpLCBlbmQueS1oZWFkbGVuKk1hdGguc2luKGFuZ2xlK01hdGguUEkvNikpXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpY2tuZXNzO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib2FyZEJ1dHRvbihjdHgsIHBvc2l0aW9uLCB3aWR0aCwgaGVpZ2h0LCBob3ZlcmVkKXtcclxuICAgIC8vY3R4LnNhdmUoKTtcclxuICAgIGlmKGhvdmVyZWQpe1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImRvZGdlcmJsdWVcIjtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwibGlnaHRibHVlXCI7XHJcbiAgICB9XHJcbiAgICAvL2RyYXcgcm91bmRlZCBjb250YWluZXJcclxuICAgIGN0eC5yZWN0KHBvc2l0aW9uLnggLSB3aWR0aC8yLCBwb3NpdGlvbi55IC0gaGVpZ2h0LzIsIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDU7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgLy9jdHgucmVzdG9yZSgpO1xyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoXCIuLi9jYXNlL2NhdGVnb3J5LmpzXCIpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKFwiLi4vY2FzZS9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgUGFyc2VyID0gcmVxdWlyZSgnLi9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG5cclxuLy8gTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxuLy8gKioqKioqKioqKioqKioqKioqKioqKiBMT0FESU5HICoqKioqKioqKioqKioqKioqKioqKioqKlxyXG5cclxuLy8gbG9hZCB0aGUgZmlsZSBlbnRyeSBhbmQgcGFyc2UgdGhlIHhtbFxyXG5tLmxvYWRDYXNlID0gZnVuY3Rpb24oY2FzZURhdGEsIHdpbmRvd0Rpdikge1xyXG4gICAgXHJcbiAgICB0aGlzLmNhdGVnb3JpZXMgPSBbXTtcclxuICAgIHRoaXMucXVlc3Rpb25zID0gW107XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB4bWwgZGF0YVxyXG5cdHZhciB4bWxEYXRhID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5jYXNlRmlsZSk7XHJcblx0dmFyIHJlc291cmNlcyA9IFBhcnNlci5nZXRSZXNvdXJjZXMoeG1sRGF0YSk7XHJcblx0dmFyIGNhdGVnb3JpZXMgPSBQYXJzZXIuZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyh4bWxEYXRhLCByZXNvdXJjZXMsIHdpbmRvd0Rpdik7XHJcblx0XHJcblx0Ly8gbG9hZCB0aGUgbW9zdCByZWNlbnQgcHJvZ3Jlc3MgZnJvbSBzYXZlRmlsZS5pcGFyZGF0YVxyXG5cdHZhciBxdWVzdGlvbnMgPSBbXTtcclxuICAgIFxyXG5cdC8vIEdldCB0aGUgc2F2ZSBkYXRhXHJcblx0dmFyIHNhdmVEYXRhID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5zYXZlRmlsZSk7XHJcblx0Ly8gYWxlcnQgdXNlciBpZiB0aGVyZSBpcyBhbiBlcnJvclxyXG5cdGlmICghc2F2ZURhdGEpIHsgYWxlcnQgKFwiRVJST1Igbm8gc2F2ZSBkYXRhIGZvdW5kLCBvciBzYXZlIGRhdGEgd2FzIHVucmVhZGFibGVcIik7IHJldHVybjsgfVxyXG5cdC8vIHByb2dyZXNzXHJcblx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0XHJcblx0Ly8gcGFyc2UgdGhlIHNhdmUgZGF0YSBpZiBub3QgbmV3XHJcblx0aWYoc3RhZ2U+MCl7XHJcblx0XHRmb3IodmFyIGZpbGUgaW4gY2FzZURhdGEuc3VibWl0dGVkKXtcclxuXHRcdFx0aWYgKCFjYXNlRGF0YS5zdWJtaXR0ZWQuaGFzT3duUHJvcGVydHkoZmlsZSkpIGNvbnRpbnVlO1xyXG5cdFx0XHRmaWxlID0gZmlsZS5zdWJzdHIoZmlsZS5sYXN0SW5kZXhPZihcIi9cIikrMSk7XHJcblx0XHRcdHZhciBjYXQgPSBmaWxlLmluZGV4T2YoXCItXCIpLFxyXG5cdFx0XHRcdHF1ZSA9IGZpbGUuaW5kZXhPZihcIi1cIiwgY2F0KzEpLFxyXG5cdFx0XHRcdGZpbCA9IGZpbGUuaW5kZXhPZihcIi1cIiwgcXVlKzEpO1xyXG5cdFx0XHRjYXRlZ29yaWVzW051bWJlcihmaWxlLnN1YnN0cigwLCBjYXQpKV0uXHJcblx0XHRcdFx0cXVlc3Rpb25zW051bWJlcihmaWxlLnN1YnN0cihjYXQrMSwgcXVlLWNhdC0xKSldLlxyXG5cdFx0XHRcdGZpbGVzW051bWJlcihmaWxlLnN1YnN0cihxdWUrMSwgZmlsLXF1ZS0xKSldID0gXHJcblx0XHRcdFx0XHRmaWxlLnN1YnN0cihmaWxlLmluZGV4T2ZBdChcIi1cIiwgMykrMSk7XHJcblx0XHR9XHJcblx0XHRQYXJzZXIuYXNzaWduUXVlc3Rpb25TdGF0ZXMoY2F0ZWdvcmllcywgc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblwiKSk7XHJcblx0fVxyXG5cdGVsc2VcclxuXHRcdHN0YWdlID0gMTtcclxuXHRcclxuXHQvLyByZXR1cm4gcmVzdWx0c1xyXG5cdHJldHVybiB7Y2F0ZWdvcmllczogY2F0ZWdvcmllcywgY2F0ZWdvcnk6c3RhZ2UtMSwgcmVzb3VyY2VzOnJlc291cmNlc307IC8vIG1heWJlIHN0YWdlICsgMSB3b3VsZCBiZSBiZXR0ZXIgYmVjYXVzZSB0aGV5IGFyZSBub3QgemVybyBpbmRleGVkP1xyXG5cdFx0XHQgICBcclxufVxyXG5cdFx0XHRcdFx0IFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIFNBVklORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8qIGhlcmUncyB0aGUgZ2VuZXJhbCBvdXRsaW5lIG9mIHdoYXQgaXMgaGFwcGVuaW5nOlxyXG5zZWxlY3RTYXZlTG9jYXRpb24gd2FzIHRoZSBvbGQgd2F5IG9mIGRvaW5nIHRoaW5nc1xyXG5ub3cgd2UgdXNlIGNyZWF0ZVppcFxyXG4gLSB3aGVuIHRoaXMgd2hvbGUgdGhpbmcgc3RhcnRzLCB3ZSByZXF1ZXN0IGEgZmlsZSBzeXN0ZW0gYW5kIHNhdmUgYWxsIHRoZSBlbnRyaWVzIChkaXJlY3RvcmllcyBhbmQgZmlsZXMpIHRvIHRoZSBhbGxFbnRyaWVzIHZhcmlhYmxlXHJcbiAtIHRoZW4gd2UgZ2V0IHRoZSBibG9icyB1c2luZyByZWFkQXNCaW5hcnlTdHJpbmcgYW5kIHN0b3JlIHRob3NlIGluIGFuIGFycmF5IHdoZW4gd2UgYXJlIHNhdmluZyBcclxuICAtIC0gY291bGQgZG8gdGhhdCBvbiBwYWdlIGxvYWQgdG8gc2F2ZSB0aW1lIGxhdGVyLi4/XHJcbiAtIGFueXdheSwgdGhlbiB3ZSAtIGluIHRoZW9yeSAtIHRha2UgdGhlIGJsb2JzIGFuZCB1c2UgemlwLmZpbGUoZW50cnkubmFtZSwgYmxvYikgdG8gcmVjcmVhdGUgdGhlIHN0cnVjdHVyZVxyXG4gLSBhbmQgZmluYWxseSB3ZSBkb3dubG9hZCB0aGUgemlwIHdpdGggZG93bmxvYWQoKVxyXG4gXHJcbiovXHJcblxyXG4vLyBjYWxsZWQgd2hlbiB0aGUgZ2FtZSBpcyBsb2FkZWQsIGFkZCBvbmNsaWNrIHRvIHNhdmUgYnV0dG9uIHRoYXQgYWN0dWFsbHkgZG9lcyB0aGUgc2F2aW5nXHJcbm0ucHJlcGFyZVppcCA9IGZ1bmN0aW9uKHNhdmVCdXR0b24pIHtcclxuXHQvL3ZhciBjb250ZW50ID0gemlwLmdlbmVyYXRlKCk7XHJcblx0XHJcblx0Ly9jb25zb2xlLmxvZyhcInByZXBhcmUgemlwXCIpO1xyXG5cdFxyXG5cdC8vIGNvZGUgZnJvbSBKU1ppcCBzaXRlXHJcblx0aWYgKEpTWmlwLnN1cHBvcnQuYmxvYikge1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhcInN1cHBvcnRzIGJsb2JcIik7XHJcblx0XHRcclxuXHRcdC8vIGxpbmsgZG93bmxvYWQgdG8gY2xpY2tcclxuXHRcdHNhdmVCdXR0b24ub25jbGljayA9IHNhdmVJUEFSO1xyXG4gIFx0fVxyXG59XHJcblxyXG4vLyBjcmVhdGUgSVBBUiBmaWxlIGFuZCBkb3dubG9hZCBpdFxyXG5mdW5jdGlvbiBzYXZlSVBBUigpIHtcclxuXHRcclxuXHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSk7XHJcblx0XHJcblx0dmFyIHppcCA9IG5ldyBKU1ppcCgpO1xyXG5cdHppcC5maWxlKFwiY2FzZUZpbGUuaXBhcmRhdGFcIiwgY2FzZURhdGEuY2FzZUZpbGUpO1xyXG5cdHppcC5maWxlKFwic2F2ZUZpbGUuaXBhcmRhdGFcIiwgY2FzZURhdGEuc2F2ZUZpbGUpO1xyXG5cdHZhciBzdWJtaXR0ZWQgPSB6aXAuZm9sZGVyKCdzdWJtaXR0ZWQnKTtcclxuXHRjb25zb2xlLmxvZyhjYXNlRGF0YS5zdWJtaXR0ZWQpO1xyXG5cdGZvciAodmFyIGZpbGUgaW4gY2FzZURhdGEuc3VibWl0dGVkKSB7XHJcblx0XHRpZiAoIWNhc2VEYXRhLnN1Ym1pdHRlZC5oYXNPd25Qcm9wZXJ0eShmaWxlKSkgY29udGludWU7XHJcblx0XHR2YXIgc3RhcnQgPSBjYXNlRGF0YS5zdWJtaXR0ZWRbZmlsZV0uaW5kZXhPZihcImJhc2U2NCxcIikrXCJiYXNlNjQsXCIubGVuZ3RoO1xyXG5cdFx0c3VibWl0dGVkLmZpbGUoZmlsZSwgY2FzZURhdGEuc3VibWl0dGVkW2ZpbGVdLnN1YnN0cihzdGFydCksIHtiYXNlNjQ6IHRydWV9KTtcclxuXHR9XHJcblxyXG5cdFxyXG5cdHppcC5nZW5lcmF0ZUFzeW5jKHt0eXBlOlwiYmFzZTY0XCJ9KS50aGVuKGZ1bmN0aW9uIChiYXNlNjQpIHtcclxuXHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcblx0XHRhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRhLmhyZWYgPSBcImRhdGE6YXBwbGljYXRpb24vemlwO2Jhc2U2NCxcIiArIGJhc2U2NDtcclxuXHRcdGEuZG93bmxvYWQgPSBsb2NhbFN0b3JhZ2VbJ2Nhc2VOYW1lJ107XHJcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xyXG5cdFx0YS5jbGljaygpO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcclxuXHR9KTtcclxuXHRcclxufVxyXG5cclxuLyoqKioqKioqKioqKioqKioqIENBQ0hJTkcgKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbm0ucmVtb3ZlRmlsZXNGb3IgPSBmdW5jdGlvbihjYXNlRGF0YSwgdG9SZW1vdmUpe1xyXG5cclxuXHR2YXIgcXVlc3Rpb25EYXRhID0gdG9SZW1vdmUuYm9hcmQrXCItXCIrdG9SZW1vdmUucXVlc3Rpb24rXCItXCI7XHJcblx0Zm9yKHZhciBmaWxlIGluIGNhc2VEYXRhLnN1Ym1pdHRlZCl7XHJcblx0XHRpZiAoIWNhc2VEYXRhLnN1Ym1pdHRlZC5oYXNPd25Qcm9wZXJ0eShmaWxlKSB8fCAhZmlsZS5zdGFydHNXaXRoKHF1ZXN0aW9uRGF0YSkpIGNvbnRpbnVlO1xyXG5cdFx0ZGVsZXRlIGNhc2VEYXRhLnN1Ym1pdHRlZFtmaWxlXTtcclxuXHR9XHJcblx0XHJcbn1cclxuXHJcbi8vIEFkZHMgYSBzdWJtaXR0ZWQgZmlsZSB0byB0aGUgbG9jYWwgc3RvYXJnZVxyXG5tLmFkZE5ld0ZpbGVzVG9TeXN0ZW0gPSBmdW5jdGlvbihjYXNlRGF0YSwgdG9TdG9yZSwgY2FsbGJhY2spe1xyXG5cclxuXHQvLyBVc2VkIGZvciBjYWxsYmFja1xyXG5cdHZhciB0b3RhbENCID0gMSwgY3VyQ0IgPSAwO1xyXG5cdHZhciBmaW5pc2hlZCA9IGZ1bmN0aW9uKCl7XHJcblx0XHRpZigrK2N1ckNCPj10b3RhbENCKXtcclxuXHRcdFx0Y2FsbGJhY2soY2FzZURhdGEpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRmb3IodmFyIGk9MDtpPHRvU3RvcmUuZmlsZXMubGVuZ3RoO2krKyl7XHJcblx0XHQoZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cdFx0XHR2YXIgZmlsZW5hbWUgPSB0b1N0b3JlLmJvYXJkK1wiLVwiK3RvU3RvcmUucXVlc3Rpb24rXCItXCIraStcIi1cIit0b1N0b3JlLmZpbGVzW2ldLm5hbWU7XHJcblx0XHRcdHRvdGFsQ0IrKztcclxuXHRcdFx0ZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuXHRcdFx0XHRjYXNlRGF0YS5zdWJtaXR0ZWRbZmlsZW5hbWVdID0gIGV2ZW50LnRhcmdldC5yZXN1bHQ7XHJcblx0XHRcdFx0ZmluaXNoZWQoKTtcclxuXHRcdCAgICB9O1xyXG5cdFx0ICAgIGZpbGVSZWFkZXIucmVhZEFzRGF0YVVSTCh0b1N0b3JlLmZpbGVzW2ldKTtcclxuXHRcdH0pKCk7XHJcblx0fVxyXG5cdFxyXG5cdGZpbmlzaGVkKCk7XHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIENhdGVnb3J5ID0gcmVxdWlyZShcIi4uL2Nhc2UvY2F0ZWdvcnkuanNcIik7XHJcbnZhciBSZXNvdXJjZXMgPSByZXF1aXJlKFwiLi4vY2FzZS9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi4vZ2FtZS9jb25zdGFudHMuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi4vY2FzZS9xdWVzdGlvbi5qcycpO1xyXG5cclxuLy8gUGFyc2VzIHRoZSB4bWwgY2FzZSBmaWxlc1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIGtub3duIHRhZ3NcclxuLypcclxuYW5zd2VyXHJcbmJ1dHRvblxyXG5jYXRlZ29yeUxpc3RcclxuY29ubmVjdGlvbnNcclxuZWxlbWVudFxyXG5mZWVkYmFja1xyXG5pbnN0cnVjdGlvbnNcclxucmVzb3VyY2VcclxucmVzb3VyY2VMaXN0XHJcbnJlc291cmNlSW5kZXhcclxuc29mdHdhcmVMaXN0XHJcbnF1ZXN0aW9uXHJcbnF1ZXN0aW9uVGV4dFxyXG5xdXN0aW9uTmFtZVxyXG4qL1xyXG5cclxuLy8gY29udmVyc2lvblxyXG52YXIgc3RhdGVDb252ZXJ0ZXIgPSB7XHJcblx0XCJoaWRkZW5cIiA6IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTixcclxuXHRcInVuc29sdmVkXCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQsXHJcblx0XCJjb3JyZWN0XCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEXHJcbn1cclxuLy8gY29udmVyc2lvblxyXG52YXIgcmV2ZXJzZVN0YXRlQ29udmVydGVyID0gW1wiaGlkZGVuXCIsIFwidW5zb2x2ZWRcIiwgXCJjb3JyZWN0XCJdO1xyXG5cclxudmFyIGZpcnN0TmFtZSA9IFwidW5hc3NpZ25lZFwiO1xyXG52YXIgbGFzdE5hbWUgPSBcInVuYXNzaWduZWRcIjtcclxudmFyIGVtYWlsID0gXCJlbWFpbFwiO1xyXG5cclxuLy8gTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cdFx0XHRcdFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBzZXQgdGhlIHF1ZXN0aW9uIHN0YXRlc1xyXG5tLmFzc2lnblF1ZXN0aW9uU3RhdGVzID0gZnVuY3Rpb24oY2F0ZWdvcmllcywgcXVlc3Rpb25FbGVtcykge1xyXG5cdGNvbnNvbGUubG9nKFwicWVsZW1zOiBcIiArIHF1ZXN0aW9uRWxlbXMubGVuZ3RoKTtcclxuXHR2YXIgdGFsbHkgPSAwOyAvLyB0cmFjayB0b3RhbCBpbmRleCBpbiBuZXN0ZWQgbG9vcFxyXG5cdFxyXG5cdC8vIGFsbCBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8Y2F0ZWdvcmllcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc29sZS5sb2coXCJDQVRFR09SWSBcIiArIGkpO1xyXG5cdFx0Zm9yICh2YXIgaj0wOyBqPGNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zLmxlbmd0aDsgaisrLCB0YWxseSsrKSB7XHJcblx0XHRcdC8vIHN0b3JlIHF1ZXN0aW9uICBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHEgPSBjYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHN0b3JlIHRhZyBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHFFbGVtID0gcXVlc3Rpb25FbGVtc1t0YWxseV07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdGF0ZVxyXG5cdFx0XHRxLmN1cnJlbnRTdGF0ZSA9IHN0YXRlQ29udmVydGVyW3FFbGVtLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uU3RhdGVcIildO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHRpZihxLmp1c3RpZmljYXRpb24pXHJcblx0XHRcdFx0cS5qdXN0aWZpY2F0aW9uLnZhbHVlID0gcUVsZW0uZ2V0QXR0cmlidXRlKFwianVzdGlmaWNhdGlvblwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGwgY29ycmVjdCBhbnN3ZXIgaWYgc3RhdGUgaXMgY29ycmVjdFxyXG5cdFx0XHRpZihxLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHQgIHEuY29ycmVjdEFuc3dlcigpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyB4cG9zXHJcblx0XHRcdHEucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54KTtcclxuXHRcdFx0Ly8geXBvc1xyXG5cdFx0XHRxLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubS5nZXRSZXNvdXJjZXMgPSBmdW5jdGlvbih4bWxEYXRhKXtcclxuXHR2YXIgcmVzb3VyY2VFbGVtZW50cyA9IHhtbERhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZUxpc3RcIilbMF0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZVwiKTtcclxuXHRyZXR1cm4gbmV3IFJlc291cmNlcyhyZXNvdXJjZUVsZW1lbnRzLCB4bWxEYXRhKTtcclxufVxyXG5cclxuLy8gdGFrZXMgdGhlIHhtbCBzdHJ1Y3R1cmUgYW5kIGZpbGxzIGluIHRoZSBkYXRhIGZvciB0aGUgcXVlc3Rpb24gb2JqZWN0XHJcbm0uZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyA9IGZ1bmN0aW9uKHhtbERhdGEsIHJlc291cmNlcywgd2luZG93RGl2KSB7XHJcblx0Ly8gaWYgdGhlcmUgaXMgYSBjYXNlIGZpbGVcclxuXHRpZiAoeG1sRGF0YSAhPSBudWxsKSB7XHJcblx0XHRcclxuXHRcdC8vIEdldCBwbGF5ZXIgZGF0YSBcclxuXHRcdGZpcnN0TmFtZSA9IHhtbERhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcInByb2ZpbGVGaXJzdFwiKTtcclxuXHRcdGxhc3ROYW1lID0geG1sRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF0uZ2V0QXR0cmlidXRlKFwicHJvZmlsZUxhc3RcIik7XHJcblx0XHR4bWxEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJwcm9maWxlTWFpbFwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gVGhlbiBsb2FkIHRoZSBjYXRlZ29yaWVzXHJcblx0XHR2YXIgY2F0ZWdvcnlFbGVtZW50cyA9IHhtbERhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeVwiKTtcclxuXHRcdHZhciBjYXRlZ29yeU5hbWVzID0geG1sRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5TGlzdFwiKVswXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVsZW1lbnRcIik7XHJcblx0XHR2YXIgY2F0ZWdvcmllcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaT0wOyBpPGNhdGVnb3J5RWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Ly8gTG9hZCBlYWNoIGNhdGVnb3J5ICh3aGljaCBsb2FkcyBlYWNoIHF1ZXN0aW9uKVxyXG5cdFx0XHRjb25zb2xlLmxvZyhjYXRlZ29yeUVsZW1lbnRzW2ldKTtcclxuXHRcdFx0Y29uc29sZS5sb2cocGFyc2VJbnQoY2F0ZWdvcnlFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKSk7XHJcblx0XHRcdGNhdGVnb3JpZXNbcGFyc2VJbnQoY2F0ZWdvcnlFbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoXCJjYXRlZ29yeURlc2lnbmF0aW9uXCIpKV0gPSBuZXcgQ2F0ZWdvcnkoY2F0ZWdvcnlOYW1lc1tpXS5pbm5lckhUTUwsIGNhdGVnb3J5RWxlbWVudHNbaV0sIHJlc291cmNlcywgd2luZG93RGl2KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBjYXRlZ29yaWVzO1xyXG5cdH1cclxuXHRyZXR1cm4gbnVsbFxyXG59XHJcblxyXG4vLyBjcmVhdGVzIGEgY2FzZSBmaWxlIGZvciB6aXBwaW5nXHJcbm0ucmVjcmVhdGVDYXNlRmlsZSA9IGZ1bmN0aW9uKGJvYXJkcykge1xyXG5cclxuXHQvLyBjcmVhdGUgc2F2ZSBmaWxlIHRleHRcclxuXHR2YXIgZGF0YVRvU2F2ZSA9IG0uY3JlYXRlWE1MU2F2ZUZpbGUoYm9hcmRzLCB0cnVlKTtcclxuXHRcclxuXHRjb25zb2xlLmxvZyAoXCJzYXZlRGF0YS5pcGFyIGRhdGEgY3JlYXRlZFwiKTtcclxuXHRcclxuXHQvL2lmIChjYWxsYmFjaykgY2FsbGJhY2soZGF0YVRvU2F2ZSk7XHJcblx0cmV0dXJuIGRhdGFUb1NhdmU7XHJcblx0XHJcbn1cclxuXHJcbi8vIGNyZWF0ZXMgdGhlIHhtbFxyXG5tLmNyZWF0ZVhNTFNhdmVGaWxlID0gZnVuY3Rpb24oYWN0aXZlSW5kZXgsIGJvYXJkcywgaW5jbHVkZU5ld2xpbmUpIHtcclxuXHQvLyBuZXdsaW5lXHJcblx0dmFyIG5sO1xyXG5cdGluY2x1ZGVOZXdsaW5lID8gbmwgPSBcIlxcblwiIDogbmwgPSBcIlwiO1xyXG5cdC8vIGhlYWRlclxyXG5cdHZhciBvdXRwdXQgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwidXRmLThcIj8+JyArIG5sO1xyXG5cdC8vIGNhc2UgZGF0YVxyXG5cdG91dHB1dCArPSAnPGNhc2UgY2F0ZWdvcnlJbmRleD1cIjNcIiBjYXNlU3RhdHVzPVwiJysoYWN0aXZlSW5kZXgrMSkrJ1wiIHByb2ZpbGVGaXJzdD1cIicrIGZpcnN0TmFtZSArJ1wiIHByb2ZpbGVMYXN0PVwiJyArIGxhc3ROYW1lICsgJ1wiIHByb2ZpbGVNYWlsPVwiJysgZW1haWwgKydcIj4nICsgbmw7XHJcblx0Ly8gcXVlc3Rpb25zIGhlYWRlclxyXG5cdG91dHB1dCArPSAnPHF1ZXN0aW9ucz4nICsgbmw7XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0YWcgc3RhcnRcclxuXHRcdFx0b3V0cHV0ICs9ICc8cXVlc3Rpb24gJztcclxuXHJcblx0XHRcdC8vIHF1ZXN0aW9uU3RhdGVcclxuXHRcdFx0b3V0cHV0ICs9ICdxdWVzdGlvblN0YXRlPVwiJyArIHJldmVyc2VTdGF0ZUNvbnZlcnRlcltxLmN1cnJlbnRTdGF0ZV0gKyAnXCIgJztcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHR2YXIgbmV3SnVzdGlmaWNhdGlvbiA9IHEuanVzdGlmaWNhdGlvbi52YWx1ZTtcclxuXHRcdFx0dmFyIGp1c3RpZmljYXRpb247XHJcblx0XHRcdG5ld0p1c3RpZmljYXRpb24gPyBqdXN0aWZpY2F0aW9uID0gbmV3SnVzdGlmaWNhdGlvbiA6IGp1c3RpZmljYXRpb24gPSBxLmp1c3RpZmljYXRpb25TdHJpbmc7XHJcblx0XHRcdC8vIGhhbmRsZSB1bmRlZmluZWRcclxuXHRcdFx0aWYgKCFqdXN0aWZpY2F0aW9uKSBqdXN0aWZpY2F0aW9uID0gXCJcIjtcclxuXHRcdFx0b3V0cHV0ICs9ICdqdXN0aWZpY2F0aW9uPVwiJyArIGp1c3RpZmljYXRpb24gKyAnXCIgJztcclxuXHRcdFx0Ly8gYW5pbWF0ZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdhbmltYXRlZD1cIicgKyAocS5jdXJyZW50U3RhdGUgPT0gMikgKyAnXCIgJzsgLy8gbWlnaHQgaGF2ZSB0byBmaXggdGhpcyBsYXRlclxyXG5cdFx0XHQvLyBsaW5lc1RyYW5jZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdsaW5lc1RyYWNlZD1cIjBcIiAnOyAvLyBtaWdodCBoYXZlIHRvIGZpeCB0aGlzIHRvb1xyXG5cdFx0XHQvLyByZXZlYWxUaHJlc2hvbGRcclxuXHRcdFx0b3V0cHV0ICs9ICdyZXZlYWxUaHJlc2hvbGQgID1cIicgKyBxLnJldmVhbFRocmVzaG9sZCAgKydcIiAnOyAvLyBhbmQgdGhpc1xyXG5cdFx0XHQvLyBwb3NpdGlvblBlcmNlbnRYXHJcblx0XHRcdG91dHB1dCArPSAncG9zaXRpb25QZXJjZW50WD1cIicgKyBVdGlsaXRpZXMubWFwKHEucG9zaXRpb25QZXJjZW50WCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCAwLCAxMDApICsgJ1wiICc7XHJcblx0XHRcdC8vIHBvc2l0aW9uUGVyY2VudFlcclxuXHRcdFx0b3V0cHV0ICs9ICdwb3NpdGlvblBlcmNlbnRZPVwiJyArIFV0aWxpdGllcy5tYXAocS5wb3NpdGlvblBlcmNlbnRZLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnksIDAsIDEwMCkgKyAnXCIgJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRhZyBlbmRcclxuXHRcdFx0b3V0cHV0ICs9ICcvPicgKyBubDtcclxuXHRcdH1cclxuXHR9XHJcblx0b3V0cHV0ICs9IFwiPC9xdWVzdGlvbnM+XCIgKyBubDtcclxuXHRvdXRwdXQgKz0gXCI8L2Nhc2U+XCIgKyBubDtcclxuXHRyZXR1cm4gb3V0cHV0O1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcblxyXG4vLyBwcml2YXRlIHZhcmlhYmxlc1xyXG52YXIgcmVsYXRpdmVNb3VzZVBvc2l0aW9uO1xyXG52YXIgbW91c2VEb3duVGltZXIsIGxlZnRNb3VzZUNsaWNrZWQsIG1heENsaWNrRHVyYXRpb247XHJcbnZhciBtb3VzZVdoZWVsVmFsO1xyXG52YXIgcHJldlRpbWU7XHJcbnZhciBkZWx0YVk7XHJcbnZhciBzY2FsaW5nLCB0b3VjaFpvb20sIHN0YXJ0VG91Y2hab29tO1xyXG5cclxuZnVuY3Rpb24gbW91c2VTdGF0ZSgpe1xyXG5cdHRoaXMubW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgcmVsYXRpdmVNb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KDAsMCk7XHJcbiAgICB0aGlzLnZpcnR1YWxQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgXHJcbiAgICAvLyBTZXQgdmFyaWFibGUgZGVmYXVsdHNcclxuICAgIHRoaXMubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBmYWxzZTtcclxuICAgIG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIGRlbHRhWSA9IDA7XHJcbiAgICB0aGlzLm1vdXNlV2hlZWxEWSA9IDA7XHJcbiAgICB0aGlzLnpvb21EaWZmID0gMDtcclxuICAgIHRvdWNoWm9vbSA9IDA7XHJcbiAgICB0aGlzLm1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgbGVmdE1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgbWF4Q2xpY2tEdXJhdGlvbiA9IDIwMDtcclxuXHRcclxufVxyXG5cclxudmFyIHAgPSBtb3VzZVN0YXRlLnByb3RvdHlwZTtcclxuXHJcbi8vZXZlbnQgbGlzdGVuZXJzIGZvciBtb3VzZSBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgY2FudmFzZXNcclxucC5hZGRDYW52YXMgPSBmdW5jdGlvbihjYW52YXMpe1xyXG4gICAgdmFyIG1vdXNlU3RhdGUgPSB0aGlzO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0bW91c2VTdGF0ZS51cGRhdGVQb3NpdGlvbihlKTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0aWYoc2NhbGluZylcclxuICAgIFx0XHRtb3VzZVN0YXRlLnVwZGF0ZVRvdWNoUG9zaXRpb25zKGUpO1xyXG4gICAgXHRlbHNlXHJcbiAgICBcdFx0bW91c2VTdGF0ZS51cGRhdGVQb3NpdGlvbihlLnRvdWNoZXNbMF0pO1xyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRpZiAoZS53aGljaCAmJiBlLndoaWNoIT0zIHx8IGUuYnV0dG9uICYmIGUuYnV0dG9uIT0yKVxyXG5cdCAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJjb250ZXh0bWVudVwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0bGVmdE1vdXNlQ2xpY2tlZCA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRpZihlLnRvdWNoZXMubGVuZ3RoID09IDEgJiYgIXNjYWxpbmcpe1xyXG4gICAgXHRcdG1vdXNlU3RhdGUudXBkYXRlUG9zaXRpb24oZS50b3VjaGVzWzBdKTtcclxuXHQgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHQgICAgICAgIFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSB0cnVlO1xyXG5cdCAgICAgICAgfSk7XHJcbiAgICBcdH1cclxuICAgIFx0ZWxzZSBpZihlLnRvdWNoZXMubGVuZ3RoID09IDIpe1xyXG4gICAgXHRcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICBcdFx0c2NhbGluZyA9IHRydWU7XHJcbiAgICBcdFx0bW91c2VTdGF0ZS51cGRhdGVUb3VjaFBvc2l0aW9ucyhlKTtcclxuICAgIFx0XHRzdGFydFRvdWNoWm9vbSA9IHRvdWNoWm9vbTtcclxuICAgIFx0fVxyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0aWYgKGUud2hpY2ggJiYgZS53aGljaCE9MyB8fCBlLmJ1dHRvbiAmJiBlLmJ1dHRvbiE9MilcclxuXHQgICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBcdGlmKHNjYWxpbmcpe1xyXG4gICAgXHRcdHNjYWxpbmcgPSBmYWxzZTtcclxuICAgIFx0ICAgIHRvdWNoWm9vbSA9IDA7XHJcbiAgICBcdCAgICBzdGFydFRvdWNoWm9vbSA9IDA7XHJcbiAgICBcdH1cclxuICAgIFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IGZhbHNlO1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGRlbHRhWSArPSBldmVudC5kZWx0YVk7XHJcbiAgICB9LCBmYWxzZSk7XHJcbn1cclxuXHJcbnAudXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbihlKXtcclxuICAgIHRoaXMubW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChlLmNsaWVudFgsIGUuY2xpZW50WSk7XHJcbiAgICByZWxhdGl2ZU1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQodGhpcy5tb3VzZVBvc2l0aW9uLnggLSAod2luZG93LmlubmVyV2lkdGgvMi4wKSwgdGhpcy5tb3VzZVBvc2l0aW9uLnkgLSAod2luZG93LmlubmVySGVpZ2h0LzIuMCkpO1xyXG59XHJcblxyXG5wLnVwZGF0ZVRvdWNoUG9zaXRpb25zID0gZnVuY3Rpb24oZSl7XHJcblx0dmFyIGN1clRvdWNoZXMgPSBbXHJcblx0ICAgICAgICAgICAgICAgbmV3IFBvaW50KGUudG91Y2hlc1swXS5jbGllbnRYLCBlLnRvdWNoZXNbMF0uY2xpZW50WSksXHJcblx0ICAgICAgICAgICAgICAgbmV3IFBvaW50KGUudG91Y2hlc1sxXS5jbGllbnRYLCBlLnRvdWNoZXNbMV0uY2xpZW50WSlcclxuXHRdO1xyXG5cdHRvdWNoWm9vbSA9IE1hdGguc3FydChNYXRoLnBvdyhjdXJUb3VjaGVzWzBdLngtY3VyVG91Y2hlc1sxXS54LCAyKStNYXRoLnBvdyhjdXJUb3VjaGVzWzBdLnktY3VyVG91Y2hlc1sxXS55LCAyKSk7XHJcbn1cclxuXHJcbi8vIFVwZGF0ZSB0aGUgbW91c2UgdG8gdGhlIGN1cnJlbnQgc3RhdGVcclxucC51cGRhdGUgPSBmdW5jdGlvbihkdCwgc2NhbGUpe1xyXG4gICAgXHJcblx0Ly8gU2F2ZSB0aGUgY3VycmVudCB2aXJ0dWFsIHBvc2l0aW9uIGZyb20gc2NhbGVcclxuXHR0aGlzLnZpcnR1YWxQb3NpdGlvbiA9IG5ldyBQb2ludChyZWxhdGl2ZU1vdXNlUG9zaXRpb24ueC9zY2FsZSwgcmVsYXRpdmVNb3VzZVBvc2l0aW9uLnkvc2NhbGUpOztcclxuXHRcclxuXHQvLyBHZXQgdGhlIGN1cnJ0ZW5sIGRlbHRhIHkgZm9yIHRoZSBtb3VzZSB3aGVlbFxyXG4gICAgdGhpcy5tb3VzZVdoZWVsRFkgPSBkZWx0YVk7XHJcbiAgICBkZWx0YVkgPSAwO1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIHpvb20gZGlmZiBhbmQgcHJldiB6b29tXHJcblx0aWYoc2NhbGluZylcclxuXHRcdHRoaXMuem9vbURpZmYgPSBzdGFydFRvdWNoWm9vbSAtIHRvdWNoWm9vbTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLnpvb21EaWZmID0gMDtcclxuICAgIFxyXG4gICAgLy8gY2hlY2sgbW91c2UgY2xpY2tcclxuICAgIHRoaXMubW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBpZiAodGhpcy5tb3VzZURvd24pXHJcbiAgICBcdG1vdXNlRG93blRpbWVyICs9IGR0O1xyXG4gICAgZWxzZXtcclxuICAgIFx0aWYgKG1vdXNlRG93blRpbWVyID4gMCAmJiBtb3VzZURvd25UaW1lciA8IG1heENsaWNrRHVyYXRpb24pXHJcbiAgICBcdFx0dGhpcy5tb3VzZUNsaWNrZWQgPSB0cnVlO1xyXG4gICAgXHRtb3VzZURvd25UaW1lciA9IDA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRoaXMucHJldk1vdXNlRG93biA9IHRoaXMubW91c2VEb3duO1xyXG4gICAgdGhpcy5oYXNUYXJnZXQgPSBmYWxzZTtcclxuICAgIFxyXG59XHJcblxyXG5wLmxlZnRNb3VzZUNsaWNrZWQgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgdGVtcCA9IGxlZnRNb3VzZUNsaWNrZWQ7XHJcblx0bGVmdE1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG5cdHJldHVybiB0ZW1wO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG1vdXNlU3RhdGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIFBvaW50KHBYLCBwWSl7XHJcbiAgICB0aGlzLnggPSBwWDtcclxuICAgIHRoaXMueSA9IHBZO1xyXG59XHJcblxyXG52YXIgcCA9IFBvaW50LnByb3RvdHlwZTtcclxuXHJcbnAuYWRkID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLCB0aGlzLnkrcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLngsIHRoaXMueStwWC55KTtcclxufVxyXG5cclxucC5tdWx0ID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLCB0aGlzLnkqcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLngsIHRoaXMueSpwWC55KTtcclxufVxyXG5cclxucC5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKXtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpzY2FsZSwgdGhpcy55KnNjYWxlKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyByZXR1cm5zIG1vdXNlIHBvc2l0aW9uIGluIGxvY2FsIGNvb3JkaW5hdGUgc3lzdGVtIG9mIGVsZW1lbnRcclxubS5nZXRNb3VzZSA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgcmV0dXJuIG5ldyBQb2ludCgoZS5wYWdlWCAtIGUudGFyZ2V0Lm9mZnNldExlZnQpLCAoZS5wYWdlWSAtIGUudGFyZ2V0Lm9mZnNldFRvcCkpO1xyXG59XHJcblxyXG4vL3JldHVybnMgYSB2YWx1ZSByZWxhdGl2ZSB0byB0aGUgcmF0aW8gaXQgaGFzIHdpdGggYSBzcGVjaWZpYyByYW5nZSBcIm1hcHBlZFwiIHRvIGEgZGlmZmVyZW50IHJhbmdlXHJcbm0ubWFwID0gZnVuY3Rpb24odmFsdWUsIG1pbjEsIG1heDEsIG1pbjIsIG1heDIpe1xyXG4gICAgcmV0dXJuIG1pbjIgKyAobWF4MiAtIG1pbjIpICogKCh2YWx1ZSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKSk7XHJcbn1cclxuXHJcbi8vaWYgYSB2YWx1ZSBpcyBoaWdoZXIgb3IgbG93ZXIgdGhhbiB0aGUgbWluIGFuZCBtYXgsIGl0IGlzIFwiY2xhbXBlZFwiIHRvIHRoYXQgb3V0ZXIgbGltaXRcclxubS5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbHVlKSk7XHJcbn1cclxuXHJcbi8vZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBtb3VzZSBpcyBpbnRlcnNlY3RpbmcgdGhlIGFyZWFcclxubS5tb3VzZUludGVyc2VjdCA9IGZ1bmN0aW9uKHBNb3VzZVN0YXRlLCBhcmVhLCBwT2Zmc2V0dGVyKXtcclxuICAgIGlmKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54ID4gYXJlYS5wb3NpdGlvbi54IC0gYXJlYS53aWR0aC8yIC0gcE9mZnNldHRlci54ICYmIHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IDwgYXJlYS5wb3NpdGlvbi54ICsgYXJlYS53aWR0aC8yIC0gcE9mZnNldHRlci54ICYmXHJcbiAgICBcdFx0cE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPiBhcmVhLnBvc2l0aW9uLnkgLSBhcmVhLmhlaWdodC8yIC0gcE9mZnNldHRlci55ICYmIHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IDwgYXJlYS5wb3NpdGlvbi55ICsgYXJlYS5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSlcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICBlbHNlXHJcbiAgICBcdHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuLy9kZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG1vdXNlIGlzIGludGVyc2VjdGluZyB0aGUgYXJlYSBhcm91bmQgdGhlIGdpdmVuIGFyZWEgYW5kIGF0IHdoYXQgc2lkZSAocmVzdWx0IGlzIHNpZGUgbiAtIG5vcnRoLCB3IC0gd2VzdCwgcyAtIHNvdXRoLCBlIC0gZWFzdCwgbncgLSBub3J0aHdlc3QsIGV0Yy4pXHJcbm0ubW91c2VJbnRlcnNlY3RFZGdlID0gZnVuY3Rpb24ocE1vdXNlU3RhdGUsIGFyZWEsIG91dGxpbmUsIHBPZmZzZXR0ZXIpe1xyXG5cdHZhciBib3VuZHMgPSB7bGVmdDogYXJlYS5wb3NpdGlvbi54IC0gYXJlYS53aWR0aC8yIC0gcE9mZnNldHRlci54LFxyXG5cdFx0XHRcdFx0cmlnaHQ6IGFyZWEucG9zaXRpb24ueCArIGFyZWEud2lkdGgvMiAtIHBPZmZzZXR0ZXIueCxcclxuXHRcdFx0XHRcdHRvcDogYXJlYS5wb3NpdGlvbi55IC0gYXJlYS5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSxcclxuXHRcdFx0XHRcdGJvdHRvbTogYXJlYS5wb3NpdGlvbi55ICsgYXJlYS5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueX07XHJcbiAgICBpZiAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPiBib3VuZHMubGVmdCAtIG91dGxpbmUgJiYgcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPCBib3VuZHMucmlnaHQgKyBvdXRsaW5lICYmXHJcbiAgICBcdFx0cE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPiBib3VuZHMudG9wIC0gb3V0bGluZSAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA8IGJvdW5kcy5ib3R0b20gKyBvdXRsaW5lKXtcclxuICAgIFx0dmFyIHNpZGUgPSAnJztcclxuICAgIFx0aWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPD0gYm91bmRzLnRvcClcclxuICAgIFx0XHRzaWRlICs9ICduJztcclxuICAgIFx0aWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPj0gYm91bmRzLmJvdHRvbSlcclxuICAgIFx0XHRzaWRlICs9ICdzJztcclxuICAgIFx0aWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPD0gYm91bmRzLmxlZnQpXHJcbiAgICBcdFx0c2lkZSArPSAndyc7XHJcbiAgICBcdGlmKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54ID49IGJvdW5kcy5yaWdodClcclxuICAgIFx0XHRzaWRlICs9ICdlJztcclxuICAgIFx0aWYoc2lkZSE9MSlcclxuICAgIFx0XHRyZXR1cm4gc2lkZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcblxyXG4vLyBnZXRzIHRoZSB4bWwgb2JqZWN0IG9mIGEgc3RyaW5nXHJcbm0uZ2V0WG1sID0gZnVuY3Rpb24oeG1sKXtcclxuXHRcclxuXHQvLyBDbGVhbiB1cCB0aGUgeG1sXHJcblx0eG1sID0geG1sLnRyaW0oKTtcclxuXHR3aGlsZSh4bWwuY2hhckNvZGVBdCgwKTw9MzIpXHJcblx0XHR4bWwgPSB4bWwuc3Vic3RyKDEpO1xyXG5cdHhtbCA9IHhtbC50cmltKCk7XHJcblx0XHJcblx0dmFyIHhtbERvYztcclxuXHRpZiAod2luZG93LkRPTVBhcnNlcil7XHJcblx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xyXG5cdFx0eG1sRG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh4bWwsIFwidGV4dC94bWxcIik7XHJcblx0fVxyXG5cdGVsc2V7IC8vIElFXHJcblx0XHR4bWxEb2MgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxET01cIik7XHJcblx0XHR4bWxEb2MuYXN5bmMgPSBmYWxzZTtcclxuXHRcdHhtbERvYy5sb2FkWE1MKHhtbCk7XHJcblx0fVxyXG5cdHJldHVybiB4bWxEb2M7XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIHNjYWxlIG9mIHRoZSBmaXJzdCBwYXJhbWV0ZXIgdG8gdGhlIHNlY29uZCAod2l0aCB0aGUgc2Vjb25kIGZpdHRpbmcgaW5zaWRlIHRoZSBmaXJzdClcclxubS5nZXRTY2FsZSA9IGZ1bmN0aW9uKHZpcnR1YWwsIGFjdHVhbCl7XHJcblx0cmV0dXJuIGFjdHVhbC55L3ZpcnR1YWwueCp2aXJ0dWFsLnkgPCBhY3R1YWwueCA/IGFjdHVhbC55L3ZpcnR1YWwueSA6IGFjdHVhbC54L3ZpcnR1YWwueDtcclxufVxyXG5cclxubS5yZXBsYWNlQWxsID0gZnVuY3Rpb24gKHN0ciwgdGFyZ2V0LCByZXBsYWNlbWVudCkge1xyXG5cdHdoaWxlIChzdHIuaW5kZXhPZih0YXJnZXQpID4gLTEpIHtcclxuXHRcdHN0ciA9IHN0ci5yZXBsYWNlKHRhcmdldCxyZXBsYWNlbWVudCk7XHJcblx0fVxyXG5cdHJldHVybiBzdHI7XHJcbn1cclxuXHJcbi8vIEdldHMgdGhlIGluZGV4IG9mIHRoZSBudGggc2VhcmNoIHN0cmluZyAoc3RhcnRpbmcgYXQgMSwgMCB3aWxsIGFsd2F5cyByZXR1cm4gMClcclxuU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mQXQgPSBmdW5jdGlvbihzZWFyY2gsIG51bSl7XHJcblx0dmFyIGN1ckluZGV4ID0gMDtcclxuXHRmb3IodmFyIGk9MDtpPG51bSAmJiBjdXJJbmRleCE9LTE7aSsrKVxyXG5cdFx0Y3VySW5kZXggPSB0aGlzLmluZGV4T2Yoc2VhcmNoLCBjdXJJbmRleCsxKTtcclxuXHRyZXR1cm4gY3VySW5kZXg7XHJcbn1cclxuIiwiXHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG5tLmVkaXRJbmZvID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgcG9wdXBcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlxcXHJcblx0XHRDYXNlIEluZm9cXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cIndpbmRvd0NvbnRlbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6MzV2aDtcIj5cXFxyXG5cdFx0PGZvcm0gb25zdWJtaXQ9XCJyZXR1cm4gZmFsc2U7XCI+XFxcclxuXHRcdFx0PGI+TmFtZTwvYj48YnI+XFxcclxuXHRcdFx0PGlucHV0IG5hbWU9XCJjYXNlTmFtZVwiIHZhbHVlPVwiJWNhc2VOYW1lJVwiPjxicj5cXFxyXG5cdFx0XHQ8Yj5EZXNjcmlwdGlvbjwvYj48YnI+XFxcclxuXHRcdCBcdDxwPjxkaXYgY2xhc3M9XCJ0ZXh0LWJveCBsYXJnZVwiIGNvbnRlbnRlZGl0YWJsZT4lZGVzY3JpcHRpb24lPC9kaXY+PC9wPlxcXHJcblx0XHRcdDxiPkNvbmNsdXNpb248L2I+PGJyPlxcXHJcblx0IFx0XHQ8cD48ZGl2IGNsYXNzPVwidGV4dC1ib3ggbGFyZ2VcIiBjb250ZW50ZWRpdGFibGU+JWNvbmNsdXNpb24lPC9kaXY+PC9wPlxcXHJcblx0XHRcdDxidXR0b24gY2xhc3M9XCJoYWxmQnV0dG9uXCI+QmFjazwvYnV0dG9uPjxidXR0b24gY2xhc3M9XCJoYWxmQnV0dG9uXCI+QXBwbHkgQ2hhbmdlczwvYnV0dG9uPlxcXHJcblx0XHQ8L2Zvcm0+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5yZXNvdXJjZXNXaW5kb3cgPSAnXFxcclxuPGRpdiBjbGFzcz1cIndpbmRvdyBwb3B1cFwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdFJlc291cmNlc1xcXHJcblx0PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwid2luZG93Q29udGVudFwiPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwicmVzb3VyY2VDb250ZW50XCIgc3R5bGU9XCJvdmVyZmxvdy15OnNjcm9sbDtoZWlnaHQ6MzV2aDtcIj5cXFxyXG5cdFx0PC9kaXY+XFxcclxuXHRcdDxicj5cXFxyXG5cdFx0PGJ1dHRvbiBjbGFzcz1cImhhbGZCdXR0b25cIj5CYWNrPC9idXR0b24+PGJ1dHRvbiBjbGFzcz1cImhhbGZCdXR0b25cIj5DcmVhdGUgTmV3IFJlc291cmNlczwvYnV0dG9uPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+XFxcclxuJztcclxuXHJcbm0ucmVzb3VyY2UgPSAnXFxcclxuPGRpdiBjbGFzcz1cInJlc291cmNlSXRlbVwiPlxcXHJcbiAgPGltZyBzcmM9XCIlaWNvbiVcIiBjbGFzcz1cImljb25cIi8+XFxcclxuICA8aW1nIHNyYz1cIi4uL2ltZy9pY29uQ2xvc2UucG5nXCIgY2xhc3M9XCJkZWxldGVcIi8+XFxcclxuICA8aW1nIHNyYz1cIi4uL2ltZy9pY29uVG9vbHMucG5nXCIgY2xhc3M9XCJlZGl0XCIvPlxcXHJcbiAgPGRpdiBjbGFzcz1cInJlc291cmNlVGV4dFwiPiV0aXRsZSVcXFxyXG4gIDxicj5cXFxyXG4gIDxzcGFuIHN0eWxlPVwiY29sb3I6Z3JheTtcIj4lbGluayU8L3NwYW4+PC9kaXY+XFxcclxuPC9kaXY+XFxcclxuJztcclxuXHJcbm0ucmVzb3VyY2VFZGl0b3IgPSAnXFxcclxuPGRpdiBjbGFzcz1cIndpbmRvdyBwb3B1cFwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdCVlZGl0JSBSZXNvdXJjZVxcXHJcblx0PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwid2luZG93Q29udGVudFwiPlxcXHJcblx0XHQ8Zm9ybSBvbnN1Ym1pdD1cInJldHVybiBmYWxzZTtcIj5cXFxyXG5cdFx0XHQ8c2VsZWN0IG5hbWU9XCJ0eXBlXCIgY2xhc3M9XCJmdWxsXCI+XFxcclxuXHRcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMFwiPkZpbGUgUmVmcmVuY2U8L29wdGlvbj5cXFxyXG5cdFx0XHRcdDxvcHRpb24gdmFsdWU9XCIxXCI+V2ViIExpbms8L29wdGlvbj5cXFxyXG5cdFx0XHRcdDxvcHRpb24gdmFsdWU9XCIyXCI+VmlkZW8gTGluazwvb3B0aW9uPlxcXHJcblx0XHRcdDwvc2VsZWN0PlxcXHJcblx0XHRcdDxiPkRpc3BsYXkgTmFtZTwvYj48YnI+XFxcclxuXHRcdFx0PGlucHV0IG5hbWU9XCJuYW1lXCIgdmFsdWU9XCIlbmFtZSVcIj48YnI+XFxcclxuXHRcdFx0PGI+TGluayBBZGRyZXNzICh3d3cuIG5lZWRlZCk8L2I+PGJyPlxcXHJcblx0XHRcdDxpbnB1dCBuYW1lPVwibGlua1wiIHZhbHVlPVwiJWxpbmslXCI+XFxcclxuXHRcdDwvZm9ybT5cXFxyXG5cdFx0PGJyPlxcXHJcblx0XHQ8YnV0dG9uIGNsYXNzPVwiaGFsZkJ1dHRvblwiPkNhbmNlbDwvYnV0dG9uPjxidXR0b24gY2xhc3M9XCJoYWxmQnV0dG9uXCI+JWFwcGx5JTwvYnV0dG9uPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+XFxcclxuJztcclxuXHJcbm0udGV4dElucHV0ID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgcG9wdXBcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlxcXHJcblx0XHQldGl0bGUlXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCI+XFxcclxuXHRcdDxmb3JtIG9uc3VibWl0PVwicmV0dXJuIGZhbHNlO1wiPlxcXHJcblx0XHRcdDxiPiVwcm9tcHQlPC9iPjxicj5cXFxyXG5cdFx0XHQ8aW5wdXQgbmFtZT1cInRleHRcIiB2YWx1ZT1cIiV2YWx1ZSVcIj48YnI+XFxcclxuXHRcdDwvZm9ybT5cXFxyXG5cdFx0PGJyPlxcXHJcblx0XHQ8YnV0dG9uIGNsYXNzPVwiaGFsZkJ1dHRvblwiPkNhbmNlbDwvYnV0dG9uPjxidXR0b24gY2xhc3M9XCJoYWxmQnV0dG9uXCI+JWFwcGx5JTwvYnV0dG9uPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+XFxcclxuJzsiLCJcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHJcbm0udGFza1dpbmRvdyA9ICdcXFxyXG48ZGl2IGNsYXNzPVwid2luZG93IHRhc2tcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlxcXHJcblx0XHRUYXNrXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCIgc3R5bGU9XCJvdmVyZmxvdy15OiBzY3JvbGw7aGVpZ2h0OjMwdmg7XCI+XFxcclxuXHRcdDxoMz48Yj5RdWVzdGlvbiBOYW1lPC9iPjwvaDM+XFxcclxuXHRcdDxoMz48Yj48ZGl2IGNsYXNzPVwidGV4dC1ib3hcIiBjb250ZW50ZWRpdGFibGU+JXRpdGxlJTwvZGl2PjwvYj48L2gzPjxicj5cXFxyXG5cdFx0PHA+SW5zdHJ1Y3Rpb25zPC9wPlxcXHJcblx0XHQ8cD48ZGl2IGNsYXNzPVwidGV4dC1ib3ggbGFyZ2VcIiBjb250ZW50ZWRpdGFibGU+JWluc3RydWN0aW9ucyU8L2Rpdj48L3A+XFxcclxuXHRcdDxocj5cXFxyXG5cdFx0PHA+PGI+UXVlc3Rpb248L2I+PC9wPlxcXHJcblx0XHQ8cD48Yj48ZGl2IGNsYXNzPVwidGV4dC1ib3ggbGFyZ2VcIiBjb250ZW50ZWRpdGFibGU+JXF1ZXN0aW9uJTwvZGl2PjwvYj48L3A+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxuXHJcbm0ucmVzb3VyY2VXaW5kb3cgPSAnXFxcclxuPGRpdiBjbGFzcz1cIndpbmRvdyByZXNvdXJjZVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdFJlc291cmNlXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCIgc3R5bGU9XCJvdmVyZmxvdy15OiBzY3JvbGw7IGhlaWdodDoyMHZoO1wiPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwicmVzb3VyY2VDb250ZW50XCI+XFxcclxuXHRcdDwvZGl2PlxcXHJcblx0XHQ8YnI+XFxcclxuXHRcdDxidXR0b24gY2xhc3M9XCJmdWxsXCI+QWRkIFJlc291cmNlPC9idXR0b24+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5yZXNvdXJjZSA9ICdcXFxyXG48ZGl2IGNsYXNzPVwicmVzb3VyY2VJdGVtXCI+XFxcclxuICA8aW1nIHNyYz1cIiVpY29uJVwiIGNsYXNzPVwiaWNvblwiLz5cXFxyXG4gIDxpbWcgc3JjPVwiLi4vaW1nL2ljb25DbG9zZS5wbmdcIiBjbGFzcz1cImRlbGV0ZVwiLz5cXFxyXG4gIDxkaXYgY2xhc3M9XCJyZXNvdXJjZVRleHRcIj4ldGl0bGUlPC9kaXY+XFxcclxuICA8YSBocmVmPVwiJWxpbmslXCIgdGFyZ2V0PVwiX2JsYW5rXCI+XFxcclxuICAgIDxkaXYgY2xhc3M9XCJjZW50ZXJcIj5cXFxyXG4gICAgICBPcGVuXFxcclxuICAgICAgPGltZyBzcmM9XCIuLi9pbWcvaWNvbkxhdW5jaC5wbmdcIi8+XFxcclxuICAgIDwvZGl2PlxcXHJcbiAgPC9hPlxcXHJcbjwvZGl2PlxcXHJcbic7XHJcblxyXG5tLmFuc3dlcldpbmRvdyA9ICdcXFxyXG48ZGl2IGNsYXNzPVwid2luZG93IGFuc3dlclwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdEFuc3dlcnNcXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cIndpbmRvd0NvbnRlbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6MjB2aDtcIj5cXFxyXG5cdFx0PHNlbGVjdD5cXFxyXG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMlwiPjI8L29wdGlvbj5cXFxyXG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwiM1wiPjM8L29wdGlvbj5cXFxyXG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwiNFwiPjQ8L29wdGlvbj5cXFxyXG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwiNVwiPjU8L29wdGlvbj5cXFxyXG5cdFx0PC9zZWxlY3Q+XFxcclxuXHRcdGFuc3dlcnMuIFNlbGVjdCBjb3JyZWN0IGFuc3dlciB3aXRoIHJhZGlvIGJ1dHRvbi5cXFxyXG5cdFx0PGZvcm0gb25zdWJtaXQ9XCJyZXR1cm4gZmFsc2U7XCI+XFxcclxuXHRcdFxcXHJcblx0XHQ8L2Zvcm0+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5hbnN3ZXIgPSdcXFxyXG48aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImFuc3dlclwiIHZhbHVlPVwiJW51bSVcIiBjbGFzcz1cImFuc3dlclJhZGlvXCI+XFxcclxuPGRpdiBjbGFzcz1cImFuc3dlcklucHV0c1wiPlxcXHJcblx0PGI+Q2hvaWNlICVudW0lPC9iPjxicj5cXFxyXG5cdDxpbnB1dCBuYW1lPVwiYW5zd2VyJW51bSVcIiB2YWx1ZT1cIiVhbnN3ZXIlXCI+PGJyPlxcXHJcblx0RmVlZGJhY2s8YnI+XFxcclxuXHQ8aW5wdXQgbmFtZT1cImZlZWRiYWNrJW51bSVcIiB2YWx1ZT1cIiVmZWVkYmFjayVcIj48YnI+XFxcclxuPC9kaXY+XFxcclxuJztcclxuXHJcbm0ubWVzc2FnZVdpbmRvdyA9ICdcXFxyXG48ZGl2IGNsYXNzPVwid2luZG93IG1lc3NhZ2VcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlxcXHJcblx0XHRNZXNzYWdlXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCIgc3R5bGU9XCJoZWlnaHQ6NjB2aDtvdmVyZmxvdy15OnNjcm9sbDtcIj5cXFxyXG5cdFx0PHA+PGI+RnJvbSA8L2I+XFxcclxuXHRcdDxkaXYgY2xhc3M9XCJ0ZXh0LWJveFwiIGNvbnRlbnRlZGl0YWJsZT4ldGl0bGUlPC9kaXY+PC9wPlxcXHJcblx0XHQ8aHI+XFxcclxuXHRcdDxwPjxiPlN1YmplY3QgPC9iPlxcXHJcblx0XHQ8ZGl2IGNsYXNzPVwidGV4dC1ib3hcIiBjb250ZW50ZWRpdGFibGU+JWluc3RydWN0aW9ucyU8L2Rpdj48L3A+XFxcclxuXHRcdDxocj5cXFxyXG5cdFx0PHA+TWVzc2FnZTwvcD5cXFxyXG5cdFx0PHA+PGRpdiBjbGFzcz1cInRleHQtYm94IHRhbGxcIiBjb250ZW50ZWRpdGFibGU+JXF1ZXN0aW9uJTwvZGl2PjwvcD5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2PlxcXHJcbic7XHJcblxyXG5tLnF1ZXN0aW9uVHlwZVdpbmRvdyA9ICdcXFxyXG48ZGl2IGNsYXNzPVwid2luZG93IHR5cGVcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ0aXRsZVwiPlxcXHJcblx0XHRRdWVzdGlvbiBUeXBlXFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCI+XFxcclxuXHRcdDxzZWxlY3QgY2xhc3M9XCJmdWxsXCI+XFxcclxuXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIjFcIj5KdXN0aWZpY2F0aW9uIE11bHRpcGxlIENob2ljZTwvb3B0aW9uPlxcXHJcblx0XHRcdDxvcHRpb24gdmFsdWU9XCIyXCI+U3RhbmRhcmQgTXVsdGlwbGUgQ2hvaWNlPC9vcHRpb24+XFxcclxuXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIjNcIj5TaG9ydCBSZXNwb25zZTwvb3B0aW9uPlxcXHJcblx0XHRcdDxvcHRpb24gdmFsdWU9XCI0XCI+RmlsZSBTdWJtaXNzb248L29wdGlvbj5cXFxyXG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwiNVwiPk1lc3NhZ2U8L29wdGlvbj5cXFxyXG5cdFx0PC9zZWxlY3Q+XFxcclxuXHRcdDxidXR0b24gY2xhc3M9XCJpbWFnZUJ1dHRvblwiPlxcXHJcblx0XHQgIDxkaXY+PGltZyBzcmM9XCIuLi9pbWcvcGxhY2Vob2xkZXIucG5nXCIvPjwvZGl2PlxcXHJcblx0XHQgIDxkaXY+IFNlbGVjdCBJbWFnZSA8L2Rpdj5cXFxyXG5cdFx0PC9idXR0b24+XFxcclxuXHQ8L2Rpdj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJ3aW5kb3dCdXR0b25zXCI+XFxcclxuXHRcdDxidXR0b24+U2F2ZTwvYnV0dG9uPlxcXHJcblx0PC9kaXY+XFxcclxuPC9kaXY+XFxcclxuJzsiLCJ2YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi4vaGVscGVyL3V0aWxpdGllcy5qcycpO1xyXG5cclxuLy8gSFRNTFxyXG52YXIgc2VjdGlvbjtcclxuXHJcbi8vRWxlbWVudHNcclxudmFyIG5hbWVJbnB1dCwgZGVzY3JpcHRpb25JbnB1dCwgY2F0MUlucHV0O1xyXG52YXIgY3JlYXRlLCBiYWNrO1xyXG5cclxuLy8gVGhlIGN1ciBjYXNlXHJcbnZhciBjYXNlRmlsZTtcclxuXHJcbi8vIFRoZSBuZXh0IHBhZ2UgdG8gb3BlbiB3aGVuIHRoaXMgb25lIGNsb3Nlc1xyXG52YXIgbmV4dDtcclxuXHJcbnZhciBORVhUID0gT2JqZWN0LmZyZWV6ZSh7Tk9ORTogMCwgVElUTEU6IDEsIEJPQVJEOiAyfSk7XHJcblxyXG5mdW5jdGlvbiBDcmVhdGVNZW51KHBTZWN0aW9uKXtcclxuXHRzZWN0aW9uID0gcFNlY3Rpb247XHJcblx0bmV4dCA9IE5FWFQuTk9ORTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIGh0bWwgZWxlbWVudHNcclxuXHRuYW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2lucHV0LW5hbWUnKTtcclxuXHRkZXNjcmlwdGlvbklucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNpbnB1dC1kZXNjcmlwdGlvbicpO1xyXG5cdGNvbmNsdXNpb25JbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjaW5wdXQtY29uY2x1c2lvbicpO1xyXG5cdGNhdDFJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjaW5wdXQtY2F0MScpO1xyXG5cdGNyZWF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjY3JlYXRlLWJ1dHRvbicpO1xyXG5cdGJhY2sgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2JhY2stYnV0dG9uJyk7XHJcbiAgICBcclxuXHQvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG5cdGJhY2sub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcbiAgICBcdHBhZ2UubmV4dCA9IE5FWFQuVElUTEU7XHJcbiAgICBcdHBhZ2UuY2xvc2UoKTtcclxuICAgIH07XHJcblx0dmFyIHBhZ2UgPSB0aGlzO1xyXG4gICAgY3JlYXRlLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHRwYWdlLm5leHQgPSBORVhULkJPQVJEO1xyXG4gICAgXHRcclxuICAgIFx0Ly8gU2V0IHRoZSBpbnB1dHMgdG8gdGhlIGN1cnJlbnQgY2FzZVxyXG4gICAgXHR2YXIgY3VyQ2FzZSA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXTtcclxuICAgIFx0Y3VyQ2FzZS5zZXRBdHRyaWJ1dGUoJ2Nhc2VOYW1lJywgbmFtZUlucHV0LnZhbHVlKTtcclxuICAgIFx0Y3VyQ2FzZS5zZXRBdHRyaWJ1dGUoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb25JbnB1dC5pbm5lckhUTUwpO1xyXG4gICAgXHRjdXJDYXNlLnNldEF0dHJpYnV0ZSgnY29uY2x1c2lvbicsIGNvbmNsdXNpb25JbnB1dC5pbm5lckhUTUwpO1xyXG4gICAgXHR2YXIgY2F0TGlzdCA9IGN1ckNhc2UuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2NhdGVnb3J5TGlzdCcpWzBdO1xyXG4gICAgXHRjYXRMaXN0LnNldEF0dHJpYnV0ZSgnY2F0ZWdvcnlDb3VudCcsICcxJyk7XHJcbiAgICBcdGNhdExpc3QuaW5uZXJIVE1MID0gJzxlbGVtZW50PicrY2F0MUlucHV0LnZhbHVlKyc8L2VsZW1lbnQ+JztcclxuICAgIFx0dmFyIGNhdDEgPSBjYXNlRmlsZS5jcmVhdGVFbGVtZW50KCdjYXRlZ29yeScpO1xyXG4gICAgXHRjYXQxLnNldEF0dHJpYnV0ZSgnY2F0ZWdvcnlEZXNpZ25hdGlvbicsICcwJyk7XHJcbiAgICBcdGNhdDEuc2V0QXR0cmlidXRlKCdxdWVzdGlvbkNvdW50JywgJzAnKTtcclxuICAgIFx0Y3VyQ2FzZS5hcHBlbmRDaGlsZChjYXQxKTtcclxuICAgIFx0XHJcbiAgICBcdC8vIFNhdmUgdGhlIGNoYW5nZXMgdG8gbG9jYWwgc3RvcmFnZVxyXG4gICAgXHRsb2NhbFN0b3JhZ2VbJ2Nhc2VOYW1lJ10gPSBuYW1lSW5wdXQudmFsdWUrXCIuaXBhclwiO1xyXG4gICAgXHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSk7XHJcbiAgICBcdGNhc2VEYXRhLmNhc2VGaWxlID0gbmV3IFhNTFNlcmlhbGl6ZXIoKS5zZXJpYWxpemVUb1N0cmluZyhjYXNlRmlsZSk7XHJcblx0XHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcbiAgICBcdHBhZ2UuY2xvc2UoKTtcclxuICAgIH07XHJcbn1cclxuXHJcbnZhciBwID0gQ3JlYXRlTWVudS5wcm90b3R5cGU7XHJcblxyXG5wLm9wZW4gPSBmdW5jdGlvbihwTmV3UHJvZmlsZSl7XHJcblxyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIHN0YXR1cyBvZiBuZXcgcHJvZmlsZSBmb3IgdGhlIHByb2NjZWVkIGJ1dHRvblxyXG5cdG5ld1Byb2ZpbGUgPSBwTmV3UHJvZmlsZTtcclxuXHRcclxuXHQvLyBNYWtlIHRoZSBtZW51IHZpc2libGVcclxuXHRzZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHRcclxuXHQvLyBUaGUgY2FzZSBkYXRhIGFuZCB0aGUgdGl0bGUgZWxlbWVudFxyXG5cdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddKTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIGNhc2VcclxuXHRjYXNlRmlsZSA9IFV0aWxpdGllcy5nZXRYbWwoY2FzZURhdGEuY2FzZUZpbGUpO1xyXG5cdFx0XHJcblx0Ly8gTWFrZSBpdCBzbyB0aGF0IGNyZWF0ZSBpcyBkaXNhYmxlZCB1bnRpbCB5b3UgYXQgbGVhc3QgaGF2ZSBhIG5hbWUgYW5kIDFzdCBjYXRcclxuXHR2YXIgY2hlY2tQcm9jZWVkID0gZnVuY3Rpb24oKXtcclxuXHRcdGlmKG5hbWVJbnB1dC52YWx1ZT09XCJcIiB8fFxyXG5cdFx0XHRjYXQxSW5wdXQudmFsdWU9PVwiXCIpXHJcblx0XHRcdGNyZWF0ZS5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHRlbHNlXHJcblx0XHRcdGNyZWF0ZS5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdH07XHJcblx0bmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGNoZWNrUHJvY2VlZCk7XHJcblx0Y2F0MUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGNoZWNrUHJvY2VlZCk7XHJcblx0Y2hlY2tQcm9jZWVkKCk7XHJcblx0XHJcbn1cclxuXHJcbnAuY2xvc2UgPSBmdW5jdGlvbigpe1xyXG5cdHNlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRpZih0aGlzLm9uY2xvc2UpXHJcblx0XHR0aGlzLm9uY2xvc2UoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDcmVhdGVNZW51O1xyXG5tb2R1bGUuZXhwb3J0cy5ORVhUID0gTkVYVDsiLCJ2YXIgV2luZG93cyA9IHJlcXVpcmUoJy4uL2h0bWwvcG9wdXBXaW5kb3dzLmpzJyk7XHJcblxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxubS5lZGl0SW5mbyA9IGZ1bmN0aW9uKHdpbmRvd0RpdiwgY2FzZUZpbGUsIGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHBvcHVwIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLmVkaXRJbmZvO1xyXG4gICAgdmFyIGVkaXRJbmZvID0gdGVtcERpdi5maXJzdENoaWxkO1xyXG4gICAgXHJcbiAgICAvLyBGaWxsIGl0IHdpdGggdGhlIGdpdmVuIGluZm9cclxuICAgIHZhciBjYXNlSW5mbyA9IGNhc2VGaWxlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXTtcclxuICAgIGVkaXRJbmZvLmlubmVySFRNTCA9IGVkaXRJbmZvLmlubmVySFRNTC5yZXBsYWNlKC8lY2FzZU5hbWUlL2csIGNhc2VJbmZvLmdldEF0dHJpYnV0ZShcImNhc2VOYW1lXCIpKS5yZXBsYWNlKC8lZGVzY3JpcHRpb24lL2csIGNhc2VJbmZvLmdldEF0dHJpYnV0ZShcImRlc2NyaXB0aW9uXCIpKS5yZXBsYWNlKC8lY29uY2x1c2lvbiUvZywgY2FzZUluZm8uZ2V0QXR0cmlidXRlKFwiY29uY2x1c2lvblwiKSk7XHJcbiAgICBcclxuICAgIC8vIFNldHVwIHRoZSBidXR0b25zXHJcbiAgICB2YXIgYnV0dG9ucyA9IGVkaXRJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYnV0dG9uXCIpO1xyXG4gICAgYnV0dG9uc1swXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgIFx0d2luZG93RGl2LmlubmVySFRNTCA9ICcnO1xyXG4gICAgXHRjYWxsYmFjayhjYXNlRmlsZSwgY2FzZUluZm8uZ2V0QXR0cmlidXRlKFwiY2FzZU5hbWVcIikpO1xyXG4gICAgfVxyXG4gICAgYnV0dG9uc1sxXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgIFx0d2luZG93RGl2LmlubmVySFRNTCA9ICcnO1xyXG4gICAgXHR2YXIgZm9ybSA9IGVkaXRJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZm9ybVwiKVswXTtcclxuICAgIFx0dmFyIGRpdnMgPSBmb3JtLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZGl2XCIpO1xyXG4gICAgXHRjYXNlSW5mby5zZXRBdHRyaWJ1dGUoXCJjYXNlTmFtZVwiLCBmb3JtLmVsZW1lbnRzW1wiY2FzZU5hbWVcIl0udmFsdWUpO1xyXG4gICAgXHRjYXNlSW5mby5zZXRBdHRyaWJ1dGUoXCJkZXNjcmlwdGlvblwiLCBkaXZzWzBdLmlubmVySFRNTCk7XHJcbiAgICBcdGNhc2VJbmZvLnNldEF0dHJpYnV0ZShcImNvbmNsdXNpb25cIiwgZGl2c1sxXS5pbm5lckhUTUwpO1xyXG4gICAgXHRjYWxsYmFjayhjYXNlRmlsZSwgZm9ybS5lbGVtZW50c1tcImNhc2VOYW1lXCJdLnZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEaXNwbGF5IHRoZSB3aW5kb3dcclxuICAgIHdpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuICAgIHdpbmRvd0Rpdi5hcHBlbmRDaGlsZChlZGl0SW5mbyk7XHJcbiAgICBcclxuICAgIFxyXG59XHJcblxyXG5tLnByb21wdCA9IGZ1bmN0aW9uKHdpbmRvd0RpdiwgdGl0bGUsIHByb21wdCwgZGVmYXVsdFZhbHVlLCBhcHBseVRleHQsIGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHBvcHVwIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLnRleHRJbnB1dDtcclxuICAgIHZhciBwcm9tcHRXaW5kb3cgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcbiAgICBcclxuICAgIC8vIEZpbGwgaXQgd2l0aCB0aGUgZ2l2ZW4gaW5mb1xyXG4gICAgcHJvbXB0V2luZG93LmlubmVySFRNTCA9IHByb21wdFdpbmRvdy5pbm5lckhUTUwucmVwbGFjZSgvJXRpdGxlJS9nLCB0aXRsZSkucmVwbGFjZSgvJXByb21wdCUvZywgcHJvbXB0KS5yZXBsYWNlKC8ldmFsdWUlL2csIGRlZmF1bHRWYWx1ZSkucmVwbGFjZSgvJWFwcGx5JS9nLCBhcHBseVRleHQpO1xyXG4gICAgXHJcbiAgICAvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG4gICAgdmFyIGJ1dHRvbnMgPSBwcm9tcHRXaW5kb3cuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIik7XHJcbiAgICBidXR0b25zWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHR3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICBcdGNhbGxiYWNrKCk7XHJcbiAgICB9XHJcbiAgICBidXR0b25zWzFdLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHR3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICBcdGNhbGxiYWNrKHByb21wdFdpbmRvdy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImZvcm1cIilbMF0uZWxlbWVudHNbXCJ0ZXh0XCJdLnZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEaXNwbGF5IHRoZSB3aW5kb3dcclxuICAgIHdpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuICAgIHdpbmRvd0Rpdi5hcHBlbmRDaGlsZChwcm9tcHRXaW5kb3cpO1xyXG5cdFxyXG59IiwiXHJcbi8vIEhUTUxcclxudmFyIHNlY3Rpb247XHJcblxyXG4vLyBQYXJ0cyBvZiB0aGUgaHRtbFxyXG52YXIgbG9hZElucHV0LCBsb2FkQnV0dG9uLCBjcmVhdGVCdXR0b24sIGNvbnRpbnVlQnV0dG9uLCBtZW51QnV0dG9uO1xyXG5cclxuLy8gVGhlIG5leHQgcGFnZSB0byBvcGVuIHdoZW4gdGhpcyBvbmUgY2xvc2VzXHJcbnZhciBuZXh0O1xyXG5cclxudmFyIE5FWFQgPSBPYmplY3QuZnJlZXplKHtOT05FOiAwLCBCT0FSRDogMSwgQ1JFQVRFOiAyfSk7XHJcblxyXG5mdW5jdGlvbiBUaXRsZU1lbnUocFNlY3Rpb24pe1xyXG5cdHNlY3Rpb24gPSBwU2VjdGlvbjtcclxuXHRuZXh0ID0gTkVYVC5OT05FO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgbG9hZCBidXR0b24gYW5kIGlucHV0XHJcblx0bG9hZElucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNsb2FkLWlucHV0Jyk7XHJcblx0bG9hZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjbG9hZC1idXR0b24nKTtcclxuXHRjcmVhdGVCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2NyZWF0ZS1idXR0b24nKTtcclxuXHRjb250aW51ZUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjY29udGludWUtYnV0dG9uJyk7XHJcblx0bWVudUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjbWVudS1idXR0b24nKTtcclxuXHRcclxuXHQvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG5cdGNyZWF0ZUJ1dHRvbi5vbmNsaWNrID0gdGhpcy5jcmVhdGUuYmluZCh0aGlzKTtcclxuXHRsb2FkQnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdFx0aWYobG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddICYmICFjb25maXJtKFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN0YXJ0IGEgbmV3IGNhc2U/IFlvdXIgYXV0b3NhdmUgZGF0YSB3aWxsIGJlIGxvc3QhXCIpKVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHRsb2FkSW5wdXQuY2xpY2suYmluZChsb2FkSW5wdXQpO1xyXG5cdH1cclxuXHRsb2FkSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5sb2FkRmlsZS5iaW5kKHRoaXMpLCBmYWxzZSk7XHJcblx0Y29udGludWVCdXR0b24ub25jbGljayA9IHRoaXMuY2xvc2UuYmluZCh0aGlzKTtcclxuXHRtZW51QnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpe3dpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIuLi9pbmRleC5odG1sXCI7fTtcclxufVxyXG5cclxudmFyIHAgPSBUaXRsZU1lbnUucHJvdG90eXBlO1xyXG5cclxucC5vcGVuID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBEaXNwbGF5IHRoZSBzZWN0aW9uIGhvbGRpbmcgdGhlIG1lbnVcclxuXHRzZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnJztcclxuXHRcclxuXHQvLyBTZXR1cCBjb250aW51ZSBidXR0b24gYmFzZWQgb24gbG9jYWwgc3RvYXJnZVxyXG5cdGlmKGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSlcclxuXHRcdGNvbnRpbnVlQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0ZWxzZVxyXG5cdFx0Y29udGludWVCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xyXG5cdHRoaXMubmV4dCA9IE5FWFQuQk9BUkQ7XHJcblx0XHJcblx0Ly8gU2V0IHRoZSBidXR0b24gdG8gbm90IGRpc2FibGVkIGluIGNhc2UgY29taW5nIGJhY2sgdG8gdGhpcyBtZW51XHJcblx0bG9hZEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdGxvYWRJbnB1dC5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdG1lbnVCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcclxufVxyXG5cclxucC5jcmVhdGUgPSBmdW5jdGlvbigpe1xyXG5cclxuXHRpZihsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhQ3JlYXRlJ10gJiYgIWNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc3RhcnQgYSBuZXcgY2FzZT8gWW91ciBhdXRvc2F2ZSBkYXRhIHdpbGwgYmUgbG9zdCFcIikpXHJcblx0XHRyZXR1cm47XHJcblx0XHJcblx0Ly8gU2V0IHRoZSBidXR0b24gdG8gZGlzYWJsZWQgc28gdGhhdCBpdCBjYW4ndCBiZSBwcmVzc2VkIHdoaWxlIGxvYWRpbmdcclxuXHRsb2FkQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRsb2FkSW5wdXQuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdGNyZWF0ZUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcblx0Y29udGludWVCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xyXG5cdGNvbnRpbnVlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHR2YXIgcGFnZSA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdFx0ICBcdFxyXG5cdFx0XHQvLyBDcmVhdGUgYSB3b3JrZXIgZm9yIHVuemlwcGluZyB0aGUgZmlsZVxyXG5cdFx0XHR2YXIgemlwV29ya2VyID0gbmV3IFdvcmtlcihcIi4uL2xpYi91bnppcC5qc1wiKTtcclxuXHRcdFx0emlwV29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBTYXZlIHRoZSBiYXNlIHVybCB0byBsb2NhbCBzdG9yYWdlXHJcblx0XHRcdFx0bG9jYWxTdG9yYWdlWydjYXNlRGF0YUNyZWF0ZSddID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZS5kYXRhKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBnbyB0byB0aGUgbmV4dCBwYWdlXHJcblx0XHRcdFx0cGFnZS5uZXh0ID0gTkVYVC5DUkVBVEU7XHJcblx0XHRcdFx0cGFnZS5jbG9zZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTdGFydCB0aGUgd29ya2VyXHJcblx0XHRcdHppcFdvcmtlci5wb3N0TWVzc2FnZShyZXF1ZXN0LnJlc3BvbnNlKTtcclxuXHQgIH1cclxuXHR9O1xyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcImJhc2UuaXBhclwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxuXHRcclxufVxyXG5cclxucC5sb2FkRmlsZSA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcclxuXHQvLyBNYWtlIHN1cmUgYSBpcGFyIGZpbGUgd2FzIGNob29zZW5cclxuXHRpZighbG9hZElucHV0LnZhbHVlLmVuZHNXaXRoKFwiaXBhclwiKSl7XHJcblx0XHRhbGVydChcIllvdSBkaWRuJ3QgY2hvb3NlIGFuIGlwYXIgZmlsZSEgeW91IGNhbiBvbmx5IGxvYWQgaXBhciBmaWxlcyFcIik7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdGxvY2FsU3RvcmFnZVsnY2FzZU5hbWUnXSA9IGV2ZW50LnRhcmdldC5maWxlc1swXS5uYW1lO1xyXG5cclxuXHQvLyBTZXQgdGhlIGJ1dHRvbiB0byBkaXNhYmxlZCBzbyB0aGF0IGl0IGNhbid0IGJlIHByZXNzZWQgd2hpbGUgbG9hZGluZ1xyXG5cdGxvYWRCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xyXG5cdGxvYWRJbnB1dC5kaXNhYmxlZCA9IHRydWU7XHJcblx0Y3JlYXRlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHQvLyBDcmVhdGUgYSByZWFkZXIgYW5kIHJlYWQgdGhlIHppcFxyXG5cdHZhciBwYWdlID0gdGhpcztcclxuXHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFxyXG5cdFx0Ly8gc2luY2UgdGhlIHVzZXIgaXMgbG9hZGluZyBhIGZyZXNoIGZpbGUsIGNsZWFyIHRoZSBhdXRvc2F2ZSAoc29vbiB3ZSB3b24ndCB1c2UgdGhpcyBhdCBhbGwpXHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9zYXZlXCIsXCJcIik7XHJcblx0XHRcclxuXHRcdC8vIENyZWF0ZSBhIHdvcmtlciBmb3IgdW56aXBwaW5nIHRoZSBmaWxlXHJcblx0XHR2YXIgemlwV29ya2VyID0gbmV3IFdvcmtlcihcImxpYi91bnppcC5qc1wiKTtcclxuXHRcdHppcFdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTYXZlIHRoZSBiYXNlIHVybCB0byBsb2NhbCBzdG9yYWdlXHJcblx0XHRcdGxvY2FsU3RvcmFnZVsnY2FzZURhdGFDcmVhdGUnXSA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UuZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBSZWRpcmVjdCB0byB0aGUgbmV4dCBwYWdlXHJcblx0XHRcdHBhZ2UubmV4dCA9IE5FWFQuQk9BUkQ7XHJcblx0XHRcdHBhZ2UuY2xvc2UoKTtcclxuXHRcdFx0XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFN0YXJ0IHRoZSB3b3JrZXJcclxuXHRcdHppcFdvcmtlci5wb3N0TWVzc2FnZShldmVudC50YXJnZXQucmVzdWx0KTtcclxuXHRcdFxyXG5cdH07XHJcblx0cmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGV2ZW50LnRhcmdldC5maWxlc1swXSk7XHJcblx0XHJcbn1cclxuXHJcbnAuY2xvc2UgPSBmdW5jdGlvbigpe1xyXG5cdHNlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRpZih0aGlzLm9uY2xvc2UpXHJcblx0XHR0aGlzLm9uY2xvc2UoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaXRsZU1lbnU7XHJcbm1vZHVsZS5leHBvcnRzLk5FWFQgPSBORVhUOyJdfQ==
