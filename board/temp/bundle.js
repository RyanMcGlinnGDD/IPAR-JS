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
var prevTime, dt;
var scale;

function mouseState(canvas){
	
	mousePosition = new Point(0,0);
    relativeMousePosition = new Point(0,0);
    this.virtualPosition = new Point(0,0);
    
    //event listeners for mouse interactions with the canvas
    var mouseState = this;
    canvas.addEventListener("mousemove", updatePosition);
    canvas.addEventListener("touchmove", function(e){
        updatePosition(e.changedTouches[0]);
    });
    this.mouseDown = false;
    canvas.addEventListener("mousedown", function(e){
    	mouseState.mouseDown = true;
    });
    canvas.addEventListener("touchstart", function(e){
        updatePosition(e.changedTouches[0]);
        setTimeout(function(){
        	mouseState.mouseDown = true;
        });
    });
    canvas.addEventListener("mouseup", function(e){
    	mouseState.mouseDown = false;
    });
    canvas.addEventListener("touchend", function(e){
    	mouseState.mouseDown = false;
    });
    this.mouseIn = false;
    mouseDownTimer = 0;
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

var p = mouseState.prototype;

// Update the mouse to the current state
p.update = function(dt, scale){
    
	// Save the current virtual position from scale
	this.virtualPosition = new Point(relativeMousePosition.x/scale, relativeMousePosition.y/scale);;
	
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJib2FyZC9qcy9tYWluLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9ib2FyZC5qcyIsImJvYXJkL2pzL21vZHVsZXMvYnV0dG9uLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9jYXRlZ29yeS5qcyIsImJvYXJkL2pzL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9kcmF3TGliLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9maWxlTWFuYWdlci5qcyIsImJvYXJkL2pzL21vZHVsZXMvZ2FtZS5qcyIsImJvYXJkL2pzL21vZHVsZXMvaXBhckRhdGFQYXJzZXIuanMiLCJib2FyZC9qcy9tb2R1bGVzL2xlc3Nvbk5vZGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL21vdXNlU3RhdGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL3BvaW50LmpzIiwiYm9hcmQvanMvbW9kdWxlcy9xdWVzdGlvbi5qcyIsImJvYXJkL2pzL21vZHVsZXMvcXVlc3Rpb25XaW5kb3dzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9yZXNvdXJjZXMuanMiLCJib2FyZC9qcy9tb2R1bGVzL3V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxuLy9pbXBvcnRzXHJcbnZhciBHYW1lID0gcmVxdWlyZSgnLi9tb2R1bGVzL2dhbWUuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9tb2R1bGVzL3BvaW50LmpzJyk7XHJcbnZhciBNb3VzZVN0YXRlID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vdXNlU3RhdGUuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb25zdGFudHMuanMnKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vbW9kdWxlcy91dGlsaXRpZXMuanMnKTtcclxuXHJcbi8vZ2FtZSBvYmplY3RzXHJcbnZhciBnYW1lO1xyXG52YXIgY2FudmFzO1xyXG52YXIgY3R4O1xyXG5cclxuLy8gd2luZG93IGRpdiwgZmlsbSwgem9vbSBhbmQgaWYgcGF1c2VkXHJcbnZhciB3aW5kb3dEaXY7XHJcbnZhciB3aW5kb3dGaWxtO1xyXG52YXIgcHJvY2VlZENvbnRhaW5lcjtcclxudmFyIHByb2NlZWRMb25nO1xyXG52YXIgcHJvY2VlZFJvdW5kO1xyXG52YXIgcGF1c2VkVGltZSA9IDA7XHJcbnZhciB6b29tU2xpZGVyO1xyXG5cclxuLy9wZXJzaXN0ZW50IHV0aWxpdGllc1xyXG52YXIgcHJldlRpbWU7IC8vIGRhdGUgaW4gbWlsbGlzZWNvbmRzXHJcbnZhciBkdDsgLy8gZGVsdGEgdGltZSBpbiBtaWxsaXNlY29uZHNcclxuXHJcbi8vZmlyZXMgd2hlbiB0aGUgd2luZG93IGxvYWRzXHJcbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbihlKXtcclxuICAgIGluaXRpYWxpemVWYXJpYWJsZXMoKTtcclxuICAgIGxvb3AoKTtcclxufVxyXG5cclxuLy9pbml0aWFsaXphdGlvbiwgbW91c2UgZXZlbnRzLCBhbmQgZ2FtZSBpbnN0YW50aWF0aW9uXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVWYXJpYWJsZXMoKXtcclxuXHR3aW5kb3dEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luZG93Jyk7XHJcbiAgICBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbiAgICBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHByb2NlZWRDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZENvbnRhaW5lcicpO1xyXG4gICAgcHJvY2VlZExvbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvY2VlZEJ0bkxvbmcnKTtcclxuICAgIHByb2NlZWRSb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQnRuUm91bmQnKTtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5vZmZzZXRXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMub2Zmc2V0SGVpZ2h0O1xyXG5cclxuICAgIC8vIFNldHVwIHRoZSB3aW5kb3cgZmlsbVxyXG5cdHdpbmRvd0ZpbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luZG93RmxpbScpO1xyXG5cdHdpbmRvd0ZpbG0ub25jbGljayA9IGZ1bmN0aW9uKCkgeyB3aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7IH07XHJcblx0XHJcblx0Ly8gU2V0dXAgZHRcclxuICAgIHByZXZUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gMDtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBnYW1lXHJcbiAgICBnYW1lID0gbmV3IEdhbWUobG9jYWxTdG9yYWdlWydjYXNlRmlsZXMnXSwgY2FudmFzLCB3aW5kb3dEaXYpO1xyXG4gICAgXHJcblx0Ly8gU2V0dXAgdGhlIHpvb20gYnV0dG9ucy9zbGlkZXIgYW5kIHNjYWxlIG9mIHRoZSBnYW1lXHJcbiAgICB6b29tU2xpZGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tc2xpZGVyJyk7XHJcblx0em9vbVNsaWRlci5vbmlucHV0ID0gZnVuY3Rpb24oKXtcclxuXHRcdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdH07XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbS1pbicpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcbiAgICB9O1xyXG5cdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tLW91dCcpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgXHJcblx0XHR6b29tU2xpZGVyLnN0ZXBVcCgpOyBcclxuXHRcdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG5cdH07XHJcblx0Z2FtZS5vbkNoYW5nZUJvYXJkID0gZnVuY3Rpb24oKSB7XHJcblx0XHR6b29tU2xpZGVyLnZhbHVlID0gLWdhbWUuZ2V0Wm9vbSgpO1xyXG5cdH07XHJcbiAgICBnYW1lLnNjYWxlID0gVXRpbGl0aWVzLmdldFNjYWxlKENvbnN0YW50cy5ib2FyZFNpemUsIG5ldyBQb2ludChjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpKTtcclxufVxyXG5cclxuLy9maXJlcyBvbmNlIHBlciBmcmFtZVxyXG5mdW5jdGlvbiBsb29wKCl7XHJcblx0Ly8gbG9vcFxyXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wLmJpbmQodGhpcykpO1xyXG4gICAgXHJcblx0Ly8gdXBkYXRlIGRlbHRhIHRpbWVcclxuICAgIGR0ID0gRGF0ZS5ub3coKSAtIHByZXZUaW1lO1xyXG4gICAgcHJldlRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICAvLyB1cGRhdGUgZ2FtZVxyXG4gICAgZ2FtZS51cGRhdGUoY3R4LCBjYW52YXMsIGR0KTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgaWYgc2hvdWxkIHBhdXNlXHJcbiAgICBpZihnYW1lLmFjdGl2ZSAmJiB3aW5kb3dEaXYuaW5uZXJIVE1MIT0nJyAmJiBwYXVzZWRUaW1lKys+Myl7XHJcbiAgICBcdGdhbWUuYWN0aXZlID0gZmFsc2U7XHJcbiAgICBcdHdpbmRvd0ZpbG0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKHBhdXNlZFRpbWUhPTAgJiYgd2luZG93RGl2LmlubmVySFRNTD09Jycpe1xyXG4gICAgXHR3aW5kb3dDbG9zZWQoKTtcclxuICAgIH1cclxufVxyXG5cclxuLy9saXN0ZW5zIGZvciBjaGFuZ2VzIGluIHNpemUgb2Ygd2luZG93IGFuZCBhZGp1c3RzIHZhcmlhYmxlcyBhY2NvcmRpbmdseVxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbihlKXtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5vZmZzZXRXaWR0aDtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMub2Zmc2V0SGVpZ2h0O1xyXG4gICAgXHJcbiAgICAvLyBHZXQgdGhlIG5ldyBzY2FsZVxyXG4gICAgZ2FtZS5zY2FsZSA9IFV0aWxpdGllcy5nZXRTY2FsZShDb25zdGFudHMuYm9hcmRTaXplLCBuZXcgUG9pbnQoY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KSk7XHJcbiAgICBcclxufSk7XHJcblxyXG4vL2xpc3RlbnMgZm9yIG1vdXNlIHdoZWVsXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJyxmdW5jdGlvbihldmVudCl7XHJcbiAgICBpZihldmVudC5kZWx0YVk8MClcclxuICAgIFx0em9vbVNsaWRlci5zdGVwRG93bigpO1xyXG4gICAgZWxzZVxyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBVcCgpO1xyXG5cdGdhbWUudXBkYXRlWm9vbSgtcGFyc2VGbG9hdCh6b29tU2xpZGVyLnZhbHVlKSk7IFxyXG4gICAgcmV0dXJuIGZhbHNlOyBcclxufSwgZmFsc2UpO1xyXG5cclxuLy8gQ2FsbGVkIHdoZW4gdGhlIHF1ZXN0aW9uIHdpbmRvdyBjbG9zZXNcclxuZnVuY3Rpb24gd2luZG93Q2xvc2VkKCl7XHJcblx0XHJcblx0Ly8gVW5wYXVzZSB0aGUgZ2FtZSBhbmQgZnVsbHkgY2xvc2UgdGhlIHdpbmRvd1xyXG5cdHBhdXNlZFRpbWUgPSAwO1xyXG5cdGdhbWUuYWN0aXZlID0gdHJ1ZTtcclxuXHR3aW5kb3dGaWxtLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblx0cHJvY2VlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHJcblx0Z2FtZS53aW5kb3dDbG9zZWQoKTtcclxuXHRcclxufSIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbnN0YW50cy5qc1wiKTtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKFwiLi9kcmF3bGliLmpzXCIpO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gYm9hcmQoc3RhcnRQb3NpdGlvbiwgbGVzc29uTm9kZXMpe1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheSA9IGxlc3Nvbk5vZGVzO1xyXG4gICAgdGhpcy5ib2FyZE9mZnNldCA9IHN0YXJ0UG9zaXRpb247XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxuICAgIHRoaXMuem9vbSA9IENvbnN0YW50cy5zdGFydFpvb207XHJcbiAgICB0aGlzLnN0YWdlID0gMDtcclxuICAgIHRoaXMubGFzdFNhdmVUaW1lID0gMDsgLy8gYXNzdW1lIG5vIGNvb2tpZVxyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb24gPSBudWxsO1xyXG4gICAgdGhpcy5sYXN0UXVlc3Rpb25OdW0gPSAtMTtcclxuICAgIFxyXG4gICAgLy9pZiAoZG9jdW1lbnQuY29va2llKSB0aGlzLmxvYWRDb29raWUoKTsgXHJcblxyXG5cdC8vIENoZWNrIGlmIGFsbCBub2RlcyBhcmUgc29sdmVkXHJcblx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoICYmIGRvbmU7aSsrKVxyXG5cdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRpZihkb25lKVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG59XHJcblxyXG4vL3Byb3RvdHlwZVxyXG52YXIgcCA9IGJvYXJkLnByb3RvdHlwZTtcclxuXHJcbnAubW92ZSA9IGZ1bmN0aW9uKHBYLCBwWSl7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnggKz0gcFg7XHJcbiAgICB0aGlzLnBvc2l0aW9uLnkgKz0gcFk7XHJcbiAgICB0aGlzLmJvYXJkT2Zmc2V0ID0ge3g6MCx5OjB9O1xyXG4gICAgdGhpcy5wcmV2Qm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcbn07XHJcblxyXG5wLmFjdCA9IGZ1bmN0aW9uKHBNb3VzZVN0YXRlLCBkdCkge1xyXG5cdFxyXG5cdC8vIGZvciBlYWNoICBub2RlXHJcbiAgICBmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICBcdHZhciBhY3RpdmVOb2RlID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV07IFxyXG5cdFx0Ly8gaGFuZGxlIHNvbHZlZCBxdWVzdGlvblxyXG5cdFx0aWYgKGFjdGl2ZU5vZGUuY3VycmVudFN0YXRlICE9IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCAmJiBhY3RpdmVOb2RlLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIHtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHVwZGF0ZSBlYWNoIGNvbm5lY3Rpb24ncyBjb25uZWN0aW9uIG51bWJlclxyXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGFjdGl2ZU5vZGUucXVlc3Rpb24uY29ubmVjdGlvbnMubGVuZ3RoOyBqKyspXHJcblx0XHRcdFx0dGhpcy5sZXNzb25Ob2RlQXJyYXlbYWN0aXZlTm9kZS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdLmNvbm5lY3Rpb25zKys7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIG5vZGUncyBzdGF0ZVxyXG5cdFx0XHRhY3RpdmVOb2RlLmN1cnJlbnRTdGF0ZSA9IGFjdGl2ZU5vZGUucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgYWxsIG5vZGUncyBhcmUgc29sdmVkXHJcblx0XHRcdHZhciBkb25lID0gdHJ1ZTtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGggJiYgZG9uZTtpKyspXHJcblx0XHRcdFx0aWYodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdFx0XHRkb25lID0gZmFsc2U7XHJcblx0XHRcdGlmKGRvbmUpXHJcblx0XHRcdFx0dGhpcy5maW5pc2hlZCA9IHRydWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiB0aGVyZSBpcyBhIGxpc3RlbmVyIGZvciB1cGRhdGluZyBub2RlcywgY2FsbCBpdC5cclxuXHRcdFx0aWYodGhpcy51cGRhdGVOb2RlKVxyXG5cdFx0XHRcdHRoaXMudXBkYXRlTm9kZSgpO1xyXG5cdFx0XHRcclxuXHRcdH1cclxuXHJcblx0XHQvLyB1cGRhdGUgdGhlIG5vZGUncyB0cmFuc2l0aW9uIHByb2dyZXNzXHJcblx0XHRpZiAoYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHRhY3RpdmVOb2RlLmxpbmVQZXJjZW50ID0gTWF0aC5taW4oMSxkdCpDb25zdGFudHMubGluZVNwZWVkICsgYWN0aXZlTm9kZS5saW5lUGVyY2VudCk7XHJcblx0fVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBtb3VzZSBldmVudHMgaWYgZ2l2ZW4gYSBtb3VzZSBzdGF0ZVxyXG4gICAgaWYocE1vdXNlU3RhdGUpIHtcclxuXHQgICAgXHJcblx0ICAgIC8vIGhvdmVyIHN0YXRlc1xyXG5cdFx0Ly9mb3IodmFyIGkgPSAwOyBpIDwgYm9hcmRBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdC8vIGxvb3AgdGhyb3VnaCBsZXNzb24gbm9kZXMgdG8gY2hlY2sgZm9yIGhvdmVyXHJcblx0XHRcdC8vIHVwZGF0ZSBib2FyZFxyXG5cdFx0XHJcblx0ICAgIGlmICghcE1vdXNlU3RhdGUubW91c2VEb3duICYmIHRoaXMudGFyZ2V0KSB7XHJcblx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IHVuZGVmaW5lZDsgLy8gY2xlYXIgZHJhZyBiZWhhdmlvclxyXG5cdFx0XHR0aGlzLnRhcmdldC5kcmFnZ2luZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLnRhcmdldCA9IG51bGw7XHJcblx0XHR9XHJcblx0ICAgIFxyXG5cdFx0Zm9yICh2YXIgaT10aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGgtMSwgbm9kZUNob3NlbjsgaT49MCAmJiB0aGlzLnRhcmdldD09bnVsbDsgaS0tKSB7XHJcblx0XHRcdHZhciBsTm9kZSA9IHRoaXMubGVzc29uTm9kZUFycmF5W2ldO1xyXG5cdFx0XHRcclxuXHRcdFx0bE5vZGUubW91c2VPdmVyID0gZmFsc2U7XHJcblx0XHRcdFxyXG5cdFx0XHQvL2NvbnNvbGUubG9nKFwibm9kZSB1cGRhdGVcIik7XHJcblx0XHRcdC8vIGlmIGhvdmVyaW5nLCBzaG93IGhvdmVyIGdsb3dcclxuXHRcdFx0LyppZiAocE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi54ID4gbE5vZGUucG9zaXRpb24ueC1sTm9kZS53aWR0aC8yIFxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggPCBsTm9kZS5wb3NpdGlvbi54K2xOb2RlLndpZHRoLzJcclxuXHRcdFx0JiYgcE1vdXNlU3RhdGUucmVsYXRpdmVQb3NpdGlvbi55ID4gbE5vZGUucG9zaXRpb24ueS1sTm9kZS5oZWlnaHQvMlxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgPCBsTm9kZS5wb3NpdGlvbi55K2xOb2RlLmhlaWdodC8yKSB7Ki9cclxuXHRcdFx0aWYgKFV0aWxpdGllcy5tb3VzZUludGVyc2VjdChwTW91c2VTdGF0ZSxsTm9kZSx0aGlzLmJvYXJkT2Zmc2V0KSkge1xyXG5cdFx0XHRcdGxOb2RlLm1vdXNlT3ZlciA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQgPSBsTm9kZTtcclxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKHBNb3VzZVN0YXRlLmhhc1RhcmdldCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmKHRoaXMudGFyZ2V0KXtcclxuXHRcclxuXHRcdFx0aWYoIXRoaXMudGFyZ2V0LmRyYWdnaW5nKXtcclxuXHRcdFx0XHRpZiAocE1vdXNlU3RhdGUubW91c2VEb3duKSB7XHJcblx0XHRcdFx0XHQvLyBkcmFnXHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5kcmFnZ2luZyA9IHRydWU7XHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24gPSBuZXcgUG9pbnQoXHJcblx0XHRcdFx0XHRwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCAtIHRoaXMudGFyZ2V0LnBvc2l0aW9uLngsXHJcblx0XHRcdFx0XHRwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSAtIHRoaXMudGFyZ2V0LnBvc2l0aW9uLnlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZUNsaWNrZWQpIHtcclxuXHRcdFx0XHRcdC8vIGhhbmRsZSBjbGljayBjb2RlXHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldC5jbGljayhwTW91c2VTdGF0ZSk7XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RRdWVzdGlvbiA9IHRoaXMudGFyZ2V0LnF1ZXN0aW9uO1xyXG5cdFx0XHRcdFx0dGhpcy5sYXN0UXVlc3Rpb25OdW0gPSBpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNle1xyXG5cdFx0XHRcdHZhciBuYXR1cmFsWCA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uLng7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucG9zaXRpb24ueCA9IE1hdGgubWF4KENvbnN0YW50cy5ib2FyZE91dGxpbmUsTWF0aC5taW4obmF0dXJhbFgsQ29uc3RhbnRzLmJvYXJkU2l6ZS54IC0gQ29uc3RhbnRzLmJvYXJkT3V0bGluZSkpO1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnF1ZXN0aW9uLnBvc2l0aW9uUGVyY2VudFggPSB0aGlzLnRhcmdldC5wb3NpdGlvbi54O1xyXG5cdFx0XHRcdHZhciBuYXR1cmFsWSA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uLnk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucG9zaXRpb24ueSA9IE1hdGgubWF4KENvbnN0YW50cy5ib2FyZE91dGxpbmUsTWF0aC5taW4obmF0dXJhbFksQ29uc3RhbnRzLmJvYXJkU2l6ZS55IC0gQ29uc3RhbnRzLmJvYXJkT3V0bGluZSkpO1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0LnF1ZXN0aW9uLnBvc2l0aW9uUGVyY2VudFkgPSB0aGlzLnRhcmdldC5wb3NpdGlvbi55O1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdCAgfVxyXG5cdFx0XHJcblx0XHQvLyBkcmFnIHRoZSBib2FyZCBhcm91bmRcclxuXHRcdGlmICh0aGlzLnRhcmdldD09bnVsbCkge1xyXG5cdFx0XHRpZiAocE1vdXNlU3RhdGUubW91c2VEb3duKSB7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctd2Via2l0LWdyYWJiaW5nJztcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy1tb3otZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGlmICghdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkKSB7XHJcblx0XHRcdFx0XHR0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQgPSBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb247XHJcblx0XHRcdFx0XHR0aGlzLnByZXZCb2FyZE9mZnNldC54ID0gdGhpcy5ib2FyZE9mZnNldC54O1xyXG5cdFx0XHRcdFx0dGhpcy5wcmV2Qm9hcmRPZmZzZXQueSA9IHRoaXMuYm9hcmRPZmZzZXQueTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSB0aGlzLnByZXZCb2FyZE9mZnNldC54IC0gKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkLngpO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueCA+IHRoaXMubWF4Qm9hcmRXaWR0aC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnggPSB0aGlzLm1heEJvYXJkV2lkdGgvMjtcclxuXHRcdFx0XHRcdGlmICh0aGlzLmJvYXJkT2Zmc2V0LnggPCAtMSp0aGlzLm1heEJvYXJkV2lkdGgvMikgdGhpcy5ib2FyZE9mZnNldC54ID0gLTEqdGhpcy5tYXhCb2FyZFdpZHRoLzI7XHJcblx0XHRcdFx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSB0aGlzLnByZXZCb2FyZE9mZnNldC55IC0gKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy5tb3VzZVN0YXJ0RHJhZ0JvYXJkLnkpO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueSA+IHRoaXMubWF4Qm9hcmRIZWlnaHQvMikgdGhpcy5ib2FyZE9mZnNldC55ID0gdGhpcy5tYXhCb2FyZEhlaWdodC8yO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueSA8IC0xKnRoaXMubWF4Qm9hcmRIZWlnaHQvMikgdGhpcy5ib2FyZE9mZnNldC55ID0gLTEqdGhpcy5tYXhCb2FyZEhlaWdodC8yO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICcnO1xyXG5cdFx0XHR9XHJcblx0ICAgIH1cclxuICAgIH1cclxufVxyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4LCBjYW52YXMpe1xyXG4gICAgXHJcbiAgICAvLyBzYXZlIGNhbnZhcyBzdGF0ZSBiZWNhdXNlIHdlIGFyZSBhYm91dCB0byBhbHRlciBwcm9wZXJ0aWVzXHJcbiAgICBjdHguc2F2ZSgpOyAgIFxyXG5cclxuICAgIC8vIFRyYW5zbGF0ZSB0byBjZW50ZXIgb2Ygc2NyZWVuIGFuZCBzY2FsZSBmb3Igem9vbSB0aGVuIHRyYW5zbGF0ZSBiYWNrXHJcbiAgICBjdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aC8yLCBjYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgY3R4LnNjYWxlKHRoaXMuem9vbSwgdGhpcy56b29tKTtcclxuICAgIGN0eC50cmFuc2xhdGUoLWNhbnZhcy53aWR0aC8yLCAtY2FudmFzLmhlaWdodC8yKTtcclxuICAgIC8vIG1vdmUgdGhlIGJvYXJkIHRvIHdoZXJlIHRoZSB1c2VyIGRyYWdnZWQgaXRcclxuICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLmJvYXJkT2Zmc2V0O1xyXG4gICAgLy90cmFuc2xhdGUgdG8gdGhlIGNlbnRlciBvZiB0aGUgYm9hcmRcclxuICAgIC8vY29uc29sZS5sb2codGhpcyk7XHJcbiAgICBjdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aC8yIC0gdGhpcy5wb3NpdGlvbi54LCBjYW52YXMuaGVpZ2h0LzIgLSB0aGlzLnBvc2l0aW9uLnkpO1xyXG4gICAgXHJcblx0XHJcbiAgICAvLyBEcmF3IHRoZSBiYWNrZ3JvdW5kIG9mIHRoZSBib2FyZFxyXG4gICAgRHJhd0xpYi5yZWN0KGN0eCwgMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LCBDb25zdGFudHMuYm9hcmRTaXplLnksIFwiI0QzQjE4NVwiKTtcclxuICAgIERyYXdMaWIuc3Ryb2tlUmVjdChjdHgsIC1Db25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIC1Db25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZFNpemUueCtDb25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZFNpemUueStDb25zdGFudHMuYm9hcmRPdXRsaW5lLzIsIENvbnN0YW50cy5ib2FyZE91dGxpbmUsIFwiI0NCOTk2NlwiKTtcclxuICAgIFxyXG5cdC8vIGRyYXcgdGhlIG5vZGVzXHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG4gICAgXHJcbiAgICBcdC8vIHRlbXBvcmFyaWx5IGhpZGUgYWxsIGJ1dCB0aGUgZmlyc3QgcXVlc3Rpb25cdFx0XHRcdFx0XHQvLyBzb21ldGhpbmcgaXMgd3JvbmcgaGVyZSwgbGlua3NBd2F5RnJvbU9yaWdpbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlXHJcblx0XHQvL2lmICh0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5yZXZlYWxUaHJlc2hvbGQgPiB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5saW5rc0F3YXlGcm9tT3JpZ2luKSBjb250aW51ZTtcclxuICAgIFx0XHJcbiAgICBcdC8vIGRyYXcgdGhlIG5vZGUgaXRzZWxmXHJcbiAgICAgICAgdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZHJhdyhjdHgsIGNhbnZhcyk7XHJcbiAgICB9XHJcblxyXG5cdC8vIGRyYXcgdGhlIGxpbmVzXHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHJcblx0XHQvLyBvbmx5IHNob3cgbGluZXMgZnJvbSBzb2x2ZWQgcXVlc3Rpb25zXHJcblx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY3VycmVudFN0YXRlIT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIGNvbnRpbnVlO1xyXG5cdFx0XHJcblx0XHQvLyBnZXQgdGhlIHBpbiBwb3NpdGlvblxyXG4gICAgICAgIHZhciBvUG9zID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0uZ2V0Tm9kZVBvaW50KCk7XHJcbiAgICAgICAgXHJcblx0XHQvLyBzZXQgbGluZSBzdHlsZVxyXG5cdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsMCwxMDUsMC4yKVwiO1xyXG5cdFx0Y3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gZHJhdyBsaW5lc1xyXG4gICAgICAgIGZvciAodmFyIGo9MDsgajx0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyAtMSBiZWNhc2Ugbm9kZSBjb25uZWN0aW9uIGluZGV4IHZhbHVlcyBhcmUgMS1pbmRleGVkIGJ1dCBjb25uZWN0aW9ucyBpcyAwLWluZGV4ZWRcclxuXHRcdFx0aWYgKHRoaXMubGVzc29uTm9kZUFycmF5W3RoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0ucXVlc3Rpb24uY3VycmVudFN0YXRlPT1RdWVzdGlvbi5TT0xWRV9TVEFURS5ISURERU4pIGNvbnRpbnVlO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyBnbyB0byB0aGUgaW5kZXggaW4gdGhlIGFycmF5IHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGNvbm5lY3RlZCBub2RlIG9uIHRoaXMgYm9hcmQgYW5kIHNhdmUgaXRzIHBvc2l0aW9uXHJcbiAgICAgICAgXHQvLyBjb25uZWN0aW9uIGluZGV4IHNhdmVkIGluIHRoZSBsZXNzb25Ob2RlJ3MgcXVlc3Rpb25cclxuICAgICAgICBcdHZhciBjb25uZWN0aW9uID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXTtcclxuICAgICAgICBcdHZhciBjUG9zID0gY29ubmVjdGlvbi5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0Ly8gZHJhdyB0aGUgbGluZVxyXG4gICAgICAgIFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIFx0Ly8gdHJhbnNsYXRlIHRvIHN0YXJ0IChwaW4pXHJcbiAgICAgICAgXHRjdHgubW92ZVRvKG9Qb3MueCwgb1Bvcy55KTtcclxuICAgICAgICBcdGN0eC5saW5lVG8ob1Bvcy54ICsgKGNQb3MueCAtIG9Qb3MueCkqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGluZVBlcmNlbnQsIG9Qb3MueSArIChjUG9zLnkgLSBvUG9zLnkpKnRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmVQZXJjZW50KTtcclxuICAgICAgICBcdGN0eC5jbG9zZVBhdGgoKTtcclxuICAgICAgICBcdGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG4vLyBHZXRzIGEgZnJlZSBub2RlIGluIHRoaXMgYm9hcmQgKGkuZS4gbm90IHVuc29sdmVkKSByZXR1cm5zIG51bGwgaWYgbm9uZVxyXG5wLmdldEZyZWVOb2RlID0gZnVuY3Rpb24oKSB7XHJcblx0Zm9yKHZhciBpPTA7IGk8dGhpcy5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBpKyspXHJcblx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQpXHJcblx0XHRcdHJldHVybiB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTtcclxuXHRyZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gTW92ZXMgdGhpcyBib2FyZCB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5wLm1vdmVUb3dhcmRzID0gZnVuY3Rpb24ocG9pbnQsIGR0LCBzcGVlZCl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB2ZWN0b3IgdG93YXJkcyB0aGUgZ2l2ZW4gcG9pbnRcclxuXHR2YXIgdG9Qb2ludCA9IG5ldyBQb2ludChwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCwgcG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgZGlzdGFuY2Ugb2Ygc2FpZCB2ZWN0b3JcclxuXHR2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQodG9Qb2ludC54KnRvUG9pbnQueCt0b1BvaW50LnkqdG9Qb2ludC55KTtcclxuXHRcclxuXHQvLyBHZXQgdGhlIG5ldyBvZmZzZXQgb2YgdGhlIGJvYXJkIGFmdGVyIG1vdmluZyB0b3dhcmRzIHRoZSBwb2ludFxyXG5cdHZhciBuZXdPZmZzZXQgPSBuZXcgUG9pbnQoIHRoaXMuYm9hcmRPZmZzZXQueCArIHRvUG9pbnQueC9kaXN0YW5jZSpkdCpzcGVlZCxcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSArIHRvUG9pbnQueS9kaXN0YW5jZSpkdCpzcGVlZCk7XHJcblx0XHJcblx0Ly8gQ2hlY2sgaWYgcGFzc2VkIHBvaW50IG9uIHggYXhpcyBhbmQgaWYgc28gc2V0IHRvIHBvaW50J3MgeFxyXG5cdGlmKHRoaXMuYm9hcmRPZmZzZXQueCAhPXBvaW50LnggJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LngtbmV3T2Zmc2V0LngpLyhwb2ludC54LW5ld09mZnNldC54KT09TWF0aC5hYnMocG9pbnQueC10aGlzLmJvYXJkT2Zmc2V0LngpLyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBuZXdPZmZzZXQueDtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnggPSBwb2ludC54O1xyXG5cdFxyXG5cclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geSBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB5XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC55ICE9IHBvaW50LnkgJiZcclxuXHRcdE1hdGguYWJzKHBvaW50LnktbmV3T2Zmc2V0LnkpLyhwb2ludC55LW5ld09mZnNldC55KT09TWF0aC5hYnMocG9pbnQueS10aGlzLmJvYXJkT2Zmc2V0LnkpLyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkpXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBuZXdPZmZzZXQueTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmJvYXJkT2Zmc2V0LnkgPSBwb2ludC55O1xyXG59XHJcblxyXG5wLndpbmRvd0Nsb3NlZCA9IGZ1bmN0aW9uKCl7XHJcblx0Y29uc29sZS5sb2coXCJ3aW5kb3cgY2xvc2VkXCIpO1xyXG5cdC8vIGlmIGl0IGlzIGZpbGUgdHlwZVxyXG5cdGlmICh0aGlzLmxhc3RRdWVzdGlvbi5xdWVzdGlvblR5cGUgPT0gNCkge1xyXG5cdFx0Ly8gYWRkIGEgZmlsZSB0byB0aGUgZmlsZSBzeXN0ZW1cclxuXHRcdHZhciBuYW1lID0gdGhpcy5sYXN0UXVlc3Rpb24uZmlsZU5hbWU7XHJcblx0XHR2YXIgYmxvYiA9IHRoaXMubGFzdFF1ZXN0aW9uLmJsb2I7XHJcblx0XHR2YXIgbGFzdFF1ZXN0aW9uTnVtID0gdGhpcy5sYXN0UXVlc3Rpb25OdW07XHJcblx0XHRyZXR1cm4geyBcclxuXHRcdFx0YmxvYjogYmxvYiwgXHJcblx0XHRcdG51bTogbGFzdFF1ZXN0aW9uTnVtLCBcclxuXHRcdFx0ZXh0OiBuYW1lLnN1YnN0cmluZyggbmFtZS5sYXN0SW5kZXhPZihcIi5cIiksIG5hbWUubGVuZ3RoKVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYm9hcmQ7ICAgIFxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIGJ1dHRvbihzdGFydFBvc2l0aW9uLCB3aWR0aCwgaGVpZ2h0KXtcclxuICAgIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgdGhpcy5jbGlja2VkID0gZmFsc2U7XHJcbiAgICB0aGlzLmhvdmVyZWQgPSBmYWxzZTtcclxufVxyXG5idXR0b24uZHJhd0xpYiA9IHVuZGVmaW5lZDtcclxuXHJcbnZhciBwID0gYnV0dG9uLnByb3RvdHlwZTtcclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCl7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgdmFyIGNvbDtcclxuICAgIGlmKHRoaXMuaG92ZXJlZCl7XHJcbiAgICAgICAgY29sID0gXCJkb2RnZXJibHVlXCI7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGNvbCA9IFwibGlnaHRibHVlXCI7XHJcbiAgICB9XHJcbiAgICAvL2RyYXcgcm91bmRlZCBjb250YWluZXJcclxuICAgIGJvYXJkQnV0dG9uLmRyYXdMaWIucmVjdChjdHgsIHRoaXMucG9zaXRpb24ueCAtIHRoaXMud2lkdGgvMiwgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5oZWlnaHQvMiwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIGNvbCk7XHJcblxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gYnV0dG9uOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxuXHJcbi8vIENyZWF0ZXMgYSBjYXRlZ29yeSB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBmcm9tIHRoZSBnaXZlbiB4bWxcclxuZnVuY3Rpb24gQ2F0ZWdvcnkobmFtZSwgeG1sLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKXtcclxuXHRcclxuXHQvLyBTYXZlIHRoZSBuYW1lXHJcblx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcclxuXHQvLyBMb2FkIGFsbCB0aGUgcXVlc3Rpb25zXHJcblx0dmFyIHF1ZXN0aW9uRWxlbWVudHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJidXR0b25cIik7XHJcblx0dGhpcy5xdWVzdGlvbnMgPSBbXTtcclxuXHQvLyBjcmVhdGUgcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPHF1ZXN0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIFxyXG5cdHtcclxuXHRcdC8vIGNyZWF0ZSBhIHF1ZXN0aW9uIG9iamVjdFxyXG5cdFx0dGhpcy5xdWVzdGlvbnNbaV0gPSBuZXcgUXVlc3Rpb24ocXVlc3Rpb25FbGVtZW50c1tpXSwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcblx0fVxyXG4gICAgXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2F0ZWdvcnk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxuLy8gVGhlIHNpemUgb2YgdGhlIGJvYXJkIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRTaXplID0gbmV3IFBvaW50KDE5MjAsIDEwODApO1xyXG5cclxuLy9UaGUgc2l6ZSBvZiB0aGUgYm9hcmQgb3V0bGluZSBpbiBnYW1lIHVuaXRzIGF0IDEwMCUgem9vbVxyXG5tLmJvYXJkT3V0bGluZSA9IG0uYm9hcmRTaXplLnggPiBtLmJvYXJkU2l6ZS55ID8gbS5ib2FyZFNpemUueC8yMCA6IG0uYm9hcmRTaXplLnkvMjA7XHJcblxyXG4vLyBUaGUgem9vbSB2YWx1ZXMgYXQgc3RhcnQgYW5kIGVuZCBvZiBhbmltYXRpb25cclxubS5zdGFydFpvb20gPSAwLjU7XHJcbm0uZW5kWm9vbSA9IDEuNTtcclxuXHJcbi8vIFRoZSBzcGVlZCBvZiB0aGUgem9vbSBhbmltYXRpb25cclxubS56b29tU3BlZWQgPSAwLjAwMTtcclxubS56b29tTW92ZVNwZWVkID0gMC43NTtcclxuXHJcbi8vIFRoZSBzcGVlZCBvZiB0aGUgbGluZSBhbmltYXRpb25cclxubS5saW5lU3BlZWQgPSAwLjAwMjsiLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxubS5jbGVhciA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCkge1xyXG4gICAgY3R4LmNsZWFyUmVjdCh4LCB5LCB3LCBoKTtcclxufVxyXG5cclxubS5yZWN0ID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoLCBjb2wsIGNlbnRlck9yaWdpbikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBjb2w7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh4IC0gKHcgLyAyKSwgeSAtIChoIC8gMiksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLnN0cm9rZVJlY3QgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgsIGxpbmUsIGNvbCwgY2VudGVyT3JpZ2luKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gY29sO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IGxpbmU7XHJcbiAgICBpZihjZW50ZXJPcmlnaW4pe1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHggLSAodyAvIDIpLCB5IC0gKGggLyAyKSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgfVxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5saW5lID0gZnVuY3Rpb24oY3R4LCB4MSwgeTEsIHgyLCB5MiwgdGhpY2tuZXNzLCBjb2xvcikge1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oeDEsIHkxKTtcclxuICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlja25lc3M7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0uY2lyY2xlID0gZnVuY3Rpb24oY3R4LCB4LCB5LCByYWRpdXMsIGNvbG9yKXtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKHgseSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvYXJkQnV0dG9uKGN0eCwgcG9zaXRpb24sIHdpZHRoLCBoZWlnaHQsIGhvdmVyZWQpe1xyXG4gICAgLy9jdHguc2F2ZSgpO1xyXG4gICAgaWYoaG92ZXJlZCl7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZG9kZ2VyYmx1ZVwiO1xyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJsaWdodGJsdWVcIjtcclxuICAgIH1cclxuICAgIC8vZHJhdyByb3VuZGVkIGNvbnRhaW5lclxyXG4gICAgY3R4LnJlY3QocG9zaXRpb24ueCAtIHdpZHRoLzIsIHBvc2l0aW9uLnkgLSBoZWlnaHQvMiwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gNTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICAvL2N0eC5yZXN0b3JlKCk7XHJcbn0iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIENhdGVnb3J5ID0gcmVxdWlyZShcIi4vY2F0ZWdvcnkuanNcIik7XHJcbnZhciBSZXNvdXJjZSA9IHJlcXVpcmUoXCIuL3Jlc291cmNlcy5qc1wiKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG52YXIgUGFyc2VyID0gcmVxdWlyZSgnLi9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG52YXIgUXVlc3Rpb25XaW5kb3dzID0gcmVxdWlyZSgnLi9xdWVzdGlvbldpbmRvd3MuanMnKTtcclxud2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgID0gd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgfHwgd2luZG93LndlYmtpdFJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkw7XHJcblxyXG4vLyBNb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG52YXIgYmFzZVVSTCA9IGxvY2FsU3RvcmFnZVsnY2FzZUZpbGVzJ107XHJcblxyXG52YXIgZmlsZVN5c3RlbSA9IG51bGw7XHJcblxyXG52YXIgYmFzZURpciA9IG51bGw7XHJcblxyXG52YXIgYWRkRmlsZURhdGEgPSB7IGZpbGVuYW1lOiBcIlwiLCBibG9iOiBcIlwiLCBjYWxsYmFjazogdW5kZWZpbmVkfTtcclxuXHJcbi8vIHN0b3JlcyBhbiBhcnJheSBvZiBhbGwgdGhlIGZpbGVzIGZvciByZXppcHBpbmdcclxudmFyIGFsbEVudHJpZXM7XHJcblxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIExPQURJTkcgKioqKioqKioqKioqKioqKioqKioqKioqXHJcblxyXG4vLyBsb2FkIHRoZSBmaWxlIGVudHJ5IGFuZCBwYXJzZSB0aGUgeG1sXHJcbm0ubG9hZENhc2UgPSBmdW5jdGlvbih1cmwsIHdpbmRvd0RpdiwgY2FsbGJhY2spIHtcclxuICAgIFxyXG4gICAgdGhpcy5jYXRlZ29yaWVzID0gW107XHJcbiAgICB0aGlzLnF1ZXN0aW9ucyA9IFtdO1xyXG4gICAgXHJcbiAgICAvLyBMb2FkIHRoZSBxdWVzdGlvbiB3aW5kb3dzIGZpcnN0XHJcbiAgICB2YXIgd2luZG93cyA9IG5ldyBRdWVzdGlvbldpbmRvd3MoZnVuY3Rpb24oKXtcclxuICAgIFx0Ly8gZ2V0IFhNTFxyXG4gICAgICAgIHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMKHVybCsnYWN0aXZlL2Nhc2VGaWxlLmlwYXJkYXRhJywgZnVuY3Rpb24oZmlsZUVudHJ5KSB7XHJcbiAgICBcdFx0ZmlsZUVudHJ5LmZpbGUoZnVuY3Rpb24oZmlsZSkge1xyXG4gICAgXHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICBcdFx0XHRcclxuICAgIFx0XHRcdC8vIGhvb2sgdXAgY2FsbGJhY2tcclxuICAgIFx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgICBcdFx0XHRcdC8vIEdldCB0aGUgcmF3IGRhdGFcclxuICAgIFx0XHRcdFx0dmFyIHJhd0RhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKHRoaXMucmVzdWx0KTtcclxuICAgIFx0XHRcdFx0dmFyIGNhdGVnb3JpZXMgPSBQYXJzZXIuZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyhyYXdEYXRhLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcbiAgICBcdFx0XHRcdC8vIGxvYWQgdGhlIG1vc3QgcmVjZW50IHZlcnNpb25cclxuICAgIFx0XHRcdFx0dmFyIGF1dG9zYXZlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhdXRvc2F2ZVwiKTtcclxuICAgIFx0XHRcdFx0aWYgKGF1dG9zYXZlKSB7XHJcbiAgICBcdFx0XHRcdFx0bG9hZEF1dG9zYXZlKGF1dG9zYXZlLCBjYXRlZ29yaWVzLCBjYWxsYmFjayk7XHJcbiAgICBcdFx0XHRcdH0gZWxzZSB7XHJcbiAgICBcdFx0XHRcdFx0bG9hZFNhdmVQcm9ncmVzcyhjYXRlZ29yaWVzLCB1cmwsIHdpbmRvd0RpdiwgY2FsbGJhY2spO1xyXG4gICAgXHRcdFx0XHR9XHJcbiAgICBcdFx0XHRcdC8vIHByZXBhcmUgZm9yIHNhdmluZyBieSByZWFkaW5nIHRoZSBmaWxlcyByaWdodCB3aGVuIHRoZSBwcm9ncmFtIHN0YXJ0c1xyXG4gICAgXHRcdFx0ICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCAxMDI0KjEwMjQsIHJlY3Vyc2l2ZWx5UmVhZEZpbGVzLCBlcnJvckhhbmRsZXIpO1xyXG4gICAgXHRcdFx0fTtcclxuICAgIFx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xyXG4gICAgXHRcdCAgIFxyXG4gICAgXHRcdH0sIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRcdFx0Y29uc29sZS5sb2coXCJFcnJvcjogXCIrZS5tZXNzYWdlKTtcclxuICAgIFx0XHR9KTtcclxuICAgIFx0fSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuLy8gbG9hZCB0aGUgc2F2ZSBmcm9tIHRoZSBmaWxlc3l0ZW0gc2FuZGJveFxyXG5mdW5jdGlvbiBsb2FkU2F2ZVByb2dyZXNzKGNhdGVnb3JpZXMsIHVybCwgd2luZG93RGl2LCBjYWxsYmFjaykge1xyXG4gICAgdmFyIHF1ZXN0aW9ucyA9IFtdO1xyXG4gICAgXHJcblx0Ly8gZ2V0IFhNTFxyXG4gICAgd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwodXJsKydhY3RpdmUvc2F2ZUZpbGUuaXBhcmRhdGEnLCBmdW5jdGlvbihmaWxlRW50cnkpIHtcclxuXHRcdGZpbGVFbnRyeS5maWxlKGZ1bmN0aW9uKGZpbGUpIHtcclxuXHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBob29rIHVwIGNhbGxiYWNrXHJcblx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHRoZSBzYXZlIGRhdGFcclxuXHRcdFx0XHR2YXIgc2F2ZURhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKHRoaXMucmVzdWx0KTtcclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgc2F2ZSBkYXRhXHJcblx0XHRcdFx0UGFyc2VyLmFzc2lnblF1ZXN0aW9uU3RhdGVzKGNhdGVnb3JpZXMsIHNhdmVEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25cIikpO1xyXG5cdFx0XHRcdC8vIHByb2dyZXNzXHJcblx0XHRcdFx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0XHRcdFx0Ly8gY2FsbGJhY2sgd2l0aCByZXN1bHRzXHJcblx0XHRcdFx0Y2FsbGJhY2soY2F0ZWdvcmllcywgc3RhZ2UpOyAvLyBtYXliZSBzdGFnZSArIDEgd291bGQgYmUgYmV0dGVyIGJlY2F1c2UgdGhleSBhcmUgbm90IHplcm8gaW5kZXhlZD9cclxuXHRcdFx0ICAgXHJcblx0XHRcdH07XHJcblx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xyXG5cdFx0ICAgXHJcblx0XHR9LCBmdW5jdGlvbihlKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJFcnJvcjogXCIrZS5tZXNzYWdlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59XHJcblxyXG4vLyBsb2FkIHRoZSBzYXZlIGZyb20gdGhlIGxvY2FsU3RvcmFnZVxyXG5mdW5jdGlvbiBsb2FkQXV0b3NhdmUoYXV0b3NhdmUsIGNhdGVnb3JpZXMsIGNhbGxiYWNrKSB7XHJcblx0Ly8gR2V0IHRoZSBzYXZlIGRhdGFcclxuXHR2YXIgc2F2ZURhdGEgPSBVdGlsaXRpZXMuZ2V0WG1sKGF1dG9zYXZlKTtcclxuXHRQYXJzZXIuYXNzaWduUXVlc3Rpb25TdGF0ZXMoY2F0ZWdvcmllcywgc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblwiKSk7XHJcblx0dmFyIHN0YWdlID0gc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXNlXCIpWzBdLmdldEF0dHJpYnV0ZShcImNhc2VTdGF0dXNcIik7XHJcblx0Y2FsbGJhY2soY2F0ZWdvcmllcywgc3RhZ2UpO1xyXG59XHJcblxyXG5cdFx0XHRcdFx0IFxyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqIFNBVklORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8qIGhlcmUncyB0aGUgZ2VuZXJhbCBvdXRsaW5lIG9mIHdoYXQgaXMgaGFwcGVuaW5nOlxyXG5zZWxlY3RTYXZlTG9jYXRpb24gd2FzIHRoZSBvbGQgd2F5IG9mIGRvaW5nIHRoaW5nc1xyXG5ub3cgd2UgdXNlIGNyZWF0ZVppcFxyXG4gLSB3aGVuIHRoaXMgd2hvbGUgdGhpbmcgc3RhcnRzLCB3ZSByZXF1ZXN0IGEgZmlsZSBzeXN0ZW0gYW5kIHNhdmUgYWxsIHRoZSBlbnRyaWVzIChkaXJlY3RvcmllcyBhbmQgZmlsZXMpIHRvIHRoZSBhbGxFbnRyaWVzIHZhcmlhYmxlXHJcbiAtIHRoZW4gd2UgZ2V0IHRoZSBibG9icyB1c2luZyByZWFkQXNCaW5hcnlTdHJpbmcgYW5kIHN0b3JlIHRob3NlIGluIGFuIGFycmF5IHdoZW4gd2UgYXJlIHNhdmluZyBcclxuICAtIC0gY291bGQgZG8gdGhhdCBvbiBwYWdlIGxvYWQgdG8gc2F2ZSB0aW1lIGxhdGVyLi4/XHJcbiAtIGFueXdheSwgdGhlbiB3ZSAtIGluIHRoZW9yeSAtIHRha2UgdGhlIGJsb2JzIGFuZCB1c2UgemlwLmZpbGUoZW50cnkubmFtZSwgYmxvYikgdG8gcmVjcmVhdGUgdGhlIHN0cnVjdHVyZVxyXG4gLSBhbmQgZmluYWxseSB3ZSBkb3dubG9hZCB0aGUgemlwIHdpdGggZG93bmxvYWQoKVxyXG4gXHJcbiovXHJcblxyXG4vLyBjYWxsZWQgd2hlbiB0aGUgZ2FtZSBpcyBsb2FkZWQsIGFkZCBvbmNsaWNrIHRvIHNhdmUgYnV0dG9uIHRoYXQgYWN0dWFsbHkgZG9lcyB0aGUgc2F2aW5nXHJcbm0ucHJlcGFyZVppcCA9IGZ1bmN0aW9uKG15Qm9hcmRzKSB7XHJcblx0Ly92YXIgY29udGVudCA9IHppcC5nZW5lcmF0ZSgpO1xyXG5cdFxyXG5cdGNvbnNvbGUubG9nKFwicHJlcGFyZSB6aXBcIik7XHJcblx0XHJcblx0Ly8gY29kZSBmcm9tIEpTWmlwIHNpdGVcclxuXHR2YXIgYmxvYkxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmxvYicpO1xyXG5cdGlmIChKU1ppcC5zdXBwb3J0LmJsb2IpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwic3VwcG9ydHMgYmxvYlwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gbGluayBkb3dubG9hZCB0byBjbGlja1xyXG5cdFx0YmxvYkxpbmsub25jbGljayA9IGZ1bmN0aW9uKCkgeyBzYXZlSVBBUihteUJvYXJkcyk7IH07XHJcbiAgXHR9XHJcbn1cclxuXHJcbi8vIGNyZWF0ZSBJUEFSIGZpbGUgYW5kIGRvd25sb2FkIGl0XHJcbmZ1bmN0aW9uIHNhdmVJUEFSKGJvYXJkcykge1xyXG5cclxuXHQvLyBlcnJvciBoYW5kbGluZ1xyXG5cdGlmICghYWxsRW50cmllcykge1xyXG5cdFx0YWxlcnQoXCJDQU5OT1QgU0FWRTogZmlsZSBkYXRhIGRpZCBub3QgbG9hZFwiKTsgcmV0dXJuOyBcclxuXHR9XHJcblx0Ly8gMSlcclxuXHQvLyBnZXQgdGhlIGZpbGVzIHRoYXQgdGhlIHVzZXIgdXBsb2FkZWQgXHJcblx0dmFyIHVwbG9hZGVkRmlsZXMgPSBnZXRBbGxTdWJtaXNzaW9ucyhib2FyZHMpO1xyXG5cdFxyXG5cdC8vIDIpXHJcblx0Ly8gY3JlYXRlIHRoZSBjYXNlIGZpbGUgbGlrZSB0aGUgb25lIHdlIGxvYWRlZFxyXG5cdHZhciBjYXNlRmlsZSA9IFBhcnNlci5yZWNyZWF0ZUNhc2VGaWxlKGJvYXJkcyk7XHJcblx0XHJcblx0Ly8gMykgKEFTWU5DKVxyXG5cdC8vIHJlY3JlYXRlIHRoZSBJUEFSIGZpbGUgdXNpbmcgRmlsZVN5c3RlbSwgdGhlbiBkb3dubG9hZCBpdFxyXG5cdGdldEFsbENvbnRlbnRzKGNhc2VGaWxlLCB1cGxvYWRlZEZpbGVzKTtcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlWmlwKGRhdGEsIGJsb2JzLCBuYW1lcywgc3Vicykge1xyXG5cdGNvbnNvbGUubG9nKFwiY3JlYXRlIHppcCBydW5cIik7XHJcblx0XHJcblx0dmFyIHppcCA9IG5ldyBKU1ppcCgpO1xyXG5cclxuXHQvLyB6aXAgZWFjaCBmaWxlIG9uZSBieSBvbmVcclxuXHRibG9icy5mb3JFYWNoKGZ1bmN0aW9uKGJsb2IsaSkge1xyXG5cdFx0emlwLmZpbGUobmFtZXNbaV0sYmxvYik7XHJcblx0fSk7XHJcblx0Ly8gemlwIHN1Ym1pdHRlZCBmaWxlc1xyXG5cdHN1YnMubmFtZXMuZm9yRWFjaChmdW5jdGlvbihzdWJOYW1lLGkpIHtcclxuXHRcdHppcC5maWxlKFwiY2FzZVxcXFxhY3RpdmVcXFxcc3VibWl0dGVkXFxcXFwiK3N1Yk5hbWUsc3Vicy5ibG9ic1tpXSk7XHJcblx0fSk7XHJcblx0XHJcblx0Ly8gYmFja3NsYXNoZXMgcGVyIHppcCBmaWxlIHByb3RvY29sXHJcblx0emlwLmZpbGUoXCJjYXNlXFxcXGFjdGl2ZVxcXFxzYXZlRmlsZS5pcGFyZGF0YVwiLGRhdGEpO1xyXG5cdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0ZG93bmxvYWQoemlwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWxsU3VibWlzc2lvbnMoYm9hcmRzKSB7XHJcblx0dmFyIG5hbWVzID0gW107XHJcblx0dmFyIGJsb2JzID0gW107XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBhZGQgYmxvYnMgdG8gYW4gYXJyYXlcclxuXHRcdFx0aWYgKHEuZmlsZU5hbWUgJiYgcS5ibG9iKSB7XHJcblx0XHRcdFx0bmFtZXMucHVzaChxLmZpbGVOYW1lKTtcclxuXHRcdFx0XHRibG9icy5wdXNoKHEuYmxvYik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0Ly8gcmV0dXJuIHN1Ym1pc3Npb25zIG9iamVjdCBcclxuXHRyZXR1cm4ge1xyXG5cdFx0XCJuYW1lc1wiIDogbmFtZXMsXHJcblx0XHRcImJsb2JzXCIgOiBibG9ic1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWxsQ29udGVudHMoZGF0YSwgc3Vicykge1xyXG5cdHZhciBibG9icyA9IFtdO1xyXG5cdHZhciBuYW1lcyA9IFtdO1xyXG5cdHZhciBmaWxlQ291bnQgPSAwO1xyXG5cdGFsbEVudHJpZXMuZm9yRWFjaChmdW5jdGlvbihmaWxlRW50cnkpIHtcclxuXHRcdC8vemlwLmZpbGUoZmlsZUVudHJ5Lm5hbWUsZmlsZUVudHJ5XHJcblx0XHRpZiAoZmlsZUVudHJ5LmlzRmlsZSkge1xyXG5cdFx0XHRmaWxlQ291bnQrK1xyXG5cdFx0XHQvLyBHZXQgYSBGaWxlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGZpbGUsXHJcblx0XHRcdC8vIHRoZW4gdXNlIEZpbGVSZWFkZXIgdG8gcmVhZCBpdHMgY29udGVudHMuXHJcblx0XHRcdC8vY29uc29sZS5sb2coZmlsZUVudHJ5KTtcclxuXHRcdFx0ZmlsZUVudHJ5LmZpbGUoZnVuY3Rpb24oZmlsZSkge1xyXG5cdFx0XHQgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcblx0XHRcdCAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRcdCAgIFxyXG5cdFx0XHQgICBcdFx0dmFyIGFycmF5QnVmZmVyVmlldyA9IG5ldyBVaW50OEFycmF5KCB0aGlzLnJlc3VsdCApOyAvLyBmaW5nZXJzIGNyb3NzZWRcclxuXHRcdFx0ICAgXHRcdC8vY29uc29sZS5sb2coYXJyYXlCdWZmZXJWaWV3KTtcclxuXHRcdFx0ICAgXHRcdFxyXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh0aGlzLnJlc3VsdCk7XHJcblx0XHRcdFx0IFx0YmxvYnMucHVzaChhcnJheUJ1ZmZlclZpZXcpO1xyXG5cdFx0XHRcdCBcdG5hbWVzLnB1c2goZmlsZUVudHJ5LmZ1bGxQYXRoLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFwvJywnZycpLCdcXFxcJykuc3Vic3RyaW5nKDEpKTtcclxuXHRcdFx0XHQgXHRpZiAoYmxvYnMubGVuZ3RoID09IGZpbGVDb3VudCkge1xyXG5cdFx0XHRcdCBcdFx0Y3JlYXRlWmlwKGRhdGEsYmxvYnMsbmFtZXMsc3Vicyk7XHJcblx0XHRcdFx0IFx0fVxyXG5cdFx0XHQgICB9O1xyXG5cclxuXHRcdFx0ICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xyXG5cdFx0XHR9LCBlcnJvckhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkb3dubG9hZCh6aXApIHtcclxuXHRjb25zb2xlLmxvZyhcImRvd25sb2FkaW5nXCIpO1xyXG5cdGNvbnNvbGUubG9nKHppcC5nZW5lcmF0ZUFzeW5jKTtcclxuXHRcclxuXHR2YXIgY29udGVudCA9IHppcC5nZW5lcmF0ZUFzeW5jKHt0eXBlOlwiYmxvYlwifSkudGhlbihcclxuXHRmdW5jdGlvbiAoYmxvYikge1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhibG9iKTtcclxuXHRcdC8vc2F2ZUFzKGJsb2IsIFwiaGVsbG8uemlwXCIpO1xyXG5cdFx0Ly92YXIgdXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcblx0XHQvL3dpbmRvdy5sb2NhdGlvbi5hc3NpZ24odXJsKTtcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRcclxuXHRcdHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcblx0XHRcclxuXHRcdGEuaW5uZXJIVE1MID0gbG9jYWxTdG9yYWdlWydjYXNlTmFtZSddO1xyXG5cdFx0XHJcblx0XHRhLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJkb3dubG9hZExpbmtcIik7XHJcblx0XHRcclxuXHRcdGEuaHJlZiA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG5cdFx0XHJcblx0XHRhLmRvd25sb2FkID0gbG9jYWxTdG9yYWdlW1wiY2FzZU5hbWVcIl07XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIHNob3dMaW5rID0gZmFsc2U7XHJcblx0XHQvLyBpZiB5b3Ugc2hvdyB0aGUgbGluaywgdGhlIHVzZXIgY2FuIGRvd25sb2FkIHRvIGEgbG9jYXRpb24gb2YgdGhlaXIgY2hvaWNlXHJcblx0XHRpZiAoc2hvd0xpbmspIHtcclxuXHRcdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcclxuXHRcdC8vIGlmIHlvdSBoaWRlIHRoZSBsaW5rLCBpdCB3aWxsIHNpbXBseSBnbyB0byB0aGVpciBkb3dubG9hZHMgZm9sZGVyXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhLmNsaWNrKCk7IC8vZG93bmxvYWQgaW1tZWRpYXRlbHlcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0XHJcblxyXG5cdH0sIGZ1bmN0aW9uIChlcnIpIHtcclxuXHRcdGJsb2JMaW5rLmlubmVySFRNTCArPSBcIiBcIiArIGVycjtcclxuXHR9KTtcclxufVxyXG5cclxuXHJcbi8qKioqKioqKioqKioqIFJFQUQgRklMRVMgKioqKioqKioqKioqKiovXHJcblxyXG5mdW5jdGlvbiBlcnJvckhhbmRsZXIoKSB7XHJcblx0Ly9kbyBub3RoaW5nXHJcblx0Y29uc29sZS5sb2coXCJ5byB3ZSBnb3QgZXJyb3JzXCIpO1xyXG59XHJcblxyXG4vLyBoZWxwZXIgZnVuY3Rpb24gZm9yIHJlY3Vyc2l2ZWx5UmVhZEZpbGVzXHJcbmZ1bmN0aW9uIHRvQXJyYXkobGlzdCkge1xyXG5cdHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChsaXN0IHx8IFtdLCAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVjdXJzaXZlbHlSZWFkRmlsZXMoZnMpIHtcclxuXHRjb25zb2xlLmxvZyhcInJlY3Vyc2l2ZWx5UmVhZEZpbGVzIGNhbGxlZFwiKTtcclxuXHRcclxuXHRmaWxlU3lzdGVtID0gZnM7XHJcblxyXG4gIHZhciBkaXJSZWFkZXIgPSBmcy5yb290LmNyZWF0ZVJlYWRlcigpO1xyXG4gIHZhciBlbnRyaWVzID0gW107XHJcblxyXG4gIC8vIENhbGwgdGhlIHJlYWRlci5yZWFkRW50cmllcygpIHVudGlsIG5vIG1vcmUgcmVzdWx0cyBhcmUgcmV0dXJuZWQuXHJcbiAgdmFyIHJlYWRFbnRyaWVzID0gZnVuY3Rpb24ocmVhZGVyKSB7XHJcbiAgICAgcmVhZGVyLnJlYWRFbnRyaWVzIChmdW5jdGlvbihyZXN1bHRzKSB7XHJcbiAgICAgIGlmICghcmVzdWx0cy5sZW5ndGgpIHtcclxuICAgICAgICAvLyBhbGwgZW50cmllcyBmb3VuZFxyXG4gICAgICAgIHNhdmVFbnRyaWVzKGVudHJpZXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICBcdHZhciByZXN1bHRzQXJyYXkgPSB0b0FycmF5KHJlc3VsdHMpXHJcbiAgICAgICAgZW50cmllcyA9IGVudHJpZXMuY29uY2F0KHJlc3VsdHNBcnJheSk7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHJlc3VsdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIFx0Ly9jb25zb2xlLmxvZyhcImlzIGRpcmVjdG9yeSA/IFwiICsgcmVzdWx0c0FycmF5W2ldLmlzRGlyZWN0b3J5KTtcclxuICAgICAgICBcdGlmIChyZXN1bHRzQXJyYXlbaV0uaXNEaXJlY3RvcnkpIHtcclxuICAgICAgICBcdFx0Ly9kaXJlY3RvcnlTdHJpbmcgKz0gcmVzdWx0c0FycmF5W2ldLlxyXG4gICAgICAgIFx0XHR2YXIgcmVjdXJzaXZlUmVhZGVyID0gcmVzdWx0c0FycmF5W2ldLmNyZWF0ZVJlYWRlcigpO1xyXG4gICAgICAgIFx0XHRyZWFkRW50cmllcyhyZWN1cnNpdmVSZWFkZXIpO1xyXG4gICAgICAgIFx0fSBlbHNlIHtcclxuICAgICAgICBcdFx0XHJcbiAgICAgICAgXHR9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vbmFtZVN0cnVjdHVyZSA9IHt9O1xyXG4gICAgICAgIHJlYWRFbnRyaWVzKHJlYWRlcik7XHJcbiAgICAgIH1cclxuICAgIH0sIGVycm9ySGFuZGxlcik7XHJcbiAgfTtcclxuICBcclxuICBcclxuXHJcbiAgcmVhZEVudHJpZXMoZGlyUmVhZGVyKTsgLy8gU3RhcnQgcmVhZGluZyBkaXJzLlxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gc2F2ZUVudHJpZXMoZW50cmllcywgY2FsbGJhY2spIHtcclxuXHRhbGxFbnRyaWVzID0gZW50cmllcztcclxuXHQvL2NvbnNvbGUubG9nKGFsbEVudHJpZXMpO1xyXG5cdGlmIChjYWxsYmFjaykgY2FsbGJhY2soYWxsRW50cmllcyk7XHJcbn1cclxuXHJcbi8qKioqKioqKioqKioqKioqKiBDQUNISU5HICoqKioqKioqKioqKioqKioqKiovXHJcblxyXG5tLmFkZEZpbGVUb1N5c3RlbSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBkYXRhLCBjYWxsYmFjayl7XHJcblxyXG5cdGNvbnNvbGUubG9nKFwiZnM6IFwiICsgZmlsZVN5c3RlbS5yb290KTtcclxuXHRcclxuXHRpZiAoIWZpbGVTeXN0ZW0pIHtcclxuXHRcdHJldHJpZXZlRmlsZVN5c3RlbShmdW5jdGlvbigpIHsgbS5hZGRGaWxlVG9TeXN0ZW0oZmlsZW5hbWUsIGRhdGEsIGNhbGxiYWNrKTsgfSk7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSB0aGUgZGlyIGV4aXN0cyBmaXJzdFxyXG5cdHZhciBkaXJzID0gZmlsZW5hbWUuc3Vic3RyKDAsIGZpbGVuYW1lLmxhc3RJbmRleE9mKCdcXFxcJykpLnNwbGl0KCdcXFxcJyk7XHJcblx0dmFyIGN1ckRpciA9IGZpbGVTeXN0ZW0ucm9vdDtcclxuXHRmb3IodmFyIGk9MDtpPGRpcnMubGVuZ3RoO2krKykge1xyXG5cdFx0Y29uc29sZS5sb2coY3VyRGlyLmdldERpcmVjdG9yeShkaXJzW2ldKSk7IFxyXG5cdFx0Y3VyRGlyID0gY3VyRGlyLmdldERpcmVjdG9yeShkaXJzW2ldLCB7Y3JlYXRlOiB0cnVlLCBleGNsdXNpdmU6IGZhbHNlfSk7XHJcblx0fVxyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSBub3Qgd29ya2luZyB3aXRoIGFuIGVtcHR5IGRpcmVjdG9yeVxyXG5cdGlmKGZpbGVuYW1lLmVuZHNXaXRoKCdcXFxcJykpXHJcblx0XHRyZXR1cm47XHJcblxyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgZmlsZVxyXG5cdHZhciBmaWxlID0gY3VyRGlyLmdldEZpbGUoZmlsZW5hbWUuc3Vic3RyKGZpbGVuYW1lLmxhc3RJbmRleE9mKCdcXFxcJykrMSksIHtjcmVhdGU6IHRydWV9KTtcclxuXHQvL2ZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUobmV3IEJsb2IoW2RhdGFdLCB7dHlwZTogZ2V0TWltZVR5cGUoZmlsZW5hbWUpfSkpO1xyXG5cdC8vIGRhdGEgaXMgYSBibG9iIGluIHRoaXMgY2FzZVxyXG5cdGZpbGUuY3JlYXRlV3JpdGVyKCkud3JpdGUoZGF0YSk7XHJcblx0XHJcblx0Ly8gUmV0dXJuIHRoZSB1cmwgdG8gdGhlIGZpbGVcclxuXHRpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCBmaWxlLnRvVVJMKCkgKTtcclxufVxyXG5cclxuLy8gZmlsZW5hbWUgbXVzdCBiZSB0aGUgZnVsbCBkZXNpcmVkIHBhdGggZm9yIHRoaXMgdG8gd29ya1xyXG5tLmFkZE5ld0ZpbGVUb1N5c3RlbSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBkYXRhLCBjYWxsYmFjayl7XHJcblx0Ly8gaWYgdGhlIHBhdGggdXNlcyBiYWNrc2xhc2hlc1xyXG5cdGlmIChmaWxlbmFtZS5pbmRleE9mKFwiXFxcXFwiKSA+IC0xKSBcclxuXHRcdGZpbGVuYW1lID0gVXRpbGl0aWVzLnJlcGxhY2VBbGwoZmlsZW5hbWUsXCJcXFxcXCIsXCIvXCIpO1xyXG5cdC8vIGlmIHRoZXJlIGlzIG5vIHBhdGhcclxuXHRpZiAoZmlsZW5hbWUuaW5kZXhPZihcIi9cIikgPCAwKSBmaWxlbmFtZSA9IFwiY2FzZS9hY3RpdmUvc3VibWl0dGVkL1wiK2ZpbGVuYW1lO1xyXG5cdFxyXG5cdC8vIHN0b3JlIHRoZSBkYXRhIGluIGFuIG1vZHVsZS1zY29wZSBvYmplY3Qgc28gdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9ucyBjYW4gbWFrZSB1c2Ugb2YgaXRcclxuXHRhZGRGaWxlRGF0YS5maWxlbmFtZSA9IGZpbGVuYW1lO1xyXG5cdGFkZEZpbGVEYXRhLmRhdGEgPSBkYXRhO1xyXG5cdGFkZEZpbGVEYXRhLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImFkZEZpbGVUb1N5c3RlbShcIitmaWxlbmFtZStcIiwgXCIrZGF0YStcIiwgXCIrY2FsbGJhY2srXCIpXCIpO1xyXG5cdC8vcmV0cmlldmVCYXNlRGlyKGZ1bmN0aW9uKGRpcikgeyBhZGRGaWxlVG9EaXIoZmlsZW5hbWUsIGRpciwgY2FsbGJhY2spOyB9ICk7XHJcblx0XHJcblx0Ly8gZmluZCB0aGUgZGlyZWN0b3J5RW50cnkgdGhhdCB3aWxsIGNvbnRhaW4gdGhlIGZpbGUgYW5kIGNhbGwgYWRkRmlsZVRvRGlyIHdpdGggdGhlIHJlc3VsdFxyXG5cdHJldHJpZXZlQm90dG9tRGlyKGFkZEZpbGVUb0Rpcik7XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIGRpcmVjdG9yeSBvZiBpbnRlcmVzdFxyXG5mdW5jdGlvbiByZXRyaWV2ZUJvdHRvbURpcihjYWxsYmFjaykge1xyXG5cdC8vd2luZG93LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDEwMjQqMTAyNCwgZnVuY3Rpb24oZnMpIHsgc2V0RmlsZVN5c3RlbShmcywgY2FsbGJhY2spOyB9LCBlcnJvckhhbmRsZXIpO1xyXG5cdGNvbnNvbGUubG9nKFwiYmFzZSBVUkw6IFwiICsgYmFzZVVSTCk7XHJcblx0dmFyIG5hbWUgPSBhZGRGaWxlRGF0YS5maWxlbmFtZTtcclxuXHQvLyBleHRyYWN0IHRoZSBwYXRoIG9mIHRoZSBkaXJlY3RvcnkgdG8gcHV0IHRoZSBmaWxlIGluIGZyb20gdGhlIGZpbGUgbmFtZVxyXG5cdHZhciBleHRlbnNpb24gPSBuYW1lLnN1YnN0cmluZygwLG5hbWUubGFzdEluZGV4T2YoXCIvXCIpKTtcclxuXHQvLyBcImNhc2VcIiBpcyBhbHJlYWR5IHBhcnQgb2YgdGhlIGJhc2UgdXJsXHJcblx0aWYgKGV4dGVuc2lvbi5pbmRleE9mKFwiY2FzZS9cIikgPiAtMSkge1xyXG5cdFx0ZXh0ZW5zaW9uID0gZXh0ZW5zaW9uLnN1YnN0cmluZyg1KTtcclxuXHR9XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImV4dDogXCIgKyBleHRlbnNpb24pO1xyXG5cdFxyXG5cdC8vIGdldCB0aGUgZGlyZWN0b3J5IGVudHJ5IGZyb20gdGhlIGZpbGVzeXN0ZW0gY2FsbGJhY2tcclxuXHR3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTChiYXNlVVJMK2V4dGVuc2lvbiwgY2FsbGJhY2spO1xyXG59XHJcblxyXG4vLyBhZGQgdGhlIGZpbGVcclxuZnVuY3Rpb24gYWRkRmlsZVRvRGlyKGRpcikge1xyXG5cclxuXHQvLyBzaG9ydGhhbmRcclxuXHR2YXIgZmlsZW5hbWUgPSBhZGRGaWxlRGF0YS5maWxlbmFtZTtcclxuXHRcclxuXHQvLyBkZWJ1Z1xyXG5cdGNvbnNvbGUubG9nKFwiYWRkRmlsZVRvRGlyKFwiK2ZpbGVuYW1lK1wiLCBcIitkaXIrXCIpXCIpO1xyXG5cdFxyXG5cdC8vIHJlbGljIGZyb20gbGVnYWN5IGNvZGVcclxuXHR2YXIgY3VyRGlyID0gZGlyO1xyXG5cdFxyXG5cdC8vIGRlYnVnXHJcblx0Y29uc29sZS5sb2coXCJjdXJkaXI6IFwiICArIGN1ckRpci5uYW1lKTtcclxuXHRcclxuXHQvLyBNYWtlIHN1cmUgbm90IHdvcmtpbmcgd2l0aCBhbiBlbXB0eSBkaXJlY3RvcnlcclxuXHRpZihmaWxlbmFtZS5lbmRzV2l0aCgnXFxcXCcpKVxyXG5cdFx0cmV0dXJuO1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIGZpbGVcclxuXHR2YXIgZmlsZSA9IGN1ckRpci5nZXRGaWxlKGZpbGVuYW1lLnN1YnN0cihmaWxlbmFtZS5sYXN0SW5kZXhPZignLycpKzEpLCB7Y3JlYXRlOiB0cnVlfSwgY3JlYXRlV3JpdGVyKTtcclxuXHRcclxuXHRcclxuXHQvL3ZhciBmaWxlID0gY3VyRGlyLmdldEZpbGUoZmlsZW5hbWUsIHtjcmVhdGU6IHRydWV9LCBjcmVhdGVXcml0ZXIpOyAvLyBmdW5jdGlvbihmaWxlRW50cnkpIHsgd3JpdGVGaWxlKGZpbGVFbnRyeSwgY2FsbGJhY2spOyB9KTtcclxuXHQvKmNvbnNvbGUubG9nKGZpbGUpO1xyXG5cdC8vZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiBnZXRNaW1lVHlwZShmaWxlbmFtZSl9KSk7XHJcblx0Ly8gZGF0YSBpcyBhIGJsb2IgaW4gdGhpcyBjYXNlXHJcblx0ZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShkYXRhKTtcclxuXHRcclxuXHQvLyBSZXR1cm4gdGhlIHVybCB0byB0aGUgZmlsZVxyXG5cdGlmIChjYWxsYmFjaykgY2FsbGJhY2soIGZpbGUudG9VUkwoKSApO1xyXG5cclxuXHRjYWxsYmFjayggZmlsZS50b1VSTCgpICk7Ki9cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV3JpdGVyKGZpbGUpIHtcclxuXHRjb25zb2xlLmxvZyhmaWxlKTtcclxuXHRmaWxlLmNyZWF0ZVdyaXRlcih3cml0ZUZpbGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpbGUoZmlsZVdyaXRlcikge1xyXG5cdGNvbnNvbGUubG9nKGZpbGVXcml0ZXIpO1xyXG5cdGZpbGVXcml0ZXIub253cml0ZWVuZCA9IGZ1bmN0aW9uIChlKSB7IGNvbnNvbGUubG9nKFwid3JpdGUgY29tcGxldGVkXCIpOyB9XHJcblx0ZmlsZVdyaXRlci5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHsgY29uc29sZS5sb2coXCJ3cml0ZXIgZXJyb3I6IFwiICsgZS50b1N0cmluZygpKTsgfVxyXG5cdC8vZmlsZVdyaXRlci53cml0ZShuZXcgQmxvYihbYWRkRmlsZURhdGEuZGF0YV0sIHt0eXBlOiBnZXRNaW1lVHlwZShhZGRGaWxlRGF0YS5maWxlbmFtZSl9KSk7XHJcblx0Ly8gZGF0YSBpcyBhIGJsb2IgaW4gdGhpcyBjYXNlXHJcblx0ZmlsZVdyaXRlci53cml0ZShhZGRGaWxlRGF0YS5kYXRhKTtcclxuXHRcclxuXHQvLyBSZXR1cm4gdGhlIHVybCB0byB0aGUgZmlsZVxyXG5cdGlmIChhZGRGaWxlRGF0YS5jYWxsYmFjaykgY2FsbGJhY2soIGZpbGUudG9VUkwoKSApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRCYXNlKGVudHJ5LCBjYWxsYmFjaykge1xyXG5cdGJhc2VEaXIgPSBlbnRyeTtcclxuXHRjYWxsYmFjaygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRmlsZVN5c3RlbSh0eXBlLCBzaXplLCBjdXJDYXNlKXtcclxuXHQvLyBMb2FkIHRoZSBmaWxlIHN5c3RlbVxyXG5cdGZpbGVTeXN0ZW0gPSBzZWxmLnJlcXVlc3RGaWxlU3lzdGVtU3luYyh0eXBlLCBzaXplKTtcclxuXHRcclxuXHQvLyBXcml0ZSB0aGUgZmlsZXNcclxuXHR2YXIgdXJscyA9IHt9O1xyXG5cdGZvciAodmFyIGZpbGUgaW4gY3VyQ2FzZS5maWxlcykge1xyXG5cdFx0aWYgKCFjdXJDYXNlLmZpbGVzLmhhc093blByb3BlcnR5KGZpbGUpKSBjb250aW51ZTtcclxuXHRcdHVybHNbZmlsZV0gPSBhZGRGaWxlVG9TeXN0ZW0oZmlsZSwgY3VyQ2FzZS5maWxlKGZpbGUpLmFzQXJyYXlCdWZmZXIoKSwgZmlsZVN5c3RlbSk7XHJcblx0fVxyXG5cdFxyXG5cdC8vIHJldHVybiB0aGUgdXJscyB0byB0aGUgZmlsZXNcclxuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodXJscyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1pbWVUeXBlKGZpbGUpe1xyXG5cdHN3aXRjaChmaWxlLnN1YnN0cihmaWxlLmxhc3RJbmRleE9mKCcuJykrMSkpe1xyXG5cdFx0Y2FzZSAncG5nJzpcclxuXHRcdFx0cmV0dXJuICdpbWFnZS9wbmcnO1xyXG5cdFx0Y2FzZSAnanBlZyc6XHJcblx0XHRjYXNlICdqcGcnOlxyXG5cdFx0XHRyZXR1cm4gJ2ltYWdlL2pwZWcnO1xyXG5cdFx0Y2FzZSAncGRmJzpcclxuXHRcdFx0cmV0dXJuICdhcHBsaWNhdGlvbi9wZGYnO1xyXG5cdFx0Y2FzZSAnZG9jeCc6XHJcblx0XHRjYXNlICdkb2MnOlxyXG5cdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL21zd29yZCc7XHJcblx0XHRjYXNlICdydGYnOlxyXG5cdFx0XHRyZXR1cm4gJ3RleHQvcmljaHRleHQnO1xyXG5cdFx0Y2FzZSAnaXBhcmRhdGEnOlxyXG5cdFx0XHRyZXR1cm4gJ3RleHQveG1sJztcclxuXHRcdGRlZmF1bHQ6XHJcblx0XHRcdHJldHVybiAndGV4dC9wbGFpbic7XHJcblx0fVxyXG59XHJcblxyXG5cclxuLypmdW5jdGlvbiBzZWxlY3RTYXZlTG9jYXRpb24gKGRhdGEpIHtcclxuXHJcblx0Y29uc29sZS5sb2coXCJzZWxlY3RTYXZlTG9jYXRpb25cIik7XHJcblxyXG5cdC8vIE1ha2Ugc3VyZSB0aGUgbmVlZCBBUElzIGFyZSBzdXBwb3J0ZWRcclxuXHRpZighd2luZG93LkZpbGUgfHwgIXdpbmRvdy5GaWxlUmVhZGVyIHx8ICF3aW5kb3cuRmlsZUxpc3QgfHwgIXdpbmRvdy5CbG9iIHx8ICF3aW5kb3cuQXJyYXlCdWZmZXIgfHwgIXdpbmRvdy5Xb3JrZXIpe1xyXG5cdFx0YWxlcnQoJ1RoZSBGaWxlIEFQSXMgbmVlZCB0byBsb2FkIGZpbGVzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlciEnKTtcclxuXHRcdC8vZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2FkLWJ1dHRvblwiKS5kaXNhYmxlZCA9IHRydWU7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHRjb25zb2xlLmxvZyAoXCJzZWxlY3RpbmdTYXZlTG9jYXRpb25cIik7XHJcblx0XHJcblx0XHQvLyBHZXQgdGhlIGxvYWQgYnV0dG9uIGFuZCBpbnB1dFxyXG5cdFx0dmFyIGxvYWRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2FkLWlucHV0Jyk7XHJcblxyXG5cdFx0Ly8gbG9hZCBpbnB1dCBpcyBoaWRkZW4sIHNvIGNsaWNrIGl0XHJcblx0XHRsb2FkSW5wdXQuY2xpY2soKTtcclxuXHRcdFxyXG5cdFx0Ly8gV2hlbiBsb2FkIGlucHV0IGZpbGUgaXMgY2hvc2VuLCBsb2FkIHRoZSBmaWxlXHJcblx0XHRsb2FkSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gTWFrZSBzdXJlIGEgaXBhciBmaWxlIHdhcyBjaG9vc2VuXHJcblx0XHRcdGlmKCFsb2FkSW5wdXQudmFsdWUuZW5kc1dpdGgoXCJpcGFyXCIpKXtcclxuXHRcdFx0XHRhbGVydChcIllvdSBkaWRuJ3QgY2hvb3NlIGFuIGlwYXIgZmlsZSEgeW91IGNhbiBvbmx5IGxvYWQgaXBhciBmaWxlcyFcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTYXZlIHRoZSB6aXAgZmlsZSdzIG5hbWUgdG8gbG9jYWwgc3RvcmFnZSBcclxuXHRcdFx0Ly8gTk9URTogdGhpcyB3aWxsIG92ZXJ3cml0ZSB0aGUgb2xkIG5hbWUsIFxyXG5cdFx0XHQvLyAgICBzbyBpZiB0aGUgdXNlciBjaG9vc2VzIGEgZGlmZmVyZW50IGZpbGUsIHRoaXMgY291bGQgbGVhZCB0byBlcnJvcnNcclxuXHRcdFx0bG9jYWxTdG9yYWdlWydjYXNlTmFtZSddID0gbG9hZElucHV0LmZpbGVzWzBdLm5hbWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBSZWFkIHRoZSB6aXBcclxuXHRcdFx0SlNaaXAubG9hZEFzeW5jKGxvYWRJbnB1dC5maWxlc1swXSlcclxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oemlwKSB7XHJcblx0XHRcdFx0Ly8gYmFja3NsYXNoZXMgcGVyIHppcCBmaWxlIHByb3RvY29sXHJcblx0XHRcdFx0emlwLmZpbGUoXCJjYXNlXFxcXGFjdGl2ZVxcXFxzYXZlRmlsZS5pcGFyZGF0YVwiLGRhdGEpO1xyXG5cdFx0XHRcdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0XHRcdFx0ZG93bmxvYWQoemlwKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvL3JlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihldmVudC50YXJnZXQuZmlsZXNbMF0pO1xyXG5cdFx0XHRcclxuXHRcdH0sIGZhbHNlKTtcclxuXHR9XHJcbn0qLyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkLmpzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxudmFyIExlc3Nvbk5vZGUgPSByZXF1aXJlKCcuL2xlc3Nvbk5vZGUuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9kcmF3bGliLmpzJyk7XHJcbnZhciBEYXRhUGFyc2VyID0gcmVxdWlyZSgnLi9pcGFyRGF0YVBhcnNlci5qcycpO1xyXG52YXIgTW91c2VTdGF0ZSA9IHJlcXVpcmUoJy4vbW91c2VTdGF0ZS5qcycpO1xyXG52YXIgRmlsZU1hbmFnZXIgPSByZXF1aXJlKCcuL2ZpbGVNYW5hZ2VyLmpzJyk7XHJcblxyXG4vL21vdXNlIG1hbmFnZW1lbnRcclxudmFyIG1vdXNlU3RhdGU7XHJcbnZhciBwcmV2aW91c01vdXNlU3RhdGU7XHJcbnZhciBkcmFnZ2luZ0Rpc2FibGVkO1xyXG52YXIgbW91c2VUYXJnZXQ7XHJcbnZhciBtb3VzZVN1c3RhaW5lZERvd247XHJcblxyXG4vL3BoYXNlIGhhbmRsaW5nXHJcbnZhciBwaGFzZU9iamVjdDtcclxuXHJcbmZ1bmN0aW9uIGdhbWUodXJsLCBjYW52YXMsIHdpbmRvd0Rpdil7XHJcblx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdHRoaXMuYWN0aXZlID0gZmFsc2U7XHJcblx0dGhpcy5tb3VzZVN0YXRlID0gbmV3IE1vdXNlU3RhdGUoY2FudmFzKTtcclxuXHRGaWxlTWFuYWdlci5sb2FkQ2FzZSh1cmwsIHdpbmRvd0RpdiwgZnVuY3Rpb24oY2F0ZWdvcmllcywgc3RhZ2Upe1xyXG5cdFx0Z2FtZS5jYXRlZ29yaWVzID0gY2F0ZWdvcmllcztcclxuXHRcdGdhbWUuY3JlYXRlTGVzc29uTm9kZXMoKTtcclxuXHR9KTtcclxufVxyXG5cclxudmFyIHAgPSBnYW1lLnByb3RvdHlwZTtcclxuXHJcbnAuY3JlYXRlTGVzc29uTm9kZXMgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuYm9hcmRBcnJheSA9IFtdO1xyXG5cdHZhciBib3R0b21CYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJvdHRvbUJhclwiKTtcclxuXHRmb3IodmFyIGk9MDtpPHRoaXMuY2F0ZWdvcmllcy5sZW5ndGg7aSsrKXtcclxuXHRcdC8vIGluaXRpYWxpemUgZW1wdHlcclxuXHRcdFxyXG5cdFx0dGhpcy5sZXNzb25Ob2RlcyA9IFtdO1xyXG5cdFx0Ly8gYWRkIGEgbm9kZSBwZXIgcXVlc3Rpb25cclxuXHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9ucy5sZW5ndGg7IGorKykge1xyXG5cdFx0XHQvLyBjcmVhdGUgYSBuZXcgbGVzc29uIG5vZGVcclxuXHRcdFx0dGhpcy5sZXNzb25Ob2Rlcy5wdXNoKG5ldyBMZXNzb25Ob2RlKG5ldyBQb2ludCh0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdLnBvc2l0aW9uUGVyY2VudFgsIHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0ucG9zaXRpb25QZXJjZW50WSksIHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0uaW1hZ2VMaW5rLCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdICkgKTtcclxuXHRcdFx0Ly8gYXR0YWNoIHF1ZXN0aW9uIG9iamVjdCB0byBsZXNzb24gbm9kZVxyXG5cdFx0XHR0aGlzLmxlc3Nvbk5vZGVzW3RoaXMubGVzc29uTm9kZXMubGVuZ3RoLTFdLnF1ZXN0aW9uID0gdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXTtcclxuXHRcdFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNyZWF0ZSBhIGJvYXJkXHJcblx0XHR0aGlzLmJvYXJkQXJyYXkucHVzaChuZXcgQm9hcmQobmV3IFBvaW50KGNhbnZhcy53aWR0aC8oMip0aGlzLnNjYWxlKSxjYW52YXMuaGVpZ2h0LygyKnRoaXMuc2NhbGUpKSwgdGhpcy5sZXNzb25Ob2RlcykpO1xyXG5cdFx0dmFyIGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJCVVRUT05cIik7XHJcblx0XHRidXR0b24uaW5uZXJIVE1MID0gdGhpcy5jYXRlZ29yaWVzW2ldLm5hbWU7XHJcblx0XHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0XHRidXR0b24ub25jbGljayA9IChmdW5jdGlvbihpKXsgXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRpZihnYW1lLmFjdGl2ZSl7XHJcblx0XHRcdFx0XHRnYW1lLmFjdGl2ZUJvYXJkSW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0aWYoZ2FtZS5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0XHRcdFx0XHRnYW1lLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHRcdFx0XHRcdGdhbWUudXBkYXRlTm9kZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdH19KShpKTtcclxuXHRcdGlmKCF0aGlzLmJvYXJkQXJyYXlbdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xXS5maW5pc2hlZClcclxuXHRcdFx0YnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdGJvdHRvbUJhci5hcHBlbmRDaGlsZChidXR0b24pO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0uYnV0dG9uID0gYnV0dG9uO1xyXG5cdFx0dmFyIGdhbWUgPSB0aGlzO1xyXG5cdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYm9hcmRBcnJheS5sZW5ndGgtMV0udXBkYXRlTm9kZSA9IGZ1bmN0aW9uKCl7Z2FtZS51cGRhdGVOb2RlKCk7fTtcclxuXHR9XHJcblx0dGhpcy5hY3RpdmVCb2FyZEluZGV4ID0gMDtcclxuXHR0aGlzLmFjdGl2ZSA9IHRydWU7XHJcblx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uYnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0aWYoZ2FtZS5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0Z2FtZS5vbkNoYW5nZUJvYXJkKCk7XHJcblx0dGhpcy51cGRhdGVOb2RlKCk7XHJcblx0XHJcblx0Ly8gcmVhZHkgdG8gc2F2ZVxyXG5cdEZpbGVNYW5hZ2VyLnByZXBhcmVaaXAodGhpcy5ib2FyZEFycmF5KTtcclxufVxyXG5cclxucC51cGRhdGVab29tID0gZnVuY3Rpb24obmV3Wm9vbSl7XHJcblx0aWYodGhpcy5hY3RpdmUpXHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS56b29tID0gbmV3Wm9vbTtcclxufVxyXG5cclxucC5nZXRab29tID0gZnVuY3Rpb24oKXtcclxuXHRyZXR1cm4gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbTtcclxufVxyXG5cclxucC51cGRhdGUgPSBmdW5jdGlvbihjdHgsIGNhbnZhcywgZHQpe1xyXG5cdFxyXG5cdGlmKHRoaXMuYWN0aXZlKXtcclxuXHRcdFxyXG5cdCAgICAvLyBVcGRhdGUgdGhlIG1vdXNlIHN0YXRlXHJcblx0XHR0aGlzLm1vdXNlU3RhdGUudXBkYXRlKGR0LCB0aGlzLnNjYWxlKnRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb20pO1xyXG5cdFx0XHJcblx0XHRpZiAodGhpcy5tb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9zYXZlXCIsRGF0YVBhcnNlci5jcmVhdGVYTUxTYXZlRmlsZSh0aGlzLmJvYXJkQXJyYXksIGZhbHNlKSk7XHJcblx0XHRcdC8vY29uc29sZS5sb2cobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhdXRvc2F2ZVwiKSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHQgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IGJvYXJkIChnaXZlIGl0IHRoZSBtb3VzZSBvbmx5IGlmIG5vdCB6b29taW5nKVxyXG5cdCAgICB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5hY3QoKHRoaXMuem9vbWluIHx8IHRoaXMuem9vbW91dCA/IG51bGwgOiB0aGlzLm1vdXNlU3RhdGUpLCBkdCk7XHJcblx0ICAgIFxyXG5cdCAgICAvLyBDaGVjayBpZiBuZXcgYm9hcmQgYXZhaWxhYmxlXHJcblx0ICAgIGlmKHRoaXMuYWN0aXZlQm9hcmRJbmRleCA8IHRoaXMuYm9hcmRBcnJheS5sZW5ndGgtMSAmJlxyXG5cdCAgICBcdFx0dGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleCsxXS5idXR0b24uZGlzYWJsZWQgJiYgXHJcblx0ICAgIFx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5maW5pc2hlZClcclxuXHQgICAgXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4KzFdLmJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdFx0XHJcblxyXG5cdFx0Ly8gSWYgdGhlIGJvYXJkIGlzIGRvbmUgem9vbSBvdXQgdG8gY2VudGVyXHJcblx0XHRpZih0aGlzLnpvb21vdXQpe1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gR2V0IHRoZSBjdXJyZW50IGJvYXJkXHJcblx0XHRcdHZhciBib2FyZCA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gWm9vbSBvdXQgYW5kIG1vdmUgdG93YXJkcyBjZW50ZXJcclxuXHRcdFx0aWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0XHRib2FyZC56b29tIC09IGR0KkNvbnN0YW50cy56b29tU3BlZWQ7XHJcblx0XHRcdGVsc2UgaWYodGhpcy5nZXRab29tKCk8Q29uc3RhbnRzLnN0YXJ0Wm9vbSlcclxuXHRcdFx0XHRib2FyZC56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuXHRcdFx0Ym9hcmQubW92ZVRvd2FyZHMobmV3IFBvaW50KENvbnN0YW50cy5ib2FyZFNpemUueC8yLCBDb25zdGFudHMuYm9hcmRTaXplLnkvMiksIGR0LCBDb25zdGFudHMuem9vbU1vdmVTcGVlZCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDYWxsIHRoZSBjaGFuZ2UgbWV0aG9kXHJcblx0XHRcdGlmKHRoaXMub25DaGFuZ2VCb2FyZClcclxuXHRcdFx0XHR0aGlzLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIGZ1bGx5IHpvb21lZCBvdXQgYW5kIGluIGNlbnRlciBzdG9wXHJcblx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPT1Db25zdGFudHMuc3RhcnRab29tICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lng9PUNvbnN0YW50cy5ib2FyZFNpemUueC8yICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lnk9PUNvbnN0YW50cy5ib2FyZFNpemUueS8yKXtcdFx0XHRcdFxyXG5cdFx0XHRcdHRoaXMuem9vbW91dCA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9IC8vIElmIHRoZXJlIGlzIGEgbmV3IG5vZGUgem9vbSBpbnRvIGl0XHJcblx0XHRlbHNlIGlmKHRoaXMuem9vbWluKXsgXHJcblx0XHRcdFxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHRcdFx0dmFyIGJvYXJkID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiBib2FyZCBpcyBub3QgZmluaXNoZWQgbG9vayBmb3IgbmV4dCBub2RlXHJcblx0XHRcdGlmKCFib2FyZC5maW5pc2hlZCAmJiB0aGlzLnRhcmdldE5vZGU9PW51bGwpe1xyXG5cdFx0XHRcdHRoaXMudGFyZ2V0Tm9kZSA9IGJvYXJkLmdldEZyZWVOb2RlKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZihib2FyZC5maW5pc2hlZCl7XHJcblx0XHRcdFx0dGhpcy56b29taW4gPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLnpvb21vdXQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTdGFydCBtb3ZpbmcgYW5kIHpvb21pbmcgaWYgdGFyZ2V0IGZvdW5kXHJcblx0XHRcdGlmKHRoaXMuem9vbWluICYmIHRoaXMudGFyZ2V0Tm9kZSl7XHJcblx0XHRcclxuXHRcdFx0XHQvLyBab29tIGluIGFuZCBtb3ZlIHRvd2FyZHMgdGFyZ2V0IG5vZGVcclxuXHRcdFx0XHRpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuZW5kWm9vbSlcclxuXHRcdFx0XHRcdGJvYXJkLnpvb20gKz0gZHQqQ29uc3RhbnRzLnpvb21TcGVlZDtcclxuXHRcdFx0XHRlbHNlIGlmKHRoaXMuZ2V0Wm9vbSgpPkNvbnN0YW50cy5lbmRab29tKVxyXG5cdFx0XHRcdFx0Ym9hcmQuem9vbSA9IENvbnN0YW50cy5lbmRab29tO1xyXG5cdFx0XHRcdGJvYXJkLm1vdmVUb3dhcmRzKHRoaXMudGFyZ2V0Tm9kZS5wb3NpdGlvbiwgZHQsIENvbnN0YW50cy56b29tTW92ZVNwZWVkKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBDYWxsIHRoZSBjaGFuZ2UgbWV0aG9kXHJcblx0XHRcdFx0aWYodGhpcy5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0XHRcdFx0dGhpcy5vbkNoYW5nZUJvYXJkKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gSWYgcmVhY2hlZCB0aGUgbm9kZSBhbmQgem9vbWVkIGluIHN0b3AgYW5kIGdldCByaWQgb2YgdGhlIHRhcmdldFxyXG5cdFx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPT1Db25zdGFudHMuZW5kWm9vbSAmJiBib2FyZC5ib2FyZE9mZnNldC54PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueCAmJiBib2FyZC5ib2FyZE9mZnNldC55PT10aGlzLnRhcmdldE5vZGUucG9zaXRpb24ueSl7XHJcblx0XHRcdFx0XHR0aGlzLnpvb21pbiA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dGhpcy50YXJnZXROb2RlID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHQgICAgXHJcblx0ICAgIC8vIGRyYXcgc3R1ZmYgbm8gbWF0dGVyIHdoYXRcclxuXHQgICAgdGhpcy5kcmF3KGN0eCwgY2FudmFzKTtcclxuXHR9XHJcbn1cclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzKXtcclxuXHRcclxuXHQvLyBEcmF3IHRoZSBiYWNrZ3JvdW5kXHJcblx0RHJhd0xpYi5yZWN0KGN0eCwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0LCBcIiMxNTcxOEZcIik7XHJcbiAgICBcclxuXHQvLyBTY2FsZSB0aGUgZ2FtZVxyXG5cdGN0eC5zYXZlKCk7XHJcblx0Y3R4LnRyYW5zbGF0ZShjYW52YXMud2lkdGgvMiwgY2FudmFzLmhlaWdodC8yKTtcclxuXHRjdHguc2NhbGUodGhpcy5zY2FsZSwgdGhpcy5zY2FsZSk7XHJcblx0Y3R4LnRyYW5zbGF0ZSgtY2FudmFzLndpZHRoLzIsIC1jYW52YXMuaGVpZ2h0LzIpO1xyXG5cdC8vY3R4LnRyYW5zbGF0ZShjYW52YXMud2lkdGgqdGhpcy5zY2FsZS1jYW52YXMud2lkdGgsIGNhbnZhcy53aWR0aCp0aGlzLnNjYWxlLWNhbnZhcy53aWR0aCk7XHJcblx0XHJcbiAgICAvLyBEcmF3IHRoZSBjdXJyZW50IGJvYXJkXHJcbiAgICB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5kcmF3KGN0eCwgY2FudmFzKTtcclxuXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5wLnVwZGF0ZU5vZGUgPSBmdW5jdGlvbigpe1xyXG5cdHRoaXMuem9vbWluID0gdHJ1ZTtcclxufVxyXG5cclxucC53aW5kb3dDbG9zZWQgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgZmlsZVRvU3RvcmUgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS53aW5kb3dDbG9zZWQoKTtcclxuXHRpZiAoZmlsZVRvU3RvcmUpIHtcclxuXHRcdEZpbGVNYW5hZ2VyLmFkZE5ld0ZpbGVUb1N5c3RlbShcdFx0ICAvLyBuZWVkIHRvIHN0b3JlIG51bWJlciBvZiBmaWxlc1xyXG5cdFx0XHRcIlwiK3RoaXMuYWN0aXZlQm9hcmRJbmRleCtcIi1cIitmaWxlVG9TdG9yZS5udW0rXCItXCIrXCIwXCIrZmlsZVRvU3RvcmUuZXh0LFxyXG5cdFx0XHRmaWxlVG9TdG9yZS5ibG9iKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZ2FtZTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBDYXRlZ29yeSA9IHJlcXVpcmUoXCIuL2NhdGVnb3J5LmpzXCIpO1xyXG52YXIgUmVzb3VyY2UgPSByZXF1aXJlKFwiLi9yZXNvdXJjZXMuanNcIik7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi9xdWVzdGlvbi5qcycpO1xyXG52YXIgUXVlc3Rpb25XaW5kb3dzID0gcmVxdWlyZSgnLi9xdWVzdGlvbldpbmRvd3MuanMnKTtcclxud2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgID0gd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwgfHwgd2luZG93LndlYmtpdFJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkw7XHJcblxyXG4vLyBQYXJzZXMgdGhlIHhtbCBjYXNlIGZpbGVzXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8ga25vd24gdGFnc1xyXG4vKlxyXG5hbnN3ZXJcclxuYnV0dG9uXHJcbmNhdGVnb3J5TGlzdFxyXG5jb25uZWN0aW9uc1xyXG5lbGVtZW50XHJcbmZlZWRiYWNrXHJcbmluc3RydWN0aW9uc1xyXG5yZXNvdXJjZVxyXG5yZXNvdXJjZUxpc3RcclxucmVzb3VyY2VJbmRleFxyXG5zb2Z0d2FyZUxpc3RcclxucXVlc3Rpb25cclxucXVlc3Rpb25UZXh0XHJcbnF1c3Rpb25OYW1lXHJcbiovXHJcblxyXG4vLyBjb252ZXJzaW9uXHJcbnZhciBzdGF0ZUNvbnZlcnRlciA9IHtcclxuXHRcImhpZGRlblwiIDogUXVlc3Rpb24uU09MVkVfU1RBVEUuSElEREVOLFxyXG5cdFwidW5zb2x2ZWRcIiA6ICBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRCxcclxuXHRcImNvcnJlY3RcIiA6ICBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRURcclxufVxyXG4vLyBjb252ZXJzaW9uXHJcbnZhciByZXZlcnNlU3RhdGVDb252ZXJ0ZXIgPSBbXCJoaWRkZW5cIiwgXCJ1bnNvbHZlZFwiLCBcImNvcnJlY3RcIl07XHJcblxyXG4vLyBNb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblx0XHRcdFx0XHJcbi8vICoqKioqKioqKioqKioqKioqKioqKiogTE9BRElORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8vIHNldCB0aGUgcXVlc3Rpb24gc3RhdGVzXHJcbm0uYXNzaWduUXVlc3Rpb25TdGF0ZXMgPSBmdW5jdGlvbihjYXRlZ29yaWVzLCBxdWVzdGlvbkVsZW1zKSB7XHJcblx0Y29uc29sZS5sb2coXCJxZWxlbXM6IFwiICsgcXVlc3Rpb25FbGVtcy5sZW5ndGgpO1xyXG5cdHZhciB0YWxseSA9IDA7IC8vIHRyYWNrIHRvdGFsIGluZGV4IGluIG5lc3RlZCBsb29wXHJcblx0XHJcblx0Ly8gYWxsIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxjYXRlZ29yaWVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRmb3IgKHZhciBqPTA7IGo8Y2F0ZWdvcmllc1tpXS5xdWVzdGlvbnMubGVuZ3RoOyBqKyssIHRhbGx5KyspIHtcclxuXHRcdFxyXG5cdFx0XHQvLyBzdG9yZSBxdWVzdGlvbiAgZm9yIGVhc3kgcmVmZXJlbmNlXHJcblx0XHRcdHZhciBxID0gY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdG9yZSB0YWcgZm9yIGVhc3kgcmVmZXJlbmNlXHJcblx0XHRcdHZhciBxRWxlbSA9IHF1ZXN0aW9uRWxlbXNbdGFsbHldO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgcG9zaXRpb24gaXMgbGVzcyB0aGFuIHplcm8gZG9uJ3QgbG9hZCB0aGUgcXVlc3Rpb25cclxuXHRcdFx0aWYocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSk8MCB8fCBcclxuXHRcdFx0XHRcdHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpPDApXHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBzdGF0ZVxyXG5cdFx0XHRxLmN1cnJlbnRTdGF0ZSA9IHN0YXRlQ29udmVydGVyW3FFbGVtLmdldEF0dHJpYnV0ZShcInF1ZXN0aW9uU3RhdGVcIildO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHRpZihxLmp1c3RpZmljYXRpb24pXHJcblx0XHRcdFx0cS5qdXN0aWZpY2F0aW9uLnZhbHVlID0gcUVsZW0uZ2V0QXR0cmlidXRlKFwianVzdGlmaWNhdGlvblwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGwgY29ycmVjdCBhbnN3ZXIgaWYgc3RhdGUgaXMgY29ycmVjdFxyXG5cdFx0XHRpZihxLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKVxyXG5cdFx0XHQgIHEuY29ycmVjdEFuc3dlcigpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHQvLyB4cG9zXHJcblx0XHRcdHEucG9zaXRpb25QZXJjZW50WCA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54KTtcclxuXHRcdFx0Ly8geXBvc1xyXG5cdFx0XHRxLnBvc2l0aW9uUGVyY2VudFkgPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHFFbGVtLmdldEF0dHJpYnV0ZShcInBvc2l0aW9uUGVyY2VudFlcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gdGFrZXMgdGhlIHhtbCBzdHJ1Y3R1cmUgYW5kIGZpbGxzIGluIHRoZSBkYXRhIGZvciB0aGUgcXVlc3Rpb24gb2JqZWN0XHJcbm0uZ2V0Q2F0ZWdvcmllc0FuZFF1ZXN0aW9ucyA9IGZ1bmN0aW9uKHJhd0RhdGEsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKSB7XHJcblx0Ly8gaWYgdGhlcmUgaXMgYSBjYXNlIGZpbGVcclxuXHRpZiAocmF3RGF0YSAhPSBudWxsKSB7XHJcblx0XHRcclxuXHRcdC8vIEZpcnN0IGxvYWQgdGhlIHJlc291cmNlc1xyXG5cdFx0dmFyIHJlc291cmNlRWxlbWVudHMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VMaXN0XCIpWzBdLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VcIik7XHJcblx0XHR2YXIgcmVzb3VyY2VzID0gW107XHJcblx0XHRmb3IgKHZhciBpPTA7IGk8cmVzb3VyY2VFbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHQvLyBMb2FkIGVhY2ggcmVzb3VyY2VcclxuXHRcdFx0cmVzb3VyY2VzW2ldID0gbmV3IFJlc291cmNlKHJlc291cmNlRWxlbWVudHNbaV0sIHVybCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFRoZW4gbG9hZCB0aGUgY2F0ZWdvcmllc1xyXG5cdFx0dmFyIGNhdGVnb3J5RWxlbWVudHMgPSByYXdEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY2F0ZWdvcnlcIik7XHJcblx0XHR2YXIgY2F0ZWdvcnlOYW1lcyA9IHJhd0RhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeUxpc3RcIilbMF0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbGVtZW50XCIpO1xyXG5cdFx0dmFyIGNhdGVnb3JpZXMgPSBbXTtcclxuXHRcdGZvciAodmFyIGk9MDsgaTxjYXRlZ29yeUVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIExvYWQgZWFjaCBjYXRlZ29yeSAod2hpY2ggbG9hZHMgZWFjaCBxdWVzdGlvbilcclxuXHRcdFx0Y2F0ZWdvcmllc1tpXSA9IG5ldyBDYXRlZ29yeShjYXRlZ29yeU5hbWVzW2ldLmlubmVySFRNTCwgY2F0ZWdvcnlFbGVtZW50c1tpXSwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gY2F0ZWdvcmllcztcclxuXHR9XHJcblx0cmV0dXJuIG51bGxcclxufVxyXG5cclxuLy8gY3JlYXRlcyBhIGNhc2UgZmlsZSBmb3IgemlwcGluZ1xyXG5tLnJlY3JlYXRlQ2FzZUZpbGUgPSBmdW5jdGlvbihib2FyZHMpIHtcclxuXHJcblx0Ly8gY3JlYXRlIHNhdmUgZmlsZSB0ZXh0XHJcblx0dmFyIGRhdGFUb1NhdmUgPSBtLmNyZWF0ZVhNTFNhdmVGaWxlKGJvYXJkcywgdHJ1ZSk7XHJcblx0XHJcblx0Y29uc29sZS5sb2cgKFwic2F2ZURhdGEuaXBhciBkYXRhIGNyZWF0ZWRcIik7XHJcblx0XHJcblx0Ly9pZiAoY2FsbGJhY2spIGNhbGxiYWNrKGRhdGFUb1NhdmUpO1xyXG5cdHJldHVybiBkYXRhVG9TYXZlO1xyXG5cdFxyXG59XHJcblxyXG4vLyBjcmVhdGVzIHRoZSB4bWxcclxubS5jcmVhdGVYTUxTYXZlRmlsZSA9IGZ1bmN0aW9uKGJvYXJkcywgaW5jbHVkZU5ld2xpbmUpIHtcclxuXHQvLyBuZXdsaW5lXHJcblx0dmFyIG5sO1xyXG5cdGluY2x1ZGVOZXdsaW5lID8gbmwgPSBcIlxcblwiIDogbmwgPSBcIlwiO1xyXG5cdC8vIGhlYWRlclxyXG5cdHZhciBvdXRwdXQgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwidXRmLThcIj8+JyArIG5sO1xyXG5cdC8vIGNhc2UgZGF0YVxyXG5cdG91dHB1dCArPSAnPGNhc2UgY2F0ZWdvcnlJbmRleD1cIjNcIiBjYXNlU3RhdHVzPVwiMVwiIHByb2ZpbGVGaXJzdD1cImpcIiBwcm9maWxlTGFzdD1cImpcIiBwcm9maWxlTWFpbD1cImpcIj4nICsgbmw7XHJcblx0Ly8gcXVlc3Rpb25zIGhlYWRlclxyXG5cdG91dHB1dCArPSAnPHF1ZXN0aW9ucz4nICsgbmw7XHJcblx0XHJcblx0Ly8gbG9vcCB0aHJvdWdoIHF1ZXN0aW9uc1xyXG5cdGZvciAodmFyIGk9MDsgaTxib2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxib2FyZHNbaV0ubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIHNob3J0aGFuZFxyXG5cdFx0XHR2YXIgcSA9IGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXlbal0ucXVlc3Rpb247XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0YWcgc3RhcnRcclxuXHRcdFx0b3V0cHV0ICs9ICc8cXVlc3Rpb24gJztcclxuXHRcdFx0XHJcblx0XHRcdC8vIHF1ZXN0aW9uU3RhdGVcclxuXHRcdFx0b3V0cHV0ICs9ICdxdWVzdGlvblN0YXRlPVwiJyArIHJldmVyc2VTdGF0ZUNvbnZlcnRlcltxLmN1cnJlbnRTdGF0ZV0gKyAnXCIgJztcclxuXHRcdFx0Ly8ganVzdGlmaWNhdGlvblxyXG5cdFx0XHR2YXIgbmV3SnVzdGlmaWNhdGlvbiA9IHEuanVzdGlmaWNhdGlvbi52YWx1ZTtcclxuXHRcdFx0dmFyIGp1c3RpZmljYXRpb247XHJcblx0XHRcdG5ld0p1c3RpZmljYXRpb24gPyBqdXN0aWZpY2F0aW9uID0gbmV3SnVzdGlmaWNhdGlvbiA6IGp1c3RpZmljYXRpb24gPSBxLmp1c3RpZmljYXRpb25TdHJpbmc7XHJcblx0XHRcdG91dHB1dCArPSAnanVzdGlmaWNhdGlvbj1cIicgKyBqdXN0aWZpY2F0aW9uICsgJ1wiICc7XHJcblx0XHRcdC8vIGFuaW1hdGVkXHJcblx0XHRcdG91dHB1dCArPSAnYW5pbWF0ZWQ9XCInICsgKHEuY3VycmVudFN0YXRlID09IDIpICsgJ1wiICc7IC8vIG1pZ2h0IGhhdmUgdG8gZml4IHRoaXMgbGF0ZXJcclxuXHRcdFx0Ly8gbGluZXNUcmFuY2VkXHJcblx0XHRcdG91dHB1dCArPSAnbGluZXNUcmFjZWQ9XCIwXCIgJzsgLy8gbWlnaHQgaGF2ZSB0byBmaXggdGhpcyB0b29cclxuXHRcdFx0Ly8gcmV2ZWFsQnVmZmVyXHJcblx0XHRcdG91dHB1dCArPSAncmV2ZWFsQnVmZmVyPVwiMFwiICc7IC8vIGFuZCB0aGlzXHJcblx0XHRcdC8vIHBvc2l0aW9uUGVyY2VudFhcclxuXHRcdFx0b3V0cHV0ICs9ICdwb3NpdGlvblBlcmNlbnRYPVwiJyArIFV0aWxpdGllcy5tYXAocS5wb3NpdGlvblBlcmNlbnRYLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngsIDAsIDEwMCkgKyAnXCIgJztcclxuXHRcdFx0Ly8gcG9zaXRpb25QZXJjZW50WVxyXG5cdFx0XHRvdXRwdXQgKz0gJ3Bvc2l0aW9uUGVyY2VudFk9XCInICsgVXRpbGl0aWVzLm1hcChxLnBvc2l0aW9uUGVyY2VudFksIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSwgMCwgMTAwKSArICdcIiAnO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdGFnIGVuZFxyXG5cdFx0XHRvdXRwdXQgKz0gJy8+JyArIG5sO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRvdXRwdXQgKz0gXCI8L3F1ZXN0aW9ucz5cIiArIG5sO1xyXG5cdG91dHB1dCArPSBcIjwvY2FzZT5cIiArIG5sO1xyXG5cdHJldHVybiBvdXRwdXQ7XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBEcmF3TGliID0gcmVxdWlyZSgnLi9kcmF3TGliLmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY29uc3RhbnRzLmpzXCIpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoJy4vcXVlc3Rpb24uanMnKTtcclxuXHJcbnZhciBDSEVDS19JTUFHRSA9IFwiLi4vaW1nL2ljb25Qb3N0SXRDaGVjay5wbmdcIjtcclxuXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIGxlc3Nvbk5vZGUoc3RhcnRQb3NpdGlvbiwgaW1hZ2VQYXRoLCBwUXVlc3Rpb24pe1xyXG4gICAgXHJcbiAgICB0aGlzLnBvc2l0aW9uID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMuZHJhZ0xvY2F0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgIHRoaXMudHlwZSA9IFwibGVzc29uTm9kZVwiO1xyXG4gICAgdGhpcy5pbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy5jaGVjayA9IG5ldyBJbWFnZSgpO1xyXG4gICAgdGhpcy53aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0O1xyXG4gICAgdGhpcy5xdWVzdGlvbiA9IHBRdWVzdGlvbjtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSAwO1xyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZTtcclxuICAgIHRoaXMubGluZVBlcmNlbnQgPSAwO1xyXG4gICAgXHJcbiAgICAvLyBza2lwIGFuaW1hdGlvbnMgZm9yIHNvbHZlZFxyXG4gICAgaWYgKHBRdWVzdGlvbi5jdXJyZW50U3RhdGUgPT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEKSB0aGlzLmxpbmVQZXJjZW50ID0gMTtcclxuICAgIFxyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgLy9pbWFnZSBsb2FkaW5nIGFuZCByZXNpemluZ1xyXG4gICAgdGhpcy5pbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGF0LndpZHRoID0gdGhhdC5pbWFnZS5uYXR1cmFsV2lkdGg7XHJcbiAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmltYWdlLm5hdHVyYWxIZWlnaHQ7XHJcbiAgICAgICAgdmFyIG1heERpbWVuc2lvbiA9IENvbnN0YW50cy5ib2FyZFNpemUueC8xMDtcclxuICAgICAgICAvL3RvbyBzbWFsbD9cclxuICAgICAgICBpZih0aGF0LndpZHRoIDwgbWF4RGltZW5zaW9uICYmIHRoYXQuaGVpZ2h0IDwgbWF4RGltZW5zaW9uKXtcclxuICAgICAgICAgICAgdmFyIHg7XHJcbiAgICAgICAgICAgIGlmKHRoYXQud2lkdGggPiB0aGF0LmhlaWdodCl7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC53aWR0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgeCA9IG1heERpbWVuc2lvbiAvIHRoYXQuaGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQud2lkdGggPSB0aGF0LndpZHRoICogeDtcclxuICAgICAgICAgICAgdGhhdC5oZWlnaHQgPSB0aGF0LmhlaWdodCAqIHg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPiBtYXhEaW1lbnNpb24gfHwgdGhhdC5oZWlnaHQgPiBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSB0aGF0LndpZHRoIC8gbWF4RGltZW5zaW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gdGhhdC5oZWlnaHQgLyBtYXhEaW1lbnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggLyB4O1xyXG4gICAgICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaGVpZ2h0IC8geDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoYXQucG9zaXRpb24ueCArPSB0aGF0LndpZHRoLzI7XHJcbiAgICAgICAgdGhhdC5wb3NpdGlvbi55ICs9IHRoYXQuaGVpZ2h0LzI7XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB0aGlzLmltYWdlLnNyYyA9IGltYWdlUGF0aDtcclxuICAgIHRoaXMuY2hlY2suc3JjID0gQ0hFQ0tfSU1BR0U7XHJcbn1cclxuXHJcbnZhciBwID0gbGVzc29uTm9kZS5wcm90b3R5cGU7XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcblxyXG5cdC8vIENoZWNrIGlmIHF1ZXN0aW9uIGlzIHZpc2libGVcclxuXHRpZih0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZT09UXVlc3Rpb24uU09MVkVfU1RBVEUuSElEREVOKXtcclxuXHRcdGlmKHRoaXMucXVlc3Rpb24ucmV2ZWFsVGhyZXNob2xkIDw9IHRoaXMuY29ubmVjdGlvbnMpe1xyXG5cdFx0XHR0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlVOU09MVkVEO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZVxyXG5cdFx0XHRyZXR1cm47XHJcblx0fVxyXG5cdFxyXG4gICAgLy9sZXNzb25Ob2RlLmRyYXdMaWIuY2lyY2xlKGN0eCwgdGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIDEwLCBcInJlZFwiKTtcclxuICAgIC8vZHJhdyB0aGUgaW1hZ2UsIHNoYWRvdyBpZiBob3ZlcmVkXHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgaWYodGhpcy5kcmFnZ2luZykge1xyXG4gICAgXHRjdHguc2hhZG93Q29sb3IgPSAneWVsbG93JztcclxuICAgICAgICBjdHguc2hhZG93Qmx1ciA9IDU7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy13ZWJraXQtZ3JhYmJpbmcnO1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICctbW96LWdyYWJiaW5nJztcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZih0aGlzLm1vdXNlT3Zlcil7XHJcbiAgICAgICAgY3R4LnNoYWRvd0NvbG9yID0gJ2RvZGdlckJsdWUnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICB9XHJcbiAgICAvL2RyYXdpbmcgdGhlIGJ1dHRvbiBpbWFnZVxyXG4gICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltYWdlLCB0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgIFxyXG4gICAgLy9kcmF3aW5nIHRoZSBwaW5cclxuICAgIHN3aXRjaCAodGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGUpIHtcclxuICAgIFx0Y2FzZSAxOlxyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImJsdWVcIjtcclxuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJjeWFuXCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgIFx0Y2FzZSAyOlxyXG4gICAgIFx0XHRjdHguZHJhd0ltYWdlKHRoaXMuY2hlY2ssIHRoaXMucG9zaXRpb24ueCArIHRoaXMud2lkdGgvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgdGhpcy5wb3NpdGlvbi55ICsgdGhpcy5oZWlnaHQvMiAtIENvbnN0YW50cy5ib2FyZFNpemUueC81MCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwLCBDb25zdGFudHMuYm9hcmRTaXplLngvNTApO1xyXG4gICAgXHRcdGN0eC5maWxsU3R5bGUgPSBcImdyZWVuXCI7XHJcblx0XHRcdGN0eC5zdHJva2VTdHlsZSA9IFwieWVsbG93XCI7XHJcblx0XHRcdGJyZWFrO1xyXG4gICAgfVxyXG5cdHZhciBzbWFsbGVyID0gdGhpcy53aWR0aCA8IHRoaXMuaGVpZ2h0ID8gdGhpcy53aWR0aCA6IHRoaXMuaGVpZ2h0O1xyXG5cdGN0eC5saW5lV2lkdGggPSBzbWFsbGVyLzMyO1xyXG5cclxuXHRjdHguYmVnaW5QYXRoKCk7XHJcblx0dmFyIG5vZGVQb2ludCA9IHRoaXMuZ2V0Tm9kZVBvaW50KCk7XHJcblx0Y3R4LmFyYyhub2RlUG9pbnQueCwgbm9kZVBvaW50LnksIHNtYWxsZXIqMy8zMiwgMCwgMipNYXRoLlBJKTtcclxuXHRjdHguY2xvc2VQYXRoKCk7XHJcblx0Y3R4LmZpbGwoKTtcclxuXHRjdHguc3Ryb2tlKCk7XHJcbiAgICBcclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn07XHJcblxyXG5wLmdldE5vZGVQb2ludCA9IGZ1bmN0aW9uKCl7XHJcblx0dmFyIHNtYWxsZXIgPSB0aGlzLndpZHRoIDwgdGhpcy5oZWlnaHQgPyB0aGlzLndpZHRoIDogdGhpcy5oZWlnaHQ7XHJcblx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLndpZHRoLzIgKyBzbWFsbGVyKjMvMTYsIHRoaXMucG9zaXRpb24ueSAtIHRoaXMuaGVpZ2h0LzIgKyBzbWFsbGVyKjMvMTYpO1xyXG59XHJcblxyXG5wLmNsaWNrID0gZnVuY3Rpb24obW91c2VTdGF0ZSl7XHJcbiAgICB0aGlzLnF1ZXN0aW9uLmRpc3BsYXlXaW5kb3dzKCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbGVzc29uTm9kZTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy8gcHJpdmF0ZSB2YXJpYWJsZXNcclxudmFyIG1vdXNlUG9zaXRpb24sIHJlbGF0aXZlTW91c2VQb3NpdGlvbjtcclxudmFyIG1vdXNlRG93blRpbWVyLCBtYXhDbGlja0R1cmF0aW9uO1xyXG52YXIgbW91c2VXaGVlbFZhbDtcclxudmFyIHByZXZUaW1lLCBkdDtcclxudmFyIHNjYWxlO1xyXG5cclxuZnVuY3Rpb24gbW91c2VTdGF0ZShjYW52YXMpe1xyXG5cdFxyXG5cdG1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgdGhpcy52aXJ0dWFsUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwwKTtcclxuICAgIFxyXG4gICAgLy9ldmVudCBsaXN0ZW5lcnMgZm9yIG1vdXNlIGludGVyYWN0aW9ucyB3aXRoIHRoZSBjYW52YXNcclxuICAgIHZhciBtb3VzZVN0YXRlID0gdGhpcztcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHVwZGF0ZVBvc2l0aW9uKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIHVwZGF0ZVBvc2l0aW9uKGUuY2hhbmdlZFRvdWNoZXNbMF0pO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaHN0YXJ0XCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgIHVwZGF0ZVBvc2l0aW9uKGUuY2hhbmdlZFRvdWNoZXNbMF0pO1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBmYWxzZTtcclxuICAgIG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIHRoaXMubW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBtYXhDbGlja0R1cmF0aW9uID0gMjAwO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IGZhbHNlO1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcblx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVBvc2l0aW9uKGUpe1xyXG5cdHZhciBib3VuZFJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICBtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIGJvdW5kUmVjdC5sZWZ0LCBlLmNsaWVudFkgLSBib3VuZFJlY3QudG9wKTtcclxuICAgIHJlbGF0aXZlTW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludChtb3VzZVBvc2l0aW9uLnggLSAoY2FudmFzLm9mZnNldFdpZHRoLzIuMCksIG1vdXNlUG9zaXRpb24ueSAtIChjYW52YXMub2Zmc2V0SGVpZ2h0LzIuMCkpO1xyXG59XHJcblxyXG52YXIgcCA9IG1vdXNlU3RhdGUucHJvdG90eXBlO1xyXG5cclxuLy8gVXBkYXRlIHRoZSBtb3VzZSB0byB0aGUgY3VycmVudCBzdGF0ZVxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKGR0LCBzY2FsZSl7XHJcbiAgICBcclxuXHQvLyBTYXZlIHRoZSBjdXJyZW50IHZpcnR1YWwgcG9zaXRpb24gZnJvbSBzY2FsZVxyXG5cdHRoaXMudmlydHVhbFBvc2l0aW9uID0gbmV3IFBvaW50KHJlbGF0aXZlTW91c2VQb3NpdGlvbi54L3NjYWxlLCByZWxhdGl2ZU1vdXNlUG9zaXRpb24ueS9zY2FsZSk7O1xyXG5cdFxyXG4gICAgLy8gY2hlY2sgbW91c2UgY2xpY2tcclxuICAgIHRoaXMubW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBpZiAodGhpcy5tb3VzZURvd24pXHJcbiAgICBcdG1vdXNlRG93blRpbWVyICs9IGR0O1xyXG4gICAgZWxzZXtcclxuICAgIFx0aWYgKG1vdXNlRG93blRpbWVyID4gMCAmJiBtb3VzZURvd25UaW1lciA8IG1heENsaWNrRHVyYXRpb24pXHJcbiAgICBcdFx0dGhpcy5tb3VzZUNsaWNrZWQgPSB0cnVlO1xyXG4gICAgXHRtb3VzZURvd25UaW1lciA9IDA7XHJcbiAgICB9XHJcbiAgICB0aGlzLnByZXZNb3VzZURvd24gPSB0aGlzLm1vdXNlRG93bjtcclxuICAgIHRoaXMuaGFzVGFyZ2V0ID0gZmFsc2U7XHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBtb3VzZVN0YXRlOyIsIlwidXNlIHN0cmljdFwiO1xyXG5mdW5jdGlvbiBQb2ludChwWCwgcFkpe1xyXG4gICAgdGhpcy54ID0gcFg7XHJcbiAgICB0aGlzLnkgPSBwWTtcclxufVxyXG5cclxudmFyIHAgPSBQb2ludC5wcm90b3R5cGU7XHJcblxyXG5wLmFkZCA9IGZ1bmN0aW9uKHBYLCBwWSl7XHJcblx0aWYocFkpXHJcblx0XHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCtwWCwgdGhpcy55K3BZKTtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCtwWC54LCB0aGlzLnkrcFgueSk7XHJcbn1cclxuXHJcbnAubXVsdCA9IGZ1bmN0aW9uKHBYLCBwWSl7XHJcblx0aWYocFkpXHJcblx0XHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpwWCwgdGhpcy55KnBZKTtcclxuXHRlbHNlXHJcblx0XHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpwWC54LCB0aGlzLnkqcFgueSk7XHJcbn1cclxuXHJcbnAuc2NhbGUgPSBmdW5jdGlvbihzY2FsZSl7XHJcblx0cmV0dXJuIG5ldyBQb2ludCh0aGlzLngqc2NhbGUsIHRoaXMueSpzY2FsZSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9pbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxuXHJcbnZhciBTT0xWRV9TVEFURSA9IE9iamVjdC5mcmVlemUoe0hJRERFTjogMCwgVU5TT0xWRUQ6IDEsIFNPTFZFRDogMn0pO1xyXG52YXIgUVVFU1RJT05fVFlQRSA9IE9iamVjdC5mcmVlemUoe0pVU1RJRklDQVRJT046IDEsIE1VTFRJUExFX0NIT0lDRTogMiwgU0hPUlRfUkVTUE9OU0U6IDMsIEZJTEU6IDQsIE1FU1NBR0U6IDV9KTtcclxuXHJcbi8qIFF1ZXN0aW9uIHByb3BlcnRpZXM6XHJcbmN1cnJlbnRTdGF0ZTogU09MVkVfU1RBVEVcclxud2luZG93RGl2OiBlbGVtZW50XHJcbmNvcnJlY3Q6IGludFxyXG5wb3NpdGlvblBlcmNlbnRYOiBmbG9hdFxyXG5wb3NpdGlvblBlcmNlbnRZOiBmbG9hdFxyXG5yZXZlYWxUaHJlc2hvbGQ6IGludFxyXG5pbWFnZUxpbms6IHN0cmluZ1xyXG5mZWVkYmFja3M6IHN0cmluZ1tdXHJcbmNvbm5lY3Rpb25FbGVtZW50czogZWxlbWVudFtdXHJcbmNvbm5lY3Rpb25zOiBpbnRbXVxyXG5xdWVzdGlvblR5cGU6IFNPTFZFX1NUQVRFXHJcbmp1c3RpZmljYXRpb246IHN0cmluZ1xyXG53cm9uZ0Fuc3dlcjogc3RyaW5nXHJcbmNvcnJlY3RBbnN3ZXI6IHN0cmluZ1xyXG4qL1xyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBRdWVzdGlvbih4bWwsIHJlc291cmNlcywgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3Mpe1xyXG5cdFxyXG5cdC8vIFNldCB0aGUgY3VycmVudCBzdGF0ZSB0byBkZWZhdWx0IGF0IGhpZGRlbiBhbmQgc3RvcmUgdGhlIHdpbmRvdyBkaXZcclxuICAgIHRoaXMuY3VycmVudFN0YXRlID0gU09MVkVfU1RBVEUuSElEREVOO1xyXG4gICAgdGhpcy53aW5kb3dEaXYgPSB3aW5kb3dEaXY7XHJcbiAgICBcclxuICAgIC8vIEdldCBhbmQgc2F2ZSB0aGUgZ2l2ZW4gaW5kZXgsIGNvcnJlY3QgYW5zd2VyLCBwb3NpdGlvbiwgcmV2ZWFsIHRocmVzaG9sZCwgaW1hZ2UgbGluaywgZmVlZGJhY2ssIGFuZCBjb25uZWN0aW9uc1xyXG4gICAgdGhpcy5jb3JyZWN0ID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcImNvcnJlY3RBbnN3ZXJcIikpO1xyXG4gICAgdGhpcy5wb3NpdGlvblBlcmNlbnRYID0gVXRpbGl0aWVzLm1hcChwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwieFBvc2l0aW9uUGVyY2VudFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54KTtcclxuICAgIHRoaXMucG9zaXRpb25QZXJjZW50WSA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInlQb3NpdGlvblBlcmNlbnRcIikpLCAwLCAxMDAsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueSk7XHJcbiAgICB0aGlzLnJldmVhbFRocmVzaG9sZCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJyZXZlYWxUaHJlc2hvbGRcIikpO1xyXG4gICAgdGhpcy5pbWFnZUxpbmsgPSB1cmwreG1sLmdldEF0dHJpYnV0ZShcImltYWdlTGlua1wiKTtcclxuICAgIHRoaXMuZmVlZGJhY2tzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZmVlZGJhY2tcIik7XHJcbiAgICB0aGlzLmJsb2IgPSBudWxsOyAvLyBubyB1cGxvYWQgYnkgZGVmYXVsdFxyXG4gICAgdGhpcy5maWxlTmFtZSA9IFwiXCI7XHJcbiAgICB2YXIgY29ubmVjdGlvbkVsZW1lbnRzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiY29ubmVjdGlvbnNcIik7XHJcbiAgICB0aGlzLmNvbm5lY3Rpb25zID0gW107XHJcbiAgICBmb3IodmFyIGk9MDtpPGNvbm5lY3Rpb25FbGVtZW50cy5sZW5ndGg7aSsrKVxyXG4gICAgXHR0aGlzLmNvbm5lY3Rpb25zW2ldID0gcGFyc2VJbnQoY29ubmVjdGlvbkVsZW1lbnRzW2ldLmlubmVySFRNTCk7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgd2luZG93cyBmb3IgdGhpcyBxdWVzdGlvbiBiYXNlZCBvbiB0aGUgcXVlc3Rpb24gdHlwZVxyXG4gICAgdGhpcy5xdWVzdGlvblR5cGUgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwicXVlc3Rpb25UeXBlXCIpKTtcclxuICAgIHRoaXMuanVzdGlmaWNhdGlvbiA9IHRoaXMucXVlc3Rpb25UeXBlPT0xIHx8IHRoaXMucXVlc3Rpb25UeXBlPT0zO1xyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlIT01KXtcclxuXHRcdHRoaXMuY3JlYXRlVGFza1dpbmRvdyh4bWwsIHdpbmRvd3MudGFza1dpbmRvdyk7XHJcblx0XHR0aGlzLmNyZWF0ZVJlc291cmNlV2luZG93KHhtbCwgcmVzb3VyY2VzLCB3aW5kb3dzLnJlc291cmNlV2luZG93LCB3aW5kb3dzLnJlc291cmNlKTtcclxuXHR9XHJcblx0c3dpdGNoKHRoaXMucXVlc3Rpb25UeXBlKXtcclxuXHRcdGNhc2UgNTpcclxuXHRcdFx0dGhpcy5jcmVhdGVNZXNzYWdlV2luZG93KHhtbCwgd2luZG93cy5tZXNzYWdlV2luZG93KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHRjYXNlIDQ6XHJcblx0XHRcdHRoaXMuY3JlYXRlRmlsZVdpbmRvdyh3aW5kb3dzLmZpbGVXaW5kb3cpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgMzpcclxuXHRcdGNhc2UgMjpcclxuXHRcdGNhc2UgMTpcclxuXHRcdFx0dGhpcy5jcmVhdGVBbnN3ZXJXaW5kb3coeG1sLCB3aW5kb3dzLmFuc3dlcldpbmRvdyk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdH1cclxuICAgIFxyXG59XHJcblxyXG52YXIgcCA9IFF1ZXN0aW9uLnByb3RvdHlwZTtcclxuXHJcbnAuc2hvd1ByZXZTdWJtaXR0ZWRGaWxlcyA9IGZ1bmN0aW9uKGZpbGVzKSB7XHJcblx0Ly8gYWNrbm93bGVkZ2Ugc3VibWl0dGVkIGZpbGVzIGluIHRhc2sgd2luZG93XHJcblx0aWYoZmlsZXMubGVuZ3RoPjApXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdTdWJtaXR0ZWQgRmlsZXM6PGJyLz4nO1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJyc7XHJcblx0Zm9yKHZhciBpPTA7aTxmaWxlcztpKyspXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCArPSAnPHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK2ZpbGVzW2ldLm5hbWUrJzwvc3Bhbj48YnIvPic7XHJcbn1cclxuXHJcbnAud3JvbmdBbnN3ZXIgPSBmdW5jdGlvbihudW0pe1xyXG5cclxuICAvLyBJZiBmZWViYWNrIGRpc3BsYXkgaXRcclxuXHRpZih0aGlzLmZlZWRiYWNrcy5sZW5ndGg+MClcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1wiJytTdHJpbmcuZnJvbUNoYXJDb2RlKG51bSArIFwiQVwiLmNoYXJDb2RlQXQoKSkrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnXCIgaXMgbm90IGNvcnJlY3QgPGJyLz4mbmJzcDs8c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZlZWRiYWNrc1tudW1dLmlubmVySFRNTCsnPC9zcGFuPjxici8+JztcclxuXHRcclxufVxyXG5cclxucC5jb3JyZWN0QW5zd2VyID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBEaXNhYmxlIGFsbCB0aGUgYW5zd2VyIGJ1dHRvbnNcclxuXHRpZih0aGlzLmFuc3dlcnMpXHJcblx0XHRmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKVxyXG5cdFx0XHR0aGlzLmFuc3dlcnNbaV0uZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFxyXG5cdC8vIElmIGZlZWRiYWNrIGRpc3BsYXkgaXRcclxuXHRpZih0aGlzLmZlZWRiYWNrcy5sZW5ndGg+MClcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1wiJytTdHJpbmcuZnJvbUNoYXJDb2RlKHRoaXMuY29ycmVjdCArIFwiQVwiLmNoYXJDb2RlQXQoKSkrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnXCIgaXMgdGhlIGNvcnJlY3QgcmVzcG9uc2UgPGJyLz48c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZlZWRiYWNrc1t0aGlzLmNvcnJlY3RdLmlubmVySFRNTCsnPC9zcGFuPjxici8+JztcclxuXHRcclxuXHRcclxuXHRpZih0aGlzLnF1ZXN0aW9uVHlwZT09PTMgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnU3VibWl0dGVkIFRleHQ6PGJyLz48c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlPT09MSAmJiB0aGlzLmp1c3RpZmljYXRpb24udmFsdWUgIT0gJycpXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCArPSAnU3VibWl0dGVkIFRleHQ6PGJyLz48c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlPT09NCl7XHJcblx0XHRpZih0aGlzLmZpbGVJbnB1dC5maWxlcy5sZW5ndGg+MClcclxuXHRcdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnU3VibWl0dGVkIEZpbGVzOjxici8+JztcclxuXHRcdGVsc2VcclxuXHRcdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnJztcclxuXHRcdGZvcih2YXIgaT0wO2k8dGhpcy5maWxlSW5wdXQuZmlsZXMubGVuZ3RoO2krKylcclxuXHRcdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgKz0gJzxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+Jyt0aGlzLmZpbGVJbnB1dC5maWxlc1tpXS5uYW1lKyc8L3NwYW4+PGJyLz4nO1xyXG5cdH1cclxuICBcclxuICBpZih0aGlzLmN1cnJlbnRTdGF0ZSE9U09MVkVfU1RBVEUuU09MVkVEICYmIFxyXG4gICAgICgoKHRoaXMucXVlc3Rpb25UeXBlPT09MyB8fCB0aGlzLnF1ZXN0aW9uVHlwZT09PTEpICYmIHRoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSAhPSAnJykgfHxcclxuICAgICAgKHRoaXMucXVlc3Rpb25UeXBlPT09NCAmJiB0aGlzLmZpbGVJbnB1dC5maWxlcy5sZW5ndGg+MCkgfHxcclxuICAgICAgIHRoaXMucXVlc3Rpb25UeXBlPT09MikpeyBcclxuICAgIC8vIFNldCB0aGUgc3RhdGUgb2YgdGhlIHF1ZXN0aW9uIHRvIGNvcnJlY3RcclxuICAgIHRoaXMuY3VycmVudFN0YXRlID0gU09MVkVfU1RBVEUuU09MVkVEO1xyXG4gICAgLy8gaWYgdGhlcmUgaXMgYSBwcm9jZWVkIGJ1dHRvblxyXG4gICAgaWYgKHRoaXMucHJvY2VlZEVsZW1lbnQpIHsgXHJcblx0XHR0aGlzLnByb2NlZWRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7IC8vIGFuaW1hdGUgcHJvY2VlZCBidXR0b25cclxuXHR9XHJcbiAgfVxyXG5cdFxyXG59XHJcblxyXG5wLmRpc3BsYXlXaW5kb3dzID0gZnVuY3Rpb24oKXtcclxuXHRcclxuXHQvLyBBZGQgdGhlIHdpbmRvd3MgdG8gdGhlIHdpbmRvdyBkaXZcclxuXHR2YXIgd2luZG93Tm9kZSA9IHRoaXMud2luZG93RGl2O1xyXG5cdHZhciBleGl0QnV0dG9uID0gbmV3IEltYWdlKCk7XHJcblx0ZXhpdEJ1dHRvbi5zcmMgPSBcIi4uL2ltZy9pY29uQ2xvc2UucG5nXCI7XHJcblx0ZXhpdEJ1dHRvbi5jbGFzc05hbWUgPSBcImV4aXQtYnV0dG9uXCI7XHJcblx0dmFyIHF1ZXN0aW9uID0gdGhpcztcclxuXHRleGl0QnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHsgcXVlc3Rpb24ud2luZG93RGl2LmlubmVySFRNTCA9ICcnOyB9O1xyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlPT09NSl7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMubWVzc2FnZSk7XHJcblx0ICAgIGV4aXRCdXR0b24uc3R5bGUubGVmdCA9IFwiNzV2d1wiO1xyXG5cdH1cclxuXHRlbHNle1xyXG5cdFx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLnRhc2spO1xyXG5cdFx0d2luZG93Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcik7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMucmVzb3VyY2UpO1xyXG5cdFx0ZXhpdEJ1dHRvbi5zdHlsZS5sZWZ0ID0gXCI4NXZ3XCI7XHJcblx0fVxyXG5cdGlmKHRoaXMuY3VycmVudFN0YXRlID09PSBTT0xWRV9TVEFURS5TT0xWRUQgJiYgdGhpcy5xdWVzdGlvblR5cGUgIT0gUVVFU1RJT05fVFlQRS5NRVNTQUdFKSAge1xyXG5cdFx0Ly8gaWYgdGhlcmUgaXMgYSBwcm9jZWVkIGJ1dHRvblxyXG5cdFx0aWYgKHRoaXMucHJvY2VlZEVsZW1lbnQpIHsgXHJcblx0XHRcdHRoaXMucHJvY2VlZEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gYW5pbWF0ZSBwcm9jZWVkIGJ1dHRvblxyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKGV4aXRCdXR0b24pO1xyXG5cdFxyXG59XHJcblxyXG5wLmNyZWF0ZVRhc2tXaW5kb3cgPSBmdW5jdGlvbih4bWwsIHdpbmRvdyl7XHJcblx0dGhpcy5wcm9jZWVkRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicHJvY2VlZENvbnRhaW5lclwiKTtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHRhc2sgd2luZG93IFxyXG5cdHRoaXMudGFzayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLnRhc2suY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuICAgIHRoaXMudGFzay5zdHlsZS50b3AgPSBcIjEwdmhcIjtcclxuICAgIHRoaXMudGFzay5zdHlsZS5sZWZ0ID0gXCI1dndcIjtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gdGhpcy50YXNrLmlubmVySFRNTC5yZXBsYWNlKFwiJXRpdGxlJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvbk5hbWVcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gdGhpcy50YXNrLmlubmVySFRNTC5yZXBsYWNlKFwiJWluc3RydWN0aW9ucyVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5zdHJ1Y3Rpb25zXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHRoaXMudGFzay5pbm5lckhUTUwucmVwbGFjZShcIiVxdWVzdGlvbiVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25UZXh0XCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5mZWVkYmFjayA9IHRoaXMudGFzay5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZmVlZGJhY2tcIilbMF07XHJcbn1cclxuXHJcbnAuY3JlYXRlUmVzb3VyY2VXaW5kb3cgPSBmdW5jdGlvbih4bWwsIHJlc291cmNlRmlsZXMsIHdpbmRvdywgcmVzb3VyY2VFbGVtZW50KXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIHJlc291cmNlIHdpbmRvdyBcclxuXHR0aGlzLnJlc291cmNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuXHR0aGlzLnJlc291cmNlLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcblx0dGhpcy5yZXNvdXJjZS5zdHlsZS50b3AgPSBcIjU1dmhcIjtcclxuXHR0aGlzLnJlc291cmNlLnN0eWxlLmxlZnQgPSBcIjV2d1wiO1xyXG5cdHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MID0gd2luZG93O1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIGluZGl2aWR1YWwgcmVzb3VjZXMgaWYgYW55XHJcblx0dmFyIHJlc291cmNlcyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInJlc291cmNlSW5kZXhcIik7XHJcbiAgICBpZihyZXNvdXJjZXMubGVuZ3RoID4gMCl7XHJcbiAgICBcdFxyXG4gICAgXHQvLyBHZXQgdGhlIGh0bWwgZm9yIGVhY2ggcmVzb3VyY2UgYW5kIHRoZW4gYWRkIHRoZSByZXN1bHQgdG8gdGhlIHdpbmRvd1xyXG4gICAgXHR2YXIgcmVzb3VyY2VIVE1MID0gJyc7XHJcblx0ICAgIGZvcih2YXIgaT0wO2k8cmVzb3VyY2VzLmxlbmd0aDtpKyspe1xyXG4gICAgXHRcdHZhciBjdXJSZXNvdXJjZSA9IHJlc291cmNlRWxlbWVudC5yZXBsYWNlKFwiJWljb24lXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLmljb24pO1xyXG5cdCAgICBcdGN1clJlc291cmNlID0gY3VyUmVzb3VyY2UucmVwbGFjZShcIiV0aXRsZSVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0udGl0bGUpO1xyXG5cdCAgICBcdGN1clJlc291cmNlID0gY3VyUmVzb3VyY2UucmVwbGFjZShcIiVsaW5rJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS5saW5rKTtcclxuXHQgICAgXHRyZXNvdXJjZUhUTUwgKz0gY3VyUmVzb3VyY2U7XHJcblx0ICAgIH1cclxuXHQgIFx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB0aGlzLnJlc291cmNlLmlubmVySFRNTC5yZXBsYWNlKFwiJXJlc291cmNlcyVcIiwgcmVzb3VyY2VIVE1MKTtcclxuXHRcdCAgICAgICAgXHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHQvLyBEaXNwbGF5IHRoYXQgdGhlcmUgYXJlbid0IGFueSByZXNvdXJjZXNcclxuXHRcdHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MID0gdGhpcy5yZXNvdXJjZS5pbm5lckhUTUwucmVwbGFjZShcIiVyZXNvdXJjZXMlXCIsIFwiTm8gcmVzb3VyY2VzIGhhdmUgYmVlbiBwcm92aWRlZCBmb3IgdGhpcyB0YXNrLlwiKTtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uc3R5bGUuY29sb3IgPSBcImdyZXlcIjtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjRkZGRkZGXCI7XHJcblx0XHR0aGlzLnJlc291cmNlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLmNsYXNzTmFtZSArPSBcIiwgY2VudGVyXCI7XHJcblx0fVxyXG59XHJcblxyXG5wLmNyZWF0ZUFuc3dlcldpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgd2luZG93KXtcclxuXHRcclxuXHQvLyBDcmVhdGUgdGhlIGFuc3dlciB3aW5kb3cgXHJcblx0dGhpcy5hbnN3ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG4gICAgdGhpcy5hbnN3ZXIuY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuICAgIHRoaXMuYW5zd2VyLnN0eWxlLnRvcCA9IFwiMTB2aFwiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUubGVmdCA9IFwiNTB2d1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuaW5uZXJIVE1MID0gd2luZG93O1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgdGhlIHRleHQgZWxlbWVudCBpZiBhbnlcclxuICAgIHZhciBxdWVzdGlvbiA9IHRoaXM7XHJcbiAgICB2YXIgc3VibWl0O1xyXG4gICAgaWYodGhpcy5qdXN0aWZpY2F0aW9uKXtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIpO1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5jbGFzc05hbWUgPSBcInN1Ym1pdFwiO1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmlubmVySFRNTCA9IFwiU3VibWl0XCI7XHJcbiAgICAgICAgdGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHRxdWVzdGlvbi5jb3JyZWN0QW5zd2VyKCk7XHJcbiAgICBcdH07XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgXHRcdGlmKHF1ZXN0aW9uLmp1c3RpZmljYXRpb24udmFsdWUubGVuZ3RoID4gMClcclxuICAgIFx0XHRcdHF1ZXN0aW9uLmp1c3RpZmljYXRpb24uc3VibWl0LmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICBcdFx0ZWxzZVxyXG4gICAgXHRcdFx0cXVlc3Rpb24uanVzdGlmaWNhdGlvbi5zdWJtaXQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgXHR9LCBmYWxzZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSBhbmQgZ2V0IGFsbCB0aGUgYW5zd2VyIGVsZW1lbnRzXHJcbiAgICB0aGlzLmFuc3dlcnMgPSBbXTtcclxuICAgIHZhciBhbnN3ZXJzWG1sID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYW5zd2VyXCIpO1xyXG4gICAgdmFyIGNvcnJlY3QgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwiY29ycmVjdEFuc3dlclwiKSk7XHJcbiAgICBmb3IodmFyIGk9MDtpPGFuc3dlcnNYbWwubGVuZ3RoO2krKyl7XHJcbiAgICBcdGlmKHRoaXMuanVzdGlmaWNhdGlvbilcclxuICAgIFx0XHR0aGlzLmp1c3RpZmljYXRpb24uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgXHR0aGlzLmFuc3dlcnNbaV0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgXHRpZihjb3JyZWN0PT09aSlcclxuICAgIFx0XHR0aGlzLmFuc3dlcnNbaV0uY2xhc3NOYW1lID0gXCJjb3JyZWN0XCI7XHJcbiAgICBcdGVsc2VcclxuICAgIFx0XHR0aGlzLmFuc3dlcnNbaV0uY2xhc3NOYW1lID0gXCJ3cm9uZ1wiO1xyXG4gICAgXHR0aGlzLmFuc3dlcnNbaV0uaW5uZXJIVE1MID0gU3RyaW5nLmZyb21DaGFyQ29kZShpICsgXCJBXCIuY2hhckNvZGVBdCgpKStcIi4gXCIrYW5zd2Vyc1htbFtpXS5pbm5lckhUTUw7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgZXZlbnRzIGZvciB0aGUgYW5zd2Vyc1xyXG4gICAgZm9yKHZhciBpPTA7aTx0aGlzLmFuc3dlcnMubGVuZ3RoO2krKyl7XHJcblx0ICBpZih0aGlzLmFuc3dlcnNbaV0uY2xhc3NOYW1lID09IFwid3JvbmdcIil7XHJcblx0XHR0aGlzLmFuc3dlcnNbaV0ubnVtID0gaTtcclxuICAgICAgICB0aGlzLmFuc3dlcnNbaV0ub25jbGljayA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICB0aGlzLmRpc2FibGVkID0gdHJ1ZTtcclxuXHRcdCAgcXVlc3Rpb24ud3JvbmdBbnN3ZXIodGhpcy5udW0pO1xyXG5cdCAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2V7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuXHQgICAgICBpZihxdWVzdGlvbi5qdXN0aWZpY2F0aW9uKVxyXG5cdCAgICAgICAgcXVlc3Rpb24uanVzdGlmaWNhdGlvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG5cdCAgICAgIHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuXHQgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBBZGQgdGhlIGFuc3dlcnMgdG8gdGhlIHdpbmRvd1xyXG4gICAgZm9yKHZhciBpPTA7aTx0aGlzLmFuc3dlcnMubGVuZ3RoO2krKylcclxuICAgICAgdGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5hbnN3ZXJzW2ldKTtcclxuICAgIGlmKHRoaXMuanVzdGlmaWNhdGlvbil7XHJcbiAgICBcdHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLmFwcGVuZENoaWxkKHRoaXMuanVzdGlmaWNhdGlvbik7XHJcbiAgICBcdHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJ3aW5kb3dDb250ZW50XCIpWzBdLmFwcGVuZENoaWxkKHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5wLmNyZWF0ZUZpbGVXaW5kb3cgPSBmdW5jdGlvbih3aW5kb3cpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgZmlsZSB3aW5kb3cgXHJcblx0dGhpcy5hbnN3ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG4gICAgdGhpcy5hbnN3ZXIuY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuICAgIHRoaXMuYW5zd2VyLnN0eWxlLnRvcCA9IFwiMTB2aFwiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUubGVmdCA9IFwiNTB2d1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuaW5uZXJIVE1MID0gd2luZG93O1xyXG4gICAgdGhpcy5maWxlSW5wdXQgPSB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlucHV0XCIpWzBdO1xyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHRoaXMuZmlsZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZXZlbnQpe1xyXG4gICAgXHRcdC8vIE1ha2Ugc3VyZSBhIHZhbGlkIGZpbGUgd2FzIGNob3NlbiAoY3VycmVudGx5IG5vdCBpbXBsZW1lbnRlZClcclxuXHRcdFx0aWYoZmFsc2Upe1xyXG5cdFx0XHRcdGFsZXJ0KFwiWW91IGRpZG4ndCBjaG9vc2UgYW4gaXBhciBmaWxlISB5b3UgY2FuIG9ubHkgbG9hZCBpcGFyIGZpbGVzIVwiKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8qLy8gQ3JlYXRlIGEgcmVhZGVyIGFuZCByZWFkIHRoZSB6aXBcclxuXHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblx0XHRcdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG5cdFx0XHR9O1xyXG5cdFx0XHQvLyByZWFkIHRoZSBmaXJzdCBmaWxlXHJcblx0XHRcdHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihldmVudC50YXJnZXQuZmlsZXNbMF0pOyovXHJcblx0XHRcdFxyXG5cdFx0XHRxdWVzdGlvbi5maWxlTmFtZSA9IGV2ZW50LnRhcmdldC5maWxlc1swXS5uYW1lO1xyXG5cdFx0XHRxdWVzdGlvbi5ibG9iID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdLnNsaWNlKCk7XHJcblxyXG5cdFx0XHRcclxuXHQgICAgcXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG4gICAgfSk7XHJcbiAgICBcclxufVxyXG5cclxucC5jcmVhdGVNZXNzYWdlV2luZG93ID0gZnVuY3Rpb24oeG1sLCB3aW5kb3cpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgZmlsZSB3aW5kb3cgXHJcblx0dGhpcy5tZXNzYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuICAgIHRoaXMubWVzc2FnZS5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLnN0eWxlLnRvcCA9IFwiMTB2aFwiO1xyXG4gICAgdGhpcy5tZXNzYWdlLnN0eWxlLmxlZnQgPSBcIjQwdndcIjtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJXRpdGxlJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvbk5hbWVcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJWluc3RydWN0aW9ucyVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5zdHJ1Y3Rpb25zXCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHRoaXMubWVzc2FnZS5pbm5lckhUTUwucmVwbGFjZShcIiVxdWVzdGlvbiVcIiwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicXVlc3Rpb25UZXh0XCIpWzBdLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZywgJzxici8+JykpO1xyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHRoaXMubWVzc2FnZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKVswXS5vbmNsaWNrID0gZnVuY3Rpb24oKSB7XHJcbiAgICBcdHF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9IFNPTFZFX1NUQVRFLlNPTFZFRDtcclxuICAgIFx0cXVlc3Rpb24ud2luZG93RGl2LmlubmVySFRNTCA9ICcnO1xyXG4gICAgfTtcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb247XHJcbm1vZHVsZS5leHBvcnRzLlNPTFZFX1NUQVRFID0gU09MVkVfU1RBVEU7IiwiXHJcblxyXG5mdW5jdGlvbiBRdWVzdGlvbldpbmRvd3MoY2FsbGJhY2spe1xyXG4gIHRoaXMubG9hZFdpbmRvd3MoY2FsbGJhY2spO1xyXG59XHJcblxyXG52YXIgcCA9IFF1ZXN0aW9uV2luZG93cy5wcm90b3R5cGU7XHJcblxyXG5wLmxvYWRXaW5kb3dzID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cclxuICB2YXIgY291bnRlciA9IDA7XHJcbiAgdmFyIGNiID0gZnVuY3Rpb24oKXtcclxuXHQgIGlmKCsrY291bnRlcj49NiAmJiBjYWxsYmFjaylcclxuXHRcdCAgY2FsbGJhY2soKTtcclxuICB9O1xyXG4gIHRoaXMubG9hZFRhc2tXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZFJlc291cmNlV2luZG93KGNiKTtcclxuICB0aGlzLmxvYWRBbnN3ZXJXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZEZpbGVXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZE1lc3NhZ2VXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZFJlc291cmNlKGNiKTtcclxuICBcclxufVxyXG5cclxucC5sb2FkVGFza1dpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciB0YXNrIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgdGFzayB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy50YXNrV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgIFx0aWYoY2FsbGJhY2spXHJcblx0ICAgIFx0ICBjYWxsYmFjaygpO1xyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcInRhc2tXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxuXHJcbnAubG9hZFJlc291cmNlV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIHJlc291cmNlIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgcmVzb3VyY2Ugd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MucmVzb3VyY2VXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgICAgIGlmKGNhbGxiYWNrKVxyXG5cdCAgICAgICAgXHRjYWxsYmFjaygpO1xyXG5cdCAgICB9XHJcblx0fTtcclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJyZXNvdXJjZVdpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5wLmxvYWRSZXNvdXJjZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gR2V0IHRoZSBodG1sIGZvciBlYWNoIHJlc291cmNlIGFuZCB0aGVuIGFkZCB0aGUgcmVzdWx0IHRvIHRoZSB3aW5kb3dcclxuXHQgICAgXHR3aW5kb3dzLnJlc291cmNlID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgICAgICBpZihjYWxsYmFjaylcclxuXHQgICAgICAgIFx0Y2FsbGJhY2soKTtcclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJyZXNvdXJjZS5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5wLmxvYWRBbnN3ZXJXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgYW5zd2VyIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgYW5zd2VyIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLmFuc3dlcldpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICAgICAgaWYoY2FsbGJhY2spXHJcblx0ICAgICAgICBcdGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwiYW5zd2VyV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZEZpbGVXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgZmlsZSB3aW5kb3dzXHJcblx0dmFyIHdpbmRvd3MgPSB0aGlzO1xyXG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0cmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuXHQgICAgaWYgKHJlcXVlc3QucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcXVlc3Quc3RhdHVzID09IDIwMCkge1xyXG5cdCAgICBcdFxyXG5cdCAgICBcdC8vIFNhdmUgdGhlIGZpbGUgd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MuZmlsZVdpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICBcdGlmKGNhbGxiYWNrKVxyXG5cdCAgICBcdFx0Y2FsbGJhY2soKTtcclxuXHQgICAgICAgIFxyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcImZpbGVXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxucC5sb2FkTWVzc2FnZVdpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBtZXNzYWdlIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgbWVzc2FnZSB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5tZXNzYWdlV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0XHQgICAgaWYoY2FsbGJhY2spXHJcblx0XHQgICAgXHRjYWxsYmFjaygpO1xyXG5cclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJtZXNzYWdlV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb25XaW5kb3dzOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKFwiLi9xdWVzdGlvbi5qc1wiKTtcclxuXHJcbi8vIENyZWF0ZXMgYSBjYXRlZ29yeSB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBmcm9tIHRoZSBnaXZlbiB4bWxcclxuZnVuY3Rpb24gUmVzb3VyY2UoeG1sLCB1cmwpe1xyXG5cdFxyXG5cdC8vIEZpcnN0IGdldCB0aGUgaWNvblxyXG5cdCAgdmFyIHR5cGUgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwidHlwZVwiKSk7XHJcblx0ICBzd2l0Y2godHlwZSl7XHJcblx0ICAgIGNhc2UgMDpcclxuXHQgICAgICB0aGlzLmljb24gPSAnLi4vaW1nL2ljb25SZXNvdXJjZUZpbGUucG5nJztcclxuXHQgICAgICBicmVhaztcclxuXHQgICAgY2FzZSAxOlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICcuLi9pbWcvaWNvblJlc291cmNlTGluay5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBjYXNlIDI6XHJcbiAgICBcdCAgdGhpcy5pY29uID0gJy4uL2ltZy9pY29uUmVzb3VyY2VWaWRlby5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBkZWZhdWx0OlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgfVxyXG5cclxuXHQgIC8vIE5leHQgZ2V0IHRoZSB0aXRsZVxyXG5cdCAgdGhpcy50aXRsZSA9IHhtbC5nZXRBdHRyaWJ1dGUoXCJ0ZXh0XCIpO1xyXG5cclxuXHQgIC8vIExhc3QgZ2V0IHRoZSBsaW5rXHJcblx0ICBpZih0eXBlPjApXHJcblx0ICAgIHRoaXMubGluayA9IHhtbC5nZXRBdHRyaWJ1dGUoXCJsaW5rXCIpO1xyXG5cdCAgZWxzZVxyXG5cdCAgICB0aGlzLmxpbmsgPSB1cmwrJ2Fzc2V0cy9maWxlcy8nK3htbC5nZXRBdHRyaWJ1dGUoXCJsaW5rXCIpLnJlcGxhY2UoLyAvZywgJyUyMCcpO1xyXG4gICAgXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVzb3VyY2U7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxuXHJcbi8vTW9kdWxlIGV4cG9ydFxyXG52YXIgbSA9IG1vZHVsZS5leHBvcnRzO1xyXG5cclxuLy8gcmV0dXJucyBtb3VzZSBwb3NpdGlvbiBpbiBsb2NhbCBjb29yZGluYXRlIHN5c3RlbSBvZiBlbGVtZW50XHJcbm0uZ2V0TW91c2UgPSBmdW5jdGlvbihlKXtcclxuICAgIHJldHVybiBuZXcgUG9pbnQoKGUucGFnZVggLSBlLnRhcmdldC5vZmZzZXRMZWZ0KSwgKGUucGFnZVkgLSBlLnRhcmdldC5vZmZzZXRUb3ApKTtcclxufVxyXG5cclxuLy9yZXR1cm5zIGEgdmFsdWUgcmVsYXRpdmUgdG8gdGhlIHJhdGlvIGl0IGhhcyB3aXRoIGEgc3BlY2lmaWMgcmFuZ2UgXCJtYXBwZWRcIiB0byBhIGRpZmZlcmVudCByYW5nZVxyXG5tLm1hcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4xLCBtYXgxLCBtaW4yLCBtYXgyKXtcclxuICAgIHJldHVybiBtaW4yICsgKG1heDIgLSBtaW4yKSAqICgodmFsdWUgLSBtaW4xKSAvIChtYXgxIC0gbWluMSkpO1xyXG59XHJcblxyXG4vL2lmIGEgdmFsdWUgaXMgaGlnaGVyIG9yIGxvd2VyIHRoYW4gdGhlIG1pbiBhbmQgbWF4LCBpdCBpcyBcImNsYW1wZWRcIiB0byB0aGF0IG91dGVyIGxpbWl0XHJcbm0uY2xhbXAgPSBmdW5jdGlvbih2YWx1ZSwgbWluLCBtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWx1ZSkpO1xyXG59XHJcblxyXG4vL2RldGVybWluZXMgd2hldGhlciB0aGUgbW91c2UgaXMgaW50ZXJzZWN0aW5nIHRoZSBhY3RpdmUgZWxlbWVudFxyXG5tLm1vdXNlSW50ZXJzZWN0ID0gZnVuY3Rpb24ocE1vdXNlU3RhdGUsIHBFbGVtZW50LCBwT2Zmc2V0dGVyKXtcclxuICAgIGlmKHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54ID4gcEVsZW1lbnQucG9zaXRpb24ueCAtIHBFbGVtZW50LndpZHRoLzIgLSBwT2Zmc2V0dGVyLnggJiYgcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPCBwRWxlbWVudC5wb3NpdGlvbi54ICsgcEVsZW1lbnQud2lkdGgvMiAtIHBPZmZzZXR0ZXIueCl7XHJcbiAgICAgICAgaWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPiBwRWxlbWVudC5wb3NpdGlvbi55IC0gcEVsZW1lbnQuaGVpZ2h0LzIgLSBwT2Zmc2V0dGVyLnkgJiYgcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgPCBwRWxlbWVudC5wb3NpdGlvbi55ICsgcEVsZW1lbnQuaGVpZ2h0LzIgLSBwT2Zmc2V0dGVyLnkpe1xyXG4gICAgICAgICAgICAvL3BFbGVtZW50Lm1vdXNlT3ZlciA9IHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICBwTW91c2VTdGF0ZS5oYXNUYXJnZXQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAvL3BFbGVtZW50Lm1vdXNlT3ZlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZXtcclxuICAgIFx0cmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIHhtbCBvYmplY3Qgb2YgYSBzdHJpbmdcclxubS5nZXRYbWwgPSBmdW5jdGlvbih4bWwpe1xyXG5cdHZhciB4bWxEb2M7XHJcblx0aWYgKHdpbmRvdy5ET01QYXJzZXIpe1xyXG5cdFx0dmFyIHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuXHRcdHhtbERvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoeG1sLCBcInRleHQveG1sXCIpO1xyXG5cdH1cclxuXHRlbHNleyAvLyBJRVxyXG5cdFx0eG1sRG9jID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MRE9NXCIpO1xyXG5cdFx0eG1sRG9jLmFzeW5jID0gZmFsc2U7XHJcblx0XHR4bWxEb2MubG9hZFhNTCh4bWwpO1xyXG5cdH1cclxuXHRyZXR1cm4geG1sRG9jO1xyXG59XHJcblxyXG4vLyBnZXRzIHRoZSBzY2FsZSBvZiB0aGUgZmlyc3QgcGFyYW1ldGVyIHRvIHRoZSBzZWNvbmQgKHdpdGggdGhlIHNlY29uZCBmaXR0aW5nIGluc2lkZSB0aGUgZmlyc3QpXHJcbm0uZ2V0U2NhbGUgPSBmdW5jdGlvbih2aXJ0dWFsLCBhY3R1YWwpe1xyXG5cdHJldHVybiBhY3R1YWwueS92aXJ0dWFsLngqdmlydHVhbC55IDwgYWN0dWFsLnggPyBhY3R1YWwueS92aXJ0dWFsLnkgOiBhY3R1YWwueC92aXJ0dWFsLng7XHJcbn1cclxuXHJcbm0ucmVwbGFjZUFsbCA9IGZ1bmN0aW9uIChzdHIsIHRhcmdldCwgcmVwbGFjZW1lbnQpIHtcclxuXHR3aGlsZSAoc3RyLmluZGV4T2YodGFyZ2V0KSA8IDApIHtcclxuXHRcdHN0ciA9IHN0ci5yZXBsYWNlKHRhcmdldCxyZXBsYWNlbWVudCk7XHJcblx0fVxyXG5cdHJldHVybiBzdHI7XHJcbn0iXX0=
