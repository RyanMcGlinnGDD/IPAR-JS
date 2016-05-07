(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

document.documentElement.requestFullScreen = document.documentElement.requestFullScreen || document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen;

//imports
var Game = require('./modules/game.js');
var Point = require('./modules/point.js');
var MouseState = require('./modules/mouseState.js');
var Constants = require('./modules/constants.js');
var Utilities = require('./modules/utilities.js');

//game objects
var game;
var canvas;
var ctx;

// window div, film, zoom and if paused
var windowDiv;
var windowFilm;
var proceedContainer;
var proceedLong;
var proceedRound;
var pausedTime = 0;
var zoomSlider;
var pinchStart = 0;

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
	
	windowDiv = document.getElementById('window');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    proceedContainer = document.getElementById('proceedContainer');
    proceedLong = document.getElementById('proceedBtnLong');
    proceedRound = document.getElementById('proceedBtnRound');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Setup the window film
	windowFilm = document.getElementById('windowFlim');
	windowFilm.onclick = function() { windowDiv.innerHTML = ''; };
	
	// Setup dt
    prevTime = Date.now();
    dt = 0;
    
    // Create the game
    game = new Game(localStorage['caseFiles'], canvas, windowDiv);
    
	// Setup the zoom buttons/slider and scale of the game
    zoomSlider = document.getElementById('zoom-slider');
	zoomSlider.oninput = function(){
		game.updateZoom(-parseFloat(zoomSlider.value)); 
	};
    document.getElementById('zoom-in').onclick = function() {
    	zoomSlider.stepDown();
		game.updateZoom(-parseFloat(zoomSlider.value)); 
    };
	document.getElementById('zoom-out').onclick = function() { 
		zoomSlider.stepUp(); 
		game.updateZoom(-parseFloat(zoomSlider.value)); 
	};
	game.onChangeBoard = function() {
		zoomSlider.value = -game.getZoom();
	};
    game.scale = Utilities.getScale(Constants.boardSize, new Point(canvas.width, canvas.height));
}

//fires once per frame
function loop(){
	// loop
    window.requestAnimationFrame(loop.bind(this));
    
	// update delta time
    dt = Date.now() - prevTime;
    prevTime = Date.now();
    
    // update game
    game.update(ctx, canvas, dt);
    
    if(game.mouseState.zoomDiff!=0){
    	zoomSlider.value = pinchStart + game.mouseState.zoomDiff * Constants.pinchSpeed;
    	game.updateZoom(-parseFloat(zoomSlider.value)); 
    }
    else
    	pinchStart = Number(zoomSlider.value);
    
    // Check if should pause
    if(game.active && windowDiv.innerHTML!='' && pausedTime++>3){
    	game.active = false;
    	windowFilm.style.display = 'block';
    }
    else if(pausedTime!=0 && windowDiv.innerHTML==''){
    	windowClosed();
    }
}

//listens for changes in size of window and adjusts variables accordingly
window.addEventListener("resize", function(e){
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Get the new scale
    game.scale = Utilities.getScale(Constants.boardSize, new Point(canvas.width, canvas.height));
    
});

//listens for mouse wheel
window.addEventListener('mousewheel',function(event){
    if(event.deltaY<0)
    	zoomSlider.stepDown();
    else
    	zoomSlider.stepUp();
	game.updateZoom(-parseFloat(zoomSlider.value)); 
	event.preventDefault();
    return false; 
}, false);

// Listen for touch for fullscreen
window.addEventListener('touchstart', function(event){
	
	if(window.matchMedia("only screen and (max-width: 760px)"))
		document.documentElement.requestFullScreen();
	
}, false);

// Called when the question window closes
function windowClosed(){
	
	// Unpause the game and fully close the window
	pausedTime = 0;
	game.active = true;
	windowFilm.style.display = 'none';
	proceedContainer.style.display = "none";
	
	game.windowClosed();
	
}
},{"./modules/constants.js":5,"./modules/game.js":9,"./modules/mouseState.js":12,"./modules/point.js":13,"./modules/utilities.js":17}],2:[function(require,module,exports){
"use strict";
var Utilities = require('./utilities.js');
var Point = require('./point.js');
var Question = require("./question.js");
var Constants = require("./constants.js");
var DrawLib = require("./drawlib.js");

//parameter is a point that denotes starting position
function board(startPosition, lessonNodes){
    this.position = startPosition;
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
		if(this.lessonNodeArray[i].currentState!=Question.SOLVE_STATE.SOLVED)
			done = false;
	if(done)
		this.finished = true;
	else
		this.finished = false;
}

//prototype
var p = board.prototype;

p.move = function(pX, pY){
    this.position.x += pX;
    this.position.y += pY;
    this.boardOffset = {x:0,y:0};
    this.prevBoardOffset = {x:0,y:0};
};

p.act = function(pMouseState, dt) {
	
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
					this.lastQuestionNum = i;
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
				canvas.style.cursor = '-webkit-grabbing';
				canvas.style.cursor = '-moz-grabbing';
				canvas.style.cursor = 'grabbing';
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
				canvas.style.cursor = '';
			}
	    }
    }
}

p.draw = function(ctx, canvas){
    
    // save canvas state because we are about to alter properties
    ctx.save();   

    // Translate to center of screen and scale for zoom then translate back
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-canvas.width/2, -canvas.height/2);
    // move the board to where the user dragged it
    this.position = this.boardOffset;
    //translate to the center of the board
    //console.log(this);
    ctx.translate(canvas.width/2 - this.position.x, canvas.height/2 - this.position.y);
    
	
    // Draw the background of the board
    DrawLib.rect(ctx, 0, 0, Constants.boardSize.x, Constants.boardSize.y, "#D3B185");
    DrawLib.strokeRect(ctx, -Constants.boardOutline/2, -Constants.boardOutline/2, Constants.boardSize.x+Constants.boardOutline/2, Constants.boardSize.y+Constants.boardOutline/2, Constants.boardOutline, "#CB9966");
    
	// draw the nodes
    for(var i = 0; i < this.lessonNodeArray.length; i++){
    
    	// temporarily hide all but the first question						// something is wrong here, linksAwayFromOrigin does not exist anymore
		//if (this.lessonNodeArray[i].question.revealThreshold > this.lessonNodeArray[i].linksAwayFromOrigin) continue;
    	
    	// draw the node itself
        this.lessonNodeArray[i].draw(ctx, canvas);
    }

	// draw the lines
	for(var i=0; i<this.lessonNodeArray.length; i++){
		
		// only show lines from solved questions
		if (this.lessonNodeArray[i].question.currentState!=Question.SOLVE_STATE.SOLVED) continue;
		
		// get the pin position
        var oPos = this.lessonNodeArray[i].getNodePoint();
        
		// set line style
		ctx.strokeStyle = "rgba(0,0,105,0.2)";
		ctx.lineWidth = 1;
        
        // draw lines
        for (var j=0; j<this.lessonNodeArray[i].question.connections.length; j++) {
        	
        	// -1 becase node connection index values are 1-indexed but connections is 0-indexed
			if (this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1].question.currentState==Question.SOLVE_STATE.HIDDEN) continue;
        	
        	// go to the index in the array that corresponds to the connected node on this board and save its position
        	// connection index saved in the lessonNode's question
        	var connection = this.lessonNodeArray[this.lessonNodeArray[i].question.connections[j] - 1];
        	var cPos = connection.getNodePoint();
        	
        	// draw the line
        	ctx.beginPath();
        	// translate to start (pin)
        	ctx.moveTo(oPos.x, oPos.y);
        	ctx.lineTo(oPos.x + (cPos.x - oPos.x)*this.lessonNodeArray[i].linePercent, oPos.y + (cPos.y - oPos.y)*this.lessonNodeArray[i].linePercent);
        	ctx.closePath();
        	ctx.stroke();
        }
    }
    
    ctx.restore();
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
	console.log("window closed");
	// if it is file type
	if (this.lastQuestion.questionType == 4) {
		// add a file to the file system
		var name = this.lastQuestion.fileName;
		var blob = this.lastQuestion.blob;
		var lastQuestionNum = this.lastQuestionNum;
		return { 
			blob: blob, 
			num: lastQuestionNum, 
			ext: name.substring( name.lastIndexOf("."), name.length)
		}
	}
}


module.exports = board;    

},{"./constants.js":5,"./drawlib.js":7,"./point.js":13,"./question.js":14,"./utilities.js":17}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
"use strict";
var Question = require("./question.js");

// Creates a category with the given name and from the given xml
function Category(name, xml, resources, url, windowDiv, windows){
	
	// Save the name
	this.name = name;
	
	// Load all the questions
	var questionElements = xml.getElementsByTagName("button");
	this.questions = [];
	// create questions
	for (var i=0; i<questionElements.length; i++) 
	{
		// create a question object
		this.questions[i] = new Question(questionElements[i], resources, url, windowDiv, windows);
	}
    
}

module.exports = Category;
},{"./question.js":14}],5:[function(require,module,exports){
"use strict";
var Point = require('./point.js');

//Module export
var m = module.exports;

// The size of the board in game units at 100% zoom
m.boardSize = new Point(1920, 1080);

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
},{"./point.js":13}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
"use strict";
var Category = require("./category.js");
var Resource = require("./resources.js");
var Utilities = require('./utilities.js');
var Constants = require('./constants.js');
var Parser = require('./iparDataParser.js');
var QuestionWindows = require('./questionWindows.js');
window.resolveLocalFileSystemURL  = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;

// Module export
var m = module.exports;

var baseURL = localStorage['caseFiles'];

var fileSystem = null;

var baseDir = null;

var addFileData = { filename: "", blob: "", callback: undefined};

// stores an array of all the files for rezipping
var allEntries;

// ********************** LOADING ************************

// load the file entry and parse the xml
m.loadCase = function(url, windowDiv, callback) {
    
    this.categories = [];
    this.questions = [];
    
    // Load the question windows first
    var windows = new QuestionWindows(function(){
    	// get XML
        window.resolveLocalFileSystemURL(url+'active/caseFile.ipardata', function(fileEntry) {
    		fileEntry.file(function(file) {
    			var reader = new FileReader();
    			
    			// hook up callback
    			reader.onloadend = function() {

    				// Get the raw data
    				var rawData = Utilities.getXml(this.result);
    				var categories = Parser.getCategoriesAndQuestions(rawData, url, windowDiv, windows);
    				// load the most recent version
    				var autosave = localStorage.getItem("autosave");
    				if (autosave) {
    					loadAutosave(autosave, categories, callback);
    				} else {
    					loadSaveProgress(categories, url, windowDiv, callback);
    				}
    				// prepare for saving by reading the files right when the program starts
    			    window.webkitRequestFileSystem(window.TEMPORARY, 1024*1024, recursivelyReadFiles, errorHandler);
    			};
    			reader.readAsText(file);
    		   
    		}, function(e){
    			console.log("Error: "+e.message);
    		});
    	});
    });
}

// load the save from the filesytem sandbox
function loadSaveProgress(categories, url, windowDiv, callback) {
    var questions = [];
    
	// get XML
    window.resolveLocalFileSystemURL(url+'active/saveFile.ipardata', function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();
			
			// hook up callback
			reader.onloadend = function() {

				// Get the save data
				var saveData = Utilities.getXml(this.result);
				// parse the save data
				Parser.assignQuestionStates(categories, saveData.getElementsByTagName("question"));
				// progress
				var stage = saveData.getElementsByTagName("case")[0].getAttribute("caseStatus");
				// callback with results
				callback(categories, stage); // maybe stage + 1 would be better because they are not zero indexed?
			   
			};
			reader.readAsText(file);
		   
		}, function(e){
			console.log("Error: "+e.message);
		});
	});
}

// load the save from the localStorage
function loadAutosave(autosave, categories, callback) {
	// Get the save data
	var saveData = Utilities.getXml(autosave);
	Parser.assignQuestionStates(categories, saveData.getElementsByTagName("question"));
	var stage = saveData.getElementsByTagName("case")[0].getAttribute("caseStatus");
	callback(categories, stage);
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
m.prepareZip = function(myBoards) {
	//var content = zip.generate();
	
	console.log("prepare zip");
	
	// code from JSZip site
	var blobLink = document.getElementById('blob');
	if (JSZip.support.blob) {
		console.log("supports blob");
		
		// link download to click
		blobLink.onclick = function() { saveIPAR(myBoards); };
  	}
}

// create IPAR file and download it
function saveIPAR(boards) {

	// error handling
	if (!allEntries) {
		alert("CANNOT SAVE: file data did not load"); return; 
	}
	// 1)
	// get the files that the user uploaded 
	var uploadedFiles = getAllSubmissions(boards);
	
	// 2)
	// create the case file like the one we loaded
	var caseFile = Parser.recreateCaseFile(boards);
	
	// 3) (ASYNC)
	// recreate the IPAR file using FileSystem, then download it
	getAllContents(caseFile, uploadedFiles);
	
}

function createZip(data, blobs, names, subs) {
	console.log("create zip run");
	
	var zip = new JSZip();

	// zip each file one by one
	blobs.forEach(function(blob,i) {
		zip.file(names[i],blob);
	});
	// zip submitted files
	subs.names.forEach(function(subName,i) {
		zip.file("case\\active\\submitted\\"+subName,subs.blobs[i]);
	});
	
	// backslashes per zip file protocol
	zip.file("case\\active\\saveFile.ipardata",data);
	// download the file
	download(zip);
}

function getAllSubmissions(boards) {
	var names = [];
	var blobs = [];
	
	// loop through questions
	for (var i=0; i<boards.length; i++) {
		for (var j=0; j<boards[i].lessonNodeArray.length; j++) {
			// shorthand
			var q = boards[i].lessonNodeArray[j].question;
			
			// add blobs to an array
			if (q.fileName && q.blob) {
				names.push(q.fileName);
				blobs.push(q.blob);
			}
		}
	}
	// return submissions object 
	return {
		"names" : names,
		"blobs" : blobs
	}
}

function getAllContents(data, subs) {
	var blobs = [];
	var names = [];
	var fileCount = 0;
	allEntries.forEach(function(fileEntry) {
		//zip.file(fileEntry.name,fileEntry
		if (fileEntry.isFile) {
			fileCount++
			// Get a File object representing the file,
			// then use FileReader to read its contents.
			//console.log(fileEntry);
			fileEntry.file(function(file) {
			   var reader = new FileReader();

			   reader.onloadend = function(e) {
			   
			   		var arrayBufferView = new Uint8Array( this.result ); // fingers crossed
			   		//console.log(arrayBufferView);
			   		
					//console.log(this.result);
				 	blobs.push(arrayBufferView);
				 	names.push(fileEntry.fullPath.replace(new RegExp('\/','g'),'\\').substring(1));
				 	if (blobs.length == fileCount) {
				 		createZip(data,blobs,names,subs);
				 	}
			   };

			   reader.readAsArrayBuffer(file);
			}, errorHandler);
		}
	});
}

function download(zip) {
	console.log("downloading");
	console.log(zip.generateAsync);
	
	var content = zip.generateAsync({type:"blob"}).then(
	function (blob) {
		//console.log(blob);
		//saveAs(blob, "hello.zip");
		//var url = window.URL.createObjectURL(blob);
		//window.location.assign(url);
		
		
		
		var a = document.createElement("a");
		
		a.innerHTML = localStorage['caseName'];
		
		a.setAttribute("class","downloadLink");
		
		a.href = window.URL.createObjectURL(blob);
		
		a.download = localStorage["caseName"];
		
		
		var showLink = false;
		// if you show the link, the user can download to a location of their choice
		if (showLink) {
			document.body.appendChild(a);
		// if you hide the link, it will simply go to their downloads folder
		} else {
			a.click(); //download immediately
		}
		
		

	}, function (err) {
		blobLink.innerHTML += " " + err;
	});
}


/************* READ FILES **************/

function errorHandler() {
	//do nothing
	console.log("yo we got errors");
}

// helper function for recursivelyReadFiles
function toArray(list) {
	return Array.prototype.slice.call(list || [], 0);
}

function recursivelyReadFiles(fs) {
	console.log("recursivelyReadFiles called");
	
	fileSystem = fs;

  var dirReader = fs.root.createReader();
  var entries = [];

  // Call the reader.readEntries() until no more results are returned.
  var readEntries = function(reader) {
     reader.readEntries (function(results) {
      if (!results.length) {
        // all entries found
        saveEntries(entries);
      } else {
      	var resultsArray = toArray(results)
        entries = entries.concat(resultsArray);
        for (var i=0; i<resultsArray.length; i++) {
        	//console.log("is directory ? " + resultsArray[i].isDirectory);
        	if (resultsArray[i].isDirectory) {
        		//directoryString += resultsArray[i].
        		var recursiveReader = resultsArray[i].createReader();
        		readEntries(recursiveReader);
        	} else {
        		
        	}
        }
        //nameStructure = {};
        readEntries(reader);
      }
    }, errorHandler);
  };
  
  

  readEntries(dirReader); // Start reading dirs.

}

function saveEntries(entries, callback) {
	allEntries = entries;
	//console.log(allEntries);
	if (callback) callback(allEntries);
}

/***************** CACHING *******************/

m.addFileToSystem = function(filename, data, callback){

	console.log("fs: " + fileSystem.root);
	
	if (!fileSystem) {
		retrieveFileSystem(function() { m.addFileToSystem(filename, data, callback); });
		return;
	}
	
	// Make sure the dir exists first
	var dirs = filename.substr(0, filename.lastIndexOf('\\')).split('\\');
	var curDir = fileSystem.root;
	for(var i=0;i<dirs.length;i++) {
		console.log(curDir.getDirectory(dirs[i])); 
		curDir = curDir.getDirectory(dirs[i], {create: true, exclusive: false});
	}
	
	// Make sure not working with an empty directory
	if(filename.endsWith('\\'))
		return;

	
	// Create the file
	var file = curDir.getFile(filename.substr(filename.lastIndexOf('\\')+1), {create: true});
	//file.createWriter().write(new Blob([data], {type: getMimeType(filename)}));
	// data is a blob in this case
	file.createWriter().write(data);
	
	// Return the url to the file
	if (callback) callback( file.toURL() );
}

// filename must be the full desired path for this to work
m.addNewFileToSystem = function(filename, data, callback){
	// if the path uses backslashes
	if (filename.indexOf("\\") > -1) 
		filename = Utilities.replaceAll(filename,"\\","/");
	// if there is no path
	if (filename.indexOf("/") < 0) filename = "case/active/submitted/"+filename;
	
	// store the data in an module-scope object so that all of the callback functions can make use of it
	addFileData.filename = filename;
	addFileData.data = data;
	addFileData.callback = callback;
	
	// debug
	console.log("addFileToSystem("+filename+", "+data+", "+callback+")");
	//retrieveBaseDir(function(dir) { addFileToDir(filename, dir, callback); } );
	
	// find the directoryEntry that will contain the file and call addFileToDir with the result
	retrieveBottomDir(addFileToDir);
}

// gets the directory of interest
function retrieveBottomDir(callback) {
	//window.webkitRequestFileSystem(window.TEMPORARY, 1024*1024, function(fs) { setFileSystem(fs, callback); }, errorHandler);
	console.log("base URL: " + baseURL);
	var name = addFileData.filename;
	// extract the path of the directory to put the file in from the file name
	var extension = name.substring(0,name.lastIndexOf("/"));
	// "case" is already part of the base url
	if (extension.indexOf("case/") > -1) {
		extension = extension.substring(5);
	}
	
	// debug
	console.log("ext: " + extension);
	
	// get the directory entry from the filesystem callback
	window.resolveLocalFileSystemURL(baseURL+extension, callback);
}

// add the file
function addFileToDir(dir) {

	// shorthand
	var filename = addFileData.filename;
	
	// debug
	console.log("addFileToDir("+filename+", "+dir+")");
	
	// relic from legacy code
	var curDir = dir;
	
	// debug
	console.log("curdir: "  + curDir.name);
	
	// Make sure not working with an empty directory
	if(filename.endsWith('\\'))
		return;

	// Create the file
	var file = curDir.getFile(filename.substr(filename.lastIndexOf('/')+1), {create: true}, createWriter);
	
	
	//var file = curDir.getFile(filename, {create: true}, createWriter); // function(fileEntry) { writeFile(fileEntry, callback); });
	/*console.log(file);
	//file.createWriter().write(new Blob([data], {type: getMimeType(filename)}));
	// data is a blob in this case
	file.createWriter().write(data);
	
	// Return the url to the file
	if (callback) callback( file.toURL() );

	callback( file.toURL() );*/
}

function createWriter(file) {
	console.log(file);
	file.createWriter(writeFile);
}

function writeFile(fileWriter) {
	console.log(fileWriter);
	fileWriter.onwriteend = function (e) { console.log("write completed"); }
	fileWriter.onerror = function (e) { console.log("writer error: " + e.toString()); }
	//fileWriter.write(new Blob([addFileData.data], {type: getMimeType(addFileData.filename)}));
	// data is a blob in this case
	fileWriter.write(addFileData.data);
	
	// Return the url to the file
	if (addFileData.callback) callback( file.toURL() );
}

function setBase(entry, callback) {
	baseDir = entry;
	callback();
}

function loadFileSystem(type, size, curCase){
	// Load the file system
	fileSystem = self.requestFileSystemSync(type, size);
	
	// Write the files
	var urls = {};
	for (var file in curCase.files) {
		if (!curCase.files.hasOwnProperty(file)) continue;
		urls[file] = addFileToSystem(file, curCase.file(file).asArrayBuffer(), fileSystem);
	}
	
	// return the urls to the files
	return JSON.stringify(urls);
}

function getMimeType(file){
	switch(file.substr(file.lastIndexOf('.')+1)){
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


/*function selectSaveLocation (data) {

	console.log("selectSaveLocation");

	// Make sure the need APIs are supported
	if(!window.File || !window.FileReader || !window.FileList || !window.Blob || !window.ArrayBuffer || !window.Worker){
		alert('The File APIs need to load files are not supported in this browser!');
		//document.getElementById("load-button").disabled = true;
	}
	else{
		console.log ("selectingSaveLocation");
	
		// Get the load button and input
		var loadInput = document.getElementById('load-input');

		// load input is hidden, so click it
		loadInput.click();
		
		// When load input file is chosen, load the file
		loadInput.addEventListener('change', function(event){
			
			// Make sure a ipar file was choosen
			if(!loadInput.value.endsWith("ipar")){
				alert("You didn't choose an ipar file! you can only load ipar files!");
				return;
			}
			
			// Save the zip file's name to local storage 
			// NOTE: this will overwrite the old name, 
			//    so if the user chooses a different file, this could lead to errors
			localStorage['caseName'] = loadInput.files[0].name;
			
			// Read the zip
			JSZip.loadAsync(loadInput.files[0])
			.then(function(zip) {
				// backslashes per zip file protocol
				zip.file("case\\active\\saveFile.ipardata",data);
				// download the file
				download(zip);
			});

			//reader.readAsArrayBuffer(event.target.files[0]);
			
		}, false);
	}
}*/
},{"./category.js":4,"./constants.js":5,"./iparDataParser.js":10,"./questionWindows.js":15,"./resources.js":16,"./utilities.js":17}],9:[function(require,module,exports){
"use strict";
var Board = require('./board.js');
var Point = require('./point.js');
var LessonNode = require('./lessonNode.js');
var Constants = require('./constants.js');
var DrawLib = require('./drawlib.js');
var DataParser = require('./iparDataParser.js');
var MouseState = require('./mouseState.js');
var FileManager = require('./fileManager.js');

//mouse management
var mouseState;
var previousMouseState;
var draggingDisabled;
var mouseTarget;
var mouseSustainedDown;

//phase handling
var phaseObject;

function game(url, canvas, windowDiv){
	var game = this;
	this.active = false;
	this.mouseState = new MouseState(canvas);
	FileManager.loadCase(url, windowDiv, function(categories, stage){
		game.categories = categories;
		game.createLessonNodes();
	});
}

var p = game.prototype;

p.createLessonNodes = function(){
	this.boardArray = [];
	var bottomBar = document.getElementById("bottomBar");
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
		this.boardArray.push(new Board(new Point(canvas.width/(2*this.scale),canvas.height/(2*this.scale)), this.lessonNodes));
		var button = document.createElement("BUTTON");
		button.innerHTML = this.categories[i].name;
		var game = this;
		button.onclick = (function(i){ 
			return function() {
				if(game.active){
					game.activeBoardIndex = i;
					if(game.onChangeBoard)
						game.onChangeBoard();
					game.updateNode();
				}
		}})(i);
		if(!this.boardArray[this.boardArray.length-1].finished)
			button.disabled = true;
		bottomBar.appendChild(button);
		this.boardArray[this.boardArray.length-1].button = button;
		var game = this;
		this.boardArray[this.boardArray.length-1].updateNode = function(){game.updateNode();};
	}
	this.activeBoardIndex = 0;
	this.active = true;
	this.boardArray[this.activeBoardIndex].button.disabled = false;
	if(game.onChangeBoard)
		game.onChangeBoard();
	this.updateNode();
	
	// ready to save
	FileManager.prepareZip(this.boardArray);
}

p.updateZoom = function(newZoom){
	if(this.active)
		this.boardArray[this.activeBoardIndex].zoom = newZoom;
}

p.getZoom = function(){
	return this.boardArray[this.activeBoardIndex].zoom;
}

p.update = function(ctx, canvas, dt){
	
	if(this.active){
		
	    // Update the mouse state
		this.mouseState.update(dt, this.scale*this.boardArray[this.activeBoardIndex].zoom);
		
		if (this.mouseState.mouseClicked) {
			localStorage.setItem("autosave",DataParser.createXMLSaveFile(this.boardArray, false));
			//console.log(localStorage.getItem("autosave"));
		}
		
	    // Update the current board (give it the mouse only if not zooming)
	    this.boardArray[this.activeBoardIndex].act((this.zoomin || this.zoomout ? null : this.mouseState), dt);
	    
	    // Check if new board available
	    if(this.activeBoardIndex < this.boardArray.length-1 &&
	    		this.boardArray[this.activeBoardIndex+1].button.disabled && 
	    		this.boardArray[this.activeBoardIndex].finished)
	    	this.boardArray[this.activeBoardIndex+1].button.disabled = false;
		

		// If the board is done zoom out to center
		if(this.zoomout){
			
			// Get the current board
			var board = this.boardArray[this.activeBoardIndex];
			
			// Zoom out and move towards center
			if(this.getZoom()>Constants.startZoom)
				board.zoom -= dt*Constants.zoomSpeed;
			else if(this.getZoom()<Constants.startZoom)
				board.zoom = Constants.startZoom;
			board.moveTowards(new Point(Constants.boardSize.x/2, Constants.boardSize.y/2), dt, Constants.zoomMoveSpeed);
			
			// Call the change method
			if(this.onChangeBoard)
				this.onChangeBoard();
			
			// If fully zoomed out and in center stop
			if(this.getZoom()==Constants.startZoom && board.boardOffset.x==Constants.boardSize.x/2 && board.boardOffset.y==Constants.boardSize.y/2){				
				this.zoomout = false;
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
				
				// Call the change method
				if(this.onChangeBoard)
					this.onChangeBoard();
				
				// If reached the node and zoomed in stop and get rid of the target
				if(this.getZoom()==Constants.endZoom && board.boardOffset.x==this.targetNode.position.x && board.boardOffset.y==this.targetNode.position.y){
					this.zoomin = false;
					this.targetNode = null;
				}
			}
		}
	    
	    // draw stuff no matter what
	    this.draw(ctx, canvas);
	}
}

p.draw = function(ctx, canvas){
	
	// Draw the background
	DrawLib.rect(ctx, 0, 0, canvas.width, canvas.height, "#15718F");
    
	// Scale the game
	ctx.save();
	ctx.translate(canvas.width/2, canvas.height/2);
	ctx.scale(this.scale, this.scale);
	ctx.translate(-canvas.width/2, -canvas.height/2);
	//ctx.translate(canvas.width*this.scale-canvas.width, canvas.width*this.scale-canvas.width);
	
    // Draw the current board
    this.boardArray[this.activeBoardIndex].draw(ctx, canvas);

    ctx.restore();
}

p.updateNode = function(){
	this.zoomin = true;
}

p.windowClosed = function() {
	var fileToStore = this.boardArray[this.activeBoardIndex].windowClosed();
	if (fileToStore) {
		FileManager.addNewFileToSystem(		  // need to store number of files
			""+this.activeBoardIndex+"-"+fileToStore.num+"-"+"0"+fileToStore.ext,
			fileToStore.blob);
	}
}

module.exports = game;

},{"./board.js":2,"./constants.js":5,"./drawlib.js":7,"./fileManager.js":8,"./iparDataParser.js":10,"./lessonNode.js":11,"./mouseState.js":12,"./point.js":13}],10:[function(require,module,exports){
"use strict";
var Category = require("./category.js");
var Resource = require("./resources.js");
var Utilities = require('./utilities.js');
var Constants = require('./constants.js');
var Question = require('./question.js');
var QuestionWindows = require('./questionWindows.js');
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
}
// conversion
var reverseStateConverter = ["hidden", "unsolved", "correct"];

// Module export
var m = module.exports;
				
// ********************** LOADING ************************

// set the question states
m.assignQuestionStates = function(categories, questionElems) {
	console.log("qelems: " + questionElems.length);
	var tally = 0; // track total index in nested loop
	
	// all questions
	for (var i=0; i<categories.length; i++) {
		for (var j=0; j<categories[i].questions.length; j++, tally++) {
		
			// store question  for easy reference
			var q = categories[i].questions[j];
			
			// store tag for easy reference
			var qElem = questionElems[tally];
			
			// If position is less than zero don't load the question
			if(parseInt(qElem.getAttribute("positionPercentX"))<0 || 
					parseInt(qElem.getAttribute("positionPercentY"))<0)
				continue;
			
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
m.getCategoriesAndQuestions = function(rawData, url, windowDiv, windows) {
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
			categories[i] = new Category(categoryNames[i].innerHTML, categoryElements[i], resources, url, windowDiv, windows);
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
m.createXMLSaveFile = function(boards, includeNewline) {
	// newline
	var nl;
	includeNewline ? nl = "\n" : nl = "";
	// header
	var output = '<?xml version="1.0" encoding="utf-8"?>' + nl;
	// case data
	output += '<case categoryIndex="3" caseStatus="1" profileFirst="j" profileLast="j" profileMail="j">' + nl;
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
			output += 'justification="' + justification + '" ';
			// animated
			output += 'animated="' + (q.currentState == 2) + '" '; // might have to fix this later
			// linesTranced
			output += 'linesTraced="0" '; // might have to fix this too
			// revealBuffer
			output += 'revealBuffer="0" '; // and this
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

},{"./category.js":4,"./constants.js":5,"./question.js":14,"./questionWindows.js":15,"./resources.js":16,"./utilities.js":17}],11:[function(require,module,exports){
"use strict";
var DrawLib = require('./drawLib.js');
var Question = require("./question.js");
var Constants = require("./constants.js");
var Point = require('./point.js');
var Question = require('./question.js');

var CHECK_IMAGE = "../img/iconPostItCheck.png";

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
    this.currentState = this.question.currentState;
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
},{"./constants.js":5,"./drawLib.js":6,"./point.js":13,"./question.js":14}],12:[function(require,module,exports){
"use strict";
var Point = require('./point.js');

// private variables
var mousePosition, relativeMousePosition;
var mouseDownTimer, maxClickDuration;
var mouseWheelVal;
var prevTime;
var scaling, touchZoom, startTouchZoom;

function mouseState(canvas){
	mousePosition = new Point(0,0);
    relativeMousePosition = new Point(0,0);
    this.virtualPosition = new Point(0,0);
    
    //event listeners for mouse interactions with the canvas
    var mouseState = this;
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
    this.mouseDown = false;
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
    this.mouseIn = false;
    mouseDownTimer = 0;
    this.zoomDiff = 0;
    touchZoom = 0;
    this.mouseClicked = false;
    maxClickDuration = 200;
    canvas.addEventListener("mouseover", function(e){
    	mouseState.mouseIn = true;
    });
    canvas.addEventListener("mouseout", function(e){
    	mouseState.mouseIn = false;
    	mouseState.mouseDown = false;
    });
	
}

function updatePosition(e){
	var boundRect = canvas.getBoundingClientRect();
    mousePosition = new Point(e.clientX - boundRect.left, e.clientY - boundRect.top);
    relativeMousePosition = new Point(mousePosition.x - (canvas.offsetWidth/2.0), mousePosition.y - (canvas.offsetHeight/2.0));
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
},{"./point.js":13}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
"use strict";
var Utilities = require('./utilities.js');
var Constants = require('./constants.js');

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
function Question(xml, resources, url, windowDiv, windows){
	
	// Set the current state to default at hidden and store the window div
    this.currentState = SOLVE_STATE.HIDDEN;
    this.windowDiv = windowDiv;
    
    // Get and save the given index, correct answer, position, reveal threshold, image link, feedback, and connections
    this.correct = parseInt(xml.getAttribute("correctAnswer"));
    this.positionPercentX = Utilities.map(parseInt(xml.getAttribute("xPositionPercent")), 0, 100, 0, Constants.boardSize.x);
    this.positionPercentY = Utilities.map(parseInt(xml.getAttribute("yPositionPercent")), 0, 100, 0, Constants.boardSize.y);
    this.revealThreshold = parseInt(xml.getAttribute("revealThreshold"));
    this.imageLink = url+xml.getAttribute("imageLink");
    this.feedbacks = xml.getElementsByTagName("feedback");
    this.blob = null; // no upload by default
    this.fileName = "";
    var connectionElements = xml.getElementsByTagName("connections");
    this.connections = [];
    for(var i=0;i<connectionElements.length;i++)
    	this.connections[i] = parseInt(connectionElements[i].innerHTML);
    
    // Create the windows for this question based on the question type
    this.questionType = parseInt(xml.getAttribute("questionType"));
    this.justification = this.questionType==1 || this.questionType==3;
	if(this.questionType!=5){
		this.createTaskWindow(xml, windows.taskWindow);
		this.createResourceWindow(xml, resources, windows.resourceWindow, windows.resource);
	}
	switch(this.questionType){
		case 5:
			this.createMessageWindow(xml, windows.messageWindow);
			break;
		case 4:
			this.createFileWindow(windows.fileWindow);
			break;
		case 3:
		case 2:
		case 1:
			this.createAnswerWindow(xml, windows.answerWindow);
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
		if(this.fileInput.files.length>0)
			this.feedback.innerHTML = 'Submitted Files:<br/>';
		else
			this.feedback.innerHTML = '';
		for(var i=0;i<this.fileInput.files.length;i++)
			this.feedback.innerHTML += '<span class="feedbackI">'+this.fileInput.files[i].name+'</span><br/>';
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
	exitButton.src = "../img/iconClose.png";
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

p.createTaskWindow = function(xml, window){
	this.proceedElement = document.getElementById("proceedContainer");
	
	// Create the task window 
	this.task = document.createElement("DIV");
    this.task.className = "window";
    this.task.style.top = "10vh";
    this.task.style.left = "5vw";
    this.task.innerHTML = window;
    this.task.innerHTML = this.task.innerHTML.replace("%title%", xml.getElementsByTagName("questionName")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%instructions%", xml.getElementsByTagName("instructions")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.task.innerHTML = this.task.innerHTML.replace("%question%", xml.getElementsByTagName("questionText")[0].innerHTML.replace(/\n/g, '<br/>'));
    this.feedback = this.task.getElementsByClassName("feedback")[0];
}

p.createResourceWindow = function(xml, resourceFiles, window, resourceElement){
	
	// Create the resource window 
	this.resource = document.createElement("DIV");
	this.resource.className = "window";
	this.resource.style.top = "55vh";
	this.resource.style.left = "5vw";
	this.resource.innerHTML = window;
	
	// Get the template for individual resouces if any
	var resources = xml.getElementsByTagName("resourceIndex");
    if(resources.length > 0){
    	
    	// Get the html for each resource and then add the result to the window
    	var resourceHTML = '';
	    for(var i=0;i<resources.length;i++){
    		var curResource = resourceElement.replace("%icon%", resourceFiles[parseInt(resources[i].innerHTML)].icon);
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

p.createAnswerWindow = function(xml, window){
	
	// Create the answer window 
	this.answer = document.createElement("DIV");
    this.answer.className = "window";
    this.answer.style.top = "10vh";
    this.answer.style.left = "50vw";
    this.answer.innerHTML = window;
    
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

p.createFileWindow = function(window){
	
	// Create the file window 
	this.answer = document.createElement("DIV");
    this.answer.className = "window";
    this.answer.style.top = "10vh";
    this.answer.style.left = "50vw";
    this.answer.innerHTML = window;
    this.fileInput = this.answer.getElementsByTagName("input")[0];
    var question = this;
    this.fileInput.addEventListener("change", function(event){
    		// Make sure a valid file was chosen (currently not implemented)
			if(false){
				alert("You didn't choose an ipar file! you can only load ipar files!");
				return;
			}
			
			/*// Create a reader and read the zip
			var reader = new FileReader();
			reader.onload = function(event){
				console.log(event);
			};
			// read the first file
			reader.readAsArrayBuffer(event.target.files[0]);*/
			
			question.fileName = event.target.files[0].name;
			question.blob = event.target.files[0].slice();

			
	    question.correctAnswer();
    });
    
}

p.createMessageWindow = function(xml, window){
	
	// Create the file window 
	this.message = document.createElement("DIV");
    this.message.className = "window";
    this.message.style.top = "10vh";
    this.message.style.left = "40vw";
    this.message.innerHTML = window;
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
},{"./constants.js":5,"./utilities.js":17}],15:[function(require,module,exports){


function QuestionWindows(callback){
  this.loadWindows(callback);
}

var p = QuestionWindows.prototype;

p.loadWindows = function(callback){

  var counter = 0;
  var cb = function(){
	  if(++counter>=6 && callback)
		  callback();
  };
  this.loadTaskWindow(cb);
  this.loadResourceWindow(cb);
  this.loadAnswerWindow(cb);
  this.loadFileWindow(cb);
  this.loadMessageWindow(cb);
  this.loadResource(cb);
  
}

p.loadTaskWindow = function(callback){
	// Get the template for task windows
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the task window 
	    	windows.taskWindow = request.responseText;
	    	if(callback)
	    	  callback();
	    }
	}
	request.open("GET", "taskWindow.html", true);
	request.send();
}


p.loadResourceWindow = function(callback){
	
	// Get the template for resource windows
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the resource window 
	    	windows.resourceWindow = request.responseText;
	        if(callback)
	        	callback();
	    }
	};
	request.open("GET", "resourceWindow.html", true);
	request.send();
}

p.loadResource = function(callback){
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Get the html for each resource and then add the result to the window
	    	windows.resource = request.responseText;
	        if(callback)
	        	callback();
	    }
	}
	request.open("GET", "resource.html", true);
	request.send();
}

p.loadAnswerWindow = function(callback){
	
	// Get the template for answer windows
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the answer window 
	    	windows.answerWindow = request.responseText;
	        if(callback)
	        	callback();
	    }
	}
	request.open("GET", "answerWindow.html", true);
	request.send();
}

p.loadFileWindow = function(callback){
	
	// Get the template for file windows
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the file window 
	    	windows.fileWindow = request.responseText;
	    	if(callback)
	    		callback();
	        
	    }
	}
	request.open("GET", "fileWindow.html", true);
	request.send();
}

p.loadMessageWindow = function(callback){
	
	// Get the template for message windows
	var windows = this;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the message window 
	    	windows.messageWindow = request.responseText;
		    if(callback)
		    	callback();

	    }
	}
	request.open("GET", "messageWindow.html", true);
	request.send();
}

module.exports = QuestionWindows;
},{}],16:[function(require,module,exports){
"use strict";
var Question = require("./question.js");

// Creates a category with the given name and from the given xml
function Resource(xml, url){
	
	// First get the icon
	  var type = parseInt(xml.getAttribute("type"));
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
	  if(type>0)
	    this.link = xml.getAttribute("link");
	  else
	    this.link = url+'assets/files/'+xml.getAttribute("link").replace(/ /g, '%20');
    
}

module.exports = Resource;
},{"./question.js":14}],17:[function(require,module,exports){
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

m.replaceAll = function (str, target, replacement) {
	while (str.indexOf(target) < 0) {
		str = str.replace(target,replacement);
	}
	return str;
}
},{"./point.js":13}]},{},[1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJib2FyZC9qcy9tYWluLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9ib2FyZC5qcyIsImJvYXJkL2pzL21vZHVsZXMvYnV0dG9uLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9jYXRlZ29yeS5qcyIsImJvYXJkL2pzL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9kcmF3TGliLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9maWxlTWFuYWdlci5qcyIsImJvYXJkL2pzL21vZHVsZXMvZ2FtZS5qcyIsImJvYXJkL2pzL21vZHVsZXMvaXBhckRhdGFQYXJzZXIuanMiLCJib2FyZC9qcy9tb2R1bGVzL2xlc3Nvbk5vZGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL21vdXNlU3RhdGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL3BvaW50LmpzIiwiYm9hcmQvanMvbW9kdWxlcy9xdWVzdGlvbi5qcyIsImJvYXJkL2pzL21vZHVsZXMvcXVlc3Rpb25XaW5kb3dzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9yZXNvdXJjZXMuanMiLCJib2FyZC9qcy9tb2R1bGVzL3V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxTY3JlZW4gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxTY3JlZW4gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbjtcclxuXHJcbi8vaW1wb3J0c1xyXG52YXIgR2FtZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9nYW1lLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wb2ludC5qcycpO1xyXG52YXIgTW91c2VTdGF0ZSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tb3VzZVN0YXRlLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL21vZHVsZXMvY29uc3RhbnRzLmpzJyk7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL21vZHVsZXMvdXRpbGl0aWVzLmpzJyk7XHJcblxyXG4vL2dhbWUgb2JqZWN0c1xyXG52YXIgZ2FtZTtcclxudmFyIGNhbnZhcztcclxudmFyIGN0eDtcclxuXHJcbi8vIHdpbmRvdyBkaXYsIGZpbG0sIHpvb20gYW5kIGlmIHBhdXNlZFxyXG52YXIgd2luZG93RGl2O1xyXG52YXIgd2luZG93RmlsbTtcclxudmFyIHByb2NlZWRDb250YWluZXI7XHJcbnZhciBwcm9jZWVkTG9uZztcclxudmFyIHByb2NlZWRSb3VuZDtcclxudmFyIHBhdXNlZFRpbWUgPSAwO1xyXG52YXIgem9vbVNsaWRlcjtcclxudmFyIHBpbmNoU3RhcnQgPSAwO1xyXG5cclxuLy9wZXJzaXN0ZW50IHV0aWxpdGllc1xyXG52YXIgcHJldlRpbWU7IC8vIGRhdGUgaW4gbWlsbGlzZWNvbmRzXHJcbnZhciBkdDsgLy8gZGVsdGEgdGltZSBpbiBtaWxsaXNlY29uZHNcclxuXHJcbi8vZmlyZXMgd2hlbiB0aGUgd2luZG93IGxvYWRzXHJcbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbihlKXtcclxuXHRcclxuICAgIGluaXRpYWxpemVWYXJpYWJsZXMoKTtcclxuICAgIGxvb3AoKTtcclxuXHRcclxufVxyXG5cclxuLy9pbml0aWFsaXphdGlvbiwgbW91c2UgZXZlbnRzLCBhbmQgZ2FtZSBpbnN0YW50aWF0aW9uXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVWYXJpYWJsZXMoKXtcclxuXHRcclxuXHR3aW5kb3dEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luZG93Jyk7XHJcbiAgICBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbiAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHByb2NlZWRDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZENvbnRhaW5lcicpO1xyXG4gICAgcHJvY2VlZExvbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZEJ0bkxvbmcnKTtcclxuICAgIHByb2NlZWRSb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQnRuUm91bmQnKTtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5vZmZzZXRXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMub2Zmc2V0SGVpZ2h0O1xyXG5cclxuICAgIC8vIFNldHVwIHRoZSB3aW5kb3cgZmlsbVxyXG5cdHdpbmRvd0ZpbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luZG93RmxpbScpO1xyXG5cdHdpbmRvd0ZpbG0ub25jbGljayA9IGZ1bmN0aW9uKCkgeyB3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7IH07XHJcblx0XHJcblx0Ly8gU2V0dXAgZHRcclxuICAgIHByZXZUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gMDtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBnYW1lXHJcbiAgICBnYW1lID0gbmV3IEdhbWUobG9jYWxTdG9yYWdlWydjYXNlRmlsZXMnXSwgY2FudmFzLCB3aW5kb3dEaXYpO1xyXG4gICAgXHJcblx0Ly8gU2V0dXAgdGhlIHpvb20gYnV0dG9ucy9zbGlkZXIgYW5kIHNjYWxlIG9mIHRoZSBnYW1lXHJcbiAgICB6b29tU2xpZGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tc2xpZGVyJyk7XHJcblx0em9vbVNsaWRlci5vbmlucHV0ID0gZnVuY3Rpb24oKXtcclxuXHRcdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdH07XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbS1pbicpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcbiAgICB9O1xyXG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tLW91dCcpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgXHJcblx0XHR6b29tU2xpZGVyLnN0ZXBVcCgpOyBcclxuXHRcdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdH07XHJcblx0Z2FtZS5vbkNoYW5nZUJvYXJkID0gZnVuY3Rpb24oKSB7XHJcblx0XHR6b29tU2xpZGVyLnZhbHVlID0gLWdhbWUuZ2V0Wm9vbSgpO1xyXG5cdH07XHJcbiAgICBnYW1lLnNjYWxlID0gVXRpbGl0aWVzLmdldFNjYWxlKENvbnN0YW50cy5ib2FyZFNpemUsIG5ldyBQb2ludChjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpKTtcclxufVxyXG5cclxuLy9maXJlcyBvbmNlIHBlciBmcmFtZVxyXG5mdW5jdGlvbiBsb29wKCl7XHJcblx0Ly8gbG9vcFxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wLmJpbmQodGhpcykpO1xyXG4gICAgXHJcblx0Ly8gdXBkYXRlIGRlbHRhIHRpbWVcclxuICAgIGR0ID0gRGF0ZS5ub3coKSAtIHByZXZUaW1lO1xyXG4gICAgcHJldlRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICAvLyB1cGRhdGUgZ2FtZVxyXG4gICAgZ2FtZS51cGRhdGUoY3R4LCBjYW52YXMsIGR0KTtcclxuICAgIFxyXG4gICAgaWYoZ2FtZS5tb3VzZVN0YXRlLnpvb21EaWZmIT0wKXtcclxuICAgIFx0em9vbVNsaWRlci52YWx1ZSA9IHBpbmNoU3RhcnQgKyBnYW1lLm1vdXNlU3RhdGUuem9vbURpZmYgKiBDb25zdGFudHMucGluY2hTcGVlZDtcclxuICAgIFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICBcdHBpbmNoU3RhcnQgPSBOdW1iZXIoem9vbVNsaWRlci52YWx1ZSk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIHNob3VsZCBwYXVzZVxyXG4gICAgaWYoZ2FtZS5hY3RpdmUgJiYgd2luZG93RGl2LmlubmVySFRNTCE9JycgJiYgcGF1c2VkVGltZSsrPjMpe1xyXG4gICAgXHRnYW1lLmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgXHR3aW5kb3dGaWxtLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZihwYXVzZWRUaW1lIT0wICYmIHdpbmRvd0Rpdi5pbm5lckhUTUw9PScnKXtcclxuICAgIFx0d2luZG93Q2xvc2VkKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vbGlzdGVucyBmb3IgY2hhbmdlcyBpbiBzaXplIG9mIHdpbmRvdyBhbmQgYWRqdXN0cyB2YXJpYWJsZXMgYWNjb3JkaW5nbHlcclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMub2Zmc2V0V2lkdGg7XHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gY2FudmFzLm9mZnNldEhlaWdodDtcclxuICAgIFxyXG4gICAgLy8gR2V0IHRoZSBuZXcgc2NhbGVcclxuICAgIGdhbWUuc2NhbGUgPSBVdGlsaXRpZXMuZ2V0U2NhbGUoQ29uc3RhbnRzLmJvYXJkU2l6ZSwgbmV3IFBvaW50KGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCkpO1xyXG4gICAgXHJcbn0pO1xyXG5cclxuLy9saXN0ZW5zIGZvciBtb3VzZSB3aGVlbFxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgaWYoZXZlbnQuZGVsdGFZPDApXHJcbiAgICBcdHpvb21TbGlkZXIuc3RlcERvd24oKTtcclxuICAgIGVsc2VcclxuICAgIFx0em9vbVNsaWRlci5zdGVwVXAoKTtcclxuXHRnYW1lLnVwZGF0ZVpvb20oLXBhcnNlRmxvYXQoem9vbVNsaWRlci52YWx1ZSkpOyBcclxuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgcmV0dXJuIGZhbHNlOyBcclxufSwgZmFsc2UpO1xyXG5cclxuLy8gTGlzdGVuIGZvciB0b3VjaCBmb3IgZnVsbHNjcmVlblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcclxuXHRpZih3aW5kb3cubWF0Y2hNZWRpYShcIm9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA3NjBweClcIikpXHJcblx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxTY3JlZW4oKTtcclxuXHRcclxufSwgZmFsc2UpO1xyXG5cclxuLy8gQ2FsbGVkIHdoZW4gdGhlIHF1ZXN0aW9uIHdpbmRvdyBjbG9zZXNcclxuZnVuY3Rpb24gd2luZG93Q2xvc2VkKCl7XHJcblx0XHJcblx0Ly8gVW5wYXVzZSB0aGUgZ2FtZSBhbmQgZnVsbHkgY2xvc2UgdGhlIHdpbmRvd1xyXG5cdHBhdXNlZFRpbWUgPSAwO1xyXG5cdGdhbWUuYWN0aXZlID0gdHJ1ZTtcclxuXHR3aW5kb3dGaWxtLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0cHJvY2VlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHJcblx0Z2FtZS53aW5kb3dDbG9zZWQoKTtcclxuXHRcclxufSIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbnN0YW50cy5qc1wiKTtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKFwiLi9kcmF3bGliLmpzXCIpO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gYm9hcmQoc3RhcnRQb3NpdGlvbiwgbGVzc29uTm9kZXMpe1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheSA9IGxlc3Nvbk5vZGVzO1xyXG4gICAgdGhpcy5ib2FyZE9mZnNldCA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxuICAgIHRoaXMuem9vbSA9IENvbnN0YW50cy5zdGFydFpvb207XHJcbiAgICB0aGlzLnN0YWdlID0gMDtcclxuICAgIHRoaXMubGFzdFNhdmVUaW1lID0gMDsgLy8gYXNzdW1lIG5vIGNvb2tpZVxyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb24gPSBudWxsO1xyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb25OdW0gPSAtMTtcclxuICAgIFxyXG4gICAgLy9pZiAoZG9jdW1lbnQuY29va2llKSB0aGlzLmxvYWRDb29raWUoKTsgXHJcblxyXG5cdC8vIENoZWNrIGlmIGFsbCBub2RlcyBhcmUgc29sdmVkXHJcblx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoICYmIGRvbmU7aSsrKVxyXG5cdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRpZihkb25lKVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG59XHJcblxyXG4vL3Byb3RvdHlwZVxyXG52YXIgcCA9IGJvYXJkLnByb3RvdHlwZTtcclxuXHJcbnAubW92ZSA9IGZ1bmN0aW9uKHBYLCBwWSl7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnggKz0gcFg7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnkgKz0gcFk7XHJcbiAgICB0aGlzLmJvYXJkT2Zmc2V0ID0ge3g6MCx5OjB9O1xyXG4gICAgdGhpcy5wcmV2Qm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcbn07XHJcblxyXG5wLmFjdCA9IGZ1bmN0aW9uKHBNb3VzZVN0YXRlLCBkdCkge1xyXG5cdFxyXG5cdC8vIGZvciBlYWNoICBub2RlXHJcbiAgICBmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICBcdHZhciBhY3RpdmVOb2RlID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV07IFxyXG5cdFx0Ly8gaGFuZGxlIHNvbHZlZCBxdWVzdGlvblxyXG5cdFx0aWYgKGFjdGl2ZU5vZGUuY3VycmVudFN0YXRlICE9IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCAmJiBhY3RpdmVOb2RlLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIHtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHVwZGF0ZSBlYWNoIGNvbm5lY3Rpb24ncyBjb25uZWN0aW9uIG51bWJlclxyXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGFjdGl2ZU5vZGUucXVlc3Rpb24uY29ubmVjdGlvbnMubGVuZ3RoOyBqKyspXHJcblx0XHRcdFx0dGhpcy5sZXNzb25Ob2RlQXJyYXlbYWN0aXZlTm9kZS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdLmNvbm5lY3Rpb25zKys7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIG5vZGUncyBzdGF0ZVxyXG5cdFx0XHRhY3RpdmVOb2RlLmN1cnJlbnRTdGF0ZSA9IGFjdGl2ZU5vZGUucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgYWxsIG5vZGUncyBhcmUgc29sdmVkXHJcblx0XHRcdHZhciBkb25lID0gdHJ1ZTtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGggJiYgZG9uZTtpKyspXHJcblx0XHRcdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdFx0XHRkb25lID0gZmFsc2U7XHJcblx0XHRcdGlmKGRvbmUpXHJcblx0XHRcdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiB0aGVyZSBpcyBhIGxpc3RlbmVyIGZvciB1cGRhdGluZyBub2RlcywgY2FsbCBpdC5cclxuXHRcdFx0aWYodGhpcy51cGRhdGVOb2RlKVxyXG5cdFx0XHRcdHRoaXMudXBkYXRlTm9kZSgpO1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHJcblx0XHQvLyB1cGRhdGUgdGhlIG5vZGUncyB0cmFuc2l0aW9uIHByb2dyZXNzXHJcblx0XHRpZiAoYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHRhY3RpdmVOb2RlLmxpbmVQZXJjZW50ID0gTWF0aC5taW4oMSxkdCpDb25zdGFudHMubGluZVNwZWVkICsgYWN0aXZlTm9kZS5saW5lUGVyY2VudCk7XHJcblx0fVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBtb3VzZSBldmVudHMgaWYgZ2l2ZW4gYSBtb3VzZSBzdGF0ZVxyXG4gICAgaWYocE1vdXNlU3RhdGUpIHtcclxuXHQgICAgXHJcblx0ICAgIC8vIGhvdmVyIHN0YXRlc1xyXG5cdFx0Ly9mb3IodmFyIGkgPSAwOyBpIDwgYm9hcmRBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdC8vIGxvb3AgdGhyb3VnaCBsZXNzb24gbm9kZXMgdG8gY2hlY2sgZm9yIGhvdmVyXHJcblx0XHRcdC8vIHVwZGF0ZSBib2FyZFxyXG5cdFx0XHJcblx0ICAgIGlmICghcE1vdXNlU3RhdGUubW91c2VEb3duICYmIHRoaXMudGFyZ2V0KSB7XHJcblx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IHVuZGVmaW5lZDsgLy8gY2xlYXIgZHJhZyBiZWhhdmlvclxyXG5cdFx0XHR0aGlzLnRhcmdldC5kcmFnZ2luZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnRhcmdldCA9IG51bGw7XHJcblx0XHR9XHJcblx0ICAgIFxyXG5cdFx0Zm9yICh2YXIgaT10aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGgtMSwgbm9kZUNob3NlbjsgaT49MCAmJiB0aGlzLnRhcmdldD09bnVsbDsgaS0tKSB7XHJcblx0XHRcdHZhciBsTm9kZSA9IHRoaXMubGVzc29uTm9kZUFycmF5W2ldO1xyXG5cdFx0XHRcclxuXHRcdFx0bE5vZGUubW91c2VPdmVyID0gZmFsc2U7XHJcblx0XHRcdFxyXG5cdFx0XHQvL2NvbnNvbGUubG9nKFwibm9kZSB1cGRhdGVcIik7XHJcblx0XHRcdC8vIGlmIGhvdmVyaW5nLCBzaG93IGhvdmVyIGdsb3dcclxuXHRcdFx0LyppZiAocE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi54ID4gbE5vZGUucG9zaXRpb24ueC1sTm9kZS53aWR0aC8yIFxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggPCBsTm9kZS5wb3NpdGlvbi54K2xOb2RlLndpZHRoLzJcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi55ID4gbE5vZGUucG9zaXRpb24ueS1sTm9kZS5oZWlnaHQvMlxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgPCBsTm9kZS5wb3NpdGlvbi55K2xOb2RlLmhlaWdodC8yKSB7Ki9cclxuXHRcdFx0aWYgKFV0aWxpdGllcy5tb3VzZUludGVyc2VjdChwTW91c2VTdGF0ZSxsTm9kZSx0aGlzLmJvYXJkT2Zmc2V0KSkge1xyXG5cdFx0XHRcdGxOb2RlLm1vdXNlT3ZlciA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQgPSBsTm9kZTtcclxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKHBNb3VzZVN0YXRlLmhhc1RhcmdldCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmKHRoaXMudGFyZ2V0KXtcclxuXHRcclxuXHRcdFx0aWYoIXRoaXMudGFyZ2V0LmRyYWdnaW5nKXtcclxuXHRcdFx0XHRpZiAocE1vdXNlU3RhdGUubW91c2VEb3duKSB7XHJcblx0XHRcdFx0XHQvLyBkcmFnXHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5kcmFnZ2luZyA9IHRydWU7XHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24gPSBuZXcgUG9pbnQoXHJcblx0XHRcdFx0XHRwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCAtIHRoaXMudGFyZ2V0LnBvc2l0aW9uLngsXHJcblx0XHRcdFx0XHRwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSAtIHRoaXMudGFyZ2V0LnBvc2l0aW9uLnlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZUNsaWNrZWQpIHtcclxuXHRcdFx0XHRcdC8vIGhhbmRsZSBjbGljayBjb2RlXHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5jbGljayhwTW91c2VTdGF0ZSk7XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RRdWVzdGlvbiA9IHRoaXMudGFyZ2V0LnF1ZXN0aW9uO1xyXG5cdFx0XHRcdFx0dGhpcy5sYXN0UXVlc3Rpb25OdW0gPSBpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNle1xyXG5cdFx0XHRcdHZhciBuYXR1cmFsWCA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uLng7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucG9zaXRpb24ueCA9IE1hdGgubWF4KENvbnN0YW50cy5ib2FyZE91dGxpbmUsTWF0aC5taW4obmF0dXJhbFgsQ29uc3RhbnRzLmJvYXJkU2l6ZS54IC0gQ29uc3RhbnRzLmJvYXJkT3V0bGluZSkpO1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnF1ZXN0aW9uLnBvc2l0aW9uUGVyY2VudFggPSB0aGlzLnRhcmdldC5wb3NpdGlvbi54O1xyXG5cdFx0XHRcdHZhciBuYXR1cmFsWSA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uLnk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucG9zaXRpb24ueSA9IE1hdGgubWF4KENvbnN0YW50cy5ib2FyZE91dGxpbmUsTWF0aC5taW4obmF0dXJhbFksQ29uc3RhbnRzLmJvYXJkU2l6ZS55IC0gQ29uc3RhbnRzLmJvYXJkT3V0bGluZSkpO1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnF1ZXN0aW9uLnBvc2l0aW9uUGVyY2VudFkgPSB0aGlzLnRhcmdldC5wb3NpdGlvbi55O1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdCAgfVxyXG5cdFx0XHJcblx0XHQvLyBkcmFnIHRoZSBib2FyZCBhcm91bmRcclxuXHRcdGlmICh0aGlzLnRhcmdldD09bnVsbCkge1xyXG5cdFx0XHRpZiAocE1vdXNlU3RhdGUubW91c2VEb3duKSB7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctd2Via2l0LWdyYWJiaW5nJztcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy1tb3otZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGlmICghdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQgPSBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb247XHJcblx0XHRcdFx0XHR0aGlzLnByZXZCb2FyZE9mZnNldC54ID0gdGhpcy5ib2FyZE9mZnNldC54O1xyXG5cdFx0XHRcdFx0dGhpcy5wcmV2Qm9hcmRPZmZzZXQueSA9IHRoaXMuYm9hcmRPZmZzZXQueTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSB0aGlzLnByZXZCb2FyZE9mZnNldC54IC0gKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkLngpO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueCA+IHRoaXMubWF4Qm9hcmRXaWR0aC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnggPSB0aGlzLm1heEJvYXJkV2lkdGgvMjtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmJvYXJkT2Zmc2V0LnggPCAtMSp0aGlzLm1heEJvYXJkV2lkdGgvMikgdGhpcy5ib2FyZE9mZnNldC54ID0gLTEqdGhpcy5tYXhCb2FyZFdpZHRoLzI7XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSB0aGlzLnByZXZCb2FyZE9mZnNldC55IC0gKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkLnkpO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueSA+IHRoaXMubWF4Qm9hcmRIZWlnaHQvMikgdGhpcy5ib2FyZE9mZnNldC55ID0gdGhpcy5tYXhCb2FyZEhlaWdodC8yO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueSA8IC0xKnRoaXMubWF4Qm9hcmRIZWlnaHQvMikgdGhpcy5ib2FyZE9mZnNldC55ID0gLTEqdGhpcy5tYXhCb2FyZEhlaWdodC8yO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICcnO1xyXG5cdFx0XHR9XHJcblx0ICAgIH1cclxuICAgIH1cclxufVxyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4LCBjYW52YXMpe1xyXG4gICAgXHJcbiAgICAvLyBzYXZlIGNhbnZhcyBzdGF0ZSBiZWNhdXNlIHdlIGFyZSBhYm91dCB0byBhbHRlciBwcm9wZXJ0aWVzXHJcbiAgICBjdHguc2F2ZSgpOyAgIFxyXG5cclxuICAgIC8vIFRyYW5zbGF0ZSB0byBjZW50ZXIgb2Ygc2NyZWVuIGFuZCBzY2FsZSBmb3Igem9vbSB0aGVuIHRyYW5zbGF0ZSBiYWNrXHJcbiAgICBjdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aC8yLCBjYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLWNhbnZhcy53aWR0aC8yLCAtY2FudmFzLmhlaWdodC8yKTtcclxuICAgIC8vIG1vdmUgdGhlIGJvYXJkIHRvIHdoZXJlIHRoZSB1c2VyIGRyYWdnZWQgaXRcclxuICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLmJvYXJkT2Zmc2V0O1xyXG4gICAgLy90cmFuc2xhdGUgdG8gdGhlIGNlbnRlciBvZiB0aGUgYm9hcmRcclxuICAgIC8vY29uc29sZS5sb2codGhpcyk7XHJcbiAgICBjdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aC8yIC0gdGhpcy5wb3NpdGlvbi54LCBjYW52YXMuaGVpZ2h0LzIgLSB0aGlzLnBvc2l0aW9uLnkpO1xyXG4gICAgXHJcblx0XHJcbiAgICAvLyBEcmF3IHRoZSBiYWNrZ3JvdW5kIG9mIHRoZSBib2FyZFxyXG4gICAgRHJhd0xpYi5yZWN0KGN0eCwgMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCBDb25zdGFudHMuYm9hcmRTaXplLnksIFwiI0QzQjE4NVwiKTtcclxuICAgIERyYXdMaWIuc3Ryb2tlUmVjdChjdHgsIC1Db25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIC1Db25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZFNpemUueCtDb25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZFNpemUueStDb25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZE91dGxpbmUsIFwiI0NCOTk2NlwiKTtcclxuICAgIFxyXG5cdC8vIGRyYXcgdGhlIG5vZGVzXHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG4gICAgXHJcbiAgICBcdC8vIHRlbXBvcmFyaWx5IGhpZGUgYWxsIGJ1dCB0aGUgZmlyc3QgcXVlc3Rpb25cdFx0XHRcdFx0XHQvLyBzb21ldGhpbmcgaXMgd3JvbmcgaGVyZSwgbGlua3NBd2F5RnJvbU9yaWdpbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlXHJcblx0XHQvL2lmICh0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5yZXZlYWxUaHJlc2hvbGQgPiB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5saW5rc0F3YXlGcm9tT3JpZ2luKSBjb250aW51ZTtcclxuICAgIFx0XHJcbiAgICBcdC8vIGRyYXcgdGhlIG5vZGUgaXRzZWxmXHJcbiAgICAgICAgdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZHJhdyhjdHgsIGNhbnZhcyk7XHJcbiAgICB9XHJcblxyXG5cdC8vIGRyYXcgdGhlIGxpbmVzXHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHJcblx0XHQvLyBvbmx5IHNob3cgbGluZXMgZnJvbSBzb2x2ZWQgcXVlc3Rpb25zXHJcblx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIGNvbnRpbnVlO1xyXG5cdFx0XHJcblx0XHQvLyBnZXQgdGhlIHBpbiBwb3NpdGlvblxyXG4gICAgICAgIHZhciBvUG9zID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZ2V0Tm9kZVBvaW50KCk7XHJcbiAgICAgICAgXHJcblx0XHQvLyBzZXQgbGluZSBzdHlsZVxyXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsMCwxMDUsMC4yKVwiO1xyXG5cdFx0Y3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gZHJhdyBsaW5lc1xyXG4gICAgICAgIGZvciAodmFyIGo9MDsgajx0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyAtMSBiZWNhc2Ugbm9kZSBjb25uZWN0aW9uIGluZGV4IHZhbHVlcyBhcmUgMS1pbmRleGVkIGJ1dCBjb25uZWN0aW9ucyBpcyAwLWluZGV4ZWRcclxuXHRcdFx0aWYgKHRoaXMubGVzc29uTm9kZUFycmF5W3RoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0ucXVlc3Rpb24uY3VycmVudFN0YXRlPT1RdWVzdGlvbi5TT0xWRV9TVEFURS5ISURERU4pIGNvbnRpbnVlO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyBnbyB0byB0aGUgaW5kZXggaW4gdGhlIGFycmF5IHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGNvbm5lY3RlZCBub2RlIG9uIHRoaXMgYm9hcmQgYW5kIHNhdmUgaXRzIHBvc2l0aW9uXHJcbiAgICAgICAgXHQvLyBjb25uZWN0aW9uIGluZGV4IHNhdmVkIGluIHRoZSBsZXNzb25Ob2RlJ3MgcXVlc3Rpb25cclxuICAgICAgICBcdHZhciBjb25uZWN0aW9uID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXTtcclxuICAgICAgICBcdHZhciBjUG9zID0gY29ubmVjdGlvbi5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0Ly8gZHJhdyB0aGUgbGluZVxyXG4gICAgICAgIFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIFx0Ly8gdHJhbnNsYXRlIHRvIHN0YXJ0IChwaW4pXHJcbiAgICAgICAgXHRjdHgubW92ZVRvKG9Qb3MueCwgb1Bvcy55KTtcclxuICAgICAgICBcdGN0eC5saW5lVG8ob1Bvcy54ICsgKGNQb3MueCAtIG9Qb3MueCkqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGluZVBlcmNlbnQsIG9Qb3MueSArIChjUG9zLnkgLSBvUG9zLnkpKnRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmVQZXJjZW50KTtcclxuICAgICAgICBcdGN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgICBcdGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG4vLyBHZXRzIGEgZnJlZSBub2RlIGluIHRoaXMgYm9hcmQgKGkuZS4gbm90IHVuc29sdmVkKSByZXR1cm5zIG51bGwgaWYgbm9uZVxyXG5wLmdldEZyZWVOb2RlID0gZnVuY3Rpb24oKSB7XHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspXHJcblx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQpXHJcblx0XHRcdHJldHVybiB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTtcclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gTW92ZXMgdGhpcyBib2FyZCB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5wLm1vdmVUb3dhcmRzID0gZnVuY3Rpb24ocG9pbnQsIGR0LCBzcGVlZCl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB2ZWN0b3IgdG93YXJkcyB0aGUgZ2l2ZW4gcG9pbnRcclxuXHR2YXIgdG9Qb2ludCA9IG5ldyBQb2ludChwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCwgcG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgZGlzdGFuY2Ugb2Ygc2FpZCB2ZWN0b3JcclxuXHR2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQodG9Qb2ludC54KnRvUG9pbnQueCt0b1BvaW50LnkqdG9Qb2ludC55KTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIG5ldyBvZmZzZXQgb2YgdGhlIGJvYXJkIGFmdGVyIG1vdmluZyB0b3dhcmRzIHRoZSBwb2ludFxyXG5cdHZhciBuZXdPZmZzZXQgPSBuZXcgUG9pbnQoIHRoaXMuYm9hcmRPZmZzZXQueCArIHRvUG9pbnQueC9kaXN0YW5jZSpkdCpzcGVlZCxcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSArIHRvUG9pbnQueS9kaXN0YW5jZSpkdCpzcGVlZCk7XHJcblx0XHJcblx0Ly8gQ2hlY2sgaWYgcGFzc2VkIHBvaW50IG9uIHggYXhpcyBhbmQgaWYgc28gc2V0IHRvIHBvaW50J3MgeFxyXG5cdGlmKHRoaXMuYm9hcmRPZmZzZXQueCAhPXBvaW50LnggJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LngtbmV3T2Zmc2V0LngpLyhwb2ludC54LW5ld09mZnNldC54KT09TWF0aC5hYnMocG9pbnQueC10aGlzLmJvYXJkT2Zmc2V0LngpLyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBuZXdPZmZzZXQueDtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBwb2ludC54O1xyXG5cdFxyXG5cclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geSBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB5XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC55ICE9IHBvaW50LnkgJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LnktbmV3T2Zmc2V0LnkpLyhwb2ludC55LW5ld09mZnNldC55KT09TWF0aC5hYnMocG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpLyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBuZXdPZmZzZXQueTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBwb2ludC55O1xyXG59XHJcblxyXG5wLndpbmRvd0Nsb3NlZCA9IGZ1bmN0aW9uKCl7XHJcblx0Y29uc29sZS5sb2coXCJ3aW5kb3cgY2xvc2VkXCIpO1xyXG5cdC8vIGlmIGl0IGlzIGZpbGUgdHlwZVxyXG5cdGlmICh0aGlzLmxhc3RRdWVzdGlvbi5xdWVzdGlvblR5cGUgPT0gNCkge1xyXG5cdFx0Ly8gYWRkIGEgZmlsZSB0byB0aGUgZmlsZSBzeXN0ZW1cclxuXHRcdHZhciBuYW1lID0gdGhpcy5sYXN0UXVlc3Rpb24uZmlsZU5hbWU7XHJcblx0XHR2YXIgYmxvYiA9IHRoaXMubGFzdFF1ZXN0aW9uLmJsb2I7XHJcblx0XHR2YXIgbGFzdFF1ZXN0aW9uTnVtID0gdGhpcy5sYXN0UXVlc3Rpb25OdW07XHJcblx0XHRyZXR1cm4geyBcclxuXHRcdFx0YmxvYjogYmxvYiwgXHJcblx0XHRcdG51bTogbGFzdFF1ZXN0aW9uTnVtLCBcclxuXHRcdFx0ZXh0OiBuYW1lLnN1YnN0cmluZyggbmFtZS5sYXN0SW5kZXhPZihcIi5cIiksIG5hbWUubGVuZ3RoKVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYm9hcmQ7ICAgIFxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIGJ1dHRvbihzdGFydFBvc2l0aW9uLCB3aWR0aCwgaGVpZ2h0KXtcclxuICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICB0aGlzLmhvdmVyZWQgPSBmYWxzZTtcclxufVxyXG5idXR0b24uZHJhd0xpYiA9IHVuZGVmaW5lZDtcclxuXHJcbnZhciBwID0gYnV0dG9uLnByb3RvdHlwZTtcclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCl7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgdmFyIGNvbDtcclxuICAgIGlmKHRoaXMuaG92ZXJlZCl7XHJcbiAgICAgICAgY29sID0gXCJkb2RnZXJibHVlXCI7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGNvbCA9IFwibGlnaHRibHVlXCI7XHJcbiAgICB9XHJcbiAgICAvL2RyYXcgcm91bmRlZCBjb250YWluZXJcclxuICAgIGJvYXJkQnV0dG9uLmRyYXdMaWIucmVjdChjdHgsIHRoaXMucG9zaXRpb24ueCAtIHRoaXMud2lkdGgvMiwgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5oZWlnaHQvMiwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIGNvbCk7XHJcblxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYnV0dG9uOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxuXHJcbi8vIENyZWF0ZXMgYSBjYXRlZ29yeSB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBmcm9tIHRoZSBnaXZlbiB4bWxcclxuZnVuY3Rpb24gQ2F0ZWdvcnkobmFtZSwgeG1sLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKXtcclxuXHRcclxuXHQvLyBTYXZlIHRoZSBuYW1lXHJcblx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcclxuXHQvLyBMb2FkIGFsbCB0aGUgcXVlc3Rpb25zXHJcblx0dmFyIHF1ZXN0aW9uRWxlbWVudHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIik7XHJcblx0dGhpcy5xdWVzdGlvbnMgPSBbXTtcclxuXHQvLyBjcmVhdGUgcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPHF1ZXN0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIFxyXG5cdHtcclxuXHRcdC8vIGNyZWF0ZSBhIHF1ZXN0aW9uIG9iamVjdFxyXG5cdFx0dGhpcy5xdWVzdGlvbnNbaV0gPSBuZXcgUXVlc3Rpb24ocXVlc3Rpb25FbGVtZW50c1tpXSwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcblx0fVxyXG4gICAgXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2F0ZWdvcnk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxuLy8gVGhlIHNpemUgb2YgdGhlIGJvYXJkIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRTaXplID0gbmV3IFBvaW50KDE5MjAsIDEwODApO1xyXG5cclxuLy9UaGUgc2l6ZSBvZiB0aGUgYm9hcmQgb3V0bGluZSBpbiBnYW1lIHVuaXRzIGF0IDEwMCUgem9vbVxyXG5tLmJvYXJkT3V0bGluZSA9IG0uYm9hcmRTaXplLnggPiBtLmJvYXJkU2l6ZS55ID8gbS5ib2FyZFNpemUueC8yMCA6IG0uYm9hcmRTaXplLnkvMjA7XHJcblxyXG4vLyBUaGUgem9vbSB2YWx1ZXMgYXQgc3RhcnQgYW5kIGVuZCBvZiBhbmltYXRpb25cclxubS5zdGFydFpvb20gPSAwLjU7XHJcbm0uZW5kWm9vbSA9IDEuNTtcclxuXHJcbi8vIFRoZSBzcGVlZCBvZiB0aGUgem9vbSBhbmltYXRpb25cclxubS56b29tU3BlZWQgPSAwLjAwMTtcclxubS56b29tTW92ZVNwZWVkID0gMC43NTtcclxuXHJcbi8vIFRoZSBzcGVlZCBvZiB0aGUgbGluZSBhbmltYXRpb25cclxubS5saW5lU3BlZWQgPSAwLjAwMjtcclxuXHJcbi8vIFRoZSB0aW1lIGJldHdlZW4gem9vbSBjaGVja3NcclxubS5waW5jaFNwZWVkID0gLjAwMjU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vL01vZHVsZSBleHBvcnRcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHJcbm0uY2xlYXIgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgpIHtcclxuICAgIGN0eC5jbGVhclJlY3QoeCwgeSwgdywgaCk7XHJcbn1cclxuXHJcbm0ucmVjdCA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCwgY29sLCBjZW50ZXJPcmlnaW4pIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sO1xyXG4gICAgaWYoY2VudGVyT3JpZ2luKXtcclxuICAgICAgICBjdHguZmlsbFJlY3QoeCAtICh3IC8gMiksIHkgLSAoaCAvIDIpLCB3LCBoKTtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5zdHJva2VSZWN0ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoLCBsaW5lLCBjb2wsIGNlbnRlck9yaWdpbikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbDtcclxuICAgIGN0eC5saW5lV2lkdGggPSBsaW5lO1xyXG4gICAgaWYoY2VudGVyT3JpZ2luKXtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCh4IC0gKHcgLyAyKSwgeSAtIChoIC8gMiksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguc3Ryb2tlUmVjdCh4LCB5LCB3LCBoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0ubGluZSA9IGZ1bmN0aW9uKGN0eCwgeDEsIHkxLCB4MiwgeTIsIHRoaWNrbmVzcywgY29sb3IpIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHgubW92ZVRvKHgxLCB5MSk7XHJcbiAgICBjdHgubGluZVRvKHgyLCB5Mik7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpY2tuZXNzO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLmNpcmNsZSA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgcmFkaXVzLCBjb2xvcil7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh4LHksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib2FyZEJ1dHRvbihjdHgsIHBvc2l0aW9uLCB3aWR0aCwgaGVpZ2h0LCBob3ZlcmVkKXtcclxuICAgIC8vY3R4LnNhdmUoKTtcclxuICAgIGlmKGhvdmVyZWQpe1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImRvZGdlcmJsdWVcIjtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwibGlnaHRibHVlXCI7XHJcbiAgICB9XHJcbiAgICAvL2RyYXcgcm91bmRlZCBjb250YWluZXJcclxuICAgIGN0eC5yZWN0KHBvc2l0aW9uLnggLSB3aWR0aC8yLCBwb3NpdGlvbi55IC0gaGVpZ2h0LzIsIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDU7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgLy9jdHgucmVzdG9yZSgpO1xyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoXCIuL2NhdGVnb3J5LmpzXCIpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKFwiLi9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxudmFyIFBhcnNlciA9IHJlcXVpcmUoJy4vaXBhckRhdGFQYXJzZXIuanMnKTtcclxudmFyIFF1ZXN0aW9uV2luZG93cyA9IHJlcXVpcmUoJy4vcXVlc3Rpb25XaW5kb3dzLmpzJyk7XHJcbndpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMICA9IHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMIHx8IHdpbmRvdy53ZWJraXRSZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMO1xyXG5cclxuLy8gTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxudmFyIGJhc2VVUkwgPSBsb2NhbFN0b3JhZ2VbJ2Nhc2VGaWxlcyddO1xyXG5cclxudmFyIGZpbGVTeXN0ZW0gPSBudWxsO1xyXG5cclxudmFyIGJhc2VEaXIgPSBudWxsO1xyXG5cclxudmFyIGFkZEZpbGVEYXRhID0geyBmaWxlbmFtZTogXCJcIiwgYmxvYjogXCJcIiwgY2FsbGJhY2s6IHVuZGVmaW5lZH07XHJcblxyXG4vLyBzdG9yZXMgYW4gYXJyYXkgb2YgYWxsIHRoZSBmaWxlcyBmb3IgcmV6aXBwaW5nXHJcbnZhciBhbGxFbnRyaWVzO1xyXG5cclxuLy8gKioqKioqKioqKioqKioqKioqKioqKiBMT0FESU5HICoqKioqKioqKioqKioqKioqKioqKioqKlxyXG5cclxuLy8gbG9hZCB0aGUgZmlsZSBlbnRyeSBhbmQgcGFyc2UgdGhlIHhtbFxyXG5tLmxvYWRDYXNlID0gZnVuY3Rpb24odXJsLCB3aW5kb3dEaXYsIGNhbGxiYWNrKSB7XHJcbiAgICBcclxuICAgIHRoaXMuY2F0ZWdvcmllcyA9IFtdO1xyXG4gICAgdGhpcy5xdWVzdGlvbnMgPSBbXTtcclxuICAgIFxyXG4gICAgLy8gTG9hZCB0aGUgcXVlc3Rpb24gd2luZG93cyBmaXJzdFxyXG4gICAgdmFyIHdpbmRvd3MgPSBuZXcgUXVlc3Rpb25XaW5kb3dzKGZ1bmN0aW9uKCl7XHJcbiAgICBcdC8vIGdldCBYTUxcclxuICAgICAgICB3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCh1cmwrJ2FjdGl2ZS9jYXNlRmlsZS5pcGFyZGF0YScsIGZ1bmN0aW9uKGZpbGVFbnRyeSkge1xyXG4gICAgXHRcdGZpbGVFbnRyeS5maWxlKGZ1bmN0aW9uKGZpbGUpIHtcclxuICAgIFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG4gICAgXHRcdFx0XHJcbiAgICBcdFx0XHQvLyBob29rIHVwIGNhbGxiYWNrXHJcbiAgICBcdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgXHRcdFx0XHQvLyBHZXQgdGhlIHJhdyBkYXRhXHJcbiAgICBcdFx0XHRcdHZhciByYXdEYXRhID0gVXRpbGl0aWVzLmdldFhtbCh0aGlzLnJlc3VsdCk7XHJcbiAgICBcdFx0XHRcdHZhciBjYXRlZ29yaWVzID0gUGFyc2VyLmdldENhdGVnb3JpZXNBbmRRdWVzdGlvbnMocmF3RGF0YSwgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3MpO1xyXG4gICAgXHRcdFx0XHQvLyBsb2FkIHRoZSBtb3N0IHJlY2VudCB2ZXJzaW9uXHJcbiAgICBcdFx0XHRcdHZhciBhdXRvc2F2ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b3NhdmVcIik7XHJcbiAgICBcdFx0XHRcdGlmIChhdXRvc2F2ZSkge1xyXG4gICAgXHRcdFx0XHRcdGxvYWRBdXRvc2F2ZShhdXRvc2F2ZSwgY2F0ZWdvcmllcywgY2FsbGJhY2spO1xyXG4gICAgXHRcdFx0XHR9IGVsc2Uge1xyXG4gICAgXHRcdFx0XHRcdGxvYWRTYXZlUHJvZ3Jlc3MoY2F0ZWdvcmllcywgdXJsLCB3aW5kb3dEaXYsIGNhbGxiYWNrKTtcclxuICAgIFx0XHRcdFx0fVxyXG4gICAgXHRcdFx0XHQvLyBwcmVwYXJlIGZvciBzYXZpbmcgYnkgcmVhZGluZyB0aGUgZmlsZXMgcmlnaHQgd2hlbiB0aGUgcHJvZ3JhbSBzdGFydHNcclxuICAgIFx0XHRcdCAgICB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW0od2luZG93LlRFTVBPUkFSWSwgMTAyNCoxMDI0LCByZWN1cnNpdmVseVJlYWRGaWxlcywgZXJyb3JIYW5kbGVyKTtcclxuICAgIFx0XHRcdH07XHJcbiAgICBcdFx0XHRyZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcclxuICAgIFx0XHQgICBcclxuICAgIFx0XHR9LCBmdW5jdGlvbihlKXtcclxuICAgIFx0XHRcdGNvbnNvbGUubG9nKFwiRXJyb3I6IFwiK2UubWVzc2FnZSk7XHJcbiAgICBcdFx0fSk7XHJcbiAgICBcdH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8vIGxvYWQgdGhlIHNhdmUgZnJvbSB0aGUgZmlsZXN5dGVtIHNhbmRib3hcclxuZnVuY3Rpb24gbG9hZFNhdmVQcm9ncmVzcyhjYXRlZ29yaWVzLCB1cmwsIHdpbmRvd0RpdiwgY2FsbGJhY2spIHtcclxuICAgIHZhciBxdWVzdGlvbnMgPSBbXTtcclxuICAgIFxyXG5cdC8vIGdldCBYTUxcclxuICAgIHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMKHVybCsnYWN0aXZlL3NhdmVGaWxlLmlwYXJkYXRhJywgZnVuY3Rpb24oZmlsZUVudHJ5KSB7XHJcblx0XHRmaWxlRW50cnkuZmlsZShmdW5jdGlvbihmaWxlKSB7XHJcblx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gaG9vayB1cCBjYWxsYmFja1xyXG5cdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XHJcblxyXG5cdFx0XHRcdC8vIEdldCB0aGUgc2F2ZSBkYXRhXHJcblx0XHRcdFx0dmFyIHNhdmVEYXRhID0gVXRpbGl0aWVzLmdldFhtbCh0aGlzLnJlc3VsdCk7XHJcblx0XHRcdFx0Ly8gcGFyc2UgdGhlIHNhdmUgZGF0YVxyXG5cdFx0XHRcdFBhcnNlci5hc3NpZ25RdWVzdGlvblN0YXRlcyhjYXRlZ29yaWVzLCBzYXZlRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uXCIpKTtcclxuXHRcdFx0XHQvLyBwcm9ncmVzc1xyXG5cdFx0XHRcdHZhciBzdGFnZSA9IHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJjYXNlU3RhdHVzXCIpO1xyXG5cdFx0XHRcdC8vIGNhbGxiYWNrIHdpdGggcmVzdWx0c1xyXG5cdFx0XHRcdGNhbGxiYWNrKGNhdGVnb3JpZXMsIHN0YWdlKTsgLy8gbWF5YmUgc3RhZ2UgKyAxIHdvdWxkIGJlIGJldHRlciBiZWNhdXNlIHRoZXkgYXJlIG5vdCB6ZXJvIGluZGV4ZWQ/XHJcblx0XHRcdCAgIFxyXG5cdFx0XHR9O1xyXG5cdFx0XHRyZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcclxuXHRcdCAgIFxyXG5cdFx0fSwgZnVuY3Rpb24oZSl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiRXJyb3I6IFwiK2UubWVzc2FnZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufVxyXG5cclxuLy8gbG9hZCB0aGUgc2F2ZSBmcm9tIHRoZSBsb2NhbFN0b3JhZ2VcclxuZnVuY3Rpb24gbG9hZEF1dG9zYXZlKGF1dG9zYXZlLCBjYXRlZ29yaWVzLCBjYWxsYmFjaykge1xyXG5cdC8vIEdldCB0aGUgc2F2ZSBkYXRhXHJcblx0dmFyIHNhdmVEYXRhID0gVXRpbGl0aWVzLmdldFhtbChhdXRvc2F2ZSk7XHJcblx0UGFyc2VyLmFzc2lnblF1ZXN0aW9uU3RhdGVzKGNhdGVnb3JpZXMsIHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25cIikpO1xyXG5cdHZhciBzdGFnZSA9IHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2FzZVwiKVswXS5nZXRBdHRyaWJ1dGUoXCJjYXNlU3RhdHVzXCIpO1xyXG5cdGNhbGxiYWNrKGNhdGVnb3JpZXMsIHN0YWdlKTtcclxufVxyXG5cclxuXHRcdFx0XHRcdCBcclxuLy8gKioqKioqKioqKioqKioqKioqKioqKiBTQVZJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vKiBoZXJlJ3MgdGhlIGdlbmVyYWwgb3V0bGluZSBvZiB3aGF0IGlzIGhhcHBlbmluZzpcclxuc2VsZWN0U2F2ZUxvY2F0aW9uIHdhcyB0aGUgb2xkIHdheSBvZiBkb2luZyB0aGluZ3Ncclxubm93IHdlIHVzZSBjcmVhdGVaaXBcclxuIC0gd2hlbiB0aGlzIHdob2xlIHRoaW5nIHN0YXJ0cywgd2UgcmVxdWVzdCBhIGZpbGUgc3lzdGVtIGFuZCBzYXZlIGFsbCB0aGUgZW50cmllcyAoZGlyZWN0b3JpZXMgYW5kIGZpbGVzKSB0byB0aGUgYWxsRW50cmllcyB2YXJpYWJsZVxyXG4gLSB0aGVuIHdlIGdldCB0aGUgYmxvYnMgdXNpbmcgcmVhZEFzQmluYXJ5U3RyaW5nIGFuZCBzdG9yZSB0aG9zZSBpbiBhbiBhcnJheSB3aGVuIHdlIGFyZSBzYXZpbmcgXHJcbiAgLSAtIGNvdWxkIGRvIHRoYXQgb24gcGFnZSBsb2FkIHRvIHNhdmUgdGltZSBsYXRlci4uP1xyXG4gLSBhbnl3YXksIHRoZW4gd2UgLSBpbiB0aGVvcnkgLSB0YWtlIHRoZSBibG9icyBhbmQgdXNlIHppcC5maWxlKGVudHJ5Lm5hbWUsIGJsb2IpIHRvIHJlY3JlYXRlIHRoZSBzdHJ1Y3R1cmVcclxuIC0gYW5kIGZpbmFsbHkgd2UgZG93bmxvYWQgdGhlIHppcCB3aXRoIGRvd25sb2FkKClcclxuIFxyXG4qL1xyXG5cclxuLy8gY2FsbGVkIHdoZW4gdGhlIGdhbWUgaXMgbG9hZGVkLCBhZGQgb25jbGljayB0byBzYXZlIGJ1dHRvbiB0aGF0IGFjdHVhbGx5IGRvZXMgdGhlIHNhdmluZ1xyXG5tLnByZXBhcmVaaXAgPSBmdW5jdGlvbihteUJvYXJkcykge1xyXG5cdC8vdmFyIGNvbnRlbnQgPSB6aXAuZ2VuZXJhdGUoKTtcclxuXHRcclxuXHRjb25zb2xlLmxvZyhcInByZXBhcmUgemlwXCIpO1xyXG5cdFxyXG5cdC8vIGNvZGUgZnJvbSBKU1ppcCBzaXRlXHJcblx0dmFyIGJsb2JMaW5rID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Jsb2InKTtcclxuXHRpZiAoSlNaaXAuc3VwcG9ydC5ibG9iKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcInN1cHBvcnRzIGJsb2JcIik7XHJcblx0XHRcclxuXHRcdC8vIGxpbmsgZG93bmxvYWQgdG8gY2xpY2tcclxuXHRcdGJsb2JMaW5rLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgc2F2ZUlQQVIobXlCb2FyZHMpOyB9O1xyXG4gIFx0fVxyXG59XHJcblxyXG4vLyBjcmVhdGUgSVBBUiBmaWxlIGFuZCBkb3dubG9hZCBpdFxyXG5mdW5jdGlvbiBzYXZlSVBBUihib2FyZHMpIHtcclxuXHJcblx0Ly8gZXJyb3IgaGFuZGxpbmdcclxuXHRpZiAoIWFsbEVudHJpZXMpIHtcclxuXHRcdGFsZXJ0KFwiQ0FOTk9UIFNBVkU6IGZpbGUgZGF0YSBkaWQgbm90IGxvYWRcIik7IHJldHVybjsgXHJcblx0fVxyXG5cdC8vIDEpXHJcblx0Ly8gZ2V0IHRoZSBmaWxlcyB0aGF0IHRoZSB1c2VyIHVwbG9hZGVkIFxyXG5cdHZhciB1cGxvYWRlZEZpbGVzID0gZ2V0QWxsU3VibWlzc2lvbnMoYm9hcmRzKTtcclxuXHRcclxuXHQvLyAyKVxyXG5cdC8vIGNyZWF0ZSB0aGUgY2FzZSBmaWxlIGxpa2UgdGhlIG9uZSB3ZSBsb2FkZWRcclxuXHR2YXIgY2FzZUZpbGUgPSBQYXJzZXIucmVjcmVhdGVDYXNlRmlsZShib2FyZHMpO1xyXG5cdFxyXG5cdC8vIDMpIChBU1lOQylcclxuXHQvLyByZWNyZWF0ZSB0aGUgSVBBUiBmaWxlIHVzaW5nIEZpbGVTeXN0ZW0sIHRoZW4gZG93bmxvYWQgaXRcclxuXHRnZXRBbGxDb250ZW50cyhjYXNlRmlsZSwgdXBsb2FkZWRGaWxlcyk7XHJcblx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVppcChkYXRhLCBibG9icywgbmFtZXMsIHN1YnMpIHtcclxuXHRjb25zb2xlLmxvZyhcImNyZWF0ZSB6aXAgcnVuXCIpO1xyXG5cdFxyXG5cdHZhciB6aXAgPSBuZXcgSlNaaXAoKTtcclxuXHJcblx0Ly8gemlwIGVhY2ggZmlsZSBvbmUgYnkgb25lXHJcblx0YmxvYnMuZm9yRWFjaChmdW5jdGlvbihibG9iLGkpIHtcclxuXHRcdHppcC5maWxlKG5hbWVzW2ldLGJsb2IpO1xyXG5cdH0pO1xyXG5cdC8vIHppcCBzdWJtaXR0ZWQgZmlsZXNcclxuXHRzdWJzLm5hbWVzLmZvckVhY2goZnVuY3Rpb24oc3ViTmFtZSxpKSB7XHJcblx0XHR6aXAuZmlsZShcImNhc2VcXFxcYWN0aXZlXFxcXHN1Ym1pdHRlZFxcXFxcIitzdWJOYW1lLHN1YnMuYmxvYnNbaV0pO1xyXG5cdH0pO1xyXG5cdFxyXG5cdC8vIGJhY2tzbGFzaGVzIHBlciB6aXAgZmlsZSBwcm90b2NvbFxyXG5cdHppcC5maWxlKFwiY2FzZVxcXFxhY3RpdmVcXFxcc2F2ZUZpbGUuaXBhcmRhdGFcIixkYXRhKTtcclxuXHQvLyBkb3dubG9hZCB0aGUgZmlsZVxyXG5cdGRvd25sb2FkKHppcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFsbFN1Ym1pc3Npb25zKGJvYXJkcykge1xyXG5cdHZhciBuYW1lcyA9IFtdO1xyXG5cdHZhciBibG9icyA9IFtdO1xyXG5cdFxyXG5cdC8vIGxvb3AgdGhyb3VnaCBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8Ym9hcmRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRmb3IgKHZhciBqPTA7IGo8Ym9hcmRzW2ldLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHQvLyBzaG9ydGhhbmRcclxuXHRcdFx0dmFyIHEgPSBib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5W2pdLnF1ZXN0aW9uO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gYWRkIGJsb2JzIHRvIGFuIGFycmF5XHJcblx0XHRcdGlmIChxLmZpbGVOYW1lICYmIHEuYmxvYikge1xyXG5cdFx0XHRcdG5hbWVzLnB1c2gocS5maWxlTmFtZSk7XHJcblx0XHRcdFx0YmxvYnMucHVzaChxLmJsb2IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdC8vIHJldHVybiBzdWJtaXNzaW9ucyBvYmplY3QgXHJcblx0cmV0dXJuIHtcclxuXHRcdFwibmFtZXNcIiA6IG5hbWVzLFxyXG5cdFx0XCJibG9ic1wiIDogYmxvYnNcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFsbENvbnRlbnRzKGRhdGEsIHN1YnMpIHtcclxuXHR2YXIgYmxvYnMgPSBbXTtcclxuXHR2YXIgbmFtZXMgPSBbXTtcclxuXHR2YXIgZmlsZUNvdW50ID0gMDtcclxuXHRhbGxFbnRyaWVzLmZvckVhY2goZnVuY3Rpb24oZmlsZUVudHJ5KSB7XHJcblx0XHQvL3ppcC5maWxlKGZpbGVFbnRyeS5uYW1lLGZpbGVFbnRyeVxyXG5cdFx0aWYgKGZpbGVFbnRyeS5pc0ZpbGUpIHtcclxuXHRcdFx0ZmlsZUNvdW50KytcclxuXHRcdFx0Ly8gR2V0IGEgRmlsZSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBmaWxlLFxyXG5cdFx0XHQvLyB0aGVuIHVzZSBGaWxlUmVhZGVyIHRvIHJlYWQgaXRzIGNvbnRlbnRzLlxyXG5cdFx0XHQvL2NvbnNvbGUubG9nKGZpbGVFbnRyeSk7XHJcblx0XHRcdGZpbGVFbnRyeS5maWxlKGZ1bmN0aW9uKGZpbGUpIHtcclxuXHRcdFx0ICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG5cdFx0XHQgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZSkge1xyXG5cdFx0XHQgICBcclxuXHRcdFx0ICAgXHRcdHZhciBhcnJheUJ1ZmZlclZpZXcgPSBuZXcgVWludDhBcnJheSggdGhpcy5yZXN1bHQgKTsgLy8gZmluZ2VycyBjcm9zc2VkXHJcblx0XHRcdCAgIFx0XHQvL2NvbnNvbGUubG9nKGFycmF5QnVmZmVyVmlldyk7XHJcblx0XHRcdCAgIFx0XHRcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2codGhpcy5yZXN1bHQpO1xyXG5cdFx0XHRcdCBcdGJsb2JzLnB1c2goYXJyYXlCdWZmZXJWaWV3KTtcclxuXHRcdFx0XHQgXHRuYW1lcy5wdXNoKGZpbGVFbnRyeS5mdWxsUGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcLycsJ2cnKSwnXFxcXCcpLnN1YnN0cmluZygxKSk7XHJcblx0XHRcdFx0IFx0aWYgKGJsb2JzLmxlbmd0aCA9PSBmaWxlQ291bnQpIHtcclxuXHRcdFx0XHQgXHRcdGNyZWF0ZVppcChkYXRhLGJsb2JzLG5hbWVzLHN1YnMpO1xyXG5cdFx0XHRcdCBcdH1cclxuXHRcdFx0ICAgfTtcclxuXHJcblx0XHRcdCAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcclxuXHRcdFx0fSwgZXJyb3JIYW5kbGVyKTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZG93bmxvYWQoemlwKSB7XHJcblx0Y29uc29sZS5sb2coXCJkb3dubG9hZGluZ1wiKTtcclxuXHRjb25zb2xlLmxvZyh6aXAuZ2VuZXJhdGVBc3luYyk7XHJcblx0XHJcblx0dmFyIGNvbnRlbnQgPSB6aXAuZ2VuZXJhdGVBc3luYyh7dHlwZTpcImJsb2JcIn0pLnRoZW4oXHJcblx0ZnVuY3Rpb24gKGJsb2IpIHtcclxuXHRcdC8vY29uc29sZS5sb2coYmxvYik7XHJcblx0XHQvL3NhdmVBcyhibG9iLCBcImhlbGxvLnppcFwiKTtcclxuXHRcdC8vdmFyIHVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0Ly93aW5kb3cubG9jYXRpb24uYXNzaWduKHVybCk7XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG5cdFx0XHJcblx0XHRhLmlubmVySFRNTCA9IGxvY2FsU3RvcmFnZVsnY2FzZU5hbWUnXTtcclxuXHRcdFxyXG5cdFx0YS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZG93bmxvYWRMaW5rXCIpO1xyXG5cdFx0XHJcblx0XHRhLmhyZWYgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdFxyXG5cdFx0YS5kb3dubG9hZCA9IGxvY2FsU3RvcmFnZVtcImNhc2VOYW1lXCJdO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBzaG93TGluayA9IGZhbHNlO1xyXG5cdFx0Ly8gaWYgeW91IHNob3cgdGhlIGxpbmssIHRoZSB1c2VyIGNhbiBkb3dubG9hZCB0byBhIGxvY2F0aW9uIG9mIHRoZWlyIGNob2ljZVxyXG5cdFx0aWYgKHNob3dMaW5rKSB7XHJcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XHJcblx0XHQvLyBpZiB5b3UgaGlkZSB0aGUgbGluaywgaXQgd2lsbCBzaW1wbHkgZ28gdG8gdGhlaXIgZG93bmxvYWRzIGZvbGRlclxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0YS5jbGljaygpOyAvL2Rvd25sb2FkIGltbWVkaWF0ZWx5XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdFxyXG5cclxuXHR9LCBmdW5jdGlvbiAoZXJyKSB7XHJcblx0XHRibG9iTGluay5pbm5lckhUTUwgKz0gXCIgXCIgKyBlcnI7XHJcblx0fSk7XHJcbn1cclxuXHJcblxyXG4vKioqKioqKioqKioqKiBSRUFEIEZJTEVTICoqKioqKioqKioqKioqL1xyXG5cclxuZnVuY3Rpb24gZXJyb3JIYW5kbGVyKCkge1xyXG5cdC8vZG8gbm90aGluZ1xyXG5cdGNvbnNvbGUubG9nKFwieW8gd2UgZ290IGVycm9yc1wiKTtcclxufVxyXG5cclxuLy8gaGVscGVyIGZ1bmN0aW9uIGZvciByZWN1cnNpdmVseVJlYWRGaWxlc1xyXG5mdW5jdGlvbiB0b0FycmF5KGxpc3QpIHtcclxuXHRyZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobGlzdCB8fCBbXSwgMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlY3Vyc2l2ZWx5UmVhZEZpbGVzKGZzKSB7XHJcblx0Y29uc29sZS5sb2coXCJyZWN1cnNpdmVseVJlYWRGaWxlcyBjYWxsZWRcIik7XHJcblx0XHJcblx0ZmlsZVN5c3RlbSA9IGZzO1xyXG5cclxuICB2YXIgZGlyUmVhZGVyID0gZnMucm9vdC5jcmVhdGVSZWFkZXIoKTtcclxuICB2YXIgZW50cmllcyA9IFtdO1xyXG5cclxuICAvLyBDYWxsIHRoZSByZWFkZXIucmVhZEVudHJpZXMoKSB1bnRpbCBubyBtb3JlIHJlc3VsdHMgYXJlIHJldHVybmVkLlxyXG4gIHZhciByZWFkRW50cmllcyA9IGZ1bmN0aW9uKHJlYWRlcikge1xyXG4gICAgIHJlYWRlci5yZWFkRW50cmllcyAoZnVuY3Rpb24ocmVzdWx0cykge1xyXG4gICAgICBpZiAoIXJlc3VsdHMubGVuZ3RoKSB7XHJcbiAgICAgICAgLy8gYWxsIGVudHJpZXMgZm91bmRcclxuICAgICAgICBzYXZlRW50cmllcyhlbnRyaWVzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgXHR2YXIgcmVzdWx0c0FycmF5ID0gdG9BcnJheShyZXN1bHRzKVxyXG4gICAgICAgIGVudHJpZXMgPSBlbnRyaWVzLmNvbmNhdChyZXN1bHRzQXJyYXkpO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxyZXN1bHRzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBcdC8vY29uc29sZS5sb2coXCJpcyBkaXJlY3RvcnkgPyBcIiArIHJlc3VsdHNBcnJheVtpXS5pc0RpcmVjdG9yeSk7XHJcbiAgICAgICAgXHRpZiAocmVzdWx0c0FycmF5W2ldLmlzRGlyZWN0b3J5KSB7XHJcbiAgICAgICAgXHRcdC8vZGlyZWN0b3J5U3RyaW5nICs9IHJlc3VsdHNBcnJheVtpXS5cclxuICAgICAgICBcdFx0dmFyIHJlY3Vyc2l2ZVJlYWRlciA9IHJlc3VsdHNBcnJheVtpXS5jcmVhdGVSZWFkZXIoKTtcclxuICAgICAgICBcdFx0cmVhZEVudHJpZXMocmVjdXJzaXZlUmVhZGVyKTtcclxuICAgICAgICBcdH0gZWxzZSB7XHJcbiAgICAgICAgXHRcdFxyXG4gICAgICAgIFx0fVxyXG4gICAgICAgIH1cclxuICAgICAgICAvL25hbWVTdHJ1Y3R1cmUgPSB7fTtcclxuICAgICAgICByZWFkRW50cmllcyhyZWFkZXIpO1xyXG4gICAgICB9XHJcbiAgICB9LCBlcnJvckhhbmRsZXIpO1xyXG4gIH07XHJcbiAgXHJcbiAgXHJcblxyXG4gIHJlYWRFbnRyaWVzKGRpclJlYWRlcik7IC8vIFN0YXJ0IHJlYWRpbmcgZGlycy5cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmVFbnRyaWVzKGVudHJpZXMsIGNhbGxiYWNrKSB7XHJcblx0YWxsRW50cmllcyA9IGVudHJpZXM7XHJcblx0Ly9jb25zb2xlLmxvZyhhbGxFbnRyaWVzKTtcclxuXHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGFsbEVudHJpZXMpO1xyXG59XHJcblxyXG4vKioqKioqKioqKioqKioqKiogQ0FDSElORyAqKioqKioqKioqKioqKioqKioqL1xyXG5cclxubS5hZGRGaWxlVG9TeXN0ZW0gPSBmdW5jdGlvbihmaWxlbmFtZSwgZGF0YSwgY2FsbGJhY2spe1xyXG5cclxuXHRjb25zb2xlLmxvZyhcImZzOiBcIiArIGZpbGVTeXN0ZW0ucm9vdCk7XHJcblx0XHJcblx0aWYgKCFmaWxlU3lzdGVtKSB7XHJcblx0XHRyZXRyaWV2ZUZpbGVTeXN0ZW0oZnVuY3Rpb24oKSB7IG0uYWRkRmlsZVRvU3lzdGVtKGZpbGVuYW1lLCBkYXRhLCBjYWxsYmFjayk7IH0pO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHRcclxuXHQvLyBNYWtlIHN1cmUgdGhlIGRpciBleGlzdHMgZmlyc3RcclxuXHR2YXIgZGlycyA9IGZpbGVuYW1lLnN1YnN0cigwLCBmaWxlbmFtZS5sYXN0SW5kZXhPZignXFxcXCcpKS5zcGxpdCgnXFxcXCcpO1xyXG5cdHZhciBjdXJEaXIgPSBmaWxlU3lzdGVtLnJvb3Q7XHJcblx0Zm9yKHZhciBpPTA7aTxkaXJzLmxlbmd0aDtpKyspIHtcclxuXHRcdGNvbnNvbGUubG9nKGN1ckRpci5nZXREaXJlY3RvcnkoZGlyc1tpXSkpOyBcclxuXHRcdGN1ckRpciA9IGN1ckRpci5nZXREaXJlY3RvcnkoZGlyc1tpXSwge2NyZWF0ZTogdHJ1ZSwgZXhjbHVzaXZlOiBmYWxzZX0pO1xyXG5cdH1cclxuXHRcclxuXHQvLyBNYWtlIHN1cmUgbm90IHdvcmtpbmcgd2l0aCBhbiBlbXB0eSBkaXJlY3RvcnlcclxuXHRpZihmaWxlbmFtZS5lbmRzV2l0aCgnXFxcXCcpKVxyXG5cdFx0cmV0dXJuO1xyXG5cclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGZpbGVcclxuXHR2YXIgZmlsZSA9IGN1ckRpci5nZXRGaWxlKGZpbGVuYW1lLnN1YnN0cihmaWxlbmFtZS5sYXN0SW5kZXhPZignXFxcXCcpKzEpLCB7Y3JlYXRlOiB0cnVlfSk7XHJcblx0Ly9maWxlLmNyZWF0ZVdyaXRlcigpLndyaXRlKG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6IGdldE1pbWVUeXBlKGZpbGVuYW1lKX0pKTtcclxuXHQvLyBkYXRhIGlzIGEgYmxvYiBpbiB0aGlzIGNhc2VcclxuXHRmaWxlLmNyZWF0ZVdyaXRlcigpLndyaXRlKGRhdGEpO1xyXG5cdFxyXG5cdC8vIFJldHVybiB0aGUgdXJsIHRvIHRoZSBmaWxlXHJcblx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjayggZmlsZS50b1VSTCgpICk7XHJcbn1cclxuXHJcbi8vIGZpbGVuYW1lIG11c3QgYmUgdGhlIGZ1bGwgZGVzaXJlZCBwYXRoIGZvciB0aGlzIHRvIHdvcmtcclxubS5hZGROZXdGaWxlVG9TeXN0ZW0gPSBmdW5jdGlvbihmaWxlbmFtZSwgZGF0YSwgY2FsbGJhY2spe1xyXG5cdC8vIGlmIHRoZSBwYXRoIHVzZXMgYmFja3NsYXNoZXNcclxuXHRpZiAoZmlsZW5hbWUuaW5kZXhPZihcIlxcXFxcIikgPiAtMSkgXHJcblx0XHRmaWxlbmFtZSA9IFV0aWxpdGllcy5yZXBsYWNlQWxsKGZpbGVuYW1lLFwiXFxcXFwiLFwiL1wiKTtcclxuXHQvLyBpZiB0aGVyZSBpcyBubyBwYXRoXHJcblx0aWYgKGZpbGVuYW1lLmluZGV4T2YoXCIvXCIpIDwgMCkgZmlsZW5hbWUgPSBcImNhc2UvYWN0aXZlL3N1Ym1pdHRlZC9cIitmaWxlbmFtZTtcclxuXHRcclxuXHQvLyBzdG9yZSB0aGUgZGF0YSBpbiBhbiBtb2R1bGUtc2NvcGUgb2JqZWN0IHNvIHRoYXQgYWxsIG9mIHRoZSBjYWxsYmFjayBmdW5jdGlvbnMgY2FuIG1ha2UgdXNlIG9mIGl0XHJcblx0YWRkRmlsZURhdGEuZmlsZW5hbWUgPSBmaWxlbmFtZTtcclxuXHRhZGRGaWxlRGF0YS5kYXRhID0gZGF0YTtcclxuXHRhZGRGaWxlRGF0YS5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cdFxyXG5cdC8vIGRlYnVnXHJcblx0Y29uc29sZS5sb2coXCJhZGRGaWxlVG9TeXN0ZW0oXCIrZmlsZW5hbWUrXCIsIFwiK2RhdGErXCIsIFwiK2NhbGxiYWNrK1wiKVwiKTtcclxuXHQvL3JldHJpZXZlQmFzZURpcihmdW5jdGlvbihkaXIpIHsgYWRkRmlsZVRvRGlyKGZpbGVuYW1lLCBkaXIsIGNhbGxiYWNrKTsgfSApO1xyXG5cdFxyXG5cdC8vIGZpbmQgdGhlIGRpcmVjdG9yeUVudHJ5IHRoYXQgd2lsbCBjb250YWluIHRoZSBmaWxlIGFuZCBjYWxsIGFkZEZpbGVUb0RpciB3aXRoIHRoZSByZXN1bHRcclxuXHRyZXRyaWV2ZUJvdHRvbURpcihhZGRGaWxlVG9EaXIpO1xyXG59XHJcblxyXG4vLyBnZXRzIHRoZSBkaXJlY3Rvcnkgb2YgaW50ZXJlc3RcclxuZnVuY3Rpb24gcmV0cmlldmVCb3R0b21EaXIoY2FsbGJhY2spIHtcclxuXHQvL3dpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCAxMDI0KjEwMjQsIGZ1bmN0aW9uKGZzKSB7IHNldEZpbGVTeXN0ZW0oZnMsIGNhbGxiYWNrKTsgfSwgZXJyb3JIYW5kbGVyKTtcclxuXHRjb25zb2xlLmxvZyhcImJhc2UgVVJMOiBcIiArIGJhc2VVUkwpO1xyXG5cdHZhciBuYW1lID0gYWRkRmlsZURhdGEuZmlsZW5hbWU7XHJcblx0Ly8gZXh0cmFjdCB0aGUgcGF0aCBvZiB0aGUgZGlyZWN0b3J5IHRvIHB1dCB0aGUgZmlsZSBpbiBmcm9tIHRoZSBmaWxlIG5hbWVcclxuXHR2YXIgZXh0ZW5zaW9uID0gbmFtZS5zdWJzdHJpbmcoMCxuYW1lLmxhc3RJbmRleE9mKFwiL1wiKSk7XHJcblx0Ly8gXCJjYXNlXCIgaXMgYWxyZWFkeSBwYXJ0IG9mIHRoZSBiYXNlIHVybFxyXG5cdGlmIChleHRlbnNpb24uaW5kZXhPZihcImNhc2UvXCIpID4gLTEpIHtcclxuXHRcdGV4dGVuc2lvbiA9IGV4dGVuc2lvbi5zdWJzdHJpbmcoNSk7XHJcblx0fVxyXG5cdFxyXG5cdC8vIGRlYnVnXHJcblx0Y29uc29sZS5sb2coXCJleHQ6IFwiICsgZXh0ZW5zaW9uKTtcclxuXHRcclxuXHQvLyBnZXQgdGhlIGRpcmVjdG9yeSBlbnRyeSBmcm9tIHRoZSBmaWxlc3lzdGVtIGNhbGxiYWNrXHJcblx0d2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwoYmFzZVVSTCtleHRlbnNpb24sIGNhbGxiYWNrKTtcclxufVxyXG5cclxuLy8gYWRkIHRoZSBmaWxlXHJcbmZ1bmN0aW9uIGFkZEZpbGVUb0RpcihkaXIpIHtcclxuXHJcblx0Ly8gc2hvcnRoYW5kXHJcblx0dmFyIGZpbGVuYW1lID0gYWRkRmlsZURhdGEuZmlsZW5hbWU7XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImFkZEZpbGVUb0RpcihcIitmaWxlbmFtZStcIiwgXCIrZGlyK1wiKVwiKTtcclxuXHRcclxuXHQvLyByZWxpYyBmcm9tIGxlZ2FjeSBjb2RlXHJcblx0dmFyIGN1ckRpciA9IGRpcjtcclxuXHRcclxuXHQvLyBkZWJ1Z1xyXG5cdGNvbnNvbGUubG9nKFwiY3VyZGlyOiBcIiAgKyBjdXJEaXIubmFtZSk7XHJcblx0XHJcblx0Ly8gTWFrZSBzdXJlIG5vdCB3b3JraW5nIHdpdGggYW4gZW1wdHkgZGlyZWN0b3J5XHJcblx0aWYoZmlsZW5hbWUuZW5kc1dpdGgoJ1xcXFwnKSlcclxuXHRcdHJldHVybjtcclxuXHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlXHJcblx0dmFyIGZpbGUgPSBjdXJEaXIuZ2V0RmlsZShmaWxlbmFtZS5zdWJzdHIoZmlsZW5hbWUubGFzdEluZGV4T2YoJy8nKSsxKSwge2NyZWF0ZTogdHJ1ZX0sIGNyZWF0ZVdyaXRlcik7XHJcblx0XHJcblx0XHJcblx0Ly92YXIgZmlsZSA9IGN1ckRpci5nZXRGaWxlKGZpbGVuYW1lLCB7Y3JlYXRlOiB0cnVlfSwgY3JlYXRlV3JpdGVyKTsgLy8gZnVuY3Rpb24oZmlsZUVudHJ5KSB7IHdyaXRlRmlsZShmaWxlRW50cnksIGNhbGxiYWNrKTsgfSk7XHJcblx0Lypjb25zb2xlLmxvZyhmaWxlKTtcclxuXHQvL2ZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUobmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogZ2V0TWltZVR5cGUoZmlsZW5hbWUpfSkpO1xyXG5cdC8vIGRhdGEgaXMgYSBibG9iIGluIHRoaXMgY2FzZVxyXG5cdGZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUoZGF0YSk7XHJcblx0XHJcblx0Ly8gUmV0dXJuIHRoZSB1cmwgdG8gdGhlIGZpbGVcclxuXHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCBmaWxlLnRvVVJMKCkgKTtcclxuXHJcblx0Y2FsbGJhY2soIGZpbGUudG9VUkwoKSApOyovXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVdyaXRlcihmaWxlKSB7XHJcblx0Y29uc29sZS5sb2coZmlsZSk7XHJcblx0ZmlsZS5jcmVhdGVXcml0ZXIod3JpdGVGaWxlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGVXcml0ZXIpIHtcclxuXHRjb25zb2xlLmxvZyhmaWxlV3JpdGVyKTtcclxuXHRmaWxlV3JpdGVyLm9ud3JpdGVlbmQgPSBmdW5jdGlvbiAoZSkgeyBjb25zb2xlLmxvZyhcIndyaXRlIGNvbXBsZXRlZFwiKTsgfVxyXG5cdGZpbGVXcml0ZXIub25lcnJvciA9IGZ1bmN0aW9uIChlKSB7IGNvbnNvbGUubG9nKFwid3JpdGVyIGVycm9yOiBcIiArIGUudG9TdHJpbmcoKSk7IH1cclxuXHQvL2ZpbGVXcml0ZXIud3JpdGUobmV3IEJsb2IoW2FkZEZpbGVEYXRhLmRhdGFdLCB7dHlwZTogZ2V0TWltZVR5cGUoYWRkRmlsZURhdGEuZmlsZW5hbWUpfSkpO1xyXG5cdC8vIGRhdGEgaXMgYSBibG9iIGluIHRoaXMgY2FzZVxyXG5cdGZpbGVXcml0ZXIud3JpdGUoYWRkRmlsZURhdGEuZGF0YSk7XHJcblx0XHJcblx0Ly8gUmV0dXJuIHRoZSB1cmwgdG8gdGhlIGZpbGVcclxuXHRpZiAoYWRkRmlsZURhdGEuY2FsbGJhY2spIGNhbGxiYWNrKCBmaWxlLnRvVVJMKCkgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0QmFzZShlbnRyeSwgY2FsbGJhY2spIHtcclxuXHRiYXNlRGlyID0gZW50cnk7XHJcblx0Y2FsbGJhY2soKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZEZpbGVTeXN0ZW0odHlwZSwgc2l6ZSwgY3VyQ2FzZSl7XHJcblx0Ly8gTG9hZCB0aGUgZmlsZSBzeXN0ZW1cclxuXHRmaWxlU3lzdGVtID0gc2VsZi5yZXF1ZXN0RmlsZVN5c3RlbVN5bmModHlwZSwgc2l6ZSk7XHJcblx0XHJcblx0Ly8gV3JpdGUgdGhlIGZpbGVzXHJcblx0dmFyIHVybHMgPSB7fTtcclxuXHRmb3IgKHZhciBmaWxlIGluIGN1ckNhc2UuZmlsZXMpIHtcclxuXHRcdGlmICghY3VyQ2FzZS5maWxlcy5oYXNPd25Qcm9wZXJ0eShmaWxlKSkgY29udGludWU7XHJcblx0XHR1cmxzW2ZpbGVdID0gYWRkRmlsZVRvU3lzdGVtKGZpbGUsIGN1ckNhc2UuZmlsZShmaWxlKS5hc0FycmF5QnVmZmVyKCksIGZpbGVTeXN0ZW0pO1xyXG5cdH1cclxuXHRcclxuXHQvLyByZXR1cm4gdGhlIHVybHMgdG8gdGhlIGZpbGVzXHJcblx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHVybHMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRNaW1lVHlwZShmaWxlKXtcclxuXHRzd2l0Y2goZmlsZS5zdWJzdHIoZmlsZS5sYXN0SW5kZXhPZignLicpKzEpKXtcclxuXHRcdGNhc2UgJ3BuZyc6XHJcblx0XHRcdHJldHVybiAnaW1hZ2UvcG5nJztcclxuXHRcdGNhc2UgJ2pwZWcnOlxyXG5cdFx0Y2FzZSAnanBnJzpcclxuXHRcdFx0cmV0dXJuICdpbWFnZS9qcGVnJztcclxuXHRcdGNhc2UgJ3BkZic6XHJcblx0XHRcdHJldHVybiAnYXBwbGljYXRpb24vcGRmJztcclxuXHRcdGNhc2UgJ2RvY3gnOlxyXG5cdFx0Y2FzZSAnZG9jJzpcclxuXHRcdFx0cmV0dXJuICdhcHBsaWNhdGlvbi9tc3dvcmQnO1xyXG5cdFx0Y2FzZSAncnRmJzpcclxuXHRcdFx0cmV0dXJuICd0ZXh0L3JpY2h0ZXh0JztcclxuXHRcdGNhc2UgJ2lwYXJkYXRhJzpcclxuXHRcdFx0cmV0dXJuICd0ZXh0L3htbCc7XHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHRyZXR1cm4gJ3RleHQvcGxhaW4nO1xyXG5cdH1cclxufVxyXG5cclxuXHJcbi8qZnVuY3Rpb24gc2VsZWN0U2F2ZUxvY2F0aW9uIChkYXRhKSB7XHJcblxyXG5cdGNvbnNvbGUubG9nKFwic2VsZWN0U2F2ZUxvY2F0aW9uXCIpO1xyXG5cclxuXHQvLyBNYWtlIHN1cmUgdGhlIG5lZWQgQVBJcyBhcmUgc3VwcG9ydGVkXHJcblx0aWYoIXdpbmRvdy5GaWxlIHx8ICF3aW5kb3cuRmlsZVJlYWRlciB8fCAhd2luZG93LkZpbGVMaXN0IHx8ICF3aW5kb3cuQmxvYiB8fCAhd2luZG93LkFycmF5QnVmZmVyIHx8ICF3aW5kb3cuV29ya2VyKXtcclxuXHRcdGFsZXJ0KCdUaGUgRmlsZSBBUElzIG5lZWQgdG8gbG9hZCBmaWxlcyBhcmUgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXIhJyk7XHJcblx0XHQvL2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9hZC1idXR0b25cIikuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdH1cclxuXHRlbHNle1xyXG5cdFx0Y29uc29sZS5sb2cgKFwic2VsZWN0aW5nU2F2ZUxvY2F0aW9uXCIpO1xyXG5cdFxyXG5cdFx0Ly8gR2V0IHRoZSBsb2FkIGJ1dHRvbiBhbmQgaW5wdXRcclxuXHRcdHZhciBsb2FkSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9hZC1pbnB1dCcpO1xyXG5cclxuXHRcdC8vIGxvYWQgaW5wdXQgaXMgaGlkZGVuLCBzbyBjbGljayBpdFxyXG5cdFx0bG9hZElucHV0LmNsaWNrKCk7XHJcblx0XHRcclxuXHRcdC8vIFdoZW4gbG9hZCBpbnB1dCBmaWxlIGlzIGNob3NlbiwgbG9hZCB0aGUgZmlsZVxyXG5cdFx0bG9hZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFx0XHJcblx0XHRcdC8vIE1ha2Ugc3VyZSBhIGlwYXIgZmlsZSB3YXMgY2hvb3NlblxyXG5cdFx0XHRpZighbG9hZElucHV0LnZhbHVlLmVuZHNXaXRoKFwiaXBhclwiKSl7XHJcblx0XHRcdFx0YWxlcnQoXCJZb3UgZGlkbid0IGNob29zZSBhbiBpcGFyIGZpbGUhIHlvdSBjYW4gb25seSBsb2FkIGlwYXIgZmlsZXMhXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU2F2ZSB0aGUgemlwIGZpbGUncyBuYW1lIHRvIGxvY2FsIHN0b3JhZ2UgXHJcblx0XHRcdC8vIE5PVEU6IHRoaXMgd2lsbCBvdmVyd3JpdGUgdGhlIG9sZCBuYW1lLCBcclxuXHRcdFx0Ly8gICAgc28gaWYgdGhlIHVzZXIgY2hvb3NlcyBhIGRpZmZlcmVudCBmaWxlLCB0aGlzIGNvdWxkIGxlYWQgdG8gZXJyb3JzXHJcblx0XHRcdGxvY2FsU3RvcmFnZVsnY2FzZU5hbWUnXSA9IGxvYWRJbnB1dC5maWxlc1swXS5uYW1lO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gUmVhZCB0aGUgemlwXHJcblx0XHRcdEpTWmlwLmxvYWRBc3luYyhsb2FkSW5wdXQuZmlsZXNbMF0pXHJcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHppcCkge1xyXG5cdFx0XHRcdC8vIGJhY2tzbGFzaGVzIHBlciB6aXAgZmlsZSBwcm90b2NvbFxyXG5cdFx0XHRcdHppcC5maWxlKFwiY2FzZVxcXFxhY3RpdmVcXFxcc2F2ZUZpbGUuaXBhcmRhdGFcIixkYXRhKTtcclxuXHRcdFx0XHQvLyBkb3dubG9hZCB0aGUgZmlsZVxyXG5cdFx0XHRcdGRvd25sb2FkKHppcCk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly9yZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZXZlbnQudGFyZ2V0LmZpbGVzWzBdKTtcclxuXHRcdFx0XHJcblx0XHR9LCBmYWxzZSk7XHJcblx0fVxyXG59Ki8iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIEJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZC5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcbnZhciBMZXNzb25Ob2RlID0gcmVxdWlyZSgnLi9sZXNzb25Ob2RlLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoJy4vZHJhd2xpYi5qcycpO1xyXG52YXIgRGF0YVBhcnNlciA9IHJlcXVpcmUoJy4vaXBhckRhdGFQYXJzZXIuanMnKTtcclxudmFyIE1vdXNlU3RhdGUgPSByZXF1aXJlKCcuL21vdXNlU3RhdGUuanMnKTtcclxudmFyIEZpbGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9maWxlTWFuYWdlci5qcycpO1xyXG5cclxuLy9tb3VzZSBtYW5hZ2VtZW50XHJcbnZhciBtb3VzZVN0YXRlO1xyXG52YXIgcHJldmlvdXNNb3VzZVN0YXRlO1xyXG52YXIgZHJhZ2dpbmdEaXNhYmxlZDtcclxudmFyIG1vdXNlVGFyZ2V0O1xyXG52YXIgbW91c2VTdXN0YWluZWREb3duO1xyXG5cclxuLy9waGFzZSBoYW5kbGluZ1xyXG52YXIgcGhhc2VPYmplY3Q7XHJcblxyXG5mdW5jdGlvbiBnYW1lKHVybCwgY2FudmFzLCB3aW5kb3dEaXYpe1xyXG5cdHZhciBnYW1lID0gdGhpcztcclxuXHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xyXG5cdHRoaXMubW91c2VTdGF0ZSA9IG5ldyBNb3VzZVN0YXRlKGNhbnZhcyk7XHJcblx0RmlsZU1hbmFnZXIubG9hZENhc2UodXJsLCB3aW5kb3dEaXYsIGZ1bmN0aW9uKGNhdGVnb3JpZXMsIHN0YWdlKXtcclxuXHRcdGdhbWUuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXM7XHJcblx0XHRnYW1lLmNyZWF0ZUxlc3Nvbk5vZGVzKCk7XHJcblx0fSk7XHJcbn1cclxuXHJcbnZhciBwID0gZ2FtZS5wcm90b3R5cGU7XHJcblxyXG5wLmNyZWF0ZUxlc3Nvbk5vZGVzID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLmJvYXJkQXJyYXkgPSBbXTtcclxuXHR2YXIgYm90dG9tQmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib3R0b21CYXJcIik7XHJcblx0Zm9yKHZhciBpPTA7aTx0aGlzLmNhdGVnb3JpZXMubGVuZ3RoO2krKyl7XHJcblx0XHQvLyBpbml0aWFsaXplIGVtcHR5XHJcblx0XHRcclxuXHRcdHRoaXMubGVzc29uTm9kZXMgPSBbXTtcclxuXHRcdC8vIGFkZCBhIG5vZGUgcGVyIHF1ZXN0aW9uXHJcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnMubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0Ly8gY3JlYXRlIGEgbmV3IGxlc3NvbiBub2RlXHJcblx0XHRcdHRoaXMubGVzc29uTm9kZXMucHVzaChuZXcgTGVzc29uTm9kZShuZXcgUG9pbnQodGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXS5wb3NpdGlvblBlcmNlbnRYLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLnBvc2l0aW9uUGVyY2VudFkpLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLmltYWdlTGluaywgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXSApICk7XHJcblx0XHRcdC8vIGF0dGFjaCBxdWVzdGlvbiBvYmplY3QgdG8gbGVzc29uIG5vZGVcclxuXHRcdFx0dGhpcy5sZXNzb25Ob2Rlc1t0aGlzLmxlc3Nvbk5vZGVzLmxlbmd0aC0xXS5xdWVzdGlvbiA9IHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal07XHJcblx0XHRcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjcmVhdGUgYSBib2FyZFxyXG5cdFx0dGhpcy5ib2FyZEFycmF5LnB1c2gobmV3IEJvYXJkKG5ldyBQb2ludChjYW52YXMud2lkdGgvKDIqdGhpcy5zY2FsZSksY2FudmFzLmhlaWdodC8oMip0aGlzLnNjYWxlKSksIHRoaXMubGVzc29uTm9kZXMpKTtcclxuXHRcdHZhciBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiQlVUVE9OXCIpO1xyXG5cdFx0YnV0dG9uLmlubmVySFRNTCA9IHRoaXMuY2F0ZWdvcmllc1tpXS5uYW1lO1xyXG5cdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0YnV0dG9uLm9uY2xpY2sgPSAoZnVuY3Rpb24oaSl7IFxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0aWYoZ2FtZS5hY3RpdmUpe1xyXG5cdFx0XHRcdFx0Z2FtZS5hY3RpdmVCb2FyZEluZGV4ID0gaTtcclxuXHRcdFx0XHRcdGlmKGdhbWUub25DaGFuZ2VCb2FyZClcclxuXHRcdFx0XHRcdFx0Z2FtZS5vbkNoYW5nZUJvYXJkKCk7XHJcblx0XHRcdFx0XHRnYW1lLnVwZGF0ZU5vZGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHR9fSkoaSk7XHJcblx0XHRpZighdGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0uZmluaXNoZWQpXHJcblx0XHRcdGJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHRib3R0b21CYXIuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcclxuXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTFdLmJ1dHRvbiA9IGJ1dHRvbjtcclxuXHRcdHZhciBnYW1lID0gdGhpcztcclxuXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTFdLnVwZGF0ZU5vZGUgPSBmdW5jdGlvbigpe2dhbWUudXBkYXRlTm9kZSgpO307XHJcblx0fVxyXG5cdHRoaXMuYWN0aXZlQm9hcmRJbmRleCA9IDA7XHJcblx0dGhpcy5hY3RpdmUgPSB0cnVlO1xyXG5cdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdGlmKGdhbWUub25DaGFuZ2VCb2FyZClcclxuXHRcdGdhbWUub25DaGFuZ2VCb2FyZCgpO1xyXG5cdHRoaXMudXBkYXRlTm9kZSgpO1xyXG5cdFxyXG5cdC8vIHJlYWR5IHRvIHNhdmVcclxuXHRGaWxlTWFuYWdlci5wcmVwYXJlWmlwKHRoaXMuYm9hcmRBcnJheSk7XHJcbn1cclxuXHJcbnAudXBkYXRlWm9vbSA9IGZ1bmN0aW9uKG5ld1pvb20pe1xyXG5cdGlmKHRoaXMuYWN0aXZlKVxyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbSA9IG5ld1pvb207XHJcbn1cclxuXHJcbnAuZ2V0Wm9vbSA9IGZ1bmN0aW9uKCl7XHJcblx0cmV0dXJuIHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb207XHJcbn1cclxuXHJcbnAudXBkYXRlID0gZnVuY3Rpb24oY3R4LCBjYW52YXMsIGR0KXtcclxuXHRcclxuXHRpZih0aGlzLmFjdGl2ZSl7XHJcblx0XHRcclxuXHQgICAgLy8gVXBkYXRlIHRoZSBtb3VzZSBzdGF0ZVxyXG5cdFx0dGhpcy5tb3VzZVN0YXRlLnVwZGF0ZShkdCwgdGhpcy5zY2FsZSp0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS56b29tKTtcclxuXHRcdFxyXG5cdFx0aWYgKHRoaXMubW91c2VTdGF0ZS5tb3VzZUNsaWNrZWQpIHtcclxuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJhdXRvc2F2ZVwiLERhdGFQYXJzZXIuY3JlYXRlWE1MU2F2ZUZpbGUodGhpcy5ib2FyZEFycmF5LCBmYWxzZSkpO1xyXG5cdFx0XHQvL2NvbnNvbGUubG9nKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b3NhdmVcIikpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0ICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBib2FyZCAoZ2l2ZSBpdCB0aGUgbW91c2Ugb25seSBpZiBub3Qgem9vbWluZylcclxuXHQgICAgdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYWN0KCh0aGlzLnpvb21pbiB8fCB0aGlzLnpvb21vdXQgPyBudWxsIDogdGhpcy5tb3VzZVN0YXRlKSwgZHQpO1xyXG5cdCAgICBcclxuXHQgICAgLy8gQ2hlY2sgaWYgbmV3IGJvYXJkIGF2YWlsYWJsZVxyXG5cdCAgICBpZih0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPCB0aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTEgJiZcclxuXHQgICAgXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrMV0uYnV0dG9uLmRpc2FibGVkICYmIFxyXG5cdCAgICBcdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uZmluaXNoZWQpXHJcblx0ICAgIFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleCsxXS5idXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRcdFxyXG5cclxuXHRcdC8vIElmIHRoZSBib2FyZCBpcyBkb25lIHpvb20gb3V0IHRvIGNlbnRlclxyXG5cdFx0aWYodGhpcy56b29tb3V0KXtcclxuXHRcdFx0XHJcblx0XHRcdC8vIEdldCB0aGUgY3VycmVudCBib2FyZFxyXG5cdFx0XHR2YXIgYm9hcmQgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFpvb20gb3V0IGFuZCBtb3ZlIHRvd2FyZHMgY2VudGVyXHJcblx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPkNvbnN0YW50cy5zdGFydFpvb20pXHJcblx0XHRcdFx0Ym9hcmQuem9vbSAtPSBkdCpDb25zdGFudHMuem9vbVNwZWVkO1xyXG5cdFx0XHRlbHNlIGlmKHRoaXMuZ2V0Wm9vbSgpPENvbnN0YW50cy5zdGFydFpvb20pXHJcblx0XHRcdFx0Ym9hcmQuem9vbSA9IENvbnN0YW50cy5zdGFydFpvb207XHJcblx0XHRcdGJvYXJkLm1vdmVUb3dhcmRzKG5ldyBQb2ludChDb25zdGFudHMuYm9hcmRTaXplLngvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpLCBkdCwgQ29uc3RhbnRzLnpvb21Nb3ZlU3BlZWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2FsbCB0aGUgY2hhbmdlIG1ldGhvZFxyXG5cdFx0XHRpZih0aGlzLm9uQ2hhbmdlQm9hcmQpXHJcblx0XHRcdFx0dGhpcy5vbkNoYW5nZUJvYXJkKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiBmdWxseSB6b29tZWQgb3V0IGFuZCBpbiBjZW50ZXIgc3RvcFxyXG5cdFx0XHRpZih0aGlzLmdldFpvb20oKT09Q29uc3RhbnRzLnN0YXJ0Wm9vbSAmJiBib2FyZC5ib2FyZE9mZnNldC54PT1Db25zdGFudHMuYm9hcmRTaXplLngvMiAmJiBib2FyZC5ib2FyZE9mZnNldC55PT1Db25zdGFudHMuYm9hcmRTaXplLnkvMil7XHRcdFx0XHRcclxuXHRcdFx0XHR0aGlzLnpvb21vdXQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fSAvLyBJZiB0aGVyZSBpcyBhIG5ldyBub2RlIHpvb20gaW50byBpdFxyXG5cdFx0ZWxzZSBpZih0aGlzLnpvb21pbil7IFxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gR2V0IHRoZSBjdXJyZW50IGJvYXJkXHJcblx0XHRcdHZhciBib2FyZCA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgYm9hcmQgaXMgbm90IGZpbmlzaGVkIGxvb2sgZm9yIG5leHQgbm9kZVxyXG5cdFx0XHRpZighYm9hcmQuZmluaXNoZWQgJiYgdGhpcy50YXJnZXROb2RlPT1udWxsKXtcclxuXHRcdFx0XHR0aGlzLnRhcmdldE5vZGUgPSBib2FyZC5nZXRGcmVlTm9kZSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoYm9hcmQuZmluaXNoZWQpe1xyXG5cdFx0XHRcdHRoaXMuem9vbWluID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy56b29tb3V0ID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU3RhcnQgbW92aW5nIGFuZCB6b29taW5nIGlmIHRhcmdldCBmb3VuZFxyXG5cdFx0XHRpZih0aGlzLnpvb21pbiAmJiB0aGlzLnRhcmdldE5vZGUpe1xyXG5cdFx0XHJcblx0XHRcdFx0Ly8gWm9vbSBpbiBhbmQgbW92ZSB0b3dhcmRzIHRhcmdldCBub2RlXHJcblx0XHRcdFx0aWYodGhpcy5nZXRab29tKCk8Q29uc3RhbnRzLmVuZFpvb20pXHJcblx0XHRcdFx0XHRib2FyZC56b29tICs9IGR0KkNvbnN0YW50cy56b29tU3BlZWQ7XHJcblx0XHRcdFx0ZWxzZSBpZih0aGlzLmdldFpvb20oKT5Db25zdGFudHMuZW5kWm9vbSlcclxuXHRcdFx0XHRcdGJvYXJkLnpvb20gPSBDb25zdGFudHMuZW5kWm9vbTtcclxuXHRcdFx0XHRib2FyZC5tb3ZlVG93YXJkcyh0aGlzLnRhcmdldE5vZGUucG9zaXRpb24sIGR0LCBDb25zdGFudHMuem9vbU1vdmVTcGVlZCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gQ2FsbCB0aGUgY2hhbmdlIG1ldGhvZFxyXG5cdFx0XHRcdGlmKHRoaXMub25DaGFuZ2VCb2FyZClcclxuXHRcdFx0XHRcdHRoaXMub25DaGFuZ2VCb2FyZCgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIElmIHJlYWNoZWQgdGhlIG5vZGUgYW5kIHpvb21lZCBpbiBzdG9wIGFuZCBnZXQgcmlkIG9mIHRoZSB0YXJnZXRcclxuXHRcdFx0XHRpZih0aGlzLmdldFpvb20oKT09Q29uc3RhbnRzLmVuZFpvb20gJiYgYm9hcmQuYm9hcmRPZmZzZXQueD09dGhpcy50YXJnZXROb2RlLnBvc2l0aW9uLnggJiYgYm9hcmQuYm9hcmRPZmZzZXQueT09dGhpcy50YXJnZXROb2RlLnBvc2l0aW9uLnkpe1xyXG5cdFx0XHRcdFx0dGhpcy56b29taW4gPSBmYWxzZTtcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0Tm9kZSA9IG51bGw7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0ICAgIFxyXG5cdCAgICAvLyBkcmF3IHN0dWZmIG5vIG1hdHRlciB3aGF0XHJcblx0ICAgIHRoaXMuZHJhdyhjdHgsIGNhbnZhcyk7XHJcblx0fVxyXG59XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcblx0XHJcblx0Ly8gRHJhdyB0aGUgYmFja2dyb3VuZFxyXG5cdERyYXdMaWIucmVjdChjdHgsIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCwgXCIjMTU3MThGXCIpO1xyXG4gICAgXHJcblx0Ly8gU2NhbGUgdGhlIGdhbWVcclxuXHRjdHguc2F2ZSgpO1xyXG5cdGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoLzIsIGNhbnZhcy5oZWlnaHQvMik7XHJcblx0Y3R4LnNjYWxlKHRoaXMuc2NhbGUsIHRoaXMuc2NhbGUpO1xyXG5cdGN0eC50cmFuc2xhdGUoLWNhbnZhcy53aWR0aC8yLCAtY2FudmFzLmhlaWdodC8yKTtcclxuXHQvL2N0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoKnRoaXMuc2NhbGUtY2FudmFzLndpZHRoLCBjYW52YXMud2lkdGgqdGhpcy5zY2FsZS1jYW52YXMud2lkdGgpO1xyXG5cdFxyXG4gICAgLy8gRHJhdyB0aGUgY3VycmVudCBib2FyZFxyXG4gICAgdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uZHJhdyhjdHgsIGNhbnZhcyk7XHJcblxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxucC51cGRhdGVOb2RlID0gZnVuY3Rpb24oKXtcclxuXHR0aGlzLnpvb21pbiA9IHRydWU7XHJcbn1cclxuXHJcbnAud2luZG93Q2xvc2VkID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIGZpbGVUb1N0b3JlID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0ud2luZG93Q2xvc2VkKCk7XHJcblx0aWYgKGZpbGVUb1N0b3JlKSB7XHJcblx0XHRGaWxlTWFuYWdlci5hZGROZXdGaWxlVG9TeXN0ZW0oXHRcdCAgLy8gbmVlZCB0byBzdG9yZSBudW1iZXIgb2YgZmlsZXNcclxuXHRcdFx0XCJcIit0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrXCItXCIrZmlsZVRvU3RvcmUubnVtK1wiLVwiK1wiMFwiK2ZpbGVUb1N0b3JlLmV4dCxcclxuXHRcdFx0ZmlsZVRvU3RvcmUuYmxvYik7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQ2F0ZWdvcnkgPSByZXF1aXJlKFwiLi9jYXRlZ29yeS5qc1wiKTtcclxudmFyIFJlc291cmNlID0gcmVxdWlyZShcIi4vcmVzb3VyY2VzLmpzXCIpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoJy4vcXVlc3Rpb24uanMnKTtcclxudmFyIFF1ZXN0aW9uV2luZG93cyA9IHJlcXVpcmUoJy4vcXVlc3Rpb25XaW5kb3dzLmpzJyk7XHJcbndpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMICA9IHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMIHx8IHdpbmRvdy53ZWJraXRSZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMO1xyXG5cclxuLy8gUGFyc2VzIHRoZSB4bWwgY2FzZSBmaWxlc1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIGtub3duIHRhZ3NcclxuLypcclxuYW5zd2VyXHJcbmJ1dHRvblxyXG5jYXRlZ29yeUxpc3RcclxuY29ubmVjdGlvbnNcclxuZWxlbWVudFxyXG5mZWVkYmFja1xyXG5pbnN0cnVjdGlvbnNcclxucmVzb3VyY2VcclxucmVzb3VyY2VMaXN0XHJcbnJlc291cmNlSW5kZXhcclxuc29mdHdhcmVMaXN0XHJcbnF1ZXN0aW9uXHJcbnF1ZXN0aW9uVGV4dFxyXG5xdXN0aW9uTmFtZVxyXG4qL1xyXG5cclxuLy8gY29udmVyc2lvblxyXG52YXIgc3RhdGVDb252ZXJ0ZXIgPSB7XHJcblx0XCJoaWRkZW5cIiA6IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTixcclxuXHRcInVuc29sdmVkXCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQsXHJcblx0XCJjb3JyZWN0XCIgOiAgUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEXHJcbn1cclxuLy8gY29udmVyc2lvblxyXG52YXIgcmV2ZXJzZVN0YXRlQ29udmVydGVyID0gW1wiaGlkZGVuXCIsIFwidW5zb2x2ZWRcIiwgXCJjb3JyZWN0XCJdO1xyXG5cclxuLy8gTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cdFx0XHRcdFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBzZXQgdGhlIHF1ZXN0aW9uIHN0YXRlc1xyXG5tLmFzc2lnblF1ZXN0aW9uU3RhdGVzID0gZnVuY3Rpb24oY2F0ZWdvcmllcywgcXVlc3Rpb25FbGVtcykge1xyXG5cdGNvbnNvbGUubG9nKFwicWVsZW1zOiBcIiArIHF1ZXN0aW9uRWxlbXMubGVuZ3RoKTtcclxuXHR2YXIgdGFsbHkgPSAwOyAvLyB0cmFjayB0b3RhbCBpbmRleCBpbiBuZXN0ZWQgbG9vcFxyXG5cdFxyXG5cdC8vIGFsbCBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8Y2F0ZWdvcmllcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Zm9yICh2YXIgaj0wOyBqPGNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zLmxlbmd0aDsgaisrLCB0YWxseSsrKSB7XHJcblx0XHRcclxuXHRcdFx0Ly8gc3RvcmUgcXVlc3Rpb24gIGZvciBlYXN5IHJlZmVyZW5jZVxyXG5cdFx0XHR2YXIgcSA9IGNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc3RvcmUgdGFnIGZvciBlYXN5IHJlZmVyZW5jZVxyXG5cdFx0XHR2YXIgcUVsZW0gPSBxdWVzdGlvbkVsZW1zW3RhbGx5XTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIHBvc2l0aW9uIGlzIGxlc3MgdGhhbiB6ZXJvIGRvbid0IGxvYWQgdGhlIHF1ZXN0aW9uXHJcblx0XHRcdGlmKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFhcIikpPDAgfHwgXHJcblx0XHRcdFx0XHRwYXJzZUludChxRWxlbS5nZXRBdHRyaWJ1dGUoXCJwb3NpdGlvblBlcmNlbnRZXCIpKTwwKVxyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gc3RhdGVcclxuXHRcdFx0cS5jdXJyZW50U3RhdGUgPSBzdGF0ZUNvbnZlcnRlcltxRWxlbS5nZXRBdHRyaWJ1dGUoXCJxdWVzdGlvblN0YXRlXCIpXTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGp1c3RpZmljYXRpb25cclxuXHRcdFx0aWYocS5qdXN0aWZpY2F0aW9uKVxyXG5cdFx0XHRcdHEuanVzdGlmaWNhdGlvbi52YWx1ZSA9IHFFbGVtLmdldEF0dHJpYnV0ZShcImp1c3RpZmljYXRpb25cIik7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDYWxsIGNvcnJlY3QgYW5zd2VyIGlmIHN0YXRlIGlzIGNvcnJlY3RcclxuXHRcdFx0aWYocS5jdXJyZW50U3RhdGU9PVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0ICBxLmNvcnJlY3RBbnN3ZXIoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0Ly8geHBvc1xyXG5cdFx0XHRxLnBvc2l0aW9uUGVyY2VudFggPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFhcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueCk7XHJcblx0XHRcdC8vIHlwb3NcclxuXHRcdFx0cS5wb3NpdGlvblBlcmNlbnRZID0gVXRpbGl0aWVzLm1hcChwYXJzZUludChxRWxlbS5nZXRBdHRyaWJ1dGUoXCJwb3NpdGlvblBlcmNlbnRZXCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnkpO1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIHRha2VzIHRoZSB4bWwgc3RydWN0dXJlIGFuZCBmaWxscyBpbiB0aGUgZGF0YSBmb3IgdGhlIHF1ZXN0aW9uIG9iamVjdFxyXG5tLmdldENhdGVnb3JpZXNBbmRRdWVzdGlvbnMgPSBmdW5jdGlvbihyYXdEYXRhLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cykge1xyXG5cdC8vIGlmIHRoZXJlIGlzIGEgY2FzZSBmaWxlXHJcblx0aWYgKHJhd0RhdGEgIT0gbnVsbCkge1xyXG5cdFx0XHJcblx0XHQvLyBGaXJzdCBsb2FkIHRoZSByZXNvdXJjZXNcclxuXHRcdHZhciByZXNvdXJjZUVsZW1lbnRzID0gcmF3RGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInJlc291cmNlTGlzdFwiKVswXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInJlc291cmNlXCIpO1xyXG5cdFx0dmFyIHJlc291cmNlcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaT0wOyBpPHJlc291cmNlRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Ly8gTG9hZCBlYWNoIHJlc291cmNlXHJcblx0XHRcdHJlc291cmNlc1tpXSA9IG5ldyBSZXNvdXJjZShyZXNvdXJjZUVsZW1lbnRzW2ldLCB1cmwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBUaGVuIGxvYWQgdGhlIGNhdGVnb3JpZXNcclxuXHRcdHZhciBjYXRlZ29yeUVsZW1lbnRzID0gcmF3RGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5XCIpO1xyXG5cdFx0dmFyIGNhdGVnb3J5TmFtZXMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlMaXN0XCIpWzBdLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZWxlbWVudFwiKTtcclxuXHRcdHZhciBjYXRlZ29yaWVzID0gW107XHJcblx0XHRmb3IgKHZhciBpPTA7IGk8Y2F0ZWdvcnlFbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQvLyBMb2FkIGVhY2ggY2F0ZWdvcnkgKHdoaWNoIGxvYWRzIGVhY2ggcXVlc3Rpb24pXHJcblx0XHRcdGNhdGVnb3JpZXNbaV0gPSBuZXcgQ2F0ZWdvcnkoY2F0ZWdvcnlOYW1lc1tpXS5pbm5lckhUTUwsIGNhdGVnb3J5RWxlbWVudHNbaV0sIHJlc291cmNlcywgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3MpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNhdGVnb3JpZXM7XHJcblx0fVxyXG5cdHJldHVybiBudWxsXHJcbn1cclxuXHJcbi8vIGNyZWF0ZXMgYSBjYXNlIGZpbGUgZm9yIHppcHBpbmdcclxubS5yZWNyZWF0ZUNhc2VGaWxlID0gZnVuY3Rpb24oYm9hcmRzKSB7XHJcblxyXG5cdC8vIGNyZWF0ZSBzYXZlIGZpbGUgdGV4dFxyXG5cdHZhciBkYXRhVG9TYXZlID0gbS5jcmVhdGVYTUxTYXZlRmlsZShib2FyZHMsIHRydWUpO1xyXG5cdFxyXG5cdGNvbnNvbGUubG9nIChcInNhdmVEYXRhLmlwYXIgZGF0YSBjcmVhdGVkXCIpO1xyXG5cdFxyXG5cdC8vaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhkYXRhVG9TYXZlKTtcclxuXHRyZXR1cm4gZGF0YVRvU2F2ZTtcclxuXHRcclxufVxyXG5cclxuLy8gY3JlYXRlcyB0aGUgeG1sXHJcbm0uY3JlYXRlWE1MU2F2ZUZpbGUgPSBmdW5jdGlvbihib2FyZHMsIGluY2x1ZGVOZXdsaW5lKSB7XHJcblx0Ly8gbmV3bGluZVxyXG5cdHZhciBubDtcclxuXHRpbmNsdWRlTmV3bGluZSA/IG5sID0gXCJcXG5cIiA6IG5sID0gXCJcIjtcclxuXHQvLyBoZWFkZXJcclxuXHR2YXIgb3V0cHV0ID0gJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cInV0Zi04XCI/PicgKyBubDtcclxuXHQvLyBjYXNlIGRhdGFcclxuXHRvdXRwdXQgKz0gJzxjYXNlIGNhdGVnb3J5SW5kZXg9XCIzXCIgY2FzZVN0YXR1cz1cIjFcIiBwcm9maWxlRmlyc3Q9XCJqXCIgcHJvZmlsZUxhc3Q9XCJqXCIgcHJvZmlsZU1haWw9XCJqXCI+JyArIG5sO1xyXG5cdC8vIHF1ZXN0aW9ucyBoZWFkZXJcclxuXHRvdXRwdXQgKz0gJzxxdWVzdGlvbnM+JyArIG5sO1xyXG5cdFxyXG5cdC8vIGxvb3AgdGhyb3VnaCBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8Ym9hcmRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRmb3IgKHZhciBqPTA7IGo8Ym9hcmRzW2ldLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGorKykge1xyXG5cdFx0XHQvLyBzaG9ydGhhbmRcclxuXHRcdFx0dmFyIHEgPSBib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5W2pdLnF1ZXN0aW9uO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGFnIHN0YXJ0XHJcblx0XHRcdG91dHB1dCArPSAnPHF1ZXN0aW9uICc7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBxdWVzdGlvblN0YXRlXHJcblx0XHRcdG91dHB1dCArPSAncXVlc3Rpb25TdGF0ZT1cIicgKyByZXZlcnNlU3RhdGVDb252ZXJ0ZXJbcS5jdXJyZW50U3RhdGVdICsgJ1wiICc7XHJcblx0XHRcdC8vIGp1c3RpZmljYXRpb25cclxuXHRcdFx0dmFyIG5ld0p1c3RpZmljYXRpb24gPSBxLmp1c3RpZmljYXRpb24udmFsdWU7XHJcblx0XHRcdHZhciBqdXN0aWZpY2F0aW9uO1xyXG5cdFx0XHRuZXdKdXN0aWZpY2F0aW9uID8ganVzdGlmaWNhdGlvbiA9IG5ld0p1c3RpZmljYXRpb24gOiBqdXN0aWZpY2F0aW9uID0gcS5qdXN0aWZpY2F0aW9uU3RyaW5nO1xyXG5cdFx0XHRvdXRwdXQgKz0gJ2p1c3RpZmljYXRpb249XCInICsganVzdGlmaWNhdGlvbiArICdcIiAnO1xyXG5cdFx0XHQvLyBhbmltYXRlZFxyXG5cdFx0XHRvdXRwdXQgKz0gJ2FuaW1hdGVkPVwiJyArIChxLmN1cnJlbnRTdGF0ZSA9PSAyKSArICdcIiAnOyAvLyBtaWdodCBoYXZlIHRvIGZpeCB0aGlzIGxhdGVyXHJcblx0XHRcdC8vIGxpbmVzVHJhbmNlZFxyXG5cdFx0XHRvdXRwdXQgKz0gJ2xpbmVzVHJhY2VkPVwiMFwiICc7IC8vIG1pZ2h0IGhhdmUgdG8gZml4IHRoaXMgdG9vXHJcblx0XHRcdC8vIHJldmVhbEJ1ZmZlclxyXG5cdFx0XHRvdXRwdXQgKz0gJ3JldmVhbEJ1ZmZlcj1cIjBcIiAnOyAvLyBhbmQgdGhpc1xyXG5cdFx0XHQvLyBwb3NpdGlvblBlcmNlbnRYXHJcblx0XHRcdG91dHB1dCArPSAncG9zaXRpb25QZXJjZW50WD1cIicgKyBVdGlsaXRpZXMubWFwKHEucG9zaXRpb25QZXJjZW50WCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCAwLCAxMDApICsgJ1wiICc7XHJcblx0XHRcdC8vIHBvc2l0aW9uUGVyY2VudFlcclxuXHRcdFx0b3V0cHV0ICs9ICdwb3NpdGlvblBlcmNlbnRZPVwiJyArIFV0aWxpdGllcy5tYXAocS5wb3NpdGlvblBlcmNlbnRZLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnksIDAsIDEwMCkgKyAnXCIgJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRhZyBlbmRcclxuXHRcdFx0b3V0cHV0ICs9ICcvPicgKyBubDtcclxuXHRcdH1cclxuXHR9XHJcblx0b3V0cHV0ICs9IFwiPC9xdWVzdGlvbnM+XCIgKyBubDtcclxuXHRvdXRwdXQgKz0gXCI8L2Nhc2U+XCIgKyBubDtcclxuXHRyZXR1cm4gb3V0cHV0O1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoJy4vZHJhd0xpYi5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbnN0YW50cy5qc1wiKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKCcuL3F1ZXN0aW9uLmpzJyk7XHJcblxyXG52YXIgQ0hFQ0tfSU1BR0UgPSBcIi4uL2ltZy9pY29uUG9zdEl0Q2hlY2sucG5nXCI7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBsZXNzb25Ob2RlKHN0YXJ0UG9zaXRpb24sIGltYWdlUGF0aCwgcFF1ZXN0aW9uKXtcclxuICAgIFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLmRyYWdMb2NhdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICB0aGlzLmRyYWdnaW5nID0gZmFsc2U7XHJcbiAgICB0aGlzLnR5cGUgPSBcImxlc3Nvbk5vZGVcIjtcclxuICAgIHRoaXMuaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIHRoaXMuY2hlY2sgPSBuZXcgSW1hZ2UoKTtcclxuICAgIHRoaXMud2lkdGg7XHJcbiAgICB0aGlzLmhlaWdodDtcclxuICAgIHRoaXMucXVlc3Rpb24gPSBwUXVlc3Rpb247XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gMDtcclxuICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGU7XHJcbiAgICB0aGlzLmxpbmVQZXJjZW50ID0gMDtcclxuICAgIFxyXG4gICAgLy8gc2tpcCBhbmltYXRpb25zIGZvciBzb2x2ZWRcclxuICAgIGlmIChwUXVlc3Rpb24uY3VycmVudFN0YXRlID09IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCkgdGhpcy5saW5lUGVyY2VudCA9IDE7XHJcbiAgICBcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIC8vaW1hZ2UgbG9hZGluZyBhbmQgcmVzaXppbmdcclxuICAgIHRoaXMuaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQuaW1hZ2UubmF0dXJhbFdpZHRoO1xyXG4gICAgICAgIHRoYXQuaGVpZ2h0ID0gdGhhdC5pbWFnZS5uYXR1cmFsSGVpZ2h0O1xyXG4gICAgICAgIHZhciBtYXhEaW1lbnNpb24gPSBDb25zdGFudHMuYm9hcmRTaXplLngvMTA7XHJcbiAgICAgICAgLy90b28gc21hbGw/XHJcbiAgICAgICAgaWYodGhhdC53aWR0aCA8IG1heERpbWVuc2lvbiAmJiB0aGF0LmhlaWdodCA8IG1heERpbWVuc2lvbil7XHJcbiAgICAgICAgICAgIHZhciB4O1xyXG4gICAgICAgICAgICBpZih0aGF0LndpZHRoID4gdGhhdC5oZWlnaHQpe1xyXG4gICAgICAgICAgICAgICAgeCA9IG1heERpbWVuc2lvbiAvIHRoYXQud2lkdGg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIHggPSBtYXhEaW1lbnNpb24gLyB0aGF0LmhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0LndpZHRoID0gdGhhdC53aWR0aCAqIHg7XHJcbiAgICAgICAgICAgIHRoYXQuaGVpZ2h0ID0gdGhhdC5oZWlnaHQgKiB4O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGF0LndpZHRoID4gbWF4RGltZW5zaW9uIHx8IHRoYXQuaGVpZ2h0ID4gbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC53aWR0aCAvIG1heERpbWVuc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IHRoYXQuaGVpZ2h0IC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoIC8geDtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAvIHg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICB0aGF0LnBvc2l0aW9uLnggKz0gdGhhdC53aWR0aC8yO1xyXG4gICAgICAgIHRoYXQucG9zaXRpb24ueSArPSB0aGF0LmhlaWdodC8yO1xyXG4gICAgfTtcclxuICAgIFxyXG4gICAgdGhpcy5pbWFnZS5zcmMgPSBpbWFnZVBhdGg7XHJcbiAgICB0aGlzLmNoZWNrLnNyYyA9IENIRUNLX0lNQUdFO1xyXG59XHJcblxyXG52YXIgcCA9IGxlc3Nvbk5vZGUucHJvdG90eXBlO1xyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4LCBjYW52YXMpe1xyXG5cclxuXHQvLyBDaGVjayBpZiBxdWVzdGlvbiBpcyB2aXNpYmxlXHJcblx0aWYodGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGU9PVF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTil7XHJcblx0XHRpZih0aGlzLnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCA8PSB0aGlzLmNvbm5lY3Rpb25zKXtcclxuXHRcdFx0dGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPSBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRDtcclxuXHRcdFx0dGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZTtcclxuXHRcdH1cclxuXHRcdGVsc2VcclxuXHRcdFx0cmV0dXJuO1xyXG5cdH1cclxuXHRcclxuICAgIC8vbGVzc29uTm9kZS5kcmF3TGliLmNpcmNsZShjdHgsIHRoaXMucG9zaXRpb24ueCwgdGhpcy5wb3NpdGlvbi55LCAxMCwgXCJyZWRcIik7XHJcbiAgICAvL2RyYXcgdGhlIGltYWdlLCBzaGFkb3cgaWYgaG92ZXJlZFxyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGlmKHRoaXMuZHJhZ2dpbmcpIHtcclxuICAgIFx0Y3R4LnNoYWRvd0NvbG9yID0gJ3llbGxvdyc7XHJcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSA1O1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctd2Via2l0LWdyYWJiaW5nJztcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLW1vei1ncmFiYmluZyc7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJ2dyYWJiaW5nJztcclxuICAgIH1cclxuICAgIGVsc2UgaWYodGhpcy5tb3VzZU92ZXIpe1xyXG4gICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICdkb2RnZXJCbHVlJztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDU7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xyXG4gICAgfVxyXG4gICAgLy9kcmF3aW5nIHRoZSBidXR0b24gaW1hZ2VcclxuICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgdGhpcy5wb3NpdGlvbi54IC0gdGhpcy53aWR0aC8yLCB0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLmhlaWdodC8yLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XHJcbiAgICBcclxuICAgIC8vZHJhd2luZyB0aGUgcGluXHJcbiAgICBzd2l0Y2ggKHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlKSB7XHJcbiAgICBcdGNhc2UgMTpcclxuICAgIFx0XHRjdHguZmlsbFN0eWxlID0gXCJibHVlXCI7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IFwiY3lhblwiO1xyXG5cdFx0XHRicmVhaztcclxuICAgICBcdGNhc2UgMjpcclxuICAgICBcdFx0Y3R4LmRyYXdJbWFnZSh0aGlzLmNoZWNrLCB0aGlzLnBvc2l0aW9uLnggKyB0aGlzLndpZHRoLzIgLSBDb25zdGFudHMuYm9hcmRTaXplLngvNTAsIHRoaXMucG9zaXRpb24ueSArIHRoaXMuaGVpZ2h0LzIgLSBDb25zdGFudHMuYm9hcmRTaXplLngvNTAsIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwKTtcclxuICAgIFx0XHRjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSBcInllbGxvd1wiO1xyXG5cdFx0XHRicmVhaztcclxuICAgIH1cclxuXHR2YXIgc21hbGxlciA9IHRoaXMud2lkdGggPCB0aGlzLmhlaWdodCA/IHRoaXMud2lkdGggOiB0aGlzLmhlaWdodDtcclxuXHRjdHgubGluZVdpZHRoID0gc21hbGxlci8zMjtcclxuXHJcblx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdHZhciBub2RlUG9pbnQgPSB0aGlzLmdldE5vZGVQb2ludCgpO1xyXG5cdGN0eC5hcmMobm9kZVBvaW50LngsIG5vZGVQb2ludC55LCBzbWFsbGVyKjMvMzIsIDAsIDIqTWF0aC5QSSk7XHJcblx0Y3R4LmNsb3NlUGF0aCgpO1xyXG5cdGN0eC5maWxsKCk7XHJcblx0Y3R4LnN0cm9rZSgpO1xyXG4gICAgXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxucC5nZXROb2RlUG9pbnQgPSBmdW5jdGlvbigpe1xyXG5cdHZhciBzbWFsbGVyID0gdGhpcy53aWR0aCA8IHRoaXMuaGVpZ2h0ID8gdGhpcy53aWR0aCA6IHRoaXMuaGVpZ2h0O1xyXG5cdHJldHVybiBuZXcgUG9pbnQodGhpcy5wb3NpdGlvbi54IC0gdGhpcy53aWR0aC8yICsgc21hbGxlciozLzE2LCB0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLmhlaWdodC8yICsgc21hbGxlciozLzE2KTtcclxufVxyXG5cclxucC5jbGljayA9IGZ1bmN0aW9uKG1vdXNlU3RhdGUpe1xyXG4gICAgdGhpcy5xdWVzdGlvbi5kaXNwbGF5V2luZG93cygpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGxlc3Nvbk5vZGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxuXHJcbi8vIHByaXZhdGUgdmFyaWFibGVzXHJcbnZhciBtb3VzZVBvc2l0aW9uLCByZWxhdGl2ZU1vdXNlUG9zaXRpb247XHJcbnZhciBtb3VzZURvd25UaW1lciwgbWF4Q2xpY2tEdXJhdGlvbjtcclxudmFyIG1vdXNlV2hlZWxWYWw7XHJcbnZhciBwcmV2VGltZTtcclxudmFyIHNjYWxpbmcsIHRvdWNoWm9vbSwgc3RhcnRUb3VjaFpvb207XHJcblxyXG5mdW5jdGlvbiBtb3VzZVN0YXRlKGNhbnZhcyl7XHJcblx0bW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgcmVsYXRpdmVNb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KDAsMCk7XHJcbiAgICB0aGlzLnZpcnR1YWxQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgXHJcbiAgICAvL2V2ZW50IGxpc3RlbmVycyBmb3IgbW91c2UgaW50ZXJhY3Rpb25zIHdpdGggdGhlIGNhbnZhc1xyXG4gICAgdmFyIG1vdXNlU3RhdGUgPSB0aGlzO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB1cGRhdGVQb3NpdGlvbihlKTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0aWYoc2NhbGluZylcclxuICAgIFx0XHR1cGRhdGVUb3VjaFBvc2l0aW9ucyhlKTtcclxuICAgIFx0ZWxzZVxyXG4gICAgXHRcdHVwZGF0ZVBvc2l0aW9uKGUudG91Y2hlc1swXSk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRpZihlLnRvdWNoZXMubGVuZ3RoID09IDEgJiYgIXNjYWxpbmcpe1xyXG5cdCAgICAgICAgdXBkYXRlUG9zaXRpb24oZS50b3VjaGVzWzBdKTtcclxuXHQgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuXHQgICAgICAgIFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSB0cnVlO1xyXG5cdCAgICAgICAgfSk7XHJcbiAgICBcdH1cclxuICAgIFx0ZWxzZSBpZihlLnRvdWNoZXMubGVuZ3RoID09IDIpe1xyXG4gICAgXHRcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICBcdFx0c2NhbGluZyA9IHRydWU7XHJcbiAgICBcdFx0dXBkYXRlVG91Y2hQb3NpdGlvbnMoZSk7XHJcbiAgICBcdFx0c3RhcnRUb3VjaFpvb20gPSB0b3VjaFpvb207XHJcbiAgICBcdH1cclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0aWYoc2NhbGluZyl7XHJcbiAgICBcdFx0c2NhbGluZyA9IGZhbHNlO1xyXG4gICAgXHQgICAgdG91Y2hab29tID0gMDtcclxuICAgIFx0ICAgIHN0YXJ0VG91Y2hab29tID0gMDtcclxuICAgIFx0fVxyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBmYWxzZTtcclxuICAgIG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIHRoaXMuem9vbURpZmYgPSAwO1xyXG4gICAgdG91Y2hab29tID0gMDtcclxuICAgIHRoaXMubW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBtYXhDbGlja0R1cmF0aW9uID0gMjAwO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IGZhbHNlO1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcblx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVBvc2l0aW9uKGUpe1xyXG5cdHZhciBib3VuZFJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICBtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIGJvdW5kUmVjdC5sZWZ0LCBlLmNsaWVudFkgLSBib3VuZFJlY3QudG9wKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChtb3VzZVBvc2l0aW9uLnggLSAoY2FudmFzLm9mZnNldFdpZHRoLzIuMCksIG1vdXNlUG9zaXRpb24ueSAtIChjYW52YXMub2Zmc2V0SGVpZ2h0LzIuMCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUb3VjaFBvc2l0aW9ucyhlKXtcclxuXHR2YXIgY3VyVG91Y2hlcyA9IFtcclxuXHQgICAgICAgICAgICAgICBuZXcgUG9pbnQoZS50b3VjaGVzWzBdLmNsaWVudFgsIGUudG91Y2hlc1swXS5jbGllbnRZKSxcclxuXHQgICAgICAgICAgICAgICBuZXcgUG9pbnQoZS50b3VjaGVzWzFdLmNsaWVudFgsIGUudG91Y2hlc1sxXS5jbGllbnRZKVxyXG5cdF07XHJcblx0dG91Y2hab29tID0gTWF0aC5zcXJ0KE1hdGgucG93KGN1clRvdWNoZXNbMF0ueC1jdXJUb3VjaGVzWzFdLngsIDIpK01hdGgucG93KGN1clRvdWNoZXNbMF0ueS1jdXJUb3VjaGVzWzFdLnksIDIpKTtcclxufVxyXG5cclxudmFyIHAgPSBtb3VzZVN0YXRlLnByb3RvdHlwZTtcclxuXHJcbi8vIFVwZGF0ZSB0aGUgbW91c2UgdG8gdGhlIGN1cnJlbnQgc3RhdGVcclxucC51cGRhdGUgPSBmdW5jdGlvbihkdCwgc2NhbGUpe1xyXG4gICAgXHJcblx0Ly8gU2F2ZSB0aGUgY3VycmVudCB2aXJ0dWFsIHBvc2l0aW9uIGZyb20gc2NhbGVcclxuXHR0aGlzLnZpcnR1YWxQb3NpdGlvbiA9IG5ldyBQb2ludChyZWxhdGl2ZU1vdXNlUG9zaXRpb24ueC9zY2FsZSwgcmVsYXRpdmVNb3VzZVBvc2l0aW9uLnkvc2NhbGUpOztcclxuXHRcclxuXHQvLyBTYXZlIHRoZSB6b29tIGRpZmYgYW5kIHByZXYgem9vbVxyXG5cdGlmKHNjYWxpbmcpXHJcblx0XHR0aGlzLnpvb21EaWZmID0gc3RhcnRUb3VjaFpvb20gLSB0b3VjaFpvb207XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy56b29tRGlmZiA9IDA7XHJcblx0XHJcbiAgICAvLyBjaGVjayBtb3VzZSBjbGlja1xyXG4gICAgdGhpcy5tb3VzZUNsaWNrZWQgPSBmYWxzZTtcclxuICAgIGlmICh0aGlzLm1vdXNlRG93bilcclxuICAgIFx0bW91c2VEb3duVGltZXIgKz0gZHQ7XHJcbiAgICBlbHNle1xyXG4gICAgXHRpZiAobW91c2VEb3duVGltZXIgPiAwICYmIG1vdXNlRG93blRpbWVyIDwgbWF4Q2xpY2tEdXJhdGlvbilcclxuICAgIFx0XHR0aGlzLm1vdXNlQ2xpY2tlZCA9IHRydWU7XHJcbiAgICBcdG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIH1cclxuICAgIHRoaXMucHJldk1vdXNlRG93biA9IHRoaXMubW91c2VEb3duO1xyXG4gICAgdGhpcy5oYXNUYXJnZXQgPSBmYWxzZTtcclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG1vdXNlU3RhdGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIFBvaW50KHBYLCBwWSl7XHJcbiAgICB0aGlzLnggPSBwWDtcclxuICAgIHRoaXMueSA9IHBZO1xyXG59XHJcblxyXG52YXIgcCA9IFBvaW50LnByb3RvdHlwZTtcclxuXHJcbnAuYWRkID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLCB0aGlzLnkrcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLngsIHRoaXMueStwWC55KTtcclxufVxyXG5cclxucC5tdWx0ID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLCB0aGlzLnkqcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLngsIHRoaXMueSpwWC55KTtcclxufVxyXG5cclxucC5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKXtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpzY2FsZSwgdGhpcy55KnNjYWxlKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG5cclxudmFyIFNPTFZFX1NUQVRFID0gT2JqZWN0LmZyZWV6ZSh7SElEREVOOiAwLCBVTlNPTFZFRDogMSwgU09MVkVEOiAyfSk7XHJcbnZhciBRVUVTVElPTl9UWVBFID0gT2JqZWN0LmZyZWV6ZSh7SlVTVElGSUNBVElPTjogMSwgTVVMVElQTEVfQ0hPSUNFOiAyLCBTSE9SVF9SRVNQT05TRTogMywgRklMRTogNCwgTUVTU0FHRTogNX0pO1xyXG5cclxuLyogUXVlc3Rpb24gcHJvcGVydGllczpcclxuY3VycmVudFN0YXRlOiBTT0xWRV9TVEFURVxyXG53aW5kb3dEaXY6IGVsZW1lbnRcclxuY29ycmVjdDogaW50XHJcbnBvc2l0aW9uUGVyY2VudFg6IGZsb2F0XHJcbnBvc2l0aW9uUGVyY2VudFk6IGZsb2F0XHJcbnJldmVhbFRocmVzaG9sZDogaW50XHJcbmltYWdlTGluazogc3RyaW5nXHJcbmZlZWRiYWNrczogc3RyaW5nW11cclxuY29ubmVjdGlvbkVsZW1lbnRzOiBlbGVtZW50W11cclxuY29ubmVjdGlvbnM6IGludFtdXHJcbnF1ZXN0aW9uVHlwZTogU09MVkVfU1RBVEVcclxuanVzdGlmaWNhdGlvbjogc3RyaW5nXHJcbndyb25nQW5zd2VyOiBzdHJpbmdcclxuY29ycmVjdEFuc3dlcjogc3RyaW5nXHJcbiovXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIFF1ZXN0aW9uKHhtbCwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyl7XHJcblx0XHJcblx0Ly8gU2V0IHRoZSBjdXJyZW50IHN0YXRlIHRvIGRlZmF1bHQgYXQgaGlkZGVuIGFuZCBzdG9yZSB0aGUgd2luZG93IGRpdlxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5ISURERU47XHJcbiAgICB0aGlzLndpbmRvd0RpdiA9IHdpbmRvd0RpdjtcclxuICAgIFxyXG4gICAgLy8gR2V0IGFuZCBzYXZlIHRoZSBnaXZlbiBpbmRleCwgY29ycmVjdCBhbnN3ZXIsIHBvc2l0aW9uLCByZXZlYWwgdGhyZXNob2xkLCBpbWFnZSBsaW5rLCBmZWVkYmFjaywgYW5kIGNvbm5lY3Rpb25zXHJcbiAgICB0aGlzLmNvcnJlY3QgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwiY29ycmVjdEFuc3dlclwiKSk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFggPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ4UG9zaXRpb25QZXJjZW50XCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngpO1xyXG4gICAgdGhpcy5wb3NpdGlvblBlcmNlbnRZID0gVXRpbGl0aWVzLm1hcChwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwieVBvc2l0aW9uUGVyY2VudFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55KTtcclxuICAgIHRoaXMucmV2ZWFsVGhyZXNob2xkID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInJldmVhbFRocmVzaG9sZFwiKSk7XHJcbiAgICB0aGlzLmltYWdlTGluayA9IHVybCt4bWwuZ2V0QXR0cmlidXRlKFwiaW1hZ2VMaW5rXCIpO1xyXG4gICAgdGhpcy5mZWVkYmFja3MgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJmZWVkYmFja1wiKTtcclxuICAgIHRoaXMuYmxvYiA9IG51bGw7IC8vIG5vIHVwbG9hZCBieSBkZWZhdWx0XHJcbiAgICB0aGlzLmZpbGVOYW1lID0gXCJcIjtcclxuICAgIHZhciBjb25uZWN0aW9uRWxlbWVudHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjb25uZWN0aW9uc1wiKTtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBbXTtcclxuICAgIGZvcih2YXIgaT0wO2k8Y29ubmVjdGlvbkVsZW1lbnRzLmxlbmd0aDtpKyspXHJcbiAgICBcdHRoaXMuY29ubmVjdGlvbnNbaV0gPSBwYXJzZUludChjb25uZWN0aW9uRWxlbWVudHNbaV0uaW5uZXJIVE1MKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSB3aW5kb3dzIGZvciB0aGlzIHF1ZXN0aW9uIGJhc2VkIG9uIHRoZSBxdWVzdGlvbiB0eXBlXHJcbiAgICB0aGlzLnF1ZXN0aW9uVHlwZSA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJxdWVzdGlvblR5cGVcIikpO1xyXG4gICAgdGhpcy5qdXN0aWZpY2F0aW9uID0gdGhpcy5xdWVzdGlvblR5cGU9PTEgfHwgdGhpcy5xdWVzdGlvblR5cGU9PTM7XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGUhPTUpe1xyXG5cdFx0dGhpcy5jcmVhdGVUYXNrV2luZG93KHhtbCwgd2luZG93cy50YXNrV2luZG93KTtcclxuXHRcdHRoaXMuY3JlYXRlUmVzb3VyY2VXaW5kb3coeG1sLCByZXNvdXJjZXMsIHdpbmRvd3MucmVzb3VyY2VXaW5kb3csIHdpbmRvd3MucmVzb3VyY2UpO1xyXG5cdH1cclxuXHRzd2l0Y2godGhpcy5xdWVzdGlvblR5cGUpe1xyXG5cdFx0Y2FzZSA1OlxyXG5cdFx0XHR0aGlzLmNyZWF0ZU1lc3NhZ2VXaW5kb3coeG1sLCB3aW5kb3dzLm1lc3NhZ2VXaW5kb3cpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNDpcclxuXHRcdFx0dGhpcy5jcmVhdGVGaWxlV2luZG93KHdpbmRvd3MuZmlsZVdpbmRvdyk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSAzOlxyXG5cdFx0Y2FzZSAyOlxyXG5cdFx0Y2FzZSAxOlxyXG5cdFx0XHR0aGlzLmNyZWF0ZUFuc3dlcldpbmRvdyh4bWwsIHdpbmRvd3MuYW5zd2VyV2luZG93KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0fVxyXG4gICAgXHJcbn1cclxuXHJcbnZhciBwID0gUXVlc3Rpb24ucHJvdG90eXBlO1xyXG5cclxucC5zaG93UHJldlN1Ym1pdHRlZEZpbGVzID0gZnVuY3Rpb24oZmlsZXMpIHtcclxuXHQvLyBhY2tub3dsZWRnZSBzdWJtaXR0ZWQgZmlsZXMgaW4gdGFzayB3aW5kb3dcclxuXHRpZihmaWxlcy5sZW5ndGg+MClcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1N1Ym1pdHRlZCBGaWxlczo8YnIvPic7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnJztcclxuXHRmb3IodmFyIGk9MDtpPGZpbGVzO2krKylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MICs9ICc8c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrZmlsZXNbaV0ubmFtZSsnPC9zcGFuPjxici8+JztcclxufVxyXG5cclxucC53cm9uZ0Fuc3dlciA9IGZ1bmN0aW9uKG51bSl7XHJcblxyXG4gIC8vIElmIGZlZWJhY2sgZGlzcGxheSBpdFxyXG5cdGlmKHRoaXMuZmVlZGJhY2tzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnXCInK1N0cmluZy5mcm9tQ2hhckNvZGUobnVtICsgXCJBXCIuY2hhckNvZGVBdCgpKStcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdcIiBpcyBub3QgY29ycmVjdCA8YnIvPiZuYnNwOzxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZmVlZGJhY2tzW251bV0uaW5uZXJIVE1MKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG59XHJcblxyXG5wLmNvcnJlY3RBbnN3ZXIgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIERpc2FibGUgYWxsIHRoZSBhbnN3ZXIgYnV0dG9uc1xyXG5cdGlmKHRoaXMuYW5zd2VycylcclxuXHRcdGZvcih2YXIgaT0wO2k8dGhpcy5hbnN3ZXJzLmxlbmd0aDtpKyspXHJcblx0XHRcdHRoaXMuYW5zd2Vyc1tpXS5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHJcblx0Ly8gSWYgZmVlZGJhY2sgZGlzcGxheSBpdFxyXG5cdGlmKHRoaXMuZmVlZGJhY2tzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnXCInK1N0cmluZy5mcm9tQ2hhckNvZGUodGhpcy5jb3JyZWN0ICsgXCJBXCIuY2hhckNvZGVBdCgpKStcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdcIiBpcyB0aGUgY29ycmVjdCByZXNwb25zZSA8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZmVlZGJhY2tzW3RoaXMuY29ycmVjdF0uaW5uZXJIVE1MKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG5cdFxyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlPT09MyAmJiB0aGlzLmp1c3RpZmljYXRpb24udmFsdWUgIT0gJycpXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdTdWJtaXR0ZWQgVGV4dDo8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+Jyt0aGlzLmp1c3RpZmljYXRpb24udmFsdWUrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT0xICYmIHRoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSAhPSAnJylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MICs9ICdTdWJtaXR0ZWQgVGV4dDo8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+Jyt0aGlzLmp1c3RpZmljYXRpb24udmFsdWUrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT00KXtcclxuXHRcdGlmKHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aD4wKVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdTdWJtaXR0ZWQgRmlsZXM6PGJyLz4nO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICcnO1xyXG5cdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmZpbGVJbnB1dC5maWxlcy5sZW5ndGg7aSsrKVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCArPSAnPHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuZmlsZUlucHV0LmZpbGVzW2ldLm5hbWUrJzwvc3Bhbj48YnIvPic7XHJcblx0fVxyXG4gIFxyXG4gIGlmKHRoaXMuY3VycmVudFN0YXRlIT1TT0xWRV9TVEFURS5TT0xWRUQgJiYgXHJcbiAgICAgKCgodGhpcy5xdWVzdGlvblR5cGU9PT0zIHx8IHRoaXMucXVlc3Rpb25UeXBlPT09MSkgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKSB8fFxyXG4gICAgICAodGhpcy5xdWVzdGlvblR5cGU9PT00ICYmIHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aD4wKSB8fFxyXG4gICAgICAgdGhpcy5xdWVzdGlvblR5cGU9PT0yKSl7IFxyXG4gICAgLy8gU2V0IHRoZSBzdGF0ZSBvZiB0aGUgcXVlc3Rpb24gdG8gY29ycmVjdFxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5TT0xWRUQ7XHJcbiAgICAvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcbiAgICBpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdHRoaXMucHJvY2VlZEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gYW5pbWF0ZSBwcm9jZWVkIGJ1dHRvblxyXG5cdH1cclxuICB9XHJcblx0XHJcbn1cclxuXHJcbnAuZGlzcGxheVdpbmRvd3MgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIEFkZCB0aGUgd2luZG93cyB0byB0aGUgd2luZG93IGRpdlxyXG5cdHZhciB3aW5kb3dOb2RlID0gdGhpcy53aW5kb3dEaXY7XHJcblx0dmFyIGV4aXRCdXR0b24gPSBuZXcgSW1hZ2UoKTtcclxuXHRleGl0QnV0dG9uLnNyYyA9IFwiLi4vaW1nL2ljb25DbG9zZS5wbmdcIjtcclxuXHRleGl0QnV0dG9uLmNsYXNzTmFtZSA9IFwiZXhpdC1idXR0b25cIjtcclxuXHR2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG5cdGV4aXRCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkgeyBxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7IH07XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT01KXtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5tZXNzYWdlKTtcclxuXHQgICAgZXhpdEJ1dHRvbi5zdHlsZS5sZWZ0ID0gXCI3NXZ3XCI7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMudGFzayk7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VyKTtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5yZXNvdXJjZSk7XHJcblx0XHRleGl0QnV0dG9uLnN0eWxlLmxlZnQgPSBcIjg1dndcIjtcclxuXHR9XHJcblx0aWYodGhpcy5jdXJyZW50U3RhdGUgPT09IFNPTFZFX1NUQVRFLlNPTFZFRCAmJiB0aGlzLnF1ZXN0aW9uVHlwZSAhPSBRVUVTVElPTl9UWVBFLk1FU1NBR0UpICB7XHJcblx0XHQvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcblx0XHRpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdFx0dGhpcy5wcm9jZWVkRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvLyBhbmltYXRlIHByb2NlZWQgYnV0dG9uXHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQoZXhpdEJ1dHRvbik7XHJcblx0XHJcbn1cclxuXHJcbnAuY3JlYXRlVGFza1dpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgd2luZG93KXtcclxuXHR0aGlzLnByb2NlZWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwcm9jZWVkQ29udGFpbmVyXCIpO1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgdGFzayB3aW5kb3cgXHJcblx0dGhpcy50YXNrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuICAgIHRoaXMudGFzay5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy50YXNrLnN0eWxlLnRvcCA9IFwiMTB2aFwiO1xyXG4gICAgdGhpcy50YXNrLnN0eWxlLmxlZnQgPSBcIjV2d1wiO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uTmFtZVwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIlaW5zdHJ1Y3Rpb25zJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gdGhpcy50YXNrLmlubmVySFRNTC5yZXBsYWNlKFwiJXF1ZXN0aW9uJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLmZlZWRiYWNrID0gdGhpcy50YXNrLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJmZWVkYmFja1wiKVswXTtcclxufVxyXG5cclxucC5jcmVhdGVSZXNvdXJjZVdpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgcmVzb3VyY2VGaWxlcywgd2luZG93LCByZXNvdXJjZUVsZW1lbnQpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgcmVzb3VyY2Ugd2luZG93IFxyXG5cdHRoaXMucmVzb3VyY2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG5cdHRoaXMucmVzb3VyY2UuY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuXHR0aGlzLnJlc291cmNlLnN0eWxlLnRvcCA9IFwiNTV2aFwiO1xyXG5cdHRoaXMucmVzb3VyY2Uuc3R5bGUubGVmdCA9IFwiNXZ3XCI7XHJcblx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB3aW5kb3c7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgaW5kaXZpZHVhbCByZXNvdWNlcyBpZiBhbnlcclxuXHR2YXIgcmVzb3VyY2VzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VJbmRleFwiKTtcclxuICAgIGlmKHJlc291cmNlcy5sZW5ndGggPiAwKXtcclxuICAgIFx0XHJcbiAgICBcdC8vIEdldCB0aGUgaHRtbCBmb3IgZWFjaCByZXNvdXJjZSBhbmQgdGhlbiBhZGQgdGhlIHJlc3VsdCB0byB0aGUgd2luZG93XHJcbiAgICBcdHZhciByZXNvdXJjZUhUTUwgPSAnJztcclxuXHQgICAgZm9yKHZhciBpPTA7aTxyZXNvdXJjZXMubGVuZ3RoO2krKyl7XHJcbiAgICBcdFx0dmFyIGN1clJlc291cmNlID0gcmVzb3VyY2VFbGVtZW50LnJlcGxhY2UoXCIlaWNvbiVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0uaWNvbik7XHJcblx0ICAgIFx0Y3VyUmVzb3VyY2UgPSBjdXJSZXNvdXJjZS5yZXBsYWNlKFwiJXRpdGxlJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS50aXRsZSk7XHJcblx0ICAgIFx0Y3VyUmVzb3VyY2UgPSBjdXJSZXNvdXJjZS5yZXBsYWNlKFwiJWxpbmslXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLmxpbmspO1xyXG5cdCAgICBcdHJlc291cmNlSFRNTCArPSBjdXJSZXNvdXJjZTtcclxuXHQgICAgfVxyXG5cdCAgXHR0aGlzLnJlc291cmNlLmlubmVySFRNTCA9IHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlcmVzb3VyY2VzJVwiLCByZXNvdXJjZUhUTUwpO1xyXG5cdFx0ICAgICAgICBcclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdC8vIERpc3BsYXkgdGhhdCB0aGVyZSBhcmVuJ3QgYW55IHJlc291cmNlc1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB0aGlzLnJlc291cmNlLmlubmVySFRNTC5yZXBsYWNlKFwiJXJlc291cmNlcyVcIiwgXCJObyByZXNvdXJjZXMgaGF2ZSBiZWVuIHByb3ZpZGVkIGZvciB0aGlzIHRhc2suXCIpO1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5zdHlsZS5jb2xvciA9IFwiZ3JleVwiO1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGRkZGRkZcIjtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uY2xhc3NOYW1lICs9IFwiLCBjZW50ZXJcIjtcclxuXHR9XHJcbn1cclxuXHJcbnAuY3JlYXRlQW5zd2VyV2luZG93ID0gZnVuY3Rpb24oeG1sLCB3aW5kb3cpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgYW5zd2VyIHdpbmRvdyBcclxuXHR0aGlzLmFuc3dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLmFuc3dlci5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS5sZWZ0ID0gXCI1MHZ3XCI7XHJcbiAgICB0aGlzLmFuc3dlci5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgdGV4dCBlbGVtZW50IGlmIGFueVxyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHZhciBzdWJtaXQ7XHJcbiAgICBpZih0aGlzLmp1c3RpZmljYXRpb24pe1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmNsYXNzTmFtZSA9IFwic3VibWl0XCI7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQuaW5uZXJIVE1MID0gXCJTdWJtaXRcIjtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuICAgIFx0fTtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZnVuY3Rpb24oKSB7XHJcbiAgICBcdFx0aWYocXVlc3Rpb24uanVzdGlmaWNhdGlvbi52YWx1ZS5sZW5ndGggPiAwKVxyXG4gICAgXHRcdFx0cXVlc3Rpb24uanVzdGlmaWNhdGlvbi5zdWJtaXQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIFx0XHRlbHNlXHJcbiAgICBcdFx0XHRxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdH0sIGZhbHNlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIGFuZCBnZXQgYWxsIHRoZSBhbnN3ZXIgZWxlbWVudHNcclxuICAgIHRoaXMuYW5zd2VycyA9IFtdO1xyXG4gICAgdmFyIGFuc3dlcnNYbWwgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhbnN3ZXJcIik7XHJcbiAgICB2YXIgY29ycmVjdCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJjb3JyZWN0QW5zd2VyXCIpKTtcclxuICAgIGZvcih2YXIgaT0wO2k8YW5zd2Vyc1htbC5sZW5ndGg7aSsrKXtcclxuICAgIFx0aWYodGhpcy5qdXN0aWZpY2F0aW9uKVxyXG4gICAgXHRcdHRoaXMuanVzdGlmaWNhdGlvbi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBcdGlmKGNvcnJlY3Q9PT1pKVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcImNvcnJlY3RcIjtcclxuICAgIFx0ZWxzZVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcIndyb25nXCI7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXS5pbm5lckhUTUwgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1wiLiBcIithbnN3ZXJzWG1sW2ldLmlubmVySFRNTDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBldmVudHMgZm9yIHRoZSBhbnN3ZXJzXHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKXtcclxuXHQgIGlmKHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPT0gXCJ3cm9uZ1wiKXtcclxuXHRcdHRoaXMuYW5zd2Vyc1tpXS5udW0gPSBpO1xyXG4gICAgICAgIHRoaXMuYW5zd2Vyc1tpXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgIHRoaXMuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0ICBxdWVzdGlvbi53cm9uZ0Fuc3dlcih0aGlzLm51bSk7XHJcblx0ICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgZWxzZXtcclxuICAgIFx0dGhpcy5hbnN3ZXJzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdCAgICAgIGlmKHF1ZXN0aW9uLmp1c3RpZmljYXRpb24pXHJcblx0ICAgICAgICBxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0ICAgICAgcXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG5cdCAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgYW5zd2VycyB0byB0aGUgd2luZG93XHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKVxyXG4gICAgICB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnNbaV0pO1xyXG4gICAgaWYodGhpcy5qdXN0aWZpY2F0aW9uKXtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uKTtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbnAuY3JlYXRlRmlsZVdpbmRvdyA9IGZ1bmN0aW9uKHdpbmRvdyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHR0aGlzLmFuc3dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLmFuc3dlci5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS5sZWZ0ID0gXCI1MHZ3XCI7XHJcbiAgICB0aGlzLmFuc3dlci5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICB0aGlzLmZpbGVJbnB1dCA9IHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIilbMF07XHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5maWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICBcdFx0Ly8gTWFrZSBzdXJlIGEgdmFsaWQgZmlsZSB3YXMgY2hvc2VuIChjdXJyZW50bHkgbm90IGltcGxlbWVudGVkKVxyXG5cdFx0XHRpZihmYWxzZSl7XHJcblx0XHRcdFx0YWxlcnQoXCJZb3UgZGlkbid0IGNob29zZSBhbiBpcGFyIGZpbGUhIHlvdSBjYW4gb25seSBsb2FkIGlwYXIgZmlsZXMhXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0LyovLyBDcmVhdGUgYSByZWFkZXIgYW5kIHJlYWQgdGhlIHppcFxyXG5cdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRcdFx0cmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhldmVudCk7XHJcblx0XHRcdH07XHJcblx0XHRcdC8vIHJlYWQgdGhlIGZpcnN0IGZpbGVcclxuXHRcdFx0cmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGV2ZW50LnRhcmdldC5maWxlc1swXSk7Ki9cclxuXHRcdFx0XHJcblx0XHRcdHF1ZXN0aW9uLmZpbGVOYW1lID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XHJcblx0XHRcdHF1ZXN0aW9uLmJsb2IgPSBldmVudC50YXJnZXQuZmlsZXNbMF0uc2xpY2UoKTtcclxuXHJcblx0XHRcdFxyXG5cdCAgICBxdWVzdGlvbi5jb3JyZWN0QW5zd2VyKCk7XHJcbiAgICB9KTtcclxuICAgIFxyXG59XHJcblxyXG5wLmNyZWF0ZU1lc3NhZ2VXaW5kb3cgPSBmdW5jdGlvbih4bWwsIHdpbmRvdyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHR0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcbiAgICB0aGlzLm1lc3NhZ2Uuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLm1lc3NhZ2Uuc3R5bGUubGVmdCA9IFwiNDB2d1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uTmFtZVwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlaW5zdHJ1Y3Rpb25zJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJXF1ZXN0aW9uJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5tZXNzYWdlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYnV0dG9uXCIpWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0cXVlc3Rpb24uY3VycmVudFN0YXRlID0gU09MVkVfU1RBVEUuU09MVkVEO1xyXG4gICAgXHRxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICB9O1xyXG5cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbjtcclxubW9kdWxlLmV4cG9ydHMuU09MVkVfU1RBVEUgPSBTT0xWRV9TVEFURTsiLCJcclxuXHJcbmZ1bmN0aW9uIFF1ZXN0aW9uV2luZG93cyhjYWxsYmFjayl7XHJcbiAgdGhpcy5sb2FkV2luZG93cyhjYWxsYmFjayk7XHJcbn1cclxuXHJcbnZhciBwID0gUXVlc3Rpb25XaW5kb3dzLnByb3RvdHlwZTtcclxuXHJcbnAubG9hZFdpbmRvd3MgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblxyXG4gIHZhciBjb3VudGVyID0gMDtcclxuICB2YXIgY2IgPSBmdW5jdGlvbigpe1xyXG5cdCAgaWYoKytjb3VudGVyPj02ICYmIGNhbGxiYWNrKVxyXG5cdFx0ICBjYWxsYmFjaygpO1xyXG4gIH07XHJcbiAgdGhpcy5sb2FkVGFza1dpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkUmVzb3VyY2VXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZEFuc3dlcldpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkRmlsZVdpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkTWVzc2FnZVdpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkUmVzb3VyY2UoY2IpO1xyXG4gIFxyXG59XHJcblxyXG5wLmxvYWRUYXNrV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIHRhc2sgd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSB0YXNrIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLnRhc2tXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgXHRpZihjYWxsYmFjaylcclxuXHQgICAgXHQgIGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwidGFza1dpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5cclxucC5sb2FkUmVzb3VyY2VXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgcmVzb3VyY2Ugd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSByZXNvdXJjZSB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5yZXNvdXJjZVdpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICAgICAgaWYoY2FsbGJhY2spXHJcblx0ICAgICAgICBcdGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9O1xyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcInJlc291cmNlV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZFJlc291cmNlID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBHZXQgdGhlIGh0bWwgZm9yIGVhY2ggcmVzb3VyY2UgYW5kIHRoZW4gYWRkIHRoZSByZXN1bHQgdG8gdGhlIHdpbmRvd1xyXG5cdCAgICBcdHdpbmRvd3MucmVzb3VyY2UgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgICAgIGlmKGNhbGxiYWNrKVxyXG5cdCAgICAgICAgXHRjYWxsYmFjaygpO1xyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcInJlc291cmNlLmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZEFuc3dlcldpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBhbnN3ZXIgd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSBhbnN3ZXIgd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MuYW5zd2VyV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgICAgICBpZihjYWxsYmFjaylcclxuXHQgICAgICAgIFx0Y2FsbGJhY2soKTtcclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJhbnN3ZXJXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxucC5sb2FkRmlsZVdpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBmaWxlIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgZmlsZSB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5maWxlV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgIFx0aWYoY2FsbGJhY2spXHJcblx0ICAgIFx0XHRjYWxsYmFjaygpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwiZmlsZVdpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5wLmxvYWRNZXNzYWdlV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIG1lc3NhZ2Ugd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSBtZXNzYWdlIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLm1lc3NhZ2VXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHRcdCAgICBpZihjYWxsYmFjaylcclxuXHRcdCAgICBcdGNhbGxiYWNrKCk7XHJcblxyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcIm1lc3NhZ2VXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbldpbmRvd3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBSZXNvdXJjZSh4bWwsIHVybCl7XHJcblx0XHJcblx0Ly8gRmlyc3QgZ2V0IHRoZSBpY29uXHJcblx0ICB2YXIgdHlwZSA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpKTtcclxuXHQgIHN3aXRjaCh0eXBlKXtcclxuXHQgICAgY2FzZSAwOlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICcuLi9pbWcvaWNvblJlc291cmNlRmlsZS5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBjYXNlIDE6XHJcblx0ICAgICAgdGhpcy5pY29uID0gJy4uL2ltZy9pY29uUmVzb3VyY2VMaW5rLnBuZyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICAgIGNhc2UgMjpcclxuICAgIFx0ICB0aGlzLmljb24gPSAnLi4vaW1nL2ljb25SZXNvdXJjZVZpZGVvLnBuZyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICAgIGRlZmF1bHQ6XHJcblx0ICAgICAgdGhpcy5pY29uID0gJyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICB9XHJcblxyXG5cdCAgLy8gTmV4dCBnZXQgdGhlIHRpdGxlXHJcblx0ICB0aGlzLnRpdGxlID0geG1sLmdldEF0dHJpYnV0ZShcInRleHRcIik7XHJcblxyXG5cdCAgLy8gTGFzdCBnZXQgdGhlIGxpbmtcclxuXHQgIGlmKHR5cGU+MClcclxuXHQgICAgdGhpcy5saW5rID0geG1sLmdldEF0dHJpYnV0ZShcImxpbmtcIik7XHJcblx0ICBlbHNlXHJcblx0ICAgIHRoaXMubGluayA9IHVybCsnYXNzZXRzL2ZpbGVzLycreG1sLmdldEF0dHJpYnV0ZShcImxpbmtcIikucmVwbGFjZSgvIC9nLCAnJTIwJyk7XHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyByZXR1cm5zIG1vdXNlIHBvc2l0aW9uIGluIGxvY2FsIGNvb3JkaW5hdGUgc3lzdGVtIG9mIGVsZW1lbnRcclxubS5nZXRNb3VzZSA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgcmV0dXJuIG5ldyBQb2ludCgoZS5wYWdlWCAtIGUudGFyZ2V0Lm9mZnNldExlZnQpLCAoZS5wYWdlWSAtIGUudGFyZ2V0Lm9mZnNldFRvcCkpO1xyXG59XHJcblxyXG4vL3JldHVybnMgYSB2YWx1ZSByZWxhdGl2ZSB0byB0aGUgcmF0aW8gaXQgaGFzIHdpdGggYSBzcGVjaWZpYyByYW5nZSBcIm1hcHBlZFwiIHRvIGEgZGlmZmVyZW50IHJhbmdlXHJcbm0ubWFwID0gZnVuY3Rpb24odmFsdWUsIG1pbjEsIG1heDEsIG1pbjIsIG1heDIpe1xyXG4gICAgcmV0dXJuIG1pbjIgKyAobWF4MiAtIG1pbjIpICogKCh2YWx1ZSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKSk7XHJcbn1cclxuXHJcbi8vaWYgYSB2YWx1ZSBpcyBoaWdoZXIgb3IgbG93ZXIgdGhhbiB0aGUgbWluIGFuZCBtYXgsIGl0IGlzIFwiY2xhbXBlZFwiIHRvIHRoYXQgb3V0ZXIgbGltaXRcclxubS5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbHVlKSk7XHJcbn1cclxuXHJcbi8vZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBtb3VzZSBpcyBpbnRlcnNlY3RpbmcgdGhlIGFjdGl2ZSBlbGVtZW50XHJcbm0ubW91c2VJbnRlcnNlY3QgPSBmdW5jdGlvbihwTW91c2VTdGF0ZSwgcEVsZW1lbnQsIHBPZmZzZXR0ZXIpe1xyXG4gICAgaWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPiBwRWxlbWVudC5wb3NpdGlvbi54IC0gcEVsZW1lbnQud2lkdGgvMiAtIHBPZmZzZXR0ZXIueCAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCA8IHBFbGVtZW50LnBvc2l0aW9uLnggKyBwRWxlbWVudC53aWR0aC8yIC0gcE9mZnNldHRlci54KXtcclxuICAgICAgICBpZihwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA+IHBFbGVtZW50LnBvc2l0aW9uLnkgLSBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA8IHBFbGVtZW50LnBvc2l0aW9uLnkgKyBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSl7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHBNb3VzZVN0YXRlLmhhc1RhcmdldCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgXHRyZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gZ2V0cyB0aGUgeG1sIG9iamVjdCBvZiBhIHN0cmluZ1xyXG5tLmdldFhtbCA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0dmFyIHhtbERvYztcclxuXHRpZiAod2luZG93LkRPTVBhcnNlcil7XHJcblx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xyXG5cdFx0eG1sRG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh4bWwsIFwidGV4dC94bWxcIik7XHJcblx0fVxyXG5cdGVsc2V7IC8vIElFXHJcblx0XHR4bWxEb2MgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxET01cIik7XHJcblx0XHR4bWxEb2MuYXN5bmMgPSBmYWxzZTtcclxuXHRcdHhtbERvYy5sb2FkWE1MKHhtbCk7XHJcblx0fVxyXG5cdHJldHVybiB4bWxEb2M7XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIHNjYWxlIG9mIHRoZSBmaXJzdCBwYXJhbWV0ZXIgdG8gdGhlIHNlY29uZCAod2l0aCB0aGUgc2Vjb25kIGZpdHRpbmcgaW5zaWRlIHRoZSBmaXJzdClcclxubS5nZXRTY2FsZSA9IGZ1bmN0aW9uKHZpcnR1YWwsIGFjdHVhbCl7XHJcblx0cmV0dXJuIGFjdHVhbC55L3ZpcnR1YWwueCp2aXJ0dWFsLnkgPCBhY3R1YWwueCA/IGFjdHVhbC55L3ZpcnR1YWwueSA6IGFjdHVhbC54L3ZpcnR1YWwueDtcclxufVxyXG5cclxubS5yZXBsYWNlQWxsID0gZnVuY3Rpb24gKHN0ciwgdGFyZ2V0LCByZXBsYWNlbWVudCkge1xyXG5cdHdoaWxlIChzdHIuaW5kZXhPZih0YXJnZXQpIDwgMCkge1xyXG5cdFx0c3RyID0gc3RyLnJlcGxhY2UodGFyZ2V0LHJlcGxhY2VtZW50KTtcclxuXHR9XHJcblx0cmV0dXJuIHN0cjtcclxufSJdfQ==
