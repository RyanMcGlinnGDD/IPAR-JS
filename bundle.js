(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
//imports
var Game = require('./modules/game.js');
var Point = require('./modules/point.js');
var MouseState = require('./modules/mouseState.js');
var Utility = require('./modules/utilities.js');
var DrawLib = require('./modules/drawLib.js');
var DOM_interface = require('./modules/DOM_interface.js');

//game objects
var game;
var canvas;
var ctx;
var utility;
var drawLib;

//responsiveness
var header;
var activeHeight;
var center;

//mouse handling
var mousePosition;
var relativeMousePosition;
var mouseDown;
var mouseIn;
var mouseDownTimer;
var mouseClicked;
var maxClickDuration; // milliseconds

// html DOM
var htmlElemHandler;

//persistent utilities
var prevTime; // date in milliseconds
var dt; // delta time in milliseconds

//fires when the window loads
window.onload = function(e){
    initializeVariables();
    loop();
}

//initialization, mouse events, and game instantiation
function initializeVariables(){
    canvas = document.querySelector('canvas');
    ctx = canvas.getContext('2d');
    utility = new Utility();
    drawLib = new DrawLib();
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    console.log("Canvas Dimensions: " + canvas.width + ", " + canvas.height);
    
    htmlElemHandler = new DOM_interface();
    
    header = document.querySelector('header');
    activeHeight = canvas.offsetHeight - header.offsetHeight;
    center = new Point(canvas.width/2, activeHeight/2 + header.offsetHeight);
    
    mousePosition = new Point(0,0);
    relativeMousePosition = new Point(0,0);
    
    //event listeners for mouse interactions with the canvas
    canvas.addEventListener("mousemove", function(e){
        var boundRect = canvas.getBoundingClientRect();
        mousePosition = new Point(e.clientX - boundRect.left, e.clientY - boundRect.top);
        relativeMousePosition = new Point(mousePosition.x - (canvas.offsetWidth/2.0), mousePosition.y - (header.offsetHeight + activeHeight/2.0));        
    });
    mouseDown = false;
    canvas.addEventListener("mousedown", function(e){
        mouseDown = true;
    });
    canvas.addEventListener("mouseup", function(e){
        mouseDown = false;
    });
    mouseIn = false;
    mouseDownTimer = 0;
    mouseClicked = false;
    maxClickDuration = 200;
    canvas.addEventListener("mouseover", function(e){
        mouseIn = true;
    });
    canvas.addEventListener("mouseout", function(e){
        mouseIn = false;
        mouseDown = false;
    });
    
    prevTime = Date.now();
    dt = 0;
    
    game = new Game(utility, drawLib);
}

//fires once per frame
function loop(){
	// loop
    window.requestAnimationFrame(loop.bind(this));
    
    // update delta time
    dt = Date.now() - prevTime;
    prevTime = Date.now();
    
    // check mouse click
    mouseClicked = false;
    if (mouseDown) { mouseDownTimer += dt; }
    else { if (mouseDownTimer > 0 && mouseDownTimer < maxClickDuration) { mouseClicked = true; } mouseDownTimer = 0; }
    
    // update game
    game.update(ctx, canvas, dt, center, activeHeight, new MouseState(mousePosition, relativeMousePosition, mouseDown, mouseIn, mouseClicked));
}

//listens for changes in size of window and adjusts variables accordingly
window.addEventListener("resize", function(e){
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    activeHeight = canvas.height - header.offsetHeight;
    center = new Point(canvas.width / 2, activeHeight / 2 + header.offsetHeight)
    
    console.log("Canvas Dimensions: " + canvas.width + ", " + canvas.height);
});




},{"./modules/DOM_interface.js":2,"./modules/drawLib.js":5,"./modules/game.js":7,"./modules/mouseState.js":10,"./modules/point.js":12,"./modules/utilities.js":14}],2:[function(require,module,exports){
"use strict";

// references to the dom elements
var refs = undefined;

function hideElement(elem) {
	elem.style.display = "none";
	console.log(elem.id + " hidden");
}

function showElement(elem) {
	elem.style.display = "block";
}

function DOM_interface() {
	refs = {
		superPanel: document.querySelector(".questionPanels"),
		text: document.querySelector(".multipleChoiceText"),
		answers: document.querySelector(".multipleChoiceAnswers"),
		email: document.querySelector(".emailQuestion"),
		resources: document.querySelector(".resources"),
		closeButton: document.querySelector(".closeBtn"),
		proceedButton: document.querySelector(".proceedBtn")
	}
	refs.closeButton.onclick = function() {
		hideElement(refs.superPanel);
	}
}

var p = DOM_interface.prototype;

module.exports = DOM_interface;
},{}],3:[function(require,module,exports){
"use strict";

//parameter is a point that denotes starting position
function board(startPosition, lessonNodes){
    this.position = startPosition;
    this.lessonNodeArray = lessonNodes;
}

board.drawLib = undefined;

//prototype
var p = board.prototype;

p.move = function(pX, pY){
    this.position.x += pX;
    this.position.y += pY;
};

p.update = function() {
	// for each  node
    for(var i=0; i<this.lessonNodeArray.length; i++){
	var activeNode = this.lessonNodeArray[i]; 
		// handle click
		if (activeNode.clicked && activeNode.question.currentState == activeNode.question.SOLVE_STATE.UNSOLVED) {
		
			// check for valid connections
			if (!activeNode.question.connections) continue;
			
			// add connections
			for (var j = 0; j < activeNode.question.connections.length; j++) {
			
				// update each connection's linksAwayFromOrigin value
				this.lessonNodeArray[activeNode.question.connections[j] - 1].linksAwayFromOrigin = activeNode.linksAwayFromOrigin + 1;
				this.lessonNodeArray[activeNode.question.connections[j] - 1].question.currentState = 1;
			}
			
            activeNode.question.currentState = activeNode.question.SOLVE_STATE.SOLVED;
            
			// record that the click has been dealt with
			activeNode.clicked = false;
		}
	}
}

p.draw = function(ctx, center, activeHeight, boardOffset){
    ctx.save();
    
    this.position = boardOffset;
    //translate to the center of the screen
    ctx.translate(center.x - this.position.x, center.y - this.position.y);
    //ctx.translate(boardOffset.x,boardOffset.y);
	
	// draw the nodes
    for(var i = 0; i < this.lessonNodeArray.length; i++){
    
    	// temporarily hide all but the first question
		if (this.lessonNodeArray[i].question.revealThreshold > this.lessonNodeArray[i].linksAwayFromOrigin) continue;
    	
    	// draw the node itself
        this.lessonNodeArray[i].draw(ctx);
    }

	// draw the pins and lines
	for(var i=0; i<this.lessonNodeArray.length; i++){
		
		// only show valiid questions
		if (this.lessonNodeArray[i].question.revealThreshold > this.lessonNodeArray[i].linksAwayFromOrigin) continue;
		
		// draw the pin in the corner with margin 5,5
        var pinX = this.lessonNodeArray[i].position.x - this.lessonNodeArray[i].width*this.lessonNodeArray[i].scaleFactor/2 + 15;
        var pinY = this.lessonNodeArray[i].position.y - this.lessonNodeArray[i].height*this.lessonNodeArray[i].scaleFactor/2 + 15;
		
		// set line style
		ctx.strokeStyle = "rgba(0,0,105,0.2)";
		ctx.lineWidth = 1;
        
        // check to see if the question property is valid
        if (!this.lessonNodeArray[i].question.connections) continue;
        for (var j=0; j<this.lessonNodeArray[i].question.connections.length; j++) {
        	
        	// temporarily hide all but the first question
			if (this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1].question.revealThreshold > this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1].linksAwayFromOrigin) continue;
        	
        	// go to the index in the array that corresponds to the connected node on this board and save its position
        	// connection index saved in the lessonNode's question
        	var connection = this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1];
        	var cPos = connection.position;
        	var cWidth = connection.width;
        	var cHeight = connection.height;
        	var cScale = connection.scaleFactor;
        	
        	// draw the line
        	ctx.beginPath();
        	// translate to start (pin)
        	ctx.moveTo(pinX,pinY);
        	ctx.lineTo(cPos.x - cWidth*cScale/2 + 15, cPos.y - cHeight*cScale/2 + 15);
        	ctx.closePath();
        	ctx.stroke();
        	//console.log("line drawn from "+this.lessonNodeArray[i].position.x+", "+this.lessonNodeArray[i].position.y+" to "+connectionPos.x+", "+connectionPos.y);
        }
    }
    
    ctx.restore();
};

module.exports = board;

//this is an object named Board and this is its javascript
//var Board = require('./objects/board.js');
//var b = new Board();
    
},{}],4:[function(require,module,exports){
"use strict";

//parameter is a point that denotes starting position
function button(startPosition, width, height){
    this.position = position;
    this.width = width;
    this.height = height;
    this.clicked = false;
    this.hovered = false;
}
button.drawLib = undefined;

var p = button.prototype;

p.draw = function(ctx){
    ctx.save();
    var col;
    if(this.hovered){
        col = "dodgerblue";
    }
    else{
        col = "lightblue";
    }
    //draw rounded container
    boardButton.drawLib.rect(ctx, this.position.x - this.width/2, this.position.y - this.height/2, this.width, this.height, col);

    ctx.restore();
};

module.exports = button;
},{}],5:[function(require,module,exports){
"use strict";
function drawLib(){
    
}

var p = drawLib.prototype;

p.clear = function(ctx, x, y, w, h) {
    ctx.clearRect(x, y, w, h);
}

p.rect = function(ctx, x, y, w, h, col, centerOrigin) {
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

p.line = function(ctx, x1, y1, x2, y2, thickness, color) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
}

p.circle = function(ctx, x, y, radius, color){
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

module.exports = drawLib;
},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
"use strict";
var Board = require('./board.js');
var Point = require('./point.js');
var DrawLib = require('./drawLib.js');
var LessonNode = require('./lessonNode.js');
var Utilities = require('./utilities.js');
var boardPhase = require('./phases/boardPhase.js');

// debug line
var debugLine;

//"enumeration"
var currentPhase;

//utilities
var drawLib;
var utility;

//mouse management
var mouseState;
var previousMouseState;
var draggingDisabled;
var mouseTarget;
var mouseSustainedDown;

//phase handling
var phaseObject;


function game(pUtility, pDrawLib){
    utility = pUtility;
    drawLib = pDrawLib;
    currentPhase = 2;
    debugLine = document.querySelector('#debugLine');
    
    phaseObject = new boardPhase("./data/myData.xml");
    
    draggingDisabled = false;
    mouseSustainedDown = false;
}

//changes the phase object based on the phase number input
function phaseChanger(phaseNum){
    
}

var p = game.prototype;

p.update = function(ctx, canvas, dt, center, activeHeight, pMouseState){
    // mouse
    previousMouseState = mouseState;
    mouseState = pMouseState;
    mouseTarget = 0;
    if(typeof previousMouseState === 'undefined'){
        previousMouseState = mouseState;
    }
    //update stuff
    p.act(pMouseState, previousMouseState);
    //draw stuff
    p.draw(ctx, canvas, center, activeHeight);
    
    //update the active phase object
    phaseObject.update(ctx, canvas, dt, center, activeHeight, pMouseState);
}

p.act = function(pMouseState, previousMouseState){

    //if the phase object is different change it
    if(phaseObject.currentPhase != currentPhase){
        phaseChanger(phaseObject.currentPhase);
    }
    
    
    //collision detection, iterate through each node in the active board
    /*for(var i = 0; i < board.lessonNodeArray.length; i++){
        var targetLessonNode = board.lessonNodeArray[i];
        utility.mouseIntersect(mouseState, targetLessonNode, board.position, targetLessonNode.scaleFactor);
        if(targetLessonNode.mouseOver == true){
            mouseTarget = targetLessonNode;
            break;
        }
    }
    
    //if the element that the mouse is hovering over is NOT the canvas
    if(mouseTarget != 0){
        //if mouseDown
        if(mouseState.mouseDown == true && previousMouseState.mouseDown == false){
            mouseSustainedDown = true;
            draggingDisabled = true;
        }
        //if mouseUp click event
        else if(mouseState.mouseDown == false && previousMouseState.mouseDown == true){
            console.log(mouseTarget.type);
            mouseTarget.click(mouseState);
        }
    }
    else{
        //if not a sustained down
        if(mouseSustainedDown == false){
            draggingDisabled = false;
        }
    }
    if(mouseState.mouseDown == false && previousMouseState.mouseDown == true){
        mouseSustainedDown = false;
    }
    
    //moving the board
    if(mouseState.mouseDown == true && draggingDisabled == false){
        board.move(previousMouseState.position.x - mouseState.position.x, previousMouseState.position.y - mouseState.position.y);
    }
    */
    
    
    
    
    
    debugLine.innerHTML = "mousePosition: x = " + mouseState.relativePosition.x + ", y = " + mouseState.relativePosition.y + 
    "<br>Clicked = " + mouseState.mouseDown + 
    "<br>Over Canvas = " + mouseState.mouseIn;
}

p.draw = function(ctx, canvas, center, activeHeight){
    //draw debug background
    ctx.save();
    drawLib.clear(ctx, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    drawLib.rect(ctx, 0, 0, canvas.offsetWidth, canvas.offsetHeight, "white", false);
    drawLib.line(ctx, canvas.offsetWidth/2, center.y - activeHeight/2, canvas.offsetWidth/2, canvas.offsetHeight, 2, "lightgray");
    drawLib.line(ctx, 0, center.y, canvas.offsetWidth, center.y, 2, "lightGray");
    ctx.restore();
}

module.exports = game;
},{"./board.js":3,"./drawLib.js":5,"./lessonNode.js":9,"./phases/boardPhase.js":11,"./point.js":12,"./utilities.js":14}],8:[function(require,module,exports){
"use strict"
var Utilities = require('./utilities.js');

var Question = require("./question.js");

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

// the xml structure that stores the data
var rawData;
var utilities;

// constructor
function iparDataParser(url, callback) {
    utilities = new Utilities();
    
    this.categories = [];
    this.questions = [];
    
	// get XML
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        rawData = xhr.responseXML;
        this.categories = p.getCategoriesAndQuestions();
        //callback(this.questions); instead of returning the questions, return the 
        callback(this.categories);
    }
    xhr.open("GET", url, true);
    xhr.send();
}

var p = iparDataParser.prototype;

// takes the xml structure and fills in the data for the question object
p.getCategoriesAndQuestions = function() {
	// if there is a case file
	if (rawData != null) {
		var categoryElements = rawData.getElementsByTagName("category");
		var categories = [];
		for (var h=0; h<categoryElements.length; h++) {
			// buttons are the top-level element for the questions
			var questionElements = categoryElements[h].getElementsByTagName("button");
			var questions = [];
			// create questions
			for (var i=0; i<questionElements.length; i++) 
			{
				// fill question
				/* question needs these things:
				index;             //int
				correctAnswer;     //int
				questionText;      //string
				questionType	   //int
				answerText;        //string array
				feedbackText;      //string array
				imageLink;         //string
				connections;       //string array
				instructions;      //string
				resources;         //resourceItem
				revealThreshold;   //int
	
				justification;     //string
				fileSubmitCount;   //int
				animated;          //bool
				linesTraced;       //int
				revealBuffer;      //int
				*/
				// create a question object
				questions[i] = new Question();
			
				// index (may not exhibit expected behavior)
				questions[i].index = i;
                
                //determine scale of the screen
                var temp = document.querySelector('canvas');
                
                //positionPercentX
                questions[i].positionPercentX = utilities.map(questionElements[i].getAttribute("xPositionPercent"), 0, 100, 0, temp.width);
                
                //positionPercentY
                questions[i].positionPercentY = utilities.map(questionElements[i].getAttribute("yPositionPercent"), 0, 100, 0, temp.height);
			
				// correct answer number
				questions[i].correctAnswer = questionElements[i].getAttribute("correctAnswer");
			
				// q type
				questions[i].questionType = questionElements[i].getAttribute("questionType");
			
				// question text
				questions[i].questionText = questionElements[i].getElementsByTagName("questionText")[0].textContent;
			
				// get an array of answers
				var answers = questionElements[i].getElementsByTagName("answer");
				// initialize question's answerText property
				questions[i].answerText = [];
				// loop through and add answer's textContent
				for (var j=0; j<answers.length; j++) {
					questions[i].answerText.push(answers[j].textContent);
				}
			
				// get an array of feedback
				var feedback = questionElements[i].getElementsByTagName("feedback");
				// initialize question's feedbackText property
				questions[i].feedbackText = [];
				// loop through and add feedback's textContent
				for (var j=0; j<feedback.length; j++) {
					questions[i].feedbackText.push(feedback[j].textContent);
				}
			
				// image link
				questions[i].imageLink = questionElements[i].getAttribute("imageLink");
				// alter image link string for new file structure
				questions[i].imageLink = questions[i].imageLink.replace("assets",".").replace("software/","");
			
				// connections
				questions[i].connections = [];
				var connectionElems = questionElements[i].getElementsByTagName("connections");
				for (var j=0; j<connectionElems.length; j++) {
					var connectionElem = connectionElems[j];
					if (connectionElem) questions[i].connections.push(connectionElem.textContent);
				}
			
				// instructions
				questions[i].instructions = questionElements[i].getElementsByTagName("instructions")[0].textContent;
			
				// get an array of resources
				var resources = questionElements[i].getElementsByTagName("resource");
				// initialize question's resources property
				questions[i].resources = [];
				// loop through and add resources's textContent
				for (var j=0; j<resources.length; j++) {
					questions[i].resources.push(resources[j].textContent);
				}
			
				// reveal threshold
				questions[i].revealThreshold = questionElements[i].getAttribute("revealThreshold");
				
				if (questions[i].revealThreshold <= 0) {
					questions[i].currentState = 1;
				} else {
					questions[i].currentState = 2;
				}
			
				// justification
			
				// fileSubmitCount
			
				// animated
			
				// linesTraced
			
				// revealBuffer
			
				// DEBUG
				//console.log("answer text: "+questions[i].answerText);
				//console.log("Correct answer for question "+(i+1)+": "+questions[i].correctAnswer); 
			
			}
			categories[h] = {};
			categories[h].questions = questions;
			categories[h].numQuestions = questions.length;
		}
		return categories;
	}
	return null
}

module.exports = iparDataParser;
},{"./question.js":13,"./utilities.js":14}],9:[function(require,module,exports){
"use strict";
var DrawLib = require('./drawLib.js');

var drawLib;
//parameter is a point that denotes starting position
function lessonNode(startPosition, imagePath, pQuestion){
    drawLib = new DrawLib();
    
    this.position = startPosition;
    this.dragLocation = undefined;
    this.mouseOver = false;
    this.dragging = false;
    this.scaleFactor = 1;
    this.type = "lessonNode";
    this.image = new Image();
    this.width;
    this.height;
    this.question = pQuestion;
    this.clicked = false;
    this.linksAwayFromOrigin = 0;
    
    var that = this;
    //image loading and resizing
    this.image.onload = function() {
        that.width = that.image.naturalWidth;
        that.height = that.image.naturalHeight;
        var maxDimension = 100;
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
    };
    
    this.image.src = imagePath;
}

var p = lessonNode.prototype;

p.draw = function(ctx){
    //lessonNode.drawLib.circle(ctx, this.position.x, this.position.y, 10, "red");
    //draw the image, shadow if hovered
    ctx.save();
    if(this.dragging) {
    	ctx.shadowColor = 'yellow';
        ctx.shadowBlur = 5;
    }
    else if(this.mouseOver){
        ctx.shadowColor = 'dodgerBlue';
        ctx.shadowBlur = 5;
    }
    //drawing the button image
    ctx.drawImage(this.image, this.position.x - (this.width*this.scaleFactor)/2, this.position.y - (this.height*this.scaleFactor)/2, this.width * this.scaleFactor, this.height * this.scaleFactor);
    
    //drawing the pin
    switch (this.question.currentState) {
    	case 1:
    		ctx.fillStyle = "blue";
			ctx.strokeStyle = "cyan";
			break;
     	case 2:
    		ctx.fillStyle = "green";
			ctx.strokeStyle = "yellow";
			break;
    }
	ctx.lineWidth = 2;

	ctx.beginPath();
	ctx.arc(this.position.x - (this.width*this.scaleFactor)/2 + 15,this.position.y - (this.height*this.scaleFactor)/2 + 15,6,0,2*Math.PI);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
    
    ctx.restore();
};

p.click = function(mouseState){
    console.log("node "+this.question.index+" clicked");
    this.clicked = true;
}

module.exports = lessonNode;
},{"./drawLib.js":5}],10:[function(require,module,exports){
"use strict";
function mouseState(pPosition, pRelativePosition, pMousedown, pMouseIn, pMouseClicked){
    this.position = pPosition;
    this.relativePosition = pRelativePosition;
    this.mouseDown = pMousedown;
    this.mouseIn = pMouseIn;
    this.prevMouseDown = pMousedown;
    this.mouseClicked = pMouseClicked;
    this.hasTarget = false;
}

var p = mouseState.prototype;

module.exports = mouseState;
},{}],11:[function(require,module,exports){
"use strict";
var Board = require('../board.js');
var Point = require('../point.js');
var LessonNode = require('../lessonNode.js');
var IparDataParser = require('../iparDataParser.js');
var Question = require('../question.js');
var Point = require('../point.js');
var Utilities = require('../utilities.js');

var boardArray;
var maxBoardWidth = 1000;
var maxBoardHeight = 800;
var currentBoard;
var questions;
var activeBoardIndex;
//has everything loaded?
var loadingComplete;
// save the last state of the mouse for checking clicks
var prevMouseState;

var utilities;

// drag the board
var mouseStartDragBoard = undefined;
var boardOffset = {x:0,y:0};
var prevBoardOffset = {x:0,y:0};

function boardPhase(pUrl){
    loadingComplete = false;
    processData(pUrl);
    utilities = new Utilities();
}	


function processData(pUrl){
	// initialize
    boardArray = [];
    // create the parser
    var extractedData = new IparDataParser("./data/mydata.xml", dataLoaded);
}

function dataLoaded(categoryData) {
	//questions = iparParser.getQuestionsArray();
    //createLessonNodesFromQuestions(questions);
    createLessonNodesInBoards(categoryData);
    loadingComplete = true;
}

function createLessonNodesInBoards(categories) {
	categories.forEach(function(cat) {
		// initialize empty
		var lessonNodes = [];
		// add a node per question
		for (var i = 0; i < cat.questions.length; i++) {
			// create a new lesson node
			lessonNodes.push(new LessonNode(new Point(cat.questions[i].positionPercentX, cat.questions[i].positionPercentY), cat.questions[i].imageLink, cat.questions[i] ) );
			// attach question object to lesson node
			lessonNodes[lessonNodes.length-1].question = cat.questions[i];
			//console.log("image: "+lessonNodes[lessonNodes.length-1].image.getAttribute("src"));
		
		}
		// create a board
		boardArray.push(new Board(new Point(0,0), lessonNodes));
		//console.log(boardArray[boardArray.length-1].lessonNodeArray[0].question);
	});
	activeBoardIndex = 3; // start with the first board (actually its the second now so I can debug)
}


var p = boardPhase.prototype;

p.update = function(ctx, canvas, dt, center, activeHeight, pMouseState, boardOffset) {
    p.act(pMouseState);
    p.draw(ctx, canvas, center, activeHeight);
    if (activeBoardIndex) boardArray[activeBoardIndex].update();
}

p.act = function(pMouseState){
	// hover states
	//for(var i = 0; i < boardArray.length; i++){
		// loop through lesson nodes to check for hover
	if (activeBoardIndex != undefined) {
		// update board
		
		var nodeChosen = false;
		for (var i=boardArray[activeBoardIndex].lessonNodeArray.length-1; i>=0; i--) {
			if (boardArray[activeBoardIndex].lessonNodeArray[i].dragging) {
				//nodeChosen = true;
				pMouseState.hasTarget = true;
				
			}
		}
		
		
		for (var i=boardArray[activeBoardIndex].lessonNodeArray.length-1; i>=0; i--) {
			var lNode = boardArray[activeBoardIndex].lessonNodeArray[i];
			
			if (!pMouseState.mouseDown) {
				lNode.dragPosition = undefined; // clear drag behavior
				lNode.dragging = false;
			} 
			
			lNode.mouseOver = false;
			
			// if there is already a selected node, do not try to select another
			if (nodeChosen) {  continue; }
			
			//console.log("node update");
			// if hovering, show hover glow
			/*if (pMouseState.relativePosition.x > lNode.position.x-lNode.width/2 
			&& pMouseState.relativePosition.x < lNode.position.x+lNode.width/2
			&& pMouseState.relativePosition.y > lNode.position.y-lNode.height/2
			&& pMouseState.relativePosition.y < lNode.position.y+lNode.height/2) {*/
			
			
			if (utilities.mouseIntersect(pMouseState,lNode,boardOffset,1)) {
				lNode.mouseOver = true;
				nodeChosen = true;
				pMouseState.hasTarget = true;
				//console.log(pMouseState.hasTarget);
				
				if (pMouseState.mouseDown && !prevMouseState.mouseDown) {
					// drag
					lNode.dragging = true;
					lNode.dragPosition = new Point(
					pMouseState.relativePosition.x - lNode.position.x,
					pMouseState.relativePosition.y - lNode.position.y
					);
				}
				if (pMouseState.mouseClicked) {
					// handle click code
					lNode.click(pMouseState);
				}
			}
			// if the user is dragging a node, allow the mouse to control its movement
			if (lNode.dragging) {
				lNode.position.x = pMouseState.relativePosition.x - lNode.dragPosition.x;
				lNode.position.y = pMouseState.relativePosition.y - lNode.dragPosition.y;
			}
		}
	}
	
	// drag the board around
	if (!pMouseState.hasTarget) {
		if (pMouseState.mouseDown) {
			if (!mouseStartDragBoard) {
				mouseStartDragBoard = pMouseState.relativePosition;
				prevBoardOffset.x = boardOffset.x;
				prevBoardOffset.y = boardOffset.y;
			}
			else {
				boardOffset.x = prevBoardOffset.x - (pMouseState.relativePosition.x - mouseStartDragBoard.x);
				if (boardOffset.x > maxBoardWidth/2) boardOffset.x = maxBoardWidth/2;
				if (boardOffset.x < -1*maxBoardWidth/2) boardOffset.x = -1*maxBoardWidth/2;
				boardOffset.y = prevBoardOffset.y - (pMouseState.relativePosition.y - mouseStartDragBoard.y);
				if (boardOffset.y > maxBoardHeight/2) boardOffset.y = maxBoardHeight/2;
				if (boardOffset.y < -1*maxBoardHeight/2) boardOffset.y = -1*maxBoardHeight/2;
				console.log(boardOffset);
			}
		} else {
			mouseStartDragBoard = undefined;
		}
    }
    
	prevMouseState = pMouseState;
}

p.draw = function(ctx, canvas, center, activeHeight){
	// current board = 0;
	//console.log("draw currentBoard " + currentBoard);
	if (activeBoardIndex != undefined) boardArray[activeBoardIndex].draw(ctx, center, activeHeight, boardOffset);
}


module.exports = boardPhase;
},{"../board.js":3,"../iparDataParser.js":8,"../lessonNode.js":9,"../point.js":12,"../question.js":13,"../utilities.js":14}],12:[function(require,module,exports){
"use strict";
function point(pX, pY){
    this.x = pX;
    this.y = pY;
}

var p = point.prototype;

module.exports = point;
},{}],13:[function(require,module,exports){
"use strict";
//parameter is a point that denotes starting position
function question(){
    this.SOLVE_STATE = Object.freeze({HIDDEN: 0, UNSOLVED: 1, SOLVED: 2});
    this.currentState = this.SOLVE_STATE.UNSOLVED;
    
    this.index;             //int
    this.categoryIndex;     //int
    this.correctAnswer;     //int
    this.questionText;      //string
    this.questionType		//int			<- from xml
    this.answerText;        //stromg array
    this.feedbackText;      //string array
    this.imageLink;         //string
    this.connections;       //string
    this.instructions;      //string
    this.resources;         //resourceItem
    this.revealThreshold;   //int
    
    this.positionPercentX;
    this.positionPercentY;
    
    this.justification;     //string
    this.fileSubmitCount;   //int
    this.animated;          //bool
    this.linesTraced;       //int
    this.revealBuffer;      //int
}

var p = question.prototype;

module.exports = question;
},{}],14:[function(require,module,exports){
"use strict";
var Point = require('./point.js');

function utilities(){
}

var p = utilities.prototype;
// returns mouse position in local coordinate system of element
p.getMouse = function(e){
    return new Point((e.pageX - e.target.offsetLeft), (e.pageY - e.target.offsetTop));
}

//returns a value relative to the ratio it has with a specific range "mapped" to a different range
p.map = function(value, min1, max1, min2, max2){
    return min2 + (max2 - min2) * ((value - min1) / (max1 - min1));
}

//if a value is higher or lower than the min and max, it is "clamped" to that outer limit
p.clamp = function(value, min, max){
    return Math.max(min, Math.min(max, value));
}

//determines whether the mouse is intersecting the active element
p.mouseIntersect = function(pMouseState, pElement, pOffsetter, pScale){
    if(pMouseState.relativePosition.x + pOffsetter.x > (pElement.position.x - (pScale*pElement.width)/2) && pMouseState.relativePosition.x + pOffsetter.x < (pElement.position.x + (pScale*pElement.width)/2)){
        if(pMouseState.relativePosition.y + pOffsetter.y > (pElement.position.y - (pScale*pElement.height)/2) && pMouseState.relativePosition.y + pOffsetter.y < (pElement.position.y + (pScale*pElement.height)/2)){
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

module.exports = utilities;
},{"./point.js":12}]},{},[1,2,3,4,6,7,8,9,10,11,12,13,14])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwianMvbW9kdWxlcy9ET01faW50ZXJmYWNlLmpzIiwianMvbW9kdWxlcy9ib2FyZC5qcyIsImpzL21vZHVsZXMvYnV0dG9uLmpzIiwianMvbW9kdWxlcy9kcmF3TGliLmpzIiwianMvbW9kdWxlcy9nYW1lLmpzIiwianMvbW9kdWxlcy9pcGFyRGF0YVBhcnNlci5qcyIsImpzL21vZHVsZXMvbGVzc29uTm9kZS5qcyIsImpzL21vZHVsZXMvbW91c2VTdGF0ZS5qcyIsImpzL21vZHVsZXMvcGhhc2VzL2JvYXJkUGhhc2UuanMiLCJqcy9tb2R1bGVzL3BvaW50LmpzIiwianMvbW9kdWxlcy9xdWVzdGlvbi5qcyIsImpzL21vZHVsZXMvdXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxuLy9pbXBvcnRzXHJcbnZhciBHYW1lID0gcmVxdWlyZSgnLi9tb2R1bGVzL2dhbWUuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9tb2R1bGVzL3BvaW50LmpzJyk7XHJcbnZhciBNb3VzZVN0YXRlID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vdXNlU3RhdGUuanMnKTtcclxudmFyIFV0aWxpdHkgPSByZXF1aXJlKCcuL21vZHVsZXMvdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RyYXdMaWIuanMnKTtcclxudmFyIERPTV9pbnRlcmZhY2UgPSByZXF1aXJlKCcuL21vZHVsZXMvRE9NX2ludGVyZmFjZS5qcycpO1xyXG5cclxuLy9nYW1lIG9iamVjdHNcclxudmFyIGdhbWU7XHJcbnZhciBjYW52YXM7XHJcbnZhciBjdHg7XHJcbnZhciB1dGlsaXR5O1xyXG52YXIgZHJhd0xpYjtcclxuXHJcbi8vcmVzcG9uc2l2ZW5lc3NcclxudmFyIGhlYWRlcjtcclxudmFyIGFjdGl2ZUhlaWdodDtcclxudmFyIGNlbnRlcjtcclxuXHJcbi8vbW91c2UgaGFuZGxpbmdcclxudmFyIG1vdXNlUG9zaXRpb247XHJcbnZhciByZWxhdGl2ZU1vdXNlUG9zaXRpb247XHJcbnZhciBtb3VzZURvd247XHJcbnZhciBtb3VzZUluO1xyXG52YXIgbW91c2VEb3duVGltZXI7XHJcbnZhciBtb3VzZUNsaWNrZWQ7XHJcbnZhciBtYXhDbGlja0R1cmF0aW9uOyAvLyBtaWxsaXNlY29uZHNcclxuXHJcbi8vIGh0bWwgRE9NXHJcbnZhciBodG1sRWxlbUhhbmRsZXI7XHJcblxyXG4vL3BlcnNpc3RlbnQgdXRpbGl0aWVzXHJcbnZhciBwcmV2VGltZTsgLy8gZGF0ZSBpbiBtaWxsaXNlY29uZHNcclxudmFyIGR0OyAvLyBkZWx0YSB0aW1lIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuLy9maXJlcyB3aGVuIHRoZSB3aW5kb3cgbG9hZHNcclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgaW5pdGlhbGl6ZVZhcmlhYmxlcygpO1xyXG4gICAgbG9vcCgpO1xyXG59XHJcblxyXG4vL2luaXRpYWxpemF0aW9uLCBtb3VzZSBldmVudHMsIGFuZCBnYW1lIGluc3RhbnRpYXRpb25cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVZhcmlhYmxlcygpe1xyXG4gICAgY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignY2FudmFzJyk7XHJcbiAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHV0aWxpdHkgPSBuZXcgVXRpbGl0eSgpO1xyXG4gICAgZHJhd0xpYiA9IG5ldyBEcmF3TGliKCk7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMub2Zmc2V0V2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLm9mZnNldEhlaWdodDtcclxuICAgIGNvbnNvbGUubG9nKFwiQ2FudmFzIERpbWVuc2lvbnM6IFwiICsgY2FudmFzLndpZHRoICsgXCIsIFwiICsgY2FudmFzLmhlaWdodCk7XHJcbiAgICBcclxuICAgIGh0bWxFbGVtSGFuZGxlciA9IG5ldyBET01faW50ZXJmYWNlKCk7XHJcbiAgICBcclxuICAgIGhlYWRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hlYWRlcicpO1xyXG4gICAgYWN0aXZlSGVpZ2h0ID0gY2FudmFzLm9mZnNldEhlaWdodCAtIGhlYWRlci5vZmZzZXRIZWlnaHQ7XHJcbiAgICBjZW50ZXIgPSBuZXcgUG9pbnQoY2FudmFzLndpZHRoLzIsIGFjdGl2ZUhlaWdodC8yICsgaGVhZGVyLm9mZnNldEhlaWdodCk7XHJcbiAgICBcclxuICAgIG1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgXHJcbiAgICAvL2V2ZW50IGxpc3RlbmVycyBmb3IgbW91c2UgaW50ZXJhY3Rpb25zIHdpdGggdGhlIGNhbnZhc1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgdmFyIGJvdW5kUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIGJvdW5kUmVjdC5sZWZ0LCBlLmNsaWVudFkgLSBib3VuZFJlY3QudG9wKTtcclxuICAgICAgICByZWxhdGl2ZU1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQobW91c2VQb3NpdGlvbi54IC0gKGNhbnZhcy5vZmZzZXRXaWR0aC8yLjApLCBtb3VzZVBvc2l0aW9uLnkgLSAoaGVhZGVyLm9mZnNldEhlaWdodCArIGFjdGl2ZUhlaWdodC8yLjApKTsgICAgICAgIFxyXG4gICAgfSk7XHJcbiAgICBtb3VzZURvd24gPSBmYWxzZTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIG1vdXNlRG93biA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbihlKXtcclxuICAgICAgICBtb3VzZURvd24gPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgbW91c2VJbiA9IGZhbHNlO1xyXG4gICAgbW91c2VEb3duVGltZXIgPSAwO1xyXG4gICAgbW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBtYXhDbGlja0R1cmF0aW9uID0gMjAwO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgbW91c2VJbiA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgbW91c2VJbiA9IGZhbHNlO1xyXG4gICAgICAgIG1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHByZXZUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gMDtcclxuICAgIFxyXG4gICAgZ2FtZSA9IG5ldyBHYW1lKHV0aWxpdHksIGRyYXdMaWIpO1xyXG59XHJcblxyXG4vL2ZpcmVzIG9uY2UgcGVyIGZyYW1lXHJcbmZ1bmN0aW9uIGxvb3AoKXtcclxuXHQvLyBsb29wXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3AuYmluZCh0aGlzKSk7XHJcbiAgICBcclxuICAgIC8vIHVwZGF0ZSBkZWx0YSB0aW1lXHJcbiAgICBkdCA9IERhdGUubm93KCkgLSBwcmV2VGltZTtcclxuICAgIHByZXZUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgLy8gY2hlY2sgbW91c2UgY2xpY2tcclxuICAgIG1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgaWYgKG1vdXNlRG93bikgeyBtb3VzZURvd25UaW1lciArPSBkdDsgfVxyXG4gICAgZWxzZSB7IGlmIChtb3VzZURvd25UaW1lciA+IDAgJiYgbW91c2VEb3duVGltZXIgPCBtYXhDbGlja0R1cmF0aW9uKSB7IG1vdXNlQ2xpY2tlZCA9IHRydWU7IH0gbW91c2VEb3duVGltZXIgPSAwOyB9XHJcbiAgICBcclxuICAgIC8vIHVwZGF0ZSBnYW1lXHJcbiAgICBnYW1lLnVwZGF0ZShjdHgsIGNhbnZhcywgZHQsIGNlbnRlciwgYWN0aXZlSGVpZ2h0LCBuZXcgTW91c2VTdGF0ZShtb3VzZVBvc2l0aW9uLCByZWxhdGl2ZU1vdXNlUG9zaXRpb24sIG1vdXNlRG93biwgbW91c2VJbiwgbW91c2VDbGlja2VkKSk7XHJcbn1cclxuXHJcbi8vbGlzdGVucyBmb3IgY2hhbmdlcyBpbiBzaXplIG9mIHdpbmRvdyBhbmQgYWRqdXN0cyB2YXJpYWJsZXMgYWNjb3JkaW5nbHlcclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMub2Zmc2V0V2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLm9mZnNldEhlaWdodDtcclxuICAgIGFjdGl2ZUhlaWdodCA9IGNhbnZhcy5oZWlnaHQgLSBoZWFkZXIub2Zmc2V0SGVpZ2h0O1xyXG4gICAgY2VudGVyID0gbmV3IFBvaW50KGNhbnZhcy53aWR0aCAvIDIsIGFjdGl2ZUhlaWdodCAvIDIgKyBoZWFkZXIub2Zmc2V0SGVpZ2h0KVxyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZyhcIkNhbnZhcyBEaW1lbnNpb25zOiBcIiArIGNhbnZhcy53aWR0aCArIFwiLCBcIiArIGNhbnZhcy5oZWlnaHQpO1xyXG59KTtcclxuXHJcblxyXG5cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vLyByZWZlcmVuY2VzIHRvIHRoZSBkb20gZWxlbWVudHNcclxudmFyIHJlZnMgPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBoaWRlRWxlbWVudChlbGVtKSB7XHJcblx0ZWxlbS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0Y29uc29sZS5sb2coZWxlbS5pZCArIFwiIGhpZGRlblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd0VsZW1lbnQoZWxlbSkge1xyXG5cdGVsZW0uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gRE9NX2ludGVyZmFjZSgpIHtcclxuXHRyZWZzID0ge1xyXG5cdFx0c3VwZXJQYW5lbDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5xdWVzdGlvblBhbmVsc1wiKSxcclxuXHRcdHRleHQ6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubXVsdGlwbGVDaG9pY2VUZXh0XCIpLFxyXG5cdFx0YW5zd2VyczogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tdWx0aXBsZUNob2ljZUFuc3dlcnNcIiksXHJcblx0XHRlbWFpbDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5lbWFpbFF1ZXN0aW9uXCIpLFxyXG5cdFx0cmVzb3VyY2VzOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnJlc291cmNlc1wiKSxcclxuXHRcdGNsb3NlQnV0dG9uOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmNsb3NlQnRuXCIpLFxyXG5cdFx0cHJvY2VlZEJ1dHRvbjogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wcm9jZWVkQnRuXCIpXHJcblx0fVxyXG5cdHJlZnMuY2xvc2VCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0aGlkZUVsZW1lbnQocmVmcy5zdXBlclBhbmVsKTtcclxuXHR9XHJcbn1cclxuXHJcbnZhciBwID0gRE9NX2ludGVyZmFjZS5wcm90b3R5cGU7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERPTV9pbnRlcmZhY2U7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBib2FyZChzdGFydFBvc2l0aW9uLCBsZXNzb25Ob2Rlcyl7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMubGVzc29uTm9kZUFycmF5ID0gbGVzc29uTm9kZXM7XHJcbn1cclxuXHJcbmJvYXJkLmRyYXdMaWIgPSB1bmRlZmluZWQ7XHJcblxyXG4vL3Byb3RvdHlwZVxyXG52YXIgcCA9IGJvYXJkLnByb3RvdHlwZTtcclxuXHJcbnAubW92ZSA9IGZ1bmN0aW9uKHBYLCBwWSl7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnggKz0gcFg7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnkgKz0gcFk7XHJcbn07XHJcblxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIGZvciBlYWNoICBub2RlXHJcbiAgICBmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0dmFyIGFjdGl2ZU5vZGUgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTsgXHJcblx0XHQvLyBoYW5kbGUgY2xpY2tcclxuXHRcdGlmIChhY3RpdmVOb2RlLmNsaWNrZWQgJiYgYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gYWN0aXZlTm9kZS5xdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRCkge1xyXG5cdFx0XHJcblx0XHRcdC8vIGNoZWNrIGZvciB2YWxpZCBjb25uZWN0aW9uc1xyXG5cdFx0XHRpZiAoIWFjdGl2ZU5vZGUucXVlc3Rpb24uY29ubmVjdGlvbnMpIGNvbnRpbnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gYWRkIGNvbm5lY3Rpb25zXHJcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYWN0aXZlTm9kZS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcclxuXHRcdFx0XHQvLyB1cGRhdGUgZWFjaCBjb25uZWN0aW9uJ3MgbGlua3NBd2F5RnJvbU9yaWdpbiB2YWx1ZVxyXG5cdFx0XHRcdHRoaXMubGVzc29uTm9kZUFycmF5W2FjdGl2ZU5vZGUucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXS5saW5rc0F3YXlGcm9tT3JpZ2luID0gYWN0aXZlTm9kZS5saW5rc0F3YXlGcm9tT3JpZ2luICsgMTtcclxuXHRcdFx0XHR0aGlzLmxlc3Nvbk5vZGVBcnJheVthY3RpdmVOb2RlLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0ucXVlc3Rpb24uY3VycmVudFN0YXRlID0gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuICAgICAgICAgICAgYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPSBhY3RpdmVOb2RlLnF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRDtcclxuICAgICAgICAgICAgXHJcblx0XHRcdC8vIHJlY29yZCB0aGF0IHRoZSBjbGljayBoYXMgYmVlbiBkZWFsdCB3aXRoXHJcblx0XHRcdGFjdGl2ZU5vZGUuY2xpY2tlZCA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4LCBjZW50ZXIsIGFjdGl2ZUhlaWdodCwgYm9hcmRPZmZzZXQpe1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IGJvYXJkT2Zmc2V0O1xyXG4gICAgLy90cmFuc2xhdGUgdG8gdGhlIGNlbnRlciBvZiB0aGUgc2NyZWVuXHJcbiAgICBjdHgudHJhbnNsYXRlKGNlbnRlci54IC0gdGhpcy5wb3NpdGlvbi54LCBjZW50ZXIueSAtIHRoaXMucG9zaXRpb24ueSk7XHJcbiAgICAvL2N0eC50cmFuc2xhdGUoYm9hcmRPZmZzZXQueCxib2FyZE9mZnNldC55KTtcclxuXHRcclxuXHQvLyBkcmF3IHRoZSBub2Rlc1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaSsrKXtcclxuICAgIFxyXG4gICAgXHQvLyB0ZW1wb3JhcmlseSBoaWRlIGFsbCBidXQgdGhlIGZpcnN0IHF1ZXN0aW9uXHJcblx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24ucmV2ZWFsVGhyZXNob2xkID4gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGlua3NBd2F5RnJvbU9yaWdpbikgY29udGludWU7XHJcbiAgICBcdFxyXG4gICAgXHQvLyBkcmF3IHRoZSBub2RlIGl0c2VsZlxyXG4gICAgICAgIHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmRyYXcoY3R4KTtcclxuICAgIH1cclxuXHJcblx0Ly8gZHJhdyB0aGUgcGlucyBhbmQgbGluZXNcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcclxuXHRcdC8vIG9ubHkgc2hvdyB2YWxpaWQgcXVlc3Rpb25zXHJcblx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24ucmV2ZWFsVGhyZXNob2xkID4gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGlua3NBd2F5RnJvbU9yaWdpbikgY29udGludWU7XHJcblx0XHRcclxuXHRcdC8vIGRyYXcgdGhlIHBpbiBpbiB0aGUgY29ybmVyIHdpdGggbWFyZ2luIDUsNVxyXG4gICAgICAgIHZhciBwaW5YID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucG9zaXRpb24ueCAtIHRoaXMubGVzc29uTm9kZUFycmF5W2ldLndpZHRoKnRoaXMubGVzc29uTm9kZUFycmF5W2ldLnNjYWxlRmFjdG9yLzIgKyAxNTtcclxuICAgICAgICB2YXIgcGluWSA9IHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnBvc2l0aW9uLnkgLSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5oZWlnaHQqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uc2NhbGVGYWN0b3IvMiArIDE1O1xyXG5cdFx0XHJcblx0XHQvLyBzZXQgbGluZSBzdHlsZVxyXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsMCwxMDUsMC4yKVwiO1xyXG5cdFx0Y3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIHRoZSBxdWVzdGlvbiBwcm9wZXJ0eSBpcyB2YWxpZFxyXG4gICAgICAgIGlmICghdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnMpIGNvbnRpbnVlO1xyXG4gICAgICAgIGZvciAodmFyIGo9MDsgajx0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyB0ZW1wb3JhcmlseSBoaWRlIGFsbCBidXQgdGhlIGZpcnN0IHF1ZXN0aW9uXHJcblx0XHRcdGlmICh0aGlzLmxlc3Nvbk5vZGVBcnJheVt0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdLnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCA+IHRoaXMubGVzc29uTm9kZUFycmF5W3RoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0ubGlua3NBd2F5RnJvbU9yaWdpbikgY29udGludWU7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIGdvIHRvIHRoZSBpbmRleCBpbiB0aGUgYXJyYXkgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgY29ubmVjdGVkIG5vZGUgb24gdGhpcyBib2FyZCBhbmQgc2F2ZSBpdHMgcG9zaXRpb25cclxuICAgICAgICBcdC8vIGNvbm5lY3Rpb24gaW5kZXggc2F2ZWQgaW4gdGhlIGxlc3Nvbk5vZGUncyBxdWVzdGlvblxyXG4gICAgICAgIFx0dmFyIGNvbm5lY3Rpb24gPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVt0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdO1xyXG4gICAgICAgIFx0dmFyIGNQb3MgPSBjb25uZWN0aW9uLnBvc2l0aW9uO1xyXG4gICAgICAgIFx0dmFyIGNXaWR0aCA9IGNvbm5lY3Rpb24ud2lkdGg7XHJcbiAgICAgICAgXHR2YXIgY0hlaWdodCA9IGNvbm5lY3Rpb24uaGVpZ2h0O1xyXG4gICAgICAgIFx0dmFyIGNTY2FsZSA9IGNvbm5lY3Rpb24uc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIGRyYXcgdGhlIGxpbmVcclxuICAgICAgICBcdGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBcdC8vIHRyYW5zbGF0ZSB0byBzdGFydCAocGluKVxyXG4gICAgICAgIFx0Y3R4Lm1vdmVUbyhwaW5YLHBpblkpO1xyXG4gICAgICAgIFx0Y3R4LmxpbmVUbyhjUG9zLnggLSBjV2lkdGgqY1NjYWxlLzIgKyAxNSwgY1Bvcy55IC0gY0hlaWdodCpjU2NhbGUvMiArIDE1KTtcclxuICAgICAgICBcdGN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgICBcdGN0eC5zdHJva2UoKTtcclxuICAgICAgICBcdC8vY29uc29sZS5sb2coXCJsaW5lIGRyYXduIGZyb20gXCIrdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucG9zaXRpb24ueCtcIiwgXCIrdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucG9zaXRpb24ueStcIiB0byBcIitjb25uZWN0aW9uUG9zLngrXCIsIFwiK2Nvbm5lY3Rpb25Qb3MueSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib2FyZDtcclxuXHJcbi8vdGhpcyBpcyBhbiBvYmplY3QgbmFtZWQgQm9hcmQgYW5kIHRoaXMgaXMgaXRzIGphdmFzY3JpcHRcclxuLy92YXIgQm9hcmQgPSByZXF1aXJlKCcuL29iamVjdHMvYm9hcmQuanMnKTtcclxuLy92YXIgYiA9IG5ldyBCb2FyZCgpO1xyXG4gICAgIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBidXR0b24oc3RhcnRQb3NpdGlvbiwgd2lkdGgsIGhlaWdodCl7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICB0aGlzLndpZHRoID0gd2lkdGg7XHJcbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5ob3ZlcmVkID0gZmFsc2U7XHJcbn1cclxuYnV0dG9uLmRyYXdMaWIgPSB1bmRlZmluZWQ7XHJcblxyXG52YXIgcCA9IGJ1dHRvbi5wcm90b3R5cGU7XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgpe1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIHZhciBjb2w7XHJcbiAgICBpZih0aGlzLmhvdmVyZWQpe1xyXG4gICAgICAgIGNvbCA9IFwiZG9kZ2VyYmx1ZVwiO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjb2wgPSBcImxpZ2h0Ymx1ZVwiO1xyXG4gICAgfVxyXG4gICAgLy9kcmF3IHJvdW5kZWQgY29udGFpbmVyXHJcbiAgICBib2FyZEJ1dHRvbi5kcmF3TGliLnJlY3QoY3R4LCB0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0LCBjb2wpO1xyXG5cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGJ1dHRvbjsiLCJcInVzZSBzdHJpY3RcIjtcclxuZnVuY3Rpb24gZHJhd0xpYigpe1xyXG4gICAgXHJcbn1cclxuXHJcbnZhciBwID0gZHJhd0xpYi5wcm90b3R5cGU7XHJcblxyXG5wLmNsZWFyID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoKSB7XHJcbiAgICBjdHguY2xlYXJSZWN0KHgsIHksIHcsIGgpO1xyXG59XHJcblxyXG5wLnJlY3QgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgsIGNvbCwgY2VudGVyT3JpZ2luKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbDtcclxuICAgIGlmKGNlbnRlck9yaWdpbil7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHggLSAodyAvIDIpLCB5IC0gKGggLyAyKSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCB3LCBoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbnAubGluZSA9IGZ1bmN0aW9uKGN0eCwgeDEsIHkxLCB4MiwgeTIsIHRoaWNrbmVzcywgY29sb3IpIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHgubW92ZVRvKHgxLCB5MSk7XHJcbiAgICBjdHgubGluZVRvKHgyLCB5Mik7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpY2tuZXNzO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5wLmNpcmNsZSA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgcmFkaXVzLCBjb2xvcil7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LHksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib2FyZEJ1dHRvbihjdHgsIHBvc2l0aW9uLCB3aWR0aCwgaGVpZ2h0LCBob3ZlcmVkKXtcclxuICAgIC8vY3R4LnNhdmUoKTtcclxuICAgIGlmKGhvdmVyZWQpe1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImRvZGdlcmJsdWVcIjtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwibGlnaHRibHVlXCI7XHJcbiAgICB9XHJcbiAgICAvL2RyYXcgcm91bmRlZCBjb250YWluZXJcclxuICAgIGN0eC5yZWN0KHBvc2l0aW9uLnggLSB3aWR0aC8yLCBwb3NpdGlvbi55IC0gaGVpZ2h0LzIsIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDU7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgLy9jdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRyYXdMaWI7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBCb2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoJy4vZHJhd0xpYi5qcycpO1xyXG52YXIgTGVzc29uTm9kZSA9IHJlcXVpcmUoJy4vbGVzc29uTm9kZS5qcycpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIGJvYXJkUGhhc2UgPSByZXF1aXJlKCcuL3BoYXNlcy9ib2FyZFBoYXNlLmpzJyk7XHJcblxyXG4vLyBkZWJ1ZyBsaW5lXHJcbnZhciBkZWJ1Z0xpbmU7XHJcblxyXG4vL1wiZW51bWVyYXRpb25cIlxyXG52YXIgY3VycmVudFBoYXNlO1xyXG5cclxuLy91dGlsaXRpZXNcclxudmFyIGRyYXdMaWI7XHJcbnZhciB1dGlsaXR5O1xyXG5cclxuLy9tb3VzZSBtYW5hZ2VtZW50XHJcbnZhciBtb3VzZVN0YXRlO1xyXG52YXIgcHJldmlvdXNNb3VzZVN0YXRlO1xyXG52YXIgZHJhZ2dpbmdEaXNhYmxlZDtcclxudmFyIG1vdXNlVGFyZ2V0O1xyXG52YXIgbW91c2VTdXN0YWluZWREb3duO1xyXG5cclxuLy9waGFzZSBoYW5kbGluZ1xyXG52YXIgcGhhc2VPYmplY3Q7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2FtZShwVXRpbGl0eSwgcERyYXdMaWIpe1xyXG4gICAgdXRpbGl0eSA9IHBVdGlsaXR5O1xyXG4gICAgZHJhd0xpYiA9IHBEcmF3TGliO1xyXG4gICAgY3VycmVudFBoYXNlID0gMjtcclxuICAgIGRlYnVnTGluZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWJ1Z0xpbmUnKTtcclxuICAgIFxyXG4gICAgcGhhc2VPYmplY3QgPSBuZXcgYm9hcmRQaGFzZShcIi4vZGF0YS9teURhdGEueG1sXCIpO1xyXG4gICAgXHJcbiAgICBkcmFnZ2luZ0Rpc2FibGVkID0gZmFsc2U7XHJcbiAgICBtb3VzZVN1c3RhaW5lZERvd24gPSBmYWxzZTtcclxufVxyXG5cclxuLy9jaGFuZ2VzIHRoZSBwaGFzZSBvYmplY3QgYmFzZWQgb24gdGhlIHBoYXNlIG51bWJlciBpbnB1dFxyXG5mdW5jdGlvbiBwaGFzZUNoYW5nZXIocGhhc2VOdW0pe1xyXG4gICAgXHJcbn1cclxuXHJcbnZhciBwID0gZ2FtZS5wcm90b3R5cGU7XHJcblxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzLCBkdCwgY2VudGVyLCBhY3RpdmVIZWlnaHQsIHBNb3VzZVN0YXRlKXtcclxuICAgIC8vIG1vdXNlXHJcbiAgICBwcmV2aW91c01vdXNlU3RhdGUgPSBtb3VzZVN0YXRlO1xyXG4gICAgbW91c2VTdGF0ZSA9IHBNb3VzZVN0YXRlO1xyXG4gICAgbW91c2VUYXJnZXQgPSAwO1xyXG4gICAgaWYodHlwZW9mIHByZXZpb3VzTW91c2VTdGF0ZSA9PT0gJ3VuZGVmaW5lZCcpe1xyXG4gICAgICAgIHByZXZpb3VzTW91c2VTdGF0ZSA9IG1vdXNlU3RhdGU7XHJcbiAgICB9XHJcbiAgICAvL3VwZGF0ZSBzdHVmZlxyXG4gICAgcC5hY3QocE1vdXNlU3RhdGUsIHByZXZpb3VzTW91c2VTdGF0ZSk7XHJcbiAgICAvL2RyYXcgc3R1ZmZcclxuICAgIHAuZHJhdyhjdHgsIGNhbnZhcywgY2VudGVyLCBhY3RpdmVIZWlnaHQpO1xyXG4gICAgXHJcbiAgICAvL3VwZGF0ZSB0aGUgYWN0aXZlIHBoYXNlIG9iamVjdFxyXG4gICAgcGhhc2VPYmplY3QudXBkYXRlKGN0eCwgY2FudmFzLCBkdCwgY2VudGVyLCBhY3RpdmVIZWlnaHQsIHBNb3VzZVN0YXRlKTtcclxufVxyXG5cclxucC5hY3QgPSBmdW5jdGlvbihwTW91c2VTdGF0ZSwgcHJldmlvdXNNb3VzZVN0YXRlKXtcclxuXHJcbiAgICAvL2lmIHRoZSBwaGFzZSBvYmplY3QgaXMgZGlmZmVyZW50IGNoYW5nZSBpdFxyXG4gICAgaWYocGhhc2VPYmplY3QuY3VycmVudFBoYXNlICE9IGN1cnJlbnRQaGFzZSl7XHJcbiAgICAgICAgcGhhc2VDaGFuZ2VyKHBoYXNlT2JqZWN0LmN1cnJlbnRQaGFzZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIFxyXG4gICAgLy9jb2xsaXNpb24gZGV0ZWN0aW9uLCBpdGVyYXRlIHRocm91Z2ggZWFjaCBub2RlIGluIHRoZSBhY3RpdmUgYm9hcmRcclxuICAgIC8qZm9yKHZhciBpID0gMDsgaSA8IGJvYXJkLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgdmFyIHRhcmdldExlc3Nvbk5vZGUgPSBib2FyZC5sZXNzb25Ob2RlQXJyYXlbaV07XHJcbiAgICAgICAgdXRpbGl0eS5tb3VzZUludGVyc2VjdChtb3VzZVN0YXRlLCB0YXJnZXRMZXNzb25Ob2RlLCBib2FyZC5wb3NpdGlvbiwgdGFyZ2V0TGVzc29uTm9kZS5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgaWYodGFyZ2V0TGVzc29uTm9kZS5tb3VzZU92ZXIgPT0gdHJ1ZSl7XHJcbiAgICAgICAgICAgIG1vdXNlVGFyZ2V0ID0gdGFyZ2V0TGVzc29uTm9kZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvL2lmIHRoZSBlbGVtZW50IHRoYXQgdGhlIG1vdXNlIGlzIGhvdmVyaW5nIG92ZXIgaXMgTk9UIHRoZSBjYW52YXNcclxuICAgIGlmKG1vdXNlVGFyZ2V0ICE9IDApe1xyXG4gICAgICAgIC8vaWYgbW91c2VEb3duXHJcbiAgICAgICAgaWYobW91c2VTdGF0ZS5tb3VzZURvd24gPT0gdHJ1ZSAmJiBwcmV2aW91c01vdXNlU3RhdGUubW91c2VEb3duID09IGZhbHNlKXtcclxuICAgICAgICAgICAgbW91c2VTdXN0YWluZWREb3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgZHJhZ2dpbmdEaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vaWYgbW91c2VVcCBjbGljayBldmVudFxyXG4gICAgICAgIGVsc2UgaWYobW91c2VTdGF0ZS5tb3VzZURvd24gPT0gZmFsc2UgJiYgcHJldmlvdXNNb3VzZVN0YXRlLm1vdXNlRG93biA9PSB0cnVlKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobW91c2VUYXJnZXQudHlwZSk7XHJcbiAgICAgICAgICAgIG1vdXNlVGFyZ2V0LmNsaWNrKG1vdXNlU3RhdGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgLy9pZiBub3QgYSBzdXN0YWluZWQgZG93blxyXG4gICAgICAgIGlmKG1vdXNlU3VzdGFpbmVkRG93biA9PSBmYWxzZSl7XHJcbiAgICAgICAgICAgIGRyYWdnaW5nRGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZihtb3VzZVN0YXRlLm1vdXNlRG93biA9PSBmYWxzZSAmJiBwcmV2aW91c01vdXNlU3RhdGUubW91c2VEb3duID09IHRydWUpe1xyXG4gICAgICAgIG1vdXNlU3VzdGFpbmVkRG93biA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvL21vdmluZyB0aGUgYm9hcmRcclxuICAgIGlmKG1vdXNlU3RhdGUubW91c2VEb3duID09IHRydWUgJiYgZHJhZ2dpbmdEaXNhYmxlZCA9PSBmYWxzZSl7XHJcbiAgICAgICAgYm9hcmQubW92ZShwcmV2aW91c01vdXNlU3RhdGUucG9zaXRpb24ueCAtIG1vdXNlU3RhdGUucG9zaXRpb24ueCwgcHJldmlvdXNNb3VzZVN0YXRlLnBvc2l0aW9uLnkgLSBtb3VzZVN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgfVxyXG4gICAgKi9cclxuICAgIFxyXG4gICAgXHJcbiAgICBcclxuICAgIFxyXG4gICAgXHJcbiAgICBkZWJ1Z0xpbmUuaW5uZXJIVE1MID0gXCJtb3VzZVBvc2l0aW9uOiB4ID0gXCIgKyBtb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCArIFwiLCB5ID0gXCIgKyBtb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSArIFxyXG4gICAgXCI8YnI+Q2xpY2tlZCA9IFwiICsgbW91c2VTdGF0ZS5tb3VzZURvd24gKyBcclxuICAgIFwiPGJyPk92ZXIgQ2FudmFzID0gXCIgKyBtb3VzZVN0YXRlLm1vdXNlSW47XHJcbn1cclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzLCBjZW50ZXIsIGFjdGl2ZUhlaWdodCl7XHJcbiAgICAvL2RyYXcgZGVidWcgYmFja2dyb3VuZFxyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGRyYXdMaWIuY2xlYXIoY3R4LCAwLCAwLCBjYW52YXMub2Zmc2V0V2lkdGgsIGNhbnZhcy5vZmZzZXRIZWlnaHQpO1xyXG4gICAgZHJhd0xpYi5yZWN0KGN0eCwgMCwgMCwgY2FudmFzLm9mZnNldFdpZHRoLCBjYW52YXMub2Zmc2V0SGVpZ2h0LCBcIndoaXRlXCIsIGZhbHNlKTtcclxuICAgIGRyYXdMaWIubGluZShjdHgsIGNhbnZhcy5vZmZzZXRXaWR0aC8yLCBjZW50ZXIueSAtIGFjdGl2ZUhlaWdodC8yLCBjYW52YXMub2Zmc2V0V2lkdGgvMiwgY2FudmFzLm9mZnNldEhlaWdodCwgMiwgXCJsaWdodGdyYXlcIik7XHJcbiAgICBkcmF3TGliLmxpbmUoY3R4LCAwLCBjZW50ZXIueSwgY2FudmFzLm9mZnNldFdpZHRoLCBjZW50ZXIueSwgMiwgXCJsaWdodEdyYXlcIik7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7IiwiXCJ1c2Ugc3RyaWN0XCJcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcblxyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxuXHJcbi8vIFBhcnNlcyB0aGUgeG1sIGNhc2UgZmlsZXNcclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBrbm93biB0YWdzXHJcbi8qXHJcbmFuc3dlclxyXG5idXR0b25cclxuY2F0ZWdvcnlMaXN0XHJcbmNvbm5lY3Rpb25zXHJcbmVsZW1lbnRcclxuZmVlZGJhY2tcclxuaW5zdHJ1Y3Rpb25zXHJcbnJlc291cmNlXHJcbnJlc291cmNlTGlzdFxyXG5yZXNvdXJjZUluZGV4XHJcbnNvZnR3YXJlTGlzdFxyXG5xdWVzdGlvblxyXG5xdWVzdGlvblRleHRcclxucXVzdGlvbk5hbWVcclxuKi9cclxuXHJcbi8vIHRoZSB4bWwgc3RydWN0dXJlIHRoYXQgc3RvcmVzIHRoZSBkYXRhXHJcbnZhciByYXdEYXRhO1xyXG52YXIgdXRpbGl0aWVzO1xyXG5cclxuLy8gY29uc3RydWN0b3JcclxuZnVuY3Rpb24gaXBhckRhdGFQYXJzZXIodXJsLCBjYWxsYmFjaykge1xyXG4gICAgdXRpbGl0aWVzID0gbmV3IFV0aWxpdGllcygpO1xyXG4gICAgXHJcbiAgICB0aGlzLmNhdGVnb3JpZXMgPSBbXTtcclxuICAgIHRoaXMucXVlc3Rpb25zID0gW107XHJcbiAgICBcclxuXHQvLyBnZXQgWE1MXHJcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmF3RGF0YSA9IHhoci5yZXNwb25zZVhNTDtcclxuICAgICAgICB0aGlzLmNhdGVnb3JpZXMgPSBwLmdldENhdGVnb3JpZXNBbmRRdWVzdGlvbnMoKTtcclxuICAgICAgICAvL2NhbGxiYWNrKHRoaXMucXVlc3Rpb25zKTsgaW5zdGVhZCBvZiByZXR1cm5pbmcgdGhlIHF1ZXN0aW9ucywgcmV0dXJuIHRoZSBcclxuICAgICAgICBjYWxsYmFjayh0aGlzLmNhdGVnb3JpZXMpO1xyXG4gICAgfVxyXG4gICAgeGhyLm9wZW4oXCJHRVRcIiwgdXJsLCB0cnVlKTtcclxuICAgIHhoci5zZW5kKCk7XHJcbn1cclxuXHJcbnZhciBwID0gaXBhckRhdGFQYXJzZXIucHJvdG90eXBlO1xyXG5cclxuLy8gdGFrZXMgdGhlIHhtbCBzdHJ1Y3R1cmUgYW5kIGZpbGxzIGluIHRoZSBkYXRhIGZvciB0aGUgcXVlc3Rpb24gb2JqZWN0XHJcbnAuZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIGlmIHRoZXJlIGlzIGEgY2FzZSBmaWxlXHJcblx0aWYgKHJhd0RhdGEgIT0gbnVsbCkge1xyXG5cdFx0dmFyIGNhdGVnb3J5RWxlbWVudHMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIik7XHJcblx0XHR2YXIgY2F0ZWdvcmllcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaD0wOyBoPGNhdGVnb3J5RWxlbWVudHMubGVuZ3RoOyBoKyspIHtcclxuXHRcdFx0Ly8gYnV0dG9ucyBhcmUgdGhlIHRvcC1sZXZlbCBlbGVtZW50IGZvciB0aGUgcXVlc3Rpb25zXHJcblx0XHRcdHZhciBxdWVzdGlvbkVsZW1lbnRzID0gY2F0ZWdvcnlFbGVtZW50c1toXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKTtcclxuXHRcdFx0dmFyIHF1ZXN0aW9ucyA9IFtdO1xyXG5cdFx0XHQvLyBjcmVhdGUgcXVlc3Rpb25zXHJcblx0XHRcdGZvciAodmFyIGk9MDsgaTxxdWVzdGlvbkVsZW1lbnRzLmxlbmd0aDsgaSsrKSBcclxuXHRcdFx0e1xyXG5cdFx0XHRcdC8vIGZpbGwgcXVlc3Rpb25cclxuXHRcdFx0XHQvKiBxdWVzdGlvbiBuZWVkcyB0aGVzZSB0aGluZ3M6XHJcblx0XHRcdFx0aW5kZXg7ICAgICAgICAgICAgIC8vaW50XHJcblx0XHRcdFx0Y29ycmVjdEFuc3dlcjsgICAgIC8vaW50XHJcblx0XHRcdFx0cXVlc3Rpb25UZXh0OyAgICAgIC8vc3RyaW5nXHJcblx0XHRcdFx0cXVlc3Rpb25UeXBlXHQgICAvL2ludFxyXG5cdFx0XHRcdGFuc3dlclRleHQ7ICAgICAgICAvL3N0cmluZyBhcnJheVxyXG5cdFx0XHRcdGZlZWRiYWNrVGV4dDsgICAgICAvL3N0cmluZyBhcnJheVxyXG5cdFx0XHRcdGltYWdlTGluazsgICAgICAgICAvL3N0cmluZ1xyXG5cdFx0XHRcdGNvbm5lY3Rpb25zOyAgICAgICAvL3N0cmluZyBhcnJheVxyXG5cdFx0XHRcdGluc3RydWN0aW9uczsgICAgICAvL3N0cmluZ1xyXG5cdFx0XHRcdHJlc291cmNlczsgICAgICAgICAvL3Jlc291cmNlSXRlbVxyXG5cdFx0XHRcdHJldmVhbFRocmVzaG9sZDsgICAvL2ludFxyXG5cdFxyXG5cdFx0XHRcdGp1c3RpZmljYXRpb247ICAgICAvL3N0cmluZ1xyXG5cdFx0XHRcdGZpbGVTdWJtaXRDb3VudDsgICAvL2ludFxyXG5cdFx0XHRcdGFuaW1hdGVkOyAgICAgICAgICAvL2Jvb2xcclxuXHRcdFx0XHRsaW5lc1RyYWNlZDsgICAgICAgLy9pbnRcclxuXHRcdFx0XHRyZXZlYWxCdWZmZXI7ICAgICAgLy9pbnRcclxuXHRcdFx0XHQqL1xyXG5cdFx0XHRcdC8vIGNyZWF0ZSBhIHF1ZXN0aW9uIG9iamVjdFxyXG5cdFx0XHRcdHF1ZXN0aW9uc1tpXSA9IG5ldyBRdWVzdGlvbigpO1xyXG5cdFx0XHRcclxuXHRcdFx0XHQvLyBpbmRleCAobWF5IG5vdCBleGhpYml0IGV4cGVjdGVkIGJlaGF2aW9yKVxyXG5cdFx0XHRcdHF1ZXN0aW9uc1tpXS5pbmRleCA9IGk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vZGV0ZXJtaW5lIHNjYWxlIG9mIHRoZSBzY3JlZW5cclxuICAgICAgICAgICAgICAgIHZhciB0ZW1wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignY2FudmFzJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vcG9zaXRpb25QZXJjZW50WFxyXG4gICAgICAgICAgICAgICAgcXVlc3Rpb25zW2ldLnBvc2l0aW9uUGVyY2VudFggPSB1dGlsaXRpZXMubWFwKHF1ZXN0aW9uRWxlbWVudHNbaV0uZ2V0QXR0cmlidXRlKFwieFBvc2l0aW9uUGVyY2VudFwiKSwgMCwgMTAwLCAwLCB0ZW1wLndpZHRoKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy9wb3NpdGlvblBlcmNlbnRZXHJcbiAgICAgICAgICAgICAgICBxdWVzdGlvbnNbaV0ucG9zaXRpb25QZXJjZW50WSA9IHV0aWxpdGllcy5tYXAocXVlc3Rpb25FbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoXCJ5UG9zaXRpb25QZXJjZW50XCIpLCAwLCAxMDAsIDAsIHRlbXAuaGVpZ2h0KTtcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gY29ycmVjdCBhbnN3ZXIgbnVtYmVyXHJcblx0XHRcdFx0cXVlc3Rpb25zW2ldLmNvcnJlY3RBbnN3ZXIgPSBxdWVzdGlvbkVsZW1lbnRzW2ldLmdldEF0dHJpYnV0ZShcImNvcnJlY3RBbnN3ZXJcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRcdC8vIHEgdHlwZVxyXG5cdFx0XHRcdHF1ZXN0aW9uc1tpXS5xdWVzdGlvblR5cGUgPSBxdWVzdGlvbkVsZW1lbnRzW2ldLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uVHlwZVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gcXVlc3Rpb24gdGV4dFxyXG5cdFx0XHRcdHF1ZXN0aW9uc1tpXS5xdWVzdGlvblRleHQgPSBxdWVzdGlvbkVsZW1lbnRzW2ldLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25UZXh0XCIpWzBdLnRleHRDb250ZW50O1xyXG5cdFx0XHRcclxuXHRcdFx0XHQvLyBnZXQgYW4gYXJyYXkgb2YgYW5zd2Vyc1xyXG5cdFx0XHRcdHZhciBhbnN3ZXJzID0gcXVlc3Rpb25FbGVtZW50c1tpXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImFuc3dlclwiKTtcclxuXHRcdFx0XHQvLyBpbml0aWFsaXplIHF1ZXN0aW9uJ3MgYW5zd2VyVGV4dCBwcm9wZXJ0eVxyXG5cdFx0XHRcdHF1ZXN0aW9uc1tpXS5hbnN3ZXJUZXh0ID0gW107XHJcblx0XHRcdFx0Ly8gbG9vcCB0aHJvdWdoIGFuZCBhZGQgYW5zd2VyJ3MgdGV4dENvbnRlbnRcclxuXHRcdFx0XHRmb3IgKHZhciBqPTA7IGo8YW5zd2Vycy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHRcdFx0cXVlc3Rpb25zW2ldLmFuc3dlclRleHQucHVzaChhbnN3ZXJzW2pdLnRleHRDb250ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRcdC8vIGdldCBhbiBhcnJheSBvZiBmZWVkYmFja1xyXG5cdFx0XHRcdHZhciBmZWVkYmFjayA9IHF1ZXN0aW9uRWxlbWVudHNbaV0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJmZWVkYmFja1wiKTtcclxuXHRcdFx0XHQvLyBpbml0aWFsaXplIHF1ZXN0aW9uJ3MgZmVlZGJhY2tUZXh0IHByb3BlcnR5XHJcblx0XHRcdFx0cXVlc3Rpb25zW2ldLmZlZWRiYWNrVGV4dCA9IFtdO1xyXG5cdFx0XHRcdC8vIGxvb3AgdGhyb3VnaCBhbmQgYWRkIGZlZWRiYWNrJ3MgdGV4dENvbnRlbnRcclxuXHRcdFx0XHRmb3IgKHZhciBqPTA7IGo8ZmVlZGJhY2subGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdHF1ZXN0aW9uc1tpXS5mZWVkYmFja1RleHQucHVzaChmZWVkYmFja1tqXS50ZXh0Q29udGVudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0XHQvLyBpbWFnZSBsaW5rXHJcblx0XHRcdFx0cXVlc3Rpb25zW2ldLmltYWdlTGluayA9IHF1ZXN0aW9uRWxlbWVudHNbaV0uZ2V0QXR0cmlidXRlKFwiaW1hZ2VMaW5rXCIpO1xyXG5cdFx0XHRcdC8vIGFsdGVyIGltYWdlIGxpbmsgc3RyaW5nIGZvciBuZXcgZmlsZSBzdHJ1Y3R1cmVcclxuXHRcdFx0XHRxdWVzdGlvbnNbaV0uaW1hZ2VMaW5rID0gcXVlc3Rpb25zW2ldLmltYWdlTGluay5yZXBsYWNlKFwiYXNzZXRzXCIsXCIuXCIpLnJlcGxhY2UoXCJzb2Z0d2FyZS9cIixcIlwiKTtcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gY29ubmVjdGlvbnNcclxuXHRcdFx0XHRxdWVzdGlvbnNbaV0uY29ubmVjdGlvbnMgPSBbXTtcclxuXHRcdFx0XHR2YXIgY29ubmVjdGlvbkVsZW1zID0gcXVlc3Rpb25FbGVtZW50c1tpXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNvbm5lY3Rpb25zXCIpO1xyXG5cdFx0XHRcdGZvciAodmFyIGo9MDsgajxjb25uZWN0aW9uRWxlbXMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHRcdHZhciBjb25uZWN0aW9uRWxlbSA9IGNvbm5lY3Rpb25FbGVtc1tqXTtcclxuXHRcdFx0XHRcdGlmIChjb25uZWN0aW9uRWxlbSkgcXVlc3Rpb25zW2ldLmNvbm5lY3Rpb25zLnB1c2goY29ubmVjdGlvbkVsZW0udGV4dENvbnRlbnQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gaW5zdHJ1Y3Rpb25zXHJcblx0XHRcdFx0cXVlc3Rpb25zW2ldLmluc3RydWN0aW9ucyA9IHF1ZXN0aW9uRWxlbWVudHNbaV0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0udGV4dENvbnRlbnQ7XHJcblx0XHRcdFxyXG5cdFx0XHRcdC8vIGdldCBhbiBhcnJheSBvZiByZXNvdXJjZXNcclxuXHRcdFx0XHR2YXIgcmVzb3VyY2VzID0gcXVlc3Rpb25FbGVtZW50c1tpXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInJlc291cmNlXCIpO1xyXG5cdFx0XHRcdC8vIGluaXRpYWxpemUgcXVlc3Rpb24ncyByZXNvdXJjZXMgcHJvcGVydHlcclxuXHRcdFx0XHRxdWVzdGlvbnNbaV0ucmVzb3VyY2VzID0gW107XHJcblx0XHRcdFx0Ly8gbG9vcCB0aHJvdWdoIGFuZCBhZGQgcmVzb3VyY2VzJ3MgdGV4dENvbnRlbnRcclxuXHRcdFx0XHRmb3IgKHZhciBqPTA7IGo8cmVzb3VyY2VzLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdFx0XHRxdWVzdGlvbnNbaV0ucmVzb3VyY2VzLnB1c2gocmVzb3VyY2VzW2pdLnRleHRDb250ZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRcdC8vIHJldmVhbCB0aHJlc2hvbGRcclxuXHRcdFx0XHRxdWVzdGlvbnNbaV0ucmV2ZWFsVGhyZXNob2xkID0gcXVlc3Rpb25FbGVtZW50c1tpXS5nZXRBdHRyaWJ1dGUoXCJyZXZlYWxUaHJlc2hvbGRcIik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHF1ZXN0aW9uc1tpXS5yZXZlYWxUaHJlc2hvbGQgPD0gMCkge1xyXG5cdFx0XHRcdFx0cXVlc3Rpb25zW2ldLmN1cnJlbnRTdGF0ZSA9IDE7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHF1ZXN0aW9uc1tpXS5jdXJyZW50U3RhdGUgPSAyO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHRcclxuXHRcdFx0XHQvLyBmaWxlU3VibWl0Q291bnRcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gYW5pbWF0ZWRcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gbGluZXNUcmFjZWRcclxuXHRcdFx0XHJcblx0XHRcdFx0Ly8gcmV2ZWFsQnVmZmVyXHJcblx0XHRcdFxyXG5cdFx0XHRcdC8vIERFQlVHXHJcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcImFuc3dlciB0ZXh0OiBcIitxdWVzdGlvbnNbaV0uYW5zd2VyVGV4dCk7XHJcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcIkNvcnJlY3QgYW5zd2VyIGZvciBxdWVzdGlvbiBcIisoaSsxKStcIjogXCIrcXVlc3Rpb25zW2ldLmNvcnJlY3RBbnN3ZXIpOyBcclxuXHRcdFx0XHJcblx0XHRcdH1cclxuXHRcdFx0Y2F0ZWdvcmllc1toXSA9IHt9O1xyXG5cdFx0XHRjYXRlZ29yaWVzW2hdLnF1ZXN0aW9ucyA9IHF1ZXN0aW9ucztcclxuXHRcdFx0Y2F0ZWdvcmllc1toXS5udW1RdWVzdGlvbnMgPSBxdWVzdGlvbnMubGVuZ3RoO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNhdGVnb3JpZXM7XHJcblx0fVxyXG5cdHJldHVybiBudWxsXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaXBhckRhdGFQYXJzZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9kcmF3TGliLmpzJyk7XHJcblxyXG52YXIgZHJhd0xpYjtcclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gbGVzc29uTm9kZShzdGFydFBvc2l0aW9uLCBpbWFnZVBhdGgsIHBRdWVzdGlvbil7XHJcbiAgICBkcmF3TGliID0gbmV3IERyYXdMaWIoKTtcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLmRyYWdMb2NhdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICB0aGlzLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMudHlwZSA9IFwibGVzc29uTm9kZVwiO1xyXG4gICAgdGhpcy5pbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy53aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5xdWVzdGlvbiA9IHBRdWVzdGlvbjtcclxuICAgIHRoaXMuY2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5saW5rc0F3YXlGcm9tT3JpZ2luID0gMDtcclxuICAgIFxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pbWFnZSBsb2FkaW5nIGFuZCByZXNpemluZ1xyXG4gICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0LndpZHRoID0gdGhhdC5pbWFnZS5uYXR1cmFsV2lkdGg7XHJcbiAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmltYWdlLm5hdHVyYWxIZWlnaHQ7XHJcbiAgICAgICAgdmFyIG1heERpbWVuc2lvbiA9IDEwMDtcclxuICAgICAgICAvL3RvbyBzbWFsbD9cclxuICAgICAgICBpZih0aGF0LndpZHRoIDwgbWF4RGltZW5zaW9uICYmIHRoYXQuaGVpZ2h0IDwgbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC53aWR0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IG1heERpbWVuc2lvbiAvIHRoYXQuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoICogeDtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAqIHg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPiBtYXhEaW1lbnNpb24gfHwgdGhhdC5oZWlnaHQgPiBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSB0aGF0LndpZHRoIC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC5oZWlnaHQgLyBtYXhEaW1lbnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggLyB4O1xyXG4gICAgICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaGVpZ2h0IC8geDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IGltYWdlUGF0aDtcclxufVxyXG5cclxudmFyIHAgPSBsZXNzb25Ob2RlLnByb3RvdHlwZTtcclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCl7XHJcbiAgICAvL2xlc3Nvbk5vZGUuZHJhd0xpYi5jaXJjbGUoY3R4LCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgMTAsIFwicmVkXCIpO1xyXG4gICAgLy9kcmF3IHRoZSBpbWFnZSwgc2hhZG93IGlmIGhvdmVyZWRcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBpZih0aGlzLmRyYWdnaW5nKSB7XHJcbiAgICBcdGN0eC5zaGFkb3dDb2xvciA9ICd5ZWxsb3cnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYodGhpcy5tb3VzZU92ZXIpe1xyXG4gICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICdkb2RnZXJCbHVlJztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDU7XHJcbiAgICB9XHJcbiAgICAvL2RyYXdpbmcgdGhlIGJ1dHRvbiBpbWFnZVxyXG4gICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLnggLSAodGhpcy53aWR0aCp0aGlzLnNjYWxlRmFjdG9yKS8yLCB0aGlzLnBvc2l0aW9uLnkgLSAodGhpcy5oZWlnaHQqdGhpcy5zY2FsZUZhY3RvcikvMiwgdGhpcy53aWR0aCAqIHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMuaGVpZ2h0ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICBcclxuICAgIC8vZHJhd2luZyB0aGUgcGluXHJcbiAgICBzd2l0Y2ggKHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlKSB7XHJcbiAgICBcdGNhc2UgMTpcclxuICAgIFx0XHRjdHguZmlsbFN0eWxlID0gXCJibHVlXCI7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IFwiY3lhblwiO1xyXG5cdFx0XHRicmVhaztcclxuICAgICBcdGNhc2UgMjpcclxuICAgIFx0XHRjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSBcInllbGxvd1wiO1xyXG5cdFx0XHRicmVhaztcclxuICAgIH1cclxuXHRjdHgubGluZVdpZHRoID0gMjtcclxuXHJcblx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdGN0eC5hcmModGhpcy5wb3NpdGlvbi54IC0gKHRoaXMud2lkdGgqdGhpcy5zY2FsZUZhY3RvcikvMiArIDE1LHRoaXMucG9zaXRpb24ueSAtICh0aGlzLmhlaWdodCp0aGlzLnNjYWxlRmFjdG9yKS8yICsgMTUsNiwwLDIqTWF0aC5QSSk7XHJcblx0Y3R4LmNsb3NlUGF0aCgpO1xyXG5cdGN0eC5maWxsKCk7XHJcblx0Y3R4LnN0cm9rZSgpO1xyXG4gICAgXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxucC5jbGljayA9IGZ1bmN0aW9uKG1vdXNlU3RhdGUpe1xyXG4gICAgY29uc29sZS5sb2coXCJub2RlIFwiK3RoaXMucXVlc3Rpb24uaW5kZXgrXCIgY2xpY2tlZFwiKTtcclxuICAgIHRoaXMuY2xpY2tlZCA9IHRydWU7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGVzc29uTm9kZTsiLCJcInVzZSBzdHJpY3RcIjtcclxuZnVuY3Rpb24gbW91c2VTdGF0ZShwUG9zaXRpb24sIHBSZWxhdGl2ZVBvc2l0aW9uLCBwTW91c2Vkb3duLCBwTW91c2VJbiwgcE1vdXNlQ2xpY2tlZCl7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gcFBvc2l0aW9uO1xyXG4gICAgdGhpcy5yZWxhdGl2ZVBvc2l0aW9uID0gcFJlbGF0aXZlUG9zaXRpb247XHJcbiAgICB0aGlzLm1vdXNlRG93biA9IHBNb3VzZWRvd247XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBwTW91c2VJbjtcclxuICAgIHRoaXMucHJldk1vdXNlRG93biA9IHBNb3VzZWRvd247XHJcbiAgICB0aGlzLm1vdXNlQ2xpY2tlZCA9IHBNb3VzZUNsaWNrZWQ7XHJcbiAgICB0aGlzLmhhc1RhcmdldCA9IGZhbHNlO1xyXG59XHJcblxyXG52YXIgcCA9IG1vdXNlU3RhdGUucHJvdG90eXBlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBtb3VzZVN0YXRlOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQm9hcmQgPSByZXF1aXJlKCcuLi9ib2FyZC5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuLi9wb2ludC5qcycpO1xyXG52YXIgTGVzc29uTm9kZSA9IHJlcXVpcmUoJy4uL2xlc3Nvbk5vZGUuanMnKTtcclxudmFyIElwYXJEYXRhUGFyc2VyID0gcmVxdWlyZSgnLi4vaXBhckRhdGFQYXJzZXIuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi4vcXVlc3Rpb24uanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi4vcG9pbnQuanMnKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy5qcycpO1xyXG5cclxudmFyIGJvYXJkQXJyYXk7XHJcbnZhciBtYXhCb2FyZFdpZHRoID0gMTAwMDtcclxudmFyIG1heEJvYXJkSGVpZ2h0ID0gODAwO1xyXG52YXIgY3VycmVudEJvYXJkO1xyXG52YXIgcXVlc3Rpb25zO1xyXG52YXIgYWN0aXZlQm9hcmRJbmRleDtcclxuLy9oYXMgZXZlcnl0aGluZyBsb2FkZWQ/XHJcbnZhciBsb2FkaW5nQ29tcGxldGU7XHJcbi8vIHNhdmUgdGhlIGxhc3Qgc3RhdGUgb2YgdGhlIG1vdXNlIGZvciBjaGVja2luZyBjbGlja3NcclxudmFyIHByZXZNb3VzZVN0YXRlO1xyXG5cclxudmFyIHV0aWxpdGllcztcclxuXHJcbi8vIGRyYWcgdGhlIGJvYXJkXHJcbnZhciBtb3VzZVN0YXJ0RHJhZ0JvYXJkID0gdW5kZWZpbmVkO1xyXG52YXIgYm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcbnZhciBwcmV2Qm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcblxyXG5mdW5jdGlvbiBib2FyZFBoYXNlKHBVcmwpe1xyXG4gICAgbG9hZGluZ0NvbXBsZXRlID0gZmFsc2U7XHJcbiAgICBwcm9jZXNzRGF0YShwVXJsKTtcclxuICAgIHV0aWxpdGllcyA9IG5ldyBVdGlsaXRpZXMoKTtcclxufVx0XHJcblxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc0RhdGEocFVybCl7XHJcblx0Ly8gaW5pdGlhbGl6ZVxyXG4gICAgYm9hcmRBcnJheSA9IFtdO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBwYXJzZXJcclxuICAgIHZhciBleHRyYWN0ZWREYXRhID0gbmV3IElwYXJEYXRhUGFyc2VyKFwiLi9kYXRhL215ZGF0YS54bWxcIiwgZGF0YUxvYWRlZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRhdGFMb2FkZWQoY2F0ZWdvcnlEYXRhKSB7XHJcblx0Ly9xdWVzdGlvbnMgPSBpcGFyUGFyc2VyLmdldFF1ZXN0aW9uc0FycmF5KCk7XHJcbiAgICAvL2NyZWF0ZUxlc3Nvbk5vZGVzRnJvbVF1ZXN0aW9ucyhxdWVzdGlvbnMpO1xyXG4gICAgY3JlYXRlTGVzc29uTm9kZXNJbkJvYXJkcyhjYXRlZ29yeURhdGEpO1xyXG4gICAgbG9hZGluZ0NvbXBsZXRlID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTGVzc29uTm9kZXNJbkJvYXJkcyhjYXRlZ29yaWVzKSB7XHJcblx0Y2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uKGNhdCkge1xyXG5cdFx0Ly8gaW5pdGlhbGl6ZSBlbXB0eVxyXG5cdFx0dmFyIGxlc3Nvbk5vZGVzID0gW107XHJcblx0XHQvLyBhZGQgYSBub2RlIHBlciBxdWVzdGlvblxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjYXQucXVlc3Rpb25zLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIGNyZWF0ZSBhIG5ldyBsZXNzb24gbm9kZVxyXG5cdFx0XHRsZXNzb25Ob2Rlcy5wdXNoKG5ldyBMZXNzb25Ob2RlKG5ldyBQb2ludChjYXQucXVlc3Rpb25zW2ldLnBvc2l0aW9uUGVyY2VudFgsIGNhdC5xdWVzdGlvbnNbaV0ucG9zaXRpb25QZXJjZW50WSksIGNhdC5xdWVzdGlvbnNbaV0uaW1hZ2VMaW5rLCBjYXQucXVlc3Rpb25zW2ldICkgKTtcclxuXHRcdFx0Ly8gYXR0YWNoIHF1ZXN0aW9uIG9iamVjdCB0byBsZXNzb24gbm9kZVxyXG5cdFx0XHRsZXNzb25Ob2Rlc1tsZXNzb25Ob2Rlcy5sZW5ndGgtMV0ucXVlc3Rpb24gPSBjYXQucXVlc3Rpb25zW2ldO1xyXG5cdFx0XHQvL2NvbnNvbGUubG9nKFwiaW1hZ2U6IFwiK2xlc3Nvbk5vZGVzW2xlc3Nvbk5vZGVzLmxlbmd0aC0xXS5pbWFnZS5nZXRBdHRyaWJ1dGUoXCJzcmNcIikpO1xyXG5cdFx0XHJcblx0XHR9XHJcblx0XHQvLyBjcmVhdGUgYSBib2FyZFxyXG5cdFx0Ym9hcmRBcnJheS5wdXNoKG5ldyBCb2FyZChuZXcgUG9pbnQoMCwwKSwgbGVzc29uTm9kZXMpKTtcclxuXHRcdC8vY29uc29sZS5sb2coYm9hcmRBcnJheVtib2FyZEFycmF5Lmxlbmd0aC0xXS5sZXNzb25Ob2RlQXJyYXlbMF0ucXVlc3Rpb24pO1xyXG5cdH0pO1xyXG5cdGFjdGl2ZUJvYXJkSW5kZXggPSAzOyAvLyBzdGFydCB3aXRoIHRoZSBmaXJzdCBib2FyZCAoYWN0dWFsbHkgaXRzIHRoZSBzZWNvbmQgbm93IHNvIEkgY2FuIGRlYnVnKVxyXG59XHJcblxyXG5cclxudmFyIHAgPSBib2FyZFBoYXNlLnByb3RvdHlwZTtcclxuXHJcbnAudXBkYXRlID0gZnVuY3Rpb24oY3R4LCBjYW52YXMsIGR0LCBjZW50ZXIsIGFjdGl2ZUhlaWdodCwgcE1vdXNlU3RhdGUsIGJvYXJkT2Zmc2V0KSB7XHJcbiAgICBwLmFjdChwTW91c2VTdGF0ZSk7XHJcbiAgICBwLmRyYXcoY3R4LCBjYW52YXMsIGNlbnRlciwgYWN0aXZlSGVpZ2h0KTtcclxuICAgIGlmIChhY3RpdmVCb2FyZEluZGV4KSBib2FyZEFycmF5W2FjdGl2ZUJvYXJkSW5kZXhdLnVwZGF0ZSgpO1xyXG59XHJcblxyXG5wLmFjdCA9IGZ1bmN0aW9uKHBNb3VzZVN0YXRlKXtcclxuXHQvLyBob3ZlciBzdGF0ZXNcclxuXHQvL2Zvcih2YXIgaSA9IDA7IGkgPCBib2FyZEFycmF5Lmxlbmd0aDsgaSsrKXtcclxuXHRcdC8vIGxvb3AgdGhyb3VnaCBsZXNzb24gbm9kZXMgdG8gY2hlY2sgZm9yIGhvdmVyXHJcblx0aWYgKGFjdGl2ZUJvYXJkSW5kZXggIT0gdW5kZWZpbmVkKSB7XHJcblx0XHQvLyB1cGRhdGUgYm9hcmRcclxuXHRcdFxyXG5cdFx0dmFyIG5vZGVDaG9zZW4gPSBmYWxzZTtcclxuXHRcdGZvciAodmFyIGk9Ym9hcmRBcnJheVthY3RpdmVCb2FyZEluZGV4XS5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoLTE7IGk+PTA7IGktLSkge1xyXG5cdFx0XHRpZiAoYm9hcmRBcnJheVthY3RpdmVCb2FyZEluZGV4XS5sZXNzb25Ob2RlQXJyYXlbaV0uZHJhZ2dpbmcpIHtcclxuXHRcdFx0XHQvL25vZGVDaG9zZW4gPSB0cnVlO1xyXG5cdFx0XHRcdHBNb3VzZVN0YXRlLmhhc1RhcmdldCA9IHRydWU7XHJcblx0XHRcdFx0XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblx0XHRmb3IgKHZhciBpPWJvYXJkQXJyYXlbYWN0aXZlQm9hcmRJbmRleF0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aC0xOyBpPj0wOyBpLS0pIHtcclxuXHRcdFx0dmFyIGxOb2RlID0gYm9hcmRBcnJheVthY3RpdmVCb2FyZEluZGV4XS5sZXNzb25Ob2RlQXJyYXlbaV07XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIXBNb3VzZVN0YXRlLm1vdXNlRG93bikge1xyXG5cdFx0XHRcdGxOb2RlLmRyYWdQb3NpdGlvbiA9IHVuZGVmaW5lZDsgLy8gY2xlYXIgZHJhZyBiZWhhdmlvclxyXG5cdFx0XHRcdGxOb2RlLmRyYWdnaW5nID0gZmFsc2U7XHJcblx0XHRcdH0gXHJcblx0XHRcdFxyXG5cdFx0XHRsTm9kZS5tb3VzZU92ZXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSBzZWxlY3RlZCBub2RlLCBkbyBub3QgdHJ5IHRvIHNlbGVjdCBhbm90aGVyXHJcblx0XHRcdGlmIChub2RlQ2hvc2VuKSB7ICBjb250aW51ZTsgfVxyXG5cdFx0XHRcclxuXHRcdFx0Ly9jb25zb2xlLmxvZyhcIm5vZGUgdXBkYXRlXCIpO1xyXG5cdFx0XHQvLyBpZiBob3ZlcmluZywgc2hvdyBob3ZlciBnbG93XHJcblx0XHRcdC8qaWYgKHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCA+IGxOb2RlLnBvc2l0aW9uLngtbE5vZGUud2lkdGgvMiBcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi54IDwgbE5vZGUucG9zaXRpb24ueCtsTm9kZS53aWR0aC8yXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSA+IGxOb2RlLnBvc2l0aW9uLnktbE5vZGUuaGVpZ2h0LzJcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi55IDwgbE5vZGUucG9zaXRpb24ueStsTm9kZS5oZWlnaHQvMikgeyovXHJcblx0XHRcdFxyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHV0aWxpdGllcy5tb3VzZUludGVyc2VjdChwTW91c2VTdGF0ZSxsTm9kZSxib2FyZE9mZnNldCwxKSkge1xyXG5cdFx0XHRcdGxOb2RlLm1vdXNlT3ZlciA9IHRydWU7XHJcblx0XHRcdFx0bm9kZUNob3NlbiA9IHRydWU7XHJcblx0XHRcdFx0cE1vdXNlU3RhdGUuaGFzVGFyZ2V0ID0gdHJ1ZTtcclxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKHBNb3VzZVN0YXRlLmhhc1RhcmdldCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlRG93biAmJiAhcHJldk1vdXNlU3RhdGUubW91c2VEb3duKSB7XHJcblx0XHRcdFx0XHQvLyBkcmFnXHJcblx0XHRcdFx0XHRsTm9kZS5kcmFnZ2luZyA9IHRydWU7XHJcblx0XHRcdFx0XHRsTm9kZS5kcmFnUG9zaXRpb24gPSBuZXcgUG9pbnQoXHJcblx0XHRcdFx0XHRwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggLSBsTm9kZS5wb3NpdGlvbi54LFxyXG5cdFx0XHRcdFx0cE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi55IC0gbE5vZGUucG9zaXRpb24ueVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGNsaWNrIGNvZGVcclxuXHRcdFx0XHRcdGxOb2RlLmNsaWNrKHBNb3VzZVN0YXRlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gaWYgdGhlIHVzZXIgaXMgZHJhZ2dpbmcgYSBub2RlLCBhbGxvdyB0aGUgbW91c2UgdG8gY29udHJvbCBpdHMgbW92ZW1lbnRcclxuXHRcdFx0aWYgKGxOb2RlLmRyYWdnaW5nKSB7XHJcblx0XHRcdFx0bE5vZGUucG9zaXRpb24ueCA9IHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCAtIGxOb2RlLmRyYWdQb3NpdGlvbi54O1xyXG5cdFx0XHRcdGxOb2RlLnBvc2l0aW9uLnkgPSBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgLSBsTm9kZS5kcmFnUG9zaXRpb24ueTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvLyBkcmFnIHRoZSBib2FyZCBhcm91bmRcclxuXHRpZiAoIXBNb3VzZVN0YXRlLmhhc1RhcmdldCkge1xyXG5cdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlRG93bikge1xyXG5cdFx0XHRpZiAoIW1vdXNlU3RhcnREcmFnQm9hcmQpIHtcclxuXHRcdFx0XHRtb3VzZVN0YXJ0RHJhZ0JvYXJkID0gcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbjtcclxuXHRcdFx0XHRwcmV2Qm9hcmRPZmZzZXQueCA9IGJvYXJkT2Zmc2V0Lng7XHJcblx0XHRcdFx0cHJldkJvYXJkT2Zmc2V0LnkgPSBib2FyZE9mZnNldC55O1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGJvYXJkT2Zmc2V0LnggPSBwcmV2Qm9hcmRPZmZzZXQueCAtIChwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggLSBtb3VzZVN0YXJ0RHJhZ0JvYXJkLngpO1xyXG5cdFx0XHRcdGlmIChib2FyZE9mZnNldC54ID4gbWF4Qm9hcmRXaWR0aC8yKSBib2FyZE9mZnNldC54ID0gbWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdGlmIChib2FyZE9mZnNldC54IDwgLTEqbWF4Qm9hcmRXaWR0aC8yKSBib2FyZE9mZnNldC54ID0gLTEqbWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdGJvYXJkT2Zmc2V0LnkgPSBwcmV2Qm9hcmRPZmZzZXQueSAtIChwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgLSBtb3VzZVN0YXJ0RHJhZ0JvYXJkLnkpO1xyXG5cdFx0XHRcdGlmIChib2FyZE9mZnNldC55ID4gbWF4Qm9hcmRIZWlnaHQvMikgYm9hcmRPZmZzZXQueSA9IG1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0aWYgKGJvYXJkT2Zmc2V0LnkgPCAtMSptYXhCb2FyZEhlaWdodC8yKSBib2FyZE9mZnNldC55ID0gLTEqbWF4Qm9hcmRIZWlnaHQvMjtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhib2FyZE9mZnNldCk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1vdXNlU3RhcnREcmFnQm9hcmQgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcbiAgICB9XHJcbiAgICBcclxuXHRwcmV2TW91c2VTdGF0ZSA9IHBNb3VzZVN0YXRlO1xyXG59XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcywgY2VudGVyLCBhY3RpdmVIZWlnaHQpe1xyXG5cdC8vIGN1cnJlbnQgYm9hcmQgPSAwO1xyXG5cdC8vY29uc29sZS5sb2coXCJkcmF3IGN1cnJlbnRCb2FyZCBcIiArIGN1cnJlbnRCb2FyZCk7XHJcblx0aWYgKGFjdGl2ZUJvYXJkSW5kZXggIT0gdW5kZWZpbmVkKSBib2FyZEFycmF5W2FjdGl2ZUJvYXJkSW5kZXhdLmRyYXcoY3R4LCBjZW50ZXIsIGFjdGl2ZUhlaWdodCwgYm9hcmRPZmZzZXQpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib2FyZFBoYXNlOyIsIlwidXNlIHN0cmljdFwiO1xyXG5mdW5jdGlvbiBwb2ludChwWCwgcFkpe1xyXG4gICAgdGhpcy54ID0gcFg7XHJcbiAgICB0aGlzLnkgPSBwWTtcclxufVxyXG5cclxudmFyIHAgPSBwb2ludC5wcm90b3R5cGU7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHBvaW50OyIsIlwidXNlIHN0cmljdFwiO1xyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBxdWVzdGlvbigpe1xyXG4gICAgdGhpcy5TT0xWRV9TVEFURSA9IE9iamVjdC5mcmVlemUoe0hJRERFTjogMCwgVU5TT0xWRUQ6IDEsIFNPTFZFRDogMn0pO1xyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLlNPTFZFX1NUQVRFLlVOU09MVkVEO1xyXG4gICAgXHJcbiAgICB0aGlzLmluZGV4OyAgICAgICAgICAgICAvL2ludFxyXG4gICAgdGhpcy5jYXRlZ29yeUluZGV4OyAgICAgLy9pbnRcclxuICAgIHRoaXMuY29ycmVjdEFuc3dlcjsgICAgIC8vaW50XHJcbiAgICB0aGlzLnF1ZXN0aW9uVGV4dDsgICAgICAvL3N0cmluZ1xyXG4gICAgdGhpcy5xdWVzdGlvblR5cGVcdFx0Ly9pbnRcdFx0XHQ8LSBmcm9tIHhtbFxyXG4gICAgdGhpcy5hbnN3ZXJUZXh0OyAgICAgICAgLy9zdHJvbWcgYXJyYXlcclxuICAgIHRoaXMuZmVlZGJhY2tUZXh0OyAgICAgIC8vc3RyaW5nIGFycmF5XHJcbiAgICB0aGlzLmltYWdlTGluazsgICAgICAgICAvL3N0cmluZ1xyXG4gICAgdGhpcy5jb25uZWN0aW9uczsgICAgICAgLy9zdHJpbmdcclxuICAgIHRoaXMuaW5zdHJ1Y3Rpb25zOyAgICAgIC8vc3RyaW5nXHJcbiAgICB0aGlzLnJlc291cmNlczsgICAgICAgICAvL3Jlc291cmNlSXRlbVxyXG4gICAgdGhpcy5yZXZlYWxUaHJlc2hvbGQ7ICAgLy9pbnRcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvblBlcmNlbnRYO1xyXG4gICAgdGhpcy5wb3NpdGlvblBlcmNlbnRZO1xyXG4gICAgXHJcbiAgICB0aGlzLmp1c3RpZmljYXRpb247ICAgICAvL3N0cmluZ1xyXG4gICAgdGhpcy5maWxlU3VibWl0Q291bnQ7ICAgLy9pbnRcclxuICAgIHRoaXMuYW5pbWF0ZWQ7ICAgICAgICAgIC8vYm9vbFxyXG4gICAgdGhpcy5saW5lc1RyYWNlZDsgICAgICAgLy9pbnRcclxuICAgIHRoaXMucmV2ZWFsQnVmZmVyOyAgICAgIC8vaW50XHJcbn1cclxuXHJcbnZhciBwID0gcXVlc3Rpb24ucHJvdG90eXBlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBxdWVzdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuZnVuY3Rpb24gdXRpbGl0aWVzKCl7XHJcbn1cclxuXHJcbnZhciBwID0gdXRpbGl0aWVzLnByb3RvdHlwZTtcclxuLy8gcmV0dXJucyBtb3VzZSBwb3NpdGlvbiBpbiBsb2NhbCBjb29yZGluYXRlIHN5c3RlbSBvZiBlbGVtZW50XHJcbnAuZ2V0TW91c2UgPSBmdW5jdGlvbihlKXtcclxuICAgIHJldHVybiBuZXcgUG9pbnQoKGUucGFnZVggLSBlLnRhcmdldC5vZmZzZXRMZWZ0KSwgKGUucGFnZVkgLSBlLnRhcmdldC5vZmZzZXRUb3ApKTtcclxufVxyXG5cclxuLy9yZXR1cm5zIGEgdmFsdWUgcmVsYXRpdmUgdG8gdGhlIHJhdGlvIGl0IGhhcyB3aXRoIGEgc3BlY2lmaWMgcmFuZ2UgXCJtYXBwZWRcIiB0byBhIGRpZmZlcmVudCByYW5nZVxyXG5wLm1hcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4xLCBtYXgxLCBtaW4yLCBtYXgyKXtcclxuICAgIHJldHVybiBtaW4yICsgKG1heDIgLSBtaW4yKSAqICgodmFsdWUgLSBtaW4xKSAvIChtYXgxIC0gbWluMSkpO1xyXG59XHJcblxyXG4vL2lmIGEgdmFsdWUgaXMgaGlnaGVyIG9yIGxvd2VyIHRoYW4gdGhlIG1pbiBhbmQgbWF4LCBpdCBpcyBcImNsYW1wZWRcIiB0byB0aGF0IG91dGVyIGxpbWl0XHJcbnAuY2xhbXAgPSBmdW5jdGlvbih2YWx1ZSwgbWluLCBtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWx1ZSkpO1xyXG59XHJcblxyXG4vL2RldGVybWluZXMgd2hldGhlciB0aGUgbW91c2UgaXMgaW50ZXJzZWN0aW5nIHRoZSBhY3RpdmUgZWxlbWVudFxyXG5wLm1vdXNlSW50ZXJzZWN0ID0gZnVuY3Rpb24ocE1vdXNlU3RhdGUsIHBFbGVtZW50LCBwT2Zmc2V0dGVyLCBwU2NhbGUpe1xyXG4gICAgaWYocE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi54ICsgcE9mZnNldHRlci54ID4gKHBFbGVtZW50LnBvc2l0aW9uLnggLSAocFNjYWxlKnBFbGVtZW50LndpZHRoKS8yKSAmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggKyBwT2Zmc2V0dGVyLnggPCAocEVsZW1lbnQucG9zaXRpb24ueCArIChwU2NhbGUqcEVsZW1lbnQud2lkdGgpLzIpKXtcclxuICAgICAgICBpZihwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgKyBwT2Zmc2V0dGVyLnkgPiAocEVsZW1lbnQucG9zaXRpb24ueSAtIChwU2NhbGUqcEVsZW1lbnQuaGVpZ2h0KS8yKSAmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgKyBwT2Zmc2V0dGVyLnkgPCAocEVsZW1lbnQucG9zaXRpb24ueSArIChwU2NhbGUqcEVsZW1lbnQuaGVpZ2h0KS8yKSl7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHBNb3VzZVN0YXRlLmhhc1RhcmdldCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgXHRyZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB1dGlsaXRpZXM7Il19
