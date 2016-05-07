(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJib2FyZC9qcy9tYWluLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9ib2FyZC5qcyIsImJvYXJkL2pzL21vZHVsZXMvYnV0dG9uLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9jYXRlZ29yeS5qcyIsImJvYXJkL2pzL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9kcmF3TGliLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9maWxlTWFuYWdlci5qcyIsImJvYXJkL2pzL21vZHVsZXMvZ2FtZS5qcyIsImJvYXJkL2pzL21vZHVsZXMvaXBhckRhdGFQYXJzZXIuanMiLCJib2FyZC9qcy9tb2R1bGVzL2xlc3Nvbk5vZGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL21vdXNlU3RhdGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL3BvaW50LmpzIiwiYm9hcmQvanMvbW9kdWxlcy9xdWVzdGlvbi5qcyIsImJvYXJkL2pzL21vZHVsZXMvcXVlc3Rpb25XaW5kb3dzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9yZXNvdXJjZXMuanMiLCJib2FyZC9qcy9tb2R1bGVzL3V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxuLy9pbXBvcnRzXHJcbnZhciBHYW1lID0gcmVxdWlyZSgnLi9tb2R1bGVzL2dhbWUuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9tb2R1bGVzL3BvaW50LmpzJyk7XHJcbnZhciBNb3VzZVN0YXRlID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vdXNlU3RhdGUuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb25zdGFudHMuanMnKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vbW9kdWxlcy91dGlsaXRpZXMuanMnKTtcclxuXHJcbi8vZ2FtZSBvYmplY3RzXHJcbnZhciBnYW1lO1xyXG52YXIgY2FudmFzO1xyXG52YXIgY3R4O1xyXG5cclxuLy8gd2luZG93IGRpdiwgZmlsbSwgem9vbSBhbmQgaWYgcGF1c2VkXHJcbnZhciB3aW5kb3dEaXY7XHJcbnZhciB3aW5kb3dGaWxtO1xyXG52YXIgcHJvY2VlZENvbnRhaW5lcjtcclxudmFyIHByb2NlZWRMb25nO1xyXG52YXIgcHJvY2VlZFJvdW5kO1xyXG52YXIgcGF1c2VkVGltZSA9IDA7XHJcbnZhciB6b29tU2xpZGVyO1xyXG52YXIgcGluY2hTdGFydCA9IDA7XHJcblxyXG4vL3BlcnNpc3RlbnQgdXRpbGl0aWVzXHJcbnZhciBwcmV2VGltZTsgLy8gZGF0ZSBpbiBtaWxsaXNlY29uZHNcclxudmFyIGR0OyAvLyBkZWx0YSB0aW1lIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuLy9maXJlcyB3aGVuIHRoZSB3aW5kb3cgbG9hZHNcclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpe1xyXG5cdFxyXG4gICAgaW5pdGlhbGl6ZVZhcmlhYmxlcygpO1xyXG4gICAgbG9vcCgpO1xyXG5cdFxyXG59XHJcblxyXG4vL2luaXRpYWxpemF0aW9uLCBtb3VzZSBldmVudHMsIGFuZCBnYW1lIGluc3RhbnRpYXRpb25cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVZhcmlhYmxlcygpe1xyXG5cdFxyXG5cdHdpbmRvd0RpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3aW5kb3cnKTtcclxuICAgIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgcHJvY2VlZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQ29udGFpbmVyJyk7XHJcbiAgICBwcm9jZWVkTG9uZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQnRuTG9uZycpO1xyXG4gICAgcHJvY2VlZFJvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Byb2NlZWRCdG5Sb3VuZCcpO1xyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLm9mZnNldFdpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5vZmZzZXRIZWlnaHQ7XHJcblxyXG4gICAgLy8gU2V0dXAgdGhlIHdpbmRvdyBmaWxtXHJcblx0d2luZG93RmlsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3aW5kb3dGbGltJyk7XHJcblx0d2luZG93RmlsbS5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IHdpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJzsgfTtcclxuXHRcclxuXHQvLyBTZXR1cCBkdFxyXG4gICAgcHJldlRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgZHQgPSAwO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgdGhlIGdhbWVcclxuICAgIGdhbWUgPSBuZXcgR2FtZShsb2NhbFN0b3JhZ2VbJ2Nhc2VGaWxlcyddLCBjYW52YXMsIHdpbmRvd0Rpdik7XHJcbiAgICBcclxuXHQvLyBTZXR1cCB0aGUgem9vbSBidXR0b25zL3NsaWRlciBhbmQgc2NhbGUgb2YgdGhlIGdhbWVcclxuICAgIHpvb21TbGlkZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbS1zbGlkZXInKTtcclxuXHR6b29tU2xpZGVyLm9uaW5wdXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcblx0fTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tLWluJykub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBEb3duKCk7XHJcblx0XHRnYW1lLnVwZGF0ZVpvb20oLXBhcnNlRmxvYXQoem9vbVNsaWRlci52YWx1ZSkpOyBcclxuICAgIH07XHJcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tb3V0Jykub25jbGljayA9IGZ1bmN0aW9uKCkgeyBcclxuXHRcdHpvb21TbGlkZXIuc3RlcFVwKCk7IFxyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcblx0fTtcclxuXHRnYW1lLm9uQ2hhbmdlQm9hcmQgPSBmdW5jdGlvbigpIHtcclxuXHRcdHpvb21TbGlkZXIudmFsdWUgPSAtZ2FtZS5nZXRab29tKCk7XHJcblx0fTtcclxuICAgIGdhbWUuc2NhbGUgPSBVdGlsaXRpZXMuZ2V0U2NhbGUoQ29uc3RhbnRzLmJvYXJkU2l6ZSwgbmV3IFBvaW50KGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCkpO1xyXG59XHJcblxyXG4vL2ZpcmVzIG9uY2UgcGVyIGZyYW1lXHJcbmZ1bmN0aW9uIGxvb3AoKXtcclxuXHQvLyBsb29wXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3AuYmluZCh0aGlzKSk7XHJcbiAgICBcclxuXHQvLyB1cGRhdGUgZGVsdGEgdGltZVxyXG4gICAgZHQgPSBEYXRlLm5vdygpIC0gcHJldlRpbWU7XHJcbiAgICBwcmV2VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIC8vIHVwZGF0ZSBnYW1lXHJcbiAgICBnYW1lLnVwZGF0ZShjdHgsIGNhbnZhcywgZHQpO1xyXG4gICAgXHJcbiAgICBpZihnYW1lLm1vdXNlU3RhdGUuem9vbURpZmYhPTApe1xyXG4gICAgXHR6b29tU2xpZGVyLnZhbHVlID0gcGluY2hTdGFydCArIGdhbWUubW91c2VTdGF0ZS56b29tRGlmZiAqIENvbnN0YW50cy5waW5jaFNwZWVkO1xyXG4gICAgXHRnYW1lLnVwZGF0ZVpvb20oLXBhcnNlRmxvYXQoem9vbVNsaWRlci52YWx1ZSkpOyBcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIFx0cGluY2hTdGFydCA9IE51bWJlcih6b29tU2xpZGVyLnZhbHVlKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgaWYgc2hvdWxkIHBhdXNlXHJcbiAgICBpZihnYW1lLmFjdGl2ZSAmJiB3aW5kb3dEaXYuaW5uZXJIVE1MIT0nJyAmJiBwYXVzZWRUaW1lKys+Myl7XHJcbiAgICBcdGdhbWUuYWN0aXZlID0gZmFsc2U7XHJcbiAgICBcdHdpbmRvd0ZpbG0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKHBhdXNlZFRpbWUhPTAgJiYgd2luZG93RGl2LmlubmVySFRNTD09Jycpe1xyXG4gICAgXHR3aW5kb3dDbG9zZWQoKTtcclxuICAgIH1cclxufVxyXG5cclxuLy9saXN0ZW5zIGZvciBjaGFuZ2VzIGluIHNpemUgb2Ygd2luZG93IGFuZCBhZGp1c3RzIHZhcmlhYmxlcyBhY2NvcmRpbmdseVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbihlKXtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5vZmZzZXRXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMub2Zmc2V0SGVpZ2h0O1xyXG4gICAgXHJcbiAgICAvLyBHZXQgdGhlIG5ldyBzY2FsZVxyXG4gICAgZ2FtZS5zY2FsZSA9IFV0aWxpdGllcy5nZXRTY2FsZShDb25zdGFudHMuYm9hcmRTaXplLCBuZXcgUG9pbnQoY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KSk7XHJcbiAgICBcclxufSk7XHJcblxyXG4vL2xpc3RlbnMgZm9yIG1vdXNlIHdoZWVsXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJyxmdW5jdGlvbihldmVudCl7XHJcbiAgICBpZihldmVudC5kZWx0YVk8MClcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG4gICAgZWxzZVxyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBVcCgpO1xyXG5cdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICByZXR1cm4gZmFsc2U7IFxyXG59LCBmYWxzZSk7XHJcblxyXG4vLyBDYWxsZWQgd2hlbiB0aGUgcXVlc3Rpb24gd2luZG93IGNsb3Nlc1xyXG5mdW5jdGlvbiB3aW5kb3dDbG9zZWQoKXtcclxuXHRcclxuXHQvLyBVbnBhdXNlIHRoZSBnYW1lIGFuZCBmdWxseSBjbG9zZSB0aGUgd2luZG93XHJcblx0cGF1c2VkVGltZSA9IDA7XHJcblx0Z2FtZS5hY3RpdmUgPSB0cnVlO1xyXG5cdHdpbmRvd0ZpbG0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRwcm9jZWVkQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcclxuXHRnYW1lLndpbmRvd0Nsb3NlZCgpO1xyXG5cdFxyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY29uc3RhbnRzLmpzXCIpO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoXCIuL2RyYXdsaWIuanNcIik7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBib2FyZChzdGFydFBvc2l0aW9uLCBsZXNzb25Ob2Rlcyl7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMubGVzc29uTm9kZUFycmF5ID0gbGVzc29uTm9kZXM7XHJcbiAgICB0aGlzLmJvYXJkT2Zmc2V0ID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMucHJldkJvYXJkT2Zmc2V0ID0ge3g6MCx5OjB9O1xyXG4gICAgdGhpcy56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuICAgIHRoaXMuc3RhZ2UgPSAwO1xyXG4gICAgdGhpcy5sYXN0U2F2ZVRpbWUgPSAwOyAvLyBhc3N1bWUgbm8gY29va2llXHJcbiAgICB0aGlzLmxhc3RRdWVzdGlvbiA9IG51bGw7XHJcbiAgICB0aGlzLmxhc3RRdWVzdGlvbk51bSA9IC0xO1xyXG4gICAgXHJcbiAgICAvL2lmIChkb2N1bWVudC5jb29raWUpIHRoaXMubG9hZENvb2tpZSgpOyBcclxuXHJcblx0Ly8gQ2hlY2sgaWYgYWxsIG5vZGVzIGFyZSBzb2x2ZWRcclxuXHR2YXIgZG9uZSA9IHRydWU7XHJcblx0Zm9yKHZhciBpPTA7aTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGggJiYgZG9uZTtpKyspXHJcblx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0ZG9uZSA9IGZhbHNlO1xyXG5cdGlmKGRvbmUpXHJcblx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcbn1cclxuXHJcbi8vcHJvdG90eXBlXHJcbnZhciBwID0gYm9hcmQucHJvdG90eXBlO1xyXG5cclxucC5tb3ZlID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuICAgIHRoaXMucG9zaXRpb24ueCArPSBwWDtcclxuICAgIHRoaXMucG9zaXRpb24ueSArPSBwWTtcclxuICAgIHRoaXMuYm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxufTtcclxuXHJcbnAuYWN0ID0gZnVuY3Rpb24ocE1vdXNlU3RhdGUsIGR0KSB7XHJcblx0XHJcblx0Ly8gZm9yIGVhY2ggIG5vZGVcclxuICAgIGZvcih2YXIgaT0wOyBpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaSsrKXtcclxuICAgIFx0dmFyIGFjdGl2ZU5vZGUgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTsgXHJcblx0XHQvLyBoYW5kbGUgc29sdmVkIHF1ZXN0aW9uXHJcblx0XHRpZiAoYWN0aXZlTm9kZS5jdXJyZW50U3RhdGUgIT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEICYmIGFjdGl2ZU5vZGUucXVlc3Rpb24uY3VycmVudFN0YXRlID09IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCkge1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdXBkYXRlIGVhY2ggY29ubmVjdGlvbidzIGNvbm5lY3Rpb24gbnVtYmVyXHJcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYWN0aXZlTm9kZS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKylcclxuXHRcdFx0XHR0aGlzLmxlc3Nvbk5vZGVBcnJheVthY3RpdmVOb2RlLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0uY29ubmVjdGlvbnMrKztcclxuXHRcdFx0XHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSdzIHN0YXRlXHJcblx0XHRcdGFjdGl2ZU5vZGUuY3VycmVudFN0YXRlID0gYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDaGVjayBpZiBhbGwgbm9kZSdzIGFyZSBzb2x2ZWRcclxuXHRcdFx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aCAmJiBkb25lO2krKylcclxuXHRcdFx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRcdFx0aWYoZG9uZSlcclxuXHRcdFx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIHRoZXJlIGlzIGEgbGlzdGVuZXIgZm9yIHVwZGF0aW5nIG5vZGVzLCBjYWxsIGl0LlxyXG5cdFx0XHRpZih0aGlzLnVwZGF0ZU5vZGUpXHJcblx0XHRcdFx0dGhpcy51cGRhdGVOb2RlKCk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHVwZGF0ZSB0aGUgbm9kZSdzIHRyYW5zaXRpb24gcHJvZ3Jlc3NcclxuXHRcdGlmIChhY3RpdmVOb2RlLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGFjdGl2ZU5vZGUubGluZVBlcmNlbnQgPSBNYXRoLm1pbigxLGR0KkNvbnN0YW50cy5saW5lU3BlZWQgKyBhY3RpdmVOb2RlLmxpbmVQZXJjZW50KTtcclxuXHR9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIG1vdXNlIGV2ZW50cyBpZiBnaXZlbiBhIG1vdXNlIHN0YXRlXHJcbiAgICBpZihwTW91c2VTdGF0ZSkge1xyXG5cdCAgICBcclxuXHQgICAgLy8gaG92ZXIgc3RhdGVzXHJcblx0XHQvL2Zvcih2YXIgaSA9IDA7IGkgPCBib2FyZEFycmF5Lmxlbmd0aDsgaSsrKXtcclxuXHRcdFx0Ly8gbG9vcCB0aHJvdWdoIGxlc3NvbiBub2RlcyB0byBjaGVjayBmb3IgaG92ZXJcclxuXHRcdFx0Ly8gdXBkYXRlIGJvYXJkXHJcblx0XHRcclxuXHQgICAgaWYgKCFwTW91c2VTdGF0ZS5tb3VzZURvd24gJiYgdGhpcy50YXJnZXQpIHtcclxuXHRcdFx0dGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uID0gdW5kZWZpbmVkOyAvLyBjbGVhciBkcmFnIGJlaGF2aW9yXHJcblx0XHRcdHRoaXMudGFyZ2V0LmRyYWdnaW5nID0gZmFsc2U7XHJcblx0XHRcdHRoaXMudGFyZ2V0ID0gbnVsbDtcclxuXHRcdH1cclxuXHQgICAgXHJcblx0XHRmb3IgKHZhciBpPXRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aC0xLCBub2RlQ2hvc2VuOyBpPj0wICYmIHRoaXMudGFyZ2V0PT1udWxsOyBpLS0pIHtcclxuXHRcdFx0dmFyIGxOb2RlID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV07XHJcblx0XHRcdFxyXG5cdFx0XHRsTm9kZS5tb3VzZU92ZXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vY29uc29sZS5sb2coXCJub2RlIHVwZGF0ZVwiKTtcclxuXHRcdFx0Ly8gaWYgaG92ZXJpbmcsIHNob3cgaG92ZXIgZ2xvd1xyXG5cdFx0XHQvKmlmIChwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggPiBsTm9kZS5wb3NpdGlvbi54LWxOb2RlLndpZHRoLzIgXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCA8IGxOb2RlLnBvc2l0aW9uLngrbE5vZGUud2lkdGgvMlxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgPiBsTm9kZS5wb3NpdGlvbi55LWxOb2RlLmhlaWdodC8yXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSA8IGxOb2RlLnBvc2l0aW9uLnkrbE5vZGUuaGVpZ2h0LzIpIHsqL1xyXG5cdFx0XHRpZiAoVXRpbGl0aWVzLm1vdXNlSW50ZXJzZWN0KHBNb3VzZVN0YXRlLGxOb2RlLHRoaXMuYm9hcmRPZmZzZXQpKSB7XHJcblx0XHRcdFx0bE5vZGUubW91c2VPdmVyID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldCA9IGxOb2RlO1xyXG5cdFx0XHRcdC8vY29uc29sZS5sb2cocE1vdXNlU3RhdGUuaGFzVGFyZ2V0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYodGhpcy50YXJnZXQpe1xyXG5cdFxyXG5cdFx0XHRpZighdGhpcy50YXJnZXQuZHJhZ2dpbmcpe1xyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHRcdC8vIGRyYWdcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdnaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IG5ldyBQb2ludChcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueCxcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGNsaWNrIGNvZGVcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmNsaWNrKHBNb3VzZVN0YXRlKTtcclxuXHRcdFx0XHRcdHRoaXMubGFzdFF1ZXN0aW9uID0gdGhpcy50YXJnZXQucXVlc3Rpb247XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RRdWVzdGlvbk51bSA9IGk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxYID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueDtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi54ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWCxDb25zdGFudHMuYm9hcmRTaXplLnggLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WCA9IHRoaXMudGFyZ2V0LnBvc2l0aW9uLng7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxZID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi55ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWSxDb25zdGFudHMuYm9hcmRTaXplLnkgLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WSA9IHRoaXMudGFyZ2V0LnBvc2l0aW9uLnk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0ICB9XHJcblx0XHRcclxuXHRcdC8vIGRyYWcgdGhlIGJvYXJkIGFyb3VuZFxyXG5cdFx0aWYgKHRoaXMudGFyZ2V0PT1udWxsKSB7XHJcblx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy13ZWJraXQtZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLW1vei1ncmFiYmluZyc7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcblx0XHRcdFx0aWYgKCF0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQpIHtcclxuXHRcdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbjtcclxuXHRcdFx0XHRcdHRoaXMucHJldkJvYXJkT2Zmc2V0LnggPSB0aGlzLmJvYXJkT2Zmc2V0Lng7XHJcblx0XHRcdFx0XHR0aGlzLnByZXZCb2FyZE9mZnNldC55ID0gdGhpcy5ib2FyZE9mZnNldC55O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnggLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC54ID4gdGhpcy5tYXhCb2FyZFdpZHRoLzIpIHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMubWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueCA8IC0xKnRoaXMubWF4Qm9hcmRXaWR0aC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnggPSAtMSp0aGlzLm1heEJvYXJkV2lkdGgvMjtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnkgLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueSk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55ID4gdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSB0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55IDwgLTEqdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSAtMSp0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJyc7XHJcblx0XHRcdH1cclxuXHQgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcbiAgICBcclxuICAgIC8vIHNhdmUgY2FudmFzIHN0YXRlIGJlY2F1c2Ugd2UgYXJlIGFib3V0IHRvIGFsdGVyIHByb3BlcnRpZXNcclxuICAgIGN0eC5zYXZlKCk7ICAgXHJcblxyXG4gICAgLy8gVHJhbnNsYXRlIHRvIGNlbnRlciBvZiBzY3JlZW4gYW5kIHNjYWxlIGZvciB6b29tIHRoZW4gdHJhbnNsYXRlIGJhY2tcclxuICAgIGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoLzIsIGNhbnZhcy5oZWlnaHQvMik7XHJcbiAgICBjdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgtY2FudmFzLndpZHRoLzIsIC1jYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgLy8gbW92ZSB0aGUgYm9hcmQgdG8gd2hlcmUgdGhlIHVzZXIgZHJhZ2dlZCBpdFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMuYm9hcmRPZmZzZXQ7XHJcbiAgICAvL3RyYW5zbGF0ZSB0byB0aGUgY2VudGVyIG9mIHRoZSBib2FyZFxyXG4gICAgLy9jb25zb2xlLmxvZyh0aGlzKTtcclxuICAgIGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoLzIgLSB0aGlzLnBvc2l0aW9uLngsIGNhbnZhcy5oZWlnaHQvMiAtIHRoaXMucG9zaXRpb24ueSk7XHJcbiAgICBcclxuXHRcclxuICAgIC8vIERyYXcgdGhlIGJhY2tncm91bmQgb2YgdGhlIGJvYXJkXHJcbiAgICBEcmF3TGliLnJlY3QoY3R4LCAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngsIENvbnN0YW50cy5ib2FyZFNpemUueSwgXCIjRDNCMTg1XCIpO1xyXG4gICAgRHJhd0xpYi5zdHJva2VSZWN0KGN0eCwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkT3V0bGluZSwgXCIjQ0I5OTY2XCIpO1xyXG4gICAgXHJcblx0Ly8gZHJhdyB0aGUgbm9kZXNcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICBcclxuICAgIFx0Ly8gdGVtcG9yYXJpbHkgaGlkZSBhbGwgYnV0IHRoZSBmaXJzdCBxdWVzdGlvblx0XHRcdFx0XHRcdC8vIHNvbWV0aGluZyBpcyB3cm9uZyBoZXJlLCBsaW5rc0F3YXlGcm9tT3JpZ2luIGRvZXMgbm90IGV4aXN0IGFueW1vcmVcclxuXHRcdC8vaWYgKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCA+IHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmtzQXdheUZyb21PcmlnaW4pIGNvbnRpbnVlO1xyXG4gICAgXHRcclxuICAgIFx0Ly8gZHJhdyB0aGUgbm9kZSBpdHNlbGZcclxuICAgICAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5kcmF3KGN0eCwgY2FudmFzKTtcclxuICAgIH1cclxuXHJcblx0Ly8gZHJhdyB0aGUgbGluZXNcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcclxuXHRcdC8vIG9ubHkgc2hvdyBsaW5lcyBmcm9tIHNvbHZlZCBxdWVzdGlvbnNcclxuXHRcdGlmICh0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCkgY29udGludWU7XHJcblx0XHRcclxuXHRcdC8vIGdldCB0aGUgcGluIHBvc2l0aW9uXHJcbiAgICAgICAgdmFyIG9Qb3MgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICBcclxuXHRcdC8vIHNldCBsaW5lIHN0eWxlXHJcblx0XHRjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMCwwLDEwNSwwLjIpXCI7XHJcblx0XHRjdHgubGluZVdpZHRoID0gMTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBkcmF3IGxpbmVzXHJcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIC0xIGJlY2FzZSBub2RlIGNvbm5lY3Rpb24gaW5kZXggdmFsdWVzIGFyZSAxLWluZGV4ZWQgYnV0IGNvbm5lY3Rpb25zIGlzIDAtaW5kZXhlZFxyXG5cdFx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXS5xdWVzdGlvbi5jdXJyZW50U3RhdGU9PVF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTikgY29udGludWU7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIGdvIHRvIHRoZSBpbmRleCBpbiB0aGUgYXJyYXkgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgY29ubmVjdGVkIG5vZGUgb24gdGhpcyBib2FyZCBhbmQgc2F2ZSBpdHMgcG9zaXRpb25cclxuICAgICAgICBcdC8vIGNvbm5lY3Rpb24gaW5kZXggc2F2ZWQgaW4gdGhlIGxlc3Nvbk5vZGUncyBxdWVzdGlvblxyXG4gICAgICAgIFx0dmFyIGNvbm5lY3Rpb24gPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVt0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdO1xyXG4gICAgICAgIFx0dmFyIGNQb3MgPSBjb25uZWN0aW9uLmdldE5vZGVQb2ludCgpO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyBkcmF3IHRoZSBsaW5lXHJcbiAgICAgICAgXHRjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgXHQvLyB0cmFuc2xhdGUgdG8gc3RhcnQgKHBpbilcclxuICAgICAgICBcdGN0eC5tb3ZlVG8ob1Bvcy54LCBvUG9zLnkpO1xyXG4gICAgICAgIFx0Y3R4LmxpbmVUbyhvUG9zLnggKyAoY1Bvcy54IC0gb1Bvcy54KSp0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5saW5lUGVyY2VudCwgb1Bvcy55ICsgKGNQb3MueSAtIG9Qb3MueSkqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGluZVBlcmNlbnQpO1xyXG4gICAgICAgIFx0Y3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgIFx0Y3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbi8vIEdldHMgYSBmcmVlIG5vZGUgaW4gdGhpcyBib2FyZCAoaS5lLiBub3QgdW5zb2x2ZWQpIHJldHVybnMgbnVsbCBpZiBub25lXHJcbnAuZ2V0RnJlZU5vZGUgPSBmdW5jdGlvbigpIHtcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKylcclxuXHRcdGlmKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRClcclxuXHRcdFx0cmV0dXJuIHRoaXMubGVzc29uTm9kZUFycmF5W2ldO1xyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vLyBNb3ZlcyB0aGlzIGJvYXJkIHRvd2FyZHMgdGhlIGdpdmVuIHBvaW50XHJcbnAubW92ZVRvd2FyZHMgPSBmdW5jdGlvbihwb2ludCwgZHQsIHNwZWVkKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHZlY3RvciB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5cdHZhciB0b1BvaW50ID0gbmV3IFBvaW50KHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54LCBwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSk7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBkaXN0YW5jZSBvZiBzYWlkIHZlY3RvclxyXG5cdHZhciBkaXN0YW5jZSA9IE1hdGguc3FydCh0b1BvaW50LngqdG9Qb2ludC54K3RvUG9pbnQueSp0b1BvaW50LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgbmV3IG9mZnNldCBvZiB0aGUgYm9hcmQgYWZ0ZXIgbW92aW5nIHRvd2FyZHMgdGhlIHBvaW50XHJcblx0dmFyIG5ld09mZnNldCA9IG5ldyBQb2ludCggdGhpcy5ib2FyZE9mZnNldC54ICsgdG9Qb2ludC54L2Rpc3RhbmNlKmR0KnNwZWVkLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5ib2FyZE9mZnNldC55ICsgdG9Qb2ludC55L2Rpc3RhbmNlKmR0KnNwZWVkKTtcclxuXHRcclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geCBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB4XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC54ICE9cG9pbnQueCAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueC1uZXdPZmZzZXQueCkvKHBvaW50LngtbmV3T2Zmc2V0LngpPT1NYXRoLmFicyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkvKHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IG5ld09mZnNldC54O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHBvaW50Lng7XHJcblx0XHJcblxyXG5cdC8vIENoZWNrIGlmIHBhc3NlZCBwb2ludCBvbiB5IGF4aXMgYW5kIGlmIHNvIHNldCB0byBwb2ludCdzIHlcclxuXHRpZih0aGlzLmJvYXJkT2Zmc2V0LnkgIT0gcG9pbnQueSAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueS1uZXdPZmZzZXQueSkvKHBvaW50LnktbmV3T2Zmc2V0LnkpPT1NYXRoLmFicyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkvKHBvaW50LnktdGhpcy5ib2FyZE9mZnNldC55KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IG5ld09mZnNldC55O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHBvaW50Lnk7XHJcbn1cclxuXHJcbnAud2luZG93Q2xvc2VkID0gZnVuY3Rpb24oKXtcclxuXHRjb25zb2xlLmxvZyhcIndpbmRvdyBjbG9zZWRcIik7XHJcblx0Ly8gaWYgaXQgaXMgZmlsZSB0eXBlXHJcblx0aWYgKHRoaXMubGFzdFF1ZXN0aW9uLnF1ZXN0aW9uVHlwZSA9PSA0KSB7XHJcblx0XHQvLyBhZGQgYSBmaWxlIHRvIHRoZSBmaWxlIHN5c3RlbVxyXG5cdFx0dmFyIG5hbWUgPSB0aGlzLmxhc3RRdWVzdGlvbi5maWxlTmFtZTtcclxuXHRcdHZhciBibG9iID0gdGhpcy5sYXN0UXVlc3Rpb24uYmxvYjtcclxuXHRcdHZhciBsYXN0UXVlc3Rpb25OdW0gPSB0aGlzLmxhc3RRdWVzdGlvbk51bTtcclxuXHRcdHJldHVybiB7IFxyXG5cdFx0XHRibG9iOiBibG9iLCBcclxuXHRcdFx0bnVtOiBsYXN0UXVlc3Rpb25OdW0sIFxyXG5cdFx0XHRleHQ6IG5hbWUuc3Vic3RyaW5nKCBuYW1lLmxhc3RJbmRleE9mKFwiLlwiKSwgbmFtZS5sZW5ndGgpXHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib2FyZDsgICAgXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gYnV0dG9uKHN0YXJ0UG9zaXRpb24sIHdpZHRoLCBoZWlnaHQpe1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuaG92ZXJlZCA9IGZhbHNlO1xyXG59XHJcbmJ1dHRvbi5kcmF3TGliID0gdW5kZWZpbmVkO1xyXG5cclxudmFyIHAgPSBidXR0b24ucHJvdG90eXBlO1xyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4KXtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICB2YXIgY29sO1xyXG4gICAgaWYodGhpcy5ob3ZlcmVkKXtcclxuICAgICAgICBjb2wgPSBcImRvZGdlcmJsdWVcIjtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY29sID0gXCJsaWdodGJsdWVcIjtcclxuICAgIH1cclxuICAgIC8vZHJhdyByb3VuZGVkIGNvbnRhaW5lclxyXG4gICAgYm9hcmRCdXR0b24uZHJhd0xpYi5yZWN0KGN0eCwgdGhpcy5wb3NpdGlvbi54IC0gdGhpcy53aWR0aC8yLCB0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLmhlaWdodC8yLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgY29sKTtcclxuXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBidXR0b247IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBDYXRlZ29yeShuYW1lLCB4bWwsIHJlc291cmNlcywgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3Mpe1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIG5hbWVcclxuXHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdFxyXG5cdC8vIExvYWQgYWxsIHRoZSBxdWVzdGlvbnNcclxuXHR2YXIgcXVlc3Rpb25FbGVtZW50cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKTtcclxuXHR0aGlzLnF1ZXN0aW9ucyA9IFtdO1xyXG5cdC8vIGNyZWF0ZSBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8cXVlc3Rpb25FbGVtZW50cy5sZW5ndGg7IGkrKykgXHJcblx0e1xyXG5cdFx0Ly8gY3JlYXRlIGEgcXVlc3Rpb24gb2JqZWN0XHJcblx0XHR0aGlzLnF1ZXN0aW9uc1tpXSA9IG5ldyBRdWVzdGlvbihxdWVzdGlvbkVsZW1lbnRzW2ldLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKTtcclxuXHR9XHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYXRlZ29yeTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyBUaGUgc2l6ZSBvZiB0aGUgYm9hcmQgaW4gZ2FtZSB1bml0cyBhdCAxMDAlIHpvb21cclxubS5ib2FyZFNpemUgPSBuZXcgUG9pbnQoMTkyMCwgMTA4MCk7XHJcblxyXG4vL1RoZSBzaXplIG9mIHRoZSBib2FyZCBvdXRsaW5lIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRPdXRsaW5lID0gbS5ib2FyZFNpemUueCA+IG0uYm9hcmRTaXplLnkgPyBtLmJvYXJkU2l6ZS54LzIwIDogbS5ib2FyZFNpemUueS8yMDtcclxuXHJcbi8vIFRoZSB6b29tIHZhbHVlcyBhdCBzdGFydCBhbmQgZW5kIG9mIGFuaW1hdGlvblxyXG5tLnN0YXJ0Wm9vbSA9IDAuNTtcclxubS5lbmRab29tID0gMS41O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSB6b29tIGFuaW1hdGlvblxyXG5tLnpvb21TcGVlZCA9IDAuMDAxO1xyXG5tLnpvb21Nb3ZlU3BlZWQgPSAwLjc1O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSBsaW5lIGFuaW1hdGlvblxyXG5tLmxpbmVTcGVlZCA9IDAuMDAyO1xyXG5cclxuLy8gVGhlIHRpbWUgYmV0d2VlbiB6b29tIGNoZWNrc1xyXG5tLnBpbmNoU3BlZWQgPSAuMDAyNTsiLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxubS5jbGVhciA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCkge1xyXG4gICAgY3R4LmNsZWFyUmVjdCh4LCB5LCB3LCBoKTtcclxufVxyXG5cclxubS5yZWN0ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoLCBjb2wsIGNlbnRlck9yaWdpbikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2w7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh4IC0gKHcgLyAyKSwgeSAtIChoIC8gMiksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLnN0cm9rZVJlY3QgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgsIGxpbmUsIGNvbCwgY2VudGVyT3JpZ2luKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IGxpbmU7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHggLSAodyAvIDIpLCB5IC0gKGggLyAyKSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5saW5lID0gZnVuY3Rpb24oY3R4LCB4MSwgeTEsIHgyLCB5MiwgdGhpY2tuZXNzLCBjb2xvcikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlja25lc3M7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0uY2lyY2xlID0gZnVuY3Rpb24oY3R4LCB4LCB5LCByYWRpdXMsIGNvbG9yKXtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgseSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvYXJkQnV0dG9uKGN0eCwgcG9zaXRpb24sIHdpZHRoLCBoZWlnaHQsIGhvdmVyZWQpe1xyXG4gICAgLy9jdHguc2F2ZSgpO1xyXG4gICAgaWYoaG92ZXJlZCl7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZG9kZ2VyYmx1ZVwiO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJsaWdodGJsdWVcIjtcclxuICAgIH1cclxuICAgIC8vZHJhdyByb3VuZGVkIGNvbnRhaW5lclxyXG4gICAgY3R4LnJlY3QocG9zaXRpb24ueCAtIHdpZHRoLzIsIHBvc2l0aW9uLnkgLSBoZWlnaHQvMiwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICAvL2N0eC5yZXN0b3JlKCk7XHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIENhdGVnb3J5ID0gcmVxdWlyZShcIi4vY2F0ZWdvcnkuanNcIik7XHJcbnZhciBSZXNvdXJjZSA9IHJlcXVpcmUoXCIuL3Jlc291cmNlcy5qc1wiKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG52YXIgUGFyc2VyID0gcmVxdWlyZSgnLi9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG52YXIgUXVlc3Rpb25XaW5kb3dzID0gcmVxdWlyZSgnLi9xdWVzdGlvbldpbmRvd3MuanMnKTtcclxud2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgID0gd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgfHwgd2luZG93LndlYmtpdFJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkw7XHJcblxyXG4vLyBNb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG52YXIgYmFzZVVSTCA9IGxvY2FsU3RvcmFnZVsnY2FzZUZpbGVzJ107XHJcblxyXG52YXIgZmlsZVN5c3RlbSA9IG51bGw7XHJcblxyXG52YXIgYmFzZURpciA9IG51bGw7XHJcblxyXG52YXIgYWRkRmlsZURhdGEgPSB7IGZpbGVuYW1lOiBcIlwiLCBibG9iOiBcIlwiLCBjYWxsYmFjazogdW5kZWZpbmVkfTtcclxuXHJcbi8vIHN0b3JlcyBhbiBhcnJheSBvZiBhbGwgdGhlIGZpbGVzIGZvciByZXppcHBpbmdcclxudmFyIGFsbEVudHJpZXM7XHJcblxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBsb2FkIHRoZSBmaWxlIGVudHJ5IGFuZCBwYXJzZSB0aGUgeG1sXHJcbm0ubG9hZENhc2UgPSBmdW5jdGlvbih1cmwsIHdpbmRvd0RpdiwgY2FsbGJhY2spIHtcclxuICAgIFxyXG4gICAgdGhpcy5jYXRlZ29yaWVzID0gW107XHJcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdO1xyXG4gICAgXHJcbiAgICAvLyBMb2FkIHRoZSBxdWVzdGlvbiB3aW5kb3dzIGZpcnN0XHJcbiAgICB2YXIgd2luZG93cyA9IG5ldyBRdWVzdGlvbldpbmRvd3MoZnVuY3Rpb24oKXtcclxuICAgIFx0Ly8gZ2V0IFhNTFxyXG4gICAgICAgIHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMKHVybCsnYWN0aXZlL2Nhc2VGaWxlLmlwYXJkYXRhJywgZnVuY3Rpb24oZmlsZUVudHJ5KSB7XHJcbiAgICBcdFx0ZmlsZUVudHJ5LmZpbGUoZnVuY3Rpb24oZmlsZSkge1xyXG4gICAgXHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICBcdFx0XHRcclxuICAgIFx0XHRcdC8vIGhvb2sgdXAgY2FsbGJhY2tcclxuICAgIFx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICBcdFx0XHRcdC8vIEdldCB0aGUgcmF3IGRhdGFcclxuICAgIFx0XHRcdFx0dmFyIHJhd0RhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKHRoaXMucmVzdWx0KTtcclxuICAgIFx0XHRcdFx0dmFyIGNhdGVnb3JpZXMgPSBQYXJzZXIuZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyhyYXdEYXRhLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcbiAgICBcdFx0XHRcdC8vIGxvYWQgdGhlIG1vc3QgcmVjZW50IHZlcnNpb25cclxuICAgIFx0XHRcdFx0dmFyIGF1dG9zYXZlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhdXRvc2F2ZVwiKTtcclxuICAgIFx0XHRcdFx0aWYgKGF1dG9zYXZlKSB7XHJcbiAgICBcdFx0XHRcdFx0bG9hZEF1dG9zYXZlKGF1dG9zYXZlLCBjYXRlZ29yaWVzLCBjYWxsYmFjayk7XHJcbiAgICBcdFx0XHRcdH0gZWxzZSB7XHJcbiAgICBcdFx0XHRcdFx0bG9hZFNhdmVQcm9ncmVzcyhjYXRlZ29yaWVzLCB1cmwsIHdpbmRvd0RpdiwgY2FsbGJhY2spO1xyXG4gICAgXHRcdFx0XHR9XHJcbiAgICBcdFx0XHRcdC8vIHByZXBhcmUgZm9yIHNhdmluZyBieSByZWFkaW5nIHRoZSBmaWxlcyByaWdodCB3aGVuIHRoZSBwcm9ncmFtIHN0YXJ0c1xyXG4gICAgXHRcdFx0ICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCAxMDI0KjEwMjQsIHJlY3Vyc2l2ZWx5UmVhZEZpbGVzLCBlcnJvckhhbmRsZXIpO1xyXG4gICAgXHRcdFx0fTtcclxuICAgIFx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xyXG4gICAgXHRcdCAgIFxyXG4gICAgXHRcdH0sIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRcdFx0Y29uc29sZS5sb2coXCJFcnJvcjogXCIrZS5tZXNzYWdlKTtcclxuICAgIFx0XHR9KTtcclxuICAgIFx0fSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuLy8gbG9hZCB0aGUgc2F2ZSBmcm9tIHRoZSBmaWxlc3l0ZW0gc2FuZGJveFxyXG5mdW5jdGlvbiBsb2FkU2F2ZVByb2dyZXNzKGNhdGVnb3JpZXMsIHVybCwgd2luZG93RGl2LCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHF1ZXN0aW9ucyA9IFtdO1xyXG4gICAgXHJcblx0Ly8gZ2V0IFhNTFxyXG4gICAgd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwodXJsKydhY3RpdmUvc2F2ZUZpbGUuaXBhcmRhdGEnLCBmdW5jdGlvbihmaWxlRW50cnkpIHtcclxuXHRcdGZpbGVFbnRyeS5maWxlKGZ1bmN0aW9uKGZpbGUpIHtcclxuXHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBob29rIHVwIGNhbGxiYWNrXHJcblx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHRoZSBzYXZlIGRhdGFcclxuXHRcdFx0XHR2YXIgc2F2ZURhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKHRoaXMucmVzdWx0KTtcclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgc2F2ZSBkYXRhXHJcblx0XHRcdFx0UGFyc2VyLmFzc2lnblF1ZXN0aW9uU3RhdGVzKGNhdGVnb3JpZXMsIHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25cIikpO1xyXG5cdFx0XHRcdC8vIHByb2dyZXNzXHJcblx0XHRcdFx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0XHRcdFx0Ly8gY2FsbGJhY2sgd2l0aCByZXN1bHRzXHJcblx0XHRcdFx0Y2FsbGJhY2soY2F0ZWdvcmllcywgc3RhZ2UpOyAvLyBtYXliZSBzdGFnZSArIDEgd291bGQgYmUgYmV0dGVyIGJlY2F1c2UgdGhleSBhcmUgbm90IHplcm8gaW5kZXhlZD9cclxuXHRcdFx0ICAgXHJcblx0XHRcdH07XHJcblx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xyXG5cdFx0ICAgXHJcblx0XHR9LCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJFcnJvcjogXCIrZS5tZXNzYWdlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBsb2FkIHRoZSBzYXZlIGZyb20gdGhlIGxvY2FsU3RvcmFnZVxyXG5mdW5jdGlvbiBsb2FkQXV0b3NhdmUoYXV0b3NhdmUsIGNhdGVnb3JpZXMsIGNhbGxiYWNrKSB7XHJcblx0Ly8gR2V0IHRoZSBzYXZlIGRhdGFcclxuXHR2YXIgc2F2ZURhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKGF1dG9zYXZlKTtcclxuXHRQYXJzZXIuYXNzaWduUXVlc3Rpb25TdGF0ZXMoY2F0ZWdvcmllcywgc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblwiKSk7XHJcblx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0Y2FsbGJhY2soY2F0ZWdvcmllcywgc3RhZ2UpO1xyXG59XHJcblxyXG5cdFx0XHRcdFx0IFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIFNBVklORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8qIGhlcmUncyB0aGUgZ2VuZXJhbCBvdXRsaW5lIG9mIHdoYXQgaXMgaGFwcGVuaW5nOlxyXG5zZWxlY3RTYXZlTG9jYXRpb24gd2FzIHRoZSBvbGQgd2F5IG9mIGRvaW5nIHRoaW5nc1xyXG5ub3cgd2UgdXNlIGNyZWF0ZVppcFxyXG4gLSB3aGVuIHRoaXMgd2hvbGUgdGhpbmcgc3RhcnRzLCB3ZSByZXF1ZXN0IGEgZmlsZSBzeXN0ZW0gYW5kIHNhdmUgYWxsIHRoZSBlbnRyaWVzIChkaXJlY3RvcmllcyBhbmQgZmlsZXMpIHRvIHRoZSBhbGxFbnRyaWVzIHZhcmlhYmxlXHJcbiAtIHRoZW4gd2UgZ2V0IHRoZSBibG9icyB1c2luZyByZWFkQXNCaW5hcnlTdHJpbmcgYW5kIHN0b3JlIHRob3NlIGluIGFuIGFycmF5IHdoZW4gd2UgYXJlIHNhdmluZyBcclxuICAtIC0gY291bGQgZG8gdGhhdCBvbiBwYWdlIGxvYWQgdG8gc2F2ZSB0aW1lIGxhdGVyLi4/XHJcbiAtIGFueXdheSwgdGhlbiB3ZSAtIGluIHRoZW9yeSAtIHRha2UgdGhlIGJsb2JzIGFuZCB1c2UgemlwLmZpbGUoZW50cnkubmFtZSwgYmxvYikgdG8gcmVjcmVhdGUgdGhlIHN0cnVjdHVyZVxyXG4gLSBhbmQgZmluYWxseSB3ZSBkb3dubG9hZCB0aGUgemlwIHdpdGggZG93bmxvYWQoKVxyXG4gXHJcbiovXHJcblxyXG4vLyBjYWxsZWQgd2hlbiB0aGUgZ2FtZSBpcyBsb2FkZWQsIGFkZCBvbmNsaWNrIHRvIHNhdmUgYnV0dG9uIHRoYXQgYWN0dWFsbHkgZG9lcyB0aGUgc2F2aW5nXHJcbm0ucHJlcGFyZVppcCA9IGZ1bmN0aW9uKG15Qm9hcmRzKSB7XHJcblx0Ly92YXIgY29udGVudCA9IHppcC5nZW5lcmF0ZSgpO1xyXG5cdFxyXG5cdGNvbnNvbGUubG9nKFwicHJlcGFyZSB6aXBcIik7XHJcblx0XHJcblx0Ly8gY29kZSBmcm9tIEpTWmlwIHNpdGVcclxuXHR2YXIgYmxvYkxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxvYicpO1xyXG5cdGlmIChKU1ppcC5zdXBwb3J0LmJsb2IpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwic3VwcG9ydHMgYmxvYlwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gbGluayBkb3dubG9hZCB0byBjbGlja1xyXG5cdFx0YmxvYkxpbmsub25jbGljayA9IGZ1bmN0aW9uKCkgeyBzYXZlSVBBUihteUJvYXJkcyk7IH07XHJcbiAgXHR9XHJcbn1cclxuXHJcbi8vIGNyZWF0ZSBJUEFSIGZpbGUgYW5kIGRvd25sb2FkIGl0XHJcbmZ1bmN0aW9uIHNhdmVJUEFSKGJvYXJkcykge1xyXG5cclxuXHQvLyBlcnJvciBoYW5kbGluZ1xyXG5cdGlmICghYWxsRW50cmllcykge1xyXG5cdFx0YWxlcnQoXCJDQU5OT1QgU0FWRTogZmlsZSBkYXRhIGRpZCBub3QgbG9hZFwiKTsgcmV0dXJuOyBcclxuXHR9XHJcblx0Ly8gMSlcclxuXHQvLyBnZXQgdGhlIGZpbGVzIHRoYXQgdGhlIHVzZXIgdXBsb2FkZWQgXHJcblx0dmFyIHVwbG9hZGVkRmlsZXMgPSBnZXRBbGxTdWJtaXNzaW9ucyhib2FyZHMpO1xyXG5cdFxyXG5cdC8vIDIpXHJcblx0Ly8gY3JlYXRlIHRoZSBjYXNlIGZpbGUgbGlrZSB0aGUgb25lIHdlIGxvYWRlZFxyXG5cdHZhciBjYXNlRmlsZSA9IFBhcnNlci5yZWNyZWF0ZUNhc2VGaWxlKGJvYXJkcyk7XHJcblx0XHJcblx0Ly8gMykgKEFTWU5DKVxyXG5cdC8vIHJlY3JlYXRlIHRoZSBJUEFSIGZpbGUgdXNpbmcgRmlsZVN5c3RlbSwgdGhlbiBkb3dubG9hZCBpdFxyXG5cdGdldEFsbENvbnRlbnRzKGNhc2VGaWxlLCB1cGxvYWRlZEZpbGVzKTtcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlWmlwKGRhdGEsIGJsb2JzLCBuYW1lcywgc3Vicykge1xyXG5cdGNvbnNvbGUubG9nKFwiY3JlYXRlIHppcCBydW5cIik7XHJcblx0XHJcblx0dmFyIHppcCA9IG5ldyBKU1ppcCgpO1xyXG5cclxuXHQvLyB6aXAgZWFjaCBmaWxlIG9uZSBieSBvbmVcclxuXHRibG9icy5mb3JFYWNoKGZ1bmN0aW9uKGJsb2IsaSkge1xyXG5cdFx0emlwLmZpbGUobmFtZXNbaV0sYmxvYik7XHJcblx0fSk7XHJcblx0Ly8gemlwIHN1Ym1pdHRlZCBmaWxlc1xyXG5cdHN1YnMubmFtZXMuZm9yRWFjaChmdW5jdGlvbihzdWJOYW1lLGkpIHtcclxuXHRcdHppcC5maWxlKFwiY2FzZVxcXFxhY3RpdmVcXFxcc3VibWl0dGVkXFxcXFwiK3N1Yk5hbWUsc3Vicy5ibG9ic1tpXSk7XHJcblx0fSk7XHJcblx0XHJcblx0Ly8gYmFja3NsYXNoZXMgcGVyIHppcCBmaWxlIHByb3RvY29sXHJcblx0emlwLmZpbGUoXCJjYXNlXFxcXGFjdGl2ZVxcXFxzYXZlRmlsZS5pcGFyZGF0YVwiLGRhdGEpO1xyXG5cdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0ZG93bmxvYWQoemlwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWxsU3VibWlzc2lvbnMoYm9hcmRzKSB7XHJcblx0dmFyIG5hbWVzID0gW107XHJcblx0dmFyIGJsb2JzID0gW107XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBhZGQgYmxvYnMgdG8gYW4gYXJyYXlcclxuXHRcdFx0aWYgKHEuZmlsZU5hbWUgJiYgcS5ibG9iKSB7XHJcblx0XHRcdFx0bmFtZXMucHVzaChxLmZpbGVOYW1lKTtcclxuXHRcdFx0XHRibG9icy5wdXNoKHEuYmxvYik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0Ly8gcmV0dXJuIHN1Ym1pc3Npb25zIG9iamVjdCBcclxuXHRyZXR1cm4ge1xyXG5cdFx0XCJuYW1lc1wiIDogbmFtZXMsXHJcblx0XHRcImJsb2JzXCIgOiBibG9ic1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWxsQ29udGVudHMoZGF0YSwgc3Vicykge1xyXG5cdHZhciBibG9icyA9IFtdO1xyXG5cdHZhciBuYW1lcyA9IFtdO1xyXG5cdHZhciBmaWxlQ291bnQgPSAwO1xyXG5cdGFsbEVudHJpZXMuZm9yRWFjaChmdW5jdGlvbihmaWxlRW50cnkpIHtcclxuXHRcdC8vemlwLmZpbGUoZmlsZUVudHJ5Lm5hbWUsZmlsZUVudHJ5XHJcblx0XHRpZiAoZmlsZUVudHJ5LmlzRmlsZSkge1xyXG5cdFx0XHRmaWxlQ291bnQrK1xyXG5cdFx0XHQvLyBHZXQgYSBGaWxlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGZpbGUsXHJcblx0XHRcdC8vIHRoZW4gdXNlIEZpbGVSZWFkZXIgdG8gcmVhZCBpdHMgY29udGVudHMuXHJcblx0XHRcdC8vY29uc29sZS5sb2coZmlsZUVudHJ5KTtcclxuXHRcdFx0ZmlsZUVudHJ5LmZpbGUoZnVuY3Rpb24oZmlsZSkge1xyXG5cdFx0XHQgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcblx0XHRcdCAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRcdCAgIFxyXG5cdFx0XHQgICBcdFx0dmFyIGFycmF5QnVmZmVyVmlldyA9IG5ldyBVaW50OEFycmF5KCB0aGlzLnJlc3VsdCApOyAvLyBmaW5nZXJzIGNyb3NzZWRcclxuXHRcdFx0ICAgXHRcdC8vY29uc29sZS5sb2coYXJyYXlCdWZmZXJWaWV3KTtcclxuXHRcdFx0ICAgXHRcdFxyXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh0aGlzLnJlc3VsdCk7XHJcblx0XHRcdFx0IFx0YmxvYnMucHVzaChhcnJheUJ1ZmZlclZpZXcpO1xyXG5cdFx0XHRcdCBcdG5hbWVzLnB1c2goZmlsZUVudHJ5LmZ1bGxQYXRoLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFwvJywnZycpLCdcXFxcJykuc3Vic3RyaW5nKDEpKTtcclxuXHRcdFx0XHQgXHRpZiAoYmxvYnMubGVuZ3RoID09IGZpbGVDb3VudCkge1xyXG5cdFx0XHRcdCBcdFx0Y3JlYXRlWmlwKGRhdGEsYmxvYnMsbmFtZXMsc3Vicyk7XHJcblx0XHRcdFx0IFx0fVxyXG5cdFx0XHQgICB9O1xyXG5cclxuXHRcdFx0ICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xyXG5cdFx0XHR9LCBlcnJvckhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkb3dubG9hZCh6aXApIHtcclxuXHRjb25zb2xlLmxvZyhcImRvd25sb2FkaW5nXCIpO1xyXG5cdGNvbnNvbGUubG9nKHppcC5nZW5lcmF0ZUFzeW5jKTtcclxuXHRcclxuXHR2YXIgY29udGVudCA9IHppcC5nZW5lcmF0ZUFzeW5jKHt0eXBlOlwiYmxvYlwifSkudGhlbihcclxuXHRmdW5jdGlvbiAoYmxvYikge1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhibG9iKTtcclxuXHRcdC8vc2F2ZUFzKGJsb2IsIFwiaGVsbG8uemlwXCIpO1xyXG5cdFx0Ly92YXIgdXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcblx0XHQvL3dpbmRvdy5sb2NhdGlvbi5hc3NpZ24odXJsKTtcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcblx0XHRcclxuXHRcdGEuaW5uZXJIVE1MID0gbG9jYWxTdG9yYWdlWydjYXNlTmFtZSddO1xyXG5cdFx0XHJcblx0XHRhLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJkb3dubG9hZExpbmtcIik7XHJcblx0XHRcclxuXHRcdGEuaHJlZiA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHJcblx0XHRhLmRvd25sb2FkID0gbG9jYWxTdG9yYWdlW1wiY2FzZU5hbWVcIl07XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIHNob3dMaW5rID0gZmFsc2U7XHJcblx0XHQvLyBpZiB5b3Ugc2hvdyB0aGUgbGluaywgdGhlIHVzZXIgY2FuIGRvd25sb2FkIHRvIGEgbG9jYXRpb24gb2YgdGhlaXIgY2hvaWNlXHJcblx0XHRpZiAoc2hvd0xpbmspIHtcclxuXHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcclxuXHRcdC8vIGlmIHlvdSBoaWRlIHRoZSBsaW5rLCBpdCB3aWxsIHNpbXBseSBnbyB0byB0aGVpciBkb3dubG9hZHMgZm9sZGVyXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhLmNsaWNrKCk7IC8vZG93bmxvYWQgaW1tZWRpYXRlbHlcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblxyXG5cdH0sIGZ1bmN0aW9uIChlcnIpIHtcclxuXHRcdGJsb2JMaW5rLmlubmVySFRNTCArPSBcIiBcIiArIGVycjtcclxuXHR9KTtcclxufVxyXG5cclxuXHJcbi8qKioqKioqKioqKioqIFJFQUQgRklMRVMgKioqKioqKioqKioqKiovXHJcblxyXG5mdW5jdGlvbiBlcnJvckhhbmRsZXIoKSB7XHJcblx0Ly9kbyBub3RoaW5nXHJcblx0Y29uc29sZS5sb2coXCJ5byB3ZSBnb3QgZXJyb3JzXCIpO1xyXG59XHJcblxyXG4vLyBoZWxwZXIgZnVuY3Rpb24gZm9yIHJlY3Vyc2l2ZWx5UmVhZEZpbGVzXHJcbmZ1bmN0aW9uIHRvQXJyYXkobGlzdCkge1xyXG5cdHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChsaXN0IHx8IFtdLCAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVjdXJzaXZlbHlSZWFkRmlsZXMoZnMpIHtcclxuXHRjb25zb2xlLmxvZyhcInJlY3Vyc2l2ZWx5UmVhZEZpbGVzIGNhbGxlZFwiKTtcclxuXHRcclxuXHRmaWxlU3lzdGVtID0gZnM7XHJcblxyXG4gIHZhciBkaXJSZWFkZXIgPSBmcy5yb290LmNyZWF0ZVJlYWRlcigpO1xyXG4gIHZhciBlbnRyaWVzID0gW107XHJcblxyXG4gIC8vIENhbGwgdGhlIHJlYWRlci5yZWFkRW50cmllcygpIHVudGlsIG5vIG1vcmUgcmVzdWx0cyBhcmUgcmV0dXJuZWQuXHJcbiAgdmFyIHJlYWRFbnRyaWVzID0gZnVuY3Rpb24ocmVhZGVyKSB7XHJcbiAgICAgcmVhZGVyLnJlYWRFbnRyaWVzIChmdW5jdGlvbihyZXN1bHRzKSB7XHJcbiAgICAgIGlmICghcmVzdWx0cy5sZW5ndGgpIHtcclxuICAgICAgICAvLyBhbGwgZW50cmllcyBmb3VuZFxyXG4gICAgICAgIHNhdmVFbnRyaWVzKGVudHJpZXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICBcdHZhciByZXN1bHRzQXJyYXkgPSB0b0FycmF5KHJlc3VsdHMpXHJcbiAgICAgICAgZW50cmllcyA9IGVudHJpZXMuY29uY2F0KHJlc3VsdHNBcnJheSk7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHJlc3VsdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIFx0Ly9jb25zb2xlLmxvZyhcImlzIGRpcmVjdG9yeSA/IFwiICsgcmVzdWx0c0FycmF5W2ldLmlzRGlyZWN0b3J5KTtcclxuICAgICAgICBcdGlmIChyZXN1bHRzQXJyYXlbaV0uaXNEaXJlY3RvcnkpIHtcclxuICAgICAgICBcdFx0Ly9kaXJlY3RvcnlTdHJpbmcgKz0gcmVzdWx0c0FycmF5W2ldLlxyXG4gICAgICAgIFx0XHR2YXIgcmVjdXJzaXZlUmVhZGVyID0gcmVzdWx0c0FycmF5W2ldLmNyZWF0ZVJlYWRlcigpO1xyXG4gICAgICAgIFx0XHRyZWFkRW50cmllcyhyZWN1cnNpdmVSZWFkZXIpO1xyXG4gICAgICAgIFx0fSBlbHNlIHtcclxuICAgICAgICBcdFx0XHJcbiAgICAgICAgXHR9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vbmFtZVN0cnVjdHVyZSA9IHt9O1xyXG4gICAgICAgIHJlYWRFbnRyaWVzKHJlYWRlcik7XHJcbiAgICAgIH1cclxuICAgIH0sIGVycm9ySGFuZGxlcik7XHJcbiAgfTtcclxuICBcclxuICBcclxuXHJcbiAgcmVhZEVudHJpZXMoZGlyUmVhZGVyKTsgLy8gU3RhcnQgcmVhZGluZyBkaXJzLlxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gc2F2ZUVudHJpZXMoZW50cmllcywgY2FsbGJhY2spIHtcclxuXHRhbGxFbnRyaWVzID0gZW50cmllcztcclxuXHQvL2NvbnNvbGUubG9nKGFsbEVudHJpZXMpO1xyXG5cdGlmIChjYWxsYmFjaykgY2FsbGJhY2soYWxsRW50cmllcyk7XHJcbn1cclxuXHJcbi8qKioqKioqKioqKioqKioqKiBDQUNISU5HICoqKioqKioqKioqKioqKioqKiovXHJcblxyXG5tLmFkZEZpbGVUb1N5c3RlbSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBkYXRhLCBjYWxsYmFjayl7XHJcblxyXG5cdGNvbnNvbGUubG9nKFwiZnM6IFwiICsgZmlsZVN5c3RlbS5yb290KTtcclxuXHRcclxuXHRpZiAoIWZpbGVTeXN0ZW0pIHtcclxuXHRcdHJldHJpZXZlRmlsZVN5c3RlbShmdW5jdGlvbigpIHsgbS5hZGRGaWxlVG9TeXN0ZW0oZmlsZW5hbWUsIGRhdGEsIGNhbGxiYWNrKTsgfSk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSB0aGUgZGlyIGV4aXN0cyBmaXJzdFxyXG5cdHZhciBkaXJzID0gZmlsZW5hbWUuc3Vic3RyKDAsIGZpbGVuYW1lLmxhc3RJbmRleE9mKCdcXFxcJykpLnNwbGl0KCdcXFxcJyk7XHJcblx0dmFyIGN1ckRpciA9IGZpbGVTeXN0ZW0ucm9vdDtcclxuXHRmb3IodmFyIGk9MDtpPGRpcnMubGVuZ3RoO2krKykge1xyXG5cdFx0Y29uc29sZS5sb2coY3VyRGlyLmdldERpcmVjdG9yeShkaXJzW2ldKSk7IFxyXG5cdFx0Y3VyRGlyID0gY3VyRGlyLmdldERpcmVjdG9yeShkaXJzW2ldLCB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfSk7XHJcblx0fVxyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSBub3Qgd29ya2luZyB3aXRoIGFuIGVtcHR5IGRpcmVjdG9yeVxyXG5cdGlmKGZpbGVuYW1lLmVuZHNXaXRoKCdcXFxcJykpXHJcblx0XHRyZXR1cm47XHJcblxyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgZmlsZVxyXG5cdHZhciBmaWxlID0gY3VyRGlyLmdldEZpbGUoZmlsZW5hbWUuc3Vic3RyKGZpbGVuYW1lLmxhc3RJbmRleE9mKCdcXFxcJykrMSksIHtjcmVhdGU6IHRydWV9KTtcclxuXHQvL2ZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUobmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogZ2V0TWltZVR5cGUoZmlsZW5hbWUpfSkpO1xyXG5cdC8vIGRhdGEgaXMgYSBibG9iIGluIHRoaXMgY2FzZVxyXG5cdGZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUoZGF0YSk7XHJcblx0XHJcblx0Ly8gUmV0dXJuIHRoZSB1cmwgdG8gdGhlIGZpbGVcclxuXHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCBmaWxlLnRvVVJMKCkgKTtcclxufVxyXG5cclxuLy8gZmlsZW5hbWUgbXVzdCBiZSB0aGUgZnVsbCBkZXNpcmVkIHBhdGggZm9yIHRoaXMgdG8gd29ya1xyXG5tLmFkZE5ld0ZpbGVUb1N5c3RlbSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBkYXRhLCBjYWxsYmFjayl7XHJcblx0Ly8gaWYgdGhlIHBhdGggdXNlcyBiYWNrc2xhc2hlc1xyXG5cdGlmIChmaWxlbmFtZS5pbmRleE9mKFwiXFxcXFwiKSA+IC0xKSBcclxuXHRcdGZpbGVuYW1lID0gVXRpbGl0aWVzLnJlcGxhY2VBbGwoZmlsZW5hbWUsXCJcXFxcXCIsXCIvXCIpO1xyXG5cdC8vIGlmIHRoZXJlIGlzIG5vIHBhdGhcclxuXHRpZiAoZmlsZW5hbWUuaW5kZXhPZihcIi9cIikgPCAwKSBmaWxlbmFtZSA9IFwiY2FzZS9hY3RpdmUvc3VibWl0dGVkL1wiK2ZpbGVuYW1lO1xyXG5cdFxyXG5cdC8vIHN0b3JlIHRoZSBkYXRhIGluIGFuIG1vZHVsZS1zY29wZSBvYmplY3Qgc28gdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9ucyBjYW4gbWFrZSB1c2Ugb2YgaXRcclxuXHRhZGRGaWxlRGF0YS5maWxlbmFtZSA9IGZpbGVuYW1lO1xyXG5cdGFkZEZpbGVEYXRhLmRhdGEgPSBkYXRhO1xyXG5cdGFkZEZpbGVEYXRhLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImFkZEZpbGVUb1N5c3RlbShcIitmaWxlbmFtZStcIiwgXCIrZGF0YStcIiwgXCIrY2FsbGJhY2srXCIpXCIpO1xyXG5cdC8vcmV0cmlldmVCYXNlRGlyKGZ1bmN0aW9uKGRpcikgeyBhZGRGaWxlVG9EaXIoZmlsZW5hbWUsIGRpciwgY2FsbGJhY2spOyB9ICk7XHJcblx0XHJcblx0Ly8gZmluZCB0aGUgZGlyZWN0b3J5RW50cnkgdGhhdCB3aWxsIGNvbnRhaW4gdGhlIGZpbGUgYW5kIGNhbGwgYWRkRmlsZVRvRGlyIHdpdGggdGhlIHJlc3VsdFxyXG5cdHJldHJpZXZlQm90dG9tRGlyKGFkZEZpbGVUb0Rpcik7XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIGRpcmVjdG9yeSBvZiBpbnRlcmVzdFxyXG5mdW5jdGlvbiByZXRyaWV2ZUJvdHRvbURpcihjYWxsYmFjaykge1xyXG5cdC8vd2luZG93LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDEwMjQqMTAyNCwgZnVuY3Rpb24oZnMpIHsgc2V0RmlsZVN5c3RlbShmcywgY2FsbGJhY2spOyB9LCBlcnJvckhhbmRsZXIpO1xyXG5cdGNvbnNvbGUubG9nKFwiYmFzZSBVUkw6IFwiICsgYmFzZVVSTCk7XHJcblx0dmFyIG5hbWUgPSBhZGRGaWxlRGF0YS5maWxlbmFtZTtcclxuXHQvLyBleHRyYWN0IHRoZSBwYXRoIG9mIHRoZSBkaXJlY3RvcnkgdG8gcHV0IHRoZSBmaWxlIGluIGZyb20gdGhlIGZpbGUgbmFtZVxyXG5cdHZhciBleHRlbnNpb24gPSBuYW1lLnN1YnN0cmluZygwLG5hbWUubGFzdEluZGV4T2YoXCIvXCIpKTtcclxuXHQvLyBcImNhc2VcIiBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGJhc2UgdXJsXHJcblx0aWYgKGV4dGVuc2lvbi5pbmRleE9mKFwiY2FzZS9cIikgPiAtMSkge1xyXG5cdFx0ZXh0ZW5zaW9uID0gZXh0ZW5zaW9uLnN1YnN0cmluZyg1KTtcclxuXHR9XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImV4dDogXCIgKyBleHRlbnNpb24pO1xyXG5cdFxyXG5cdC8vIGdldCB0aGUgZGlyZWN0b3J5IGVudHJ5IGZyb20gdGhlIGZpbGVzeXN0ZW0gY2FsbGJhY2tcclxuXHR3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTChiYXNlVVJMK2V4dGVuc2lvbiwgY2FsbGJhY2spO1xyXG59XHJcblxyXG4vLyBhZGQgdGhlIGZpbGVcclxuZnVuY3Rpb24gYWRkRmlsZVRvRGlyKGRpcikge1xyXG5cclxuXHQvLyBzaG9ydGhhbmRcclxuXHR2YXIgZmlsZW5hbWUgPSBhZGRGaWxlRGF0YS5maWxlbmFtZTtcclxuXHRcclxuXHQvLyBkZWJ1Z1xyXG5cdGNvbnNvbGUubG9nKFwiYWRkRmlsZVRvRGlyKFwiK2ZpbGVuYW1lK1wiLCBcIitkaXIrXCIpXCIpO1xyXG5cdFxyXG5cdC8vIHJlbGljIGZyb20gbGVnYWN5IGNvZGVcclxuXHR2YXIgY3VyRGlyID0gZGlyO1xyXG5cdFxyXG5cdC8vIGRlYnVnXHJcblx0Y29uc29sZS5sb2coXCJjdXJkaXI6IFwiICArIGN1ckRpci5uYW1lKTtcclxuXHRcclxuXHQvLyBNYWtlIHN1cmUgbm90IHdvcmtpbmcgd2l0aCBhbiBlbXB0eSBkaXJlY3RvcnlcclxuXHRpZihmaWxlbmFtZS5lbmRzV2l0aCgnXFxcXCcpKVxyXG5cdFx0cmV0dXJuO1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIGZpbGVcclxuXHR2YXIgZmlsZSA9IGN1ckRpci5nZXRGaWxlKGZpbGVuYW1lLnN1YnN0cihmaWxlbmFtZS5sYXN0SW5kZXhPZignLycpKzEpLCB7Y3JlYXRlOiB0cnVlfSwgY3JlYXRlV3JpdGVyKTtcclxuXHRcclxuXHRcclxuXHQvL3ZhciBmaWxlID0gY3VyRGlyLmdldEZpbGUoZmlsZW5hbWUsIHtjcmVhdGU6IHRydWV9LCBjcmVhdGVXcml0ZXIpOyAvLyBmdW5jdGlvbihmaWxlRW50cnkpIHsgd3JpdGVGaWxlKGZpbGVFbnRyeSwgY2FsbGJhY2spOyB9KTtcclxuXHQvKmNvbnNvbGUubG9nKGZpbGUpO1xyXG5cdC8vZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiBnZXRNaW1lVHlwZShmaWxlbmFtZSl9KSk7XHJcblx0Ly8gZGF0YSBpcyBhIGJsb2IgaW4gdGhpcyBjYXNlXHJcblx0ZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShkYXRhKTtcclxuXHRcclxuXHQvLyBSZXR1cm4gdGhlIHVybCB0byB0aGUgZmlsZVxyXG5cdGlmIChjYWxsYmFjaykgY2FsbGJhY2soIGZpbGUudG9VUkwoKSApO1xyXG5cclxuXHRjYWxsYmFjayggZmlsZS50b1VSTCgpICk7Ki9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV3JpdGVyKGZpbGUpIHtcclxuXHRjb25zb2xlLmxvZyhmaWxlKTtcclxuXHRmaWxlLmNyZWF0ZVdyaXRlcih3cml0ZUZpbGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpbGUoZmlsZVdyaXRlcikge1xyXG5cdGNvbnNvbGUubG9nKGZpbGVXcml0ZXIpO1xyXG5cdGZpbGVXcml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uIChlKSB7IGNvbnNvbGUubG9nKFwid3JpdGUgY29tcGxldGVkXCIpOyB9XHJcblx0ZmlsZVdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHsgY29uc29sZS5sb2coXCJ3cml0ZXIgZXJyb3I6IFwiICsgZS50b1N0cmluZygpKTsgfVxyXG5cdC8vZmlsZVdyaXRlci53cml0ZShuZXcgQmxvYihbYWRkRmlsZURhdGEuZGF0YV0sIHt0eXBlOiBnZXRNaW1lVHlwZShhZGRGaWxlRGF0YS5maWxlbmFtZSl9KSk7XHJcblx0Ly8gZGF0YSBpcyBhIGJsb2IgaW4gdGhpcyBjYXNlXHJcblx0ZmlsZVdyaXRlci53cml0ZShhZGRGaWxlRGF0YS5kYXRhKTtcclxuXHRcclxuXHQvLyBSZXR1cm4gdGhlIHVybCB0byB0aGUgZmlsZVxyXG5cdGlmIChhZGRGaWxlRGF0YS5jYWxsYmFjaykgY2FsbGJhY2soIGZpbGUudG9VUkwoKSApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRCYXNlKGVudHJ5LCBjYWxsYmFjaykge1xyXG5cdGJhc2VEaXIgPSBlbnRyeTtcclxuXHRjYWxsYmFjaygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRmlsZVN5c3RlbSh0eXBlLCBzaXplLCBjdXJDYXNlKXtcclxuXHQvLyBMb2FkIHRoZSBmaWxlIHN5c3RlbVxyXG5cdGZpbGVTeXN0ZW0gPSBzZWxmLnJlcXVlc3RGaWxlU3lzdGVtU3luYyh0eXBlLCBzaXplKTtcclxuXHRcclxuXHQvLyBXcml0ZSB0aGUgZmlsZXNcclxuXHR2YXIgdXJscyA9IHt9O1xyXG5cdGZvciAodmFyIGZpbGUgaW4gY3VyQ2FzZS5maWxlcykge1xyXG5cdFx0aWYgKCFjdXJDYXNlLmZpbGVzLmhhc093blByb3BlcnR5KGZpbGUpKSBjb250aW51ZTtcclxuXHRcdHVybHNbZmlsZV0gPSBhZGRGaWxlVG9TeXN0ZW0oZmlsZSwgY3VyQ2FzZS5maWxlKGZpbGUpLmFzQXJyYXlCdWZmZXIoKSwgZmlsZVN5c3RlbSk7XHJcblx0fVxyXG5cdFxyXG5cdC8vIHJldHVybiB0aGUgdXJscyB0byB0aGUgZmlsZXNcclxuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodXJscyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1pbWVUeXBlKGZpbGUpe1xyXG5cdHN3aXRjaChmaWxlLnN1YnN0cihmaWxlLmxhc3RJbmRleE9mKCcuJykrMSkpe1xyXG5cdFx0Y2FzZSAncG5nJzpcclxuXHRcdFx0cmV0dXJuICdpbWFnZS9wbmcnO1xyXG5cdFx0Y2FzZSAnanBlZyc6XHJcblx0XHRjYXNlICdqcGcnOlxyXG5cdFx0XHRyZXR1cm4gJ2ltYWdlL2pwZWcnO1xyXG5cdFx0Y2FzZSAncGRmJzpcclxuXHRcdFx0cmV0dXJuICdhcHBsaWNhdGlvbi9wZGYnO1xyXG5cdFx0Y2FzZSAnZG9jeCc6XHJcblx0XHRjYXNlICdkb2MnOlxyXG5cdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL21zd29yZCc7XHJcblx0XHRjYXNlICdydGYnOlxyXG5cdFx0XHRyZXR1cm4gJ3RleHQvcmljaHRleHQnO1xyXG5cdFx0Y2FzZSAnaXBhcmRhdGEnOlxyXG5cdFx0XHRyZXR1cm4gJ3RleHQveG1sJztcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiAndGV4dC9wbGFpbic7XHJcblx0fVxyXG59XHJcblxyXG5cclxuLypmdW5jdGlvbiBzZWxlY3RTYXZlTG9jYXRpb24gKGRhdGEpIHtcclxuXHJcblx0Y29uc29sZS5sb2coXCJzZWxlY3RTYXZlTG9jYXRpb25cIik7XHJcblxyXG5cdC8vIE1ha2Ugc3VyZSB0aGUgbmVlZCBBUElzIGFyZSBzdXBwb3J0ZWRcclxuXHRpZighd2luZG93LkZpbGUgfHwgIXdpbmRvdy5GaWxlUmVhZGVyIHx8ICF3aW5kb3cuRmlsZUxpc3QgfHwgIXdpbmRvdy5CbG9iIHx8ICF3aW5kb3cuQXJyYXlCdWZmZXIgfHwgIXdpbmRvdy5Xb3JrZXIpe1xyXG5cdFx0YWxlcnQoJ1RoZSBGaWxlIEFQSXMgbmVlZCB0byBsb2FkIGZpbGVzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlciEnKTtcclxuXHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2FkLWJ1dHRvblwiKS5kaXNhYmxlZCA9IHRydWU7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHRjb25zb2xlLmxvZyAoXCJzZWxlY3RpbmdTYXZlTG9jYXRpb25cIik7XHJcblx0XHJcblx0XHQvLyBHZXQgdGhlIGxvYWQgYnV0dG9uIGFuZCBpbnB1dFxyXG5cdFx0dmFyIGxvYWRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2FkLWlucHV0Jyk7XHJcblxyXG5cdFx0Ly8gbG9hZCBpbnB1dCBpcyBoaWRkZW4sIHNvIGNsaWNrIGl0XHJcblx0XHRsb2FkSW5wdXQuY2xpY2soKTtcclxuXHRcdFxyXG5cdFx0Ly8gV2hlbiBsb2FkIGlucHV0IGZpbGUgaXMgY2hvc2VuLCBsb2FkIHRoZSBmaWxlXHJcblx0XHRsb2FkSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gTWFrZSBzdXJlIGEgaXBhciBmaWxlIHdhcyBjaG9vc2VuXHJcblx0XHRcdGlmKCFsb2FkSW5wdXQudmFsdWUuZW5kc1dpdGgoXCJpcGFyXCIpKXtcclxuXHRcdFx0XHRhbGVydChcIllvdSBkaWRuJ3QgY2hvb3NlIGFuIGlwYXIgZmlsZSEgeW91IGNhbiBvbmx5IGxvYWQgaXBhciBmaWxlcyFcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTYXZlIHRoZSB6aXAgZmlsZSdzIG5hbWUgdG8gbG9jYWwgc3RvcmFnZSBcclxuXHRcdFx0Ly8gTk9URTogdGhpcyB3aWxsIG92ZXJ3cml0ZSB0aGUgb2xkIG5hbWUsIFxyXG5cdFx0XHQvLyAgICBzbyBpZiB0aGUgdXNlciBjaG9vc2VzIGEgZGlmZmVyZW50IGZpbGUsIHRoaXMgY291bGQgbGVhZCB0byBlcnJvcnNcclxuXHRcdFx0bG9jYWxTdG9yYWdlWydjYXNlTmFtZSddID0gbG9hZElucHV0LmZpbGVzWzBdLm5hbWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBSZWFkIHRoZSB6aXBcclxuXHRcdFx0SlNaaXAubG9hZEFzeW5jKGxvYWRJbnB1dC5maWxlc1swXSlcclxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oemlwKSB7XHJcblx0XHRcdFx0Ly8gYmFja3NsYXNoZXMgcGVyIHppcCBmaWxlIHByb3RvY29sXHJcblx0XHRcdFx0emlwLmZpbGUoXCJjYXNlXFxcXGFjdGl2ZVxcXFxzYXZlRmlsZS5pcGFyZGF0YVwiLGRhdGEpO1xyXG5cdFx0XHRcdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0XHRcdFx0ZG93bmxvYWQoemlwKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvL3JlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihldmVudC50YXJnZXQuZmlsZXNbMF0pO1xyXG5cdFx0XHRcclxuXHRcdH0sIGZhbHNlKTtcclxuXHR9XHJcbn0qLyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxudmFyIExlc3Nvbk5vZGUgPSByZXF1aXJlKCcuL2xlc3Nvbk5vZGUuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9kcmF3bGliLmpzJyk7XHJcbnZhciBEYXRhUGFyc2VyID0gcmVxdWlyZSgnLi9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG52YXIgTW91c2VTdGF0ZSA9IHJlcXVpcmUoJy4vbW91c2VTdGF0ZS5qcycpO1xyXG52YXIgRmlsZU1hbmFnZXIgPSByZXF1aXJlKCcuL2ZpbGVNYW5hZ2VyLmpzJyk7XHJcblxyXG4vL21vdXNlIG1hbmFnZW1lbnRcclxudmFyIG1vdXNlU3RhdGU7XHJcbnZhciBwcmV2aW91c01vdXNlU3RhdGU7XHJcbnZhciBkcmFnZ2luZ0Rpc2FibGVkO1xyXG52YXIgbW91c2VUYXJnZXQ7XHJcbnZhciBtb3VzZVN1c3RhaW5lZERvd247XHJcblxyXG4vL3BoYXNlIGhhbmRsaW5nXHJcbnZhciBwaGFzZU9iamVjdDtcclxuXHJcbmZ1bmN0aW9uIGdhbWUodXJsLCBjYW52YXMsIHdpbmRvd0Rpdil7XHJcblx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcblx0dGhpcy5tb3VzZVN0YXRlID0gbmV3IE1vdXNlU3RhdGUoY2FudmFzKTtcclxuXHRGaWxlTWFuYWdlci5sb2FkQ2FzZSh1cmwsIHdpbmRvd0RpdiwgZnVuY3Rpb24oY2F0ZWdvcmllcywgc3RhZ2Upe1xyXG5cdFx0Z2FtZS5jYXRlZ29yaWVzID0gY2F0ZWdvcmllcztcclxuXHRcdGdhbWUuY3JlYXRlTGVzc29uTm9kZXMoKTtcclxuXHR9KTtcclxufVxyXG5cclxudmFyIHAgPSBnYW1lLnByb3RvdHlwZTtcclxuXHJcbnAuY3JlYXRlTGVzc29uTm9kZXMgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuYm9hcmRBcnJheSA9IFtdO1xyXG5cdHZhciBib3R0b21CYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJvdHRvbUJhclwiKTtcclxuXHRmb3IodmFyIGk9MDtpPHRoaXMuY2F0ZWdvcmllcy5sZW5ndGg7aSsrKXtcclxuXHRcdC8vIGluaXRpYWxpemUgZW1wdHlcclxuXHRcdFxyXG5cdFx0dGhpcy5sZXNzb25Ob2RlcyA9IFtdO1xyXG5cdFx0Ly8gYWRkIGEgbm9kZSBwZXIgcXVlc3Rpb25cclxuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9ucy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHQvLyBjcmVhdGUgYSBuZXcgbGVzc29uIG5vZGVcclxuXHRcdFx0dGhpcy5sZXNzb25Ob2Rlcy5wdXNoKG5ldyBMZXNzb25Ob2RlKG5ldyBQb2ludCh0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLnBvc2l0aW9uUGVyY2VudFgsIHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0ucG9zaXRpb25QZXJjZW50WSksIHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0uaW1hZ2VMaW5rLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdICkgKTtcclxuXHRcdFx0Ly8gYXR0YWNoIHF1ZXN0aW9uIG9iamVjdCB0byBsZXNzb24gbm9kZVxyXG5cdFx0XHR0aGlzLmxlc3Nvbk5vZGVzW3RoaXMubGVzc29uTm9kZXMubGVuZ3RoLTFdLnF1ZXN0aW9uID0gdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXTtcclxuXHRcdFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNyZWF0ZSBhIGJvYXJkXHJcblx0XHR0aGlzLmJvYXJkQXJyYXkucHVzaChuZXcgQm9hcmQobmV3IFBvaW50KGNhbnZhcy53aWR0aC8oMip0aGlzLnNjYWxlKSxjYW52YXMuaGVpZ2h0LygyKnRoaXMuc2NhbGUpKSwgdGhpcy5sZXNzb25Ob2RlcykpO1xyXG5cdFx0dmFyIGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJCVVRUT05cIik7XHJcblx0XHRidXR0b24uaW5uZXJIVE1MID0gdGhpcy5jYXRlZ29yaWVzW2ldLm5hbWU7XHJcblx0XHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0XHRidXR0b24ub25jbGljayA9IChmdW5jdGlvbihpKXsgXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRpZihnYW1lLmFjdGl2ZSl7XHJcblx0XHRcdFx0XHRnYW1lLmFjdGl2ZUJvYXJkSW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0aWYoZ2FtZS5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0XHRcdFx0XHRnYW1lLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHRcdFx0XHRcdGdhbWUudXBkYXRlTm9kZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdH19KShpKTtcclxuXHRcdGlmKCF0aGlzLmJvYXJkQXJyYXlbdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xXS5maW5pc2hlZClcclxuXHRcdFx0YnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdGJvdHRvbUJhci5hcHBlbmRDaGlsZChidXR0b24pO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0uYnV0dG9uID0gYnV0dG9uO1xyXG5cdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0udXBkYXRlTm9kZSA9IGZ1bmN0aW9uKCl7Z2FtZS51cGRhdGVOb2RlKCk7fTtcclxuXHR9XHJcblx0dGhpcy5hY3RpdmVCb2FyZEluZGV4ID0gMDtcclxuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0aWYoZ2FtZS5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0Z2FtZS5vbkNoYW5nZUJvYXJkKCk7XHJcblx0dGhpcy51cGRhdGVOb2RlKCk7XHJcblx0XHJcblx0Ly8gcmVhZHkgdG8gc2F2ZVxyXG5cdEZpbGVNYW5hZ2VyLnByZXBhcmVaaXAodGhpcy5ib2FyZEFycmF5KTtcclxufVxyXG5cclxucC51cGRhdGVab29tID0gZnVuY3Rpb24obmV3Wm9vbSl7XHJcblx0aWYodGhpcy5hY3RpdmUpXHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS56b29tID0gbmV3Wm9vbTtcclxufVxyXG5cclxucC5nZXRab29tID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbTtcclxufVxyXG5cclxucC51cGRhdGUgPSBmdW5jdGlvbihjdHgsIGNhbnZhcywgZHQpe1xyXG5cdFxyXG5cdGlmKHRoaXMuYWN0aXZlKXtcclxuXHRcdFxyXG5cdCAgICAvLyBVcGRhdGUgdGhlIG1vdXNlIHN0YXRlXHJcblx0XHR0aGlzLm1vdXNlU3RhdGUudXBkYXRlKGR0LCB0aGlzLnNjYWxlKnRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb20pO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5tb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9zYXZlXCIsRGF0YVBhcnNlci5jcmVhdGVYTUxTYXZlRmlsZSh0aGlzLmJvYXJkQXJyYXksIGZhbHNlKSk7XHJcblx0XHRcdC8vY29uc29sZS5sb2cobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhdXRvc2F2ZVwiKSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHQgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IGJvYXJkIChnaXZlIGl0IHRoZSBtb3VzZSBvbmx5IGlmIG5vdCB6b29taW5nKVxyXG5cdCAgICB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5hY3QoKHRoaXMuem9vbWluIHx8IHRoaXMuem9vbW91dCA/IG51bGwgOiB0aGlzLm1vdXNlU3RhdGUpLCBkdCk7XHJcblx0ICAgIFxyXG5cdCAgICAvLyBDaGVjayBpZiBuZXcgYm9hcmQgYXZhaWxhYmxlXHJcblx0ICAgIGlmKHRoaXMuYWN0aXZlQm9hcmRJbmRleCA8IHRoaXMuYm9hcmRBcnJheS5sZW5ndGgtMSAmJlxyXG5cdCAgICBcdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleCsxXS5idXR0b24uZGlzYWJsZWQgJiYgXHJcblx0ICAgIFx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5maW5pc2hlZClcclxuXHQgICAgXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4KzFdLmJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdFx0XHJcblxyXG5cdFx0Ly8gSWYgdGhlIGJvYXJkIGlzIGRvbmUgem9vbSBvdXQgdG8gY2VudGVyXHJcblx0XHRpZih0aGlzLnpvb21vdXQpe1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gR2V0IHRoZSBjdXJyZW50IGJvYXJkXHJcblx0XHRcdHZhciBib2FyZCA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gWm9vbSBvdXQgYW5kIG1vdmUgdG93YXJkcyBjZW50ZXJcclxuXHRcdFx0aWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0XHRib2FyZC56b29tIC09IGR0KkNvbnN0YW50cy56b29tU3BlZWQ7XHJcblx0XHRcdGVsc2UgaWYodGhpcy5nZXRab29tKCk8Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0XHRib2FyZC56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuXHRcdFx0Ym9hcmQubW92ZVRvd2FyZHMobmV3IFBvaW50KENvbnN0YW50cy5ib2FyZFNpemUueC8yLCBDb25zdGFudHMuYm9hcmRTaXplLnkvMiksIGR0LCBDb25zdGFudHMuem9vbU1vdmVTcGVlZCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDYWxsIHRoZSBjaGFuZ2UgbWV0aG9kXHJcblx0XHRcdGlmKHRoaXMub25DaGFuZ2VCb2FyZClcclxuXHRcdFx0XHR0aGlzLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIGZ1bGx5IHpvb21lZCBvdXQgYW5kIGluIGNlbnRlciBzdG9wXHJcblx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPT1Db25zdGFudHMuc3RhcnRab29tICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lng9PUNvbnN0YW50cy5ib2FyZFNpemUueC8yICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lnk9PUNvbnN0YW50cy5ib2FyZFNpemUueS8yKXtcdFx0XHRcdFxyXG5cdFx0XHRcdHRoaXMuem9vbW91dCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9IC8vIElmIHRoZXJlIGlzIGEgbmV3IG5vZGUgem9vbSBpbnRvIGl0XHJcblx0XHRlbHNlIGlmKHRoaXMuem9vbWluKXsgXHJcblx0XHRcdFxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHRcdFx0dmFyIGJvYXJkID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiBib2FyZCBpcyBub3QgZmluaXNoZWQgbG9vayBmb3IgbmV4dCBub2RlXHJcblx0XHRcdGlmKCFib2FyZC5maW5pc2hlZCAmJiB0aGlzLnRhcmdldE5vZGU9PW51bGwpe1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0Tm9kZSA9IGJvYXJkLmdldEZyZWVOb2RlKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihib2FyZC5maW5pc2hlZCl7XHJcblx0XHRcdFx0dGhpcy56b29taW4gPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnpvb21vdXQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTdGFydCBtb3ZpbmcgYW5kIHpvb21pbmcgaWYgdGFyZ2V0IGZvdW5kXHJcblx0XHRcdGlmKHRoaXMuem9vbWluICYmIHRoaXMudGFyZ2V0Tm9kZSl7XHJcblx0XHRcclxuXHRcdFx0XHQvLyBab29tIGluIGFuZCBtb3ZlIHRvd2FyZHMgdGFyZ2V0IG5vZGVcclxuXHRcdFx0XHRpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuZW5kWm9vbSlcclxuXHRcdFx0XHRcdGJvYXJkLnpvb20gKz0gZHQqQ29uc3RhbnRzLnpvb21TcGVlZDtcclxuXHRcdFx0XHRlbHNlIGlmKHRoaXMuZ2V0Wm9vbSgpPkNvbnN0YW50cy5lbmRab29tKVxyXG5cdFx0XHRcdFx0Ym9hcmQuem9vbSA9IENvbnN0YW50cy5lbmRab29tO1xyXG5cdFx0XHRcdGJvYXJkLm1vdmVUb3dhcmRzKHRoaXMudGFyZ2V0Tm9kZS5wb3NpdGlvbiwgZHQsIENvbnN0YW50cy56b29tTW92ZVNwZWVkKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBDYWxsIHRoZSBjaGFuZ2UgbWV0aG9kXHJcblx0XHRcdFx0aWYodGhpcy5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0XHRcdFx0dGhpcy5vbkNoYW5nZUJvYXJkKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gSWYgcmVhY2hlZCB0aGUgbm9kZSBhbmQgem9vbWVkIGluIHN0b3AgYW5kIGdldCByaWQgb2YgdGhlIHRhcmdldFxyXG5cdFx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPT1Db25zdGFudHMuZW5kWm9vbSAmJiBib2FyZC5ib2FyZE9mZnNldC54PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueCAmJiBib2FyZC5ib2FyZE9mZnNldC55PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueSl7XHJcblx0XHRcdFx0XHR0aGlzLnpvb21pbiA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXROb2RlID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQgICAgXHJcblx0ICAgIC8vIGRyYXcgc3R1ZmYgbm8gbWF0dGVyIHdoYXRcclxuXHQgICAgdGhpcy5kcmF3KGN0eCwgY2FudmFzKTtcclxuXHR9XHJcbn1cclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzKXtcclxuXHRcclxuXHQvLyBEcmF3IHRoZSBiYWNrZ3JvdW5kXHJcblx0RHJhd0xpYi5yZWN0KGN0eCwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0LCBcIiMxNTcxOEZcIik7XHJcbiAgICBcclxuXHQvLyBTY2FsZSB0aGUgZ2FtZVxyXG5cdGN0eC5zYXZlKCk7XHJcblx0Y3R4LnRyYW5zbGF0ZShjYW52YXMud2lkdGgvMiwgY2FudmFzLmhlaWdodC8yKTtcclxuXHRjdHguc2NhbGUodGhpcy5zY2FsZSwgdGhpcy5zY2FsZSk7XHJcblx0Y3R4LnRyYW5zbGF0ZSgtY2FudmFzLndpZHRoLzIsIC1jYW52YXMuaGVpZ2h0LzIpO1xyXG5cdC8vY3R4LnRyYW5zbGF0ZShjYW52YXMud2lkdGgqdGhpcy5zY2FsZS1jYW52YXMud2lkdGgsIGNhbnZhcy53aWR0aCp0aGlzLnNjYWxlLWNhbnZhcy53aWR0aCk7XHJcblx0XHJcbiAgICAvLyBEcmF3IHRoZSBjdXJyZW50IGJvYXJkXHJcbiAgICB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5kcmF3KGN0eCwgY2FudmFzKTtcclxuXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5wLnVwZGF0ZU5vZGUgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuem9vbWluID0gdHJ1ZTtcclxufVxyXG5cclxucC53aW5kb3dDbG9zZWQgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgZmlsZVRvU3RvcmUgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS53aW5kb3dDbG9zZWQoKTtcclxuXHRpZiAoZmlsZVRvU3RvcmUpIHtcclxuXHRcdEZpbGVNYW5hZ2VyLmFkZE5ld0ZpbGVUb1N5c3RlbShcdFx0ICAvLyBuZWVkIHRvIHN0b3JlIG51bWJlciBvZiBmaWxlc1xyXG5cdFx0XHRcIlwiK3RoaXMuYWN0aXZlQm9hcmRJbmRleCtcIi1cIitmaWxlVG9TdG9yZS5udW0rXCItXCIrXCIwXCIrZmlsZVRvU3RvcmUuZXh0LFxyXG5cdFx0XHRmaWxlVG9TdG9yZS5ibG9iKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZ2FtZTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoXCIuL2NhdGVnb3J5LmpzXCIpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKFwiLi9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi9xdWVzdGlvbi5qcycpO1xyXG52YXIgUXVlc3Rpb25XaW5kb3dzID0gcmVxdWlyZSgnLi9xdWVzdGlvbldpbmRvd3MuanMnKTtcclxud2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgID0gd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgfHwgd2luZG93LndlYmtpdFJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkw7XHJcblxyXG4vLyBQYXJzZXMgdGhlIHhtbCBjYXNlIGZpbGVzXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8ga25vd24gdGFnc1xyXG4vKlxyXG5hbnN3ZXJcclxuYnV0dG9uXHJcbmNhdGVnb3J5TGlzdFxyXG5jb25uZWN0aW9uc1xyXG5lbGVtZW50XHJcbmZlZWRiYWNrXHJcbmluc3RydWN0aW9uc1xyXG5yZXNvdXJjZVxyXG5yZXNvdXJjZUxpc3RcclxucmVzb3VyY2VJbmRleFxyXG5zb2Z0d2FyZUxpc3RcclxucXVlc3Rpb25cclxucXVlc3Rpb25UZXh0XHJcbnF1c3Rpb25OYW1lXHJcbiovXHJcblxyXG4vLyBjb252ZXJzaW9uXHJcbnZhciBzdGF0ZUNvbnZlcnRlciA9IHtcclxuXHRcImhpZGRlblwiIDogUXVlc3Rpb24uU09MVkVfU1RBVEUuSElEREVOLFxyXG5cdFwidW5zb2x2ZWRcIiA6ICBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRCxcclxuXHRcImNvcnJlY3RcIiA6ICBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRURcclxufVxyXG4vLyBjb252ZXJzaW9uXHJcbnZhciByZXZlcnNlU3RhdGVDb252ZXJ0ZXIgPSBbXCJoaWRkZW5cIiwgXCJ1bnNvbHZlZFwiLCBcImNvcnJlY3RcIl07XHJcblxyXG4vLyBNb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblx0XHRcdFx0XHJcbi8vICoqKioqKioqKioqKioqKioqKioqKiogTE9BRElORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8vIHNldCB0aGUgcXVlc3Rpb24gc3RhdGVzXHJcbm0uYXNzaWduUXVlc3Rpb25TdGF0ZXMgPSBmdW5jdGlvbihjYXRlZ29yaWVzLCBxdWVzdGlvbkVsZW1zKSB7XHJcblx0Y29uc29sZS5sb2coXCJxZWxlbXM6IFwiICsgcXVlc3Rpb25FbGVtcy5sZW5ndGgpO1xyXG5cdHZhciB0YWxseSA9IDA7IC8vIHRyYWNrIHRvdGFsIGluZGV4IGluIG5lc3RlZCBsb29wXHJcblx0XHJcblx0Ly8gYWxsIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxjYXRlZ29yaWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRmb3IgKHZhciBqPTA7IGo8Y2F0ZWdvcmllc1tpXS5xdWVzdGlvbnMubGVuZ3RoOyBqKyssIHRhbGx5KyspIHtcclxuXHRcdFxyXG5cdFx0XHQvLyBzdG9yZSBxdWVzdGlvbiAgZm9yIGVhc3kgcmVmZXJlbmNlXHJcblx0XHRcdHZhciBxID0gY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdG9yZSB0YWcgZm9yIGVhc3kgcmVmZXJlbmNlXHJcblx0XHRcdHZhciBxRWxlbSA9IHF1ZXN0aW9uRWxlbXNbdGFsbHldO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgcG9zaXRpb24gaXMgbGVzcyB0aGFuIHplcm8gZG9uJ3QgbG9hZCB0aGUgcXVlc3Rpb25cclxuXHRcdFx0aWYocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSk8MCB8fCBcclxuXHRcdFx0XHRcdHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpPDApXHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdGF0ZVxyXG5cdFx0XHRxLmN1cnJlbnRTdGF0ZSA9IHN0YXRlQ29udmVydGVyW3FFbGVtLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uU3RhdGVcIildO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHRpZihxLmp1c3RpZmljYXRpb24pXHJcblx0XHRcdFx0cS5qdXN0aWZpY2F0aW9uLnZhbHVlID0gcUVsZW0uZ2V0QXR0cmlidXRlKFwianVzdGlmaWNhdGlvblwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGwgY29ycmVjdCBhbnN3ZXIgaWYgc3RhdGUgaXMgY29ycmVjdFxyXG5cdFx0XHRpZihxLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHQgIHEuY29ycmVjdEFuc3dlcigpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyB4cG9zXHJcblx0XHRcdHEucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54KTtcclxuXHRcdFx0Ly8geXBvc1xyXG5cdFx0XHRxLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gdGFrZXMgdGhlIHhtbCBzdHJ1Y3R1cmUgYW5kIGZpbGxzIGluIHRoZSBkYXRhIGZvciB0aGUgcXVlc3Rpb24gb2JqZWN0XHJcbm0uZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyA9IGZ1bmN0aW9uKHJhd0RhdGEsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKSB7XHJcblx0Ly8gaWYgdGhlcmUgaXMgYSBjYXNlIGZpbGVcclxuXHRpZiAocmF3RGF0YSAhPSBudWxsKSB7XHJcblx0XHRcclxuXHRcdC8vIEZpcnN0IGxvYWQgdGhlIHJlc291cmNlc1xyXG5cdFx0dmFyIHJlc291cmNlRWxlbWVudHMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VMaXN0XCIpWzBdLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VcIik7XHJcblx0XHR2YXIgcmVzb3VyY2VzID0gW107XHJcblx0XHRmb3IgKHZhciBpPTA7IGk8cmVzb3VyY2VFbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQvLyBMb2FkIGVhY2ggcmVzb3VyY2VcclxuXHRcdFx0cmVzb3VyY2VzW2ldID0gbmV3IFJlc291cmNlKHJlc291cmNlRWxlbWVudHNbaV0sIHVybCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFRoZW4gbG9hZCB0aGUgY2F0ZWdvcmllc1xyXG5cdFx0dmFyIGNhdGVnb3J5RWxlbWVudHMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIik7XHJcblx0XHR2YXIgY2F0ZWdvcnlOYW1lcyA9IHJhd0RhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeUxpc3RcIilbMF0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbGVtZW50XCIpO1xyXG5cdFx0dmFyIGNhdGVnb3JpZXMgPSBbXTtcclxuXHRcdGZvciAodmFyIGk9MDsgaTxjYXRlZ29yeUVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIExvYWQgZWFjaCBjYXRlZ29yeSAod2hpY2ggbG9hZHMgZWFjaCBxdWVzdGlvbilcclxuXHRcdFx0Y2F0ZWdvcmllc1tpXSA9IG5ldyBDYXRlZ29yeShjYXRlZ29yeU5hbWVzW2ldLmlubmVySFRNTCwgY2F0ZWdvcnlFbGVtZW50c1tpXSwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gY2F0ZWdvcmllcztcclxuXHR9XHJcblx0cmV0dXJuIG51bGxcclxufVxyXG5cclxuLy8gY3JlYXRlcyBhIGNhc2UgZmlsZSBmb3IgemlwcGluZ1xyXG5tLnJlY3JlYXRlQ2FzZUZpbGUgPSBmdW5jdGlvbihib2FyZHMpIHtcclxuXHJcblx0Ly8gY3JlYXRlIHNhdmUgZmlsZSB0ZXh0XHJcblx0dmFyIGRhdGFUb1NhdmUgPSBtLmNyZWF0ZVhNTFNhdmVGaWxlKGJvYXJkcywgdHJ1ZSk7XHJcblx0XHJcblx0Y29uc29sZS5sb2cgKFwic2F2ZURhdGEuaXBhciBkYXRhIGNyZWF0ZWRcIik7XHJcblx0XHJcblx0Ly9pZiAoY2FsbGJhY2spIGNhbGxiYWNrKGRhdGFUb1NhdmUpO1xyXG5cdHJldHVybiBkYXRhVG9TYXZlO1xyXG5cdFxyXG59XHJcblxyXG4vLyBjcmVhdGVzIHRoZSB4bWxcclxubS5jcmVhdGVYTUxTYXZlRmlsZSA9IGZ1bmN0aW9uKGJvYXJkcywgaW5jbHVkZU5ld2xpbmUpIHtcclxuXHQvLyBuZXdsaW5lXHJcblx0dmFyIG5sO1xyXG5cdGluY2x1ZGVOZXdsaW5lID8gbmwgPSBcIlxcblwiIDogbmwgPSBcIlwiO1xyXG5cdC8vIGhlYWRlclxyXG5cdHZhciBvdXRwdXQgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwidXRmLThcIj8+JyArIG5sO1xyXG5cdC8vIGNhc2UgZGF0YVxyXG5cdG91dHB1dCArPSAnPGNhc2UgY2F0ZWdvcnlJbmRleD1cIjNcIiBjYXNlU3RhdHVzPVwiMVwiIHByb2ZpbGVGaXJzdD1cImpcIiBwcm9maWxlTGFzdD1cImpcIiBwcm9maWxlTWFpbD1cImpcIj4nICsgbmw7XHJcblx0Ly8gcXVlc3Rpb25zIGhlYWRlclxyXG5cdG91dHB1dCArPSAnPHF1ZXN0aW9ucz4nICsgbmw7XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0YWcgc3RhcnRcclxuXHRcdFx0b3V0cHV0ICs9ICc8cXVlc3Rpb24gJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIHF1ZXN0aW9uU3RhdGVcclxuXHRcdFx0b3V0cHV0ICs9ICdxdWVzdGlvblN0YXRlPVwiJyArIHJldmVyc2VTdGF0ZUNvbnZlcnRlcltxLmN1cnJlbnRTdGF0ZV0gKyAnXCIgJztcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHR2YXIgbmV3SnVzdGlmaWNhdGlvbiA9IHEuanVzdGlmaWNhdGlvbi52YWx1ZTtcclxuXHRcdFx0dmFyIGp1c3RpZmljYXRpb247XHJcblx0XHRcdG5ld0p1c3RpZmljYXRpb24gPyBqdXN0aWZpY2F0aW9uID0gbmV3SnVzdGlmaWNhdGlvbiA6IGp1c3RpZmljYXRpb24gPSBxLmp1c3RpZmljYXRpb25TdHJpbmc7XHJcblx0XHRcdG91dHB1dCArPSAnanVzdGlmaWNhdGlvbj1cIicgKyBqdXN0aWZpY2F0aW9uICsgJ1wiICc7XHJcblx0XHRcdC8vIGFuaW1hdGVkXHJcblx0XHRcdG91dHB1dCArPSAnYW5pbWF0ZWQ9XCInICsgKHEuY3VycmVudFN0YXRlID09IDIpICsgJ1wiICc7IC8vIG1pZ2h0IGhhdmUgdG8gZml4IHRoaXMgbGF0ZXJcclxuXHRcdFx0Ly8gbGluZXNUcmFuY2VkXHJcblx0XHRcdG91dHB1dCArPSAnbGluZXNUcmFjZWQ9XCIwXCIgJzsgLy8gbWlnaHQgaGF2ZSB0byBmaXggdGhpcyB0b29cclxuXHRcdFx0Ly8gcmV2ZWFsQnVmZmVyXHJcblx0XHRcdG91dHB1dCArPSAncmV2ZWFsQnVmZmVyPVwiMFwiICc7IC8vIGFuZCB0aGlzXHJcblx0XHRcdC8vIHBvc2l0aW9uUGVyY2VudFhcclxuXHRcdFx0b3V0cHV0ICs9ICdwb3NpdGlvblBlcmNlbnRYPVwiJyArIFV0aWxpdGllcy5tYXAocS5wb3NpdGlvblBlcmNlbnRYLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngsIDAsIDEwMCkgKyAnXCIgJztcclxuXHRcdFx0Ly8gcG9zaXRpb25QZXJjZW50WVxyXG5cdFx0XHRvdXRwdXQgKz0gJ3Bvc2l0aW9uUGVyY2VudFk9XCInICsgVXRpbGl0aWVzLm1hcChxLnBvc2l0aW9uUGVyY2VudFksIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSwgMCwgMTAwKSArICdcIiAnO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGFnIGVuZFxyXG5cdFx0XHRvdXRwdXQgKz0gJy8+JyArIG5sO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRvdXRwdXQgKz0gXCI8L3F1ZXN0aW9ucz5cIiArIG5sO1xyXG5cdG91dHB1dCArPSBcIjwvY2FzZT5cIiArIG5sO1xyXG5cdHJldHVybiBvdXRwdXQ7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9kcmF3TGliLmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY29uc3RhbnRzLmpzXCIpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoJy4vcXVlc3Rpb24uanMnKTtcclxuXHJcbnZhciBDSEVDS19JTUFHRSA9IFwiLi4vaW1nL2ljb25Qb3N0SXRDaGVjay5wbmdcIjtcclxuXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIGxlc3Nvbk5vZGUoc3RhcnRQb3NpdGlvbiwgaW1hZ2VQYXRoLCBwUXVlc3Rpb24pe1xyXG4gICAgXHJcbiAgICB0aGlzLnBvc2l0aW9uID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMuZHJhZ0xvY2F0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMudHlwZSA9IFwibGVzc29uTm9kZVwiO1xyXG4gICAgdGhpcy5pbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy5jaGVjayA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy53aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5xdWVzdGlvbiA9IHBRdWVzdGlvbjtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSAwO1xyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZTtcclxuICAgIHRoaXMubGluZVBlcmNlbnQgPSAwO1xyXG4gICAgXHJcbiAgICAvLyBza2lwIGFuaW1hdGlvbnMgZm9yIHNvbHZlZFxyXG4gICAgaWYgKHBRdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKSB0aGlzLmxpbmVQZXJjZW50ID0gMTtcclxuICAgIFxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pbWFnZSBsb2FkaW5nIGFuZCByZXNpemluZ1xyXG4gICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0LndpZHRoID0gdGhhdC5pbWFnZS5uYXR1cmFsV2lkdGg7XHJcbiAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmltYWdlLm5hdHVyYWxIZWlnaHQ7XHJcbiAgICAgICAgdmFyIG1heERpbWVuc2lvbiA9IENvbnN0YW50cy5ib2FyZFNpemUueC8xMDtcclxuICAgICAgICAvL3RvbyBzbWFsbD9cclxuICAgICAgICBpZih0aGF0LndpZHRoIDwgbWF4RGltZW5zaW9uICYmIHRoYXQuaGVpZ2h0IDwgbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC53aWR0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IG1heERpbWVuc2lvbiAvIHRoYXQuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoICogeDtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAqIHg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPiBtYXhEaW1lbnNpb24gfHwgdGhhdC5oZWlnaHQgPiBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSB0aGF0LndpZHRoIC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC5oZWlnaHQgLyBtYXhEaW1lbnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggLyB4O1xyXG4gICAgICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaGVpZ2h0IC8geDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoYXQucG9zaXRpb24ueCArPSB0aGF0LndpZHRoLzI7XHJcbiAgICAgICAgdGhhdC5wb3NpdGlvbi55ICs9IHRoYXQuaGVpZ2h0LzI7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IGltYWdlUGF0aDtcclxuICAgIHRoaXMuY2hlY2suc3JjID0gQ0hFQ0tfSU1BR0U7XHJcbn1cclxuXHJcbnZhciBwID0gbGVzc29uTm9kZS5wcm90b3R5cGU7XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcblxyXG5cdC8vIENoZWNrIGlmIHF1ZXN0aW9uIGlzIHZpc2libGVcclxuXHRpZih0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuSElEREVOKXtcclxuXHRcdGlmKHRoaXMucXVlc3Rpb24ucmV2ZWFsVGhyZXNob2xkIDw9IHRoaXMuY29ubmVjdGlvbnMpe1xyXG5cdFx0XHR0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlVOU09MVkVEO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG4gICAgLy9sZXNzb25Ob2RlLmRyYXdMaWIuY2lyY2xlKGN0eCwgdGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIDEwLCBcInJlZFwiKTtcclxuICAgIC8vZHJhdyB0aGUgaW1hZ2UsIHNoYWRvdyBpZiBob3ZlcmVkXHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgaWYodGhpcy5kcmFnZ2luZykge1xyXG4gICAgXHRjdHguc2hhZG93Q29sb3IgPSAneWVsbG93JztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDU7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy13ZWJraXQtZ3JhYmJpbmcnO1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctbW96LWdyYWJiaW5nJztcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZih0aGlzLm1vdXNlT3Zlcil7XHJcbiAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gJ2RvZGdlckJsdWUnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICB9XHJcbiAgICAvL2RyYXdpbmcgdGhlIGJ1dHRvbiBpbWFnZVxyXG4gICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgIFxyXG4gICAgLy9kcmF3aW5nIHRoZSBwaW5cclxuICAgIHN3aXRjaCAodGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGUpIHtcclxuICAgIFx0Y2FzZSAxOlxyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImJsdWVcIjtcclxuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJjeWFuXCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgIFx0Y2FzZSAyOlxyXG4gICAgIFx0XHRjdHguZHJhd0ltYWdlKHRoaXMuY2hlY2ssIHRoaXMucG9zaXRpb24ueCArIHRoaXMud2lkdGgvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgdGhpcy5wb3NpdGlvbi55ICsgdGhpcy5oZWlnaHQvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwLCBDb25zdGFudHMuYm9hcmRTaXplLngvNTApO1xyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IFwieWVsbG93XCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgfVxyXG5cdHZhciBzbWFsbGVyID0gdGhpcy53aWR0aCA8IHRoaXMuaGVpZ2h0ID8gdGhpcy53aWR0aCA6IHRoaXMuaGVpZ2h0O1xyXG5cdGN0eC5saW5lV2lkdGggPSBzbWFsbGVyLzMyO1xyXG5cclxuXHRjdHguYmVnaW5QYXRoKCk7XHJcblx0dmFyIG5vZGVQb2ludCA9IHRoaXMuZ2V0Tm9kZVBvaW50KCk7XHJcblx0Y3R4LmFyYyhub2RlUG9pbnQueCwgbm9kZVBvaW50LnksIHNtYWxsZXIqMy8zMiwgMCwgMipNYXRoLlBJKTtcclxuXHRjdHguY2xvc2VQYXRoKCk7XHJcblx0Y3R4LmZpbGwoKTtcclxuXHRjdHguc3Ryb2tlKCk7XHJcbiAgICBcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG5wLmdldE5vZGVQb2ludCA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIHNtYWxsZXIgPSB0aGlzLndpZHRoIDwgdGhpcy5oZWlnaHQgPyB0aGlzLndpZHRoIDogdGhpcy5oZWlnaHQ7XHJcblx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIgKyBzbWFsbGVyKjMvMTYsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIgKyBzbWFsbGVyKjMvMTYpO1xyXG59XHJcblxyXG5wLmNsaWNrID0gZnVuY3Rpb24obW91c2VTdGF0ZSl7XHJcbiAgICB0aGlzLnF1ZXN0aW9uLmRpc3BsYXlXaW5kb3dzKCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGVzc29uTm9kZTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy8gcHJpdmF0ZSB2YXJpYWJsZXNcclxudmFyIG1vdXNlUG9zaXRpb24sIHJlbGF0aXZlTW91c2VQb3NpdGlvbjtcclxudmFyIG1vdXNlRG93blRpbWVyLCBtYXhDbGlja0R1cmF0aW9uO1xyXG52YXIgbW91c2VXaGVlbFZhbDtcclxudmFyIHByZXZUaW1lO1xyXG52YXIgc2NhbGluZywgdG91Y2hab29tLCBzdGFydFRvdWNoWm9vbTtcclxuXHJcbmZ1bmN0aW9uIG1vdXNlU3RhdGUoY2FudmFzKXtcclxuXHRtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KDAsMCk7XHJcbiAgICByZWxhdGl2ZU1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIHRoaXMudmlydHVhbFBvc2l0aW9uID0gbmV3IFBvaW50KDAsMCk7XHJcbiAgICBcclxuICAgIC8vZXZlbnQgbGlzdGVuZXJzIGZvciBtb3VzZSBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgY2FudmFzXHJcbiAgICB2YXIgbW91c2VTdGF0ZSA9IHRoaXM7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHVwZGF0ZVBvc2l0aW9uKGUpO1xyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRpZihzY2FsaW5nKVxyXG4gICAgXHRcdHVwZGF0ZVRvdWNoUG9zaXRpb25zKGUpO1xyXG4gICAgXHRlbHNlXHJcbiAgICBcdFx0dXBkYXRlUG9zaXRpb24oZS50b3VjaGVzWzBdKTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy5tb3VzZURvd24gPSBmYWxzZTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBcdGlmKGUudG91Y2hlcy5sZW5ndGggPT0gMSAmJiAhc2NhbGluZyl7XHJcblx0ICAgICAgICB1cGRhdGVQb3NpdGlvbihlLnRvdWNoZXNbMF0pO1xyXG5cdCAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdCAgICAgICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IHRydWU7XHJcblx0ICAgICAgICB9KTtcclxuICAgIFx0fVxyXG4gICAgXHRlbHNlIGlmKGUudG91Y2hlcy5sZW5ndGggPT0gMil7XHJcbiAgICBcdFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSBmYWxzZTtcclxuICAgIFx0XHRzY2FsaW5nID0gdHJ1ZTtcclxuICAgIFx0XHR1cGRhdGVUb3VjaFBvc2l0aW9ucyhlKTtcclxuICAgIFx0XHRzdGFydFRvdWNoWm9vbSA9IHRvdWNoWm9vbTtcclxuICAgIFx0fVxyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIFx0bW91c2VTdGF0ZS5tb3VzZURvd24gPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgXHRpZihzY2FsaW5nKXtcclxuICAgIFx0XHRzY2FsaW5nID0gZmFsc2U7XHJcbiAgICBcdCAgICB0b3VjaFpvb20gPSAwO1xyXG4gICAgXHQgICAgc3RhcnRUb3VjaFpvb20gPSAwO1xyXG4gICAgXHR9XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB9KTtcclxuICAgIHRoaXMubW91c2VJbiA9IGZhbHNlO1xyXG4gICAgbW91c2VEb3duVGltZXIgPSAwO1xyXG4gICAgdGhpcy56b29tRGlmZiA9IDA7XHJcbiAgICB0b3VjaFpvb20gPSAwO1xyXG4gICAgdGhpcy5tb3VzZUNsaWNrZWQgPSBmYWxzZTtcclxuICAgIG1heENsaWNrRHVyYXRpb24gPSAyMDA7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0bW91c2VTdGF0ZS5tb3VzZUluID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW91dFwiLCBmdW5jdGlvbihlKXtcclxuICAgIFx0bW91c2VTdGF0ZS5tb3VzZUluID0gZmFsc2U7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gZmFsc2U7XHJcbiAgICB9KTtcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlUG9zaXRpb24oZSl7XHJcblx0dmFyIGJvdW5kUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIG1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoZS5jbGllbnRYIC0gYm91bmRSZWN0LmxlZnQsIGUuY2xpZW50WSAtIGJvdW5kUmVjdC50b3ApO1xyXG4gICAgcmVsYXRpdmVNb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KG1vdXNlUG9zaXRpb24ueCAtIChjYW52YXMub2Zmc2V0V2lkdGgvMi4wKSwgbW91c2VQb3NpdGlvbi55IC0gKGNhbnZhcy5vZmZzZXRIZWlnaHQvMi4wKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRvdWNoUG9zaXRpb25zKGUpe1xyXG5cdHZhciBjdXJUb3VjaGVzID0gW1xyXG5cdCAgICAgICAgICAgICAgIG5ldyBQb2ludChlLnRvdWNoZXNbMF0uY2xpZW50WCwgZS50b3VjaGVzWzBdLmNsaWVudFkpLFxyXG5cdCAgICAgICAgICAgICAgIG5ldyBQb2ludChlLnRvdWNoZXNbMV0uY2xpZW50WCwgZS50b3VjaGVzWzFdLmNsaWVudFkpXHJcblx0XTtcclxuXHR0b3VjaFpvb20gPSBNYXRoLnNxcnQoTWF0aC5wb3coY3VyVG91Y2hlc1swXS54LWN1clRvdWNoZXNbMV0ueCwgMikrTWF0aC5wb3coY3VyVG91Y2hlc1swXS55LWN1clRvdWNoZXNbMV0ueSwgMikpO1xyXG59XHJcblxyXG52YXIgcCA9IG1vdXNlU3RhdGUucHJvdG90eXBlO1xyXG5cclxuLy8gVXBkYXRlIHRoZSBtb3VzZSB0byB0aGUgY3VycmVudCBzdGF0ZVxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKGR0LCBzY2FsZSl7XHJcbiAgICBcclxuXHQvLyBTYXZlIHRoZSBjdXJyZW50IHZpcnR1YWwgcG9zaXRpb24gZnJvbSBzY2FsZVxyXG5cdHRoaXMudmlydHVhbFBvc2l0aW9uID0gbmV3IFBvaW50KHJlbGF0aXZlTW91c2VQb3NpdGlvbi54L3NjYWxlLCByZWxhdGl2ZU1vdXNlUG9zaXRpb24ueS9zY2FsZSk7O1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIHpvb20gZGlmZiBhbmQgcHJldiB6b29tXHJcblx0aWYoc2NhbGluZylcclxuXHRcdHRoaXMuem9vbURpZmYgPSBzdGFydFRvdWNoWm9vbSAtIHRvdWNoWm9vbTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLnpvb21EaWZmID0gMDtcclxuXHRcclxuICAgIC8vIGNoZWNrIG1vdXNlIGNsaWNrXHJcbiAgICB0aGlzLm1vdXNlQ2xpY2tlZCA9IGZhbHNlO1xyXG4gICAgaWYgKHRoaXMubW91c2VEb3duKVxyXG4gICAgXHRtb3VzZURvd25UaW1lciArPSBkdDtcclxuICAgIGVsc2V7XHJcbiAgICBcdGlmIChtb3VzZURvd25UaW1lciA+IDAgJiYgbW91c2VEb3duVGltZXIgPCBtYXhDbGlja0R1cmF0aW9uKVxyXG4gICAgXHRcdHRoaXMubW91c2VDbGlja2VkID0gdHJ1ZTtcclxuICAgIFx0bW91c2VEb3duVGltZXIgPSAwO1xyXG4gICAgfVxyXG4gICAgdGhpcy5wcmV2TW91c2VEb3duID0gdGhpcy5tb3VzZURvd247XHJcbiAgICB0aGlzLmhhc1RhcmdldCA9IGZhbHNlO1xyXG4gICAgXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbW91c2VTdGF0ZTsiLCJcInVzZSBzdHJpY3RcIjtcclxuZnVuY3Rpb24gUG9pbnQocFgsIHBZKXtcclxuICAgIHRoaXMueCA9IHBYO1xyXG4gICAgdGhpcy55ID0gcFk7XHJcbn1cclxuXHJcbnZhciBwID0gUG9pbnQucHJvdG90eXBlO1xyXG5cclxucC5hZGQgPSBmdW5jdGlvbihwWCwgcFkpe1xyXG5cdGlmKHBZKVxyXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLngrcFgsIHRoaXMueStwWSk7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLngrcFgueCwgdGhpcy55K3BYLnkpO1xyXG59XHJcblxyXG5wLm11bHQgPSBmdW5jdGlvbihwWCwgcFkpe1xyXG5cdGlmKHBZKVxyXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLngqcFgsIHRoaXMueSpwWSk7XHJcblx0ZWxzZVxyXG5cdFx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLngqcFgueCwgdGhpcy55KnBYLnkpO1xyXG59XHJcblxyXG5wLnNjYWxlID0gZnVuY3Rpb24oc2NhbGUpe1xyXG5cdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnNjYWxlLCB0aGlzLnkqc2NhbGUpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50OyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcblxyXG52YXIgU09MVkVfU1RBVEUgPSBPYmplY3QuZnJlZXplKHtISURERU46IDAsIFVOU09MVkVEOiAxLCBTT0xWRUQ6IDJ9KTtcclxudmFyIFFVRVNUSU9OX1RZUEUgPSBPYmplY3QuZnJlZXplKHtKVVNUSUZJQ0FUSU9OOiAxLCBNVUxUSVBMRV9DSE9JQ0U6IDIsIFNIT1JUX1JFU1BPTlNFOiAzLCBGSUxFOiA0LCBNRVNTQUdFOiA1fSk7XHJcblxyXG4vKiBRdWVzdGlvbiBwcm9wZXJ0aWVzOlxyXG5jdXJyZW50U3RhdGU6IFNPTFZFX1NUQVRFXHJcbndpbmRvd0RpdjogZWxlbWVudFxyXG5jb3JyZWN0OiBpbnRcclxucG9zaXRpb25QZXJjZW50WDogZmxvYXRcclxucG9zaXRpb25QZXJjZW50WTogZmxvYXRcclxucmV2ZWFsVGhyZXNob2xkOiBpbnRcclxuaW1hZ2VMaW5rOiBzdHJpbmdcclxuZmVlZGJhY2tzOiBzdHJpbmdbXVxyXG5jb25uZWN0aW9uRWxlbWVudHM6IGVsZW1lbnRbXVxyXG5jb25uZWN0aW9uczogaW50W11cclxucXVlc3Rpb25UeXBlOiBTT0xWRV9TVEFURVxyXG5qdXN0aWZpY2F0aW9uOiBzdHJpbmdcclxud3JvbmdBbnN3ZXI6IHN0cmluZ1xyXG5jb3JyZWN0QW5zd2VyOiBzdHJpbmdcclxuKi9cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gUXVlc3Rpb24oeG1sLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKXtcclxuXHRcclxuXHQvLyBTZXQgdGhlIGN1cnJlbnQgc3RhdGUgdG8gZGVmYXVsdCBhdCBoaWRkZW4gYW5kIHN0b3JlIHRoZSB3aW5kb3cgZGl2XHJcbiAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IFNPTFZFX1NUQVRFLkhJRERFTjtcclxuICAgIHRoaXMud2luZG93RGl2ID0gd2luZG93RGl2O1xyXG4gICAgXHJcbiAgICAvLyBHZXQgYW5kIHNhdmUgdGhlIGdpdmVuIGluZGV4LCBjb3JyZWN0IGFuc3dlciwgcG9zaXRpb24sIHJldmVhbCB0aHJlc2hvbGQsIGltYWdlIGxpbmssIGZlZWRiYWNrLCBhbmQgY29ubmVjdGlvbnNcclxuICAgIHRoaXMuY29ycmVjdCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJjb3JyZWN0QW5zd2VyXCIpKTtcclxuICAgIHRoaXMucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInhQb3NpdGlvblBlcmNlbnRcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueCk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ5UG9zaXRpb25QZXJjZW50XCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLnkpO1xyXG4gICAgdGhpcy5yZXZlYWxUaHJlc2hvbGQgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwicmV2ZWFsVGhyZXNob2xkXCIpKTtcclxuICAgIHRoaXMuaW1hZ2VMaW5rID0gdXJsK3htbC5nZXRBdHRyaWJ1dGUoXCJpbWFnZUxpbmtcIik7XHJcbiAgICB0aGlzLmZlZWRiYWNrcyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImZlZWRiYWNrXCIpO1xyXG4gICAgdGhpcy5ibG9iID0gbnVsbDsgLy8gbm8gdXBsb2FkIGJ5IGRlZmF1bHRcclxuICAgIHRoaXMuZmlsZU5hbWUgPSBcIlwiO1xyXG4gICAgdmFyIGNvbm5lY3Rpb25FbGVtZW50cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNvbm5lY3Rpb25zXCIpO1xyXG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IFtdO1xyXG4gICAgZm9yKHZhciBpPTA7aTxjb25uZWN0aW9uRWxlbWVudHMubGVuZ3RoO2krKylcclxuICAgIFx0dGhpcy5jb25uZWN0aW9uc1tpXSA9IHBhcnNlSW50KGNvbm5lY3Rpb25FbGVtZW50c1tpXS5pbm5lckhUTUwpO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgdGhlIHdpbmRvd3MgZm9yIHRoaXMgcXVlc3Rpb24gYmFzZWQgb24gdGhlIHF1ZXN0aW9uIHR5cGVcclxuICAgIHRoaXMucXVlc3Rpb25UeXBlID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uVHlwZVwiKSk7XHJcbiAgICB0aGlzLmp1c3RpZmljYXRpb24gPSB0aGlzLnF1ZXN0aW9uVHlwZT09MSB8fCB0aGlzLnF1ZXN0aW9uVHlwZT09MztcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZSE9NSl7XHJcblx0XHR0aGlzLmNyZWF0ZVRhc2tXaW5kb3coeG1sLCB3aW5kb3dzLnRhc2tXaW5kb3cpO1xyXG5cdFx0dGhpcy5jcmVhdGVSZXNvdXJjZVdpbmRvdyh4bWwsIHJlc291cmNlcywgd2luZG93cy5yZXNvdXJjZVdpbmRvdywgd2luZG93cy5yZXNvdXJjZSk7XHJcblx0fVxyXG5cdHN3aXRjaCh0aGlzLnF1ZXN0aW9uVHlwZSl7XHJcblx0XHRjYXNlIDU6XHJcblx0XHRcdHRoaXMuY3JlYXRlTWVzc2FnZVdpbmRvdyh4bWwsIHdpbmRvd3MubWVzc2FnZVdpbmRvdyk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSA0OlxyXG5cdFx0XHR0aGlzLmNyZWF0ZUZpbGVXaW5kb3cod2luZG93cy5maWxlV2luZG93KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDM6XHJcblx0XHRjYXNlIDI6XHJcblx0XHRjYXNlIDE6XHJcblx0XHRcdHRoaXMuY3JlYXRlQW5zd2VyV2luZG93KHhtbCwgd2luZG93cy5hbnN3ZXJXaW5kb3cpO1xyXG5cdFx0XHRicmVhaztcclxuXHR9XHJcbiAgICBcclxufVxyXG5cclxudmFyIHAgPSBRdWVzdGlvbi5wcm90b3R5cGU7XHJcblxyXG5wLnNob3dQcmV2U3VibWl0dGVkRmlsZXMgPSBmdW5jdGlvbihmaWxlcykge1xyXG5cdC8vIGFja25vd2xlZGdlIHN1Ym1pdHRlZCBmaWxlcyBpbiB0YXNrIHdpbmRvd1xyXG5cdGlmKGZpbGVzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnU3VibWl0dGVkIEZpbGVzOjxici8+JztcclxuXHRlbHNlXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICcnO1xyXG5cdGZvcih2YXIgaT0wO2k8ZmlsZXM7aSsrKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgKz0gJzxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytmaWxlc1tpXS5uYW1lKyc8L3NwYW4+PGJyLz4nO1xyXG59XHJcblxyXG5wLndyb25nQW5zd2VyID0gZnVuY3Rpb24obnVtKXtcclxuXHJcbiAgLy8gSWYgZmVlYmFjayBkaXNwbGF5IGl0XHJcblx0aWYodGhpcy5mZWVkYmFja3MubGVuZ3RoPjApXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdcIicrU3RyaW5nLmZyb21DaGFyQ29kZShudW0gKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J1wiIGlzIG5vdCBjb3JyZWN0IDxici8+Jm5ic3A7PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5mZWVkYmFja3NbbnVtXS5pbm5lckhUTUwrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcbn1cclxuXHJcbnAuY29ycmVjdEFuc3dlciA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gRGlzYWJsZSBhbGwgdGhlIGFuc3dlciBidXR0b25zXHJcblx0aWYodGhpcy5hbnN3ZXJzKVxyXG5cdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmFuc3dlcnMubGVuZ3RoO2krKylcclxuXHRcdFx0dGhpcy5hbnN3ZXJzW2ldLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcclxuXHQvLyBJZiBmZWVkYmFjayBkaXNwbGF5IGl0XHJcblx0aWYodGhpcy5mZWVkYmFja3MubGVuZ3RoPjApXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdcIicrU3RyaW5nLmZyb21DaGFyQ29kZSh0aGlzLmNvcnJlY3QgKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J1wiIGlzIHRoZSBjb3JyZWN0IHJlc3BvbnNlIDxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5mZWVkYmFja3NbdGhpcy5jb3JyZWN0XS5pbm5lckhUTUwrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT0zICYmIHRoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSAhPSAnJylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1N1Ym1pdHRlZCBUZXh0Ojxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSsnPC9zcGFuPjxici8+JztcclxuXHRcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTEgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgKz0gJ1N1Ym1pdHRlZCBUZXh0Ojxici8+PHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSsnPC9zcGFuPjxici8+JztcclxuXHRcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTQpe1xyXG5cdFx0aWYodGhpcy5maWxlSW5wdXQuZmlsZXMubGVuZ3RoPjApXHJcblx0XHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1N1Ym1pdHRlZCBGaWxlczo8YnIvPic7XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJyc7XHJcblx0XHRmb3IodmFyIGk9MDtpPHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aDtpKyspXHJcblx0XHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MICs9ICc8c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrdGhpcy5maWxlSW5wdXQuZmlsZXNbaV0ubmFtZSsnPC9zcGFuPjxici8+JztcclxuXHR9XHJcbiAgXHJcbiAgaWYodGhpcy5jdXJyZW50U3RhdGUhPVNPTFZFX1NUQVRFLlNPTFZFRCAmJiBcclxuICAgICAoKCh0aGlzLnF1ZXN0aW9uVHlwZT09PTMgfHwgdGhpcy5xdWVzdGlvblR5cGU9PT0xKSAmJiB0aGlzLmp1c3RpZmljYXRpb24udmFsdWUgIT0gJycpIHx8XHJcbiAgICAgICh0aGlzLnF1ZXN0aW9uVHlwZT09PTQgJiYgdGhpcy5maWxlSW5wdXQuZmlsZXMubGVuZ3RoPjApIHx8XHJcbiAgICAgICB0aGlzLnF1ZXN0aW9uVHlwZT09PTIpKXsgXHJcbiAgICAvLyBTZXQgdGhlIHN0YXRlIG9mIHRoZSBxdWVzdGlvbiB0byBjb3JyZWN0XHJcbiAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IFNPTFZFX1NUQVRFLlNPTFZFRDtcclxuICAgIC8vIGlmIHRoZXJlIGlzIGEgcHJvY2VlZCBidXR0b25cclxuICAgIGlmICh0aGlzLnByb2NlZWRFbGVtZW50KSB7IFxyXG5cdFx0dGhpcy5wcm9jZWVkRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvLyBhbmltYXRlIHByb2NlZWQgYnV0dG9uXHJcblx0fVxyXG4gIH1cclxuXHRcclxufVxyXG5cclxucC5kaXNwbGF5V2luZG93cyA9IGZ1bmN0aW9uKCl7XHJcblx0XHJcblx0Ly8gQWRkIHRoZSB3aW5kb3dzIHRvIHRoZSB3aW5kb3cgZGl2XHJcblx0dmFyIHdpbmRvd05vZGUgPSB0aGlzLndpbmRvd0RpdjtcclxuXHR2YXIgZXhpdEJ1dHRvbiA9IG5ldyBJbWFnZSgpO1xyXG5cdGV4aXRCdXR0b24uc3JjID0gXCIuLi9pbWcvaWNvbkNsb3NlLnBuZ1wiO1xyXG5cdGV4aXRCdXR0b24uY2xhc3NOYW1lID0gXCJleGl0LWJ1dHRvblwiO1xyXG5cdHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcblx0ZXhpdEJ1dHRvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IHF1ZXN0aW9uLndpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJzsgfTtcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTUpe1xyXG5cdFx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLm1lc3NhZ2UpO1xyXG5cdCAgICBleGl0QnV0dG9uLnN0eWxlLmxlZnQgPSBcIjc1dndcIjtcclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy50YXNrKTtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXIpO1xyXG5cdFx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLnJlc291cmNlKTtcclxuXHRcdGV4aXRCdXR0b24uc3R5bGUubGVmdCA9IFwiODV2d1wiO1xyXG5cdH1cclxuXHRpZih0aGlzLmN1cnJlbnRTdGF0ZSA9PT0gU09MVkVfU1RBVEUuU09MVkVEICYmIHRoaXMucXVlc3Rpb25UeXBlICE9IFFVRVNUSU9OX1RZUEUuTUVTU0FHRSkgIHtcclxuXHRcdC8vIGlmIHRoZXJlIGlzIGEgcHJvY2VlZCBidXR0b25cclxuXHRcdGlmICh0aGlzLnByb2NlZWRFbGVtZW50KSB7IFxyXG5cdFx0XHR0aGlzLnByb2NlZWRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7IC8vIGFuaW1hdGUgcHJvY2VlZCBidXR0b25cclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZChleGl0QnV0dG9uKTtcclxuXHRcclxufVxyXG5cclxucC5jcmVhdGVUYXNrV2luZG93ID0gZnVuY3Rpb24oeG1sLCB3aW5kb3cpe1xyXG5cdHRoaXMucHJvY2VlZEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb2NlZWRDb250YWluZXJcIik7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSB0YXNrIHdpbmRvdyBcclxuXHR0aGlzLnRhc2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG4gICAgdGhpcy50YXNrLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcbiAgICB0aGlzLnRhc2suc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLnRhc2suc3R5bGUubGVmdCA9IFwiNXZ3XCI7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gd2luZG93O1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHRoaXMudGFzay5pbm5lckhUTUwucmVwbGFjZShcIiV0aXRsZSVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25OYW1lXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHRoaXMudGFzay5pbm5lckhUTUwucmVwbGFjZShcIiVpbnN0cnVjdGlvbnMlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImluc3RydWN0aW9uc1wiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIlcXVlc3Rpb24lXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uVGV4dFwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMuZmVlZGJhY2sgPSB0aGlzLnRhc2suZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImZlZWRiYWNrXCIpWzBdO1xyXG59XHJcblxyXG5wLmNyZWF0ZVJlc291cmNlV2luZG93ID0gZnVuY3Rpb24oeG1sLCByZXNvdXJjZUZpbGVzLCB3aW5kb3csIHJlc291cmNlRWxlbWVudCl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSByZXNvdXJjZSB3aW5kb3cgXHJcblx0dGhpcy5yZXNvdXJjZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcblx0dGhpcy5yZXNvdXJjZS5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG5cdHRoaXMucmVzb3VyY2Uuc3R5bGUudG9wID0gXCI1NXZoXCI7XHJcblx0dGhpcy5yZXNvdXJjZS5zdHlsZS5sZWZ0ID0gXCI1dndcIjtcclxuXHR0aGlzLnJlc291cmNlLmlubmVySFRNTCA9IHdpbmRvdztcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBpbmRpdmlkdWFsIHJlc291Y2VzIGlmIGFueVxyXG5cdHZhciByZXNvdXJjZXMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZUluZGV4XCIpO1xyXG4gICAgaWYocmVzb3VyY2VzLmxlbmd0aCA+IDApe1xyXG4gICAgXHRcclxuICAgIFx0Ly8gR2V0IHRoZSBodG1sIGZvciBlYWNoIHJlc291cmNlIGFuZCB0aGVuIGFkZCB0aGUgcmVzdWx0IHRvIHRoZSB3aW5kb3dcclxuICAgIFx0dmFyIHJlc291cmNlSFRNTCA9ICcnO1xyXG5cdCAgICBmb3IodmFyIGk9MDtpPHJlc291cmNlcy5sZW5ndGg7aSsrKXtcclxuICAgIFx0XHR2YXIgY3VyUmVzb3VyY2UgPSByZXNvdXJjZUVsZW1lbnQucmVwbGFjZShcIiVpY29uJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS5pY29uKTtcclxuXHQgICAgXHRjdXJSZXNvdXJjZSA9IGN1clJlc291cmNlLnJlcGxhY2UoXCIldGl0bGUlXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLnRpdGxlKTtcclxuXHQgICAgXHRjdXJSZXNvdXJjZSA9IGN1clJlc291cmNlLnJlcGxhY2UoXCIlbGluayVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0ubGluayk7XHJcblx0ICAgIFx0cmVzb3VyY2VIVE1MICs9IGN1clJlc291cmNlO1xyXG5cdCAgICB9XHJcblx0ICBcdHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MID0gdGhpcy5yZXNvdXJjZS5pbm5lckhUTUwucmVwbGFjZShcIiVyZXNvdXJjZXMlXCIsIHJlc291cmNlSFRNTCk7XHJcblx0XHQgICAgICAgIFxyXG5cdH1cclxuXHRlbHNle1xyXG5cdFx0Ly8gRGlzcGxheSB0aGF0IHRoZXJlIGFyZW4ndCBhbnkgcmVzb3VyY2VzXHJcblx0XHR0aGlzLnJlc291cmNlLmlubmVySFRNTCA9IHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlcmVzb3VyY2VzJVwiLCBcIk5vIHJlc291cmNlcyBoYXZlIGJlZW4gcHJvdmlkZWQgZm9yIHRoaXMgdGFzay5cIik7XHJcblx0XHR0aGlzLnJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLnN0eWxlLmNvbG9yID0gXCJncmV5XCI7XHJcblx0XHR0aGlzLnJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI0ZGRkZGRlwiO1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5jbGFzc05hbWUgKz0gXCIsIGNlbnRlclwiO1xyXG5cdH1cclxufVxyXG5cclxucC5jcmVhdGVBbnN3ZXJXaW5kb3cgPSBmdW5jdGlvbih4bWwsIHdpbmRvdyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBhbnN3ZXIgd2luZG93IFxyXG5cdHRoaXMuYW5zd2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuICAgIHRoaXMuYW5zd2VyLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS50b3AgPSBcIjEwdmhcIjtcclxuICAgIHRoaXMuYW5zd2VyLnN0eWxlLmxlZnQgPSBcIjUwdndcIjtcclxuICAgIHRoaXMuYW5zd2VyLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSB0ZXh0IGVsZW1lbnQgaWYgYW55XHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdmFyIHN1Ym1pdDtcclxuICAgIGlmKHRoaXMuanVzdGlmaWNhdGlvbil7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQuY2xhc3NOYW1lID0gXCJzdWJtaXRcIjtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5pbm5lckhUTUwgPSBcIlN1Ym1pdFwiO1xyXG4gICAgICAgIHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0cXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG4gICAgXHR9O1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBmdW5jdGlvbigpIHtcclxuICAgIFx0XHRpZihxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLnZhbHVlLmxlbmd0aCA+IDApXHJcbiAgICBcdFx0XHRxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgXHRcdGVsc2VcclxuICAgIFx0XHRcdHF1ZXN0aW9uLmp1c3RpZmljYXRpb24uc3VibWl0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIFx0fSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgYW5kIGdldCBhbGwgdGhlIGFuc3dlciBlbGVtZW50c1xyXG4gICAgdGhpcy5hbnN3ZXJzID0gW107XHJcbiAgICB2YXIgYW5zd2Vyc1htbCA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImFuc3dlclwiKTtcclxuICAgIHZhciBjb3JyZWN0ID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcImNvcnJlY3RBbnN3ZXJcIikpO1xyXG4gICAgZm9yKHZhciBpPTA7aTxhbnN3ZXJzWG1sLmxlbmd0aDtpKyspe1xyXG4gICAgXHRpZih0aGlzLmp1c3RpZmljYXRpb24pXHJcbiAgICBcdFx0dGhpcy5qdXN0aWZpY2F0aW9uLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIFx0dGhpcy5hbnN3ZXJzW2ldID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIFx0aWYoY29ycmVjdD09PWkpXHJcbiAgICBcdFx0dGhpcy5hbnN3ZXJzW2ldLmNsYXNzTmFtZSA9IFwiY29ycmVjdFwiO1xyXG4gICAgXHRlbHNlXHJcbiAgICBcdFx0dGhpcy5hbnN3ZXJzW2ldLmNsYXNzTmFtZSA9IFwid3JvbmdcIjtcclxuICAgIFx0dGhpcy5hbnN3ZXJzW2ldLmlubmVySFRNTCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoaSArIFwiQVwiLmNoYXJDb2RlQXQoKSkrXCIuIFwiK2Fuc3dlcnNYbWxbaV0uaW5uZXJIVE1MO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgdGhlIGV2ZW50cyBmb3IgdGhlIGFuc3dlcnNcclxuICAgIGZvcih2YXIgaT0wO2k8dGhpcy5hbnN3ZXJzLmxlbmd0aDtpKyspe1xyXG5cdCAgaWYodGhpcy5hbnN3ZXJzW2ldLmNsYXNzTmFtZSA9PSBcIndyb25nXCIpe1xyXG5cdFx0dGhpcy5hbnN3ZXJzW2ldLm51bSA9IGk7XHJcbiAgICAgICAgdGhpcy5hbnN3ZXJzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgdGhpcy5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHQgIHF1ZXN0aW9uLndyb25nQW5zd2VyKHRoaXMubnVtKTtcclxuXHQgICAgfTtcclxuICAgICAgfVxyXG4gICAgICBlbHNle1xyXG4gICAgXHR0aGlzLmFuc3dlcnNbaV0ub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcblx0ICAgICAgaWYocXVlc3Rpb24uanVzdGlmaWNhdGlvbilcclxuXHQgICAgICAgIHF1ZXN0aW9uLmp1c3RpZmljYXRpb24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHQgICAgICBxdWVzdGlvbi5jb3JyZWN0QW5zd2VyKCk7XHJcblx0ICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQWRkIHRoZSBhbnN3ZXJzIHRvIHRoZSB3aW5kb3dcclxuICAgIGZvcih2YXIgaT0wO2k8dGhpcy5hbnN3ZXJzLmxlbmd0aDtpKyspXHJcbiAgICAgIHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLmFwcGVuZENoaWxkKHRoaXMuYW5zd2Vyc1tpXSk7XHJcbiAgICBpZih0aGlzLmp1c3RpZmljYXRpb24pe1xyXG4gICAgXHR0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5hcHBlbmRDaGlsZCh0aGlzLmp1c3RpZmljYXRpb24pO1xyXG4gICAgXHR0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5hcHBlbmRDaGlsZCh0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0KTtcclxuICAgIH1cclxufVxyXG5cclxucC5jcmVhdGVGaWxlV2luZG93ID0gZnVuY3Rpb24od2luZG93KXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGZpbGUgd2luZG93IFxyXG5cdHRoaXMuYW5zd2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuICAgIHRoaXMuYW5zd2VyLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS50b3AgPSBcIjEwdmhcIjtcclxuICAgIHRoaXMuYW5zd2VyLnN0eWxlLmxlZnQgPSBcIjUwdndcIjtcclxuICAgIHRoaXMuYW5zd2VyLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIHRoaXMuZmlsZUlucHV0ID0gdGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKVswXTtcclxuICAgIHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcbiAgICB0aGlzLmZpbGVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgIFx0XHQvLyBNYWtlIHN1cmUgYSB2YWxpZCBmaWxlIHdhcyBjaG9zZW4gKGN1cnJlbnRseSBub3QgaW1wbGVtZW50ZWQpXHJcblx0XHRcdGlmKGZhbHNlKXtcclxuXHRcdFx0XHRhbGVydChcIllvdSBkaWRuJ3QgY2hvb3NlIGFuIGlwYXIgZmlsZSEgeW91IGNhbiBvbmx5IGxvYWQgaXBhciBmaWxlcyFcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvKi8vIENyZWF0ZSBhIHJlYWRlciBhbmQgcmVhZCB0aGUgemlwXHJcblx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cdFx0XHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGV2ZW50KTtcclxuXHRcdFx0fTtcclxuXHRcdFx0Ly8gcmVhZCB0aGUgZmlyc3QgZmlsZVxyXG5cdFx0XHRyZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZXZlbnQudGFyZ2V0LmZpbGVzWzBdKTsqL1xyXG5cdFx0XHRcclxuXHRcdFx0cXVlc3Rpb24uZmlsZU5hbWUgPSBldmVudC50YXJnZXQuZmlsZXNbMF0ubmFtZTtcclxuXHRcdFx0cXVlc3Rpb24uYmxvYiA9IGV2ZW50LnRhcmdldC5maWxlc1swXS5zbGljZSgpO1xyXG5cclxuXHRcdFx0XHJcblx0ICAgIHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuICAgIH0pO1xyXG4gICAgXHJcbn1cclxuXHJcbnAuY3JlYXRlTWVzc2FnZVdpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgd2luZG93KXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGZpbGUgd2luZG93IFxyXG5cdHRoaXMubWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UuY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuICAgIHRoaXMubWVzc2FnZS5zdHlsZS50b3AgPSBcIjEwdmhcIjtcclxuICAgIHRoaXMubWVzc2FnZS5zdHlsZS5sZWZ0ID0gXCI0MHZ3XCI7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gd2luZG93O1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiV0aXRsZSVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25OYW1lXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiVpbnN0cnVjdGlvbnMlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImluc3RydWN0aW9uc1wiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlcXVlc3Rpb24lXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uVGV4dFwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcbiAgICB0aGlzLm1lc3NhZ2UuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIilbMF0ub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG4gICAgXHRxdWVzdGlvbi5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5TT0xWRUQ7XHJcbiAgICBcdHF1ZXN0aW9uLndpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJztcclxuICAgIH07XHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXN0aW9uO1xyXG5tb2R1bGUuZXhwb3J0cy5TT0xWRV9TVEFURSA9IFNPTFZFX1NUQVRFOyIsIlxyXG5cclxuZnVuY3Rpb24gUXVlc3Rpb25XaW5kb3dzKGNhbGxiYWNrKXtcclxuICB0aGlzLmxvYWRXaW5kb3dzKGNhbGxiYWNrKTtcclxufVxyXG5cclxudmFyIHAgPSBRdWVzdGlvbldpbmRvd3MucHJvdG90eXBlO1xyXG5cclxucC5sb2FkV2luZG93cyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHJcbiAgdmFyIGNvdW50ZXIgPSAwO1xyXG4gIHZhciBjYiA9IGZ1bmN0aW9uKCl7XHJcblx0ICBpZigrK2NvdW50ZXI+PTYgJiYgY2FsbGJhY2spXHJcblx0XHQgIGNhbGxiYWNrKCk7XHJcbiAgfTtcclxuICB0aGlzLmxvYWRUYXNrV2luZG93KGNiKTtcclxuICB0aGlzLmxvYWRSZXNvdXJjZVdpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkQW5zd2VyV2luZG93KGNiKTtcclxuICB0aGlzLmxvYWRGaWxlV2luZG93KGNiKTtcclxuICB0aGlzLmxvYWRNZXNzYWdlV2luZG93KGNiKTtcclxuICB0aGlzLmxvYWRSZXNvdXJjZShjYik7XHJcbiAgXHJcbn1cclxuXHJcbnAubG9hZFRhc2tXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgdGFzayB3aW5kb3dzXHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIFNhdmUgdGhlIHRhc2sgd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MudGFza1dpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICBcdGlmKGNhbGxiYWNrKVxyXG5cdCAgICBcdCAgY2FsbGJhY2soKTtcclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJ0YXNrV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcblxyXG5wLmxvYWRSZXNvdXJjZVdpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciByZXNvdXJjZSB3aW5kb3dzXHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIFNhdmUgdGhlIHJlc291cmNlIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLnJlc291cmNlV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgICAgICBpZihjYWxsYmFjaylcclxuXHQgICAgICAgIFx0Y2FsbGJhY2soKTtcclxuXHQgICAgfVxyXG5cdH07XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwicmVzb3VyY2VXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxucC5sb2FkUmVzb3VyY2UgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIEdldCB0aGUgaHRtbCBmb3IgZWFjaCByZXNvdXJjZSBhbmQgdGhlbiBhZGQgdGhlIHJlc3VsdCB0byB0aGUgd2luZG93XHJcblx0ICAgIFx0d2luZG93cy5yZXNvdXJjZSA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICAgICAgaWYoY2FsbGJhY2spXHJcblx0ICAgICAgICBcdGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwicmVzb3VyY2UuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxucC5sb2FkQW5zd2VyV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIGFuc3dlciB3aW5kb3dzXHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIFNhdmUgdGhlIGFuc3dlciB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5hbnN3ZXJXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgICAgIGlmKGNhbGxiYWNrKVxyXG5cdCAgICAgICAgXHRjYWxsYmFjaygpO1xyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcImFuc3dlcldpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5wLmxvYWRGaWxlV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIGZpbGUgd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLmZpbGVXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgXHRpZihjYWxsYmFjaylcclxuXHQgICAgXHRcdGNhbGxiYWNrKCk7XHJcblx0ICAgICAgICBcclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJmaWxlV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZE1lc3NhZ2VXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgbWVzc2FnZSB3aW5kb3dzXHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIFNhdmUgdGhlIG1lc3NhZ2Ugd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MubWVzc2FnZVdpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdFx0ICAgIGlmKGNhbGxiYWNrKVxyXG5cdFx0ICAgIFx0Y2FsbGJhY2soKTtcclxuXHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwibWVzc2FnZVdpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFF1ZXN0aW9uV2luZG93czsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZShcIi4vcXVlc3Rpb24uanNcIik7XHJcblxyXG4vLyBDcmVhdGVzIGEgY2F0ZWdvcnkgd2l0aCB0aGUgZ2l2ZW4gbmFtZSBhbmQgZnJvbSB0aGUgZ2l2ZW4geG1sXHJcbmZ1bmN0aW9uIFJlc291cmNlKHhtbCwgdXJsKXtcclxuXHRcclxuXHQvLyBGaXJzdCBnZXQgdGhlIGljb25cclxuXHQgIHZhciB0eXBlID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInR5cGVcIikpO1xyXG5cdCAgc3dpdGNoKHR5cGUpe1xyXG5cdCAgICBjYXNlIDA6XHJcblx0ICAgICAgdGhpcy5pY29uID0gJy4uL2ltZy9pY29uUmVzb3VyY2VGaWxlLnBuZyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICAgIGNhc2UgMTpcclxuXHQgICAgICB0aGlzLmljb24gPSAnLi4vaW1nL2ljb25SZXNvdXJjZUxpbmsucG5nJztcclxuXHQgICAgICBicmVhaztcclxuXHQgICAgY2FzZSAyOlxyXG4gICAgXHQgIHRoaXMuaWNvbiA9ICcuLi9pbWcvaWNvblJlc291cmNlVmlkZW8ucG5nJztcclxuXHQgICAgICBicmVhaztcclxuXHQgICAgZGVmYXVsdDpcclxuXHQgICAgICB0aGlzLmljb24gPSAnJztcclxuXHQgICAgICBicmVhaztcclxuXHQgIH1cclxuXHJcblx0ICAvLyBOZXh0IGdldCB0aGUgdGl0bGVcclxuXHQgIHRoaXMudGl0bGUgPSB4bWwuZ2V0QXR0cmlidXRlKFwidGV4dFwiKTtcclxuXHJcblx0ICAvLyBMYXN0IGdldCB0aGUgbGlua1xyXG5cdCAgaWYodHlwZT4wKVxyXG5cdCAgICB0aGlzLmxpbmsgPSB4bWwuZ2V0QXR0cmlidXRlKFwibGlua1wiKTtcclxuXHQgIGVsc2VcclxuXHQgICAgdGhpcy5saW5rID0gdXJsKydhc3NldHMvZmlsZXMvJyt4bWwuZ2V0QXR0cmlidXRlKFwibGlua1wiKS5yZXBsYWNlKC8gL2csICclMjAnKTtcclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlc291cmNlOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcblxyXG4vL01vZHVsZSBleHBvcnRcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHJcbi8vIHJldHVybnMgbW91c2UgcG9zaXRpb24gaW4gbG9jYWwgY29vcmRpbmF0ZSBzeXN0ZW0gb2YgZWxlbWVudFxyXG5tLmdldE1vdXNlID0gZnVuY3Rpb24oZSl7XHJcbiAgICByZXR1cm4gbmV3IFBvaW50KChlLnBhZ2VYIC0gZS50YXJnZXQub2Zmc2V0TGVmdCksIChlLnBhZ2VZIC0gZS50YXJnZXQub2Zmc2V0VG9wKSk7XHJcbn1cclxuXHJcbi8vcmV0dXJucyBhIHZhbHVlIHJlbGF0aXZlIHRvIHRoZSByYXRpbyBpdCBoYXMgd2l0aCBhIHNwZWNpZmljIHJhbmdlIFwibWFwcGVkXCIgdG8gYSBkaWZmZXJlbnQgcmFuZ2VcclxubS5tYXAgPSBmdW5jdGlvbih2YWx1ZSwgbWluMSwgbWF4MSwgbWluMiwgbWF4Mil7XHJcbiAgICByZXR1cm4gbWluMiArIChtYXgyIC0gbWluMikgKiAoKHZhbHVlIC0gbWluMSkgLyAobWF4MSAtIG1pbjEpKTtcclxufVxyXG5cclxuLy9pZiBhIHZhbHVlIGlzIGhpZ2hlciBvciBsb3dlciB0aGFuIHRoZSBtaW4gYW5kIG1heCwgaXQgaXMgXCJjbGFtcGVkXCIgdG8gdGhhdCBvdXRlciBsaW1pdFxyXG5tLmNsYW1wID0gZnVuY3Rpb24odmFsdWUsIG1pbiwgbWF4KXtcclxuICAgIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKG1heCwgdmFsdWUpKTtcclxufVxyXG5cclxuLy9kZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG1vdXNlIGlzIGludGVyc2VjdGluZyB0aGUgYWN0aXZlIGVsZW1lbnRcclxubS5tb3VzZUludGVyc2VjdCA9IGZ1bmN0aW9uKHBNb3VzZVN0YXRlLCBwRWxlbWVudCwgcE9mZnNldHRlcil7XHJcbiAgICBpZihwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCA+IHBFbGVtZW50LnBvc2l0aW9uLnggLSBwRWxlbWVudC53aWR0aC8yIC0gcE9mZnNldHRlci54ICYmIHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IDwgcEVsZW1lbnQucG9zaXRpb24ueCArIHBFbGVtZW50LndpZHRoLzIgLSBwT2Zmc2V0dGVyLngpe1xyXG4gICAgICAgIGlmKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55ID4gcEVsZW1lbnQucG9zaXRpb24ueSAtIHBFbGVtZW50LmhlaWdodC8yIC0gcE9mZnNldHRlci55ICYmIHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IDwgcEVsZW1lbnQucG9zaXRpb24ueSArIHBFbGVtZW50LmhlaWdodC8yIC0gcE9mZnNldHRlci55KXtcclxuICAgICAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgcE1vdXNlU3RhdGUuaGFzVGFyZ2V0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICBcdHJldHVybiBmYWxzZTtcclxuICAgICAgICAvL3BFbGVtZW50Lm1vdXNlT3ZlciA9IGZhbHNlO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBnZXRzIHRoZSB4bWwgb2JqZWN0IG9mIGEgc3RyaW5nXHJcbm0uZ2V0WG1sID0gZnVuY3Rpb24oeG1sKXtcclxuXHR2YXIgeG1sRG9jO1xyXG5cdGlmICh3aW5kb3cuRE9NUGFyc2VyKXtcclxuXHRcdHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XHJcblx0XHR4bWxEb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHhtbCwgXCJ0ZXh0L3htbFwiKTtcclxuXHR9XHJcblx0ZWxzZXsgLy8gSUVcclxuXHRcdHhtbERvYyA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTERPTVwiKTtcclxuXHRcdHhtbERvYy5hc3luYyA9IGZhbHNlO1xyXG5cdFx0eG1sRG9jLmxvYWRYTUwoeG1sKTtcclxuXHR9XHJcblx0cmV0dXJuIHhtbERvYztcclxufVxyXG5cclxuLy8gZ2V0cyB0aGUgc2NhbGUgb2YgdGhlIGZpcnN0IHBhcmFtZXRlciB0byB0aGUgc2Vjb25kICh3aXRoIHRoZSBzZWNvbmQgZml0dGluZyBpbnNpZGUgdGhlIGZpcnN0KVxyXG5tLmdldFNjYWxlID0gZnVuY3Rpb24odmlydHVhbCwgYWN0dWFsKXtcclxuXHRyZXR1cm4gYWN0dWFsLnkvdmlydHVhbC54KnZpcnR1YWwueSA8IGFjdHVhbC54ID8gYWN0dWFsLnkvdmlydHVhbC55IDogYWN0dWFsLngvdmlydHVhbC54O1xyXG59XHJcblxyXG5tLnJlcGxhY2VBbGwgPSBmdW5jdGlvbiAoc3RyLCB0YXJnZXQsIHJlcGxhY2VtZW50KSB7XHJcblx0d2hpbGUgKHN0ci5pbmRleE9mKHRhcmdldCkgPCAwKSB7XHJcblx0XHRzdHIgPSBzdHIucmVwbGFjZSh0YXJnZXQscmVwbGFjZW1lbnQpO1xyXG5cdH1cclxuXHRyZXR1cm4gc3RyO1xyXG59Il19
