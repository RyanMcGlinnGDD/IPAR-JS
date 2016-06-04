(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

document.documentElement.requestFullScreen = document.documentElement.requestFullScreen || document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen;

//imports
var Game = require('./modules/game/game.js');
var Point = require('./modules/helper/point.js');
var Constants = require('./modules/game/constants.js');
var Utilities = require('./modules/helper/utilities.js');
var TitleMenu = require('./modules/menus/titleMenu.js');
var CaseMenu = require('./modules/menus/caseMenu.js');
var ProfileMenu = require('./modules/menus/profileMenu.js');

// The current game
var game;

// The section holding the board
var boardSection;

// The current page the website is on
var curPage;
var menus = [];
var PAGE = Object.freeze({TITLE: 0, CASE: 1, PROFILE: 2, BOARD: 3});

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
			createGame();
			break;
		case TitleMenu.NEXT.CASE:
			curPage = PAGE.CASE;
			menus[PAGE.CASE].open();
			break;
		}
	}
	
	// Setup case menu
	menus[PAGE.CASE] = new CaseMenu(document.getElementById("caseMenu"));
	menus[PAGE.CASE].onclose = function(){
		switch(this.next){
		case CaseMenu.NEXT.NEW_PROFILE:
			console.log("LOADING NEW PROFILE MENU");
			curPage = PAGE.PROFILE;
			menus[PAGE.PROFILE].open(true);
			break;
		case CaseMenu.NEXT.OLD_PROFILE:
			console.log("LOADING OLD PROFILE MENU");
			curPage = PAGE.PROFILE;
			menus[PAGE.PROFILE].open(false);
			break;
		case CaseMenu.NEXT.TITLE:
			curPage = PAGE.TITLE;
			menus[PAGE.TITLE].open();
			break;
		}
	}
	
	//Setup profile menu
	menus[PAGE.PROFILE] = new ProfileMenu(document.getElementById("profileMenu"));
	menus[PAGE.PROFILE].onclose = function(){
		switch(this.next){
		case ProfileMenu.NEXT.BOARD:
			curPage = PAGE.BOARD;
			createGame();
			break;
		case ProfileMenu.NEXT.CASE:
			curPage = PAGE.CASE;
			menus[PAGE.CASE].open();
			break;
		}
	}
	
	
	// Open the title menu
    curPage = PAGE.TITLE;
    menus[PAGE.TITLE].open();
    
}

// create the game object and start the loop with a dt
function createGame(){
	
	// Show the section for the game
	boardSection.style.display = 'block';
	
    // Create the game
    game = new Game(document.getElementById("board"), Utilities.getScale(Constants.boardSize, new Point(window.innerWidth, window.innerHeight)));
    
    // Start the game loop
    gameLoop(Date.now());
    
}

//fires once per frame for the game
function gameLoop(prevTime){
	
    
	// get delta time
    var dt = Date.now() - prevTime;
    
    // update game
    game.update(dt);
    
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
},{"./modules/game/constants.js":6,"./modules/game/game.js":7,"./modules/helper/point.js":14,"./modules/helper/utilities.js":15,"./modules/menus/caseMenu.js":17,"./modules/menus/profileMenu.js":18,"./modules/menus/titleMenu.js":19}],2:[function(require,module,exports){
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

module.exports = Category;
},{"./question.js":3}],3:[function(require,module,exports){
"use strict";
var Utilities = require('../helper/utilities.js');
var Constants = require('../game/constants.js');
var Windows = require('../html/questionWindows.js');

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
    
    // Get and save the given index, correct answer, position, reveal threshold, image link, feedback, and connections
    this.correct = parseInt(xml.getAttribute("correctAnswer"));
    this.positionPercentX = Utilities.map(parseInt(xml.getAttribute("xPositionPercent")), 0, 100, 0, Constants.boardSize.x);
    this.positionPercentY = Utilities.map(parseInt(xml.getAttribute("yPositionPercent")), 0, 100, 0, Constants.boardSize.y);
    this.revealThreshold = parseInt(xml.getAttribute("revealThreshold"));
    //console.log(xml);
    this.imageLink = xml.getAttribute("imageLink");
    this.feedbacks = xml.getElementsByTagName("feedback");
    this.newFiles = false;
    this.files = [];
    var connectionElements = xml.getElementsByTagName("connections");
    this.connections = [];
    for(var i=0;i<connectionElements.length;i++)
    	this.connections[i] = parseInt(connectionElements[i].innerHTML);
    
    // Create the windows for this question based on the question type
    this.questionType = parseInt(xml.getAttribute("questionType"));
    this.justification = this.questionType==1 || this.questionType==3;
	if(this.questionType!=5){
		this.createTaskWindow(xml);
		this.createResourceWindow(xml, resources);
	}
	switch(this.questionType){
		case 5:
			this.createMessageWindow(xml);
			break;
		case 4:
			this.createFileWindow();
			break;
		case 3:
		case 2:
		case 1:
			this.createAnswerWindow(xml);
			break;
	}
    
}

var p = Question.prototype;

p.showPrevSubmittedFiles = function(files) {
	// acknowledge submitted files in task window
	if(files.length>0)
		this.feedback.innerHTML = 'Submitted Files:<br/>';
	else
		this.feedback.innerHTML = '';
	for(var i=0;i<files;i++)
		this.feedback.innerHTML += '<span class="feedbackI">'+files[i].name+'</span><br/>';
}

p.wrongAnswer = function(num){

  // If feeback display it
	if(this.feedbacks.length>0)
		this.feedback.innerHTML = '"'+String.fromCharCode(num + "A".charCodeAt())+
											'" is not correct <br/>&nbsp;<span class="feedbackI">'+
											this.feedbacks[num].innerHTML+'</span><br/>';
	
}

p.correctAnswer = function(){
	
	// Disable all the answer buttons
	if(this.answers)
		for(var i=0;i<this.answers.length;i++)
			this.answers[i].disabled = true;
	
	// If feedback display it
	if(this.feedbacks.length>0)
		this.feedback.innerHTML = '"'+String.fromCharCode(this.correct + "A".charCodeAt())+
											'" is the correct response <br/><span class="feedbackI">'+
											this.feedbacks[this.correct].innerHTML+'</span><br/>';
	
	
	if(this.questionType===3 && this.justification.value != '')
		this.feedback.innerHTML = 'Submitted Text:<br/><span class="feedbackI">'+this.justification.value+'</span><br/>';
	
	if(this.questionType===1 && this.justification.value != '')
		this.feedback.innerHTML += 'Submitted Text:<br/><span class="feedbackI">'+this.justification.value+'</span><br/>';
	
	if(this.questionType===4){
		if(this.files.length>0)
			this.feedback.innerHTML = 'Submitted Files:<br/>';
		else
			this.feedback.innerHTML = '';
		for(var i=0;i<this.files.length;i++)
			this.feedback.innerHTML += '<span class="feedbackI">'+this.files[i]+'</span><br/>';
	}
  
  if(this.currentState!=SOLVE_STATE.SOLVED && 
     (((this.questionType===3 || this.questionType===1) && this.justification.value != '') ||
      (this.questionType===4 && this.fileInput.files.length>0) ||
       this.questionType===2)){ 
    // Set the state of the question to correct
    this.currentState = SOLVE_STATE.SOLVED;
    // if there is a proceed button
    if (this.proceedElement) { 
		this.proceedElement.style.display = "block"; // animate proceed button
	}
  }
	
}

p.displayWindows = function(){
	
	// Add the windows to the window div
	var windowNode = this.windowDiv;
	var exitButton = new Image();
	exitButton.src = "img/iconClose.png";
	exitButton.className = "exit-button";
	var question = this;
	exitButton.onclick = function() { question.windowDiv.innerHTML = ''; };
	if(this.questionType===5){
		windowNode.appendChild(this.message);
	    exitButton.style.left = "75vw";
	}
	else{
		windowNode.appendChild(this.task);
		windowNode.appendChild(this.answer);
		windowNode.appendChild(this.resource);
		exitButton.style.left = "85vw";
	}
	if(this.currentState === SOLVE_STATE.SOLVED && this.questionType != QUESTION_TYPE.MESSAGE)  {
		// if there is a proceed button
		if (this.proceedElement) { 
			this.proceedElement.style.display = "block"; // animate proceed button
		}
	}
	
	windowNode.appendChild(exitButton);
	
}

p.createTaskWindow = function(xml){
	this.proceedElement = document.getElementById("proceedContainer");
	
	// Create the task window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.taskWindow;
    this.task = tempDiv.firstChild;
    this.task.innerHTML = this.task.innerHTML.replace("%title%", xml.getElementsByTagName("questionName")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%instructions%", xml.getElementsByTagName("instructions")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%question%", xml.getElementsByTagName("questionText")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.feedback = this.task.getElementsByClassName("feedback")[0];
}

p.createResourceWindow = function(xml, resourceFiles){
	
	// Create the resource window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.resourceWindow;
    this.resource = tempDiv.firstChild;
	
	// Get the template for individual resouces if any
	var resources = xml.getElementsByTagName("resourceIndex");
    if(resources.length > 0){
    	
    	// Get the html for each resource and then add the result to the window
    	var resourceHTML = '';
	    for(var i=0;i<resources.length;i++){
    		var curResource = Windows.resource.replace("%icon%", resourceFiles[parseInt(resources[i].innerHTML)].icon);
	    	curResource = curResource.replace("%title%", resourceFiles[parseInt(resources[i].innerHTML)].title);
	    	curResource = curResource.replace("%link%", resourceFiles[parseInt(resources[i].innerHTML)].link);
	    	resourceHTML += curResource;
	    }
	  	this.resource.innerHTML = this.resource.innerHTML.replace("%resources%", resourceHTML);
		        
	}
	else{
		// Display that there aren't any resources
		this.resource.innerHTML = this.resource.innerHTML.replace("%resources%", "No resources have been provided for this task.");
		this.resource.getElementsByClassName("windowContent")[0].style.color = "grey";
		this.resource.getElementsByClassName("windowContent")[0].style.backgroundColor = "#FFFFFF";
		this.resource.getElementsByClassName("windowContent")[0].className += ", center";
	}
}

p.createAnswerWindow = function(xml){
	
	// Create the answer window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.answerWindow;
    this.answer = tempDiv.firstChild;
    
    // Create the text element if any
    var question = this;
    var submit;
    if(this.justification){
    	this.justification = document.createElement("textarea");
    	this.justification.submit = document.createElement("button");
    	this.justification.submit.className = "submit";
    	this.justification.submit.innerHTML = "Submit";
        this.justification.submit.disabled = true;
        this.justification.submit.onclick = function() {
        	question.correctAnswer();
    	};
    	this.justification.addEventListener('input', function() {
    		if(question.justification.value.length > 0)
    			question.justification.submit.disabled = false;
    		else
    			question.justification.submit.disabled = true;
    	}, false);
    }
    
    // Create and get all the answer elements
    this.answers = [];
    var answersXml = xml.getElementsByTagName("answer");
    var correct = parseInt(xml.getAttribute("correctAnswer"));
    for(var i=0;i<answersXml.length;i++){
    	if(this.justification)
    		this.justification.disabled = true;
    	this.answers[i] = document.createElement("button");
    	if(correct===i)
    		this.answers[i].className = "correct";
    	else
    		this.answers[i].className = "wrong";
    	this.answers[i].innerHTML = String.fromCharCode(i + "A".charCodeAt())+". "+answersXml[i].innerHTML;
    }
    
    // Create the events for the answers
    for(var i=0;i<this.answers.length;i++){
	  if(this.answers[i].className == "wrong"){
		this.answers[i].num = i;
        this.answers[i].onclick = function(){
          this.disabled = true;
		  question.wrongAnswer(this.num);
	    };
      }
      else{
    	this.answers[i].onclick = function(){
	      if(question.justification)
	        question.justification.disabled = false;
	      question.correctAnswer();
	    };
      }
    }
    
    // Add the answers to the window
    for(var i=0;i<this.answers.length;i++)
      this.answer.getElementsByClassName("windowContent")[0].appendChild(this.answers[i]);
    if(this.justification){
    	this.answer.getElementsByClassName("windowContent")[0].appendChild(this.justification);
    	this.answer.getElementsByClassName("windowContent")[0].appendChild(this.justification.submit);
    }
}

p.createFileWindow = function(){
	
	// Create the file window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.fileWindow;
    this.answer = tempDiv.firstChild;
    this.fileInput = this.answer.getElementsByTagName("input")[0];
    var question = this;
    this.answer.getElementsByClassName("fileButton")[0].onclick = function(){
    	console.log("FILE BUTTON CLICKED!");
    	question.fileInput.click();
    }
    this.fileInput.addEventListener("change", function(event){
    	question.newFiles = true;
    	question.files = [];
    	for(var i=0;i<event.target.files.length;i++)
    		question.files[i] = event.target.files[i].name;
	    question.correctAnswer();
    });
    
}

p.createMessageWindow = function(xml){
	
	// Create the message window 
	var tempDiv = document.createElement("DIV");
	tempDiv.innerHTML = Windows.messageWindow;
    this.message = tempDiv.firstChild;
    this.message.innerHTML = this.message.innerHTML.replace("%title%", xml.getElementsByTagName("questionName")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.message.innerHTML = this.message.innerHTML.replace("%instructions%", xml.getElementsByTagName("instructions")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.message.innerHTML = this.message.innerHTML.replace("%question%", xml.getElementsByTagName("questionText")[0].innerHTML.replace(/\n/g, '<br/>'));
    var question = this;
    this.message.getElementsByTagName("button")[0].onclick = function() {
    	question.currentState = SOLVE_STATE.SOLVED;
    	question.windowDiv.innerHTML = '';
    };

}

module.exports = Question;
module.exports.SOLVE_STATE = SOLVE_STATE;
},{"../game/constants.js":6,"../helper/utilities.js":15,"../html/questionWindows.js":16}],4:[function(require,module,exports){
"use strict";
var Question = require("./question.js");

// Creates a category with the given name and from the given xml
function Resource(xml){
	
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
	  this.link = xml.getAttribute("link");
    
}

module.exports = Resource;
},{"./question.js":3}],5:[function(require,module,exports){
"use strict";
var Utilities = require('../helper/utilities.js');
var Point = require('../helper/point.js');
var Question = require("../case/question.js");
var Constants = require("./constants.js");
var DrawLib = require("../helper/drawlib.js");

//parameter is a point that denotes starting position
function board(section, startPosition, lessonNodes){
	
	// Create the canvas for this board and add it to the section
	this.canvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext('2d');
	this.canvas.style.display = 'none';
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
	section.appendChild(this.canvas);
	
	var board = this;
	this.canvas.addEventListener('animationend', function(){
		if(board.loaded)
			board.loaded();
	}, false);
	
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
	
	// for each  node
    for(var i=0; i<this.lessonNodeArray.length; i++){
    	var activeNode = this.lessonNodeArray[i]; 
		// handle solved question
		if (activeNode.currentState != Question.SOLVE_STATE.SOLVED && activeNode.question.currentState == Question.SOLVE_STATE.SOLVED) {
			
			// update each connection's connection number
			for (var j = 0; j < activeNode.question.connections.length; j++)
				this.lessonNodeArray[activeNode.question.connections[j] - 1].connections++;
			
			// Update the node's state
			activeNode.currentState = activeNode.question.currentState;
			
			// Check if all node's are solved
			var done = true;
			for(var i=0;i<this.lessonNodeArray.length && done;i++)
				if(this.lessonNodeArray[i].currentState!=Question.SOLVE_STATE.SOLVED)
					done = false;
			if(done)
				this.finished = true;
			
			// If there is a listener for updating nodes, call it.
			if(this.updateNode)
				this.updateNode();
			
		}

		// update the node's transition progress
		if (activeNode.question.currentState == Question.SOLVE_STATE.SOLVED)
			activeNode.linePercent = Math.min(1,dt*Constants.lineSpeed + activeNode.linePercent);
	}
    
    // Check mouse events if given a mouse state
    if(pMouseState) {
	    
	    // hover states
		//for(var i = 0; i < boardArray.length; i++){
			// loop through lesson nodes to check for hover
			// update board
		
	    if (!pMouseState.mouseDown && this.target) {
			this.target.dragPosition = undefined; // clear drag behavior
			this.target.dragging = false;
			this.target = null;
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
		if(this.target){
	
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
			}
			else{
				var naturalX = pMouseState.virtualPosition.x - this.target.dragPosition.x;
				this.target.position.x = Math.max(Constants.boardOutline,Math.min(naturalX,Constants.boardSize.x - Constants.boardOutline));
				this.target.question.positionPercentX = this.target.position.x;
				var naturalY = pMouseState.virtualPosition.y - this.target.dragPosition.y;
				this.target.position.y = Math.max(Constants.boardOutline,Math.min(naturalY,Constants.boardSize.y - Constants.boardOutline));
				this.target.question.positionPercentY = this.target.position.y;
			}
			
	  }
		
		// drag the board around
		if (this.target==null) {
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
			}
	    }
    }
}

p.draw = function(gameScale){
    
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
    
	// draw the nodes
    for(var i = 0; i < this.lessonNodeArray.length; i++){
    
    	// temporarily hide all but the first question						// something is wrong here, linksAwayFromOrigin does not exist anymore
		//if (this.lessonNodeArray[i].question.revealThreshold > this.lessonNodeArray[i].linksAwayFromOrigin) continue;
    	
    	// draw the node itself
        this.lessonNodeArray[i].draw(this.ctx, this.canvas);
    }

	// draw the lines
	for(var i=0; i<this.lessonNodeArray.length; i++){
		
		// only show lines from solved questions
		if (this.lessonNodeArray[i].question.currentState!=Question.SOLVE_STATE.SOLVED) continue;
		
		// get the pin position
        var oPos = this.lessonNodeArray[i].getNodePoint();
        
		// set line style
        this.ctx.strokeStyle = "rgba(0,0,105,0.2)";
        this.ctx.lineWidth = 1;
        
        // draw lines
        for (var j=0; j<this.lessonNodeArray[i].question.connections.length; j++) {
        	
        	// -1 becase node connection index values are 1-indexed but connections is 0-indexed
			if (this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1].question.currentState==Question.SOLVE_STATE.HIDDEN) continue;
        	
        	// go to the index in the array that corresponds to the connected node on this board and save its position
        	// connection index saved in the lessonNode's question
        	var connection = this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1];
        	var cPos = connection.getNodePoint();
        	
        	// draw the line
        	this.ctx.beginPath();
        	// translate to start (pin)
        	this.ctx.moveTo(oPos.x, oPos.y);
        	this.ctx.lineTo(oPos.x + (cPos.x - oPos.x)*this.lessonNodeArray[i].linePercent, oPos.y + (cPos.y - oPos.y)*this.lessonNodeArray[i].linePercent);
        	this.ctx.closePath();
        	this.ctx.stroke();
        }
    }
    
	this.ctx.restore();
};

// Gets a free node in this board (i.e. not unsolved) returns null if none
p.getFreeNode = function() {
	for(var i=0; i<this.lessonNodeArray.length; i++){
		if(this.lessonNodeArray[i].question.currentState == Question.SOLVE_STATE.UNSOLVED)
			return this.lessonNodeArray[i];}
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
	console.log("window closed:"+this.lastQuestion.newFiles);
	// if it is file type
	if (this.lastQuestion.newFiles) {
		// add a file to the file system
		this.lastQuestion.newFiles = false;
		return { 
			files: this.lastQuestion.fileInput.files, 
			question: this.lastQuestion.num
		}
	}
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
var proceedContainer;
var proceedLong;
var proceedRound;

// Used for pinch zoom
var pinchStart;

// Used for waiting a second to close windows
var pausedTime = 0;

//phase handling
var phaseObject;

function game(section, baseScale){
	var game = this;
	this.active = false;
	this.saveFiles = [];
	
	// Get and setup the window elements
	windowDiv = document.getElementById('window');
    proceedContainer = document.getElementById('proceedContainer');
    proceedLong = document.getElementById('proceedBtnLong');
    proceedRound = document.getElementById('proceedBtnRound');
	windowFilm = document.getElementById('windowFlim');
	windowFilm.onclick = function() { windowDiv.innerHTML = ''; };
	
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
	
	// Save the given scale
	this.scale = baseScale;
	
	// Load the case file
	var loadData = FileManager.loadCase(JSON.parse(localStorage['caseData']), document.querySelector('#'+section.id+' #window'));
	
	// Create the boards
	this.categories = loadData.categories;
	this.createLessonNodes(section);
	
	// Display the current board
	this.activeBoardIndex = loadData.category;
	this.active = true;
	this.boardArray[this.activeBoardIndex].show();
	this.boardArray[this.activeBoardIndex].button.className = "active";
	this.updateNode();
	zoomSlider.value = -this.getZoom();
	
	// Setup the save button
	FileManager.prepareZip(document.querySelector('#'+section.id+' #blob'));
}

var p = game.prototype;

p.createLessonNodes = function(section){
	this.boardArray = [];
	var bottomBar = document.querySelector('#'+section.id+' #bottomBar');
	for(var i=0;i<this.categories.length;i++){
		// initialize empty
		
		this.lessonNodes = [];
		// add a node per question
		for (var j = 0; j < this.categories[i].questions.length; j++) {
			// create a new lesson node
			this.lessonNodes.push(new LessonNode(new Point(this.categories[i].questions[j].positionPercentX, this.categories[i].questions[j].positionPercentY), this.categories[i].questions[j].imageLink, this.categories[i].questions[j] ) );
			// attach question object to lesson node
			this.lessonNodes[this.lessonNodes.length-1].question = this.categories[i].questions[j];
		
		}

		// create a board
		this.boardArray[i] = new Board(section, new Point(Constants.boardSize.x/2, Constants.boardSize.y/2), this.lessonNodes);
		var button = document.createElement("BUTTON");
		button.innerHTML = this.categories[i].name;
		var game = this;
		button.onclick = (function(i){ 
			return function() {
				if(game.active){
					game.changeBoard(i);
				}
		}})(i);
		if(i!=0 && !this.boardArray[i-1].finished)
			button.disabled = true;
		bottomBar.appendChild(button);
		this.boardArray[i].button = button;
		var game = this;
		this.boardArray[i].updateNode = function(){game.updateNode();};
	}
	
	this.mouseState = new MouseState(this.boardArray);
	
}

p.update = function(dt){
	
    if(this.active){
    
    	// perform game actions
    	this.act(dt);
    	
	    // draw stuff
	    this.boardArray[this.activeBoardIndex].draw(this.scale);
	    
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
    this.boardArray[this.activeBoardIndex].act(this.scale, (this.zoomin || this.zoomout ? null : this.mouseState), dt);
    
    // Check if new board available
    if(this.activeBoardIndex < this.boardArray.length-1 &&
    		this.boardArray[this.activeBoardIndex+1].button.disabled && 
    		this.boardArray[this.activeBoardIndex].finished){
    	this.boardArray[this.activeBoardIndex+1].button.disabled = false;
    	this.prompt = true;
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
			
			if(this.prompt){
		    	windowDiv.innerHTML = '<div class="windowPrompt"><div><h1>The "'+this.categories[this.activeBoardIndex+1].name+'" category is now available!</h1></div></div>';
		    	var zoomin = function(){
					windowDiv.removeEventListener('animationend', zoomin);
					setTimeout(function(){
						windowDiv.style.animation = 'promptFade 1s';
						var fadeout = function(){
							windowDiv.removeEventListener('animationend', fadeout);
							windowDiv.innerHTML = '';
							windowDiv.style.animation = '';
						}
						windowDiv.addEventListener('animationend', fadeout, false);
					}, 500);
				};
				windowDiv.style.animation = 'openWindow 0.5s';
		    	windowDiv.addEventListener('animationend', zoomin, false);
		    	this.prompt = false;
			}
			
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
					game.updateNode();
				}
			}
		}
	} // If there is a new node zoom into it
	else if(this.zoomin){ 
		
		// Get the current board
		var board = this.boardArray[this.activeBoardIndex];
		
		// If board is not finished look for next node
		if(!board.finished && this.targetNode==null){
			this.targetNode = board.getFreeNode();
		}
		else if(board.finished){
			this.zoomin = false;
			this.zoomout = true;
		}
		
		// Start moving and zooming if target found
		if(this.zoomin && this.targetNode){
	
			// Zoom in and move towards target node
			if(this.getZoom()<Constants.endZoom)
				board.zoom += dt*Constants.zoomSpeed;
			else if(this.getZoom()>Constants.endZoom)
				board.zoom = Constants.endZoom;
			board.moveTowards(this.targetNode.position, dt, Constants.zoomMoveSpeed);

			// Update the zoom slider
			zoomSlider.value = -this.getZoom();
			
			// If reached the node and zoomed in stop and get rid of the target
			if(this.getZoom()==Constants.endZoom && board.boardOffset.x==this.targetNode.position.x && board.boardOffset.y==this.targetNode.position.y){
				this.zoomin = false;
				this.targetNode = null;
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

p.updateNode = function(){
	this.zoomin = true;
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
	proceedContainer.style.display = 'none';
	
	this.save();
	
}

p.save = function(){
	
	// Get the current case data
	var caseData = JSON.parse(localStorage['caseData']);
	caseData.saveFile = DataParser.createXMLSaveFile(this.activeBoardIndex, this.boardArray, true);
	
	// Autosave on window close
	var filesToStore = this.boardArray[this.activeBoardIndex].windowClosed();
	if (filesToStore){
		filesToStore.board = this.activeBoardIndex;
		this.saveFiles.push(filesToStore);
		this.nextFileInSaveStack(caseData);
	}
	localStorage['caseData'] = JSON.stringify(caseData);
	
}

p.nextFileInSaveStack = function(caseData){
	
	var curData = JSON.parse(localStorage['caseData']);
	curData.submitted = caseData.submitted;
	localStorage['caseData'] = JSON.stringify(curData);
	
	if(this.saveFiles.length>0){
		FileManager.removeFilesFor(caseData, this.saveFiles[0]);
		FileManager.addNewFilesToSystem(caseData, this.saveFiles[0], this.nextFileInSaveStack.bind(this));
	}
	this.saveFiles.shift();
}

module.exports = game;

},{"../helper/drawlib.js":10,"../helper/fileManager.js":11,"../helper/iparDataParser.js":12,"../helper/mouseState.js":13,"../helper/point.js":14,"./board.js":5,"./constants.js":6,"./lessonNode.js":8}],8:[function(require,module,exports){
"use strict";
var DrawLib = require('../helper/drawLib.js');
var Question = require("../case/question.js");
var Constants = require("./constants.js");
var Point = require('../helper/point.js');

var CHECK_IMAGE = "img/iconPostItCheck.png";

//parameter is a point that denotes starting position
function lessonNode(startPosition, imagePath, pQuestion){
    
    this.position = startPosition;
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
            that.width = that.width * x;
            that.height = that.height * x;
        }
        if(that.width > maxDimension || that.height > maxDimension){
            var x;
            if(that.width > that.height){
                x = that.width / maxDimension;
            }
            else{
                x = that.height / maxDimension;
            }
            that.width = that.width / x;
            that.height = that.height / x;
        }
        

        that.position.x += that.width/2;
        that.position.y += that.height/2;
    };
    
    this.image.src = imagePath;
    this.check.src = CHECK_IMAGE;
}

var p = lessonNode.prototype;

p.draw = function(ctx, canvas){

	// Check if question is visible
	if(this.question.currentState==Question.SOLVE_STATE.HIDDEN){
		if(this.question.revealThreshold <= this.connections){
			this.question.currentState = Question.SOLVE_STATE.UNSOLVED;
			this.currentState = this.question.currentState;
		}
		else
			return;
	}
	
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
    switch (this.question.currentState) {
    	case 1:
    		ctx.fillStyle = "blue";
			ctx.strokeStyle = "cyan";
			break;
     	case 2:
     		ctx.drawImage(this.check, this.position.x + this.width/2 - Constants.boardSize.x/50, this.position.y + this.height/2 - Constants.boardSize.x/50, Constants.boardSize.x/50, Constants.boardSize.x/50);
    		ctx.fillStyle = "green";
			ctx.strokeStyle = "yellow";
			break;
    }
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
	var categories = Parser.getCategoriesAndQuestions(xmlData, windowDiv);
	
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
		console.log(categories[1].questions[4].files);
		console.log(categories[1].questions[4].imageLink);
		Parser.assignQuestionStates(categories, saveData.getElementsByTagName("question"));
	}
	else
		stage = 1;
	
	// return results
	return {categories: categories, category:stage-1}; // maybe stage + 1 would be better because they are not zero indexed?
			   
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
	
	var caseData = JSON.parse(localStorage['caseData']);
	
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
var Resource = require("../case/resources.js");
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

// takes the xml structure and fills in the data for the question object
m.getCategoriesAndQuestions = function(xmlData, windowDiv) {
	// if there is a case file
	if (xmlData != null) {
		
		// Get player data 
		firstName = xmlData.getElementsByTagName("case")[0].getAttribute("profileFirst");
		lastName = xmlData.getElementsByTagName("case")[0].getAttribute("profileLast");
		xmlData.getElementsByTagName("case")[0].getAttribute("profileMail");
		
		// First load the resources
		var resourceElements = xmlData.getElementsByTagName("resourceList")[0].getElementsByTagName("resource");
		var resources = [];
		for (var i=0; i<resourceElements.length; i++) {
			// Load each resource
			resources[i] = new Resource(resourceElements[i]);
		}
		
		// Then load the categories
		var categoryElements = xmlData.getElementsByTagName("category");
		var categoryNames = xmlData.getElementsByTagName("categoryList")[0].getElementsByTagName("element");
		var categories = [];
		for (var i=0; i<categoryElements.length; i++) {
			// Load each category (which loads each question)
			categories[i] = new Category(categoryNames[i].innerHTML, categoryElements[i], resources, windowDiv);
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
var mousePosition, relativeMousePosition;
var mouseDownTimer, maxClickDuration;
var mouseWheelVal;
var prevTime;
var deltaY;
var scaling, touchZoom, startTouchZoom;

function mouseState(boards){
	mousePosition = new Point(0,0);
    relativeMousePosition = new Point(0,0);
    this.virtualPosition = new Point(0,0);
    
    //event listeners for mouse interactions with the canvases
    var mouseState = this;
    for(var i=0;i<boards.length;i++){
    	var canvas = boards[i].canvas;
	    canvas.addEventListener("mousemove", function(e){
	    	e.preventDefault();
	        updatePosition(e);
	    });
	    canvas.addEventListener("touchmove", function(e){
	    	e.preventDefault();
	    	if(scaling)
	    		updateTouchPositions(e);
	    	else
	    		updatePosition(e.touches[0]);
	    });
	    canvas.addEventListener("mousedown", function(e){
	    	e.preventDefault();
	    	mouseState.mouseDown = true;
	    });
	    canvas.addEventListener("touchstart", function(e){
	    	e.preventDefault();
	    	if(e.touches.length == 1 && !scaling){
		        updatePosition(e.touches[0]);
		        setTimeout(function(){
		        	mouseState.mouseDown = true;
		        });
	    	}
	    	else if(e.touches.length == 2){
	    		mouseState.mouseDown = false;
	    		scaling = true;
	    		updateTouchPositions(e);
	    		startTouchZoom = touchZoom;
	    	}
	    });
	    canvas.addEventListener("mouseup", function(e){
	    	e.preventDefault();
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
    
    // Set variable defaults
    this.mouseDown = false;
    this.mouseIn = false;
    mouseDownTimer = 0;
    deltaY = 0;
    this.mouseWheelDY = 0;
    this.zoomDiff = 0;
    touchZoom = 0;
    this.mouseClicked = false;
    maxClickDuration = 200;
	
}

function updatePosition(e){
    mousePosition = new Point(e.clientX, e.clientY);
    relativeMousePosition = new Point(mousePosition.x - (window.innerWidth/2.0), mousePosition.y - (window.innerHeight/2.0));
}

function updateTouchPositions(e){
	var curTouches = [
	               new Point(e.touches[0].clientX, e.touches[0].clientY),
	               new Point(e.touches[1].clientX, e.touches[1].clientY)
	];
	touchZoom = Math.sqrt(Math.pow(curTouches[0].x-curTouches[1].x, 2)+Math.pow(curTouches[0].y-curTouches[1].y, 2));
}

var p = mouseState.prototype;

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

m.taskWindow = '\
<div class="window task">\
	<div class="title">\
		Task\
	</div>\
	<div class="windowContent" style="overflow-y: scroll;height:35vh;">\
		<h3><b>%title%</b></h3>\
		<p>%instructions%</p>\
		<hr>\
		<p><b>%question%</b></p>\
		<hr>\
		<p class="feedback"></p>\
	</div>\
</div>\
';


m.resourceWindow = '\
<div class="window resource">\
	<div class="title">\
		Resource\
	</div>\
	<div class="windowContent" style="overflow-y: scroll; height:20vh;">\
		%resources%\
	</div>\
</div>\
';

m.resource = '\
<div class="resourceItem">\
  <img src="%icon%"/>\
  %title%\
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
	\
	</div>\
</div>\
';

m.fileWindow = '\
<div class="window file">\
  <div class="title">\
    Files\
  </div>\
  <div class="windowContent" style="height:25vh;min-height: 100px;">\
	<div class="fileButton full">\
		<img src="img/iconFileSubmit.png"/><br>\
		Browse And Submit\
	</div>\
    <input type="file" style="display:none;" multiple/>\
  </div>\
</div>\
';

m.messageWindow = '\
<div class="window message">\
	<div class="title">\
		Message\
	</div>\
	<div class="windowContent" style="height:80vh;overflow-y:scroll;">\
		<p><b>From </b>%title%</p>\
		<hr>\
		<p><b>Subject </b>%instructions%</p>\
		<hr>\
		<p>%question%</p>\
	  <button>Mark as Read</button>\
	</div>\
</div>\
';
},{}],17:[function(require,module,exports){
var Utilities = require('../helper/utilities.js');

// HTML
var section;

// Elements
var title, description;
var resume, start, back;

// The next page to open when this one closes
var next;

var NEXT = Object.freeze({NONE: 0, TITLE: 1, NEW_PROFILE: 2, OLD_PROFILE: 3});

function CaseMenu(pSection){
	section = pSection;
	next = NEXT.NONE;
	
	// Get the html elements
	title = document.querySelector('#'+section.id+' #title');
	description = document.querySelector('#'+section.id+' #description');
	resume = document.querySelector('#'+section.id+' #resume-button');
	start = document.querySelector('#'+section.id+' #start-button');
	back = document.querySelector('#'+section.id+' #back-button');
	
	// Setup the buttons
    var page = this;
    resume.onclick = function(){
    	page.next = NEXT.OLD_PROFILE;
    	page.close();
    };
    start.onclick = function(){
    	page.next = NEXT.NEW_PROFILE;
    	page.close();
    };
    back.onclick = function(){
    	page.next = NEXT.TITLE;
    	page.close();
    };
}

var p = CaseMenu.prototype;

p.open = function(){
	
	// Display the section holding the menu
	section.style.display = '';
	
	// Get the current case data from local storage
	var caseData = JSON.parse(localStorage['caseData']);
	
	// Get the case name and description from the xml
	var curCase = Utilities.getXml(caseData.caseFile).getElementsByTagName("case")[0];
	title.innerHTML = curCase.getAttribute("caseName");
	description.innerHTML = curCase.getAttribute("description");
	
	// Get the case save status
	caseStatus = Utilities.getXml(caseData.saveFile).getElementsByTagName("case")[0].getAttribute("caseStatus");
	var statusMessage = "";
	switch(caseStatus){
		case '0':
			statusMessage = "";
			resume.disabled = true;
			break;
		case '1':
			statusMessage = " [In Progress]";
			break;
		case '2':
			statusMessage = " [Completed]";
			break;
	}
    title.innerHTML += statusMessage;
    
}

p.close = function(){
	section.style.display = 'none';
	if(this.onclose)
		this.onclose();
}

module.exports = CaseMenu;
module.exports.NEXT = NEXT;
},{"../helper/utilities.js":15}],18:[function(require,module,exports){
var Utilities = require('../helper/utilities.js');

// HTML
var section;

//Elements
var title;
var firstName, lastName, email;
var firstNameInput, lastNameInput, emailInput;
var proceed, back;

// If making a new profile or not
var newProfile;

// The cur case
var curCase;

// The next page to open when this one closes
var next;

var NEXT = Object.freeze({NONE: 0, CASE: 1, BOARD: 2});

function ProfileMenu(pSection){
	section = pSection;
	next = NEXT.NONE;
	
	// Get the html elements
	title = document.querySelector('#'+section.id+' #title');
	firstName = document.querySelector('#'+section.id+' #first-name');
	lastName = document.querySelector('#'+section.id+' #last-name');
	email = document.querySelector('#'+section.id+' #email');
	firstNameInput = document.querySelector('#'+section.id+' #input-first-name');
	lastNameInput = document.querySelector('#'+section.id+' #input-last-name');
	emailInput = document.querySelector('#'+section.id+' #input-email');
	proceed = document.querySelector('#'+section.id+' #proceed-button');
	back = document.querySelector('#'+section.id+' #back-button');
    
	// Setup the buttons
	back.onclick = function(){
    	page.next = NEXT.CASE;
    	page.close();
    };
	var page = this;
    proceed.onclick = function(){
    	page.next = NEXT.BOARD;
    	if(newProfile){
			curCase.setAttribute("profileFirst", firstNameInput.value);
			curCase.setAttribute("profileLast", lastNameInput.value);
			curCase.setAttribute("profileMail", emailInput.value);
			curCase.setAttribute("caseStatus", "0");
    	}
    	else
			curCase.setAttribute("caseStatus", "1");
    	var caseData = JSON.parse(localStorage['caseData']);
    	caseData.saveFile = new XMLSerializer().serializeToString(curCase);
		localStorage['caseData'] = JSON.stringify(caseData);
    	page.close();
    };
}

var p = ProfileMenu.prototype;

p.open = function(pNewProfile){

	
	// Save the status of new profile for the procceed button
	newProfile = pNewProfile;
	
	// Make the menu visible
	section.style.display = '';
	
	// The case data and the title element
	var caseData = JSON.parse(localStorage['caseData']);
	
	// Get the case
	var saveFile = Utilities.getXml(caseData.saveFile);
	curCase = saveFile.getElementsByTagName("case")[0];
	
	// Set up the page for a new profile
	if(newProfile){
		
		// Update the title
		title.innerHTML = "Enter Profile Information";
		
		// Display the inputs and clear the names
		email.style.display = '';
		firstNameInput.style.display = '';
		lastNameInput.style.display = '';
		firstName.innerHTML = '';
		lastName.innerHTML = '';
		
		
		// Make it so that proceed is disabled until all three inputs have values
		var checkProceed = function(){
			if(firstNameInput.value=="" ||
				lastNameInput.value=="" ||
				emailInput.value=="")
				proceed.disabled = true;
			else
				proceed.disabled = false;
		};
		firstNameInput.addEventListener('change', checkProceed);
		lastNameInput.addEventListener('change', checkProceed);
		emailInput.addEventListener('change', checkProceed);
		checkProceed();
		
	}
	// Set up the page for an old profile
	else{
		
		// Update the title
		title.innerHTML = "Confirm Profile Information";
		
		// Hide the email and textboxes and display the current name
		email.style.display = 'none';
		firstNameInput.style.display = 'none';
		lastNameInput.style.display = 'none';
		firstName.innerHTML = curCase.getAttribute("profileFirst");
		firstName.style.fontWeight = 'bold';
		lastName.innerHTML = curCase.getAttribute("profileLast");
		lastName.style.fontWeight = 'bold';
		
		// Make procceed not disabled
		proceed.disabled = false;
		
	}
	
}

p.close = function(){
	section.style.display = 'none';
	if(this.onclose)
		this.onclose();
}

module.exports = ProfileMenu;
module.exports.NEXT = NEXT;
},{"../helper/utilities.js":15}],19:[function(require,module,exports){

// HTML
var section;

// Parts of the html
var loadInput, loadButton, demoButton, continueButton;

// The next page to open when this one closes
var next;

var NEXT = Object.freeze({NONE: 0, BOARD: 1, CASE: 2});

function TitleMenu(pSection){
	section = pSection;
	next = NEXT.NONE;
	
	// Get the load button and input
	loadInput = document.querySelector('#'+section.id+' #load-input');
	loadButton = document.querySelector('#'+section.id+' #load-button');
	demoButton = document.querySelector('#'+section.id+' #demo-button');
	continueButton = document.querySelector('#'+section.id+' #continue-button');
	
	// Setup the buttons
	demoButton.onclick = this.demo.bind(this);
	loadButton.onclick = loadInput.click.bind(loadInput);
	loadInput.addEventListener('change', this.loadFile.bind(this), false);
	continueButton.onclick = this.close.bind(this);
}

var p = TitleMenu.prototype;

p.open = function(){
	
	// Setup continue button based on local stoarge
	if(localStorage['caseData'])
		continueButton.disabled = false;
	else
		continueButton.disabled = true;
	this.next = NEXT.BOARD;
	
	// Display the section holding the menu
	section.style.display = '';
	
	// Set the button to not disabled in case coming back to this menu
	loadButton.disabled = false;
	loadInput.disabled = false;
	demoButton.disabled = false;
	
}

p.demo = function(){

	if(localStorage['caseData'] && !confirm("Are you sure you want to start a new case? Your autosave data will be lost!"))
		return;
		
	// Set the button to disabled so that it can't be pressed while loading
	loadButton.disabled = true;
	loadInput.disabled = true;
	demoButton.disabled = true;
	
	var page = this;
	var request = new XMLHttpRequest();
	request.responseType = "arraybuffer";
	request.onreadystatechange = function() {
	  if (request.readyState == 4 && request.status == 200) {
		  	
		 	// since the user is loading a fresh file, clear the autosave (soon we won't use this at all)
			localStorage.setItem("autosave","");
			localStorage['caseName'] = "demo.ipar";
			
			// Create a worker for unzipping the file
			var zipWorker = new Worker("lib/unzip.js");
			zipWorker.onmessage = function(message) {
				
				// Save the base url to local storage
				localStorage['caseData'] = JSON.stringify(message.data);
				
				// call the callback
				page.next = NEXT.BOARD;
				console.log(message.data);
				page.close();
			}
			
			// Start the worker
			zipWorker.postMessage(request.response);
	  }
	};
	request.open("GET", "demo.ipar", true);
	request.send();
	
}

p.loadFile = function(event){
	
	if(localStorage['caseData'] && !confirm("Are you sure you want to start a new case? Your autosave data will be lost!"))
		return;
	
	// Make sure a ipar file was choosen
	if(!loadInput.value.endsWith("ipar")){
		alert("You didn't choose an ipar file! you can only load ipar files!");
		return;
	}
	localStorage['caseName'] = event.target.files[0].name;

	// Set the button to disabled so that it can't be pressed while loading
	loadButton.disabled = true;
	loadInput.disabled = true;
	demoButton.disabled = true;
	
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
			localStorage['caseData'] = JSON.stringify(message.data);
			
			// Redirect to the next page
			page.next = NEXT.CASE;
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
},{}]},{},[1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwianMvbW9kdWxlcy9jYXNlL2NhdGVnb3J5LmpzIiwianMvbW9kdWxlcy9jYXNlL3F1ZXN0aW9uLmpzIiwianMvbW9kdWxlcy9jYXNlL3Jlc291cmNlcy5qcyIsImpzL21vZHVsZXMvZ2FtZS9ib2FyZC5qcyIsImpzL21vZHVsZXMvZ2FtZS9jb25zdGFudHMuanMiLCJqcy9tb2R1bGVzL2dhbWUvZ2FtZS5qcyIsImpzL21vZHVsZXMvZ2FtZS9sZXNzb25Ob2RlLmpzIiwianMvbW9kdWxlcy9oZWxwZXIvZHJhd0xpYi5qcyIsImpzL21vZHVsZXMvaGVscGVyL2ZpbGVNYW5hZ2VyLmpzIiwianMvbW9kdWxlcy9oZWxwZXIvaXBhckRhdGFQYXJzZXIuanMiLCJqcy9tb2R1bGVzL2hlbHBlci9tb3VzZVN0YXRlLmpzIiwianMvbW9kdWxlcy9oZWxwZXIvcG9pbnQuanMiLCJqcy9tb2R1bGVzL2hlbHBlci91dGlsaXRpZXMuanMiLCJqcy9tb2R1bGVzL2h0bWwvcXVlc3Rpb25XaW5kb3dzLmpzIiwianMvbW9kdWxlcy9tZW51cy9jYXNlTWVudS5qcyIsImpzL21vZHVsZXMvbWVudXMvcHJvZmlsZU1lbnUuanMiLCJqcy9tb2R1bGVzL21lbnVzL3RpdGxlTWVudS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbFNjcmVlbiA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbFNjcmVlbiB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuO1xyXG5cclxuLy9pbXBvcnRzXHJcbnZhciBHYW1lID0gcmVxdWlyZSgnLi9tb2R1bGVzL2dhbWUvZ2FtZS5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL21vZHVsZXMvaGVscGVyL3BvaW50LmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL21vZHVsZXMvZ2FtZS9jb25zdGFudHMuanMnKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oZWxwZXIvdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBUaXRsZU1lbnUgPSByZXF1aXJlKCcuL21vZHVsZXMvbWVudXMvdGl0bGVNZW51LmpzJyk7XHJcbnZhciBDYXNlTWVudSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tZW51cy9jYXNlTWVudS5qcycpO1xyXG52YXIgUHJvZmlsZU1lbnUgPSByZXF1aXJlKCcuL21vZHVsZXMvbWVudXMvcHJvZmlsZU1lbnUuanMnKTtcclxuXHJcbi8vIFRoZSBjdXJyZW50IGdhbWVcclxudmFyIGdhbWU7XHJcblxyXG4vLyBUaGUgc2VjdGlvbiBob2xkaW5nIHRoZSBib2FyZFxyXG52YXIgYm9hcmRTZWN0aW9uO1xyXG5cclxuLy8gVGhlIGN1cnJlbnQgcGFnZSB0aGUgd2Vic2l0ZSBpcyBvblxyXG52YXIgY3VyUGFnZTtcclxudmFyIG1lbnVzID0gW107XHJcbnZhciBQQUdFID0gT2JqZWN0LmZyZWV6ZSh7VElUTEU6IDAsIENBU0U6IDEsIFBST0ZJTEU6IDIsIEJPQVJEOiAzfSk7XHJcblxyXG4vL2ZpcmVzIHdoZW4gdGhlIHdpbmRvdyBsb2Fkc1xyXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oZSl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBzZWN0aW9uc1xyXG5cdGJvYXJkU2VjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYm9hcmRcIik7XHJcblx0XHJcblx0Ly8gU2V0dXAgdGl0bGUgbWVudVxyXG5cdG1lbnVzW1BBR0UuVElUTEVdID0gbmV3IFRpdGxlTWVudShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRpdGxlTWVudVwiKSk7XHJcblx0bWVudXNbUEFHRS5USVRMRV0ub25jbG9zZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRzd2l0Y2godGhpcy5uZXh0KXtcclxuXHRcdGNhc2UgVGl0bGVNZW51Lk5FWFQuQk9BUkQ6XHJcblx0XHRcdGN1clBhZ2UgPSBQQUdFLkJPQVJEO1xyXG5cdFx0XHRjcmVhdGVHYW1lKCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSBUaXRsZU1lbnUuTkVYVC5DQVNFOlxyXG5cdFx0XHRjdXJQYWdlID0gUEFHRS5DQVNFO1xyXG5cdFx0XHRtZW51c1tQQUdFLkNBU0VdLm9wZW4oKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8vIFNldHVwIGNhc2UgbWVudVxyXG5cdG1lbnVzW1BBR0UuQ0FTRV0gPSBuZXcgQ2FzZU1lbnUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXNlTWVudVwiKSk7XHJcblx0bWVudXNbUEFHRS5DQVNFXS5vbmNsb3NlID0gZnVuY3Rpb24oKXtcclxuXHRcdHN3aXRjaCh0aGlzLm5leHQpe1xyXG5cdFx0Y2FzZSBDYXNlTWVudS5ORVhULk5FV19QUk9GSUxFOlxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkxPQURJTkcgTkVXIFBST0ZJTEUgTUVOVVwiKTtcclxuXHRcdFx0Y3VyUGFnZSA9IFBBR0UuUFJPRklMRTtcclxuXHRcdFx0bWVudXNbUEFHRS5QUk9GSUxFXS5vcGVuKHRydWUpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgQ2FzZU1lbnUuTkVYVC5PTERfUFJPRklMRTpcclxuXHRcdFx0Y29uc29sZS5sb2coXCJMT0FESU5HIE9MRCBQUk9GSUxFIE1FTlVcIik7XHJcblx0XHRcdGN1clBhZ2UgPSBQQUdFLlBST0ZJTEU7XHJcblx0XHRcdG1lbnVzW1BBR0UuUFJPRklMRV0ub3BlbihmYWxzZSk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSBDYXNlTWVudS5ORVhULlRJVExFOlxyXG5cdFx0XHRjdXJQYWdlID0gUEFHRS5USVRMRTtcclxuXHRcdFx0bWVudXNbUEFHRS5USVRMRV0ub3BlbigpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0Ly9TZXR1cCBwcm9maWxlIG1lbnVcclxuXHRtZW51c1tQQUdFLlBST0ZJTEVdID0gbmV3IFByb2ZpbGVNZW51KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvZmlsZU1lbnVcIikpO1xyXG5cdG1lbnVzW1BBR0UuUFJPRklMRV0ub25jbG9zZSA9IGZ1bmN0aW9uKCl7XHJcblx0XHRzd2l0Y2godGhpcy5uZXh0KXtcclxuXHRcdGNhc2UgUHJvZmlsZU1lbnUuTkVYVC5CT0FSRDpcclxuXHRcdFx0Y3VyUGFnZSA9IFBBR0UuQk9BUkQ7XHJcblx0XHRcdGNyZWF0ZUdhbWUoKTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIFByb2ZpbGVNZW51Lk5FWFQuQ0FTRTpcclxuXHRcdFx0Y3VyUGFnZSA9IFBBR0UuQ0FTRTtcclxuXHRcdFx0bWVudXNbUEFHRS5DQVNFXS5vcGVuKCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRcclxuXHQvLyBPcGVuIHRoZSB0aXRsZSBtZW51XHJcbiAgICBjdXJQYWdlID0gUEFHRS5USVRMRTtcclxuICAgIG1lbnVzW1BBR0UuVElUTEVdLm9wZW4oKTtcclxuICAgIFxyXG59XHJcblxyXG4vLyBjcmVhdGUgdGhlIGdhbWUgb2JqZWN0IGFuZCBzdGFydCB0aGUgbG9vcCB3aXRoIGEgZHRcclxuZnVuY3Rpb24gY3JlYXRlR2FtZSgpe1xyXG5cdFxyXG5cdC8vIFNob3cgdGhlIHNlY3Rpb24gZm9yIHRoZSBnYW1lXHJcblx0Ym9hcmRTZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cdFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBnYW1lXHJcbiAgICBnYW1lID0gbmV3IEdhbWUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib2FyZFwiKSwgVXRpbGl0aWVzLmdldFNjYWxlKENvbnN0YW50cy5ib2FyZFNpemUsIG5ldyBQb2ludCh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KSkpO1xyXG4gICAgXHJcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBsb29wXHJcbiAgICBnYW1lTG9vcChEYXRlLm5vdygpKTtcclxuICAgIFxyXG59XHJcblxyXG4vL2ZpcmVzIG9uY2UgcGVyIGZyYW1lIGZvciB0aGUgZ2FtZVxyXG5mdW5jdGlvbiBnYW1lTG9vcChwcmV2VGltZSl7XHJcblx0XHJcbiAgICBcclxuXHQvLyBnZXQgZGVsdGEgdGltZVxyXG4gICAgdmFyIGR0ID0gRGF0ZS5ub3coKSAtIHByZXZUaW1lO1xyXG4gICAgXHJcbiAgICAvLyB1cGRhdGUgZ2FtZVxyXG4gICAgZ2FtZS51cGRhdGUoZHQpO1xyXG4gICAgXHJcblx0Ly8gbG9vcFxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcC5iaW5kKHRoaXMsIERhdGUubm93KCkpKTtcclxuICAgIFxyXG59XHJcblxyXG4vL2xpc3RlbnMgZm9yIGNoYW5nZXMgaW4gc2l6ZSBvZiB3aW5kb3cgYW5kIHNjYWxlcyB0aGUgZ2FtZSBhY2NvcmRpbmdseVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbihlKXtcclxuXHRcclxuXHQvLyBTY2FsZSB0aGUgZ2FtZSB0byB0aGUgbmV3IHNpemVcclxuXHRpZihjdXJQYWdlPT1QQUdFLkJPQVJEKVxyXG5cdFx0Z2FtZS5zZXRTY2FsZShVdGlsaXRpZXMuZ2V0U2NhbGUoQ29uc3RhbnRzLmJvYXJkU2l6ZSwgbmV3IFBvaW50KHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpKSk7XHJcblx0XHJcbn0pO1xyXG5cclxuLy8gTGlzdGVuIGZvciB0b3VjaCBmb3IgZnVsbHNjcmVlbiB3aGlsZSBpbiBnYW1lIG9uIG1vYmlsZVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcclxuXHRpZihjdXJQYWdlPT1QQUdFLkJPQVJEICYmIHdpbmRvdy5tYXRjaE1lZGlhKFwib25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDc2MHB4KVwiKSlcclxuXHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbFNjcmVlbigpO1xyXG5cdFxyXG59LCBmYWxzZSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBDYXRlZ29yeShuYW1lLCB4bWwsIHJlc291cmNlcywgd2luZG93RGl2KXtcclxuXHRcclxuXHQvLyBTYXZlIHRoZSBuYW1lXHJcblx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcclxuXHQvLyBMb2FkIGFsbCB0aGUgcXVlc3Rpb25zXHJcblx0dmFyIHF1ZXN0aW9uRWxlbWVudHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIik7XHJcblx0dGhpcy5xdWVzdGlvbnMgPSBbXTtcclxuXHQvLyBjcmVhdGUgcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPHF1ZXN0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIFxyXG5cdHtcclxuXHRcdC8vIGNyZWF0ZSBhIHF1ZXN0aW9uIG9iamVjdFxyXG5cdFx0dGhpcy5xdWVzdGlvbnNbaV0gPSBuZXcgUXVlc3Rpb24ocXVlc3Rpb25FbGVtZW50c1tpXSwgcmVzb3VyY2VzLCB3aW5kb3dEaXYsIGkpO1xyXG5cdH1cclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENhdGVnb3J5OyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi4vaGVscGVyL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi4vZ2FtZS9jb25zdGFudHMuanMnKTtcclxudmFyIFdpbmRvd3MgPSByZXF1aXJlKCcuLi9odG1sL3F1ZXN0aW9uV2luZG93cy5qcycpO1xyXG5cclxudmFyIFNPTFZFX1NUQVRFID0gT2JqZWN0LmZyZWV6ZSh7SElEREVOOiAwLCBVTlNPTFZFRDogMSwgU09MVkVEOiAyfSk7XHJcbnZhciBRVUVTVElPTl9UWVBFID0gT2JqZWN0LmZyZWV6ZSh7SlVTVElGSUNBVElPTjogMSwgTVVMVElQTEVfQ0hPSUNFOiAyLCBTSE9SVF9SRVNQT05TRTogMywgRklMRTogNCwgTUVTU0FHRTogNX0pO1xyXG5cclxuLyogUXVlc3Rpb24gcHJvcGVydGllczpcclxuY3VycmVudFN0YXRlOiBTT0xWRV9TVEFURVxyXG53aW5kb3dEaXY6IGVsZW1lbnRcclxuY29ycmVjdDogaW50XHJcbnBvc2l0aW9uUGVyY2VudFg6IGZsb2F0XHJcbnBvc2l0aW9uUGVyY2VudFk6IGZsb2F0XHJcbnJldmVhbFRocmVzaG9sZDogaW50XHJcbmltYWdlTGluazogc3RyaW5nXHJcbmZlZWRiYWNrczogc3RyaW5nW11cclxuY29ubmVjdGlvbkVsZW1lbnRzOiBlbGVtZW50W11cclxuY29ubmVjdGlvbnM6IGludFtdXHJcbnF1ZXN0aW9uVHlwZTogU09MVkVfU1RBVEVcclxuanVzdGlmaWNhdGlvbjogc3RyaW5nXHJcbndyb25nQW5zd2VyOiBzdHJpbmdcclxuY29ycmVjdEFuc3dlcjogc3RyaW5nXHJcbiovXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIFF1ZXN0aW9uKHhtbCwgcmVzb3VyY2VzLCB3aW5kb3dEaXYsIG51bSl7XHJcblx0XHJcblx0Ly8gU2V0IHRoZSBjdXJyZW50IHN0YXRlIHRvIGRlZmF1bHQgYXQgaGlkZGVuIGFuZCBzdG9yZSB0aGUgd2luZG93IGRpdlxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5ISURERU47XHJcbiAgICB0aGlzLndpbmRvd0RpdiA9IHdpbmRvd0RpdjtcclxuICAgIHRoaXMubnVtID0gbnVtO1xyXG4gICAgXHJcbiAgICAvLyBHZXQgYW5kIHNhdmUgdGhlIGdpdmVuIGluZGV4LCBjb3JyZWN0IGFuc3dlciwgcG9zaXRpb24sIHJldmVhbCB0aHJlc2hvbGQsIGltYWdlIGxpbmssIGZlZWRiYWNrLCBhbmQgY29ubmVjdGlvbnNcclxuICAgIHRoaXMuY29ycmVjdCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJjb3JyZWN0QW5zd2VyXCIpKTtcclxuICAgIHRoaXMucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInhQb3NpdGlvblBlcmNlbnRcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueCk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ5UG9zaXRpb25QZXJjZW50XCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnkpO1xyXG4gICAgdGhpcy5yZXZlYWxUaHJlc2hvbGQgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwicmV2ZWFsVGhyZXNob2xkXCIpKTtcclxuICAgIC8vY29uc29sZS5sb2coeG1sKTtcclxuICAgIHRoaXMuaW1hZ2VMaW5rID0geG1sLmdldEF0dHJpYnV0ZShcImltYWdlTGlua1wiKTtcclxuICAgIHRoaXMuZmVlZGJhY2tzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZmVlZGJhY2tcIik7XHJcbiAgICB0aGlzLm5ld0ZpbGVzID0gZmFsc2U7XHJcbiAgICB0aGlzLmZpbGVzID0gW107XHJcbiAgICB2YXIgY29ubmVjdGlvbkVsZW1lbnRzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY29ubmVjdGlvbnNcIik7XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gW107XHJcbiAgICBmb3IodmFyIGk9MDtpPGNvbm5lY3Rpb25FbGVtZW50cy5sZW5ndGg7aSsrKVxyXG4gICAgXHR0aGlzLmNvbm5lY3Rpb25zW2ldID0gcGFyc2VJbnQoY29ubmVjdGlvbkVsZW1lbnRzW2ldLmlubmVySFRNTCk7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgd2luZG93cyBmb3IgdGhpcyBxdWVzdGlvbiBiYXNlZCBvbiB0aGUgcXVlc3Rpb24gdHlwZVxyXG4gICAgdGhpcy5xdWVzdGlvblR5cGUgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwicXVlc3Rpb25UeXBlXCIpKTtcclxuICAgIHRoaXMuanVzdGlmaWNhdGlvbiA9IHRoaXMucXVlc3Rpb25UeXBlPT0xIHx8IHRoaXMucXVlc3Rpb25UeXBlPT0zO1xyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlIT01KXtcclxuXHRcdHRoaXMuY3JlYXRlVGFza1dpbmRvdyh4bWwpO1xyXG5cdFx0dGhpcy5jcmVhdGVSZXNvdXJjZVdpbmRvdyh4bWwsIHJlc291cmNlcyk7XHJcblx0fVxyXG5cdHN3aXRjaCh0aGlzLnF1ZXN0aW9uVHlwZSl7XHJcblx0XHRjYXNlIDU6XHJcblx0XHRcdHRoaXMuY3JlYXRlTWVzc2FnZVdpbmRvdyh4bWwpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNDpcclxuXHRcdFx0dGhpcy5jcmVhdGVGaWxlV2luZG93KCk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSAzOlxyXG5cdFx0Y2FzZSAyOlxyXG5cdFx0Y2FzZSAxOlxyXG5cdFx0XHR0aGlzLmNyZWF0ZUFuc3dlcldpbmRvdyh4bWwpO1xyXG5cdFx0XHRicmVhaztcclxuXHR9XHJcbiAgICBcclxufVxyXG5cclxudmFyIHAgPSBRdWVzdGlvbi5wcm90b3R5cGU7XHJcblxyXG5wLnNob3dQcmV2U3VibWl0dGVkRmlsZXMgPSBmdW5jdGlvbihmaWxlcykge1xyXG5cdC8vIGFja25vd2xlZGdlIHN1Ym1pdHRlZCBmaWxlcyBpbiB0YXNrIHdpbmRvd1xyXG5cdGlmKGZpbGVzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnU3VibWl0dGVkIEZpbGVzOjxici8+JztcclxuXHRlbHNlXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICcnO1xyXG5cdGZvcih2YXIgaT0wO2k8ZmlsZXM7aSsrKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgKz0gJzxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytmaWxlc1tpXS5uYW1lKyc8L3NwYW4+PGJyLz4nO1xyXG59XHJcblxyXG5wLndyb25nQW5zd2VyID0gZnVuY3Rpb24obnVtKXtcclxuXHJcbiAgLy8gSWYgZmVlYmFjayBkaXNwbGF5IGl0XHJcblx0aWYodGhpcy5mZWVkYmFja3MubGVuZ3RoPjApXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdcIicrU3RyaW5nLmZyb21DaGFyQ29kZShudW0gKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J1wiIGlzIG5vdCBjb3JyZWN0IDxici8+Jm5ic3A7PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5mZWVkYmFja3NbbnVtXS5pbm5lckhUTUwrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcbn1cclxuXHJcbnAuY29ycmVjdEFuc3dlciA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gRGlzYWJsZSBhbGwgdGhlIGFuc3dlciBidXR0b25zXHJcblx0aWYodGhpcy5hbnN3ZXJzKVxyXG5cdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmFuc3dlcnMubGVuZ3RoO2krKylcclxuXHRcdFx0dGhpcy5hbnN3ZXJzW2ldLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHQvLyBJZiBmZWVkYmFjayBkaXNwbGF5IGl0XHJcblx0aWYodGhpcy5mZWVkYmFja3MubGVuZ3RoPjApXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdcIicrU3RyaW5nLmZyb21DaGFyQ29kZSh0aGlzLmNvcnJlY3QgKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J1wiIGlzIHRoZSBjb3JyZWN0IHJlc3BvbnNlIDxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5mZWVkYmFja3NbdGhpcy5jb3JyZWN0XS5pbm5lckhUTUwrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT0zICYmIHRoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSAhPSAnJylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1N1Ym1pdHRlZCBUZXh0Ojxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSsnPC9zcGFuPjxici8+JztcclxuXHRcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTEgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgKz0gJ1N1Ym1pdHRlZCBUZXh0Ojxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSsnPC9zcGFuPjxici8+JztcclxuXHRcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTQpe1xyXG5cdFx0aWYodGhpcy5maWxlcy5sZW5ndGg+MClcclxuXHRcdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnU3VibWl0dGVkIEZpbGVzOjxici8+JztcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnJztcclxuXHRcdGZvcih2YXIgaT0wO2k8dGhpcy5maWxlcy5sZW5ndGg7aSsrKVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCArPSAnPHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuZmlsZXNbaV0rJzwvc3Bhbj48YnIvPic7XHJcblx0fVxyXG4gIFxyXG4gIGlmKHRoaXMuY3VycmVudFN0YXRlIT1TT0xWRV9TVEFURS5TT0xWRUQgJiYgXHJcbiAgICAgKCgodGhpcy5xdWVzdGlvblR5cGU9PT0zIHx8IHRoaXMucXVlc3Rpb25UeXBlPT09MSkgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKSB8fFxyXG4gICAgICAodGhpcy5xdWVzdGlvblR5cGU9PT00ICYmIHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aD4wKSB8fFxyXG4gICAgICAgdGhpcy5xdWVzdGlvblR5cGU9PT0yKSl7IFxyXG4gICAgLy8gU2V0IHRoZSBzdGF0ZSBvZiB0aGUgcXVlc3Rpb24gdG8gY29ycmVjdFxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5TT0xWRUQ7XHJcbiAgICAvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcbiAgICBpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdHRoaXMucHJvY2VlZEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gYW5pbWF0ZSBwcm9jZWVkIGJ1dHRvblxyXG5cdH1cclxuICB9XHJcblx0XHJcbn1cclxuXHJcbnAuZGlzcGxheVdpbmRvd3MgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIEFkZCB0aGUgd2luZG93cyB0byB0aGUgd2luZG93IGRpdlxyXG5cdHZhciB3aW5kb3dOb2RlID0gdGhpcy53aW5kb3dEaXY7XHJcblx0dmFyIGV4aXRCdXR0b24gPSBuZXcgSW1hZ2UoKTtcclxuXHRleGl0QnV0dG9uLnNyYyA9IFwiaW1nL2ljb25DbG9zZS5wbmdcIjtcclxuXHRleGl0QnV0dG9uLmNsYXNzTmFtZSA9IFwiZXhpdC1idXR0b25cIjtcclxuXHR2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG5cdGV4aXRCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkgeyBxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7IH07XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT01KXtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5tZXNzYWdlKTtcclxuXHQgICAgZXhpdEJ1dHRvbi5zdHlsZS5sZWZ0ID0gXCI3NXZ3XCI7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMudGFzayk7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VyKTtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5yZXNvdXJjZSk7XHJcblx0XHRleGl0QnV0dG9uLnN0eWxlLmxlZnQgPSBcIjg1dndcIjtcclxuXHR9XHJcblx0aWYodGhpcy5jdXJyZW50U3RhdGUgPT09IFNPTFZFX1NUQVRFLlNPTFZFRCAmJiB0aGlzLnF1ZXN0aW9uVHlwZSAhPSBRVUVTVElPTl9UWVBFLk1FU1NBR0UpICB7XHJcblx0XHQvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcblx0XHRpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdFx0dGhpcy5wcm9jZWVkRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvLyBhbmltYXRlIHByb2NlZWQgYnV0dG9uXHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQoZXhpdEJ1dHRvbik7XHJcblx0XHJcbn1cclxuXHJcbnAuY3JlYXRlVGFza1dpbmRvdyA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0dGhpcy5wcm9jZWVkRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvY2VlZENvbnRhaW5lclwiKTtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHRhc2sgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MudGFza1dpbmRvdztcclxuICAgIHRoaXMudGFzayA9IHRlbXBEaXYuZmlyc3RDaGlsZDtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uTmFtZVwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIlaW5zdHJ1Y3Rpb25zJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gdGhpcy50YXNrLmlubmVySFRNTC5yZXBsYWNlKFwiJXF1ZXN0aW9uJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLmZlZWRiYWNrID0gdGhpcy50YXNrLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJmZWVkYmFja1wiKVswXTtcclxufVxyXG5cclxucC5jcmVhdGVSZXNvdXJjZVdpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgcmVzb3VyY2VGaWxlcyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSByZXNvdXJjZSB3aW5kb3cgXHJcblx0dmFyIHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG5cdHRlbXBEaXYuaW5uZXJIVE1MID0gV2luZG93cy5yZXNvdXJjZVdpbmRvdztcclxuICAgIHRoaXMucmVzb3VyY2UgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgaW5kaXZpZHVhbCByZXNvdWNlcyBpZiBhbnlcclxuXHR2YXIgcmVzb3VyY2VzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VJbmRleFwiKTtcclxuICAgIGlmKHJlc291cmNlcy5sZW5ndGggPiAwKXtcclxuICAgIFx0XHJcbiAgICBcdC8vIEdldCB0aGUgaHRtbCBmb3IgZWFjaCByZXNvdXJjZSBhbmQgdGhlbiBhZGQgdGhlIHJlc3VsdCB0byB0aGUgd2luZG93XHJcbiAgICBcdHZhciByZXNvdXJjZUhUTUwgPSAnJztcclxuXHQgICAgZm9yKHZhciBpPTA7aTxyZXNvdXJjZXMubGVuZ3RoO2krKyl7XHJcbiAgICBcdFx0dmFyIGN1clJlc291cmNlID0gV2luZG93cy5yZXNvdXJjZS5yZXBsYWNlKFwiJWljb24lXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLmljb24pO1xyXG5cdCAgICBcdGN1clJlc291cmNlID0gY3VyUmVzb3VyY2UucmVwbGFjZShcIiV0aXRsZSVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0udGl0bGUpO1xyXG5cdCAgICBcdGN1clJlc291cmNlID0gY3VyUmVzb3VyY2UucmVwbGFjZShcIiVsaW5rJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS5saW5rKTtcclxuXHQgICAgXHRyZXNvdXJjZUhUTUwgKz0gY3VyUmVzb3VyY2U7XHJcblx0ICAgIH1cclxuXHQgIFx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB0aGlzLnJlc291cmNlLmlubmVySFRNTC5yZXBsYWNlKFwiJXJlc291cmNlcyVcIiwgcmVzb3VyY2VIVE1MKTtcclxuXHRcdCAgICAgICAgXHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHQvLyBEaXNwbGF5IHRoYXQgdGhlcmUgYXJlbid0IGFueSByZXNvdXJjZXNcclxuXHRcdHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MID0gdGhpcy5yZXNvdXJjZS5pbm5lckhUTUwucmVwbGFjZShcIiVyZXNvdXJjZXMlXCIsIFwiTm8gcmVzb3VyY2VzIGhhdmUgYmVlbiBwcm92aWRlZCBmb3IgdGhpcyB0YXNrLlwiKTtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uc3R5bGUuY29sb3IgPSBcImdyZXlcIjtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjRkZGRkZGXCI7XHJcblx0XHR0aGlzLnJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLmNsYXNzTmFtZSArPSBcIiwgY2VudGVyXCI7XHJcblx0fVxyXG59XHJcblxyXG5wLmNyZWF0ZUFuc3dlcldpbmRvdyA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBhbnN3ZXIgd2luZG93IFxyXG5cdHZhciB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0ZW1wRGl2LmlubmVySFRNTCA9IFdpbmRvd3MuYW5zd2VyV2luZG93O1xyXG4gICAgdGhpcy5hbnN3ZXIgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgdGV4dCBlbGVtZW50IGlmIGFueVxyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHZhciBzdWJtaXQ7XHJcbiAgICBpZih0aGlzLmp1c3RpZmljYXRpb24pe1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmNsYXNzTmFtZSA9IFwic3VibWl0XCI7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQuaW5uZXJIVE1MID0gXCJTdWJtaXRcIjtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuICAgIFx0fTtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZnVuY3Rpb24oKSB7XHJcbiAgICBcdFx0aWYocXVlc3Rpb24uanVzdGlmaWNhdGlvbi52YWx1ZS5sZW5ndGggPiAwKVxyXG4gICAgXHRcdFx0cXVlc3Rpb24uanVzdGlmaWNhdGlvbi5zdWJtaXQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIFx0XHRlbHNlXHJcbiAgICBcdFx0XHRxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdH0sIGZhbHNlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIGFuZCBnZXQgYWxsIHRoZSBhbnN3ZXIgZWxlbWVudHNcclxuICAgIHRoaXMuYW5zd2VycyA9IFtdO1xyXG4gICAgdmFyIGFuc3dlcnNYbWwgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhbnN3ZXJcIik7XHJcbiAgICB2YXIgY29ycmVjdCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJjb3JyZWN0QW5zd2VyXCIpKTtcclxuICAgIGZvcih2YXIgaT0wO2k8YW5zd2Vyc1htbC5sZW5ndGg7aSsrKXtcclxuICAgIFx0aWYodGhpcy5qdXN0aWZpY2F0aW9uKVxyXG4gICAgXHRcdHRoaXMuanVzdGlmaWNhdGlvbi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBcdGlmKGNvcnJlY3Q9PT1pKVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcImNvcnJlY3RcIjtcclxuICAgIFx0ZWxzZVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcIndyb25nXCI7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXS5pbm5lckhUTUwgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1wiLiBcIithbnN3ZXJzWG1sW2ldLmlubmVySFRNTDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBldmVudHMgZm9yIHRoZSBhbnN3ZXJzXHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKXtcclxuXHQgIGlmKHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPT0gXCJ3cm9uZ1wiKXtcclxuXHRcdHRoaXMuYW5zd2Vyc1tpXS5udW0gPSBpO1xyXG4gICAgICAgIHRoaXMuYW5zd2Vyc1tpXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgIHRoaXMuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0ICBxdWVzdGlvbi53cm9uZ0Fuc3dlcih0aGlzLm51bSk7XHJcblx0ICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgZWxzZXtcclxuICAgIFx0dGhpcy5hbnN3ZXJzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdCAgICAgIGlmKHF1ZXN0aW9uLmp1c3RpZmljYXRpb24pXHJcblx0ICAgICAgICBxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0ICAgICAgcXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG5cdCAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgYW5zd2VycyB0byB0aGUgd2luZG93XHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKVxyXG4gICAgICB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnNbaV0pO1xyXG4gICAgaWYodGhpcy5qdXN0aWZpY2F0aW9uKXtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uKTtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbnAuY3JlYXRlRmlsZVdpbmRvdyA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLmZpbGVXaW5kb3c7XHJcbiAgICB0aGlzLmFuc3dlciA9IHRlbXBEaXYuZmlyc3RDaGlsZDtcclxuICAgIHRoaXMuZmlsZUlucHV0ID0gdGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKVswXTtcclxuICAgIHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcbiAgICB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZmlsZUJ1dHRvblwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgIFx0Y29uc29sZS5sb2coXCJGSUxFIEJVVFRPTiBDTElDS0VEIVwiKTtcclxuICAgIFx0cXVlc3Rpb24uZmlsZUlucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgIFx0cXVlc3Rpb24ubmV3RmlsZXMgPSB0cnVlO1xyXG4gICAgXHRxdWVzdGlvbi5maWxlcyA9IFtdO1xyXG4gICAgXHRmb3IodmFyIGk9MDtpPGV2ZW50LnRhcmdldC5maWxlcy5sZW5ndGg7aSsrKVxyXG4gICAgXHRcdHF1ZXN0aW9uLmZpbGVzW2ldID0gZXZlbnQudGFyZ2V0LmZpbGVzW2ldLm5hbWU7XHJcblx0ICAgIHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuICAgIH0pO1xyXG4gICAgXHJcbn1cclxuXHJcbnAuY3JlYXRlTWVzc2FnZVdpbmRvdyA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBtZXNzYWdlIHdpbmRvdyBcclxuXHR2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGVtcERpdi5pbm5lckhUTUwgPSBXaW5kb3dzLm1lc3NhZ2VXaW5kb3c7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSB0ZW1wRGl2LmZpcnN0Q2hpbGQ7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJXRpdGxlJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvbk5hbWVcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJWluc3RydWN0aW9ucyVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5zdHJ1Y3Rpb25zXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiVxdWVzdGlvbiVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25UZXh0XCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHRoaXMubWVzc2FnZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICBcdHF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9IFNPTFZFX1NUQVRFLlNPTFZFRDtcclxuICAgIFx0cXVlc3Rpb24ud2luZG93RGl2LmlubmVySFRNTCA9ICcnO1xyXG4gICAgfTtcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb247XHJcbm1vZHVsZS5leHBvcnRzLlNPTFZFX1NUQVRFID0gU09MVkVfU1RBVEU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBSZXNvdXJjZSh4bWwpe1xyXG5cdFxyXG5cdC8vIEZpcnN0IGdldCB0aGUgaWNvblxyXG5cdCAgdmFyIHR5cGUgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwidHlwZVwiKSk7XHJcblx0ICBzd2l0Y2godHlwZSl7XHJcblx0ICAgIGNhc2UgMDpcclxuXHQgICAgICB0aGlzLmljb24gPSAnaW1nL2ljb25SZXNvdXJjZUZpbGUucG5nJztcclxuXHQgICAgICBicmVhaztcclxuXHQgICAgY2FzZSAxOlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICdpbWcvaWNvblJlc291cmNlTGluay5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBjYXNlIDI6XHJcbiAgICBcdCAgdGhpcy5pY29uID0gJ2ltZy9pY29uUmVzb3VyY2VWaWRlby5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBkZWZhdWx0OlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgfVxyXG5cclxuXHQgIC8vIE5leHQgZ2V0IHRoZSB0aXRsZVxyXG5cdCAgdGhpcy50aXRsZSA9IHhtbC5nZXRBdHRyaWJ1dGUoXCJ0ZXh0XCIpO1xyXG5cclxuXHQgIC8vIExhc3QgZ2V0IHRoZSBsaW5rXHJcblx0ICB0aGlzLmxpbmsgPSB4bWwuZ2V0QXR0cmlidXRlKFwibGlua1wiKTtcclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi4vaGVscGVyL3V0aWxpdGllcy5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9oZWxwZXIvcG9pbnQuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZShcIi4uL2Nhc2UvcXVlc3Rpb24uanNcIik7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jb25zdGFudHMuanNcIik7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZShcIi4uL2hlbHBlci9kcmF3bGliLmpzXCIpO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gYm9hcmQoc2VjdGlvbiwgc3RhcnRQb3NpdGlvbiwgbGVzc29uTm9kZXMpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgY2FudmFzIGZvciB0aGlzIGJvYXJkIGFuZCBhZGQgaXQgdG8gdGhlIHNlY3Rpb25cclxuXHR0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcblx0dGhpcy5jdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cdHRoaXMuY2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0dGhpcy5jYW52YXMud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuXHR0aGlzLmNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcblx0c2VjdGlvbi5hcHBlbmRDaGlsZCh0aGlzLmNhbnZhcyk7XHJcblx0XHJcblx0dmFyIGJvYXJkID0gdGhpcztcclxuXHR0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCBmdW5jdGlvbigpe1xyXG5cdFx0aWYoYm9hcmQubG9hZGVkKVxyXG5cdFx0XHRib2FyZC5sb2FkZWQoKTtcclxuXHR9LCBmYWxzZSk7XHJcblx0XHJcbiAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheSA9IGxlc3Nvbk5vZGVzO1xyXG4gICAgdGhpcy5ib2FyZE9mZnNldCA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxuICAgIHRoaXMuem9vbSA9IENvbnN0YW50cy5zdGFydFpvb207XHJcbiAgICB0aGlzLnN0YWdlID0gMDtcclxuICAgIHRoaXMubGFzdFNhdmVUaW1lID0gMDsgLy8gYXNzdW1lIG5vIGNvb2tpZVxyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb24gPSBudWxsO1xyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb25OdW0gPSAtMTtcclxuICAgIFxyXG4gICAgLy9pZiAoZG9jdW1lbnQuY29va2llKSB0aGlzLmxvYWRDb29raWUoKTsgXHJcblxyXG5cdC8vIENoZWNrIGlmIGFsbCBub2RlcyBhcmUgc29sdmVkXHJcblx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoICYmIGRvbmU7aSsrKVxyXG5cdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRpZihkb25lKVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG59XHJcblxyXG4vL3Byb3RvdHlwZVxyXG52YXIgcCA9IGJvYXJkLnByb3RvdHlwZTtcclxuXHJcbnAuYWN0ID0gZnVuY3Rpb24oZ2FtZVNjYWxlLCBwTW91c2VTdGF0ZSwgZHQpIHtcclxuXHRcclxuXHQvLyBmb3IgZWFjaCAgbm9kZVxyXG4gICAgZm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG4gICAgXHR2YXIgYWN0aXZlTm9kZSA9IHRoaXMubGVzc29uTm9kZUFycmF5W2ldOyBcclxuXHRcdC8vIGhhbmRsZSBzb2x2ZWQgcXVlc3Rpb25cclxuXHRcdGlmIChhY3RpdmVOb2RlLmN1cnJlbnRTdGF0ZSAhPSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQgJiYgYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKSB7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB1cGRhdGUgZWFjaCBjb25uZWN0aW9uJ3MgY29ubmVjdGlvbiBudW1iZXJcclxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBhY3RpdmVOb2RlLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aDsgaisrKVxyXG5cdFx0XHRcdHRoaXMubGVzc29uTm9kZUFycmF5W2FjdGl2ZU5vZGUucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXS5jb25uZWN0aW9ucysrO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSBub2RlJ3Mgc3RhdGVcclxuXHRcdFx0YWN0aXZlTm9kZS5jdXJyZW50U3RhdGUgPSBhY3RpdmVOb2RlLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENoZWNrIGlmIGFsbCBub2RlJ3MgYXJlIHNvbHZlZFxyXG5cdFx0XHR2YXIgZG9uZSA9IHRydWU7XHJcblx0XHRcdGZvcih2YXIgaT0wO2k8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoICYmIGRvbmU7aSsrKVxyXG5cdFx0XHRcdGlmKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmN1cnJlbnRTdGF0ZSE9UXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHRcdFx0ZG9uZSA9IGZhbHNlO1xyXG5cdFx0XHRpZihkb25lKVxyXG5cdFx0XHRcdHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgdGhlcmUgaXMgYSBsaXN0ZW5lciBmb3IgdXBkYXRpbmcgbm9kZXMsIGNhbGwgaXQuXHJcblx0XHRcdGlmKHRoaXMudXBkYXRlTm9kZSlcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZU5vZGUoKTtcclxuXHRcdFx0XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gdXBkYXRlIHRoZSBub2RlJ3MgdHJhbnNpdGlvbiBwcm9ncmVzc1xyXG5cdFx0aWYgKGFjdGl2ZU5vZGUucXVlc3Rpb24uY3VycmVudFN0YXRlID09IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0YWN0aXZlTm9kZS5saW5lUGVyY2VudCA9IE1hdGgubWluKDEsZHQqQ29uc3RhbnRzLmxpbmVTcGVlZCArIGFjdGl2ZU5vZGUubGluZVBlcmNlbnQpO1xyXG5cdH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgbW91c2UgZXZlbnRzIGlmIGdpdmVuIGEgbW91c2Ugc3RhdGVcclxuICAgIGlmKHBNb3VzZVN0YXRlKSB7XHJcblx0ICAgIFxyXG5cdCAgICAvLyBob3ZlciBzdGF0ZXNcclxuXHRcdC8vZm9yKHZhciBpID0gMDsgaSA8IGJvYXJkQXJyYXkubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHQvLyBsb29wIHRocm91Z2ggbGVzc29uIG5vZGVzIHRvIGNoZWNrIGZvciBob3ZlclxyXG5cdFx0XHQvLyB1cGRhdGUgYm9hcmRcclxuXHRcdFxyXG5cdCAgICBpZiAoIXBNb3VzZVN0YXRlLm1vdXNlRG93biAmJiB0aGlzLnRhcmdldCkge1xyXG5cdFx0XHR0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24gPSB1bmRlZmluZWQ7IC8vIGNsZWFyIGRyYWcgYmVoYXZpb3JcclxuXHRcdFx0dGhpcy50YXJnZXQuZHJhZ2dpbmcgPSBmYWxzZTtcclxuXHRcdFx0dGhpcy50YXJnZXQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdCAgICBcclxuXHRcdGZvciAodmFyIGk9dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoLTEsIG5vZGVDaG9zZW47IGk+PTAgJiYgdGhpcy50YXJnZXQ9PW51bGw7IGktLSkge1xyXG5cdFx0XHR2YXIgbE5vZGUgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTtcclxuXHRcdFx0XHJcblx0XHRcdGxOb2RlLm1vdXNlT3ZlciA9IGZhbHNlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIm5vZGUgdXBkYXRlXCIpO1xyXG5cdFx0XHQvLyBpZiBob3ZlcmluZywgc2hvdyBob3ZlciBnbG93XHJcblx0XHRcdC8qaWYgKHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCA+IGxOb2RlLnBvc2l0aW9uLngtbE5vZGUud2lkdGgvMiBcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi54IDwgbE5vZGUucG9zaXRpb24ueCtsTm9kZS53aWR0aC8yXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSA+IGxOb2RlLnBvc2l0aW9uLnktbE5vZGUuaGVpZ2h0LzJcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi55IDwgbE5vZGUucG9zaXRpb24ueStsTm9kZS5oZWlnaHQvMikgeyovXHJcblx0XHRcdGlmIChVdGlsaXRpZXMubW91c2VJbnRlcnNlY3QocE1vdXNlU3RhdGUsbE5vZGUsdGhpcy5ib2FyZE9mZnNldCkpIHtcclxuXHRcdFx0XHRsTm9kZS5tb3VzZU92ZXIgPSB0cnVlO1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0ID0gbE5vZGU7XHJcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhwTW91c2VTdGF0ZS5oYXNUYXJnZXQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZih0aGlzLnRhcmdldCl7XHJcblx0XHJcblx0XHRcdGlmKCF0aGlzLnRhcmdldC5kcmFnZ2luZyl7XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlRG93bikge1xyXG5cdFx0XHRcdFx0Ly8gZHJhZ1xyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXQuZHJhZ2dpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uID0gbmV3IFBvaW50KFxyXG5cdFx0XHRcdFx0cE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLnRhcmdldC5wb3NpdGlvbi54LFxyXG5cdFx0XHRcdFx0cE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLnRhcmdldC5wb3NpdGlvbi55XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAocE1vdXNlU3RhdGUubW91c2VDbGlja2VkKSB7XHJcblx0XHRcdFx0XHQvLyBoYW5kbGUgY2xpY2sgY29kZVxyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXQuY2xpY2socE1vdXNlU3RhdGUpO1xyXG5cdFx0XHRcdFx0dGhpcy5sYXN0UXVlc3Rpb24gPSB0aGlzLnRhcmdldC5xdWVzdGlvbjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZXtcclxuXHRcdFx0XHR2YXIgbmF0dXJhbFggPSBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCAtIHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbi54O1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnBvc2l0aW9uLnggPSBNYXRoLm1heChDb25zdGFudHMuYm9hcmRPdXRsaW5lLE1hdGgubWluKG5hdHVyYWxYLENvbnN0YW50cy5ib2FyZFNpemUueCAtIENvbnN0YW50cy5ib2FyZE91dGxpbmUpKTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5xdWVzdGlvbi5wb3NpdGlvblBlcmNlbnRYID0gdGhpcy50YXJnZXQucG9zaXRpb24ueDtcclxuXHRcdFx0XHR2YXIgbmF0dXJhbFkgPSBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSAtIHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbi55O1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnBvc2l0aW9uLnkgPSBNYXRoLm1heChDb25zdGFudHMuYm9hcmRPdXRsaW5lLE1hdGgubWluKG5hdHVyYWxZLENvbnN0YW50cy5ib2FyZFNpemUueSAtIENvbnN0YW50cy5ib2FyZE91dGxpbmUpKTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5xdWVzdGlvbi5wb3NpdGlvblBlcmNlbnRZID0gdGhpcy50YXJnZXQucG9zaXRpb24ueTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHQgIH1cclxuXHRcdFxyXG5cdFx0Ly8gZHJhZyB0aGUgYm9hcmQgYXJvdW5kXHJcblx0XHRpZiAodGhpcy50YXJnZXQ9PW51bGwpIHtcclxuXHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlRG93bikge1xyXG5cdFx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9ICctd2Via2l0LWdyYWJiaW5nJztcclxuXHRcdFx0XHR0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLW1vei1ncmFiYmluZyc7XHJcblx0XHRcdFx0dGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2dyYWJiaW5nJztcclxuXHRcdFx0XHRpZiAoIXRoaXMubW91c2VTdGFydERyYWdCb2FyZCkge1xyXG5cdFx0XHRcdFx0dGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uO1xyXG5cdFx0XHRcdFx0dGhpcy5wcmV2Qm9hcmRPZmZzZXQueCA9IHRoaXMuYm9hcmRPZmZzZXQueDtcclxuXHRcdFx0XHRcdHRoaXMucHJldkJvYXJkT2Zmc2V0LnkgPSB0aGlzLmJvYXJkT2Zmc2V0Lnk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5ib2FyZE9mZnNldC54ID0gdGhpcy5wcmV2Qm9hcmRPZmZzZXQueCAtIChwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCAtIHRoaXMubW91c2VTdGFydERyYWdCb2FyZC54KTtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmJvYXJkT2Zmc2V0LnggPiB0aGlzLm1heEJvYXJkV2lkdGgvMikgdGhpcy5ib2FyZE9mZnNldC54ID0gdGhpcy5tYXhCb2FyZFdpZHRoLzI7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC54IDwgLTEqdGhpcy5tYXhCb2FyZFdpZHRoLzIpIHRoaXMuYm9hcmRPZmZzZXQueCA9IC0xKnRoaXMubWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdFx0dGhpcy5ib2FyZE9mZnNldC55ID0gdGhpcy5wcmV2Qm9hcmRPZmZzZXQueSAtIChwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSAtIHRoaXMubW91c2VTdGFydERyYWdCb2FyZC55KTtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmJvYXJkT2Zmc2V0LnkgPiB0aGlzLm1heEJvYXJkSGVpZ2h0LzIpIHRoaXMuYm9hcmRPZmZzZXQueSA9IHRoaXMubWF4Qm9hcmRIZWlnaHQvMjtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmJvYXJkT2Zmc2V0LnkgPCAtMSp0aGlzLm1heEJvYXJkSGVpZ2h0LzIpIHRoaXMuYm9hcmRPZmZzZXQueSA9IC0xKnRoaXMubWF4Qm9hcmRIZWlnaHQvMjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9ICcnO1xyXG5cdFx0XHR9XHJcblx0ICAgIH1cclxuICAgIH1cclxufVxyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oZ2FtZVNjYWxlKXtcclxuICAgIFxyXG4gICAgLy8gc2F2ZSBjYW52YXMgc3RhdGUgYmVjYXVzZSB3ZSBhcmUgYWJvdXQgdG8gYWx0ZXIgcHJvcGVydGllc1xyXG4gICAgdGhpcy5jdHguc2F2ZSgpOyAgIFxyXG4gICAgXHJcbiAgICAvLyBDbGVhciBiZWZvcmUgZHJhd2luZyBuZXcgc3R1ZmZcclxuXHREcmF3TGliLnJlY3QodGhpcy5jdHgsIDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQsIFwiIzE1NzE4RlwiKTtcclxuXHJcblx0Ly8gU2NhbGUgdGhlIGdhbWVcclxuICAgIHRoaXMuY3R4LnNhdmUoKTtcclxuICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSh0aGlzLmNhbnZhcy53aWR0aC8yLCB0aGlzLmNhbnZhcy5oZWlnaHQvMik7XHJcblx0dGhpcy5jdHguc2NhbGUoZ2FtZVNjYWxlLCBnYW1lU2NhbGUpO1xyXG5cdHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jYW52YXMud2lkdGgvMiwgLXRoaXMuY2FudmFzLmhlaWdodC8yKTtcclxuXHJcbiAgICAvLyBUcmFuc2xhdGUgdG8gY2VudGVyIG9mIHNjcmVlbiBhbmQgc2NhbGUgZm9yIHpvb20gdGhlbiB0cmFuc2xhdGUgYmFja1xyXG4gICAgdGhpcy5jdHgudHJhbnNsYXRlKHRoaXMuY2FudmFzLndpZHRoLzIsIHRoaXMuY2FudmFzLmhlaWdodC8yKTtcclxuICAgIHRoaXMuY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKTtcclxuICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtdGhpcy5jYW52YXMud2lkdGgvMiwgLXRoaXMuY2FudmFzLmhlaWdodC8yKTtcclxuICAgIC8vIG1vdmUgdGhlIGJvYXJkIHRvIHdoZXJlIHRoZSB1c2VyIGRyYWdnZWQgaXRcclxuICAgIC8vdHJhbnNsYXRlIHRvIHRoZSBjZW50ZXIgb2YgdGhlIGJvYXJkXHJcbiAgICAvL2NvbnNvbGUubG9nKHRoaXMpO1xyXG4gICAgdGhpcy5jdHgudHJhbnNsYXRlKHRoaXMuY2FudmFzLndpZHRoLzIgLSB0aGlzLmJvYXJkT2Zmc2V0LngsIHRoaXMuY2FudmFzLmhlaWdodC8yIC0gdGhpcy5ib2FyZE9mZnNldC55KTtcclxuICAgIFxyXG5cdFxyXG4gICAgLy8gRHJhdyB0aGUgYmFja2dyb3VuZCBvZiB0aGUgYm9hcmRcclxuICAgIERyYXdMaWIucmVjdCh0aGlzLmN0eCwgMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCBDb25zdGFudHMuYm9hcmRTaXplLnksIFwiI0QzQjE4NVwiKTtcclxuICAgIERyYXdMaWIuc3Ryb2tlUmVjdCh0aGlzLmN0eCwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkT3V0bGluZSwgXCIjQ0I5OTY2XCIpO1xyXG4gICAgXHJcblx0Ly8gZHJhdyB0aGUgbm9kZXNcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICBcclxuICAgIFx0Ly8gdGVtcG9yYXJpbHkgaGlkZSBhbGwgYnV0IHRoZSBmaXJzdCBxdWVzdGlvblx0XHRcdFx0XHRcdC8vIHNvbWV0aGluZyBpcyB3cm9uZyBoZXJlLCBsaW5rc0F3YXlGcm9tT3JpZ2luIGRvZXMgbm90IGV4aXN0IGFueW1vcmVcclxuXHRcdC8vaWYgKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCA+IHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmtzQXdheUZyb21PcmlnaW4pIGNvbnRpbnVlO1xyXG4gICAgXHRcclxuICAgIFx0Ly8gZHJhdyB0aGUgbm9kZSBpdHNlbGZcclxuICAgICAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5kcmF3KHRoaXMuY3R4LCB0aGlzLmNhbnZhcyk7XHJcbiAgICB9XHJcblxyXG5cdC8vIGRyYXcgdGhlIGxpbmVzXHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHJcblx0XHQvLyBvbmx5IHNob3cgbGluZXMgZnJvbSBzb2x2ZWQgcXVlc3Rpb25zXHJcblx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIGNvbnRpbnVlO1xyXG5cdFx0XHJcblx0XHQvLyBnZXQgdGhlIHBpbiBwb3NpdGlvblxyXG4gICAgICAgIHZhciBvUG9zID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZ2V0Tm9kZVBvaW50KCk7XHJcbiAgICAgICAgXHJcblx0XHQvLyBzZXQgbGluZSBzdHlsZVxyXG4gICAgICAgIHRoaXMuY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsMCwxMDUsMC4yKVwiO1xyXG4gICAgICAgIHRoaXMuY3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gZHJhdyBsaW5lc1xyXG4gICAgICAgIGZvciAodmFyIGo9MDsgajx0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyAtMSBiZWNhc2Ugbm9kZSBjb25uZWN0aW9uIGluZGV4IHZhbHVlcyBhcmUgMS1pbmRleGVkIGJ1dCBjb25uZWN0aW9ucyBpcyAwLWluZGV4ZWRcclxuXHRcdFx0aWYgKHRoaXMubGVzc29uTm9kZUFycmF5W3RoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0ucXVlc3Rpb24uY3VycmVudFN0YXRlPT1RdWVzdGlvbi5TT0xWRV9TVEFURS5ISURERU4pIGNvbnRpbnVlO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyBnbyB0byB0aGUgaW5kZXggaW4gdGhlIGFycmF5IHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGNvbm5lY3RlZCBub2RlIG9uIHRoaXMgYm9hcmQgYW5kIHNhdmUgaXRzIHBvc2l0aW9uXHJcbiAgICAgICAgXHQvLyBjb25uZWN0aW9uIGluZGV4IHNhdmVkIGluIHRoZSBsZXNzb25Ob2RlJ3MgcXVlc3Rpb25cclxuICAgICAgICBcdHZhciBjb25uZWN0aW9uID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXTtcclxuICAgICAgICBcdHZhciBjUG9zID0gY29ubmVjdGlvbi5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0Ly8gZHJhdyB0aGUgbGluZVxyXG4gICAgICAgIFx0dGhpcy5jdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgXHQvLyB0cmFuc2xhdGUgdG8gc3RhcnQgKHBpbilcclxuICAgICAgICBcdHRoaXMuY3R4Lm1vdmVUbyhvUG9zLngsIG9Qb3MueSk7XHJcbiAgICAgICAgXHR0aGlzLmN0eC5saW5lVG8ob1Bvcy54ICsgKGNQb3MueCAtIG9Qb3MueCkqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGluZVBlcmNlbnQsIG9Qb3MueSArIChjUG9zLnkgLSBvUG9zLnkpKnRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmVQZXJjZW50KTtcclxuICAgICAgICBcdHRoaXMuY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgIFx0dGhpcy5jdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcblx0dGhpcy5jdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxuLy8gR2V0cyBhIGZyZWUgbm9kZSBpbiB0aGlzIGJvYXJkIChpLmUuIG5vdCB1bnNvbHZlZCkgcmV0dXJucyBudWxsIGlmIG5vbmVcclxucC5nZXRGcmVlTm9kZSA9IGZ1bmN0aW9uKCkge1xyXG5cdGZvcih2YXIgaT0wOyBpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaSsrKXtcclxuXHRcdGlmKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRClcclxuXHRcdFx0cmV0dXJuIHRoaXMubGVzc29uTm9kZUFycmF5W2ldO31cclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gTW92ZXMgdGhpcyBib2FyZCB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5wLm1vdmVUb3dhcmRzID0gZnVuY3Rpb24ocG9pbnQsIGR0LCBzcGVlZCl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB2ZWN0b3IgdG93YXJkcyB0aGUgZ2l2ZW4gcG9pbnRcclxuXHR2YXIgdG9Qb2ludCA9IG5ldyBQb2ludChwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCwgcG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgZGlzdGFuY2Ugb2Ygc2FpZCB2ZWN0b3JcclxuXHR2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQodG9Qb2ludC54KnRvUG9pbnQueCt0b1BvaW50LnkqdG9Qb2ludC55KTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIG5ldyBvZmZzZXQgb2YgdGhlIGJvYXJkIGFmdGVyIG1vdmluZyB0b3dhcmRzIHRoZSBwb2ludFxyXG5cdHZhciBuZXdPZmZzZXQgPSBuZXcgUG9pbnQoIHRoaXMuYm9hcmRPZmZzZXQueCArIHRvUG9pbnQueC9kaXN0YW5jZSpkdCpzcGVlZCxcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSArIHRvUG9pbnQueS9kaXN0YW5jZSpkdCpzcGVlZCk7XHJcblx0XHJcblx0Ly8gQ2hlY2sgaWYgcGFzc2VkIHBvaW50IG9uIHggYXhpcyBhbmQgaWYgc28gc2V0IHRvIHBvaW50J3MgeFxyXG5cdGlmKHRoaXMuYm9hcmRPZmZzZXQueCAhPXBvaW50LnggJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LngtbmV3T2Zmc2V0LngpLyhwb2ludC54LW5ld09mZnNldC54KT09TWF0aC5hYnMocG9pbnQueC10aGlzLmJvYXJkT2Zmc2V0LngpLyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBuZXdPZmZzZXQueDtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBwb2ludC54O1xyXG5cdFxyXG5cclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geSBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB5XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC55ICE9IHBvaW50LnkgJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LnktbmV3T2Zmc2V0LnkpLyhwb2ludC55LW5ld09mZnNldC55KT09TWF0aC5hYnMocG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpLyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBuZXdPZmZzZXQueTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBwb2ludC55O1xyXG59XHJcblxyXG5wLndpbmRvd0Nsb3NlZCA9IGZ1bmN0aW9uKCl7XHJcblx0Y29uc29sZS5sb2coXCJ3aW5kb3cgY2xvc2VkOlwiK3RoaXMubGFzdFF1ZXN0aW9uLm5ld0ZpbGVzKTtcclxuXHQvLyBpZiBpdCBpcyBmaWxlIHR5cGVcclxuXHRpZiAodGhpcy5sYXN0UXVlc3Rpb24ubmV3RmlsZXMpIHtcclxuXHRcdC8vIGFkZCBhIGZpbGUgdG8gdGhlIGZpbGUgc3lzdGVtXHJcblx0XHR0aGlzLmxhc3RRdWVzdGlvbi5uZXdGaWxlcyA9IGZhbHNlO1xyXG5cdFx0cmV0dXJuIHsgXHJcblx0XHRcdGZpbGVzOiB0aGlzLmxhc3RRdWVzdGlvbi5maWxlSW5wdXQuZmlsZXMsIFxyXG5cdFx0XHRxdWVzdGlvbjogdGhpcy5sYXN0UXVlc3Rpb24ubnVtXHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5wLnNob3cgPSBmdW5jdGlvbihkaXIpe1xyXG5cdGlmKGRpciE9bnVsbClcclxuXHRcdHRoaXMuY2FudmFzLnN0eWxlLmFuaW1hdGlvbiA9ICdjYW52YXNFbnRlcicgKyAoZGlyID8gJ0wnIDogJ1InKSArICcgMXMnO1xyXG5cdHRoaXMuY2FudmFzLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWJsb2NrJztcclxufVxyXG5cclxucC5oaWRlID0gZnVuY3Rpb24oZGlyKXtcclxuXHRpZihkaXIhPW51bGwpe1xyXG5cdFx0dGhpcy5jYW52YXMuc3R5bGUuYW5pbWF0aW9uID0gJ2NhbnZhc0xlYXZlJyArIChkaXIgPyAnUicgOiAnTCcpICsgJyAxcyc7XHJcblx0XHR2YXIgYm9hcmQgPSB0aGlzO1xyXG5cdFx0dGhpcy5sb2FkZWQgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHRib2FyZC5jYW52YXMuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdGJvYXJkLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdH1cclxufVxyXG5cclxucC51cGRhdGVTaXplID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmNhbnZhcy53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xyXG5cdHRoaXMuY2FudmFzLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib2FyZDsgICAgXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9oZWxwZXIvcG9pbnQuanMnKTtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxuLy8gVGhlIHNpemUgb2YgdGhlIGJvYXJkIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRTaXplID0gbmV3IFBvaW50KDE5MjAsIDEwODApO1xyXG5tLmJvdW5kU2l6ZSA9IDM7XHJcblxyXG4vL1RoZSBzaXplIG9mIHRoZSBib2FyZCBvdXRsaW5lIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRPdXRsaW5lID0gbS5ib2FyZFNpemUueCA+IG0uYm9hcmRTaXplLnkgPyBtLmJvYXJkU2l6ZS54LzIwIDogbS5ib2FyZFNpemUueS8yMDtcclxuXHJcbi8vIFRoZSB6b29tIHZhbHVlcyBhdCBzdGFydCBhbmQgZW5kIG9mIGFuaW1hdGlvblxyXG5tLnN0YXJ0Wm9vbSA9IDAuNTtcclxubS5lbmRab29tID0gMS41O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSB6b29tIGFuaW1hdGlvblxyXG5tLnpvb21TcGVlZCA9IDAuMDAxO1xyXG5tLnpvb21Nb3ZlU3BlZWQgPSAwLjc1O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSBsaW5lIGFuaW1hdGlvblxyXG5tLmxpbmVTcGVlZCA9IDAuMDAyO1xyXG5cclxuLy8gVGhlIHRpbWUgYmV0d2VlbiB6b29tIGNoZWNrc1xyXG5tLnBpbmNoU3BlZWQgPSAuMDAyNTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIEJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9oZWxwZXIvcG9pbnQuanMnKTtcclxudmFyIExlc3Nvbk5vZGUgPSByZXF1aXJlKCcuL2xlc3Nvbk5vZGUuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi4vaGVscGVyL2RyYXdsaWIuanMnKTtcclxudmFyIERhdGFQYXJzZXIgPSByZXF1aXJlKCcuLi9oZWxwZXIvaXBhckRhdGFQYXJzZXIuanMnKTtcclxudmFyIE1vdXNlU3RhdGUgPSByZXF1aXJlKCcuLi9oZWxwZXIvbW91c2VTdGF0ZS5qcycpO1xyXG52YXIgRmlsZU1hbmFnZXIgPSByZXF1aXJlKCcuLi9oZWxwZXIvZmlsZU1hbmFnZXIuanMnKTtcclxuXHJcbi8vbW91c2UgbWFuYWdlbWVudFxyXG52YXIgbW91c2VTdGF0ZTtcclxudmFyIHByZXZpb3VzTW91c2VTdGF0ZTtcclxudmFyIGRyYWdnaW5nRGlzYWJsZWQ7XHJcbnZhciBtb3VzZVRhcmdldDtcclxudmFyIG1vdXNlU3VzdGFpbmVkRG93bjtcclxuXHJcbi8vIEhUTUwgZWxlbWVudHNcclxudmFyIHpvb21TbGlkZXI7XHJcbnZhciB3aW5kb3dEaXY7XHJcbnZhciB3aW5kb3dGaWxtO1xyXG52YXIgcHJvY2VlZENvbnRhaW5lcjtcclxudmFyIHByb2NlZWRMb25nO1xyXG52YXIgcHJvY2VlZFJvdW5kO1xyXG5cclxuLy8gVXNlZCBmb3IgcGluY2ggem9vbVxyXG52YXIgcGluY2hTdGFydDtcclxuXHJcbi8vIFVzZWQgZm9yIHdhaXRpbmcgYSBzZWNvbmQgdG8gY2xvc2Ugd2luZG93c1xyXG52YXIgcGF1c2VkVGltZSA9IDA7XHJcblxyXG4vL3BoYXNlIGhhbmRsaW5nXHJcbnZhciBwaGFzZU9iamVjdDtcclxuXHJcbmZ1bmN0aW9uIGdhbWUoc2VjdGlvbiwgYmFzZVNjYWxlKXtcclxuXHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcclxuXHR0aGlzLnNhdmVGaWxlcyA9IFtdO1xyXG5cdFxyXG5cdC8vIEdldCBhbmQgc2V0dXAgdGhlIHdpbmRvdyBlbGVtZW50c1xyXG5cdHdpbmRvd0RpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3aW5kb3cnKTtcclxuICAgIHByb2NlZWRDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZENvbnRhaW5lcicpO1xyXG4gICAgcHJvY2VlZExvbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZEJ0bkxvbmcnKTtcclxuICAgIHByb2NlZWRSb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQnRuUm91bmQnKTtcclxuXHR3aW5kb3dGaWxtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dpbmRvd0ZsaW0nKTtcclxuXHR3aW5kb3dGaWxtLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgd2luZG93RGl2LmlubmVySFRNTCA9ICcnOyB9O1xyXG5cdFxyXG5cdC8vIEdldCBhbmQgc2V0dXAgdGhlIHpvb20gc2xpZGVyXHJcblx0em9vbVNsaWRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjem9vbS1zbGlkZXInKTtcclxuXHR6b29tU2xpZGVyLm9uaW5wdXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuXHR9O1xyXG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjem9vbS1pbicpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuICAgIH07XHJcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI3pvb20tb3V0Jykub25jbGljayA9IGZ1bmN0aW9uKCkgeyBcclxuXHRcdHpvb21TbGlkZXIuc3RlcFVwKCk7IFxyXG5cdFx0Z2FtZS5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxuXHR9O1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIGdpdmVuIHNjYWxlXHJcblx0dGhpcy5zY2FsZSA9IGJhc2VTY2FsZTtcclxuXHRcclxuXHQvLyBMb2FkIHRoZSBjYXNlIGZpbGVcclxuXHR2YXIgbG9hZERhdGEgPSBGaWxlTWFuYWdlci5sb2FkQ2FzZShKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGEnXSksIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjd2luZG93JykpO1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgYm9hcmRzXHJcblx0dGhpcy5jYXRlZ29yaWVzID0gbG9hZERhdGEuY2F0ZWdvcmllcztcclxuXHR0aGlzLmNyZWF0ZUxlc3Nvbk5vZGVzKHNlY3Rpb24pO1xyXG5cdFxyXG5cdC8vIERpc3BsYXkgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHR0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPSBsb2FkRGF0YS5jYXRlZ29yeTtcclxuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uc2hvdygpO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmJ1dHRvbi5jbGFzc05hbWUgPSBcImFjdGl2ZVwiO1xyXG5cdHRoaXMudXBkYXRlTm9kZSgpO1xyXG5cdHpvb21TbGlkZXIudmFsdWUgPSAtdGhpcy5nZXRab29tKCk7XHJcblx0XHJcblx0Ly8gU2V0dXAgdGhlIHNhdmUgYnV0dG9uXHJcblx0RmlsZU1hbmFnZXIucHJlcGFyZVppcChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2Jsb2InKSk7XHJcbn1cclxuXHJcbnZhciBwID0gZ2FtZS5wcm90b3R5cGU7XHJcblxyXG5wLmNyZWF0ZUxlc3Nvbk5vZGVzID0gZnVuY3Rpb24oc2VjdGlvbil7XHJcblx0dGhpcy5ib2FyZEFycmF5ID0gW107XHJcblx0dmFyIGJvdHRvbUJhciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYm90dG9tQmFyJyk7XHJcblx0Zm9yKHZhciBpPTA7aTx0aGlzLmNhdGVnb3JpZXMubGVuZ3RoO2krKyl7XHJcblx0XHQvLyBpbml0aWFsaXplIGVtcHR5XHJcblx0XHRcclxuXHRcdHRoaXMubGVzc29uTm9kZXMgPSBbXTtcclxuXHRcdC8vIGFkZCBhIG5vZGUgcGVyIHF1ZXN0aW9uXHJcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0Ly8gY3JlYXRlIGEgbmV3IGxlc3NvbiBub2RlXHJcblx0XHRcdHRoaXMubGVzc29uTm9kZXMucHVzaChuZXcgTGVzc29uTm9kZShuZXcgUG9pbnQodGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXS5wb3NpdGlvblBlcmNlbnRYLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLnBvc2l0aW9uUGVyY2VudFkpLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLmltYWdlTGluaywgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXSApICk7XHJcblx0XHRcdC8vIGF0dGFjaCBxdWVzdGlvbiBvYmplY3QgdG8gbGVzc29uIG5vZGVcclxuXHRcdFx0dGhpcy5sZXNzb25Ob2Rlc1t0aGlzLmxlc3Nvbk5vZGVzLmxlbmd0aC0xXS5xdWVzdGlvbiA9IHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal07XHJcblx0XHRcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjcmVhdGUgYSBib2FyZFxyXG5cdFx0dGhpcy5ib2FyZEFycmF5W2ldID0gbmV3IEJvYXJkKHNlY3Rpb24sIG5ldyBQb2ludChDb25zdGFudHMuYm9hcmRTaXplLngvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpLCB0aGlzLmxlc3Nvbk5vZGVzKTtcclxuXHRcdHZhciBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiQlVUVE9OXCIpO1xyXG5cdFx0YnV0dG9uLmlubmVySFRNTCA9IHRoaXMuY2F0ZWdvcmllc1tpXS5uYW1lO1xyXG5cdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0YnV0dG9uLm9uY2xpY2sgPSAoZnVuY3Rpb24oaSl7IFxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0aWYoZ2FtZS5hY3RpdmUpe1xyXG5cdFx0XHRcdFx0Z2FtZS5jaGFuZ2VCb2FyZChpKTtcclxuXHRcdFx0XHR9XHJcblx0XHR9fSkoaSk7XHJcblx0XHRpZihpIT0wICYmICF0aGlzLmJvYXJkQXJyYXlbaS0xXS5maW5pc2hlZClcclxuXHRcdFx0YnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdGJvdHRvbUJhci5hcHBlbmRDaGlsZChidXR0b24pO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W2ldLmJ1dHRvbiA9IGJ1dHRvbjtcclxuXHRcdHZhciBnYW1lID0gdGhpcztcclxuXHRcdHRoaXMuYm9hcmRBcnJheVtpXS51cGRhdGVOb2RlID0gZnVuY3Rpb24oKXtnYW1lLnVwZGF0ZU5vZGUoKTt9O1xyXG5cdH1cclxuXHRcclxuXHR0aGlzLm1vdXNlU3RhdGUgPSBuZXcgTW91c2VTdGF0ZSh0aGlzLmJvYXJkQXJyYXkpO1xyXG5cdFxyXG59XHJcblxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKGR0KXtcclxuXHRcclxuICAgIGlmKHRoaXMuYWN0aXZlKXtcclxuICAgIFxyXG4gICAgXHQvLyBwZXJmb3JtIGdhbWUgYWN0aW9uc1xyXG4gICAgXHR0aGlzLmFjdChkdCk7XHJcbiAgICBcdFxyXG5cdCAgICAvLyBkcmF3IHN0dWZmXHJcblx0ICAgIHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmRyYXcodGhpcy5zY2FsZSk7XHJcblx0ICAgIFxyXG4gICAgfVxyXG4gICAgZWxzZSBpZihwYXVzZWRUaW1lIT0wICYmIHdpbmRvd0Rpdi5pbm5lckhUTUw9PScnKVxyXG4gICAgXHR0aGlzLndpbmRvd0Nsb3NlZCgpO1xyXG4gICAgXHJcbn1cclxuXHJcbnAuYWN0ID0gZnVuY3Rpb24oZHQpe1xyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgbW91c2Ugc3RhdGVcclxuXHR0aGlzLm1vdXNlU3RhdGUudXBkYXRlKGR0LCB0aGlzLnNjYWxlKnRoaXMuZ2V0Wm9vbSgpKTtcclxuXHRcclxuXHQvKmlmICh0aGlzLm1vdXNlU3RhdGUubW91c2VDbGlja2VkKSB7XHJcblx0XHQvL2xvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYXV0b3NhdmVcIixEYXRhUGFyc2VyLmNyZWF0ZVhNTFNhdmVGaWxlKHRoaXMuYm9hcmRBcnJheSwgZmFsc2UpKTtcclxuXHRcdC8vY29uc29sZS5sb2cobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhdXRvc2F2ZVwiKSk7XHJcblx0fSovXHJcblx0XHJcbiAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgYm9hcmQgKGdpdmUgaXQgdGhlIG1vdXNlIG9ubHkgaWYgbm90IHpvb21pbmcpXHJcbiAgICB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5hY3QodGhpcy5zY2FsZSwgKHRoaXMuem9vbWluIHx8IHRoaXMuem9vbW91dCA/IG51bGwgOiB0aGlzLm1vdXNlU3RhdGUpLCBkdCk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIG5ldyBib2FyZCBhdmFpbGFibGVcclxuICAgIGlmKHRoaXMuYWN0aXZlQm9hcmRJbmRleCA8IHRoaXMuYm9hcmRBcnJheS5sZW5ndGgtMSAmJlxyXG4gICAgXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrMV0uYnV0dG9uLmRpc2FibGVkICYmIFxyXG4gICAgXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmZpbmlzaGVkKXtcclxuICAgIFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleCsxXS5idXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIFx0dGhpcy5wcm9tcHQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIFxyXG5cdC8vIElmIHRoZSBuZWVkcyB0byB6b29tIG91dCB0byBjZW50ZXJcclxuXHRpZih0aGlzLnpvb21vdXQpe1xyXG5cdFx0XHJcblx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHRcdHZhciBib2FyZCA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHJcblx0XHQvLyBab29tIG91dCBhbmQgbW92ZSB0b3dhcmRzIGNlbnRlclxyXG5cdFx0aWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0Ym9hcmQuem9vbSAtPSBkdCpDb25zdGFudHMuem9vbVNwZWVkO1xyXG5cdFx0ZWxzZSBpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuc3RhcnRab29tKVxyXG5cdFx0XHRib2FyZC56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuXHRcdGJvYXJkLm1vdmVUb3dhcmRzKG5ldyBQb2ludChDb25zdGFudHMuYm9hcmRTaXplLngvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpLCBkdCwgQ29uc3RhbnRzLnpvb21Nb3ZlU3BlZWQpO1xyXG5cdFx0XHJcblx0XHQvLyBVcGRhdGUgdGhlIHpvb20gc2xpZGVyXHJcblx0XHR6b29tU2xpZGVyLnZhbHVlID0gLXRoaXMuZ2V0Wm9vbSgpO1xyXG5cdFx0XHJcblx0XHQvLyBJZiBmdWxseSB6b29tZWQgb3V0IGFuZCBpbiBjZW50ZXIgc3RvcFxyXG5cdFx0aWYodGhpcy5nZXRab29tKCk9PUNvbnN0YW50cy5zdGFydFpvb20gJiYgYm9hcmQuYm9hcmRPZmZzZXQueD09Q29uc3RhbnRzLmJvYXJkU2l6ZS54LzIgJiYgYm9hcmQuYm9hcmRPZmZzZXQueT09Q29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpe1x0XHRcdFx0XHJcblx0XHRcdHRoaXMuem9vbW91dCA9IGZhbHNlO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYodGhpcy5wcm9tcHQpe1xyXG5cdFx0ICAgIFx0d2luZG93RGl2LmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwid2luZG93UHJvbXB0XCI+PGRpdj48aDE+VGhlIFwiJyt0aGlzLmNhdGVnb3JpZXNbdGhpcy5hY3RpdmVCb2FyZEluZGV4KzFdLm5hbWUrJ1wiIGNhdGVnb3J5IGlzIG5vdyBhdmFpbGFibGUhPC9oMT48L2Rpdj48L2Rpdj4nO1xyXG5cdFx0ICAgIFx0dmFyIHpvb21pbiA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHR3aW5kb3dEaXYucmVtb3ZlRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uZW5kJywgem9vbWluKTtcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdFx0XHRcdFx0d2luZG93RGl2LnN0eWxlLmFuaW1hdGlvbiA9ICdwcm9tcHRGYWRlIDFzJztcclxuXHRcdFx0XHRcdFx0dmFyIGZhZGVvdXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0XHRcdFx0XHRcdHdpbmRvd0Rpdi5yZW1vdmVFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCBmYWRlb3V0KTtcclxuXHRcdFx0XHRcdFx0XHR3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcblx0XHRcdFx0XHRcdFx0d2luZG93RGl2LnN0eWxlLmFuaW1hdGlvbiA9ICcnO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHdpbmRvd0Rpdi5hZGRFdmVudExpc3RlbmVyKCdhbmltYXRpb25lbmQnLCBmYWRlb3V0LCBmYWxzZSk7XHJcblx0XHRcdFx0XHR9LCA1MDApO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0d2luZG93RGl2LnN0eWxlLmFuaW1hdGlvbiA9ICdvcGVuV2luZG93IDAuNXMnO1xyXG5cdFx0ICAgIFx0d2luZG93RGl2LmFkZEV2ZW50TGlzdGVuZXIoJ2FuaW1hdGlvbmVuZCcsIHpvb21pbiwgZmFsc2UpO1xyXG5cdFx0ICAgIFx0dGhpcy5wcm9tcHQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgY2hhbmdpbmcgYm9hcmQgc3RhcnQgdGhhdCBwcm9jZXNzXHJcblx0XHRcdGlmKHRoaXMubmV3Qm9hcmQhPW51bGwpe1xyXG5cdFx0XHRcdHZhciBkaXIgPSB0aGlzLm5ld0JvYXJkIDwgdGhpcy5hY3RpdmVCb2FyZEluZGV4O1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmhpZGUoZGlyKTtcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPSB0aGlzLm5ld0JvYXJkO1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnNob3coZGlyKTtcclxuXHRcdFx0XHR6b29tU2xpZGVyLnZhbHVlID0gLXRoaXMuZ2V0Wm9vbSgpO1xyXG5cdFx0XHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcblx0XHRcdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0XHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmxvYWRlZCA9IGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0XHRnYW1lLmFjdGl2ZSA9IHRydWU7XHJcblx0XHRcdFx0XHRnYW1lLm5ld0JvYXJkID0gbnVsbDtcclxuXHRcdFx0XHRcdGdhbWUudXBkYXRlTm9kZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0gLy8gSWYgdGhlcmUgaXMgYSBuZXcgbm9kZSB6b29tIGludG8gaXRcclxuXHRlbHNlIGlmKHRoaXMuem9vbWluKXsgXHJcblx0XHRcclxuXHRcdC8vIEdldCB0aGUgY3VycmVudCBib2FyZFxyXG5cdFx0dmFyIGJvYXJkID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRcclxuXHRcdC8vIElmIGJvYXJkIGlzIG5vdCBmaW5pc2hlZCBsb29rIGZvciBuZXh0IG5vZGVcclxuXHRcdGlmKCFib2FyZC5maW5pc2hlZCAmJiB0aGlzLnRhcmdldE5vZGU9PW51bGwpe1xyXG5cdFx0XHR0aGlzLnRhcmdldE5vZGUgPSBib2FyZC5nZXRGcmVlTm9kZSgpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihib2FyZC5maW5pc2hlZCl7XHJcblx0XHRcdHRoaXMuem9vbWluID0gZmFsc2U7XHJcblx0XHRcdHRoaXMuem9vbW91dCA9IHRydWU7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFN0YXJ0IG1vdmluZyBhbmQgem9vbWluZyBpZiB0YXJnZXQgZm91bmRcclxuXHRcdGlmKHRoaXMuem9vbWluICYmIHRoaXMudGFyZ2V0Tm9kZSl7XHJcblx0XHJcblx0XHRcdC8vIFpvb20gaW4gYW5kIG1vdmUgdG93YXJkcyB0YXJnZXQgbm9kZVxyXG5cdFx0XHRpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuZW5kWm9vbSlcclxuXHRcdFx0XHRib2FyZC56b29tICs9IGR0KkNvbnN0YW50cy56b29tU3BlZWQ7XHJcblx0XHRcdGVsc2UgaWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLmVuZFpvb20pXHJcblx0XHRcdFx0Ym9hcmQuem9vbSA9IENvbnN0YW50cy5lbmRab29tO1xyXG5cdFx0XHRib2FyZC5tb3ZlVG93YXJkcyh0aGlzLnRhcmdldE5vZGUucG9zaXRpb24sIGR0LCBDb25zdGFudHMuem9vbU1vdmVTcGVlZCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHpvb20gc2xpZGVyXHJcblx0XHRcdHpvb21TbGlkZXIudmFsdWUgPSAtdGhpcy5nZXRab29tKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiByZWFjaGVkIHRoZSBub2RlIGFuZCB6b29tZWQgaW4gc3RvcCBhbmQgZ2V0IHJpZCBvZiB0aGUgdGFyZ2V0XHJcblx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPT1Db25zdGFudHMuZW5kWm9vbSAmJiBib2FyZC5ib2FyZE9mZnNldC54PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueCAmJiBib2FyZC5ib2FyZE9mZnNldC55PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueSl7XHJcblx0XHRcdFx0dGhpcy56b29taW4gPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldE5vZGUgPSBudWxsO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2V7IC8vIE9ubHkgaGFuZGxlIHpvb21pbmcgaWYgbm90IHBlcmZvcm1pbmcgYW5pbWF0aW9uIHpvb21cclxuXHRcclxuXHRcdC8vIEhhbmRsZSBwaW5jaCB6b29tXHJcblx0ICAgIGlmKHRoaXMubW91c2VTdGF0ZS56b29tRGlmZiE9MCl7XHJcblx0ICAgIFx0em9vbVNsaWRlci52YWx1ZSA9IHBpbmNoU3RhcnQgKyB0aGlzLm1vdXNlU3RhdGUuem9vbURpZmYgKiBDb25zdGFudHMucGluY2hTcGVlZDtcclxuXHQgICAgXHR0aGlzLnVwZGF0ZVpvb20oLXBhcnNlRmxvYXQoem9vbVNsaWRlci52YWx1ZSkpOyBcclxuXHQgICAgfVxyXG5cdCAgICBlbHNlXHJcblx0ICAgIFx0cGluY2hTdGFydCA9IE51bWJlcih6b29tU2xpZGVyLnZhbHVlKTtcclxuXHQgICAgXHJcblx0ICAgIC8vIEhhbmRsZSBtb3VzZSB6b29tXHJcblx0ICAgIGlmKHRoaXMubW91c2VTdGF0ZS5tb3VzZVdoZWVsRFkhPTApXHJcblx0ICAgIFx0dGhpcy56b29tKHRoaXMubW91c2VTdGF0ZS5tb3VzZVdoZWVsRFk8MCk7XHJcblx0fVxyXG5cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgaWYgc2hvdWxkIHBhdXNlXHJcbiAgICBpZih3aW5kb3dEaXYuaW5uZXJIVE1MIT0nJyAmJiBwYXVzZWRUaW1lKys+Myl7XHJcbiAgICBcdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcbiAgICBcdHdpbmRvd0Rpdi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgIFx0d2luZG93RmlsbS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgIH1cclxuICAgIFxyXG59XHJcblxyXG5wLnVwZGF0ZU5vZGUgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuem9vbWluID0gdHJ1ZTtcclxufVxyXG5cclxucC5nZXRab29tID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbTtcclxufVxyXG5cclxucC5zZXRab29tID0gZnVuY3Rpb24oem9vbSl7XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbSA9IHpvb207XHJcbn1cclxuXHJcbnAuem9vbSA9IGZ1bmN0aW9uKGRpcil7XHJcblx0aWYoZGlyKVxyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBEb3duKCk7XHJcbiAgICBlbHNlXHJcbiAgICBcdHpvb21TbGlkZXIuc3RlcFVwKCk7XHJcblx0dGhpcy5zZXRab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTtcclxufVxyXG5cclxucC5zZXRTY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKXtcclxuXHRmb3IodmFyIGk9MDtpPHRoaXMuYm9hcmRBcnJheS5sZW5ndGg7aSsrKVxyXG5cdFx0dGhpcy5ib2FyZEFycmF5W2ldLnVwZGF0ZVNpemUoKTtcclxuXHR0aGlzLnNjYWxlID0gc2NhbGU7XHJcbn1cclxuXHJcbnAuY2hhbmdlQm9hcmQgPSBmdW5jdGlvbihudW0pe1xyXG5cdGlmKG51bSE9dGhpcy5hY3RpdmVCb2FyZEluZGV4KXtcclxuXHRcdHRoaXMuYm9hcmRBcnJheVtudW1dLmJ1dHRvbi5jbGFzc05hbWUgPSBcImFjdGl2ZVwiO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYnV0dG9uLmNsYXNzTmFtZSA9IFwiXCI7XHJcblx0XHR0aGlzLm5ld0JvYXJkID0gbnVtO1xyXG5cdFx0dGhpcy56b29tb3V0ID0gdHJ1ZTtcclxuXHR9XHJcbn1cclxuXHJcbnAud2luZG93Q2xvc2VkID0gZnVuY3Rpb24oKSB7XHJcblx0XHJcblx0Ly8gVW5wYXVzZSB0aGUgZ2FtZSBhbmQgZnVsbHkgY2xvc2UgdGhlIHdpbmRvd1xyXG5cdHBhdXNlZFRpbWUgPSAwO1xyXG5cdHRoaXMuYWN0aXZlID0gdHJ1ZTtcclxuXHR3aW5kb3dEaXYuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHR3aW5kb3dGaWxtLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0cHJvY2VlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFxyXG5cdHRoaXMuc2F2ZSgpO1xyXG5cdFxyXG59XHJcblxyXG5wLnNhdmUgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgY3VycmVudCBjYXNlIGRhdGFcclxuXHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGEnXSk7XHJcblx0Y2FzZURhdGEuc2F2ZUZpbGUgPSBEYXRhUGFyc2VyLmNyZWF0ZVhNTFNhdmVGaWxlKHRoaXMuYWN0aXZlQm9hcmRJbmRleCwgdGhpcy5ib2FyZEFycmF5LCB0cnVlKTtcclxuXHRcclxuXHQvLyBBdXRvc2F2ZSBvbiB3aW5kb3cgY2xvc2VcclxuXHR2YXIgZmlsZXNUb1N0b3JlID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ud2luZG93Q2xvc2VkKCk7XHJcblx0aWYgKGZpbGVzVG9TdG9yZSl7XHJcblx0XHRmaWxlc1RvU3RvcmUuYm9hcmQgPSB0aGlzLmFjdGl2ZUJvYXJkSW5kZXg7XHJcblx0XHR0aGlzLnNhdmVGaWxlcy5wdXNoKGZpbGVzVG9TdG9yZSk7XHJcblx0XHR0aGlzLm5leHRGaWxlSW5TYXZlU3RhY2soY2FzZURhdGEpO1xyXG5cdH1cclxuXHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10gPSBKU09OLnN0cmluZ2lmeShjYXNlRGF0YSk7XHJcblx0XHJcbn1cclxuXHJcbnAubmV4dEZpbGVJblNhdmVTdGFjayA9IGZ1bmN0aW9uKGNhc2VEYXRhKXtcclxuXHRcclxuXHR2YXIgY3VyRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YSddKTtcclxuXHRjdXJEYXRhLnN1Ym1pdHRlZCA9IGNhc2VEYXRhLnN1Ym1pdHRlZDtcclxuXHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10gPSBKU09OLnN0cmluZ2lmeShjdXJEYXRhKTtcclxuXHRcclxuXHRpZih0aGlzLnNhdmVGaWxlcy5sZW5ndGg+MCl7XHJcblx0XHRGaWxlTWFuYWdlci5yZW1vdmVGaWxlc0ZvcihjYXNlRGF0YSwgdGhpcy5zYXZlRmlsZXNbMF0pO1xyXG5cdFx0RmlsZU1hbmFnZXIuYWRkTmV3RmlsZXNUb1N5c3RlbShjYXNlRGF0YSwgdGhpcy5zYXZlRmlsZXNbMF0sIHRoaXMubmV4dEZpbGVJblNhdmVTdGFjay5iaW5kKHRoaXMpKTtcclxuXHR9XHJcblx0dGhpcy5zYXZlRmlsZXMuc2hpZnQoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnYW1lO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKCcuLi9oZWxwZXIvZHJhd0xpYi5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi4vY2FzZS9xdWVzdGlvbi5qc1wiKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbnN0YW50cy5qc1wiKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi4vaGVscGVyL3BvaW50LmpzJyk7XHJcblxyXG52YXIgQ0hFQ0tfSU1BR0UgPSBcImltZy9pY29uUG9zdEl0Q2hlY2sucG5nXCI7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBsZXNzb25Ob2RlKHN0YXJ0UG9zaXRpb24sIGltYWdlUGF0aCwgcFF1ZXN0aW9uKXtcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLmRyYWdMb2NhdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICB0aGlzLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICB0aGlzLnR5cGUgPSBcImxlc3Nvbk5vZGVcIjtcclxuICAgIHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIHRoaXMuY2hlY2sgPSBuZXcgSW1hZ2UoKTtcclxuICAgIHRoaXMud2lkdGg7XHJcbiAgICB0aGlzLmhlaWdodDtcclxuICAgIHRoaXMucXVlc3Rpb24gPSBwUXVlc3Rpb247XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gMDtcclxuICAgIHRoaXMuY3VycmVudFN0YXRlID0gMDtcclxuICAgIHRoaXMubGluZVBlcmNlbnQgPSAwO1xyXG4gICAgXHJcbiAgICAvLyBza2lwIGFuaW1hdGlvbnMgZm9yIHNvbHZlZFxyXG4gICAgaWYgKHBRdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKSB0aGlzLmxpbmVQZXJjZW50ID0gMTtcclxuICAgIFxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pbWFnZSBsb2FkaW5nIGFuZCByZXNpemluZ1xyXG4gICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0LndpZHRoID0gdGhhdC5pbWFnZS5uYXR1cmFsV2lkdGg7XHJcbiAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmltYWdlLm5hdHVyYWxIZWlnaHQ7XHJcbiAgICAgICAgdmFyIG1heERpbWVuc2lvbiA9IENvbnN0YW50cy5ib2FyZFNpemUueC8xMDtcclxuICAgICAgICAvL3RvbyBzbWFsbD9cclxuICAgICAgICBpZih0aGF0LndpZHRoIDwgbWF4RGltZW5zaW9uICYmIHRoYXQuaGVpZ2h0IDwgbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC53aWR0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IG1heERpbWVuc2lvbiAvIHRoYXQuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoICogeDtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAqIHg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPiBtYXhEaW1lbnNpb24gfHwgdGhhdC5oZWlnaHQgPiBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSB0aGF0LndpZHRoIC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC5oZWlnaHQgLyBtYXhEaW1lbnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggLyB4O1xyXG4gICAgICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaGVpZ2h0IC8geDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoYXQucG9zaXRpb24ueCArPSB0aGF0LndpZHRoLzI7XHJcbiAgICAgICAgdGhhdC5wb3NpdGlvbi55ICs9IHRoYXQuaGVpZ2h0LzI7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IGltYWdlUGF0aDtcclxuICAgIHRoaXMuY2hlY2suc3JjID0gQ0hFQ0tfSU1BR0U7XHJcbn1cclxuXHJcbnZhciBwID0gbGVzc29uTm9kZS5wcm90b3R5cGU7XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcblxyXG5cdC8vIENoZWNrIGlmIHF1ZXN0aW9uIGlzIHZpc2libGVcclxuXHRpZih0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuSElEREVOKXtcclxuXHRcdGlmKHRoaXMucXVlc3Rpb24ucmV2ZWFsVGhyZXNob2xkIDw9IHRoaXMuY29ubmVjdGlvbnMpe1xyXG5cdFx0XHR0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlVOU09MVkVEO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG4gICAgLy9sZXNzb25Ob2RlLmRyYXdMaWIuY2lyY2xlKGN0eCwgdGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIDEwLCBcInJlZFwiKTtcclxuICAgIC8vZHJhdyB0aGUgaW1hZ2UsIHNoYWRvdyBpZiBob3ZlcmVkXHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgaWYodGhpcy5kcmFnZ2luZykge1xyXG4gICAgXHRjdHguc2hhZG93Q29sb3IgPSAneWVsbG93JztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDU7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy13ZWJraXQtZ3JhYmJpbmcnO1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctbW96LWdyYWJiaW5nJztcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZih0aGlzLm1vdXNlT3Zlcil7XHJcbiAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gJ2RvZGdlckJsdWUnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICB9XHJcbiAgICAvL2RyYXdpbmcgdGhlIGJ1dHRvbiBpbWFnZVxyXG4gICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgIFxyXG4gICAgLy9kcmF3aW5nIHRoZSBwaW5cclxuICAgIHN3aXRjaCAodGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGUpIHtcclxuICAgIFx0Y2FzZSAxOlxyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImJsdWVcIjtcclxuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJjeWFuXCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgIFx0Y2FzZSAyOlxyXG4gICAgIFx0XHRjdHguZHJhd0ltYWdlKHRoaXMuY2hlY2ssIHRoaXMucG9zaXRpb24ueCArIHRoaXMud2lkdGgvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgdGhpcy5wb3NpdGlvbi55ICsgdGhpcy5oZWlnaHQvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwLCBDb25zdGFudHMuYm9hcmRTaXplLngvNTApO1xyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IFwieWVsbG93XCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgfVxyXG5cdHZhciBzbWFsbGVyID0gdGhpcy53aWR0aCA8IHRoaXMuaGVpZ2h0ID8gdGhpcy53aWR0aCA6IHRoaXMuaGVpZ2h0O1xyXG5cdGN0eC5saW5lV2lkdGggPSBzbWFsbGVyLzMyO1xyXG5cclxuXHRjdHguYmVnaW5QYXRoKCk7XHJcblx0dmFyIG5vZGVQb2ludCA9IHRoaXMuZ2V0Tm9kZVBvaW50KCk7XHJcblx0Y3R4LmFyYyhub2RlUG9pbnQueCwgbm9kZVBvaW50LnksIHNtYWxsZXIqMy8zMiwgMCwgMipNYXRoLlBJKTtcclxuXHRjdHguY2xvc2VQYXRoKCk7XHJcblx0Y3R4LmZpbGwoKTtcclxuXHRjdHguc3Ryb2tlKCk7XHJcbiAgICBcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG5wLmdldE5vZGVQb2ludCA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIHNtYWxsZXIgPSB0aGlzLndpZHRoIDwgdGhpcy5oZWlnaHQgPyB0aGlzLndpZHRoIDogdGhpcy5oZWlnaHQ7XHJcblx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIgKyBzbWFsbGVyKjMvMTYsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIgKyBzbWFsbGVyKjMvMTYpO1xyXG59XHJcblxyXG5wLmNsaWNrID0gZnVuY3Rpb24obW91c2VTdGF0ZSl7XHJcbiAgICB0aGlzLnF1ZXN0aW9uLmRpc3BsYXlXaW5kb3dzKCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGVzc29uTm9kZTsiLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxubS5jbGVhciA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCkge1xyXG4gICAgY3R4LmNsZWFyUmVjdCh4LCB5LCB3LCBoKTtcclxufVxyXG5cclxubS5yZWN0ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoLCBjb2wsIGNlbnRlck9yaWdpbikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2w7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh4IC0gKHcgLyAyKSwgeSAtIChoIC8gMiksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLnN0cm9rZVJlY3QgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgsIGxpbmUsIGNvbCwgY2VudGVyT3JpZ2luKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IGxpbmU7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHggLSAodyAvIDIpLCB5IC0gKGggLyAyKSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5saW5lID0gZnVuY3Rpb24oY3R4LCB4MSwgeTEsIHgyLCB5MiwgdGhpY2tuZXNzLCBjb2xvcikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlja25lc3M7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0uY2lyY2xlID0gZnVuY3Rpb24oY3R4LCB4LCB5LCByYWRpdXMsIGNvbG9yKXtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgseSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvYXJkQnV0dG9uKGN0eCwgcG9zaXRpb24sIHdpZHRoLCBoZWlnaHQsIGhvdmVyZWQpe1xyXG4gICAgLy9jdHguc2F2ZSgpO1xyXG4gICAgaWYoaG92ZXJlZCl7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZG9kZ2VyYmx1ZVwiO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJsaWdodGJsdWVcIjtcclxuICAgIH1cclxuICAgIC8vZHJhdyByb3VuZGVkIGNvbnRhaW5lclxyXG4gICAgY3R4LnJlY3QocG9zaXRpb24ueCAtIHdpZHRoLzIsIHBvc2l0aW9uLnkgLSBoZWlnaHQvMiwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICAvL2N0eC5yZXN0b3JlKCk7XHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIENhdGVnb3J5ID0gcmVxdWlyZShcIi4uL2Nhc2UvY2F0ZWdvcnkuanNcIik7XHJcbnZhciBSZXNvdXJjZSA9IHJlcXVpcmUoXCIuLi9jYXNlL3Jlc291cmNlcy5qc1wiKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL2lwYXJEYXRhUGFyc2VyLmpzJyk7XHJcblxyXG4vLyBNb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBsb2FkIHRoZSBmaWxlIGVudHJ5IGFuZCBwYXJzZSB0aGUgeG1sXHJcbm0ubG9hZENhc2UgPSBmdW5jdGlvbihjYXNlRGF0YSwgd2luZG93RGl2KSB7XHJcbiAgICBcclxuICAgIHRoaXMuY2F0ZWdvcmllcyA9IFtdO1xyXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHhtbCBkYXRhXHJcblx0dmFyIHhtbERhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR2YXIgY2F0ZWdvcmllcyA9IFBhcnNlci5nZXRDYXRlZ29yaWVzQW5kUXVlc3Rpb25zKHhtbERhdGEsIHdpbmRvd0Rpdik7XHJcblx0XHJcblx0Ly8gbG9hZCB0aGUgbW9zdCByZWNlbnQgcHJvZ3Jlc3MgZnJvbSBzYXZlRmlsZS5pcGFyZGF0YVxyXG5cdHZhciBxdWVzdGlvbnMgPSBbXTtcclxuICAgIFxyXG5cdC8vIEdldCB0aGUgc2F2ZSBkYXRhXHJcblx0dmFyIHNhdmVEYXRhID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5zYXZlRmlsZSk7XHJcblx0Ly8gYWxlcnQgdXNlciBpZiB0aGVyZSBpcyBhbiBlcnJvclxyXG5cdGlmICghc2F2ZURhdGEpIHsgYWxlcnQgKFwiRVJST1Igbm8gc2F2ZSBkYXRhIGZvdW5kLCBvciBzYXZlIGRhdGEgd2FzIHVucmVhZGFibGVcIik7IHJldHVybjsgfVxyXG5cdC8vIHByb2dyZXNzXHJcblx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0XHJcblx0Ly8gcGFyc2UgdGhlIHNhdmUgZGF0YSBpZiBub3QgbmV3XHJcblx0aWYoc3RhZ2U+MCl7XHJcblx0XHRmb3IodmFyIGZpbGUgaW4gY2FzZURhdGEuc3VibWl0dGVkKXtcclxuXHRcdFx0aWYgKCFjYXNlRGF0YS5zdWJtaXR0ZWQuaGFzT3duUHJvcGVydHkoZmlsZSkpIGNvbnRpbnVlO1xyXG5cdFx0XHRmaWxlID0gZmlsZS5zdWJzdHIoZmlsZS5sYXN0SW5kZXhPZihcIi9cIikrMSk7XHJcblx0XHRcdHZhciBjYXQgPSBmaWxlLmluZGV4T2YoXCItXCIpLFxyXG5cdFx0XHRcdHF1ZSA9IGZpbGUuaW5kZXhPZihcIi1cIiwgY2F0KzEpLFxyXG5cdFx0XHRcdGZpbCA9IGZpbGUuaW5kZXhPZihcIi1cIiwgcXVlKzEpO1xyXG5cdFx0XHRjYXRlZ29yaWVzW051bWJlcihmaWxlLnN1YnN0cigwLCBjYXQpKV0uXHJcblx0XHRcdFx0cXVlc3Rpb25zW051bWJlcihmaWxlLnN1YnN0cihjYXQrMSwgcXVlLWNhdC0xKSldLlxyXG5cdFx0XHRcdGZpbGVzW051bWJlcihmaWxlLnN1YnN0cihxdWUrMSwgZmlsLXF1ZS0xKSldID0gXHJcblx0XHRcdFx0XHRmaWxlLnN1YnN0cihmaWxlLmluZGV4T2ZBdChcIi1cIiwgMykrMSk7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhjYXRlZ29yaWVzWzFdLnF1ZXN0aW9uc1s0XS5maWxlcyk7XHJcblx0XHRjb25zb2xlLmxvZyhjYXRlZ29yaWVzWzFdLnF1ZXN0aW9uc1s0XS5pbWFnZUxpbmspO1xyXG5cdFx0UGFyc2VyLmFzc2lnblF1ZXN0aW9uU3RhdGVzKGNhdGVnb3JpZXMsIHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25cIikpO1xyXG5cdH1cclxuXHRlbHNlXHJcblx0XHRzdGFnZSA9IDE7XHJcblx0XHJcblx0Ly8gcmV0dXJuIHJlc3VsdHNcclxuXHRyZXR1cm4ge2NhdGVnb3JpZXM6IGNhdGVnb3JpZXMsIGNhdGVnb3J5OnN0YWdlLTF9OyAvLyBtYXliZSBzdGFnZSArIDEgd291bGQgYmUgYmV0dGVyIGJlY2F1c2UgdGhleSBhcmUgbm90IHplcm8gaW5kZXhlZD9cclxuXHRcdFx0ICAgXHJcbn1cclxuXHRcdFx0XHRcdCBcclxuLy8gKioqKioqKioqKioqKioqKioqKioqKiBTQVZJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vKiBoZXJlJ3MgdGhlIGdlbmVyYWwgb3V0bGluZSBvZiB3aGF0IGlzIGhhcHBlbmluZzpcclxuc2VsZWN0U2F2ZUxvY2F0aW9uIHdhcyB0aGUgb2xkIHdheSBvZiBkb2luZyB0aGluZ3Ncclxubm93IHdlIHVzZSBjcmVhdGVaaXBcclxuIC0gd2hlbiB0aGlzIHdob2xlIHRoaW5nIHN0YXJ0cywgd2UgcmVxdWVzdCBhIGZpbGUgc3lzdGVtIGFuZCBzYXZlIGFsbCB0aGUgZW50cmllcyAoZGlyZWN0b3JpZXMgYW5kIGZpbGVzKSB0byB0aGUgYWxsRW50cmllcyB2YXJpYWJsZVxyXG4gLSB0aGVuIHdlIGdldCB0aGUgYmxvYnMgdXNpbmcgcmVhZEFzQmluYXJ5U3RyaW5nIGFuZCBzdG9yZSB0aG9zZSBpbiBhbiBhcnJheSB3aGVuIHdlIGFyZSBzYXZpbmcgXHJcbiAgLSAtIGNvdWxkIGRvIHRoYXQgb24gcGFnZSBsb2FkIHRvIHNhdmUgdGltZSBsYXRlci4uP1xyXG4gLSBhbnl3YXksIHRoZW4gd2UgLSBpbiB0aGVvcnkgLSB0YWtlIHRoZSBibG9icyBhbmQgdXNlIHppcC5maWxlKGVudHJ5Lm5hbWUsIGJsb2IpIHRvIHJlY3JlYXRlIHRoZSBzdHJ1Y3R1cmVcclxuIC0gYW5kIGZpbmFsbHkgd2UgZG93bmxvYWQgdGhlIHppcCB3aXRoIGRvd25sb2FkKClcclxuIFxyXG4qL1xyXG5cclxuLy8gY2FsbGVkIHdoZW4gdGhlIGdhbWUgaXMgbG9hZGVkLCBhZGQgb25jbGljayB0byBzYXZlIGJ1dHRvbiB0aGF0IGFjdHVhbGx5IGRvZXMgdGhlIHNhdmluZ1xyXG5tLnByZXBhcmVaaXAgPSBmdW5jdGlvbihzYXZlQnV0dG9uKSB7XHJcblx0Ly92YXIgY29udGVudCA9IHppcC5nZW5lcmF0ZSgpO1xyXG5cdFxyXG5cdC8vY29uc29sZS5sb2coXCJwcmVwYXJlIHppcFwiKTtcclxuXHRcclxuXHQvLyBjb2RlIGZyb20gSlNaaXAgc2l0ZVxyXG5cdGlmIChKU1ppcC5zdXBwb3J0LmJsb2IpIHtcclxuXHRcdC8vY29uc29sZS5sb2coXCJzdXBwb3J0cyBibG9iXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBsaW5rIGRvd25sb2FkIHRvIGNsaWNrXHJcblx0XHRzYXZlQnV0dG9uLm9uY2xpY2sgPSBzYXZlSVBBUjtcclxuICBcdH1cclxufVxyXG5cclxuLy8gY3JlYXRlIElQQVIgZmlsZSBhbmQgZG93bmxvYWQgaXRcclxuZnVuY3Rpb24gc2F2ZUlQQVIoKSB7XHJcblx0XHJcblx0dmFyIGNhc2VEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10pO1xyXG5cdFxyXG5cdHZhciB6aXAgPSBuZXcgSlNaaXAoKTtcclxuXHR6aXAuZmlsZShcImNhc2VGaWxlLmlwYXJkYXRhXCIsIGNhc2VEYXRhLmNhc2VGaWxlKTtcclxuXHR6aXAuZmlsZShcInNhdmVGaWxlLmlwYXJkYXRhXCIsIGNhc2VEYXRhLnNhdmVGaWxlKTtcclxuXHR2YXIgc3VibWl0dGVkID0gemlwLmZvbGRlcignc3VibWl0dGVkJyk7XHJcblx0Y29uc29sZS5sb2coY2FzZURhdGEuc3VibWl0dGVkKTtcclxuXHRmb3IgKHZhciBmaWxlIGluIGNhc2VEYXRhLnN1Ym1pdHRlZCkge1xyXG5cdFx0aWYgKCFjYXNlRGF0YS5zdWJtaXR0ZWQuaGFzT3duUHJvcGVydHkoZmlsZSkpIGNvbnRpbnVlO1xyXG5cdFx0dmFyIHN0YXJ0ID0gY2FzZURhdGEuc3VibWl0dGVkW2ZpbGVdLmluZGV4T2YoXCJiYXNlNjQsXCIpK1wiYmFzZTY0LFwiLmxlbmd0aDtcclxuXHRcdHN1Ym1pdHRlZC5maWxlKGZpbGUsIGNhc2VEYXRhLnN1Ym1pdHRlZFtmaWxlXS5zdWJzdHIoc3RhcnQpLCB7YmFzZTY0OiB0cnVlfSk7XHJcblx0fVxyXG5cclxuXHRcclxuXHR6aXAuZ2VuZXJhdGVBc3luYyh7dHlwZTpcImJhc2U2NFwifSkudGhlbihmdW5jdGlvbiAoYmFzZTY0KSB7XHJcblx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG5cdFx0YS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0YS5ocmVmID0gXCJkYXRhOmFwcGxpY2F0aW9uL3ppcDtiYXNlNjQsXCIgKyBiYXNlNjQ7XHJcblx0XHRhLmRvd25sb2FkID0gbG9jYWxTdG9yYWdlWydjYXNlTmFtZSddO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcclxuXHRcdGEuY2xpY2soKTtcclxuXHRcdGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XHJcblx0fSk7XHJcblx0XHJcbn1cclxuXHJcbi8qKioqKioqKioqKioqKioqKiBDQUNISU5HICoqKioqKioqKioqKioqKioqKiovXHJcblxyXG5tLnJlbW92ZUZpbGVzRm9yID0gZnVuY3Rpb24oY2FzZURhdGEsIHRvUmVtb3ZlKXtcclxuXHJcblx0dmFyIHF1ZXN0aW9uRGF0YSA9IHRvUmVtb3ZlLmJvYXJkK1wiLVwiK3RvUmVtb3ZlLnF1ZXN0aW9uK1wiLVwiO1xyXG5cdGZvcih2YXIgZmlsZSBpbiBjYXNlRGF0YS5zdWJtaXR0ZWQpe1xyXG5cdFx0aWYgKCFjYXNlRGF0YS5zdWJtaXR0ZWQuaGFzT3duUHJvcGVydHkoZmlsZSkgfHwgIWZpbGUuc3RhcnRzV2l0aChxdWVzdGlvbkRhdGEpKSBjb250aW51ZTtcclxuXHRcdGRlbGV0ZSBjYXNlRGF0YS5zdWJtaXR0ZWRbZmlsZV07XHJcblx0fVxyXG5cdFxyXG59XHJcblxyXG4vLyBBZGRzIGEgc3VibWl0dGVkIGZpbGUgdG8gdGhlIGxvY2FsIHN0b2FyZ2VcclxubS5hZGROZXdGaWxlc1RvU3lzdGVtID0gZnVuY3Rpb24oY2FzZURhdGEsIHRvU3RvcmUsIGNhbGxiYWNrKXtcclxuXHJcblx0Ly8gVXNlZCBmb3IgY2FsbGJhY2tcclxuXHR2YXIgdG90YWxDQiA9IDEsIGN1ckNCID0gMDtcclxuXHR2YXIgZmluaXNoZWQgPSBmdW5jdGlvbigpe1xyXG5cdFx0aWYoKytjdXJDQj49dG90YWxDQil7XHJcblx0XHRcdGNhbGxiYWNrKGNhc2VEYXRhKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0Zm9yKHZhciBpPTA7aTx0b1N0b3JlLmZpbGVzLmxlbmd0aDtpKyspe1xyXG5cdFx0KGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRcdFx0dmFyIGZpbGVuYW1lID0gdG9TdG9yZS5ib2FyZCtcIi1cIit0b1N0b3JlLnF1ZXN0aW9uK1wiLVwiK2krXCItXCIrdG9TdG9yZS5maWxlc1tpXS5uYW1lO1xyXG5cdFx0XHR0b3RhbENCKys7XHJcblx0XHRcdGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcblx0XHRcdFx0Y2FzZURhdGEuc3VibWl0dGVkW2ZpbGVuYW1lXSA9ICBldmVudC50YXJnZXQucmVzdWx0O1xyXG5cdFx0XHRcdGZpbmlzaGVkKCk7XHJcblx0XHQgICAgfTtcclxuXHRcdCAgICBmaWxlUmVhZGVyLnJlYWRBc0RhdGFVUkwodG9TdG9yZS5maWxlc1tpXSk7XHJcblx0XHR9KSgpO1xyXG5cdH1cclxuXHRcclxuXHRmaW5pc2hlZCgpO1xyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoXCIuLi9jYXNlL2NhdGVnb3J5LmpzXCIpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKFwiLi4vY2FzZS9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi4vZ2FtZS9jb25zdGFudHMuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi4vY2FzZS9xdWVzdGlvbi5qcycpO1xyXG5cclxuLy8gUGFyc2VzIHRoZSB4bWwgY2FzZSBmaWxlc1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIGtub3duIHRhZ3NcclxuLypcclxuYW5zd2VyXHJcbmJ1dHRvblxyXG5jYXRlZ29yeUxpc3RcclxuY29ubmVjdGlvbnNcclxuZWxlbWVudFxyXG5mZWVkYmFja1xyXG5pbnN0cnVjdGlvbnNcclxucmVzb3VyY2VcclxucmVzb3VyY2VMaXN0XHJcbnJlc291cmNlSW5kZXhcclxuc29mdHdhcmVMaXN0XHJcbnF1ZXN0aW9uXHJcbnF1ZXN0aW9uVGV4dFxyXG5xdXN0aW9uTmFtZVxyXG4qL1xyXG5cclxuLy8gY29udmVyc2lvblxyXG52YXIgc3RhdGVDb252ZXJ0ZXIgPSB7XHJcblx0XCJoaWRkZW5cIiA6IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTixcclxuXHRcInVuc29sdmVkXCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQsXHJcblx0XCJjb3JyZWN0XCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEXHJcbn1cclxuLy8gY29udmVyc2lvblxyXG52YXIgcmV2ZXJzZVN0YXRlQ29udmVydGVyID0gW1wiaGlkZGVuXCIsIFwidW5zb2x2ZWRcIiwgXCJjb3JyZWN0XCJdO1xyXG5cclxudmFyIGZpcnN0TmFtZSA9IFwidW5hc3NpZ25lZFwiO1xyXG52YXIgbGFzdE5hbWUgPSBcInVuYXNzaWduZWRcIjtcclxudmFyIGVtYWlsID0gXCJlbWFpbFwiO1xyXG5cclxuLy8gTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cdFx0XHRcdFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBzZXQgdGhlIHF1ZXN0aW9uIHN0YXRlc1xyXG5tLmFzc2lnblF1ZXN0aW9uU3RhdGVzID0gZnVuY3Rpb24oY2F0ZWdvcmllcywgcXVlc3Rpb25FbGVtcykge1xyXG5cdGNvbnNvbGUubG9nKFwicWVsZW1zOiBcIiArIHF1ZXN0aW9uRWxlbXMubGVuZ3RoKTtcclxuXHR2YXIgdGFsbHkgPSAwOyAvLyB0cmFjayB0b3RhbCBpbmRleCBpbiBuZXN0ZWQgbG9vcFxyXG5cdFxyXG5cdC8vIGFsbCBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8Y2F0ZWdvcmllcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc29sZS5sb2coXCJDQVRFR09SWSBcIiArIGkpO1xyXG5cdFx0Zm9yICh2YXIgaj0wOyBqPGNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zLmxlbmd0aDsgaisrLCB0YWxseSsrKSB7XHJcblx0XHRcdC8vIHN0b3JlIHF1ZXN0aW9uICBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHEgPSBjYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHN0b3JlIHRhZyBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHFFbGVtID0gcXVlc3Rpb25FbGVtc1t0YWxseV07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdGF0ZVxyXG5cdFx0XHRxLmN1cnJlbnRTdGF0ZSA9IHN0YXRlQ29udmVydGVyW3FFbGVtLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uU3RhdGVcIildO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHRpZihxLmp1c3RpZmljYXRpb24pXHJcblx0XHRcdFx0cS5qdXN0aWZpY2F0aW9uLnZhbHVlID0gcUVsZW0uZ2V0QXR0cmlidXRlKFwianVzdGlmaWNhdGlvblwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGwgY29ycmVjdCBhbnN3ZXIgaWYgc3RhdGUgaXMgY29ycmVjdFxyXG5cdFx0XHRpZihxLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHQgIHEuY29ycmVjdEFuc3dlcigpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyB4cG9zXHJcblx0XHRcdHEucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54KTtcclxuXHRcdFx0Ly8geXBvc1xyXG5cdFx0XHRxLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gdGFrZXMgdGhlIHhtbCBzdHJ1Y3R1cmUgYW5kIGZpbGxzIGluIHRoZSBkYXRhIGZvciB0aGUgcXVlc3Rpb24gb2JqZWN0XHJcbm0uZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyA9IGZ1bmN0aW9uKHhtbERhdGEsIHdpbmRvd0Rpdikge1xyXG5cdC8vIGlmIHRoZXJlIGlzIGEgY2FzZSBmaWxlXHJcblx0aWYgKHhtbERhdGEgIT0gbnVsbCkge1xyXG5cdFx0XHJcblx0XHQvLyBHZXQgcGxheWVyIGRhdGEgXHJcblx0XHRmaXJzdE5hbWUgPSB4bWxEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJwcm9maWxlRmlyc3RcIik7XHJcblx0XHRsYXN0TmFtZSA9IHhtbERhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcInByb2ZpbGVMYXN0XCIpO1xyXG5cdFx0eG1sRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF0uZ2V0QXR0cmlidXRlKFwicHJvZmlsZU1haWxcIik7XHJcblx0XHRcclxuXHRcdC8vIEZpcnN0IGxvYWQgdGhlIHJlc291cmNlc1xyXG5cdFx0dmFyIHJlc291cmNlRWxlbWVudHMgPSB4bWxEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VMaXN0XCIpWzBdLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VcIik7XHJcblx0XHR2YXIgcmVzb3VyY2VzID0gW107XHJcblx0XHRmb3IgKHZhciBpPTA7IGk8cmVzb3VyY2VFbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQvLyBMb2FkIGVhY2ggcmVzb3VyY2VcclxuXHRcdFx0cmVzb3VyY2VzW2ldID0gbmV3IFJlc291cmNlKHJlc291cmNlRWxlbWVudHNbaV0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBUaGVuIGxvYWQgdGhlIGNhdGVnb3JpZXNcclxuXHRcdHZhciBjYXRlZ29yeUVsZW1lbnRzID0geG1sRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5XCIpO1xyXG5cdFx0dmFyIGNhdGVnb3J5TmFtZXMgPSB4bWxEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlMaXN0XCIpWzBdLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZWxlbWVudFwiKTtcclxuXHRcdHZhciBjYXRlZ29yaWVzID0gW107XHJcblx0XHRmb3IgKHZhciBpPTA7IGk8Y2F0ZWdvcnlFbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQvLyBMb2FkIGVhY2ggY2F0ZWdvcnkgKHdoaWNoIGxvYWRzIGVhY2ggcXVlc3Rpb24pXHJcblx0XHRcdGNhdGVnb3JpZXNbaV0gPSBuZXcgQ2F0ZWdvcnkoY2F0ZWdvcnlOYW1lc1tpXS5pbm5lckhUTUwsIGNhdGVnb3J5RWxlbWVudHNbaV0sIHJlc291cmNlcywgd2luZG93RGl2KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBjYXRlZ29yaWVzO1xyXG5cdH1cclxuXHRyZXR1cm4gbnVsbFxyXG59XHJcblxyXG4vLyBjcmVhdGVzIGEgY2FzZSBmaWxlIGZvciB6aXBwaW5nXHJcbm0ucmVjcmVhdGVDYXNlRmlsZSA9IGZ1bmN0aW9uKGJvYXJkcykge1xyXG5cclxuXHQvLyBjcmVhdGUgc2F2ZSBmaWxlIHRleHRcclxuXHR2YXIgZGF0YVRvU2F2ZSA9IG0uY3JlYXRlWE1MU2F2ZUZpbGUoYm9hcmRzLCB0cnVlKTtcclxuXHRcclxuXHRjb25zb2xlLmxvZyAoXCJzYXZlRGF0YS5pcGFyIGRhdGEgY3JlYXRlZFwiKTtcclxuXHRcclxuXHQvL2lmIChjYWxsYmFjaykgY2FsbGJhY2soZGF0YVRvU2F2ZSk7XHJcblx0cmV0dXJuIGRhdGFUb1NhdmU7XHJcblx0XHJcbn1cclxuXHJcbi8vIGNyZWF0ZXMgdGhlIHhtbFxyXG5tLmNyZWF0ZVhNTFNhdmVGaWxlID0gZnVuY3Rpb24oYWN0aXZlSW5kZXgsIGJvYXJkcywgaW5jbHVkZU5ld2xpbmUpIHtcclxuXHQvLyBuZXdsaW5lXHJcblx0dmFyIG5sO1xyXG5cdGluY2x1ZGVOZXdsaW5lID8gbmwgPSBcIlxcblwiIDogbmwgPSBcIlwiO1xyXG5cdC8vIGhlYWRlclxyXG5cdHZhciBvdXRwdXQgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwidXRmLThcIj8+JyArIG5sO1xyXG5cdC8vIGNhc2UgZGF0YVxyXG5cdG91dHB1dCArPSAnPGNhc2UgY2F0ZWdvcnlJbmRleD1cIjNcIiBjYXNlU3RhdHVzPVwiJysoYWN0aXZlSW5kZXgrMSkrJ1wiIHByb2ZpbGVGaXJzdD1cIicrIGZpcnN0TmFtZSArJ1wiIHByb2ZpbGVMYXN0PVwiJyArIGxhc3ROYW1lICsgJ1wiIHByb2ZpbGVNYWlsPVwiJysgZW1haWwgKydcIj4nICsgbmw7XHJcblx0Ly8gcXVlc3Rpb25zIGhlYWRlclxyXG5cdG91dHB1dCArPSAnPHF1ZXN0aW9ucz4nICsgbmw7XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0YWcgc3RhcnRcclxuXHRcdFx0b3V0cHV0ICs9ICc8cXVlc3Rpb24gJztcclxuXHJcblx0XHRcdC8vIHF1ZXN0aW9uU3RhdGVcclxuXHRcdFx0b3V0cHV0ICs9ICdxdWVzdGlvblN0YXRlPVwiJyArIHJldmVyc2VTdGF0ZUNvbnZlcnRlcltxLmN1cnJlbnRTdGF0ZV0gKyAnXCIgJztcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHR2YXIgbmV3SnVzdGlmaWNhdGlvbiA9IHEuanVzdGlmaWNhdGlvbi52YWx1ZTtcclxuXHRcdFx0dmFyIGp1c3RpZmljYXRpb247XHJcblx0XHRcdG5ld0p1c3RpZmljYXRpb24gPyBqdXN0aWZpY2F0aW9uID0gbmV3SnVzdGlmaWNhdGlvbiA6IGp1c3RpZmljYXRpb24gPSBxLmp1c3RpZmljYXRpb25TdHJpbmc7XHJcblx0XHRcdC8vIGhhbmRsZSB1bmRlZmluZWRcclxuXHRcdFx0aWYgKCFqdXN0aWZpY2F0aW9uKSBqdXN0aWZpY2F0aW9uID0gXCJcIjtcclxuXHRcdFx0b3V0cHV0ICs9ICdqdXN0aWZpY2F0aW9uPVwiJyArIGp1c3RpZmljYXRpb24gKyAnXCIgJztcclxuXHRcdFx0Ly8gYW5pbWF0ZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdhbmltYXRlZD1cIicgKyAocS5jdXJyZW50U3RhdGUgPT0gMikgKyAnXCIgJzsgLy8gbWlnaHQgaGF2ZSB0byBmaXggdGhpcyBsYXRlclxyXG5cdFx0XHQvLyBsaW5lc1RyYW5jZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdsaW5lc1RyYWNlZD1cIjBcIiAnOyAvLyBtaWdodCBoYXZlIHRvIGZpeCB0aGlzIHRvb1xyXG5cdFx0XHQvLyByZXZlYWxUaHJlc2hvbGRcclxuXHRcdFx0b3V0cHV0ICs9ICdyZXZlYWxUaHJlc2hvbGQgID1cIicgKyBxLnJldmVhbFRocmVzaG9sZCAgKydcIiAnOyAvLyBhbmQgdGhpc1xyXG5cdFx0XHQvLyBwb3NpdGlvblBlcmNlbnRYXHJcblx0XHRcdG91dHB1dCArPSAncG9zaXRpb25QZXJjZW50WD1cIicgKyBVdGlsaXRpZXMubWFwKHEucG9zaXRpb25QZXJjZW50WCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCAwLCAxMDApICsgJ1wiICc7XHJcblx0XHRcdC8vIHBvc2l0aW9uUGVyY2VudFlcclxuXHRcdFx0b3V0cHV0ICs9ICdwb3NpdGlvblBlcmNlbnRZPVwiJyArIFV0aWxpdGllcy5tYXAocS5wb3NpdGlvblBlcmNlbnRZLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnksIDAsIDEwMCkgKyAnXCIgJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRhZyBlbmRcclxuXHRcdFx0b3V0cHV0ICs9ICcvPicgKyBubDtcclxuXHRcdH1cclxuXHR9XHJcblx0b3V0cHV0ICs9IFwiPC9xdWVzdGlvbnM+XCIgKyBubDtcclxuXHRvdXRwdXQgKz0gXCI8L2Nhc2U+XCIgKyBubDtcclxuXHRyZXR1cm4gb3V0cHV0O1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcblxyXG4vLyBwcml2YXRlIHZhcmlhYmxlc1xyXG52YXIgbW91c2VQb3NpdGlvbiwgcmVsYXRpdmVNb3VzZVBvc2l0aW9uO1xyXG52YXIgbW91c2VEb3duVGltZXIsIG1heENsaWNrRHVyYXRpb247XHJcbnZhciBtb3VzZVdoZWVsVmFsO1xyXG52YXIgcHJldlRpbWU7XHJcbnZhciBkZWx0YVk7XHJcbnZhciBzY2FsaW5nLCB0b3VjaFpvb20sIHN0YXJ0VG91Y2hab29tO1xyXG5cclxuZnVuY3Rpb24gbW91c2VTdGF0ZShib2FyZHMpe1xyXG5cdG1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgdGhpcy52aXJ0dWFsUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIFxyXG4gICAgLy9ldmVudCBsaXN0ZW5lcnMgZm9yIG1vdXNlIGludGVyYWN0aW9ucyB3aXRoIHRoZSBjYW52YXNlc1xyXG4gICAgdmFyIG1vdXNlU3RhdGUgPSB0aGlzO1xyXG4gICAgZm9yKHZhciBpPTA7aTxib2FyZHMubGVuZ3RoO2krKyl7XHJcbiAgICBcdHZhciBjYW52YXMgPSBib2FyZHNbaV0uY2FudmFzO1xyXG5cdCAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbihlKXtcclxuXHQgICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0ICAgICAgICB1cGRhdGVQb3NpdGlvbihlKTtcclxuXHQgICAgfSk7XHJcblx0ICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdCAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHQgICAgXHRpZihzY2FsaW5nKVxyXG5cdCAgICBcdFx0dXBkYXRlVG91Y2hQb3NpdGlvbnMoZSk7XHJcblx0ICAgIFx0ZWxzZVxyXG5cdCAgICBcdFx0dXBkYXRlUG9zaXRpb24oZS50b3VjaGVzWzBdKTtcclxuXHQgICAgfSk7XHJcblx0ICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uKGUpe1xyXG5cdCAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHQgICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IHRydWU7XHJcblx0ICAgIH0pO1xyXG5cdCAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoc3RhcnRcIiwgZnVuY3Rpb24oZSl7XHJcblx0ICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdCAgICBcdGlmKGUudG91Y2hlcy5sZW5ndGggPT0gMSAmJiAhc2NhbGluZyl7XHJcblx0XHQgICAgICAgIHVwZGF0ZVBvc2l0aW9uKGUudG91Y2hlc1swXSk7XHJcblx0XHQgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHRcdCAgICAgICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IHRydWU7XHJcblx0XHQgICAgICAgIH0pO1xyXG5cdCAgICBcdH1cclxuXHQgICAgXHRlbHNlIGlmKGUudG91Y2hlcy5sZW5ndGggPT0gMil7XHJcblx0ICAgIFx0XHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG5cdCAgICBcdFx0c2NhbGluZyA9IHRydWU7XHJcblx0ICAgIFx0XHR1cGRhdGVUb3VjaFBvc2l0aW9ucyhlKTtcclxuXHQgICAgXHRcdHN0YXJ0VG91Y2hab29tID0gdG91Y2hab29tO1xyXG5cdCAgICBcdH1cclxuXHQgICAgfSk7XHJcblx0ICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbihlKXtcclxuXHQgICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0ICAgIFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSBmYWxzZTtcclxuXHQgICAgfSk7XHJcblx0ICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIiwgZnVuY3Rpb24oZSl7XHJcblx0ICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdCAgICBcdGlmKHNjYWxpbmcpe1xyXG5cdCAgICBcdFx0c2NhbGluZyA9IGZhbHNlO1xyXG5cdCAgICBcdCAgICB0b3VjaFpvb20gPSAwO1xyXG5cdCAgICBcdCAgICBzdGFydFRvdWNoWm9vbSA9IDA7XHJcblx0ICAgIFx0fVxyXG5cdCAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcblx0ICAgIH0pO1xyXG5cdCAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihlKXtcclxuXHQgICAgXHRtb3VzZVN0YXRlLm1vdXNlSW4gPSB0cnVlO1xyXG5cdCAgICB9KTtcclxuXHQgICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCBmdW5jdGlvbihlKXtcclxuXHQgICAgXHRtb3VzZVN0YXRlLm1vdXNlSW4gPSBmYWxzZTtcclxuXHQgICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG5cdCAgICB9KTtcclxuXHQgICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLGZ1bmN0aW9uKGV2ZW50KXtcclxuXHQgICAgXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdCAgICAgICAgZGVsdGFZICs9IGV2ZW50LmRlbHRhWTtcclxuXHQgICAgfSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBTZXQgdmFyaWFibGUgZGVmYXVsdHNcclxuICAgIHRoaXMubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBmYWxzZTtcclxuICAgIG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIGRlbHRhWSA9IDA7XHJcbiAgICB0aGlzLm1vdXNlV2hlZWxEWSA9IDA7XHJcbiAgICB0aGlzLnpvb21EaWZmID0gMDtcclxuICAgIHRvdWNoWm9vbSA9IDA7XHJcbiAgICB0aGlzLm1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgbWF4Q2xpY2tEdXJhdGlvbiA9IDIwMDtcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlUG9zaXRpb24oZSl7XHJcbiAgICBtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChtb3VzZVBvc2l0aW9uLnggLSAod2luZG93LmlubmVyV2lkdGgvMi4wKSwgbW91c2VQb3NpdGlvbi55IC0gKHdpbmRvdy5pbm5lckhlaWdodC8yLjApKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVG91Y2hQb3NpdGlvbnMoZSl7XHJcblx0dmFyIGN1clRvdWNoZXMgPSBbXHJcblx0ICAgICAgICAgICAgICAgbmV3IFBvaW50KGUudG91Y2hlc1swXS5jbGllbnRYLCBlLnRvdWNoZXNbMF0uY2xpZW50WSksXHJcblx0ICAgICAgICAgICAgICAgbmV3IFBvaW50KGUudG91Y2hlc1sxXS5jbGllbnRYLCBlLnRvdWNoZXNbMV0uY2xpZW50WSlcclxuXHRdO1xyXG5cdHRvdWNoWm9vbSA9IE1hdGguc3FydChNYXRoLnBvdyhjdXJUb3VjaGVzWzBdLngtY3VyVG91Y2hlc1sxXS54LCAyKStNYXRoLnBvdyhjdXJUb3VjaGVzWzBdLnktY3VyVG91Y2hlc1sxXS55LCAyKSk7XHJcbn1cclxuXHJcbnZhciBwID0gbW91c2VTdGF0ZS5wcm90b3R5cGU7XHJcblxyXG4vLyBVcGRhdGUgdGhlIG1vdXNlIHRvIHRoZSBjdXJyZW50IHN0YXRlXHJcbnAudXBkYXRlID0gZnVuY3Rpb24oZHQsIHNjYWxlKXtcclxuICAgIFxyXG5cdC8vIFNhdmUgdGhlIGN1cnJlbnQgdmlydHVhbCBwb3NpdGlvbiBmcm9tIHNjYWxlXHJcblx0dGhpcy52aXJ0dWFsUG9zaXRpb24gPSBuZXcgUG9pbnQocmVsYXRpdmVNb3VzZVBvc2l0aW9uLngvc2NhbGUsIHJlbGF0aXZlTW91c2VQb3NpdGlvbi55L3NjYWxlKTs7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBjdXJydGVubCBkZWx0YSB5IGZvciB0aGUgbW91c2Ugd2hlZWxcclxuICAgIHRoaXMubW91c2VXaGVlbERZID0gZGVsdGFZO1xyXG4gICAgZGVsdGFZID0gMDtcclxuXHRcclxuXHQvLyBTYXZlIHRoZSB6b29tIGRpZmYgYW5kIHByZXYgem9vbVxyXG5cdGlmKHNjYWxpbmcpXHJcblx0XHR0aGlzLnpvb21EaWZmID0gc3RhcnRUb3VjaFpvb20gLSB0b3VjaFpvb207XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy56b29tRGlmZiA9IDA7XHJcblx0XHJcbiAgICAvLyBjaGVjayBtb3VzZSBjbGlja1xyXG4gICAgdGhpcy5tb3VzZUNsaWNrZWQgPSBmYWxzZTtcclxuICAgIGlmICh0aGlzLm1vdXNlRG93bilcclxuICAgIFx0bW91c2VEb3duVGltZXIgKz0gZHQ7XHJcbiAgICBlbHNle1xyXG4gICAgXHRpZiAobW91c2VEb3duVGltZXIgPiAwICYmIG1vdXNlRG93blRpbWVyIDwgbWF4Q2xpY2tEdXJhdGlvbilcclxuICAgIFx0XHR0aGlzLm1vdXNlQ2xpY2tlZCA9IHRydWU7XHJcbiAgICBcdG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIH1cclxuICAgIHRoaXMucHJldk1vdXNlRG93biA9IHRoaXMubW91c2VEb3duO1xyXG4gICAgdGhpcy5oYXNUYXJnZXQgPSBmYWxzZTtcclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG1vdXNlU3RhdGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIFBvaW50KHBYLCBwWSl7XHJcbiAgICB0aGlzLnggPSBwWDtcclxuICAgIHRoaXMueSA9IHBZO1xyXG59XHJcblxyXG52YXIgcCA9IFBvaW50LnByb3RvdHlwZTtcclxuXHJcbnAuYWRkID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLCB0aGlzLnkrcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLngsIHRoaXMueStwWC55KTtcclxufVxyXG5cclxucC5tdWx0ID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLCB0aGlzLnkqcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLngsIHRoaXMueSpwWC55KTtcclxufVxyXG5cclxucC5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKXtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpzY2FsZSwgdGhpcy55KnNjYWxlKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyByZXR1cm5zIG1vdXNlIHBvc2l0aW9uIGluIGxvY2FsIGNvb3JkaW5hdGUgc3lzdGVtIG9mIGVsZW1lbnRcclxubS5nZXRNb3VzZSA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgcmV0dXJuIG5ldyBQb2ludCgoZS5wYWdlWCAtIGUudGFyZ2V0Lm9mZnNldExlZnQpLCAoZS5wYWdlWSAtIGUudGFyZ2V0Lm9mZnNldFRvcCkpO1xyXG59XHJcblxyXG4vL3JldHVybnMgYSB2YWx1ZSByZWxhdGl2ZSB0byB0aGUgcmF0aW8gaXQgaGFzIHdpdGggYSBzcGVjaWZpYyByYW5nZSBcIm1hcHBlZFwiIHRvIGEgZGlmZmVyZW50IHJhbmdlXHJcbm0ubWFwID0gZnVuY3Rpb24odmFsdWUsIG1pbjEsIG1heDEsIG1pbjIsIG1heDIpe1xyXG4gICAgcmV0dXJuIG1pbjIgKyAobWF4MiAtIG1pbjIpICogKCh2YWx1ZSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKSk7XHJcbn1cclxuXHJcbi8vaWYgYSB2YWx1ZSBpcyBoaWdoZXIgb3IgbG93ZXIgdGhhbiB0aGUgbWluIGFuZCBtYXgsIGl0IGlzIFwiY2xhbXBlZFwiIHRvIHRoYXQgb3V0ZXIgbGltaXRcclxubS5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbHVlKSk7XHJcbn1cclxuXHJcbi8vZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBtb3VzZSBpcyBpbnRlcnNlY3RpbmcgdGhlIGFjdGl2ZSBlbGVtZW50XHJcbm0ubW91c2VJbnRlcnNlY3QgPSBmdW5jdGlvbihwTW91c2VTdGF0ZSwgcEVsZW1lbnQsIHBPZmZzZXR0ZXIpe1xyXG4gICAgaWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPiBwRWxlbWVudC5wb3NpdGlvbi54IC0gcEVsZW1lbnQud2lkdGgvMiAtIHBPZmZzZXR0ZXIueCAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCA8IHBFbGVtZW50LnBvc2l0aW9uLnggKyBwRWxlbWVudC53aWR0aC8yIC0gcE9mZnNldHRlci54KXtcclxuICAgICAgICBpZihwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA+IHBFbGVtZW50LnBvc2l0aW9uLnkgLSBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA8IHBFbGVtZW50LnBvc2l0aW9uLnkgKyBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSl7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHBNb3VzZVN0YXRlLmhhc1RhcmdldCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgXHRyZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gZ2V0cyB0aGUgeG1sIG9iamVjdCBvZiBhIHN0cmluZ1xyXG5tLmdldFhtbCA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0XHJcblx0Ly8gQ2xlYW4gdXAgdGhlIHhtbFxyXG5cdHhtbCA9IHhtbC50cmltKCk7XHJcblx0d2hpbGUoeG1sLmNoYXJDb2RlQXQoMCk8PTMyKVxyXG5cdFx0eG1sID0geG1sLnN1YnN0cigxKTtcclxuXHR4bWwgPSB4bWwudHJpbSgpO1xyXG5cdFxyXG5cdHZhciB4bWxEb2M7XHJcblx0aWYgKHdpbmRvdy5ET01QYXJzZXIpe1xyXG5cdFx0dmFyIHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuXHRcdHhtbERvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoeG1sLCBcInRleHQveG1sXCIpO1xyXG5cdH1cclxuXHRlbHNleyAvLyBJRVxyXG5cdFx0eG1sRG9jID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MRE9NXCIpO1xyXG5cdFx0eG1sRG9jLmFzeW5jID0gZmFsc2U7XHJcblx0XHR4bWxEb2MubG9hZFhNTCh4bWwpO1xyXG5cdH1cclxuXHRyZXR1cm4geG1sRG9jO1xyXG59XHJcblxyXG4vLyBnZXRzIHRoZSBzY2FsZSBvZiB0aGUgZmlyc3QgcGFyYW1ldGVyIHRvIHRoZSBzZWNvbmQgKHdpdGggdGhlIHNlY29uZCBmaXR0aW5nIGluc2lkZSB0aGUgZmlyc3QpXHJcbm0uZ2V0U2NhbGUgPSBmdW5jdGlvbih2aXJ0dWFsLCBhY3R1YWwpe1xyXG5cdHJldHVybiBhY3R1YWwueS92aXJ0dWFsLngqdmlydHVhbC55IDwgYWN0dWFsLnggPyBhY3R1YWwueS92aXJ0dWFsLnkgOiBhY3R1YWwueC92aXJ0dWFsLng7XHJcbn1cclxuXHJcbm0ucmVwbGFjZUFsbCA9IGZ1bmN0aW9uIChzdHIsIHRhcmdldCwgcmVwbGFjZW1lbnQpIHtcclxuXHR3aGlsZSAoc3RyLmluZGV4T2YodGFyZ2V0KSA+IC0xKSB7XHJcblx0XHRzdHIgPSBzdHIucmVwbGFjZSh0YXJnZXQscmVwbGFjZW1lbnQpO1xyXG5cdH1cclxuXHRyZXR1cm4gc3RyO1xyXG59XHJcblxyXG4vLyBHZXRzIHRoZSBpbmRleCBvZiB0aGUgbnRoIHNlYXJjaCBzdHJpbmcgKHN0YXJ0aW5nIGF0IDEsIDAgd2lsbCBhbHdheXMgcmV0dXJuIDApXHJcblN0cmluZy5wcm90b3R5cGUuaW5kZXhPZkF0ID0gZnVuY3Rpb24oc2VhcmNoLCBudW0pe1xyXG5cdHZhciBjdXJJbmRleCA9IDA7XHJcblx0Zm9yKHZhciBpPTA7aTxudW0gJiYgY3VySW5kZXghPS0xO2krKylcclxuXHRcdGN1ckluZGV4ID0gdGhpcy5pbmRleE9mKHNlYXJjaCwgY3VySW5kZXgrMSk7XHJcblx0cmV0dXJuIGN1ckluZGV4O1xyXG59XHJcbiIsIlxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxubS50YXNrV2luZG93ID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgdGFza1wiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdFRhc2tcXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cIndpbmRvd0NvbnRlbnRcIiBzdHlsZT1cIm92ZXJmbG93LXk6IHNjcm9sbDtoZWlnaHQ6MzV2aDtcIj5cXFxyXG5cdFx0PGgzPjxiPiV0aXRsZSU8L2I+PC9oMz5cXFxyXG5cdFx0PHA+JWluc3RydWN0aW9ucyU8L3A+XFxcclxuXHRcdDxocj5cXFxyXG5cdFx0PHA+PGI+JXF1ZXN0aW9uJTwvYj48L3A+XFxcclxuXHRcdDxocj5cXFxyXG5cdFx0PHAgY2xhc3M9XCJmZWVkYmFja1wiPjwvcD5cXFxyXG5cdDwvZGl2PlxcXHJcbjwvZGl2PlxcXHJcbic7XHJcblxyXG5cclxubS5yZXNvdXJjZVdpbmRvdyA9ICdcXFxyXG48ZGl2IGNsYXNzPVwid2luZG93IHJlc291cmNlXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidGl0bGVcIj5cXFxyXG5cdFx0UmVzb3VyY2VcXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cIndpbmRvd0NvbnRlbnRcIiBzdHlsZT1cIm92ZXJmbG93LXk6IHNjcm9sbDsgaGVpZ2h0OjIwdmg7XCI+XFxcclxuXHRcdCVyZXNvdXJjZXMlXFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5yZXNvdXJjZSA9ICdcXFxyXG48ZGl2IGNsYXNzPVwicmVzb3VyY2VJdGVtXCI+XFxcclxuICA8aW1nIHNyYz1cIiVpY29uJVwiLz5cXFxyXG4gICV0aXRsZSVcXFxyXG4gIDxhIGhyZWY9XCIlbGluayVcIiB0YXJnZXQ9XCJfYmxhbmtcIj5cXFxyXG4gICAgPGRpdiBjbGFzcz1cImNlbnRlclwiPlxcXHJcbiAgICAgIE9wZW5cXFxyXG4gICAgICA8aW1nIHNyYz1cIi4uL2ltZy9pY29uTGF1bmNoLnBuZ1wiLz5cXFxyXG4gICAgPC9kaXY+XFxcclxuICA8L2E+XFxcclxuPC9kaXY+XFxcclxuJztcclxuXHJcbm0uYW5zd2VyV2luZG93ID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgYW5zd2VyXCI+XFxcclxuXHQ8ZGl2IGNsYXNzPVwidGl0bGVcIj5cXFxyXG5cdFx0QW5zd2Vyc1xcXHJcblx0PC9kaXY+XFxcclxuXHQ8ZGl2IGNsYXNzPVwid2luZG93Q29udGVudFwiIHN0eWxlPVwibWluLWhlaWdodDoyMHZoO1wiPlxcXHJcblx0XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5maWxlV2luZG93ID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgZmlsZVwiPlxcXHJcbiAgPGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuICAgIEZpbGVzXFxcclxuICA8L2Rpdj5cXFxyXG4gIDxkaXYgY2xhc3M9XCJ3aW5kb3dDb250ZW50XCIgc3R5bGU9XCJoZWlnaHQ6MjV2aDttaW4taGVpZ2h0OiAxMDBweDtcIj5cXFxyXG5cdDxkaXYgY2xhc3M9XCJmaWxlQnV0dG9uIGZ1bGxcIj5cXFxyXG5cdFx0PGltZyBzcmM9XCJpbWcvaWNvbkZpbGVTdWJtaXQucG5nXCIvPjxicj5cXFxyXG5cdFx0QnJvd3NlIEFuZCBTdWJtaXRcXFxyXG5cdDwvZGl2PlxcXHJcbiAgICA8aW5wdXQgdHlwZT1cImZpbGVcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiBtdWx0aXBsZS8+XFxcclxuICA8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nO1xyXG5cclxubS5tZXNzYWdlV2luZG93ID0gJ1xcXHJcbjxkaXYgY2xhc3M9XCJ3aW5kb3cgbWVzc2FnZVwiPlxcXHJcblx0PGRpdiBjbGFzcz1cInRpdGxlXCI+XFxcclxuXHRcdE1lc3NhZ2VcXFxyXG5cdDwvZGl2PlxcXHJcblx0PGRpdiBjbGFzcz1cIndpbmRvd0NvbnRlbnRcIiBzdHlsZT1cImhlaWdodDo4MHZoO292ZXJmbG93LXk6c2Nyb2xsO1wiPlxcXHJcblx0XHQ8cD48Yj5Gcm9tIDwvYj4ldGl0bGUlPC9wPlxcXHJcblx0XHQ8aHI+XFxcclxuXHRcdDxwPjxiPlN1YmplY3QgPC9iPiVpbnN0cnVjdGlvbnMlPC9wPlxcXHJcblx0XHQ8aHI+XFxcclxuXHRcdDxwPiVxdWVzdGlvbiU8L3A+XFxcclxuXHQgIDxidXR0b24+TWFyayBhcyBSZWFkPC9idXR0b24+XFxcclxuXHQ8L2Rpdj5cXFxyXG48L2Rpdj5cXFxyXG4nOyIsInZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuLi9oZWxwZXIvdXRpbGl0aWVzLmpzJyk7XHJcblxyXG4vLyBIVE1MXHJcbnZhciBzZWN0aW9uO1xyXG5cclxuLy8gRWxlbWVudHNcclxudmFyIHRpdGxlLCBkZXNjcmlwdGlvbjtcclxudmFyIHJlc3VtZSwgc3RhcnQsIGJhY2s7XHJcblxyXG4vLyBUaGUgbmV4dCBwYWdlIHRvIG9wZW4gd2hlbiB0aGlzIG9uZSBjbG9zZXNcclxudmFyIG5leHQ7XHJcblxyXG52YXIgTkVYVCA9IE9iamVjdC5mcmVlemUoe05PTkU6IDAsIFRJVExFOiAxLCBORVdfUFJPRklMRTogMiwgT0xEX1BST0ZJTEU6IDN9KTtcclxuXHJcbmZ1bmN0aW9uIENhc2VNZW51KHBTZWN0aW9uKXtcclxuXHRzZWN0aW9uID0gcFNlY3Rpb247XHJcblx0bmV4dCA9IE5FWFQuTk9ORTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIGh0bWwgZWxlbWVudHNcclxuXHR0aXRsZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjdGl0bGUnKTtcclxuXHRkZXNjcmlwdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjZGVzY3JpcHRpb24nKTtcclxuXHRyZXN1bWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI3Jlc3VtZS1idXR0b24nKTtcclxuXHRzdGFydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjc3RhcnQtYnV0dG9uJyk7XHJcblx0YmFjayA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjYmFjay1idXR0b24nKTtcclxuXHRcclxuXHQvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG4gICAgdmFyIHBhZ2UgPSB0aGlzO1xyXG4gICAgcmVzdW1lLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHRwYWdlLm5leHQgPSBORVhULk9MRF9QUk9GSUxFO1xyXG4gICAgXHRwYWdlLmNsb3NlKCk7XHJcbiAgICB9O1xyXG4gICAgc3RhcnQub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcbiAgICBcdHBhZ2UubmV4dCA9IE5FWFQuTkVXX1BST0ZJTEU7XHJcbiAgICBcdHBhZ2UuY2xvc2UoKTtcclxuICAgIH07XHJcbiAgICBiYWNrLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHRwYWdlLm5leHQgPSBORVhULlRJVExFO1xyXG4gICAgXHRwYWdlLmNsb3NlKCk7XHJcbiAgICB9O1xyXG59XHJcblxyXG52YXIgcCA9IENhc2VNZW51LnByb3RvdHlwZTtcclxuXHJcbnAub3BlbiA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gRGlzcGxheSB0aGUgc2VjdGlvbiBob2xkaW5nIHRoZSBtZW51XHJcblx0c2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBjdXJyZW50IGNhc2UgZGF0YSBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuXHR2YXIgY2FzZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVsnY2FzZURhdGEnXSk7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBjYXNlIG5hbWUgYW5kIGRlc2NyaXB0aW9uIGZyb20gdGhlIHhtbFxyXG5cdHZhciBjdXJDYXNlID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5jYXNlRmlsZSkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdO1xyXG5cdHRpdGxlLmlubmVySFRNTCA9IGN1ckNhc2UuZ2V0QXR0cmlidXRlKFwiY2FzZU5hbWVcIik7XHJcblx0ZGVzY3JpcHRpb24uaW5uZXJIVE1MID0gY3VyQ2FzZS5nZXRBdHRyaWJ1dGUoXCJkZXNjcmlwdGlvblwiKTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIGNhc2Ugc2F2ZSBzdGF0dXNcclxuXHRjYXNlU3RhdHVzID0gVXRpbGl0aWVzLmdldFhtbChjYXNlRGF0YS5zYXZlRmlsZSkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0dmFyIHN0YXR1c01lc3NhZ2UgPSBcIlwiO1xyXG5cdHN3aXRjaChjYXNlU3RhdHVzKXtcclxuXHRcdGNhc2UgJzAnOlxyXG5cdFx0XHRzdGF0dXNNZXNzYWdlID0gXCJcIjtcclxuXHRcdFx0cmVzdW1lLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlICcxJzpcclxuXHRcdFx0c3RhdHVzTWVzc2FnZSA9IFwiIFtJbiBQcm9ncmVzc11cIjtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlICcyJzpcclxuXHRcdFx0c3RhdHVzTWVzc2FnZSA9IFwiIFtDb21wbGV0ZWRdXCI7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxuICAgIHRpdGxlLmlubmVySFRNTCArPSBzdGF0dXNNZXNzYWdlO1xyXG4gICAgXHJcbn1cclxuXHJcbnAuY2xvc2UgPSBmdW5jdGlvbigpe1xyXG5cdHNlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRpZih0aGlzLm9uY2xvc2UpXHJcblx0XHR0aGlzLm9uY2xvc2UoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYXNlTWVudTtcclxubW9kdWxlLmV4cG9ydHMuTkVYVCA9IE5FWFQ7IiwidmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4uL2hlbHBlci91dGlsaXRpZXMuanMnKTtcclxuXHJcbi8vIEhUTUxcclxudmFyIHNlY3Rpb247XHJcblxyXG4vL0VsZW1lbnRzXHJcbnZhciB0aXRsZTtcclxudmFyIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGVtYWlsO1xyXG52YXIgZmlyc3ROYW1lSW5wdXQsIGxhc3ROYW1lSW5wdXQsIGVtYWlsSW5wdXQ7XHJcbnZhciBwcm9jZWVkLCBiYWNrO1xyXG5cclxuLy8gSWYgbWFraW5nIGEgbmV3IHByb2ZpbGUgb3Igbm90XHJcbnZhciBuZXdQcm9maWxlO1xyXG5cclxuLy8gVGhlIGN1ciBjYXNlXHJcbnZhciBjdXJDYXNlO1xyXG5cclxuLy8gVGhlIG5leHQgcGFnZSB0byBvcGVuIHdoZW4gdGhpcyBvbmUgY2xvc2VzXHJcbnZhciBuZXh0O1xyXG5cclxudmFyIE5FWFQgPSBPYmplY3QuZnJlZXplKHtOT05FOiAwLCBDQVNFOiAxLCBCT0FSRDogMn0pO1xyXG5cclxuZnVuY3Rpb24gUHJvZmlsZU1lbnUocFNlY3Rpb24pe1xyXG5cdHNlY3Rpb24gPSBwU2VjdGlvbjtcclxuXHRuZXh0ID0gTkVYVC5OT05FO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgaHRtbCBlbGVtZW50c1xyXG5cdHRpdGxlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICN0aXRsZScpO1xyXG5cdGZpcnN0TmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjZmlyc3QtbmFtZScpO1xyXG5cdGxhc3ROYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNsYXN0LW5hbWUnKTtcclxuXHRlbWFpbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjZW1haWwnKTtcclxuXHRmaXJzdE5hbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjaW5wdXQtZmlyc3QtbmFtZScpO1xyXG5cdGxhc3ROYW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2lucHV0LWxhc3QtbmFtZScpO1xyXG5cdGVtYWlsSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJytzZWN0aW9uLmlkKycgI2lucHV0LWVtYWlsJyk7XHJcblx0cHJvY2VlZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjcHJvY2VlZC1idXR0b24nKTtcclxuXHRiYWNrID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNiYWNrLWJ1dHRvbicpO1xyXG4gICAgXHJcblx0Ly8gU2V0dXAgdGhlIGJ1dHRvbnNcclxuXHRiYWNrLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgXHRwYWdlLm5leHQgPSBORVhULkNBU0U7XHJcbiAgICBcdHBhZ2UuY2xvc2UoKTtcclxuICAgIH07XHJcblx0dmFyIHBhZ2UgPSB0aGlzO1xyXG4gICAgcHJvY2VlZC5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgIFx0cGFnZS5uZXh0ID0gTkVYVC5CT0FSRDtcclxuICAgIFx0aWYobmV3UHJvZmlsZSl7XHJcblx0XHRcdGN1ckNhc2Uuc2V0QXR0cmlidXRlKFwicHJvZmlsZUZpcnN0XCIsIGZpcnN0TmFtZUlucHV0LnZhbHVlKTtcclxuXHRcdFx0Y3VyQ2FzZS5zZXRBdHRyaWJ1dGUoXCJwcm9maWxlTGFzdFwiLCBsYXN0TmFtZUlucHV0LnZhbHVlKTtcclxuXHRcdFx0Y3VyQ2FzZS5zZXRBdHRyaWJ1dGUoXCJwcm9maWxlTWFpbFwiLCBlbWFpbElucHV0LnZhbHVlKTtcclxuXHRcdFx0Y3VyQ2FzZS5zZXRBdHRyaWJ1dGUoXCJjYXNlU3RhdHVzXCIsIFwiMFwiKTtcclxuICAgIFx0fVxyXG4gICAgXHRlbHNlXHJcblx0XHRcdGN1ckNhc2Uuc2V0QXR0cmlidXRlKFwiY2FzZVN0YXR1c1wiLCBcIjFcIik7XHJcbiAgICBcdHZhciBjYXNlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlWydjYXNlRGF0YSddKTtcclxuICAgIFx0Y2FzZURhdGEuc2F2ZUZpbGUgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKGN1ckNhc2UpO1xyXG5cdFx0bG9jYWxTdG9yYWdlWydjYXNlRGF0YSddID0gSlNPTi5zdHJpbmdpZnkoY2FzZURhdGEpO1xyXG4gICAgXHRwYWdlLmNsb3NlKCk7XHJcbiAgICB9O1xyXG59XHJcblxyXG52YXIgcCA9IFByb2ZpbGVNZW51LnByb3RvdHlwZTtcclxuXHJcbnAub3BlbiA9IGZ1bmN0aW9uKHBOZXdQcm9maWxlKXtcclxuXHJcblx0XHJcblx0Ly8gU2F2ZSB0aGUgc3RhdHVzIG9mIG5ldyBwcm9maWxlIGZvciB0aGUgcHJvY2NlZWQgYnV0dG9uXHJcblx0bmV3UHJvZmlsZSA9IHBOZXdQcm9maWxlO1xyXG5cdFxyXG5cdC8vIE1ha2UgdGhlIG1lbnUgdmlzaWJsZVxyXG5cdHNlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdFxyXG5cdC8vIFRoZSBjYXNlIGRhdGEgYW5kIHRoZSB0aXRsZSBlbGVtZW50XHJcblx0dmFyIGNhc2VEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10pO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgY2FzZVxyXG5cdHZhciBzYXZlRmlsZSA9IFV0aWxpdGllcy5nZXRYbWwoY2FzZURhdGEuc2F2ZUZpbGUpO1xyXG5cdGN1ckNhc2UgPSBzYXZlRmlsZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF07XHJcblx0XHJcblx0Ly8gU2V0IHVwIHRoZSBwYWdlIGZvciBhIG5ldyBwcm9maWxlXHJcblx0aWYobmV3UHJvZmlsZSl7XHJcblx0XHRcclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGl0bGVcclxuXHRcdHRpdGxlLmlubmVySFRNTCA9IFwiRW50ZXIgUHJvZmlsZSBJbmZvcm1hdGlvblwiO1xyXG5cdFx0XHJcblx0XHQvLyBEaXNwbGF5IHRoZSBpbnB1dHMgYW5kIGNsZWFyIHRoZSBuYW1lc1xyXG5cdFx0ZW1haWwuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdFx0Zmlyc3ROYW1lSW5wdXQuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdFx0bGFzdE5hbWVJbnB1dC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcblx0XHRmaXJzdE5hbWUuaW5uZXJIVE1MID0gJyc7XHJcblx0XHRsYXN0TmFtZS5pbm5lckhUTUwgPSAnJztcclxuXHRcdFxyXG5cdFx0XHJcblx0XHQvLyBNYWtlIGl0IHNvIHRoYXQgcHJvY2VlZCBpcyBkaXNhYmxlZCB1bnRpbCBhbGwgdGhyZWUgaW5wdXRzIGhhdmUgdmFsdWVzXHJcblx0XHR2YXIgY2hlY2tQcm9jZWVkID0gZnVuY3Rpb24oKXtcclxuXHRcdFx0aWYoZmlyc3ROYW1lSW5wdXQudmFsdWU9PVwiXCIgfHxcclxuXHRcdFx0XHRsYXN0TmFtZUlucHV0LnZhbHVlPT1cIlwiIHx8XHJcblx0XHRcdFx0ZW1haWxJbnB1dC52YWx1ZT09XCJcIilcclxuXHRcdFx0XHRwcm9jZWVkLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHByb2NlZWQuZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcdH07XHJcblx0XHRmaXJzdE5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGVja1Byb2NlZWQpO1xyXG5cdFx0bGFzdE5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGVja1Byb2NlZWQpO1xyXG5cdFx0ZW1haWxJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGVja1Byb2NlZWQpO1xyXG5cdFx0Y2hlY2tQcm9jZWVkKCk7XHJcblx0XHRcclxuXHR9XHJcblx0Ly8gU2V0IHVwIHRoZSBwYWdlIGZvciBhbiBvbGQgcHJvZmlsZVxyXG5cdGVsc2V7XHJcblx0XHRcclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGl0bGVcclxuXHRcdHRpdGxlLmlubmVySFRNTCA9IFwiQ29uZmlybSBQcm9maWxlIEluZm9ybWF0aW9uXCI7XHJcblx0XHRcclxuXHRcdC8vIEhpZGUgdGhlIGVtYWlsIGFuZCB0ZXh0Ym94ZXMgYW5kIGRpc3BsYXkgdGhlIGN1cnJlbnQgbmFtZVxyXG5cdFx0ZW1haWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRcdGZpcnN0TmFtZUlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRsYXN0TmFtZUlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0XHRmaXJzdE5hbWUuaW5uZXJIVE1MID0gY3VyQ2FzZS5nZXRBdHRyaWJ1dGUoXCJwcm9maWxlRmlyc3RcIik7XHJcblx0XHRmaXJzdE5hbWUuc3R5bGUuZm9udFdlaWdodCA9ICdib2xkJztcclxuXHRcdGxhc3ROYW1lLmlubmVySFRNTCA9IGN1ckNhc2UuZ2V0QXR0cmlidXRlKFwicHJvZmlsZUxhc3RcIik7XHJcblx0XHRsYXN0TmFtZS5zdHlsZS5mb250V2VpZ2h0ID0gJ2JvbGQnO1xyXG5cdFx0XHJcblx0XHQvLyBNYWtlIHByb2NjZWVkIG5vdCBkaXNhYmxlZFxyXG5cdFx0cHJvY2VlZC5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdFx0XHJcblx0fVxyXG5cdFxyXG59XHJcblxyXG5wLmNsb3NlID0gZnVuY3Rpb24oKXtcclxuXHRzZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0aWYodGhpcy5vbmNsb3NlKVxyXG5cdFx0dGhpcy5vbmNsb3NlKCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUHJvZmlsZU1lbnU7XHJcbm1vZHVsZS5leHBvcnRzLk5FWFQgPSBORVhUOyIsIlxyXG4vLyBIVE1MXHJcbnZhciBzZWN0aW9uO1xyXG5cclxuLy8gUGFydHMgb2YgdGhlIGh0bWxcclxudmFyIGxvYWRJbnB1dCwgbG9hZEJ1dHRvbiwgZGVtb0J1dHRvbiwgY29udGludWVCdXR0b247XHJcblxyXG4vLyBUaGUgbmV4dCBwYWdlIHRvIG9wZW4gd2hlbiB0aGlzIG9uZSBjbG9zZXNcclxudmFyIG5leHQ7XHJcblxyXG52YXIgTkVYVCA9IE9iamVjdC5mcmVlemUoe05PTkU6IDAsIEJPQVJEOiAxLCBDQVNFOiAyfSk7XHJcblxyXG5mdW5jdGlvbiBUaXRsZU1lbnUocFNlY3Rpb24pe1xyXG5cdHNlY3Rpb24gPSBwU2VjdGlvbjtcclxuXHRuZXh0ID0gTkVYVC5OT05FO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgbG9hZCBidXR0b24gYW5kIGlucHV0XHJcblx0bG9hZElucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNsb2FkLWlucHV0Jyk7XHJcblx0bG9hZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnK3NlY3Rpb24uaWQrJyAjbG9hZC1idXR0b24nKTtcclxuXHRkZW1vQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNkZW1vLWJ1dHRvbicpO1xyXG5cdGNvbnRpbnVlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycrc2VjdGlvbi5pZCsnICNjb250aW51ZS1idXR0b24nKTtcclxuXHRcclxuXHQvLyBTZXR1cCB0aGUgYnV0dG9uc1xyXG5cdGRlbW9CdXR0b24ub25jbGljayA9IHRoaXMuZGVtby5iaW5kKHRoaXMpO1xyXG5cdGxvYWRCdXR0b24ub25jbGljayA9IGxvYWRJbnB1dC5jbGljay5iaW5kKGxvYWRJbnB1dCk7XHJcblx0bG9hZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMubG9hZEZpbGUuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG5cdGNvbnRpbnVlQnV0dG9uLm9uY2xpY2sgPSB0aGlzLmNsb3NlLmJpbmQodGhpcyk7XHJcbn1cclxuXHJcbnZhciBwID0gVGl0bGVNZW51LnByb3RvdHlwZTtcclxuXHJcbnAub3BlbiA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gU2V0dXAgY29udGludWUgYnV0dG9uIGJhc2VkIG9uIGxvY2FsIHN0b2FyZ2VcclxuXHRpZihsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10pXHJcblx0XHRjb250aW51ZUJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdGVsc2VcclxuXHRcdGNvbnRpbnVlQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHR0aGlzLm5leHQgPSBORVhULkJPQVJEO1xyXG5cdFxyXG5cdC8vIERpc3BsYXkgdGhlIHNlY3Rpb24gaG9sZGluZyB0aGUgbWVudVxyXG5cdHNlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICcnO1xyXG5cdFxyXG5cdC8vIFNldCB0aGUgYnV0dG9uIHRvIG5vdCBkaXNhYmxlZCBpbiBjYXNlIGNvbWluZyBiYWNrIHRvIHRoaXMgbWVudVxyXG5cdGxvYWRCdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRsb2FkSW5wdXQuZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRkZW1vQnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0XHJcbn1cclxuXHJcbnAuZGVtbyA9IGZ1bmN0aW9uKCl7XHJcblxyXG5cdGlmKGxvY2FsU3RvcmFnZVsnY2FzZURhdGEnXSAmJiAhY29uZmlybShcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBzdGFydCBhIG5ldyBjYXNlPyBZb3VyIGF1dG9zYXZlIGRhdGEgd2lsbCBiZSBsb3N0IVwiKSlcclxuXHRcdHJldHVybjtcclxuXHRcdFxyXG5cdC8vIFNldCB0aGUgYnV0dG9uIHRvIGRpc2FibGVkIHNvIHRoYXQgaXQgY2FuJ3QgYmUgcHJlc3NlZCB3aGlsZSBsb2FkaW5nXHJcblx0bG9hZEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcblx0bG9hZElucHV0LmRpc2FibGVkID0gdHJ1ZTtcclxuXHRkZW1vQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHR2YXIgcGFnZSA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdFx0ICBcdFxyXG5cdFx0IFx0Ly8gc2luY2UgdGhlIHVzZXIgaXMgbG9hZGluZyBhIGZyZXNoIGZpbGUsIGNsZWFyIHRoZSBhdXRvc2F2ZSAoc29vbiB3ZSB3b24ndCB1c2UgdGhpcyBhdCBhbGwpXHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYXV0b3NhdmVcIixcIlwiKTtcclxuXHRcdFx0bG9jYWxTdG9yYWdlWydjYXNlTmFtZSddID0gXCJkZW1vLmlwYXJcIjtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENyZWF0ZSBhIHdvcmtlciBmb3IgdW56aXBwaW5nIHRoZSBmaWxlXHJcblx0XHRcdHZhciB6aXBXb3JrZXIgPSBuZXcgV29ya2VyKFwibGliL3VuemlwLmpzXCIpO1xyXG5cdFx0XHR6aXBXb3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIFNhdmUgdGhlIGJhc2UgdXJsIHRvIGxvY2FsIHN0b3JhZ2VcclxuXHRcdFx0XHRsb2NhbFN0b3JhZ2VbJ2Nhc2VEYXRhJ10gPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlLmRhdGEpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGNhbGxiYWNrXHJcblx0XHRcdFx0cGFnZS5uZXh0ID0gTkVYVC5CT0FSRDtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhtZXNzYWdlLmRhdGEpO1xyXG5cdFx0XHRcdHBhZ2UuY2xvc2UoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU3RhcnQgdGhlIHdvcmtlclxyXG5cdFx0XHR6aXBXb3JrZXIucG9zdE1lc3NhZ2UocmVxdWVzdC5yZXNwb25zZSk7XHJcblx0ICB9XHJcblx0fTtcclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJkZW1vLmlwYXJcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcblx0XHJcbn1cclxuXHJcbnAubG9hZEZpbGUgPSBmdW5jdGlvbihldmVudCl7XHJcblx0XHJcblx0aWYobG9jYWxTdG9yYWdlWydjYXNlRGF0YSddICYmICFjb25maXJtKFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN0YXJ0IGEgbmV3IGNhc2U/IFlvdXIgYXV0b3NhdmUgZGF0YSB3aWxsIGJlIGxvc3QhXCIpKVxyXG5cdFx0cmV0dXJuO1xyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSBhIGlwYXIgZmlsZSB3YXMgY2hvb3NlblxyXG5cdGlmKCFsb2FkSW5wdXQudmFsdWUuZW5kc1dpdGgoXCJpcGFyXCIpKXtcclxuXHRcdGFsZXJ0KFwiWW91IGRpZG4ndCBjaG9vc2UgYW4gaXBhciBmaWxlISB5b3UgY2FuIG9ubHkgbG9hZCBpcGFyIGZpbGVzIVwiKTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0bG9jYWxTdG9yYWdlWydjYXNlTmFtZSddID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XHJcblxyXG5cdC8vIFNldCB0aGUgYnV0dG9uIHRvIGRpc2FibGVkIHNvIHRoYXQgaXQgY2FuJ3QgYmUgcHJlc3NlZCB3aGlsZSBsb2FkaW5nXHJcblx0bG9hZEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcblx0bG9hZElucHV0LmRpc2FibGVkID0gdHJ1ZTtcclxuXHRkZW1vQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHQvLyBDcmVhdGUgYSByZWFkZXIgYW5kIHJlYWQgdGhlIHppcFxyXG5cdHZhciBwYWdlID0gdGhpcztcclxuXHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFxyXG5cdFx0Ly8gc2luY2UgdGhlIHVzZXIgaXMgbG9hZGluZyBhIGZyZXNoIGZpbGUsIGNsZWFyIHRoZSBhdXRvc2F2ZSAoc29vbiB3ZSB3b24ndCB1c2UgdGhpcyBhdCBhbGwpXHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9zYXZlXCIsXCJcIik7XHJcblx0XHRcclxuXHRcdC8vIENyZWF0ZSBhIHdvcmtlciBmb3IgdW56aXBwaW5nIHRoZSBmaWxlXHJcblx0XHR2YXIgemlwV29ya2VyID0gbmV3IFdvcmtlcihcImxpYi91bnppcC5qc1wiKTtcclxuXHRcdHppcFdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTYXZlIHRoZSBiYXNlIHVybCB0byBsb2NhbCBzdG9yYWdlXHJcblx0XHRcdGxvY2FsU3RvcmFnZVsnY2FzZURhdGEnXSA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UuZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBSZWRpcmVjdCB0byB0aGUgbmV4dCBwYWdlXHJcblx0XHRcdHBhZ2UubmV4dCA9IE5FWFQuQ0FTRTtcclxuXHRcdFx0cGFnZS5jbG9zZSgpO1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gU3RhcnQgdGhlIHdvcmtlclxyXG5cdFx0emlwV29ya2VyLnBvc3RNZXNzYWdlKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xyXG5cdFx0XHJcblx0fTtcclxuXHRyZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZXZlbnQudGFyZ2V0LmZpbGVzWzBdKTtcclxuXHRcclxufVxyXG5cclxucC5jbG9zZSA9IGZ1bmN0aW9uKCl7XHJcblx0c2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdGlmKHRoaXMub25jbG9zZSlcclxuXHRcdHRoaXMub25jbG9zZSgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpdGxlTWVudTtcclxubW9kdWxlLmV4cG9ydHMuTkVYVCA9IE5FWFQ7Il19
