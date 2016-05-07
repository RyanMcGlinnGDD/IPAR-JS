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
    canvas.addEventListener("mousemove", function(e){
        var boundRect = canvas.getBoundingClientRect();
        mousePosition = new Point(e.clientX - boundRect.left, e.clientY - boundRect.top);
        relativeMousePosition = new Point(mousePosition.x - (canvas.offsetWidth/2.0), mousePosition.y - (canvas.offsetHeight/2.0));        
    });
    this.mouseDown = false;
    canvas.addEventListener("mousedown", function(e){
    	mouseState.mouseDown = true;
    });
    canvas.addEventListener("mouseup", function(e){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJib2FyZC9qcy9tYWluLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9ib2FyZC5qcyIsImJvYXJkL2pzL21vZHVsZXMvYnV0dG9uLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9jYXRlZ29yeS5qcyIsImJvYXJkL2pzL21vZHVsZXMvY29uc3RhbnRzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9kcmF3TGliLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9maWxlTWFuYWdlci5qcyIsImJvYXJkL2pzL21vZHVsZXMvZ2FtZS5qcyIsImJvYXJkL2pzL21vZHVsZXMvaXBhckRhdGFQYXJzZXIuanMiLCJib2FyZC9qcy9tb2R1bGVzL2xlc3Nvbk5vZGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL21vdXNlU3RhdGUuanMiLCJib2FyZC9qcy9tb2R1bGVzL3BvaW50LmpzIiwiYm9hcmQvanMvbW9kdWxlcy9xdWVzdGlvbi5qcyIsImJvYXJkL2pzL21vZHVsZXMvcXVlc3Rpb25XaW5kb3dzLmpzIiwiYm9hcmQvanMvbW9kdWxlcy9yZXNvdXJjZXMuanMiLCJib2FyZC9qcy9tb2R1bGVzL3V0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9VQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xyXG4vL2ltcG9ydHNcclxudmFyIEdhbWUgPSByZXF1aXJlKCcuL21vZHVsZXMvZ2FtZS5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL21vZHVsZXMvcG9pbnQuanMnKTtcclxudmFyIE1vdXNlU3RhdGUgPSByZXF1aXJlKCcuL21vZHVsZXMvbW91c2VTdGF0ZS5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NvbnN0YW50cy5qcycpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9tb2R1bGVzL3V0aWxpdGllcy5qcycpO1xyXG5cclxuLy9nYW1lIG9iamVjdHNcclxudmFyIGdhbWU7XHJcbnZhciBjYW52YXM7XHJcbnZhciBjdHg7XHJcblxyXG4vLyB3aW5kb3cgZGl2LCBmaWxtLCB6b29tIGFuZCBpZiBwYXVzZWRcclxudmFyIHdpbmRvd0RpdjtcclxudmFyIHdpbmRvd0ZpbG07XHJcbnZhciBwcm9jZWVkQ29udGFpbmVyO1xyXG52YXIgcHJvY2VlZExvbmc7XHJcbnZhciBwcm9jZWVkUm91bmQ7XHJcbnZhciBwYXVzZWRUaW1lID0gMDtcclxudmFyIHpvb21TbGlkZXI7XHJcblxyXG4vL3BlcnNpc3RlbnQgdXRpbGl0aWVzXHJcbnZhciBwcmV2VGltZTsgLy8gZGF0ZSBpbiBtaWxsaXNlY29uZHNcclxudmFyIGR0OyAvLyBkZWx0YSB0aW1lIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuLy9maXJlcyB3aGVuIHRoZSB3aW5kb3cgbG9hZHNcclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgaW5pdGlhbGl6ZVZhcmlhYmxlcygpO1xyXG4gICAgbG9vcCgpO1xyXG59XHJcblxyXG4vL2luaXRpYWxpemF0aW9uLCBtb3VzZSBldmVudHMsIGFuZCBnYW1lIGluc3RhbnRpYXRpb25cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVZhcmlhYmxlcygpe1xyXG5cdHdpbmRvd0RpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3aW5kb3cnKTtcclxuICAgIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxuICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gICAgcHJvY2VlZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQ29udGFpbmVyJyk7XHJcbiAgICBwcm9jZWVkTG9uZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9jZWVkQnRuTG9uZycpO1xyXG4gICAgcHJvY2VlZFJvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Byb2NlZWRCdG5Sb3VuZCcpO1xyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLm9mZnNldFdpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5vZmZzZXRIZWlnaHQ7XHJcblxyXG4gICAgLy8gU2V0dXAgdGhlIHdpbmRvdyBmaWxtXHJcblx0d2luZG93RmlsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3aW5kb3dGbGltJyk7XHJcblx0d2luZG93RmlsbS5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IHdpbmRvd0Rpdi5pbm5lckhUTUwgPSAnJzsgfTtcclxuXHRcclxuXHQvLyBTZXR1cCBkdFxyXG4gICAgcHJldlRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgZHQgPSAwO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgdGhlIGdhbWVcclxuICAgIGdhbWUgPSBuZXcgR2FtZShsb2NhbFN0b3JhZ2VbJ2Nhc2VGaWxlcyddLCBjYW52YXMsIHdpbmRvd0Rpdik7XHJcbiAgICBcclxuXHQvLyBTZXR1cCB0aGUgem9vbSBidXR0b25zL3NsaWRlciBhbmQgc2NhbGUgb2YgdGhlIGdhbWVcclxuICAgIHpvb21TbGlkZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbS1zbGlkZXInKTtcclxuXHR6b29tU2xpZGVyLm9uaW5wdXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcblx0fTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tLWluJykub25jbGljayA9IGZ1bmN0aW9uKCkge1xyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBEb3duKCk7XHJcblx0XHRnYW1lLnVwZGF0ZVpvb20oLXBhcnNlRmxvYXQoem9vbVNsaWRlci52YWx1ZSkpOyBcclxuICAgIH07XHJcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tb3V0Jykub25jbGljayA9IGZ1bmN0aW9uKCkgeyBcclxuXHRcdHpvb21TbGlkZXIuc3RlcFVwKCk7IFxyXG5cdFx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcblx0fTtcclxuXHRnYW1lLm9uQ2hhbmdlQm9hcmQgPSBmdW5jdGlvbigpIHtcclxuXHRcdHpvb21TbGlkZXIudmFsdWUgPSAtZ2FtZS5nZXRab29tKCk7XHJcblx0fTtcclxuICAgIGdhbWUuc2NhbGUgPSBVdGlsaXRpZXMuZ2V0U2NhbGUoQ29uc3RhbnRzLmJvYXJkU2l6ZSwgbmV3IFBvaW50KGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCkpO1xyXG59XHJcblxyXG4vL2ZpcmVzIG9uY2UgcGVyIGZyYW1lXHJcbmZ1bmN0aW9uIGxvb3AoKXtcclxuXHQvLyBsb29wXHJcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3AuYmluZCh0aGlzKSk7XHJcbiAgICBcclxuXHQvLyB1cGRhdGUgZGVsdGEgdGltZVxyXG4gICAgZHQgPSBEYXRlLm5vdygpIC0gcHJldlRpbWU7XHJcbiAgICBwcmV2VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIC8vIHVwZGF0ZSBnYW1lXHJcbiAgICBnYW1lLnVwZGF0ZShjdHgsIGNhbnZhcywgZHQpO1xyXG4gICAgXHJcbiAgICAvLyBDaGVjayBpZiBzaG91bGQgcGF1c2VcclxuICAgIGlmKGdhbWUuYWN0aXZlICYmIHdpbmRvd0Rpdi5pbm5lckhUTUwhPScnICYmIHBhdXNlZFRpbWUrKz4zKXtcclxuICAgIFx0Z2FtZS5hY3RpdmUgPSBmYWxzZTtcclxuICAgIFx0d2luZG93RmlsbS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgIH1cclxuICAgIGVsc2UgaWYocGF1c2VkVGltZSE9MCAmJiB3aW5kb3dEaXYuaW5uZXJIVE1MPT0nJyl7XHJcbiAgICBcdHdpbmRvd0Nsb3NlZCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vL2xpc3RlbnMgZm9yIGNoYW5nZXMgaW4gc2l6ZSBvZiB3aW5kb3cgYW5kIGFkanVzdHMgdmFyaWFibGVzIGFjY29yZGluZ2x5XHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgY2FudmFzLndpZHRoID0gY2FudmFzLm9mZnNldFdpZHRoO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5vZmZzZXRIZWlnaHQ7XHJcbiAgICBcclxuICAgIC8vIEdldCB0aGUgbmV3IHNjYWxlXHJcbiAgICBnYW1lLnNjYWxlID0gVXRpbGl0aWVzLmdldFNjYWxlKENvbnN0YW50cy5ib2FyZFNpemUsIG5ldyBQb2ludChjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpKTtcclxuICAgIFxyXG59KTtcclxuXHJcbi8vbGlzdGVucyBmb3IgbW91c2Ugd2hlZWxcclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgIGlmKGV2ZW50LmRlbHRhWTwwKVxyXG4gICAgXHR6b29tU2xpZGVyLnN0ZXBEb3duKCk7XHJcbiAgICBlbHNlXHJcbiAgICBcdHpvb21TbGlkZXIuc3RlcFVwKCk7XHJcblx0Z2FtZS51cGRhdGVab29tKC1wYXJzZUZsb2F0KHpvb21TbGlkZXIudmFsdWUpKTsgXHJcbiAgICByZXR1cm4gZmFsc2U7IFxyXG59LCBmYWxzZSk7XHJcblxyXG4vLyBDYWxsZWQgd2hlbiB0aGUgcXVlc3Rpb24gd2luZG93IGNsb3Nlc1xyXG5mdW5jdGlvbiB3aW5kb3dDbG9zZWQoKXtcclxuXHRcclxuXHQvLyBVbnBhdXNlIHRoZSBnYW1lIGFuZCBmdWxseSBjbG9zZSB0aGUgd2luZG93XHJcblx0cGF1c2VkVGltZSA9IDA7XHJcblx0Z2FtZS5hY3RpdmUgPSB0cnVlO1xyXG5cdHdpbmRvd0ZpbG0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHRwcm9jZWVkQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcclxuXHRnYW1lLndpbmRvd0Nsb3NlZCgpO1xyXG5cdFxyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlsaXRpZXMgPSByZXF1aXJlKCcuL3V0aWxpdGllcy5qcycpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY29uc3RhbnRzLmpzXCIpO1xyXG52YXIgRHJhd0xpYiA9IHJlcXVpcmUoXCIuL2RyYXdsaWIuanNcIik7XHJcblxyXG4vL3BhcmFtZXRlciBpcyBhIHBvaW50IHRoYXQgZGVub3RlcyBzdGFydGluZyBwb3NpdGlvblxyXG5mdW5jdGlvbiBib2FyZChzdGFydFBvc2l0aW9uLCBsZXNzb25Ob2Rlcyl7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMubGVzc29uTm9kZUFycmF5ID0gbGVzc29uTm9kZXM7XHJcbiAgICB0aGlzLmJvYXJkT2Zmc2V0ID0gc3RhcnRQb3NpdGlvbjtcclxuICAgIHRoaXMucHJldkJvYXJkT2Zmc2V0ID0ge3g6MCx5OjB9O1xyXG4gICAgdGhpcy56b29tID0gQ29uc3RhbnRzLnN0YXJ0Wm9vbTtcclxuICAgIHRoaXMuc3RhZ2UgPSAwO1xyXG4gICAgdGhpcy5sYXN0U2F2ZVRpbWUgPSAwOyAvLyBhc3N1bWUgbm8gY29va2llXHJcbiAgICB0aGlzLmxhc3RRdWVzdGlvbiA9IG51bGw7XHJcbiAgICB0aGlzLmxhc3RRdWVzdGlvbk51bSA9IC0xO1xyXG4gICAgXHJcbiAgICAvL2lmIChkb2N1bWVudC5jb29raWUpIHRoaXMubG9hZENvb2tpZSgpOyBcclxuXHJcblx0Ly8gQ2hlY2sgaWYgYWxsIG5vZGVzIGFyZSBzb2x2ZWRcclxuXHR2YXIgZG9uZSA9IHRydWU7XHJcblx0Zm9yKHZhciBpPTA7aTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGggJiYgZG9uZTtpKyspXHJcblx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0ZG9uZSA9IGZhbHNlO1xyXG5cdGlmKGRvbmUpXHJcblx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRlbHNlXHJcblx0XHR0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcbn1cclxuXHJcbi8vcHJvdG90eXBlXHJcbnZhciBwID0gYm9hcmQucHJvdG90eXBlO1xyXG5cclxucC5tb3ZlID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuICAgIHRoaXMucG9zaXRpb24ueCArPSBwWDtcclxuICAgIHRoaXMucG9zaXRpb24ueSArPSBwWTtcclxuICAgIHRoaXMuYm9hcmRPZmZzZXQgPSB7eDowLHk6MH07XHJcbiAgICB0aGlzLnByZXZCb2FyZE9mZnNldCA9IHt4OjAseTowfTtcclxufTtcclxuXHJcbnAuYWN0ID0gZnVuY3Rpb24ocE1vdXNlU3RhdGUsIGR0KSB7XHJcblx0XHJcblx0Ly8gZm9yIGVhY2ggIG5vZGVcclxuICAgIGZvcih2YXIgaT0wOyBpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aDsgaSsrKXtcclxuICAgIFx0dmFyIGFjdGl2ZU5vZGUgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXTsgXHJcblx0XHQvLyBoYW5kbGUgc29sdmVkIHF1ZXN0aW9uXHJcblx0XHRpZiAoYWN0aXZlTm9kZS5jdXJyZW50U3RhdGUgIT0gUXVlc3Rpb24uU09MVkVfU1RBVEUuU09MVkVEICYmIGFjdGl2ZU5vZGUucXVlc3Rpb24uY3VycmVudFN0YXRlID09IFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCkge1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gdXBkYXRlIGVhY2ggY29ubmVjdGlvbidzIGNvbm5lY3Rpb24gbnVtYmVyXHJcblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYWN0aXZlTm9kZS5xdWVzdGlvbi5jb25uZWN0aW9ucy5sZW5ndGg7IGorKylcclxuXHRcdFx0XHR0aGlzLmxlc3Nvbk5vZGVBcnJheVthY3RpdmVOb2RlLnF1ZXN0aW9uLmNvbm5lY3Rpb25zW2pdIC0gMV0uY29ubmVjdGlvbnMrKztcclxuXHRcdFx0XHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSdzIHN0YXRlXHJcblx0XHRcdGFjdGl2ZU5vZGUuY3VycmVudFN0YXRlID0gYWN0aXZlTm9kZS5xdWVzdGlvbi5jdXJyZW50U3RhdGU7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBDaGVjayBpZiBhbGwgbm9kZSdzIGFyZSBzb2x2ZWRcclxuXHRcdFx0dmFyIGRvbmUgPSB0cnVlO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPHRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aCAmJiBkb25lO2krKylcclxuXHRcdFx0XHRpZih0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRClcclxuXHRcdFx0XHRcdGRvbmUgPSBmYWxzZTtcclxuXHRcdFx0aWYoZG9uZSlcclxuXHRcdFx0XHR0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIHRoZXJlIGlzIGEgbGlzdGVuZXIgZm9yIHVwZGF0aW5nIG5vZGVzLCBjYWxsIGl0LlxyXG5cdFx0XHRpZih0aGlzLnVwZGF0ZU5vZGUpXHJcblx0XHRcdFx0dGhpcy51cGRhdGVOb2RlKCk7XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHVwZGF0ZSB0aGUgbm9kZSdzIHRyYW5zaXRpb24gcHJvZ3Jlc3NcclxuXHRcdGlmIChhY3RpdmVOb2RlLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdGFjdGl2ZU5vZGUubGluZVBlcmNlbnQgPSBNYXRoLm1pbigxLGR0KkNvbnN0YW50cy5saW5lU3BlZWQgKyBhY3RpdmVOb2RlLmxpbmVQZXJjZW50KTtcclxuXHR9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIG1vdXNlIGV2ZW50cyBpZiBnaXZlbiBhIG1vdXNlIHN0YXRlXHJcbiAgICBpZihwTW91c2VTdGF0ZSkge1xyXG5cdCAgICBcclxuXHQgICAgLy8gaG92ZXIgc3RhdGVzXHJcblx0XHQvL2Zvcih2YXIgaSA9IDA7IGkgPCBib2FyZEFycmF5Lmxlbmd0aDsgaSsrKXtcclxuXHRcdFx0Ly8gbG9vcCB0aHJvdWdoIGxlc3NvbiBub2RlcyB0byBjaGVjayBmb3IgaG92ZXJcclxuXHRcdFx0Ly8gdXBkYXRlIGJvYXJkXHJcblx0XHRcclxuXHQgICAgaWYgKCFwTW91c2VTdGF0ZS5tb3VzZURvd24gJiYgdGhpcy50YXJnZXQpIHtcclxuXHRcdFx0dGhpcy50YXJnZXQuZHJhZ1Bvc2l0aW9uID0gdW5kZWZpbmVkOyAvLyBjbGVhciBkcmFnIGJlaGF2aW9yXHJcblx0XHRcdHRoaXMudGFyZ2V0LmRyYWdnaW5nID0gZmFsc2U7XHJcblx0XHRcdHRoaXMudGFyZ2V0ID0gbnVsbDtcclxuXHRcdH1cclxuXHQgICAgXHJcblx0XHRmb3IgKHZhciBpPXRoaXMubGVzc29uTm9kZUFycmF5Lmxlbmd0aC0xLCBub2RlQ2hvc2VuOyBpPj0wICYmIHRoaXMudGFyZ2V0PT1udWxsOyBpLS0pIHtcclxuXHRcdFx0dmFyIGxOb2RlID0gdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV07XHJcblx0XHRcdFxyXG5cdFx0XHRsTm9kZS5tb3VzZU92ZXIgPSBmYWxzZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vY29uc29sZS5sb2coXCJub2RlIHVwZGF0ZVwiKTtcclxuXHRcdFx0Ly8gaWYgaG92ZXJpbmcsIHNob3cgaG92ZXIgZ2xvd1xyXG5cdFx0XHQvKmlmIChwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnggPiBsTm9kZS5wb3NpdGlvbi54LWxOb2RlLndpZHRoLzIgXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueCA8IGxOb2RlLnBvc2l0aW9uLngrbE5vZGUud2lkdGgvMlxyXG5cdFx0XHQmJiBwTW91c2VTdGF0ZS5yZWxhdGl2ZVBvc2l0aW9uLnkgPiBsTm9kZS5wb3NpdGlvbi55LWxOb2RlLmhlaWdodC8yXHJcblx0XHRcdCYmIHBNb3VzZVN0YXRlLnJlbGF0aXZlUG9zaXRpb24ueSA8IGxOb2RlLnBvc2l0aW9uLnkrbE5vZGUuaGVpZ2h0LzIpIHsqL1xyXG5cdFx0XHRpZiAoVXRpbGl0aWVzLm1vdXNlSW50ZXJzZWN0KHBNb3VzZVN0YXRlLGxOb2RlLHRoaXMuYm9hcmRPZmZzZXQpKSB7XHJcblx0XHRcdFx0bE5vZGUubW91c2VPdmVyID0gdHJ1ZTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldCA9IGxOb2RlO1xyXG5cdFx0XHRcdC8vY29uc29sZS5sb2cocE1vdXNlU3RhdGUuaGFzVGFyZ2V0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYodGhpcy50YXJnZXQpe1xyXG5cdFxyXG5cdFx0XHRpZighdGhpcy50YXJnZXQuZHJhZ2dpbmcpe1xyXG5cdFx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHRcdC8vIGRyYWdcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdnaW5nID0gdHJ1ZTtcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmRyYWdQb3NpdGlvbiA9IG5ldyBQb2ludChcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi54IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueCxcclxuXHRcdFx0XHRcdHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbi55IC0gdGhpcy50YXJnZXQucG9zaXRpb24ueVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKHBNb3VzZVN0YXRlLm1vdXNlQ2xpY2tlZCkge1xyXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGNsaWNrIGNvZGVcclxuXHRcdFx0XHRcdHRoaXMudGFyZ2V0LmNsaWNrKHBNb3VzZVN0YXRlKTtcclxuXHRcdFx0XHRcdHRoaXMubGFzdFF1ZXN0aW9uID0gdGhpcy50YXJnZXQucXVlc3Rpb247XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RRdWVzdGlvbk51bSA9IGk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxYID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueDtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi54ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWCxDb25zdGFudHMuYm9hcmRTaXplLnggLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WCA9IHRoaXMudGFyZ2V0LnBvc2l0aW9uLng7XHJcblx0XHRcdFx0dmFyIG5hdHVyYWxZID0gcE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLnRhcmdldC5kcmFnUG9zaXRpb24ueTtcclxuXHRcdFx0XHR0aGlzLnRhcmdldC5wb3NpdGlvbi55ID0gTWF0aC5tYXgoQ29uc3RhbnRzLmJvYXJkT3V0bGluZSxNYXRoLm1pbihuYXR1cmFsWSxDb25zdGFudHMuYm9hcmRTaXplLnkgLSBDb25zdGFudHMuYm9hcmRPdXRsaW5lKSk7XHJcblx0XHRcdFx0dGhpcy50YXJnZXQucXVlc3Rpb24ucG9zaXRpb25QZXJjZW50WSA9IHRoaXMudGFyZ2V0LnBvc2l0aW9uLnk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0ICB9XHJcblx0XHRcclxuXHRcdC8vIGRyYWcgdGhlIGJvYXJkIGFyb3VuZFxyXG5cdFx0aWYgKHRoaXMudGFyZ2V0PT1udWxsKSB7XHJcblx0XHRcdGlmIChwTW91c2VTdGF0ZS5tb3VzZURvd24pIHtcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy13ZWJraXQtZ3JhYmJpbmcnO1xyXG5cdFx0XHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLW1vei1ncmFiYmluZyc7XHJcblx0XHRcdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcblx0XHRcdFx0aWYgKCF0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQpIHtcclxuXHRcdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHBNb3VzZVN0YXRlLnZpcnR1YWxQb3NpdGlvbjtcclxuXHRcdFx0XHRcdHRoaXMucHJldkJvYXJkT2Zmc2V0LnggPSB0aGlzLmJvYXJkT2Zmc2V0Lng7XHJcblx0XHRcdFx0XHR0aGlzLnByZXZCb2FyZE9mZnNldC55ID0gdGhpcy5ib2FyZE9mZnNldC55O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnggLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueCk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC54ID4gdGhpcy5tYXhCb2FyZFdpZHRoLzIpIHRoaXMuYm9hcmRPZmZzZXQueCA9IHRoaXMubWF4Qm9hcmRXaWR0aC8yO1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuYm9hcmRPZmZzZXQueCA8IC0xKnRoaXMubWF4Qm9hcmRXaWR0aC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnggPSAtMSp0aGlzLm1heEJvYXJkV2lkdGgvMjtcclxuXHRcdFx0XHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHRoaXMucHJldkJvYXJkT2Zmc2V0LnkgLSAocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnkgLSB0aGlzLm1vdXNlU3RhcnREcmFnQm9hcmQueSk7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55ID4gdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSB0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0XHRpZiAodGhpcy5ib2FyZE9mZnNldC55IDwgLTEqdGhpcy5tYXhCb2FyZEhlaWdodC8yKSB0aGlzLmJvYXJkT2Zmc2V0LnkgPSAtMSp0aGlzLm1heEJvYXJkSGVpZ2h0LzI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubW91c2VTdGFydERyYWdCb2FyZCA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJyc7XHJcblx0XHRcdH1cclxuXHQgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5wLmRyYXcgPSBmdW5jdGlvbihjdHgsIGNhbnZhcyl7XHJcbiAgICBcclxuICAgIC8vIHNhdmUgY2FudmFzIHN0YXRlIGJlY2F1c2Ugd2UgYXJlIGFib3V0IHRvIGFsdGVyIHByb3BlcnRpZXNcclxuICAgIGN0eC5zYXZlKCk7ICAgXHJcblxyXG4gICAgLy8gVHJhbnNsYXRlIHRvIGNlbnRlciBvZiBzY3JlZW4gYW5kIHNjYWxlIGZvciB6b29tIHRoZW4gdHJhbnNsYXRlIGJhY2tcclxuICAgIGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoLzIsIGNhbnZhcy5oZWlnaHQvMik7XHJcbiAgICBjdHguc2NhbGUodGhpcy56b29tLCB0aGlzLnpvb20pO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSgtY2FudmFzLndpZHRoLzIsIC1jYW52YXMuaGVpZ2h0LzIpO1xyXG4gICAgLy8gbW92ZSB0aGUgYm9hcmQgdG8gd2hlcmUgdGhlIHVzZXIgZHJhZ2dlZCBpdFxyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMuYm9hcmRPZmZzZXQ7XHJcbiAgICAvL3RyYW5zbGF0ZSB0byB0aGUgY2VudGVyIG9mIHRoZSBib2FyZFxyXG4gICAgLy9jb25zb2xlLmxvZyh0aGlzKTtcclxuICAgIGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoLzIgLSB0aGlzLnBvc2l0aW9uLngsIGNhbnZhcy5oZWlnaHQvMiAtIHRoaXMucG9zaXRpb24ueSk7XHJcbiAgICBcclxuXHRcclxuICAgIC8vIERyYXcgdGhlIGJhY2tncm91bmQgb2YgdGhlIGJvYXJkXHJcbiAgICBEcmF3TGliLnJlY3QoY3R4LCAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngsIENvbnN0YW50cy5ib2FyZFNpemUueSwgXCIjRDNCMTg1XCIpO1xyXG4gICAgRHJhd0xpYi5zdHJva2VSZWN0KGN0eCwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgLUNvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS54K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55K0NvbnN0YW50cy5ib2FyZE91dGxpbmUvMiwgQ29uc3RhbnRzLmJvYXJkT3V0bGluZSwgXCIjQ0I5OTY2XCIpO1xyXG4gICAgXHJcblx0Ly8gZHJhdyB0aGUgbm9kZXNcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcbiAgICBcclxuICAgIFx0Ly8gdGVtcG9yYXJpbHkgaGlkZSBhbGwgYnV0IHRoZSBmaXJzdCBxdWVzdGlvblx0XHRcdFx0XHRcdC8vIHNvbWV0aGluZyBpcyB3cm9uZyBoZXJlLCBsaW5rc0F3YXlGcm9tT3JpZ2luIGRvZXMgbm90IGV4aXN0IGFueW1vcmVcclxuXHRcdC8vaWYgKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLnJldmVhbFRocmVzaG9sZCA+IHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmxpbmtzQXdheUZyb21PcmlnaW4pIGNvbnRpbnVlO1xyXG4gICAgXHRcclxuICAgIFx0Ly8gZHJhdyB0aGUgbm9kZSBpdHNlbGZcclxuICAgICAgICB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5kcmF3KGN0eCwgY2FudmFzKTtcclxuICAgIH1cclxuXHJcblx0Ly8gZHJhdyB0aGUgbGluZXNcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKyl7XHJcblx0XHRcclxuXHRcdC8vIG9ubHkgc2hvdyBsaW5lcyBmcm9tIHNvbHZlZCBxdWVzdGlvbnNcclxuXHRcdGlmICh0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jdXJyZW50U3RhdGUhPVF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRCkgY29udGludWU7XHJcblx0XHRcclxuXHRcdC8vIGdldCB0aGUgcGluIHBvc2l0aW9uXHJcbiAgICAgICAgdmFyIG9Qb3MgPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5nZXROb2RlUG9pbnQoKTtcclxuICAgICAgICBcclxuXHRcdC8vIHNldCBsaW5lIHN0eWxlXHJcblx0XHRjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMCwwLDEwNSwwLjIpXCI7XHJcblx0XHRjdHgubGluZVdpZHRoID0gMTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBkcmF3IGxpbmVzXHJcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPHRoaXMubGVzc29uTm9kZUFycmF5W2ldLnF1ZXN0aW9uLmNvbm5lY3Rpb25zLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIC0xIGJlY2FzZSBub2RlIGNvbm5lY3Rpb24gaW5kZXggdmFsdWVzIGFyZSAxLWluZGV4ZWQgYnV0IGNvbm5lY3Rpb25zIGlzIDAtaW5kZXhlZFxyXG5cdFx0XHRpZiAodGhpcy5sZXNzb25Ob2RlQXJyYXlbdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ucXVlc3Rpb24uY29ubmVjdGlvbnNbal0gLSAxXS5xdWVzdGlvbi5jdXJyZW50U3RhdGU9PVF1ZXN0aW9uLlNPTFZFX1NUQVRFLkhJRERFTikgY29udGludWU7XHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdC8vIGdvIHRvIHRoZSBpbmRleCBpbiB0aGUgYXJyYXkgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgY29ubmVjdGVkIG5vZGUgb24gdGhpcyBib2FyZCBhbmQgc2F2ZSBpdHMgcG9zaXRpb25cclxuICAgICAgICBcdC8vIGNvbm5lY3Rpb24gaW5kZXggc2F2ZWQgaW4gdGhlIGxlc3Nvbk5vZGUncyBxdWVzdGlvblxyXG4gICAgICAgIFx0dmFyIGNvbm5lY3Rpb24gPSB0aGlzLmxlc3Nvbk5vZGVBcnJheVt0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5xdWVzdGlvbi5jb25uZWN0aW9uc1tqXSAtIDFdO1xyXG4gICAgICAgIFx0dmFyIGNQb3MgPSBjb25uZWN0aW9uLmdldE5vZGVQb2ludCgpO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHQvLyBkcmF3IHRoZSBsaW5lXHJcbiAgICAgICAgXHRjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgXHQvLyB0cmFuc2xhdGUgdG8gc3RhcnQgKHBpbilcclxuICAgICAgICBcdGN0eC5tb3ZlVG8ob1Bvcy54LCBvUG9zLnkpO1xyXG4gICAgICAgIFx0Y3R4LmxpbmVUbyhvUG9zLnggKyAoY1Bvcy54IC0gb1Bvcy54KSp0aGlzLmxlc3Nvbk5vZGVBcnJheVtpXS5saW5lUGVyY2VudCwgb1Bvcy55ICsgKGNQb3MueSAtIG9Qb3MueSkqdGhpcy5sZXNzb25Ob2RlQXJyYXlbaV0ubGluZVBlcmNlbnQpO1xyXG4gICAgICAgIFx0Y3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgICAgIFx0Y3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbi8vIEdldHMgYSBmcmVlIG5vZGUgaW4gdGhpcyBib2FyZCAoaS5lLiBub3QgdW5zb2x2ZWQpIHJldHVybnMgbnVsbCBpZiBub25lXHJcbnAuZ2V0RnJlZU5vZGUgPSBmdW5jdGlvbigpIHtcclxuXHRmb3IodmFyIGk9MDsgaTx0aGlzLmxlc3Nvbk5vZGVBcnJheS5sZW5ndGg7IGkrKylcclxuXHRcdGlmKHRoaXMubGVzc29uTm9kZUFycmF5W2ldLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5VTlNPTFZFRClcclxuXHRcdFx0cmV0dXJuIHRoaXMubGVzc29uTm9kZUFycmF5W2ldO1xyXG5cdHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vLyBNb3ZlcyB0aGlzIGJvYXJkIHRvd2FyZHMgdGhlIGdpdmVuIHBvaW50XHJcbnAubW92ZVRvd2FyZHMgPSBmdW5jdGlvbihwb2ludCwgZHQsIHNwZWVkKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHZlY3RvciB0b3dhcmRzIHRoZSBnaXZlbiBwb2ludFxyXG5cdHZhciB0b1BvaW50ID0gbmV3IFBvaW50KHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54LCBwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSk7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSBkaXN0YW5jZSBvZiBzYWlkIHZlY3RvclxyXG5cdHZhciBkaXN0YW5jZSA9IE1hdGguc3FydCh0b1BvaW50LngqdG9Qb2ludC54K3RvUG9pbnQueSp0b1BvaW50LnkpO1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgbmV3IG9mZnNldCBvZiB0aGUgYm9hcmQgYWZ0ZXIgbW92aW5nIHRvd2FyZHMgdGhlIHBvaW50XHJcblx0dmFyIG5ld09mZnNldCA9IG5ldyBQb2ludCggdGhpcy5ib2FyZE9mZnNldC54ICsgdG9Qb2ludC54L2Rpc3RhbmNlKmR0KnNwZWVkLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5ib2FyZE9mZnNldC55ICsgdG9Qb2ludC55L2Rpc3RhbmNlKmR0KnNwZWVkKTtcclxuXHRcclxuXHQvLyBDaGVjayBpZiBwYXNzZWQgcG9pbnQgb24geCBheGlzIGFuZCBpZiBzbyBzZXQgdG8gcG9pbnQncyB4XHJcblx0aWYodGhpcy5ib2FyZE9mZnNldC54ICE9cG9pbnQueCAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueC1uZXdPZmZzZXQueCkvKHBvaW50LngtbmV3T2Zmc2V0LngpPT1NYXRoLmFicyhwb2ludC54LXRoaXMuYm9hcmRPZmZzZXQueCkvKHBvaW50LngtdGhpcy5ib2FyZE9mZnNldC54KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IG5ld09mZnNldC54O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueCA9IHBvaW50Lng7XHJcblx0XHJcblxyXG5cdC8vIENoZWNrIGlmIHBhc3NlZCBwb2ludCBvbiB5IGF4aXMgYW5kIGlmIHNvIHNldCB0byBwb2ludCdzIHlcclxuXHRpZih0aGlzLmJvYXJkT2Zmc2V0LnkgIT0gcG9pbnQueSAmJlxyXG5cdFx0TWF0aC5hYnMocG9pbnQueS1uZXdPZmZzZXQueSkvKHBvaW50LnktbmV3T2Zmc2V0LnkpPT1NYXRoLmFicyhwb2ludC55LXRoaXMuYm9hcmRPZmZzZXQueSkvKHBvaW50LnktdGhpcy5ib2FyZE9mZnNldC55KSlcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IG5ld09mZnNldC55O1xyXG5cdGVsc2VcclxuXHRcdHRoaXMuYm9hcmRPZmZzZXQueSA9IHBvaW50Lnk7XHJcbn1cclxuXHJcbnAud2luZG93Q2xvc2VkID0gZnVuY3Rpb24oKXtcclxuXHRjb25zb2xlLmxvZyhcIndpbmRvdyBjbG9zZWRcIik7XHJcblx0Ly8gaWYgaXQgaXMgZmlsZSB0eXBlXHJcblx0aWYgKHRoaXMubGFzdFF1ZXN0aW9uLnF1ZXN0aW9uVHlwZSA9PSA0KSB7XHJcblx0XHQvLyBhZGQgYSBmaWxlIHRvIHRoZSBmaWxlIHN5c3RlbVxyXG5cdFx0dmFyIG5hbWUgPSB0aGlzLmxhc3RRdWVzdGlvbi5maWxlTmFtZTtcclxuXHRcdHZhciBibG9iID0gdGhpcy5sYXN0UXVlc3Rpb24uYmxvYjtcclxuXHRcdHZhciBsYXN0UXVlc3Rpb25OdW0gPSB0aGlzLmxhc3RRdWVzdGlvbk51bTtcclxuXHRcdHJldHVybiB7IFxyXG5cdFx0XHRibG9iOiBibG9iLCBcclxuXHRcdFx0bnVtOiBsYXN0UXVlc3Rpb25OdW0sIFxyXG5cdFx0XHRleHQ6IG5hbWUuc3Vic3RyaW5nKCBuYW1lLmxhc3RJbmRleE9mKFwiLlwiKSwgbmFtZS5sZW5ndGgpXHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBib2FyZDsgICAgXHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gYnV0dG9uKHN0YXJ0UG9zaXRpb24sIHdpZHRoLCBoZWlnaHQpe1xyXG4gICAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG4gICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICB0aGlzLmNsaWNrZWQgPSBmYWxzZTtcclxuICAgIHRoaXMuaG92ZXJlZCA9IGZhbHNlO1xyXG59XHJcbmJ1dHRvbi5kcmF3TGliID0gdW5kZWZpbmVkO1xyXG5cclxudmFyIHAgPSBidXR0b24ucHJvdG90eXBlO1xyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4KXtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICB2YXIgY29sO1xyXG4gICAgaWYodGhpcy5ob3ZlcmVkKXtcclxuICAgICAgICBjb2wgPSBcImRvZGdlcmJsdWVcIjtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY29sID0gXCJsaWdodGJsdWVcIjtcclxuICAgIH1cclxuICAgIC8vZHJhdyByb3VuZGVkIGNvbnRhaW5lclxyXG4gICAgYm9hcmRCdXR0b24uZHJhd0xpYi5yZWN0KGN0eCwgdGhpcy5wb3NpdGlvbi54IC0gdGhpcy53aWR0aC8yLCB0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLmhlaWdodC8yLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgY29sKTtcclxuXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBidXR0b247IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBDYXRlZ29yeShuYW1lLCB4bWwsIHJlc291cmNlcywgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3Mpe1xyXG5cdFxyXG5cdC8vIFNhdmUgdGhlIG5hbWVcclxuXHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdFxyXG5cdC8vIExvYWQgYWxsIHRoZSBxdWVzdGlvbnNcclxuXHR2YXIgcXVlc3Rpb25FbGVtZW50cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJ1dHRvblwiKTtcclxuXHR0aGlzLnF1ZXN0aW9ucyA9IFtdO1xyXG5cdC8vIGNyZWF0ZSBxdWVzdGlvbnNcclxuXHRmb3IgKHZhciBpPTA7IGk8cXVlc3Rpb25FbGVtZW50cy5sZW5ndGg7IGkrKykgXHJcblx0e1xyXG5cdFx0Ly8gY3JlYXRlIGEgcXVlc3Rpb24gb2JqZWN0XHJcblx0XHR0aGlzLnF1ZXN0aW9uc1tpXSA9IG5ldyBRdWVzdGlvbihxdWVzdGlvbkVsZW1lbnRzW2ldLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKTtcclxuXHR9XHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDYXRlZ29yeTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyBUaGUgc2l6ZSBvZiB0aGUgYm9hcmQgaW4gZ2FtZSB1bml0cyBhdCAxMDAlIHpvb21cclxubS5ib2FyZFNpemUgPSBuZXcgUG9pbnQoMTkyMCwgMTA4MCk7XHJcblxyXG4vL1RoZSBzaXplIG9mIHRoZSBib2FyZCBvdXRsaW5lIGluIGdhbWUgdW5pdHMgYXQgMTAwJSB6b29tXHJcbm0uYm9hcmRPdXRsaW5lID0gbS5ib2FyZFNpemUueCA+IG0uYm9hcmRTaXplLnkgPyBtLmJvYXJkU2l6ZS54LzIwIDogbS5ib2FyZFNpemUueS8yMDtcclxuXHJcbi8vIFRoZSB6b29tIHZhbHVlcyBhdCBzdGFydCBhbmQgZW5kIG9mIGFuaW1hdGlvblxyXG5tLnN0YXJ0Wm9vbSA9IDAuNTtcclxubS5lbmRab29tID0gMS41O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSB6b29tIGFuaW1hdGlvblxyXG5tLnpvb21TcGVlZCA9IDAuMDAxO1xyXG5tLnpvb21Nb3ZlU3BlZWQgPSAwLjc1O1xyXG5cclxuLy8gVGhlIHNwZWVkIG9mIHRoZSBsaW5lIGFuaW1hdGlvblxyXG5tLmxpbmVTcGVlZCA9IDAuMDAyOyIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG5tLmNsZWFyID0gZnVuY3Rpb24oY3R4LCB4LCB5LCB3LCBoKSB7XHJcbiAgICBjdHguY2xlYXJSZWN0KHgsIHksIHcsIGgpO1xyXG59XHJcblxyXG5tLnJlY3QgPSBmdW5jdGlvbihjdHgsIHgsIHksIHcsIGgsIGNvbCwgY2VudGVyT3JpZ2luKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbDtcclxuICAgIGlmKGNlbnRlck9yaWdpbil7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHggLSAodyAvIDIpLCB5IC0gKGggLyAyKSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh4LCB5LCB3LCBoKTtcclxuICAgIH1cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbm0uc3Ryb2tlUmVjdCA9IGZ1bmN0aW9uKGN0eCwgeCwgeSwgdywgaCwgbGluZSwgY29sLCBjZW50ZXJPcmlnaW4pIHtcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBjb2w7XHJcbiAgICBjdHgubGluZVdpZHRoID0gbGluZTtcclxuICAgIGlmKGNlbnRlck9yaWdpbil7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCAtICh3IC8gMiksIHkgLSAoaCAvIDIpLCB3LCBoKTtcclxuICAgIH1cclxuICAgIGVsc2V7XHJcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QoeCwgeSwgdywgaCk7XHJcbiAgICB9XHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5tLmxpbmUgPSBmdW5jdGlvbihjdHgsIHgxLCB5MSwgeDIsIHkyLCB0aGlja25lc3MsIGNvbG9yKSB7XHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4Lm1vdmVUbyh4MSwgeTEpO1xyXG4gICAgY3R4LmxpbmVUbyh4MiwgeTIpO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHRoaWNrbmVzcztcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxubS5jaXJjbGUgPSBmdW5jdGlvbihjdHgsIHgsIHksIHJhZGl1cywgY29sb3Ipe1xyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoeCx5LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYm9hcmRCdXR0b24oY3R4LCBwb3NpdGlvbiwgd2lkdGgsIGhlaWdodCwgaG92ZXJlZCl7XHJcbiAgICAvL2N0eC5zYXZlKCk7XHJcbiAgICBpZihob3ZlcmVkKXtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJkb2RnZXJibHVlXCI7XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcImxpZ2h0Ymx1ZVwiO1xyXG4gICAgfVxyXG4gICAgLy9kcmF3IHJvdW5kZWQgY29udGFpbmVyXHJcbiAgICBjdHgucmVjdChwb3NpdGlvbi54IC0gd2lkdGgvMiwgcG9zaXRpb24ueSAtIGhlaWdodC8yLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgIGN0eC5saW5lV2lkdGggPSA1O1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIC8vY3R4LnJlc3RvcmUoKTtcclxufSIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgQ2F0ZWdvcnkgPSByZXF1aXJlKFwiLi9jYXRlZ29yeS5qc1wiKTtcclxudmFyIFJlc291cmNlID0gcmVxdWlyZShcIi4vcmVzb3VyY2VzLmpzXCIpO1xyXG52YXIgVXRpbGl0aWVzID0gcmVxdWlyZSgnLi91dGlsaXRpZXMuanMnKTtcclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XHJcbnZhciBQYXJzZXIgPSByZXF1aXJlKCcuL2lwYXJEYXRhUGFyc2VyLmpzJyk7XHJcbnZhciBRdWVzdGlvbldpbmRvd3MgPSByZXF1aXJlKCcuL3F1ZXN0aW9uV2luZG93cy5qcycpO1xyXG53aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCAgPSB3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCB8fCB3aW5kb3cud2Via2l0UmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTDtcclxuXHJcbi8vIE1vZHVsZSBleHBvcnRcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHJcbnZhciBiYXNlVVJMID0gbG9jYWxTdG9yYWdlWydjYXNlRmlsZXMnXTtcclxuXHJcbnZhciBmaWxlU3lzdGVtID0gbnVsbDtcclxuXHJcbnZhciBiYXNlRGlyID0gbnVsbDtcclxuXHJcbnZhciBhZGRGaWxlRGF0YSA9IHsgZmlsZW5hbWU6IFwiXCIsIGJsb2I6IFwiXCIsIGNhbGxiYWNrOiB1bmRlZmluZWR9O1xyXG5cclxuLy8gc3RvcmVzIGFuIGFycmF5IG9mIGFsbCB0aGUgZmlsZXMgZm9yIHJlemlwcGluZ1xyXG52YXIgYWxsRW50cmllcztcclxuXHJcbi8vICoqKioqKioqKioqKioqKioqKioqKiogTE9BRElORyAqKioqKioqKioqKioqKioqKioqKioqKipcclxuXHJcbi8vIGxvYWQgdGhlIGZpbGUgZW50cnkgYW5kIHBhcnNlIHRoZSB4bWxcclxubS5sb2FkQ2FzZSA9IGZ1bmN0aW9uKHVybCwgd2luZG93RGl2LCBjYWxsYmFjaykge1xyXG4gICAgXHJcbiAgICB0aGlzLmNhdGVnb3JpZXMgPSBbXTtcclxuICAgIHRoaXMucXVlc3Rpb25zID0gW107XHJcbiAgICBcclxuICAgIC8vIExvYWQgdGhlIHF1ZXN0aW9uIHdpbmRvd3MgZmlyc3RcclxuICAgIHZhciB3aW5kb3dzID0gbmV3IFF1ZXN0aW9uV2luZG93cyhmdW5jdGlvbigpe1xyXG4gICAgXHQvLyBnZXQgWE1MXHJcbiAgICAgICAgd2luZG93LnJlc29sdmVMb2NhbEZpbGVTeXN0ZW1VUkwodXJsKydhY3RpdmUvY2FzZUZpbGUuaXBhcmRhdGEnLCBmdW5jdGlvbihmaWxlRW50cnkpIHtcclxuICAgIFx0XHRmaWxlRW50cnkuZmlsZShmdW5jdGlvbihmaWxlKSB7XHJcbiAgICBcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgIFx0XHRcdFxyXG4gICAgXHRcdFx0Ly8gaG9vayB1cCBjYWxsYmFja1xyXG4gICAgXHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgIFx0XHRcdFx0Ly8gR2V0IHRoZSByYXcgZGF0YVxyXG4gICAgXHRcdFx0XHR2YXIgcmF3RGF0YSA9IFV0aWxpdGllcy5nZXRYbWwodGhpcy5yZXN1bHQpO1xyXG4gICAgXHRcdFx0XHR2YXIgY2F0ZWdvcmllcyA9IFBhcnNlci5nZXRDYXRlZ29yaWVzQW5kUXVlc3Rpb25zKHJhd0RhdGEsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKTtcclxuICAgIFx0XHRcdFx0Ly8gbG9hZCB0aGUgbW9zdCByZWNlbnQgdmVyc2lvblxyXG4gICAgXHRcdFx0XHR2YXIgYXV0b3NhdmUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImF1dG9zYXZlXCIpO1xyXG4gICAgXHRcdFx0XHRpZiAoYXV0b3NhdmUpIHtcclxuICAgIFx0XHRcdFx0XHRsb2FkQXV0b3NhdmUoYXV0b3NhdmUsIGNhdGVnb3JpZXMsIGNhbGxiYWNrKTtcclxuICAgIFx0XHRcdFx0fSBlbHNlIHtcclxuICAgIFx0XHRcdFx0XHRsb2FkU2F2ZVByb2dyZXNzKGNhdGVnb3JpZXMsIHVybCwgd2luZG93RGl2LCBjYWxsYmFjayk7XHJcbiAgICBcdFx0XHRcdH1cclxuICAgIFx0XHRcdFx0Ly8gcHJlcGFyZSBmb3Igc2F2aW5nIGJ5IHJlYWRpbmcgdGhlIGZpbGVzIHJpZ2h0IHdoZW4gdGhlIHByb2dyYW0gc3RhcnRzXHJcbiAgICBcdFx0XHQgICAgd2luZG93LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDEwMjQqMTAyNCwgcmVjdXJzaXZlbHlSZWFkRmlsZXMsIGVycm9ySGFuZGxlcik7XHJcbiAgICBcdFx0XHR9O1xyXG4gICAgXHRcdFx0cmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcbiAgICBcdFx0ICAgXHJcbiAgICBcdFx0fSwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdFx0XHRjb25zb2xlLmxvZyhcIkVycm9yOiBcIitlLm1lc3NhZ2UpO1xyXG4gICAgXHRcdH0pO1xyXG4gICAgXHR9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vLyBsb2FkIHRoZSBzYXZlIGZyb20gdGhlIGZpbGVzeXRlbSBzYW5kYm94XHJcbmZ1bmN0aW9uIGxvYWRTYXZlUHJvZ3Jlc3MoY2F0ZWdvcmllcywgdXJsLCB3aW5kb3dEaXYsIGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcXVlc3Rpb25zID0gW107XHJcbiAgICBcclxuXHQvLyBnZXQgWE1MXHJcbiAgICB3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCh1cmwrJ2FjdGl2ZS9zYXZlRmlsZS5pcGFyZGF0YScsIGZ1bmN0aW9uKGZpbGVFbnRyeSkge1xyXG5cdFx0ZmlsZUVudHJ5LmZpbGUoZnVuY3Rpb24oZmlsZSkge1xyXG5cdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGhvb2sgdXAgY2FsbGJhY2tcclxuXHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgdGhlIHNhdmUgZGF0YVxyXG5cdFx0XHRcdHZhciBzYXZlRGF0YSA9IFV0aWxpdGllcy5nZXRYbWwodGhpcy5yZXN1bHQpO1xyXG5cdFx0XHRcdC8vIHBhcnNlIHRoZSBzYXZlIGRhdGFcclxuXHRcdFx0XHRQYXJzZXIuYXNzaWduUXVlc3Rpb25TdGF0ZXMoY2F0ZWdvcmllcywgc2F2ZURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblwiKSk7XHJcblx0XHRcdFx0Ly8gcHJvZ3Jlc3NcclxuXHRcdFx0XHR2YXIgc3RhZ2UgPSBzYXZlRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF0uZ2V0QXR0cmlidXRlKFwiY2FzZVN0YXR1c1wiKTtcclxuXHRcdFx0XHQvLyBjYWxsYmFjayB3aXRoIHJlc3VsdHNcclxuXHRcdFx0XHRjYWxsYmFjayhjYXRlZ29yaWVzLCBzdGFnZSk7IC8vIG1heWJlIHN0YWdlICsgMSB3b3VsZCBiZSBiZXR0ZXIgYmVjYXVzZSB0aGV5IGFyZSBub3QgemVybyBpbmRleGVkP1xyXG5cdFx0XHQgICBcclxuXHRcdFx0fTtcclxuXHRcdFx0cmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcblx0XHQgICBcclxuXHRcdH0sIGZ1bmN0aW9uKGUpe1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIkVycm9yOiBcIitlLm1lc3NhZ2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn1cclxuXHJcbi8vIGxvYWQgdGhlIHNhdmUgZnJvbSB0aGUgbG9jYWxTdG9yYWdlXHJcbmZ1bmN0aW9uIGxvYWRBdXRvc2F2ZShhdXRvc2F2ZSwgY2F0ZWdvcmllcywgY2FsbGJhY2spIHtcclxuXHQvLyBHZXQgdGhlIHNhdmUgZGF0YVxyXG5cdHZhciBzYXZlRGF0YSA9IFV0aWxpdGllcy5nZXRYbWwoYXV0b3NhdmUpO1xyXG5cdFBhcnNlci5hc3NpZ25RdWVzdGlvblN0YXRlcyhjYXRlZ29yaWVzLCBzYXZlRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uXCIpKTtcclxuXHR2YXIgc3RhZ2UgPSBzYXZlRGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhc2VcIilbMF0uZ2V0QXR0cmlidXRlKFwiY2FzZVN0YXR1c1wiKTtcclxuXHRjYWxsYmFjayhjYXRlZ29yaWVzLCBzdGFnZSk7XHJcbn1cclxuXHJcblx0XHRcdFx0XHQgXHJcbi8vICoqKioqKioqKioqKioqKioqKioqKiogU0FWSU5HICoqKioqKioqKioqKioqKioqKioqKioqKlxyXG5cclxuLyogaGVyZSdzIHRoZSBnZW5lcmFsIG91dGxpbmUgb2Ygd2hhdCBpcyBoYXBwZW5pbmc6XHJcbnNlbGVjdFNhdmVMb2NhdGlvbiB3YXMgdGhlIG9sZCB3YXkgb2YgZG9pbmcgdGhpbmdzXHJcbm5vdyB3ZSB1c2UgY3JlYXRlWmlwXHJcbiAtIHdoZW4gdGhpcyB3aG9sZSB0aGluZyBzdGFydHMsIHdlIHJlcXVlc3QgYSBmaWxlIHN5c3RlbSBhbmQgc2F2ZSBhbGwgdGhlIGVudHJpZXMgKGRpcmVjdG9yaWVzIGFuZCBmaWxlcykgdG8gdGhlIGFsbEVudHJpZXMgdmFyaWFibGVcclxuIC0gdGhlbiB3ZSBnZXQgdGhlIGJsb2JzIHVzaW5nIHJlYWRBc0JpbmFyeVN0cmluZyBhbmQgc3RvcmUgdGhvc2UgaW4gYW4gYXJyYXkgd2hlbiB3ZSBhcmUgc2F2aW5nIFxyXG4gIC0gLSBjb3VsZCBkbyB0aGF0IG9uIHBhZ2UgbG9hZCB0byBzYXZlIHRpbWUgbGF0ZXIuLj9cclxuIC0gYW55d2F5LCB0aGVuIHdlIC0gaW4gdGhlb3J5IC0gdGFrZSB0aGUgYmxvYnMgYW5kIHVzZSB6aXAuZmlsZShlbnRyeS5uYW1lLCBibG9iKSB0byByZWNyZWF0ZSB0aGUgc3RydWN0dXJlXHJcbiAtIGFuZCBmaW5hbGx5IHdlIGRvd25sb2FkIHRoZSB6aXAgd2l0aCBkb3dubG9hZCgpXHJcbiBcclxuKi9cclxuXHJcbi8vIGNhbGxlZCB3aGVuIHRoZSBnYW1lIGlzIGxvYWRlZCwgYWRkIG9uY2xpY2sgdG8gc2F2ZSBidXR0b24gdGhhdCBhY3R1YWxseSBkb2VzIHRoZSBzYXZpbmdcclxubS5wcmVwYXJlWmlwID0gZnVuY3Rpb24obXlCb2FyZHMpIHtcclxuXHQvL3ZhciBjb250ZW50ID0gemlwLmdlbmVyYXRlKCk7XHJcblx0XHJcblx0Y29uc29sZS5sb2coXCJwcmVwYXJlIHppcFwiKTtcclxuXHRcclxuXHQvLyBjb2RlIGZyb20gSlNaaXAgc2l0ZVxyXG5cdHZhciBibG9iTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdibG9iJyk7XHJcblx0aWYgKEpTWmlwLnN1cHBvcnQuYmxvYikge1xyXG5cdFx0Y29uc29sZS5sb2coXCJzdXBwb3J0cyBibG9iXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBsaW5rIGRvd25sb2FkIHRvIGNsaWNrXHJcblx0XHRibG9iTGluay5vbmNsaWNrID0gZnVuY3Rpb24oKSB7IHNhdmVJUEFSKG15Qm9hcmRzKTsgfTtcclxuICBcdH1cclxufVxyXG5cclxuLy8gY3JlYXRlIElQQVIgZmlsZSBhbmQgZG93bmxvYWQgaXRcclxuZnVuY3Rpb24gc2F2ZUlQQVIoYm9hcmRzKSB7XHJcblxyXG5cdC8vIGVycm9yIGhhbmRsaW5nXHJcblx0aWYgKCFhbGxFbnRyaWVzKSB7XHJcblx0XHRhbGVydChcIkNBTk5PVCBTQVZFOiBmaWxlIGRhdGEgZGlkIG5vdCBsb2FkXCIpOyByZXR1cm47IFxyXG5cdH1cclxuXHQvLyAxKVxyXG5cdC8vIGdldCB0aGUgZmlsZXMgdGhhdCB0aGUgdXNlciB1cGxvYWRlZCBcclxuXHR2YXIgdXBsb2FkZWRGaWxlcyA9IGdldEFsbFN1Ym1pc3Npb25zKGJvYXJkcyk7XHJcblx0XHJcblx0Ly8gMilcclxuXHQvLyBjcmVhdGUgdGhlIGNhc2UgZmlsZSBsaWtlIHRoZSBvbmUgd2UgbG9hZGVkXHJcblx0dmFyIGNhc2VGaWxlID0gUGFyc2VyLnJlY3JlYXRlQ2FzZUZpbGUoYm9hcmRzKTtcclxuXHRcclxuXHQvLyAzKSAoQVNZTkMpXHJcblx0Ly8gcmVjcmVhdGUgdGhlIElQQVIgZmlsZSB1c2luZyBGaWxlU3lzdGVtLCB0aGVuIGRvd25sb2FkIGl0XHJcblx0Z2V0QWxsQ29udGVudHMoY2FzZUZpbGUsIHVwbG9hZGVkRmlsZXMpO1xyXG5cdFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVaaXAoZGF0YSwgYmxvYnMsIG5hbWVzLCBzdWJzKSB7XHJcblx0Y29uc29sZS5sb2coXCJjcmVhdGUgemlwIHJ1blwiKTtcclxuXHRcclxuXHR2YXIgemlwID0gbmV3IEpTWmlwKCk7XHJcblxyXG5cdC8vIHppcCBlYWNoIGZpbGUgb25lIGJ5IG9uZVxyXG5cdGJsb2JzLmZvckVhY2goZnVuY3Rpb24oYmxvYixpKSB7XHJcblx0XHR6aXAuZmlsZShuYW1lc1tpXSxibG9iKTtcclxuXHR9KTtcclxuXHQvLyB6aXAgc3VibWl0dGVkIGZpbGVzXHJcblx0c3Vicy5uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKHN1Yk5hbWUsaSkge1xyXG5cdFx0emlwLmZpbGUoXCJjYXNlXFxcXGFjdGl2ZVxcXFxzdWJtaXR0ZWRcXFxcXCIrc3ViTmFtZSxzdWJzLmJsb2JzW2ldKTtcclxuXHR9KTtcclxuXHRcclxuXHQvLyBiYWNrc2xhc2hlcyBwZXIgemlwIGZpbGUgcHJvdG9jb2xcclxuXHR6aXAuZmlsZShcImNhc2VcXFxcYWN0aXZlXFxcXHNhdmVGaWxlLmlwYXJkYXRhXCIsZGF0YSk7XHJcblx0Ly8gZG93bmxvYWQgdGhlIGZpbGVcclxuXHRkb3dubG9hZCh6aXApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBbGxTdWJtaXNzaW9ucyhib2FyZHMpIHtcclxuXHR2YXIgbmFtZXMgPSBbXTtcclxuXHR2YXIgYmxvYnMgPSBbXTtcclxuXHRcclxuXHQvLyBsb29wIHRocm91Z2ggcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPGJvYXJkcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Zm9yICh2YXIgaj0wOyBqPGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0Ly8gc2hvcnRoYW5kXHJcblx0XHRcdHZhciBxID0gYm9hcmRzW2ldLmxlc3Nvbk5vZGVBcnJheVtqXS5xdWVzdGlvbjtcclxuXHRcdFx0XHJcblx0XHRcdC8vIGFkZCBibG9icyB0byBhbiBhcnJheVxyXG5cdFx0XHRpZiAocS5maWxlTmFtZSAmJiBxLmJsb2IpIHtcclxuXHRcdFx0XHRuYW1lcy5wdXNoKHEuZmlsZU5hbWUpO1xyXG5cdFx0XHRcdGJsb2JzLnB1c2gocS5ibG9iKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHQvLyByZXR1cm4gc3VibWlzc2lvbnMgb2JqZWN0IFxyXG5cdHJldHVybiB7XHJcblx0XHRcIm5hbWVzXCIgOiBuYW1lcyxcclxuXHRcdFwiYmxvYnNcIiA6IGJsb2JzXHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBbGxDb250ZW50cyhkYXRhLCBzdWJzKSB7XHJcblx0dmFyIGJsb2JzID0gW107XHJcblx0dmFyIG5hbWVzID0gW107XHJcblx0dmFyIGZpbGVDb3VudCA9IDA7XHJcblx0YWxsRW50cmllcy5mb3JFYWNoKGZ1bmN0aW9uKGZpbGVFbnRyeSkge1xyXG5cdFx0Ly96aXAuZmlsZShmaWxlRW50cnkubmFtZSxmaWxlRW50cnlcclxuXHRcdGlmIChmaWxlRW50cnkuaXNGaWxlKSB7XHJcblx0XHRcdGZpbGVDb3VudCsrXHJcblx0XHRcdC8vIEdldCBhIEZpbGUgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgZmlsZSxcclxuXHRcdFx0Ly8gdGhlbiB1c2UgRmlsZVJlYWRlciB0byByZWFkIGl0cyBjb250ZW50cy5cclxuXHRcdFx0Ly9jb25zb2xlLmxvZyhmaWxlRW50cnkpO1xyXG5cdFx0XHRmaWxlRW50cnkuZmlsZShmdW5jdGlvbihmaWxlKSB7XHJcblx0XHRcdCAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuXHRcdFx0ICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0ICAgXHJcblx0XHRcdCAgIFx0XHR2YXIgYXJyYXlCdWZmZXJWaWV3ID0gbmV3IFVpbnQ4QXJyYXkoIHRoaXMucmVzdWx0ICk7IC8vIGZpbmdlcnMgY3Jvc3NlZFxyXG5cdFx0XHQgICBcdFx0Ly9jb25zb2xlLmxvZyhhcnJheUJ1ZmZlclZpZXcpO1xyXG5cdFx0XHQgICBcdFx0XHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHRoaXMucmVzdWx0KTtcclxuXHRcdFx0XHQgXHRibG9icy5wdXNoKGFycmF5QnVmZmVyVmlldyk7XHJcblx0XHRcdFx0IFx0bmFtZXMucHVzaChmaWxlRW50cnkuZnVsbFBhdGgucmVwbGFjZShuZXcgUmVnRXhwKCdcXC8nLCdnJyksJ1xcXFwnKS5zdWJzdHJpbmcoMSkpO1xyXG5cdFx0XHRcdCBcdGlmIChibG9icy5sZW5ndGggPT0gZmlsZUNvdW50KSB7XHJcblx0XHRcdFx0IFx0XHRjcmVhdGVaaXAoZGF0YSxibG9icyxuYW1lcyxzdWJzKTtcclxuXHRcdFx0XHQgXHR9XHJcblx0XHRcdCAgIH07XHJcblxyXG5cdFx0XHQgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XHJcblx0XHRcdH0sIGVycm9ySGFuZGxlcik7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvd25sb2FkKHppcCkge1xyXG5cdGNvbnNvbGUubG9nKFwiZG93bmxvYWRpbmdcIik7XHJcblx0Y29uc29sZS5sb2coemlwLmdlbmVyYXRlQXN5bmMpO1xyXG5cdFxyXG5cdHZhciBjb250ZW50ID0gemlwLmdlbmVyYXRlQXN5bmMoe3R5cGU6XCJibG9iXCJ9KS50aGVuKFxyXG5cdGZ1bmN0aW9uIChibG9iKSB7XHJcblx0XHQvL2NvbnNvbGUubG9nKGJsb2IpO1xyXG5cdFx0Ly9zYXZlQXMoYmxvYiwgXCJoZWxsby56aXBcIik7XHJcblx0XHQvL3ZhciB1cmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuXHRcdC8vd2luZG93LmxvY2F0aW9uLmFzc2lnbih1cmwpO1xyXG5cdFx0XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcclxuXHRcdFxyXG5cdFx0YS5pbm5lckhUTUwgPSBsb2NhbFN0b3JhZ2VbJ2Nhc2VOYW1lJ107XHJcblx0XHRcclxuXHRcdGEuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImRvd25sb2FkTGlua1wiKTtcclxuXHRcdFxyXG5cdFx0YS5ocmVmID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcblx0XHRcclxuXHRcdGEuZG93bmxvYWQgPSBsb2NhbFN0b3JhZ2VbXCJjYXNlTmFtZVwiXTtcclxuXHRcdFxyXG5cdFx0XHJcblx0XHR2YXIgc2hvd0xpbmsgPSBmYWxzZTtcclxuXHRcdC8vIGlmIHlvdSBzaG93IHRoZSBsaW5rLCB0aGUgdXNlciBjYW4gZG93bmxvYWQgdG8gYSBsb2NhdGlvbiBvZiB0aGVpciBjaG9pY2VcclxuXHRcdGlmIChzaG93TGluaykge1xyXG5cdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xyXG5cdFx0Ly8gaWYgeW91IGhpZGUgdGhlIGxpbmssIGl0IHdpbGwgc2ltcGx5IGdvIHRvIHRoZWlyIGRvd25sb2FkcyBmb2xkZXJcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGEuY2xpY2soKTsgLy9kb3dubG9hZCBpbW1lZGlhdGVseVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRcclxuXHJcblx0fSwgZnVuY3Rpb24gKGVycikge1xyXG5cdFx0YmxvYkxpbmsuaW5uZXJIVE1MICs9IFwiIFwiICsgZXJyO1xyXG5cdH0pO1xyXG59XHJcblxyXG5cclxuLyoqKioqKioqKioqKiogUkVBRCBGSUxFUyAqKioqKioqKioqKioqKi9cclxuXHJcbmZ1bmN0aW9uIGVycm9ySGFuZGxlcigpIHtcclxuXHQvL2RvIG5vdGhpbmdcclxuXHRjb25zb2xlLmxvZyhcInlvIHdlIGdvdCBlcnJvcnNcIik7XHJcbn1cclxuXHJcbi8vIGhlbHBlciBmdW5jdGlvbiBmb3IgcmVjdXJzaXZlbHlSZWFkRmlsZXNcclxuZnVuY3Rpb24gdG9BcnJheShsaXN0KSB7XHJcblx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWN1cnNpdmVseVJlYWRGaWxlcyhmcykge1xyXG5cdGNvbnNvbGUubG9nKFwicmVjdXJzaXZlbHlSZWFkRmlsZXMgY2FsbGVkXCIpO1xyXG5cdFxyXG5cdGZpbGVTeXN0ZW0gPSBmcztcclxuXHJcbiAgdmFyIGRpclJlYWRlciA9IGZzLnJvb3QuY3JlYXRlUmVhZGVyKCk7XHJcbiAgdmFyIGVudHJpZXMgPSBbXTtcclxuXHJcbiAgLy8gQ2FsbCB0aGUgcmVhZGVyLnJlYWRFbnRyaWVzKCkgdW50aWwgbm8gbW9yZSByZXN1bHRzIGFyZSByZXR1cm5lZC5cclxuICB2YXIgcmVhZEVudHJpZXMgPSBmdW5jdGlvbihyZWFkZXIpIHtcclxuICAgICByZWFkZXIucmVhZEVudHJpZXMgKGZ1bmN0aW9uKHJlc3VsdHMpIHtcclxuICAgICAgaWYgKCFyZXN1bHRzLmxlbmd0aCkge1xyXG4gICAgICAgIC8vIGFsbCBlbnRyaWVzIGZvdW5kXHJcbiAgICAgICAgc2F2ZUVudHJpZXMoZW50cmllcyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgIFx0dmFyIHJlc3VsdHNBcnJheSA9IHRvQXJyYXkocmVzdWx0cylcclxuICAgICAgICBlbnRyaWVzID0gZW50cmllcy5jb25jYXQocmVzdWx0c0FycmF5KTtcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGk8cmVzdWx0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgXHQvL2NvbnNvbGUubG9nKFwiaXMgZGlyZWN0b3J5ID8gXCIgKyByZXN1bHRzQXJyYXlbaV0uaXNEaXJlY3RvcnkpO1xyXG4gICAgICAgIFx0aWYgKHJlc3VsdHNBcnJheVtpXS5pc0RpcmVjdG9yeSkge1xyXG4gICAgICAgIFx0XHQvL2RpcmVjdG9yeVN0cmluZyArPSByZXN1bHRzQXJyYXlbaV0uXHJcbiAgICAgICAgXHRcdHZhciByZWN1cnNpdmVSZWFkZXIgPSByZXN1bHRzQXJyYXlbaV0uY3JlYXRlUmVhZGVyKCk7XHJcbiAgICAgICAgXHRcdHJlYWRFbnRyaWVzKHJlY3Vyc2l2ZVJlYWRlcik7XHJcbiAgICAgICAgXHR9IGVsc2Uge1xyXG4gICAgICAgIFx0XHRcclxuICAgICAgICBcdH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy9uYW1lU3RydWN0dXJlID0ge307XHJcbiAgICAgICAgcmVhZEVudHJpZXMocmVhZGVyKTtcclxuICAgICAgfVxyXG4gICAgfSwgZXJyb3JIYW5kbGVyKTtcclxuICB9O1xyXG4gIFxyXG4gIFxyXG5cclxuICByZWFkRW50cmllcyhkaXJSZWFkZXIpOyAvLyBTdGFydCByZWFkaW5nIGRpcnMuXHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBzYXZlRW50cmllcyhlbnRyaWVzLCBjYWxsYmFjaykge1xyXG5cdGFsbEVudHJpZXMgPSBlbnRyaWVzO1xyXG5cdC8vY29uc29sZS5sb2coYWxsRW50cmllcyk7XHJcblx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjayhhbGxFbnRyaWVzKTtcclxufVxyXG5cclxuLyoqKioqKioqKioqKioqKioqIENBQ0hJTkcgKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbm0uYWRkRmlsZVRvU3lzdGVtID0gZnVuY3Rpb24oZmlsZW5hbWUsIGRhdGEsIGNhbGxiYWNrKXtcclxuXHJcblx0Y29uc29sZS5sb2coXCJmczogXCIgKyBmaWxlU3lzdGVtLnJvb3QpO1xyXG5cdFxyXG5cdGlmICghZmlsZVN5c3RlbSkge1xyXG5cdFx0cmV0cmlldmVGaWxlU3lzdGVtKGZ1bmN0aW9uKCkgeyBtLmFkZEZpbGVUb1N5c3RlbShmaWxlbmFtZSwgZGF0YSwgY2FsbGJhY2spOyB9KTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0XHJcblx0Ly8gTWFrZSBzdXJlIHRoZSBkaXIgZXhpc3RzIGZpcnN0XHJcblx0dmFyIGRpcnMgPSBmaWxlbmFtZS5zdWJzdHIoMCwgZmlsZW5hbWUubGFzdEluZGV4T2YoJ1xcXFwnKSkuc3BsaXQoJ1xcXFwnKTtcclxuXHR2YXIgY3VyRGlyID0gZmlsZVN5c3RlbS5yb290O1xyXG5cdGZvcih2YXIgaT0wO2k8ZGlycy5sZW5ndGg7aSsrKSB7XHJcblx0XHRjb25zb2xlLmxvZyhjdXJEaXIuZ2V0RGlyZWN0b3J5KGRpcnNbaV0pKTsgXHJcblx0XHRjdXJEaXIgPSBjdXJEaXIuZ2V0RGlyZWN0b3J5KGRpcnNbaV0sIHtjcmVhdGU6IHRydWUsIGV4Y2x1c2l2ZTogZmFsc2V9KTtcclxuXHR9XHJcblx0XHJcblx0Ly8gTWFrZSBzdXJlIG5vdCB3b3JraW5nIHdpdGggYW4gZW1wdHkgZGlyZWN0b3J5XHJcblx0aWYoZmlsZW5hbWUuZW5kc1dpdGgoJ1xcXFwnKSlcclxuXHRcdHJldHVybjtcclxuXHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlXHJcblx0dmFyIGZpbGUgPSBjdXJEaXIuZ2V0RmlsZShmaWxlbmFtZS5zdWJzdHIoZmlsZW5hbWUubGFzdEluZGV4T2YoJ1xcXFwnKSsxKSwge2NyZWF0ZTogdHJ1ZX0pO1xyXG5cdC8vZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShuZXcgQmxvYihbZGF0YV0sIHt0eXBlOiBnZXRNaW1lVHlwZShmaWxlbmFtZSl9KSk7XHJcblx0Ly8gZGF0YSBpcyBhIGJsb2IgaW4gdGhpcyBjYXNlXHJcblx0ZmlsZS5jcmVhdGVXcml0ZXIoKS53cml0ZShkYXRhKTtcclxuXHRcclxuXHQvLyBSZXR1cm4gdGhlIHVybCB0byB0aGUgZmlsZVxyXG5cdGlmIChjYWxsYmFjaykgY2FsbGJhY2soIGZpbGUudG9VUkwoKSApO1xyXG59XHJcblxyXG4vLyBmaWxlbmFtZSBtdXN0IGJlIHRoZSBmdWxsIGRlc2lyZWQgcGF0aCBmb3IgdGhpcyB0byB3b3JrXHJcbm0uYWRkTmV3RmlsZVRvU3lzdGVtID0gZnVuY3Rpb24oZmlsZW5hbWUsIGRhdGEsIGNhbGxiYWNrKXtcclxuXHQvLyBpZiB0aGUgcGF0aCB1c2VzIGJhY2tzbGFzaGVzXHJcblx0aWYgKGZpbGVuYW1lLmluZGV4T2YoXCJcXFxcXCIpID4gLTEpIFxyXG5cdFx0ZmlsZW5hbWUgPSBVdGlsaXRpZXMucmVwbGFjZUFsbChmaWxlbmFtZSxcIlxcXFxcIixcIi9cIik7XHJcblx0Ly8gaWYgdGhlcmUgaXMgbm8gcGF0aFxyXG5cdGlmIChmaWxlbmFtZS5pbmRleE9mKFwiL1wiKSA8IDApIGZpbGVuYW1lID0gXCJjYXNlL2FjdGl2ZS9zdWJtaXR0ZWQvXCIrZmlsZW5hbWU7XHJcblx0XHJcblx0Ly8gc3RvcmUgdGhlIGRhdGEgaW4gYW4gbW9kdWxlLXNjb3BlIG9iamVjdCBzbyB0aGF0IGFsbCBvZiB0aGUgY2FsbGJhY2sgZnVuY3Rpb25zIGNhbiBtYWtlIHVzZSBvZiBpdFxyXG5cdGFkZEZpbGVEYXRhLmZpbGVuYW1lID0gZmlsZW5hbWU7XHJcblx0YWRkRmlsZURhdGEuZGF0YSA9IGRhdGE7XHJcblx0YWRkRmlsZURhdGEuY2FsbGJhY2sgPSBjYWxsYmFjaztcclxuXHRcclxuXHQvLyBkZWJ1Z1xyXG5cdGNvbnNvbGUubG9nKFwiYWRkRmlsZVRvU3lzdGVtKFwiK2ZpbGVuYW1lK1wiLCBcIitkYXRhK1wiLCBcIitjYWxsYmFjaytcIilcIik7XHJcblx0Ly9yZXRyaWV2ZUJhc2VEaXIoZnVuY3Rpb24oZGlyKSB7IGFkZEZpbGVUb0RpcihmaWxlbmFtZSwgZGlyLCBjYWxsYmFjayk7IH0gKTtcclxuXHRcclxuXHQvLyBmaW5kIHRoZSBkaXJlY3RvcnlFbnRyeSB0aGF0IHdpbGwgY29udGFpbiB0aGUgZmlsZSBhbmQgY2FsbCBhZGRGaWxlVG9EaXIgd2l0aCB0aGUgcmVzdWx0XHJcblx0cmV0cmlldmVCb3R0b21EaXIoYWRkRmlsZVRvRGlyKTtcclxufVxyXG5cclxuLy8gZ2V0cyB0aGUgZGlyZWN0b3J5IG9mIGludGVyZXN0XHJcbmZ1bmN0aW9uIHJldHJpZXZlQm90dG9tRGlyKGNhbGxiYWNrKSB7XHJcblx0Ly93aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW0od2luZG93LlRFTVBPUkFSWSwgMTAyNCoxMDI0LCBmdW5jdGlvbihmcykgeyBzZXRGaWxlU3lzdGVtKGZzLCBjYWxsYmFjayk7IH0sIGVycm9ySGFuZGxlcik7XHJcblx0Y29uc29sZS5sb2coXCJiYXNlIFVSTDogXCIgKyBiYXNlVVJMKTtcclxuXHR2YXIgbmFtZSA9IGFkZEZpbGVEYXRhLmZpbGVuYW1lO1xyXG5cdC8vIGV4dHJhY3QgdGhlIHBhdGggb2YgdGhlIGRpcmVjdG9yeSB0byBwdXQgdGhlIGZpbGUgaW4gZnJvbSB0aGUgZmlsZSBuYW1lXHJcblx0dmFyIGV4dGVuc2lvbiA9IG5hbWUuc3Vic3RyaW5nKDAsbmFtZS5sYXN0SW5kZXhPZihcIi9cIikpO1xyXG5cdC8vIFwiY2FzZVwiIGlzIGFscmVhZHkgcGFydCBvZiB0aGUgYmFzZSB1cmxcclxuXHRpZiAoZXh0ZW5zaW9uLmluZGV4T2YoXCJjYXNlL1wiKSA+IC0xKSB7XHJcblx0XHRleHRlbnNpb24gPSBleHRlbnNpb24uc3Vic3RyaW5nKDUpO1xyXG5cdH1cclxuXHRcclxuXHQvLyBkZWJ1Z1xyXG5cdGNvbnNvbGUubG9nKFwiZXh0OiBcIiArIGV4dGVuc2lvbik7XHJcblx0XHJcblx0Ly8gZ2V0IHRoZSBkaXJlY3RvcnkgZW50cnkgZnJvbSB0aGUgZmlsZXN5c3RlbSBjYWxsYmFja1xyXG5cdHdpbmRvdy5yZXNvbHZlTG9jYWxGaWxlU3lzdGVtVVJMKGJhc2VVUkwrZXh0ZW5zaW9uLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcbi8vIGFkZCB0aGUgZmlsZVxyXG5mdW5jdGlvbiBhZGRGaWxlVG9EaXIoZGlyKSB7XHJcblxyXG5cdC8vIHNob3J0aGFuZFxyXG5cdHZhciBmaWxlbmFtZSA9IGFkZEZpbGVEYXRhLmZpbGVuYW1lO1xyXG5cdFxyXG5cdC8vIGRlYnVnXHJcblx0Y29uc29sZS5sb2coXCJhZGRGaWxlVG9EaXIoXCIrZmlsZW5hbWUrXCIsIFwiK2RpcitcIilcIik7XHJcblx0XHJcblx0Ly8gcmVsaWMgZnJvbSBsZWdhY3kgY29kZVxyXG5cdHZhciBjdXJEaXIgPSBkaXI7XHJcblx0XHJcblx0Ly8gZGVidWdcclxuXHRjb25zb2xlLmxvZyhcImN1cmRpcjogXCIgICsgY3VyRGlyLm5hbWUpO1xyXG5cdFxyXG5cdC8vIE1ha2Ugc3VyZSBub3Qgd29ya2luZyB3aXRoIGFuIGVtcHR5IGRpcmVjdG9yeVxyXG5cdGlmKGZpbGVuYW1lLmVuZHNXaXRoKCdcXFxcJykpXHJcblx0XHRyZXR1cm47XHJcblxyXG5cdC8vIENyZWF0ZSB0aGUgZmlsZVxyXG5cdHZhciBmaWxlID0gY3VyRGlyLmdldEZpbGUoZmlsZW5hbWUuc3Vic3RyKGZpbGVuYW1lLmxhc3RJbmRleE9mKCcvJykrMSksIHtjcmVhdGU6IHRydWV9LCBjcmVhdGVXcml0ZXIpO1xyXG5cdFxyXG5cdFxyXG5cdC8vdmFyIGZpbGUgPSBjdXJEaXIuZ2V0RmlsZShmaWxlbmFtZSwge2NyZWF0ZTogdHJ1ZX0sIGNyZWF0ZVdyaXRlcik7IC8vIGZ1bmN0aW9uKGZpbGVFbnRyeSkgeyB3cml0ZUZpbGUoZmlsZUVudHJ5LCBjYWxsYmFjayk7IH0pO1xyXG5cdC8qY29uc29sZS5sb2coZmlsZSk7XHJcblx0Ly9maWxlLmNyZWF0ZVdyaXRlcigpLndyaXRlKG5ldyBCbG9iKFtkYXRhXSwge3R5cGU6IGdldE1pbWVUeXBlKGZpbGVuYW1lKX0pKTtcclxuXHQvLyBkYXRhIGlzIGEgYmxvYiBpbiB0aGlzIGNhc2VcclxuXHRmaWxlLmNyZWF0ZVdyaXRlcigpLndyaXRlKGRhdGEpO1xyXG5cdFxyXG5cdC8vIFJldHVybiB0aGUgdXJsIHRvIHRoZSBmaWxlXHJcblx0aWYgKGNhbGxiYWNrKSBjYWxsYmFjayggZmlsZS50b1VSTCgpICk7XHJcblxyXG5cdGNhbGxiYWNrKCBmaWxlLnRvVVJMKCkgKTsqL1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVXcml0ZXIoZmlsZSkge1xyXG5cdGNvbnNvbGUubG9nKGZpbGUpO1xyXG5cdGZpbGUuY3JlYXRlV3JpdGVyKHdyaXRlRmlsZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlRmlsZShmaWxlV3JpdGVyKSB7XHJcblx0Y29uc29sZS5sb2coZmlsZVdyaXRlcik7XHJcblx0ZmlsZVdyaXRlci5vbndyaXRlZW5kID0gZnVuY3Rpb24gKGUpIHsgY29uc29sZS5sb2coXCJ3cml0ZSBjb21wbGV0ZWRcIik7IH1cclxuXHRmaWxlV3JpdGVyLm9uZXJyb3IgPSBmdW5jdGlvbiAoZSkgeyBjb25zb2xlLmxvZyhcIndyaXRlciBlcnJvcjogXCIgKyBlLnRvU3RyaW5nKCkpOyB9XHJcblx0Ly9maWxlV3JpdGVyLndyaXRlKG5ldyBCbG9iKFthZGRGaWxlRGF0YS5kYXRhXSwge3R5cGU6IGdldE1pbWVUeXBlKGFkZEZpbGVEYXRhLmZpbGVuYW1lKX0pKTtcclxuXHQvLyBkYXRhIGlzIGEgYmxvYiBpbiB0aGlzIGNhc2VcclxuXHRmaWxlV3JpdGVyLndyaXRlKGFkZEZpbGVEYXRhLmRhdGEpO1xyXG5cdFxyXG5cdC8vIFJldHVybiB0aGUgdXJsIHRvIHRoZSBmaWxlXHJcblx0aWYgKGFkZEZpbGVEYXRhLmNhbGxiYWNrKSBjYWxsYmFjayggZmlsZS50b1VSTCgpICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEJhc2UoZW50cnksIGNhbGxiYWNrKSB7XHJcblx0YmFzZURpciA9IGVudHJ5O1xyXG5cdGNhbGxiYWNrKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGaWxlU3lzdGVtKHR5cGUsIHNpemUsIGN1ckNhc2Upe1xyXG5cdC8vIExvYWQgdGhlIGZpbGUgc3lzdGVtXHJcblx0ZmlsZVN5c3RlbSA9IHNlbGYucmVxdWVzdEZpbGVTeXN0ZW1TeW5jKHR5cGUsIHNpemUpO1xyXG5cdFxyXG5cdC8vIFdyaXRlIHRoZSBmaWxlc1xyXG5cdHZhciB1cmxzID0ge307XHJcblx0Zm9yICh2YXIgZmlsZSBpbiBjdXJDYXNlLmZpbGVzKSB7XHJcblx0XHRpZiAoIWN1ckNhc2UuZmlsZXMuaGFzT3duUHJvcGVydHkoZmlsZSkpIGNvbnRpbnVlO1xyXG5cdFx0dXJsc1tmaWxlXSA9IGFkZEZpbGVUb1N5c3RlbShmaWxlLCBjdXJDYXNlLmZpbGUoZmlsZSkuYXNBcnJheUJ1ZmZlcigpLCBmaWxlU3lzdGVtKTtcclxuXHR9XHJcblx0XHJcblx0Ly8gcmV0dXJuIHRoZSB1cmxzIHRvIHRoZSBmaWxlc1xyXG5cdHJldHVybiBKU09OLnN0cmluZ2lmeSh1cmxzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TWltZVR5cGUoZmlsZSl7XHJcblx0c3dpdGNoKGZpbGUuc3Vic3RyKGZpbGUubGFzdEluZGV4T2YoJy4nKSsxKSl7XHJcblx0XHRjYXNlICdwbmcnOlxyXG5cdFx0XHRyZXR1cm4gJ2ltYWdlL3BuZyc7XHJcblx0XHRjYXNlICdqcGVnJzpcclxuXHRcdGNhc2UgJ2pwZyc6XHJcblx0XHRcdHJldHVybiAnaW1hZ2UvanBlZyc7XHJcblx0XHRjYXNlICdwZGYnOlxyXG5cdFx0XHRyZXR1cm4gJ2FwcGxpY2F0aW9uL3BkZic7XHJcblx0XHRjYXNlICdkb2N4JzpcclxuXHRcdGNhc2UgJ2RvYyc6XHJcblx0XHRcdHJldHVybiAnYXBwbGljYXRpb24vbXN3b3JkJztcclxuXHRcdGNhc2UgJ3J0Zic6XHJcblx0XHRcdHJldHVybiAndGV4dC9yaWNodGV4dCc7XHJcblx0XHRjYXNlICdpcGFyZGF0YSc6XHJcblx0XHRcdHJldHVybiAndGV4dC94bWwnO1xyXG5cdFx0ZGVmYXVsdDpcclxuXHRcdFx0cmV0dXJuICd0ZXh0L3BsYWluJztcclxuXHR9XHJcbn1cclxuXHJcblxyXG4vKmZ1bmN0aW9uIHNlbGVjdFNhdmVMb2NhdGlvbiAoZGF0YSkge1xyXG5cclxuXHRjb25zb2xlLmxvZyhcInNlbGVjdFNhdmVMb2NhdGlvblwiKTtcclxuXHJcblx0Ly8gTWFrZSBzdXJlIHRoZSBuZWVkIEFQSXMgYXJlIHN1cHBvcnRlZFxyXG5cdGlmKCF3aW5kb3cuRmlsZSB8fCAhd2luZG93LkZpbGVSZWFkZXIgfHwgIXdpbmRvdy5GaWxlTGlzdCB8fCAhd2luZG93LkJsb2IgfHwgIXdpbmRvdy5BcnJheUJ1ZmZlciB8fCAhd2luZG93Lldvcmtlcil7XHJcblx0XHRhbGVydCgnVGhlIEZpbGUgQVBJcyBuZWVkIHRvIGxvYWQgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyIScpO1xyXG5cdFx0Ly9kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvYWQtYnV0dG9uXCIpLmRpc2FibGVkID0gdHJ1ZTtcclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdGNvbnNvbGUubG9nIChcInNlbGVjdGluZ1NhdmVMb2NhdGlvblwiKTtcclxuXHRcclxuXHRcdC8vIEdldCB0aGUgbG9hZCBidXR0b24gYW5kIGlucHV0XHJcblx0XHR2YXIgbG9hZElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvYWQtaW5wdXQnKTtcclxuXHJcblx0XHQvLyBsb2FkIGlucHV0IGlzIGhpZGRlbiwgc28gY2xpY2sgaXRcclxuXHRcdGxvYWRJbnB1dC5jbGljaygpO1xyXG5cdFx0XHJcblx0XHQvLyBXaGVuIGxvYWQgaW5wdXQgZmlsZSBpcyBjaG9zZW4sIGxvYWQgdGhlIGZpbGVcclxuXHRcdGxvYWRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBNYWtlIHN1cmUgYSBpcGFyIGZpbGUgd2FzIGNob29zZW5cclxuXHRcdFx0aWYoIWxvYWRJbnB1dC52YWx1ZS5lbmRzV2l0aChcImlwYXJcIikpe1xyXG5cdFx0XHRcdGFsZXJ0KFwiWW91IGRpZG4ndCBjaG9vc2UgYW4gaXBhciBmaWxlISB5b3UgY2FuIG9ubHkgbG9hZCBpcGFyIGZpbGVzIVwiKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFNhdmUgdGhlIHppcCBmaWxlJ3MgbmFtZSB0byBsb2NhbCBzdG9yYWdlIFxyXG5cdFx0XHQvLyBOT1RFOiB0aGlzIHdpbGwgb3ZlcndyaXRlIHRoZSBvbGQgbmFtZSwgXHJcblx0XHRcdC8vICAgIHNvIGlmIHRoZSB1c2VyIGNob29zZXMgYSBkaWZmZXJlbnQgZmlsZSwgdGhpcyBjb3VsZCBsZWFkIHRvIGVycm9yc1xyXG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2Nhc2VOYW1lJ10gPSBsb2FkSW5wdXQuZmlsZXNbMF0ubmFtZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFJlYWQgdGhlIHppcFxyXG5cdFx0XHRKU1ppcC5sb2FkQXN5bmMobG9hZElucHV0LmZpbGVzWzBdKVxyXG5cdFx0XHQudGhlbihmdW5jdGlvbih6aXApIHtcclxuXHRcdFx0XHQvLyBiYWNrc2xhc2hlcyBwZXIgemlwIGZpbGUgcHJvdG9jb2xcclxuXHRcdFx0XHR6aXAuZmlsZShcImNhc2VcXFxcYWN0aXZlXFxcXHNhdmVGaWxlLmlwYXJkYXRhXCIsZGF0YSk7XHJcblx0XHRcdFx0Ly8gZG93bmxvYWQgdGhlIGZpbGVcclxuXHRcdFx0XHRkb3dubG9hZCh6aXApO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGV2ZW50LnRhcmdldC5maWxlc1swXSk7XHJcblx0XHRcdFxyXG5cdFx0fSwgZmFsc2UpO1xyXG5cdH1cclxufSovIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBCb2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG52YXIgTGVzc29uTm9kZSA9IHJlcXVpcmUoJy4vbGVzc29uTm9kZS5qcycpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKCcuL2RyYXdsaWIuanMnKTtcclxudmFyIERhdGFQYXJzZXIgPSByZXF1aXJlKCcuL2lwYXJEYXRhUGFyc2VyLmpzJyk7XHJcbnZhciBNb3VzZVN0YXRlID0gcmVxdWlyZSgnLi9tb3VzZVN0YXRlLmpzJyk7XHJcbnZhciBGaWxlTWFuYWdlciA9IHJlcXVpcmUoJy4vZmlsZU1hbmFnZXIuanMnKTtcclxuXHJcbi8vbW91c2UgbWFuYWdlbWVudFxyXG52YXIgbW91c2VTdGF0ZTtcclxudmFyIHByZXZpb3VzTW91c2VTdGF0ZTtcclxudmFyIGRyYWdnaW5nRGlzYWJsZWQ7XHJcbnZhciBtb3VzZVRhcmdldDtcclxudmFyIG1vdXNlU3VzdGFpbmVkRG93bjtcclxuXHJcbi8vcGhhc2UgaGFuZGxpbmdcclxudmFyIHBoYXNlT2JqZWN0O1xyXG5cclxuZnVuY3Rpb24gZ2FtZSh1cmwsIGNhbnZhcywgd2luZG93RGl2KXtcclxuXHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcclxuXHR0aGlzLm1vdXNlU3RhdGUgPSBuZXcgTW91c2VTdGF0ZShjYW52YXMpO1xyXG5cdEZpbGVNYW5hZ2VyLmxvYWRDYXNlKHVybCwgd2luZG93RGl2LCBmdW5jdGlvbihjYXRlZ29yaWVzLCBzdGFnZSl7XHJcblx0XHRnYW1lLmNhdGVnb3JpZXMgPSBjYXRlZ29yaWVzO1xyXG5cdFx0Z2FtZS5jcmVhdGVMZXNzb25Ob2RlcygpO1xyXG5cdH0pO1xyXG59XHJcblxyXG52YXIgcCA9IGdhbWUucHJvdG90eXBlO1xyXG5cclxucC5jcmVhdGVMZXNzb25Ob2RlcyA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy5ib2FyZEFycmF5ID0gW107XHJcblx0dmFyIGJvdHRvbUJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYm90dG9tQmFyXCIpO1xyXG5cdGZvcih2YXIgaT0wO2k8dGhpcy5jYXRlZ29yaWVzLmxlbmd0aDtpKyspe1xyXG5cdFx0Ly8gaW5pdGlhbGl6ZSBlbXB0eVxyXG5cdFx0XHJcblx0XHR0aGlzLmxlc3Nvbk5vZGVzID0gW107XHJcblx0XHQvLyBhZGQgYSBub2RlIHBlciBxdWVzdGlvblxyXG5cdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zLmxlbmd0aDsgaisrKSB7XHJcblx0XHRcdC8vIGNyZWF0ZSBhIG5ldyBsZXNzb24gbm9kZVxyXG5cdFx0XHR0aGlzLmxlc3Nvbk5vZGVzLnB1c2gobmV3IExlc3Nvbk5vZGUobmV3IFBvaW50KHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0ucG9zaXRpb25QZXJjZW50WCwgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXS5wb3NpdGlvblBlcmNlbnRZKSwgdGhpcy5jYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXS5pbWFnZUxpbmssIHRoaXMuY2F0ZWdvcmllc1tpXS5xdWVzdGlvbnNbal0gKSApO1xyXG5cdFx0XHQvLyBhdHRhY2ggcXVlc3Rpb24gb2JqZWN0IHRvIGxlc3NvbiBub2RlXHJcblx0XHRcdHRoaXMubGVzc29uTm9kZXNbdGhpcy5sZXNzb25Ob2Rlcy5sZW5ndGgtMV0ucXVlc3Rpb24gPSB0aGlzLmNhdGVnb3JpZXNbaV0ucXVlc3Rpb25zW2pdO1xyXG5cdFx0XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY3JlYXRlIGEgYm9hcmRcclxuXHRcdHRoaXMuYm9hcmRBcnJheS5wdXNoKG5ldyBCb2FyZChuZXcgUG9pbnQoY2FudmFzLndpZHRoLygyKnRoaXMuc2NhbGUpLGNhbnZhcy5oZWlnaHQvKDIqdGhpcy5zY2FsZSkpLCB0aGlzLmxlc3Nvbk5vZGVzKSk7XHJcblx0XHR2YXIgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkJVVFRPTlwiKTtcclxuXHRcdGJ1dHRvbi5pbm5lckhUTUwgPSB0aGlzLmNhdGVnb3JpZXNbaV0ubmFtZTtcclxuXHRcdHZhciBnYW1lID0gdGhpcztcclxuXHRcdGJ1dHRvbi5vbmNsaWNrID0gKGZ1bmN0aW9uKGkpeyBcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGlmKGdhbWUuYWN0aXZlKXtcclxuXHRcdFx0XHRcdGdhbWUuYWN0aXZlQm9hcmRJbmRleCA9IGk7XHJcblx0XHRcdFx0XHRpZihnYW1lLm9uQ2hhbmdlQm9hcmQpXHJcblx0XHRcdFx0XHRcdGdhbWUub25DaGFuZ2VCb2FyZCgpO1xyXG5cdFx0XHRcdFx0Z2FtZS51cGRhdGVOb2RlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0fX0pKGkpO1xyXG5cdFx0aWYoIXRoaXMuYm9hcmRBcnJheVt0aGlzLmJvYXJkQXJyYXkubGVuZ3RoLTFdLmZpbmlzaGVkKVxyXG5cdFx0XHRidXR0b24uZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0Ym90dG9tQmFyLmFwcGVuZENoaWxkKGJ1dHRvbik7XHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xXS5idXR0b24gPSBidXR0b247XHJcblx0XHR2YXIgZ2FtZSA9IHRoaXM7XHJcblx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xXS51cGRhdGVOb2RlID0gZnVuY3Rpb24oKXtnYW1lLnVwZGF0ZU5vZGUoKTt9O1xyXG5cdH1cclxuXHR0aGlzLmFjdGl2ZUJvYXJkSW5kZXggPSAwO1xyXG5cdHRoaXMuYWN0aXZlID0gdHJ1ZTtcclxuXHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS5idXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcclxuXHRpZihnYW1lLm9uQ2hhbmdlQm9hcmQpXHJcblx0XHRnYW1lLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHR0aGlzLnVwZGF0ZU5vZGUoKTtcclxuXHRcclxuXHQvLyByZWFkeSB0byBzYXZlXHJcblx0RmlsZU1hbmFnZXIucHJlcGFyZVppcCh0aGlzLmJvYXJkQXJyYXkpO1xyXG59XHJcblxyXG5wLnVwZGF0ZVpvb20gPSBmdW5jdGlvbihuZXdab29tKXtcclxuXHRpZih0aGlzLmFjdGl2ZSlcclxuXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLnpvb20gPSBuZXdab29tO1xyXG59XHJcblxyXG5wLmdldFpvb20gPSBmdW5jdGlvbigpe1xyXG5cdHJldHVybiB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XS56b29tO1xyXG59XHJcblxyXG5wLnVwZGF0ZSA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzLCBkdCl7XHJcblx0XHJcblx0aWYodGhpcy5hY3RpdmUpe1xyXG5cdFx0XHJcblx0ICAgIC8vIFVwZGF0ZSB0aGUgbW91c2Ugc3RhdGVcclxuXHRcdHRoaXMubW91c2VTdGF0ZS51cGRhdGUoZHQsIHRoaXMuc2NhbGUqdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF0uem9vbSk7XHJcblx0XHRcclxuXHRcdGlmICh0aGlzLm1vdXNlU3RhdGUubW91c2VDbGlja2VkKSB7XHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYXV0b3NhdmVcIixEYXRhUGFyc2VyLmNyZWF0ZVhNTFNhdmVGaWxlKHRoaXMuYm9hcmRBcnJheSwgZmFsc2UpKTtcclxuXHRcdFx0Ly9jb25zb2xlLmxvZyhsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImF1dG9zYXZlXCIpKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdCAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgYm9hcmQgKGdpdmUgaXQgdGhlIG1vdXNlIG9ubHkgaWYgbm90IHpvb21pbmcpXHJcblx0ICAgIHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmFjdCgodGhpcy56b29taW4gfHwgdGhpcy56b29tb3V0ID8gbnVsbCA6IHRoaXMubW91c2VTdGF0ZSksIGR0KTtcclxuXHQgICAgXHJcblx0ICAgIC8vIENoZWNrIGlmIG5ldyBib2FyZCBhdmFpbGFibGVcclxuXHQgICAgaWYodGhpcy5hY3RpdmVCb2FyZEluZGV4IDwgdGhpcy5ib2FyZEFycmF5Lmxlbmd0aC0xICYmXHJcblx0ICAgIFx0XHR0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4KzFdLmJ1dHRvbi5kaXNhYmxlZCAmJiBcclxuXHQgICAgXHRcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmZpbmlzaGVkKVxyXG5cdCAgICBcdHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXgrMV0uYnV0dG9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0XHRcclxuXHJcblx0XHQvLyBJZiB0aGUgYm9hcmQgaXMgZG9uZSB6b29tIG91dCB0byBjZW50ZXJcclxuXHRcdGlmKHRoaXMuem9vbW91dCl7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBHZXQgdGhlIGN1cnJlbnQgYm9hcmRcclxuXHRcdFx0dmFyIGJvYXJkID0gdGhpcy5ib2FyZEFycmF5W3RoaXMuYWN0aXZlQm9hcmRJbmRleF07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBab29tIG91dCBhbmQgbW92ZSB0b3dhcmRzIGNlbnRlclxyXG5cdFx0XHRpZih0aGlzLmdldFpvb20oKT5Db25zdGFudHMuc3RhcnRab29tKVxyXG5cdFx0XHRcdGJvYXJkLnpvb20gLT0gZHQqQ29uc3RhbnRzLnpvb21TcGVlZDtcclxuXHRcdFx0ZWxzZSBpZih0aGlzLmdldFpvb20oKTxDb25zdGFudHMuc3RhcnRab29tKVxyXG5cdFx0XHRcdGJvYXJkLnpvb20gPSBDb25zdGFudHMuc3RhcnRab29tO1xyXG5cdFx0XHRib2FyZC5tb3ZlVG93YXJkcyhuZXcgUG9pbnQoQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzIsIENvbnN0YW50cy5ib2FyZFNpemUueS8yKSwgZHQsIENvbnN0YW50cy56b29tTW92ZVNwZWVkKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGwgdGhlIGNoYW5nZSBtZXRob2RcclxuXHRcdFx0aWYodGhpcy5vbkNoYW5nZUJvYXJkKVxyXG5cdFx0XHRcdHRoaXMub25DaGFuZ2VCb2FyZCgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gSWYgZnVsbHkgem9vbWVkIG91dCBhbmQgaW4gY2VudGVyIHN0b3BcclxuXHRcdFx0aWYodGhpcy5nZXRab29tKCk9PUNvbnN0YW50cy5zdGFydFpvb20gJiYgYm9hcmQuYm9hcmRPZmZzZXQueD09Q29uc3RhbnRzLmJvYXJkU2l6ZS54LzIgJiYgYm9hcmQuYm9hcmRPZmZzZXQueT09Q29uc3RhbnRzLmJvYXJkU2l6ZS55LzIpe1x0XHRcdFx0XHJcblx0XHRcdFx0dGhpcy56b29tb3V0ID0gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH0gLy8gSWYgdGhlcmUgaXMgYSBuZXcgbm9kZSB6b29tIGludG8gaXRcclxuXHRcdGVsc2UgaWYodGhpcy56b29taW4peyBcclxuXHRcdFx0XHJcblx0XHRcdC8vIEdldCB0aGUgY3VycmVudCBib2FyZFxyXG5cdFx0XHR2YXIgYm9hcmQgPSB0aGlzLmJvYXJkQXJyYXlbdGhpcy5hY3RpdmVCb2FyZEluZGV4XTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIElmIGJvYXJkIGlzIG5vdCBmaW5pc2hlZCBsb29rIGZvciBuZXh0IG5vZGVcclxuXHRcdFx0aWYoIWJvYXJkLmZpbmlzaGVkICYmIHRoaXMudGFyZ2V0Tm9kZT09bnVsbCl7XHJcblx0XHRcdFx0dGhpcy50YXJnZXROb2RlID0gYm9hcmQuZ2V0RnJlZU5vZGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKGJvYXJkLmZpbmlzaGVkKXtcclxuXHRcdFx0XHR0aGlzLnpvb21pbiA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuem9vbW91dCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIFN0YXJ0IG1vdmluZyBhbmQgem9vbWluZyBpZiB0YXJnZXQgZm91bmRcclxuXHRcdFx0aWYodGhpcy56b29taW4gJiYgdGhpcy50YXJnZXROb2RlKXtcclxuXHRcdFxyXG5cdFx0XHRcdC8vIFpvb20gaW4gYW5kIG1vdmUgdG93YXJkcyB0YXJnZXQgbm9kZVxyXG5cdFx0XHRcdGlmKHRoaXMuZ2V0Wm9vbSgpPENvbnN0YW50cy5lbmRab29tKVxyXG5cdFx0XHRcdFx0Ym9hcmQuem9vbSArPSBkdCpDb25zdGFudHMuem9vbVNwZWVkO1xyXG5cdFx0XHRcdGVsc2UgaWYodGhpcy5nZXRab29tKCk+Q29uc3RhbnRzLmVuZFpvb20pXHJcblx0XHRcdFx0XHRib2FyZC56b29tID0gQ29uc3RhbnRzLmVuZFpvb207XHJcblx0XHRcdFx0Ym9hcmQubW92ZVRvd2FyZHModGhpcy50YXJnZXROb2RlLnBvc2l0aW9uLCBkdCwgQ29uc3RhbnRzLnpvb21Nb3ZlU3BlZWQpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIENhbGwgdGhlIGNoYW5nZSBtZXRob2RcclxuXHRcdFx0XHRpZih0aGlzLm9uQ2hhbmdlQm9hcmQpXHJcblx0XHRcdFx0XHR0aGlzLm9uQ2hhbmdlQm9hcmQoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBJZiByZWFjaGVkIHRoZSBub2RlIGFuZCB6b29tZWQgaW4gc3RvcCBhbmQgZ2V0IHJpZCBvZiB0aGUgdGFyZ2V0XHJcblx0XHRcdFx0aWYodGhpcy5nZXRab29tKCk9PUNvbnN0YW50cy5lbmRab29tICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lng9PXRoaXMudGFyZ2V0Tm9kZS5wb3NpdGlvbi54ICYmIGJvYXJkLmJvYXJkT2Zmc2V0Lnk9PXRoaXMudGFyZ2V0Tm9kZS5wb3NpdGlvbi55KXtcclxuXHRcdFx0XHRcdHRoaXMuem9vbWluID0gZmFsc2U7XHJcblx0XHRcdFx0XHR0aGlzLnRhcmdldE5vZGUgPSBudWxsO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdCAgICBcclxuXHQgICAgLy8gZHJhdyBzdHVmZiBubyBtYXR0ZXIgd2hhdFxyXG5cdCAgICB0aGlzLmRyYXcoY3R4LCBjYW52YXMpO1xyXG5cdH1cclxufVxyXG5cclxucC5kcmF3ID0gZnVuY3Rpb24oY3R4LCBjYW52YXMpe1xyXG5cdFxyXG5cdC8vIERyYXcgdGhlIGJhY2tncm91bmRcclxuXHREcmF3TGliLnJlY3QoY3R4LCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQsIFwiIzE1NzE4RlwiKTtcclxuICAgIFxyXG5cdC8vIFNjYWxlIHRoZSBnYW1lXHJcblx0Y3R4LnNhdmUoKTtcclxuXHRjdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aC8yLCBjYW52YXMuaGVpZ2h0LzIpO1xyXG5cdGN0eC5zY2FsZSh0aGlzLnNjYWxlLCB0aGlzLnNjYWxlKTtcclxuXHRjdHgudHJhbnNsYXRlKC1jYW52YXMud2lkdGgvMiwgLWNhbnZhcy5oZWlnaHQvMik7XHJcblx0Ly9jdHgudHJhbnNsYXRlKGNhbnZhcy53aWR0aCp0aGlzLnNjYWxlLWNhbnZhcy53aWR0aCwgY2FudmFzLndpZHRoKnRoaXMuc2NhbGUtY2FudmFzLndpZHRoKTtcclxuXHRcclxuICAgIC8vIERyYXcgdGhlIGN1cnJlbnQgYm9hcmRcclxuICAgIHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLmRyYXcoY3R4LCBjYW52YXMpO1xyXG5cclxuICAgIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbnAudXBkYXRlTm9kZSA9IGZ1bmN0aW9uKCl7XHJcblx0dGhpcy56b29taW4gPSB0cnVlO1xyXG59XHJcblxyXG5wLndpbmRvd0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdHZhciBmaWxlVG9TdG9yZSA9IHRoaXMuYm9hcmRBcnJheVt0aGlzLmFjdGl2ZUJvYXJkSW5kZXhdLndpbmRvd0Nsb3NlZCgpO1xyXG5cdGlmIChmaWxlVG9TdG9yZSkge1xyXG5cdFx0RmlsZU1hbmFnZXIuYWRkTmV3RmlsZVRvU3lzdGVtKFx0XHQgIC8vIG5lZWQgdG8gc3RvcmUgbnVtYmVyIG9mIGZpbGVzXHJcblx0XHRcdFwiXCIrdGhpcy5hY3RpdmVCb2FyZEluZGV4K1wiLVwiK2ZpbGVUb1N0b3JlLm51bStcIi1cIitcIjBcIitmaWxlVG9TdG9yZS5leHQsXHJcblx0XHRcdGZpbGVUb1N0b3JlLmJsb2IpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnYW1lO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIENhdGVnb3J5ID0gcmVxdWlyZShcIi4vY2F0ZWdvcnkuanNcIik7XHJcbnZhciBSZXNvdXJjZSA9IHJlcXVpcmUoXCIuL3Jlc291cmNlcy5qc1wiKTtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG52YXIgUXVlc3Rpb24gPSByZXF1aXJlKCcuL3F1ZXN0aW9uLmpzJyk7XHJcbnZhciBRdWVzdGlvbldpbmRvd3MgPSByZXF1aXJlKCcuL3F1ZXN0aW9uV2luZG93cy5qcycpO1xyXG53aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCAgPSB3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTCB8fCB3aW5kb3cud2Via2l0UmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTDtcclxuXHJcbi8vIFBhcnNlcyB0aGUgeG1sIGNhc2UgZmlsZXNcclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBrbm93biB0YWdzXHJcbi8qXHJcbmFuc3dlclxyXG5idXR0b25cclxuY2F0ZWdvcnlMaXN0XHJcbmNvbm5lY3Rpb25zXHJcbmVsZW1lbnRcclxuZmVlZGJhY2tcclxuaW5zdHJ1Y3Rpb25zXHJcbnJlc291cmNlXHJcbnJlc291cmNlTGlzdFxyXG5yZXNvdXJjZUluZGV4XHJcbnNvZnR3YXJlTGlzdFxyXG5xdWVzdGlvblxyXG5xdWVzdGlvblRleHRcclxucXVzdGlvbk5hbWVcclxuKi9cclxuXHJcbi8vIGNvbnZlcnNpb25cclxudmFyIHN0YXRlQ29udmVydGVyID0ge1xyXG5cdFwiaGlkZGVuXCIgOiBRdWVzdGlvbi5TT0xWRV9TVEFURS5ISURERU4sXHJcblx0XCJ1bnNvbHZlZFwiIDogIFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlVOU09MVkVELFxyXG5cdFwiY29ycmVjdFwiIDogIFF1ZXN0aW9uLlNPTFZFX1NUQVRFLlNPTFZFRFxyXG59XHJcbi8vIGNvbnZlcnNpb25cclxudmFyIHJldmVyc2VTdGF0ZUNvbnZlcnRlciA9IFtcImhpZGRlblwiLCBcInVuc29sdmVkXCIsIFwiY29ycmVjdFwiXTtcclxuXHJcbi8vIE1vZHVsZSBleHBvcnRcclxudmFyIG0gPSBtb2R1bGUuZXhwb3J0cztcclxuXHRcdFx0XHRcclxuLy8gKioqKioqKioqKioqKioqKioqKioqKiBMT0FESU5HICoqKioqKioqKioqKioqKioqKioqKioqKlxyXG5cclxuLy8gc2V0IHRoZSBxdWVzdGlvbiBzdGF0ZXNcclxubS5hc3NpZ25RdWVzdGlvblN0YXRlcyA9IGZ1bmN0aW9uKGNhdGVnb3JpZXMsIHF1ZXN0aW9uRWxlbXMpIHtcclxuXHRjb25zb2xlLmxvZyhcInFlbGVtczogXCIgKyBxdWVzdGlvbkVsZW1zLmxlbmd0aCk7XHJcblx0dmFyIHRhbGx5ID0gMDsgLy8gdHJhY2sgdG90YWwgaW5kZXggaW4gbmVzdGVkIGxvb3BcclxuXHRcclxuXHQvLyBhbGwgcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPGNhdGVnb3JpZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdGZvciAodmFyIGo9MDsgajxjYXRlZ29yaWVzW2ldLnF1ZXN0aW9ucy5sZW5ndGg7IGorKywgdGFsbHkrKykge1xyXG5cdFx0XHJcblx0XHRcdC8vIHN0b3JlIHF1ZXN0aW9uICBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHEgPSBjYXRlZ29yaWVzW2ldLnF1ZXN0aW9uc1tqXTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHN0b3JlIHRhZyBmb3IgZWFzeSByZWZlcmVuY2VcclxuXHRcdFx0dmFyIHFFbGVtID0gcXVlc3Rpb25FbGVtc1t0YWxseV07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJZiBwb3NpdGlvbiBpcyBsZXNzIHRoYW4gemVybyBkb24ndCBsb2FkIHRoZSBxdWVzdGlvblxyXG5cdFx0XHRpZihwYXJzZUludChxRWxlbS5nZXRBdHRyaWJ1dGUoXCJwb3NpdGlvblBlcmNlbnRYXCIpKTwwIHx8IFxyXG5cdFx0XHRcdFx0cGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WVwiKSk8MClcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHN0YXRlXHJcblx0XHRcdHEuY3VycmVudFN0YXRlID0gc3RhdGVDb252ZXJ0ZXJbcUVsZW0uZ2V0QXR0cmlidXRlKFwicXVlc3Rpb25TdGF0ZVwiKV07XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBqdXN0aWZpY2F0aW9uXHJcblx0XHRcdGlmKHEuanVzdGlmaWNhdGlvbilcclxuXHRcdFx0XHRxLmp1c3RpZmljYXRpb24udmFsdWUgPSBxRWxlbS5nZXRBdHRyaWJ1dGUoXCJqdXN0aWZpY2F0aW9uXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ2FsbCBjb3JyZWN0IGFuc3dlciBpZiBzdGF0ZSBpcyBjb3JyZWN0XHJcblx0XHRcdGlmKHEuY3VycmVudFN0YXRlPT1RdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpXHJcblx0XHRcdCAgcS5jb3JyZWN0QW5zd2VyKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdC8vIHhwb3NcclxuXHRcdFx0cS5wb3NpdGlvblBlcmNlbnRYID0gVXRpbGl0aWVzLm1hcChwYXJzZUludChxRWxlbS5nZXRBdHRyaWJ1dGUoXCJwb3NpdGlvblBlcmNlbnRYXCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngpO1xyXG5cdFx0XHQvLyB5cG9zXHJcblx0XHRcdHEucG9zaXRpb25QZXJjZW50WSA9IFV0aWxpdGllcy5tYXAocGFyc2VJbnQocUVsZW0uZ2V0QXR0cmlidXRlKFwicG9zaXRpb25QZXJjZW50WVwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55KTtcclxuXHRcdFx0XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vLyB0YWtlcyB0aGUgeG1sIHN0cnVjdHVyZSBhbmQgZmlsbHMgaW4gdGhlIGRhdGEgZm9yIHRoZSBxdWVzdGlvbiBvYmplY3RcclxubS5nZXRDYXRlZ29yaWVzQW5kUXVlc3Rpb25zID0gZnVuY3Rpb24ocmF3RGF0YSwgdXJsLCB3aW5kb3dEaXYsIHdpbmRvd3MpIHtcclxuXHQvLyBpZiB0aGVyZSBpcyBhIGNhc2UgZmlsZVxyXG5cdGlmIChyYXdEYXRhICE9IG51bGwpIHtcclxuXHRcdFxyXG5cdFx0Ly8gRmlyc3QgbG9hZCB0aGUgcmVzb3VyY2VzXHJcblx0XHR2YXIgcmVzb3VyY2VFbGVtZW50cyA9IHJhd0RhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZUxpc3RcIilbMF0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJyZXNvdXJjZVwiKTtcclxuXHRcdHZhciByZXNvdXJjZXMgPSBbXTtcclxuXHRcdGZvciAodmFyIGk9MDsgaTxyZXNvdXJjZUVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdC8vIExvYWQgZWFjaCByZXNvdXJjZVxyXG5cdFx0XHRyZXNvdXJjZXNbaV0gPSBuZXcgUmVzb3VyY2UocmVzb3VyY2VFbGVtZW50c1tpXSwgdXJsKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gVGhlbiBsb2FkIHRoZSBjYXRlZ29yaWVzXHJcblx0XHR2YXIgY2F0ZWdvcnlFbGVtZW50cyA9IHJhd0RhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYXRlZ29yeVwiKTtcclxuXHRcdHZhciBjYXRlZ29yeU5hbWVzID0gcmF3RGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhdGVnb3J5TGlzdFwiKVswXS5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVsZW1lbnRcIik7XHJcblx0XHR2YXIgY2F0ZWdvcmllcyA9IFtdO1xyXG5cdFx0Zm9yICh2YXIgaT0wOyBpPGNhdGVnb3J5RWxlbWVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Ly8gTG9hZCBlYWNoIGNhdGVnb3J5ICh3aGljaCBsb2FkcyBlYWNoIHF1ZXN0aW9uKVxyXG5cdFx0XHRjYXRlZ29yaWVzW2ldID0gbmV3IENhdGVnb3J5KGNhdGVnb3J5TmFtZXNbaV0uaW5uZXJIVE1MLCBjYXRlZ29yeUVsZW1lbnRzW2ldLCByZXNvdXJjZXMsIHVybCwgd2luZG93RGl2LCB3aW5kb3dzKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBjYXRlZ29yaWVzO1xyXG5cdH1cclxuXHRyZXR1cm4gbnVsbFxyXG59XHJcblxyXG4vLyBjcmVhdGVzIGEgY2FzZSBmaWxlIGZvciB6aXBwaW5nXHJcbm0ucmVjcmVhdGVDYXNlRmlsZSA9IGZ1bmN0aW9uKGJvYXJkcykge1xyXG5cclxuXHQvLyBjcmVhdGUgc2F2ZSBmaWxlIHRleHRcclxuXHR2YXIgZGF0YVRvU2F2ZSA9IG0uY3JlYXRlWE1MU2F2ZUZpbGUoYm9hcmRzLCB0cnVlKTtcclxuXHRcclxuXHRjb25zb2xlLmxvZyAoXCJzYXZlRGF0YS5pcGFyIGRhdGEgY3JlYXRlZFwiKTtcclxuXHRcclxuXHQvL2lmIChjYWxsYmFjaykgY2FsbGJhY2soZGF0YVRvU2F2ZSk7XHJcblx0cmV0dXJuIGRhdGFUb1NhdmU7XHJcblx0XHJcbn1cclxuXHJcbi8vIGNyZWF0ZXMgdGhlIHhtbFxyXG5tLmNyZWF0ZVhNTFNhdmVGaWxlID0gZnVuY3Rpb24oYm9hcmRzLCBpbmNsdWRlTmV3bGluZSkge1xyXG5cdC8vIG5ld2xpbmVcclxuXHR2YXIgbmw7XHJcblx0aW5jbHVkZU5ld2xpbmUgPyBubCA9IFwiXFxuXCIgOiBubCA9IFwiXCI7XHJcblx0Ly8gaGVhZGVyXHJcblx0dmFyIG91dHB1dCA9ICc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJ1dGYtOFwiPz4nICsgbmw7XHJcblx0Ly8gY2FzZSBkYXRhXHJcblx0b3V0cHV0ICs9ICc8Y2FzZSBjYXRlZ29yeUluZGV4PVwiM1wiIGNhc2VTdGF0dXM9XCIxXCIgcHJvZmlsZUZpcnN0PVwialwiIHByb2ZpbGVMYXN0PVwialwiIHByb2ZpbGVNYWlsPVwialwiPicgKyBubDtcclxuXHQvLyBxdWVzdGlvbnMgaGVhZGVyXHJcblx0b3V0cHV0ICs9ICc8cXVlc3Rpb25zPicgKyBubDtcclxuXHRcclxuXHQvLyBsb29wIHRocm91Z2ggcXVlc3Rpb25zXHJcblx0Zm9yICh2YXIgaT0wOyBpPGJvYXJkcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Zm9yICh2YXIgaj0wOyBqPGJvYXJkc1tpXS5sZXNzb25Ob2RlQXJyYXkubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0Ly8gc2hvcnRoYW5kXHJcblx0XHRcdHZhciBxID0gYm9hcmRzW2ldLmxlc3Nvbk5vZGVBcnJheVtqXS5xdWVzdGlvbjtcclxuXHRcdFx0XHJcblx0XHRcdC8vIHRhZyBzdGFydFxyXG5cdFx0XHRvdXRwdXQgKz0gJzxxdWVzdGlvbiAnO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gcXVlc3Rpb25TdGF0ZVxyXG5cdFx0XHRvdXRwdXQgKz0gJ3F1ZXN0aW9uU3RhdGU9XCInICsgcmV2ZXJzZVN0YXRlQ29udmVydGVyW3EuY3VycmVudFN0YXRlXSArICdcIiAnO1xyXG5cdFx0XHQvLyBqdXN0aWZpY2F0aW9uXHJcblx0XHRcdHZhciBuZXdKdXN0aWZpY2F0aW9uID0gcS5qdXN0aWZpY2F0aW9uLnZhbHVlO1xyXG5cdFx0XHR2YXIganVzdGlmaWNhdGlvbjtcclxuXHRcdFx0bmV3SnVzdGlmaWNhdGlvbiA/IGp1c3RpZmljYXRpb24gPSBuZXdKdXN0aWZpY2F0aW9uIDoganVzdGlmaWNhdGlvbiA9IHEuanVzdGlmaWNhdGlvblN0cmluZztcclxuXHRcdFx0b3V0cHV0ICs9ICdqdXN0aWZpY2F0aW9uPVwiJyArIGp1c3RpZmljYXRpb24gKyAnXCIgJztcclxuXHRcdFx0Ly8gYW5pbWF0ZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdhbmltYXRlZD1cIicgKyAocS5jdXJyZW50U3RhdGUgPT0gMikgKyAnXCIgJzsgLy8gbWlnaHQgaGF2ZSB0byBmaXggdGhpcyBsYXRlclxyXG5cdFx0XHQvLyBsaW5lc1RyYW5jZWRcclxuXHRcdFx0b3V0cHV0ICs9ICdsaW5lc1RyYWNlZD1cIjBcIiAnOyAvLyBtaWdodCBoYXZlIHRvIGZpeCB0aGlzIHRvb1xyXG5cdFx0XHQvLyByZXZlYWxCdWZmZXJcclxuXHRcdFx0b3V0cHV0ICs9ICdyZXZlYWxCdWZmZXI9XCIwXCIgJzsgLy8gYW5kIHRoaXNcclxuXHRcdFx0Ly8gcG9zaXRpb25QZXJjZW50WFxyXG5cdFx0XHRvdXRwdXQgKz0gJ3Bvc2l0aW9uUGVyY2VudFg9XCInICsgVXRpbGl0aWVzLm1hcChxLnBvc2l0aW9uUGVyY2VudFgsIDAsIENvbnN0YW50cy5ib2FyZFNpemUueCwgMCwgMTAwKSArICdcIiAnO1xyXG5cdFx0XHQvLyBwb3NpdGlvblBlcmNlbnRZXHJcblx0XHRcdG91dHB1dCArPSAncG9zaXRpb25QZXJjZW50WT1cIicgKyBVdGlsaXRpZXMubWFwKHEucG9zaXRpb25QZXJjZW50WSwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55LCAwLCAxMDApICsgJ1wiICc7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyB0YWcgZW5kXHJcblx0XHRcdG91dHB1dCArPSAnLz4nICsgbmw7XHJcblx0XHR9XHJcblx0fVxyXG5cdG91dHB1dCArPSBcIjwvcXVlc3Rpb25zPlwiICsgbmw7XHJcblx0b3V0cHV0ICs9IFwiPC9jYXNlPlwiICsgbmw7XHJcblx0cmV0dXJuIG91dHB1dDtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIERyYXdMaWIgPSByZXF1aXJlKCcuL2RyYXdMaWIuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZShcIi4vcXVlc3Rpb24uanNcIik7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jb25zdGFudHMuanNcIik7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vcG9pbnQuanMnKTtcclxudmFyIFF1ZXN0aW9uID0gcmVxdWlyZSgnLi9xdWVzdGlvbi5qcycpO1xyXG5cclxudmFyIENIRUNLX0lNQUdFID0gXCIuLi9pbWcvaWNvblBvc3RJdENoZWNrLnBuZ1wiO1xyXG5cclxuLy9wYXJhbWV0ZXIgaXMgYSBwb2ludCB0aGF0IGRlbm90ZXMgc3RhcnRpbmcgcG9zaXRpb25cclxuZnVuY3Rpb24gbGVzc29uTm9kZShzdGFydFBvc2l0aW9uLCBpbWFnZVBhdGgsIHBRdWVzdGlvbil7XHJcbiAgICBcclxuICAgIHRoaXMucG9zaXRpb24gPSBzdGFydFBvc2l0aW9uO1xyXG4gICAgdGhpcy5kcmFnTG9jYXRpb24gPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLm1vdXNlT3ZlciA9IGZhbHNlO1xyXG4gICAgdGhpcy5kcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgdGhpcy50eXBlID0gXCJsZXNzb25Ob2RlXCI7XHJcbiAgICB0aGlzLmltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICB0aGlzLmNoZWNrID0gbmV3IEltYWdlKCk7XHJcbiAgICB0aGlzLndpZHRoO1xyXG4gICAgdGhpcy5oZWlnaHQ7XHJcbiAgICB0aGlzLnF1ZXN0aW9uID0gcFF1ZXN0aW9uO1xyXG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IDA7XHJcbiAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlO1xyXG4gICAgdGhpcy5saW5lUGVyY2VudCA9IDA7XHJcbiAgICBcclxuICAgIC8vIHNraXAgYW5pbWF0aW9ucyBmb3Igc29sdmVkXHJcbiAgICBpZiAocFF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSA9PSBRdWVzdGlvbi5TT0xWRV9TVEFURS5TT0xWRUQpIHRoaXMubGluZVBlcmNlbnQgPSAxO1xyXG4gICAgXHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAvL2ltYWdlIGxvYWRpbmcgYW5kIHJlc2l6aW5nXHJcbiAgICB0aGlzLmltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoYXQud2lkdGggPSB0aGF0LmltYWdlLm5hdHVyYWxXaWR0aDtcclxuICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaW1hZ2UubmF0dXJhbEhlaWdodDtcclxuICAgICAgICB2YXIgbWF4RGltZW5zaW9uID0gQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzEwO1xyXG4gICAgICAgIC8vdG9vIHNtYWxsP1xyXG4gICAgICAgIGlmKHRoYXQud2lkdGggPCBtYXhEaW1lbnNpb24gJiYgdGhhdC5oZWlnaHQgPCBtYXhEaW1lbnNpb24pe1xyXG4gICAgICAgICAgICB2YXIgeDtcclxuICAgICAgICAgICAgaWYodGhhdC53aWR0aCA+IHRoYXQuaGVpZ2h0KXtcclxuICAgICAgICAgICAgICAgIHggPSBtYXhEaW1lbnNpb24gLyB0aGF0LndpZHRoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICB4ID0gbWF4RGltZW5zaW9uIC8gdGhhdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhhdC53aWR0aCA9IHRoYXQud2lkdGggKiB4O1xyXG4gICAgICAgICAgICB0aGF0LmhlaWdodCA9IHRoYXQuaGVpZ2h0ICogeDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhhdC53aWR0aCA+IG1heERpbWVuc2lvbiB8fCB0aGF0LmhlaWdodCA+IG1heERpbWVuc2lvbil7XHJcbiAgICAgICAgICAgIHZhciB4O1xyXG4gICAgICAgICAgICBpZih0aGF0LndpZHRoID4gdGhhdC5oZWlnaHQpe1xyXG4gICAgICAgICAgICAgICAgeCA9IHRoYXQud2lkdGggLyBtYXhEaW1lbnNpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIHggPSB0aGF0LmhlaWdodCAvIG1heERpbWVuc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGF0LndpZHRoID0gdGhhdC53aWR0aCAvIHg7XHJcbiAgICAgICAgICAgIHRoYXQuaGVpZ2h0ID0gdGhhdC5oZWlnaHQgLyB4O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgdGhhdC5wb3NpdGlvbi54ICs9IHRoYXQud2lkdGgvMjtcclxuICAgICAgICB0aGF0LnBvc2l0aW9uLnkgKz0gdGhhdC5oZWlnaHQvMjtcclxuICAgIH07XHJcbiAgICBcclxuICAgIHRoaXMuaW1hZ2Uuc3JjID0gaW1hZ2VQYXRoO1xyXG4gICAgdGhpcy5jaGVjay5zcmMgPSBDSEVDS19JTUFHRTtcclxufVxyXG5cclxudmFyIHAgPSBsZXNzb25Ob2RlLnByb3RvdHlwZTtcclxuXHJcbnAuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgY2FudmFzKXtcclxuXHJcblx0Ly8gQ2hlY2sgaWYgcXVlc3Rpb24gaXMgdmlzaWJsZVxyXG5cdGlmKHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlPT1RdWVzdGlvbi5TT0xWRV9TVEFURS5ISURERU4pe1xyXG5cdFx0aWYodGhpcy5xdWVzdGlvbi5yZXZlYWxUaHJlc2hvbGQgPD0gdGhpcy5jb25uZWN0aW9ucyl7XHJcblx0XHRcdHRoaXMucXVlc3Rpb24uY3VycmVudFN0YXRlID0gUXVlc3Rpb24uU09MVkVfU1RBVEUuVU5TT0xWRUQ7XHJcblx0XHRcdHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5xdWVzdGlvbi5jdXJyZW50U3RhdGU7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHRcdHJldHVybjtcclxuXHR9XHJcblx0XHJcbiAgICAvL2xlc3Nvbk5vZGUuZHJhd0xpYi5jaXJjbGUoY3R4LCB0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgMTAsIFwicmVkXCIpO1xyXG4gICAgLy9kcmF3IHRoZSBpbWFnZSwgc2hhZG93IGlmIGhvdmVyZWRcclxuICAgIGN0eC5zYXZlKCk7XHJcbiAgICBpZih0aGlzLmRyYWdnaW5nKSB7XHJcbiAgICBcdGN0eC5zaGFkb3dDb2xvciA9ICd5ZWxsb3cnO1xyXG4gICAgICAgIGN0eC5zaGFkb3dCbHVyID0gNTtcclxuXHRcdGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnLXdlYmtpdC1ncmFiYmluZyc7XHJcblx0XHRjYW52YXMuc3R5bGUuY3Vyc29yID0gJy1tb3otZ3JhYmJpbmcnO1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKHRoaXMubW91c2VPdmVyKXtcclxuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnZG9kZ2VyQmx1ZSc7XHJcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSA1O1xyXG5cdFx0Y2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcclxuICAgIH1cclxuICAgIC8vZHJhd2luZyB0aGUgYnV0dG9uIGltYWdlXHJcbiAgICBjdHguZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIHRoaXMucG9zaXRpb24ueCAtIHRoaXMud2lkdGgvMiwgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5oZWlnaHQvMiwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xyXG4gICAgXHJcbiAgICAvL2RyYXdpbmcgdGhlIHBpblxyXG4gICAgc3dpdGNoICh0aGlzLnF1ZXN0aW9uLmN1cnJlbnRTdGF0ZSkge1xyXG4gICAgXHRjYXNlIDE6XHJcbiAgICBcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiYmx1ZVwiO1xyXG5cdFx0XHRjdHguc3Ryb2tlU3R5bGUgPSBcImN5YW5cIjtcclxuXHRcdFx0YnJlYWs7XHJcbiAgICAgXHRjYXNlIDI6XHJcbiAgICAgXHRcdGN0eC5kcmF3SW1hZ2UodGhpcy5jaGVjaywgdGhpcy5wb3NpdGlvbi54ICsgdGhpcy53aWR0aC8yIC0gQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwLCB0aGlzLnBvc2l0aW9uLnkgKyB0aGlzLmhlaWdodC8yIC0gQ29uc3RhbnRzLmJvYXJkU2l6ZS54LzUwLCBDb25zdGFudHMuYm9hcmRTaXplLngvNTAsIENvbnN0YW50cy5ib2FyZFNpemUueC81MCk7XHJcbiAgICBcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuXHRcdFx0Y3R4LnN0cm9rZVN0eWxlID0gXCJ5ZWxsb3dcIjtcclxuXHRcdFx0YnJlYWs7XHJcbiAgICB9XHJcblx0dmFyIHNtYWxsZXIgPSB0aGlzLndpZHRoIDwgdGhpcy5oZWlnaHQgPyB0aGlzLndpZHRoIDogdGhpcy5oZWlnaHQ7XHJcblx0Y3R4LmxpbmVXaWR0aCA9IHNtYWxsZXIvMzI7XHJcblxyXG5cdGN0eC5iZWdpblBhdGgoKTtcclxuXHR2YXIgbm9kZVBvaW50ID0gdGhpcy5nZXROb2RlUG9pbnQoKTtcclxuXHRjdHguYXJjKG5vZGVQb2ludC54LCBub2RlUG9pbnQueSwgc21hbGxlciozLzMyLCAwLCAyKk1hdGguUEkpO1xyXG5cdGN0eC5jbG9zZVBhdGgoKTtcclxuXHRjdHguZmlsbCgpO1xyXG5cdGN0eC5zdHJva2UoKTtcclxuICAgIFxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufTtcclxuXHJcbnAuZ2V0Tm9kZVBvaW50ID0gZnVuY3Rpb24oKXtcclxuXHR2YXIgc21hbGxlciA9IHRoaXMud2lkdGggPCB0aGlzLmhlaWdodCA/IHRoaXMud2lkdGggOiB0aGlzLmhlaWdodDtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMucG9zaXRpb24ueCAtIHRoaXMud2lkdGgvMiArIHNtYWxsZXIqMy8xNiwgdGhpcy5wb3NpdGlvbi55IC0gdGhpcy5oZWlnaHQvMiArIHNtYWxsZXIqMy8xNik7XHJcbn1cclxuXHJcbnAuY2xpY2sgPSBmdW5jdGlvbihtb3VzZVN0YXRlKXtcclxuICAgIHRoaXMucXVlc3Rpb24uZGlzcGxheVdpbmRvd3MoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBsZXNzb25Ob2RlOyIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL3BvaW50LmpzJyk7XHJcblxyXG4vLyBwcml2YXRlIHZhcmlhYmxlc1xyXG52YXIgbW91c2VQb3NpdGlvbiwgcmVsYXRpdmVNb3VzZVBvc2l0aW9uO1xyXG52YXIgbW91c2VEb3duVGltZXIsIG1heENsaWNrRHVyYXRpb247XHJcbnZhciBtb3VzZVdoZWVsVmFsO1xyXG52YXIgcHJldlRpbWUsIGR0O1xyXG52YXIgc2NhbGU7XHJcblxyXG5mdW5jdGlvbiBtb3VzZVN0YXRlKGNhbnZhcyl7XHJcblx0XHJcblx0bW91c2VQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgcmVsYXRpdmVNb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KDAsMCk7XHJcbiAgICB0aGlzLnZpcnR1YWxQb3NpdGlvbiA9IG5ldyBQb2ludCgwLDApO1xyXG4gICAgXHJcbiAgICAvL2V2ZW50IGxpc3RlbmVycyBmb3IgbW91c2UgaW50ZXJhY3Rpb25zIHdpdGggdGhlIGNhbnZhc1xyXG4gICAgdmFyIG1vdXNlU3RhdGUgPSB0aGlzO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgdmFyIGJvdW5kUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBtb3VzZVBvc2l0aW9uID0gbmV3IFBvaW50KGUuY2xpZW50WCAtIGJvdW5kUmVjdC5sZWZ0LCBlLmNsaWVudFkgLSBib3VuZFJlY3QudG9wKTtcclxuICAgICAgICByZWxhdGl2ZU1vdXNlUG9zaXRpb24gPSBuZXcgUG9pbnQobW91c2VQb3NpdGlvbi54IC0gKGNhbnZhcy5vZmZzZXRXaWR0aC8yLjApLCBtb3VzZVBvc2l0aW9uLnkgLSAoY2FudmFzLm9mZnNldEhlaWdodC8yLjApKTsgICAgICAgIFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VEb3duID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uKGUpe1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLm1vdXNlSW4gPSBmYWxzZTtcclxuICAgIG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIHRoaXMubW91c2VDbGlja2VkID0gZmFsc2U7XHJcbiAgICBtYXhDbGlja0R1cmF0aW9uID0gMjAwO1xyXG4gICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZSl7XHJcbiAgICBcdG1vdXNlU3RhdGUubW91c2VJbiA9IGZhbHNlO1xyXG4gICAgXHRtb3VzZVN0YXRlLm1vdXNlRG93biA9IGZhbHNlO1xyXG4gICAgfSk7XHJcblx0XHJcbn1cclxuXHJcbnZhciBwID0gbW91c2VTdGF0ZS5wcm90b3R5cGU7XHJcblxyXG4vLyBVcGRhdGUgdGhlIG1vdXNlIHRvIHRoZSBjdXJyZW50IHN0YXRlXHJcbnAudXBkYXRlID0gZnVuY3Rpb24oZHQsIHNjYWxlKXtcclxuICAgIFxyXG5cdC8vIFNhdmUgdGhlIGN1cnJlbnQgdmlydHVhbCBwb3NpdGlvbiBmcm9tIHNjYWxlXHJcblx0dGhpcy52aXJ0dWFsUG9zaXRpb24gPSBuZXcgUG9pbnQocmVsYXRpdmVNb3VzZVBvc2l0aW9uLngvc2NhbGUsIHJlbGF0aXZlTW91c2VQb3NpdGlvbi55L3NjYWxlKTs7XHJcblx0XHJcbiAgICAvLyBjaGVjayBtb3VzZSBjbGlja1xyXG4gICAgdGhpcy5tb3VzZUNsaWNrZWQgPSBmYWxzZTtcclxuICAgIGlmICh0aGlzLm1vdXNlRG93bilcclxuICAgIFx0bW91c2VEb3duVGltZXIgKz0gZHQ7XHJcbiAgICBlbHNle1xyXG4gICAgXHRpZiAobW91c2VEb3duVGltZXIgPiAwICYmIG1vdXNlRG93blRpbWVyIDwgbWF4Q2xpY2tEdXJhdGlvbilcclxuICAgIFx0XHR0aGlzLm1vdXNlQ2xpY2tlZCA9IHRydWU7XHJcbiAgICBcdG1vdXNlRG93blRpbWVyID0gMDtcclxuICAgIH1cclxuICAgIHRoaXMucHJldk1vdXNlRG93biA9IHRoaXMubW91c2VEb3duO1xyXG4gICAgdGhpcy5oYXNUYXJnZXQgPSBmYWxzZTtcclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG1vdXNlU3RhdGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIFBvaW50KHBYLCBwWSl7XHJcbiAgICB0aGlzLnggPSBwWDtcclxuICAgIHRoaXMueSA9IHBZO1xyXG59XHJcblxyXG52YXIgcCA9IFBvaW50LnByb3RvdHlwZTtcclxuXHJcbnAuYWRkID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLCB0aGlzLnkrcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54K3BYLngsIHRoaXMueStwWC55KTtcclxufVxyXG5cclxucC5tdWx0ID0gZnVuY3Rpb24ocFgsIHBZKXtcclxuXHRpZihwWSlcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLCB0aGlzLnkqcFkpO1xyXG5cdGVsc2VcclxuXHRcdHJldHVybiBuZXcgUG9pbnQodGhpcy54KnBYLngsIHRoaXMueSpwWC55KTtcclxufVxyXG5cclxucC5zY2FsZSA9IGZ1bmN0aW9uKHNjYWxlKXtcclxuXHRyZXR1cm4gbmV3IFBvaW50KHRoaXMueCpzY2FsZSwgdGhpcy55KnNjYWxlKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vdXRpbGl0aWVzLmpzJyk7XHJcbnZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xyXG5cclxudmFyIFNPTFZFX1NUQVRFID0gT2JqZWN0LmZyZWV6ZSh7SElEREVOOiAwLCBVTlNPTFZFRDogMSwgU09MVkVEOiAyfSk7XHJcbnZhciBRVUVTVElPTl9UWVBFID0gT2JqZWN0LmZyZWV6ZSh7SlVTVElGSUNBVElPTjogMSwgTVVMVElQTEVfQ0hPSUNFOiAyLCBTSE9SVF9SRVNQT05TRTogMywgRklMRTogNCwgTUVTU0FHRTogNX0pO1xyXG5cclxuLyogUXVlc3Rpb24gcHJvcGVydGllczpcclxuY3VycmVudFN0YXRlOiBTT0xWRV9TVEFURVxyXG53aW5kb3dEaXY6IGVsZW1lbnRcclxuY29ycmVjdDogaW50XHJcbnBvc2l0aW9uUGVyY2VudFg6IGZsb2F0XHJcbnBvc2l0aW9uUGVyY2VudFk6IGZsb2F0XHJcbnJldmVhbFRocmVzaG9sZDogaW50XHJcbmltYWdlTGluazogc3RyaW5nXHJcbmZlZWRiYWNrczogc3RyaW5nW11cclxuY29ubmVjdGlvbkVsZW1lbnRzOiBlbGVtZW50W11cclxuY29ubmVjdGlvbnM6IGludFtdXHJcbnF1ZXN0aW9uVHlwZTogU09MVkVfU1RBVEVcclxuanVzdGlmaWNhdGlvbjogc3RyaW5nXHJcbndyb25nQW5zd2VyOiBzdHJpbmdcclxuY29ycmVjdEFuc3dlcjogc3RyaW5nXHJcbiovXHJcbi8vcGFyYW1ldGVyIGlzIGEgcG9pbnQgdGhhdCBkZW5vdGVzIHN0YXJ0aW5nIHBvc2l0aW9uXHJcbmZ1bmN0aW9uIFF1ZXN0aW9uKHhtbCwgcmVzb3VyY2VzLCB1cmwsIHdpbmRvd0Rpdiwgd2luZG93cyl7XHJcblx0XHJcblx0Ly8gU2V0IHRoZSBjdXJyZW50IHN0YXRlIHRvIGRlZmF1bHQgYXQgaGlkZGVuIGFuZCBzdG9yZSB0aGUgd2luZG93IGRpdlxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5ISURERU47XHJcbiAgICB0aGlzLndpbmRvd0RpdiA9IHdpbmRvd0RpdjtcclxuICAgIFxyXG4gICAgLy8gR2V0IGFuZCBzYXZlIHRoZSBnaXZlbiBpbmRleCwgY29ycmVjdCBhbnN3ZXIsIHBvc2l0aW9uLCByZXZlYWwgdGhyZXNob2xkLCBpbWFnZSBsaW5rLCBmZWVkYmFjaywgYW5kIGNvbm5lY3Rpb25zXHJcbiAgICB0aGlzLmNvcnJlY3QgPSBwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwiY29ycmVjdEFuc3dlclwiKSk7XHJcbiAgICB0aGlzLnBvc2l0aW9uUGVyY2VudFggPSBVdGlsaXRpZXMubWFwKHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ4UG9zaXRpb25QZXJjZW50XCIpKSwgMCwgMTAwLCAwLCBDb25zdGFudHMuYm9hcmRTaXplLngpO1xyXG4gICAgdGhpcy5wb3NpdGlvblBlcmNlbnRZID0gVXRpbGl0aWVzLm1hcChwYXJzZUludCh4bWwuZ2V0QXR0cmlidXRlKFwieVBvc2l0aW9uUGVyY2VudFwiKSksIDAsIDEwMCwgMCwgQ29uc3RhbnRzLmJvYXJkU2l6ZS55KTtcclxuICAgIHRoaXMucmV2ZWFsVGhyZXNob2xkID0gcGFyc2VJbnQoeG1sLmdldEF0dHJpYnV0ZShcInJldmVhbFRocmVzaG9sZFwiKSk7XHJcbiAgICB0aGlzLmltYWdlTGluayA9IHVybCt4bWwuZ2V0QXR0cmlidXRlKFwiaW1hZ2VMaW5rXCIpO1xyXG4gICAgdGhpcy5mZWVkYmFja3MgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJmZWVkYmFja1wiKTtcclxuICAgIHRoaXMuYmxvYiA9IG51bGw7IC8vIG5vIHVwbG9hZCBieSBkZWZhdWx0XHJcbiAgICB0aGlzLmZpbGVOYW1lID0gXCJcIjtcclxuICAgIHZhciBjb25uZWN0aW9uRWxlbWVudHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjb25uZWN0aW9uc1wiKTtcclxuICAgIHRoaXMuY29ubmVjdGlvbnMgPSBbXTtcclxuICAgIGZvcih2YXIgaT0wO2k8Y29ubmVjdGlvbkVsZW1lbnRzLmxlbmd0aDtpKyspXHJcbiAgICBcdHRoaXMuY29ubmVjdGlvbnNbaV0gPSBwYXJzZUludChjb25uZWN0aW9uRWxlbWVudHNbaV0uaW5uZXJIVE1MKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSB3aW5kb3dzIGZvciB0aGlzIHF1ZXN0aW9uIGJhc2VkIG9uIHRoZSBxdWVzdGlvbiB0eXBlXHJcbiAgICB0aGlzLnF1ZXN0aW9uVHlwZSA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJxdWVzdGlvblR5cGVcIikpO1xyXG4gICAgdGhpcy5qdXN0aWZpY2F0aW9uID0gdGhpcy5xdWVzdGlvblR5cGU9PTEgfHwgdGhpcy5xdWVzdGlvblR5cGU9PTM7XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGUhPTUpe1xyXG5cdFx0dGhpcy5jcmVhdGVUYXNrV2luZG93KHhtbCwgd2luZG93cy50YXNrV2luZG93KTtcclxuXHRcdHRoaXMuY3JlYXRlUmVzb3VyY2VXaW5kb3coeG1sLCByZXNvdXJjZXMsIHdpbmRvd3MucmVzb3VyY2VXaW5kb3csIHdpbmRvd3MucmVzb3VyY2UpO1xyXG5cdH1cclxuXHRzd2l0Y2godGhpcy5xdWVzdGlvblR5cGUpe1xyXG5cdFx0Y2FzZSA1OlxyXG5cdFx0XHR0aGlzLmNyZWF0ZU1lc3NhZ2VXaW5kb3coeG1sLCB3aW5kb3dzLm1lc3NhZ2VXaW5kb3cpO1xyXG5cdFx0XHRicmVhaztcclxuXHRcdGNhc2UgNDpcclxuXHRcdFx0dGhpcy5jcmVhdGVGaWxlV2luZG93KHdpbmRvd3MuZmlsZVdpbmRvdyk7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0Y2FzZSAzOlxyXG5cdFx0Y2FzZSAyOlxyXG5cdFx0Y2FzZSAxOlxyXG5cdFx0XHR0aGlzLmNyZWF0ZUFuc3dlcldpbmRvdyh4bWwsIHdpbmRvd3MuYW5zd2VyV2luZG93KTtcclxuXHRcdFx0YnJlYWs7XHJcblx0fVxyXG4gICAgXHJcbn1cclxuXHJcbnZhciBwID0gUXVlc3Rpb24ucHJvdG90eXBlO1xyXG5cclxucC5zaG93UHJldlN1Ym1pdHRlZEZpbGVzID0gZnVuY3Rpb24oZmlsZXMpIHtcclxuXHQvLyBhY2tub3dsZWRnZSBzdWJtaXR0ZWQgZmlsZXMgaW4gdGFzayB3aW5kb3dcclxuXHRpZihmaWxlcy5sZW5ndGg+MClcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MID0gJ1N1Ym1pdHRlZCBGaWxlczo8YnIvPic7XHJcblx0ZWxzZVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnJztcclxuXHRmb3IodmFyIGk9MDtpPGZpbGVzO2krKylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MICs9ICc8c3BhbiBjbGFzcz1cImZlZWRiYWNrSVwiPicrZmlsZXNbaV0ubmFtZSsnPC9zcGFuPjxici8+JztcclxufVxyXG5cclxucC53cm9uZ0Fuc3dlciA9IGZ1bmN0aW9uKG51bSl7XHJcblxyXG4gIC8vIElmIGZlZWJhY2sgZGlzcGxheSBpdFxyXG5cdGlmKHRoaXMuZmVlZGJhY2tzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnXCInK1N0cmluZy5mcm9tQ2hhckNvZGUobnVtICsgXCJBXCIuY2hhckNvZGVBdCgpKStcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdcIiBpcyBub3QgY29ycmVjdCA8YnIvPiZuYnNwOzxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZmVlZGJhY2tzW251bV0uaW5uZXJIVE1MKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG59XHJcblxyXG5wLmNvcnJlY3RBbnN3ZXIgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIERpc2FibGUgYWxsIHRoZSBhbnN3ZXIgYnV0dG9uc1xyXG5cdGlmKHRoaXMuYW5zd2VycylcclxuXHRcdGZvcih2YXIgaT0wO2k8dGhpcy5hbnN3ZXJzLmxlbmd0aDtpKyspXHJcblx0XHRcdHRoaXMuYW5zd2Vyc1tpXS5kaXNhYmxlZCA9IHRydWU7XHJcblx0XHJcblx0Ly8gSWYgZmVlZGJhY2sgZGlzcGxheSBpdFxyXG5cdGlmKHRoaXMuZmVlZGJhY2tzLmxlbmd0aD4wKVxyXG5cdFx0dGhpcy5mZWVkYmFjay5pbm5lckhUTUwgPSAnXCInK1N0cmluZy5mcm9tQ2hhckNvZGUodGhpcy5jb3JyZWN0ICsgXCJBXCIuY2hhckNvZGVBdCgpKStcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdcIiBpcyB0aGUgY29ycmVjdCByZXNwb25zZSA8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+JytcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZmVlZGJhY2tzW3RoaXMuY29ycmVjdF0uaW5uZXJIVE1MKyc8L3NwYW4+PGJyLz4nO1xyXG5cdFxyXG5cdFxyXG5cdGlmKHRoaXMucXVlc3Rpb25UeXBlPT09MyAmJiB0aGlzLmp1c3RpZmljYXRpb24udmFsdWUgIT0gJycpXHJcblx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdTdWJtaXR0ZWQgVGV4dDo8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+Jyt0aGlzLmp1c3RpZmljYXRpb24udmFsdWUrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT0xICYmIHRoaXMuanVzdGlmaWNhdGlvbi52YWx1ZSAhPSAnJylcclxuXHRcdHRoaXMuZmVlZGJhY2suaW5uZXJIVE1MICs9ICdTdWJtaXR0ZWQgVGV4dDo8YnIvPjxzcGFuIGNsYXNzPVwiZmVlZGJhY2tJXCI+Jyt0aGlzLmp1c3RpZmljYXRpb24udmFsdWUrJzwvc3Bhbj48YnIvPic7XHJcblx0XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT00KXtcclxuXHRcdGlmKHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aD4wKVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICdTdWJtaXR0ZWQgRmlsZXM6PGJyLz4nO1xyXG5cdFx0ZWxzZVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCA9ICcnO1xyXG5cdFx0Zm9yKHZhciBpPTA7aTx0aGlzLmZpbGVJbnB1dC5maWxlcy5sZW5ndGg7aSsrKVxyXG5cdFx0XHR0aGlzLmZlZWRiYWNrLmlubmVySFRNTCArPSAnPHNwYW4gY2xhc3M9XCJmZWVkYmFja0lcIj4nK3RoaXMuZmlsZUlucHV0LmZpbGVzW2ldLm5hbWUrJzwvc3Bhbj48YnIvPic7XHJcblx0fVxyXG4gIFxyXG4gIGlmKHRoaXMuY3VycmVudFN0YXRlIT1TT0xWRV9TVEFURS5TT0xWRUQgJiYgXHJcbiAgICAgKCgodGhpcy5xdWVzdGlvblR5cGU9PT0zIHx8IHRoaXMucXVlc3Rpb25UeXBlPT09MSkgJiYgdGhpcy5qdXN0aWZpY2F0aW9uLnZhbHVlICE9ICcnKSB8fFxyXG4gICAgICAodGhpcy5xdWVzdGlvblR5cGU9PT00ICYmIHRoaXMuZmlsZUlucHV0LmZpbGVzLmxlbmd0aD4wKSB8fFxyXG4gICAgICAgdGhpcy5xdWVzdGlvblR5cGU9PT0yKSl7IFxyXG4gICAgLy8gU2V0IHRoZSBzdGF0ZSBvZiB0aGUgcXVlc3Rpb24gdG8gY29ycmVjdFxyXG4gICAgdGhpcy5jdXJyZW50U3RhdGUgPSBTT0xWRV9TVEFURS5TT0xWRUQ7XHJcbiAgICAvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcbiAgICBpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdHRoaXMucHJvY2VlZEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gYW5pbWF0ZSBwcm9jZWVkIGJ1dHRvblxyXG5cdH1cclxuICB9XHJcblx0XHJcbn1cclxuXHJcbnAuZGlzcGxheVdpbmRvd3MgPSBmdW5jdGlvbigpe1xyXG5cdFxyXG5cdC8vIEFkZCB0aGUgd2luZG93cyB0byB0aGUgd2luZG93IGRpdlxyXG5cdHZhciB3aW5kb3dOb2RlID0gdGhpcy53aW5kb3dEaXY7XHJcblx0dmFyIGV4aXRCdXR0b24gPSBuZXcgSW1hZ2UoKTtcclxuXHRleGl0QnV0dG9uLnNyYyA9IFwiLi4vaW1nL2ljb25DbG9zZS5wbmdcIjtcclxuXHRleGl0QnV0dG9uLmNsYXNzTmFtZSA9IFwiZXhpdC1idXR0b25cIjtcclxuXHR2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG5cdGV4aXRCdXR0b24ub25jbGljayA9IGZ1bmN0aW9uKCkgeyBxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7IH07XHJcblx0aWYodGhpcy5xdWVzdGlvblR5cGU9PT01KXtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5tZXNzYWdlKTtcclxuXHQgICAgZXhpdEJ1dHRvbi5zdHlsZS5sZWZ0ID0gXCI3NXZ3XCI7XHJcblx0fVxyXG5cdGVsc2V7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMudGFzayk7XHJcblx0XHR3aW5kb3dOb2RlLmFwcGVuZENoaWxkKHRoaXMuYW5zd2VyKTtcclxuXHRcdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQodGhpcy5yZXNvdXJjZSk7XHJcblx0XHRleGl0QnV0dG9uLnN0eWxlLmxlZnQgPSBcIjg1dndcIjtcclxuXHR9XHJcblx0aWYodGhpcy5jdXJyZW50U3RhdGUgPT09IFNPTFZFX1NUQVRFLlNPTFZFRCAmJiB0aGlzLnF1ZXN0aW9uVHlwZSAhPSBRVUVTVElPTl9UWVBFLk1FU1NBR0UpICB7XHJcblx0XHQvLyBpZiB0aGVyZSBpcyBhIHByb2NlZWQgYnV0dG9uXHJcblx0XHRpZiAodGhpcy5wcm9jZWVkRWxlbWVudCkgeyBcclxuXHRcdFx0dGhpcy5wcm9jZWVkRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvLyBhbmltYXRlIHByb2NlZWQgYnV0dG9uXHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdHdpbmRvd05vZGUuYXBwZW5kQ2hpbGQoZXhpdEJ1dHRvbik7XHJcblx0XHJcbn1cclxuXHJcbnAuY3JlYXRlVGFza1dpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgd2luZG93KXtcclxuXHR0aGlzLnByb2NlZWRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwcm9jZWVkQ29udGFpbmVyXCIpO1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgdGFzayB3aW5kb3cgXHJcblx0dGhpcy50YXNrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcclxuICAgIHRoaXMudGFzay5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy50YXNrLnN0eWxlLnRvcCA9IFwiMTB2aFwiO1xyXG4gICAgdGhpcy50YXNrLnN0eWxlLmxlZnQgPSBcIjV2d1wiO1xyXG4gICAgdGhpcy50YXNrLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uTmFtZVwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMudGFzay5pbm5lckhUTUwgPSB0aGlzLnRhc2suaW5uZXJIVE1MLnJlcGxhY2UoXCIlaW5zdHJ1Y3Rpb25zJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLnRhc2suaW5uZXJIVE1MID0gdGhpcy50YXNrLmlubmVySFRNTC5yZXBsYWNlKFwiJXF1ZXN0aW9uJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLmZlZWRiYWNrID0gdGhpcy50YXNrLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJmZWVkYmFja1wiKVswXTtcclxufVxyXG5cclxucC5jcmVhdGVSZXNvdXJjZVdpbmRvdyA9IGZ1bmN0aW9uKHhtbCwgcmVzb3VyY2VGaWxlcywgd2luZG93LCByZXNvdXJjZUVsZW1lbnQpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgcmVzb3VyY2Ugd2luZG93IFxyXG5cdHRoaXMucmVzb3VyY2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG5cdHRoaXMucmVzb3VyY2UuY2xhc3NOYW1lID0gXCJ3aW5kb3dcIjtcclxuXHR0aGlzLnJlc291cmNlLnN0eWxlLnRvcCA9IFwiNTV2aFwiO1xyXG5cdHRoaXMucmVzb3VyY2Uuc3R5bGUubGVmdCA9IFwiNXZ3XCI7XHJcblx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB3aW5kb3c7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgaW5kaXZpZHVhbCByZXNvdWNlcyBpZiBhbnlcclxuXHR2YXIgcmVzb3VyY2VzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicmVzb3VyY2VJbmRleFwiKTtcclxuICAgIGlmKHJlc291cmNlcy5sZW5ndGggPiAwKXtcclxuICAgIFx0XHJcbiAgICBcdC8vIEdldCB0aGUgaHRtbCBmb3IgZWFjaCByZXNvdXJjZSBhbmQgdGhlbiBhZGQgdGhlIHJlc3VsdCB0byB0aGUgd2luZG93XHJcbiAgICBcdHZhciByZXNvdXJjZUhUTUwgPSAnJztcclxuXHQgICAgZm9yKHZhciBpPTA7aTxyZXNvdXJjZXMubGVuZ3RoO2krKyl7XHJcbiAgICBcdFx0dmFyIGN1clJlc291cmNlID0gcmVzb3VyY2VFbGVtZW50LnJlcGxhY2UoXCIlaWNvbiVcIiwgcmVzb3VyY2VGaWxlc1twYXJzZUludChyZXNvdXJjZXNbaV0uaW5uZXJIVE1MKV0uaWNvbik7XHJcblx0ICAgIFx0Y3VyUmVzb3VyY2UgPSBjdXJSZXNvdXJjZS5yZXBsYWNlKFwiJXRpdGxlJVwiLCByZXNvdXJjZUZpbGVzW3BhcnNlSW50KHJlc291cmNlc1tpXS5pbm5lckhUTUwpXS50aXRsZSk7XHJcblx0ICAgIFx0Y3VyUmVzb3VyY2UgPSBjdXJSZXNvdXJjZS5yZXBsYWNlKFwiJWxpbmslXCIsIHJlc291cmNlRmlsZXNbcGFyc2VJbnQocmVzb3VyY2VzW2ldLmlubmVySFRNTCldLmxpbmspO1xyXG5cdCAgICBcdHJlc291cmNlSFRNTCArPSBjdXJSZXNvdXJjZTtcclxuXHQgICAgfVxyXG5cdCAgXHR0aGlzLnJlc291cmNlLmlubmVySFRNTCA9IHRoaXMucmVzb3VyY2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlcmVzb3VyY2VzJVwiLCByZXNvdXJjZUhUTUwpO1xyXG5cdFx0ICAgICAgICBcclxuXHR9XHJcblx0ZWxzZXtcclxuXHRcdC8vIERpc3BsYXkgdGhhdCB0aGVyZSBhcmVuJ3QgYW55IHJlc291cmNlc1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5pbm5lckhUTUwgPSB0aGlzLnJlc291cmNlLmlubmVySFRNTC5yZXBsYWNlKFwiJXJlc291cmNlcyVcIiwgXCJObyByZXNvdXJjZXMgaGF2ZSBiZWVuIHByb3ZpZGVkIGZvciB0aGlzIHRhc2suXCIpO1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5zdHlsZS5jb2xvciA9IFwiZ3JleVwiO1xyXG5cdFx0dGhpcy5yZXNvdXJjZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGRkZGRkZcIjtcclxuXHRcdHRoaXMucmVzb3VyY2UuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uY2xhc3NOYW1lICs9IFwiLCBjZW50ZXJcIjtcclxuXHR9XHJcbn1cclxuXHJcbnAuY3JlYXRlQW5zd2VyV2luZG93ID0gZnVuY3Rpb24oeG1sLCB3aW5kb3cpe1xyXG5cdFxyXG5cdC8vIENyZWF0ZSB0aGUgYW5zd2VyIHdpbmRvdyBcclxuXHR0aGlzLmFuc3dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLmFuc3dlci5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS5sZWZ0ID0gXCI1MHZ3XCI7XHJcbiAgICB0aGlzLmFuc3dlci5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSB0aGUgdGV4dCBlbGVtZW50IGlmIGFueVxyXG4gICAgdmFyIHF1ZXN0aW9uID0gdGhpcztcclxuICAgIHZhciBzdWJtaXQ7XHJcbiAgICBpZih0aGlzLmp1c3RpZmljYXRpb24pe1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIik7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgXHR0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmNsYXNzTmFtZSA9IFwic3VibWl0XCI7XHJcbiAgICBcdHRoaXMuanVzdGlmaWNhdGlvbi5zdWJtaXQuaW5uZXJIVE1MID0gXCJTdWJtaXRcIjtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmp1c3RpZmljYXRpb24uc3VibWl0Lm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdHF1ZXN0aW9uLmNvcnJlY3RBbnN3ZXIoKTtcclxuICAgIFx0fTtcclxuICAgIFx0dGhpcy5qdXN0aWZpY2F0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZnVuY3Rpb24oKSB7XHJcbiAgICBcdFx0aWYocXVlc3Rpb24uanVzdGlmaWNhdGlvbi52YWx1ZS5sZW5ndGggPiAwKVxyXG4gICAgXHRcdFx0cXVlc3Rpb24uanVzdGlmaWNhdGlvbi5zdWJtaXQuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgIFx0XHRlbHNlXHJcbiAgICBcdFx0XHRxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLnN1Ym1pdC5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdH0sIGZhbHNlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIGFuZCBnZXQgYWxsIHRoZSBhbnN3ZXIgZWxlbWVudHNcclxuICAgIHRoaXMuYW5zd2VycyA9IFtdO1xyXG4gICAgdmFyIGFuc3dlcnNYbWwgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJhbnN3ZXJcIik7XHJcbiAgICB2YXIgY29ycmVjdCA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJjb3JyZWN0QW5zd2VyXCIpKTtcclxuICAgIGZvcih2YXIgaT0wO2k8YW5zd2Vyc1htbC5sZW5ndGg7aSsrKXtcclxuICAgIFx0aWYodGhpcy5qdXN0aWZpY2F0aW9uKVxyXG4gICAgXHRcdHRoaXMuanVzdGlmaWNhdGlvbi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBcdGlmKGNvcnJlY3Q9PT1pKVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcImNvcnJlY3RcIjtcclxuICAgIFx0ZWxzZVxyXG4gICAgXHRcdHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPSBcIndyb25nXCI7XHJcbiAgICBcdHRoaXMuYW5zd2Vyc1tpXS5pbm5lckhUTUwgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgKyBcIkFcIi5jaGFyQ29kZUF0KCkpK1wiLiBcIithbnN3ZXJzWG1sW2ldLmlubmVySFRNTDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRoZSBldmVudHMgZm9yIHRoZSBhbnN3ZXJzXHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKXtcclxuXHQgIGlmKHRoaXMuYW5zd2Vyc1tpXS5jbGFzc05hbWUgPT0gXCJ3cm9uZ1wiKXtcclxuXHRcdHRoaXMuYW5zd2Vyc1tpXS5udW0gPSBpO1xyXG4gICAgICAgIHRoaXMuYW5zd2Vyc1tpXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgIHRoaXMuZGlzYWJsZWQgPSB0cnVlO1xyXG5cdFx0ICBxdWVzdGlvbi53cm9uZ0Fuc3dlcih0aGlzLm51bSk7XHJcblx0ICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgZWxzZXtcclxuICAgIFx0dGhpcy5hbnN3ZXJzW2ldLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xyXG5cdCAgICAgIGlmKHF1ZXN0aW9uLmp1c3RpZmljYXRpb24pXHJcblx0ICAgICAgICBxdWVzdGlvbi5qdXN0aWZpY2F0aW9uLmRpc2FibGVkID0gZmFsc2U7XHJcblx0ICAgICAgcXVlc3Rpb24uY29ycmVjdEFuc3dlcigpO1xyXG5cdCAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgYW5zd2VycyB0byB0aGUgd2luZG93XHJcbiAgICBmb3IodmFyIGk9MDtpPHRoaXMuYW5zd2Vycy5sZW5ndGg7aSsrKVxyXG4gICAgICB0aGlzLmFuc3dlci5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwid2luZG93Q29udGVudFwiKVswXS5hcHBlbmRDaGlsZCh0aGlzLmFuc3dlcnNbaV0pO1xyXG4gICAgaWYodGhpcy5qdXN0aWZpY2F0aW9uKXtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uKTtcclxuICAgIFx0dGhpcy5hbnN3ZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcIndpbmRvd0NvbnRlbnRcIilbMF0uYXBwZW5kQ2hpbGQodGhpcy5qdXN0aWZpY2F0aW9uLnN1Ym1pdCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbnAuY3JlYXRlRmlsZVdpbmRvdyA9IGZ1bmN0aW9uKHdpbmRvdyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHR0aGlzLmFuc3dlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XHJcbiAgICB0aGlzLmFuc3dlci5jbGFzc05hbWUgPSBcIndpbmRvd1wiO1xyXG4gICAgdGhpcy5hbnN3ZXIuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLmFuc3dlci5zdHlsZS5sZWZ0ID0gXCI1MHZ3XCI7XHJcbiAgICB0aGlzLmFuc3dlci5pbm5lckhUTUwgPSB3aW5kb3c7XHJcbiAgICB0aGlzLmZpbGVJbnB1dCA9IHRoaXMuYW5zd2VyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIilbMF07XHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5maWxlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICBcdFx0Ly8gTWFrZSBzdXJlIGEgdmFsaWQgZmlsZSB3YXMgY2hvc2VuIChjdXJyZW50bHkgbm90IGltcGxlbWVudGVkKVxyXG5cdFx0XHRpZihmYWxzZSl7XHJcblx0XHRcdFx0YWxlcnQoXCJZb3UgZGlkbid0IGNob29zZSBhbiBpcGFyIGZpbGUhIHlvdSBjYW4gb25seSBsb2FkIGlwYXIgZmlsZXMhXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0LyovLyBDcmVhdGUgYSByZWFkZXIgYW5kIHJlYWQgdGhlIHppcFxyXG5cdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHRcdFx0cmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhldmVudCk7XHJcblx0XHRcdH07XHJcblx0XHRcdC8vIHJlYWQgdGhlIGZpcnN0IGZpbGVcclxuXHRcdFx0cmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGV2ZW50LnRhcmdldC5maWxlc1swXSk7Ki9cclxuXHRcdFx0XHJcblx0XHRcdHF1ZXN0aW9uLmZpbGVOYW1lID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdLm5hbWU7XHJcblx0XHRcdHF1ZXN0aW9uLmJsb2IgPSBldmVudC50YXJnZXQuZmlsZXNbMF0uc2xpY2UoKTtcclxuXHJcblx0XHRcdFxyXG5cdCAgICBxdWVzdGlvbi5jb3JyZWN0QW5zd2VyKCk7XHJcbiAgICB9KTtcclxuICAgIFxyXG59XHJcblxyXG5wLmNyZWF0ZU1lc3NhZ2VXaW5kb3cgPSBmdW5jdGlvbih4bWwsIHdpbmRvdyl7XHJcblx0XHJcblx0Ly8gQ3JlYXRlIHRoZSBmaWxlIHdpbmRvdyBcclxuXHR0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO1xyXG4gICAgdGhpcy5tZXNzYWdlLmNsYXNzTmFtZSA9IFwid2luZG93XCI7XHJcbiAgICB0aGlzLm1lc3NhZ2Uuc3R5bGUudG9wID0gXCIxMHZoXCI7XHJcbiAgICB0aGlzLm1lc3NhZ2Uuc3R5bGUubGVmdCA9IFwiNDB2d1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IHdpbmRvdztcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIldGl0bGUlXCIsIHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInF1ZXN0aW9uTmFtZVwiKVswXS5pbm5lckhUTUwucmVwbGFjZSgvXFxuL2csICc8YnIvPicpKTtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MLnJlcGxhY2UoXCIlaW5zdHJ1Y3Rpb25zJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnN0cnVjdGlvbnNcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB0aGlzLm1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5tZXNzYWdlLmlubmVySFRNTC5yZXBsYWNlKFwiJXF1ZXN0aW9uJVwiLCB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJxdWVzdGlvblRleHRcIilbMF0uaW5uZXJIVE1MLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKSk7XHJcbiAgICB2YXIgcXVlc3Rpb24gPSB0aGlzO1xyXG4gICAgdGhpcy5tZXNzYWdlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYnV0dG9uXCIpWzBdLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuICAgIFx0cXVlc3Rpb24uY3VycmVudFN0YXRlID0gU09MVkVfU1RBVEUuU09MVkVEO1xyXG4gICAgXHRxdWVzdGlvbi53aW5kb3dEaXYuaW5uZXJIVE1MID0gJyc7XHJcbiAgICB9O1xyXG5cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbjtcclxubW9kdWxlLmV4cG9ydHMuU09MVkVfU1RBVEUgPSBTT0xWRV9TVEFURTsiLCJcclxuXHJcbmZ1bmN0aW9uIFF1ZXN0aW9uV2luZG93cyhjYWxsYmFjayl7XHJcbiAgdGhpcy5sb2FkV2luZG93cyhjYWxsYmFjayk7XHJcbn1cclxuXHJcbnZhciBwID0gUXVlc3Rpb25XaW5kb3dzLnByb3RvdHlwZTtcclxuXHJcbnAubG9hZFdpbmRvd3MgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblxyXG4gIHZhciBjb3VudGVyID0gMDtcclxuICB2YXIgY2IgPSBmdW5jdGlvbigpe1xyXG5cdCAgaWYoKytjb3VudGVyPj02ICYmIGNhbGxiYWNrKVxyXG5cdFx0ICBjYWxsYmFjaygpO1xyXG4gIH07XHJcbiAgdGhpcy5sb2FkVGFza1dpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkUmVzb3VyY2VXaW5kb3coY2IpO1xyXG4gIHRoaXMubG9hZEFuc3dlcldpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkRmlsZVdpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkTWVzc2FnZVdpbmRvdyhjYik7XHJcbiAgdGhpcy5sb2FkUmVzb3VyY2UoY2IpO1xyXG4gIFxyXG59XHJcblxyXG5wLmxvYWRUYXNrV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIHRhc2sgd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSB0YXNrIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLnRhc2tXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgXHRpZihjYWxsYmFjaylcclxuXHQgICAgXHQgIGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwidGFza1dpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5cclxucC5sb2FkUmVzb3VyY2VXaW5kb3cgPSBmdW5jdGlvbihjYWxsYmFjayl7XHJcblx0XHJcblx0Ly8gR2V0IHRoZSB0ZW1wbGF0ZSBmb3IgcmVzb3VyY2Ugd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSByZXNvdXJjZSB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5yZXNvdXJjZVdpbmRvdyA9IHJlcXVlc3QucmVzcG9uc2VUZXh0O1xyXG5cdCAgICAgICAgaWYoY2FsbGJhY2spXHJcblx0ICAgICAgICBcdGNhbGxiYWNrKCk7XHJcblx0ICAgIH1cclxuXHR9O1xyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcInJlc291cmNlV2luZG93Lmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZFJlc291cmNlID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBHZXQgdGhlIGh0bWwgZm9yIGVhY2ggcmVzb3VyY2UgYW5kIHRoZW4gYWRkIHRoZSByZXN1bHQgdG8gdGhlIHdpbmRvd1xyXG5cdCAgICBcdHdpbmRvd3MucmVzb3VyY2UgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHQgICAgICAgIGlmKGNhbGxiYWNrKVxyXG5cdCAgICAgICAgXHRjYWxsYmFjaygpO1xyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcInJlc291cmNlLmh0bWxcIiwgdHJ1ZSk7XHJcblx0cmVxdWVzdC5zZW5kKCk7XHJcbn1cclxuXHJcbnAubG9hZEFuc3dlcldpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBhbnN3ZXIgd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSBhbnN3ZXIgd2luZG93IFxyXG5cdCAgICBcdHdpbmRvd3MuYW5zd2VyV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgICAgICBpZihjYWxsYmFjaylcclxuXHQgICAgICAgIFx0Y2FsbGJhY2soKTtcclxuXHQgICAgfVxyXG5cdH1cclxuXHRyZXF1ZXN0Lm9wZW4oXCJHRVRcIiwgXCJhbnN3ZXJXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxucC5sb2FkRmlsZVdpbmRvdyA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuXHRcclxuXHQvLyBHZXQgdGhlIHRlbXBsYXRlIGZvciBmaWxlIHdpbmRvd3NcclxuXHR2YXIgd2luZG93cyA9IHRoaXM7XHJcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHRyZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG5cdCAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09IDQgJiYgcmVxdWVzdC5zdGF0dXMgPT0gMjAwKSB7XHJcblx0ICAgIFx0XHJcblx0ICAgIFx0Ly8gU2F2ZSB0aGUgZmlsZSB3aW5kb3cgXHJcblx0ICAgIFx0d2luZG93cy5maWxlV2luZG93ID0gcmVxdWVzdC5yZXNwb25zZVRleHQ7XHJcblx0ICAgIFx0aWYoY2FsbGJhY2spXHJcblx0ICAgIFx0XHRjYWxsYmFjaygpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgIH1cclxuXHR9XHJcblx0cmVxdWVzdC5vcGVuKFwiR0VUXCIsIFwiZmlsZVdpbmRvdy5odG1sXCIsIHRydWUpO1xyXG5cdHJlcXVlc3Quc2VuZCgpO1xyXG59XHJcblxyXG5wLmxvYWRNZXNzYWdlV2luZG93ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xyXG5cdFxyXG5cdC8vIEdldCB0aGUgdGVtcGxhdGUgZm9yIG1lc3NhZ2Ugd2luZG93c1xyXG5cdHZhciB3aW5kb3dzID0gdGhpcztcclxuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cdHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0ICAgIGlmIChyZXF1ZXN0LnJlYWR5U3RhdGUgPT0gNCAmJiByZXF1ZXN0LnN0YXR1cyA9PSAyMDApIHtcclxuXHQgICAgXHRcclxuXHQgICAgXHQvLyBTYXZlIHRoZSBtZXNzYWdlIHdpbmRvdyBcclxuXHQgICAgXHR3aW5kb3dzLm1lc3NhZ2VXaW5kb3cgPSByZXF1ZXN0LnJlc3BvbnNlVGV4dDtcclxuXHRcdCAgICBpZihjYWxsYmFjaylcclxuXHRcdCAgICBcdGNhbGxiYWNrKCk7XHJcblxyXG5cdCAgICB9XHJcblx0fVxyXG5cdHJlcXVlc3Qub3BlbihcIkdFVFwiLCBcIm1lc3NhZ2VXaW5kb3cuaHRtbFwiLCB0cnVlKTtcclxuXHRyZXF1ZXN0LnNlbmQoKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbldpbmRvd3M7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBRdWVzdGlvbiA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9uLmpzXCIpO1xyXG5cclxuLy8gQ3JlYXRlcyBhIGNhdGVnb3J5IHdpdGggdGhlIGdpdmVuIG5hbWUgYW5kIGZyb20gdGhlIGdpdmVuIHhtbFxyXG5mdW5jdGlvbiBSZXNvdXJjZSh4bWwsIHVybCl7XHJcblx0XHJcblx0Ly8gRmlyc3QgZ2V0IHRoZSBpY29uXHJcblx0ICB2YXIgdHlwZSA9IHBhcnNlSW50KHhtbC5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpKTtcclxuXHQgIHN3aXRjaCh0eXBlKXtcclxuXHQgICAgY2FzZSAwOlxyXG5cdCAgICAgIHRoaXMuaWNvbiA9ICcuLi9pbWcvaWNvblJlc291cmNlRmlsZS5wbmcnO1xyXG5cdCAgICAgIGJyZWFrO1xyXG5cdCAgICBjYXNlIDE6XHJcblx0ICAgICAgdGhpcy5pY29uID0gJy4uL2ltZy9pY29uUmVzb3VyY2VMaW5rLnBuZyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICAgIGNhc2UgMjpcclxuICAgIFx0ICB0aGlzLmljb24gPSAnLi4vaW1nL2ljb25SZXNvdXJjZVZpZGVvLnBuZyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICAgIGRlZmF1bHQ6XHJcblx0ICAgICAgdGhpcy5pY29uID0gJyc7XHJcblx0ICAgICAgYnJlYWs7XHJcblx0ICB9XHJcblxyXG5cdCAgLy8gTmV4dCBnZXQgdGhlIHRpdGxlXHJcblx0ICB0aGlzLnRpdGxlID0geG1sLmdldEF0dHJpYnV0ZShcInRleHRcIik7XHJcblxyXG5cdCAgLy8gTGFzdCBnZXQgdGhlIGxpbmtcclxuXHQgIGlmKHR5cGU+MClcclxuXHQgICAgdGhpcy5saW5rID0geG1sLmdldEF0dHJpYnV0ZShcImxpbmtcIik7XHJcblx0ICBlbHNlXHJcblx0ICAgIHRoaXMubGluayA9IHVybCsnYXNzZXRzL2ZpbGVzLycreG1sLmdldEF0dHJpYnV0ZShcImxpbmtcIikucmVwbGFjZSgvIC9nLCAnJTIwJyk7XHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZXNvdXJjZTsiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFBvaW50ID0gcmVxdWlyZSgnLi9wb2ludC5qcycpO1xyXG5cclxuLy9Nb2R1bGUgZXhwb3J0XHJcbnZhciBtID0gbW9kdWxlLmV4cG9ydHM7XHJcblxyXG4vLyByZXR1cm5zIG1vdXNlIHBvc2l0aW9uIGluIGxvY2FsIGNvb3JkaW5hdGUgc3lzdGVtIG9mIGVsZW1lbnRcclxubS5nZXRNb3VzZSA9IGZ1bmN0aW9uKGUpe1xyXG4gICAgcmV0dXJuIG5ldyBQb2ludCgoZS5wYWdlWCAtIGUudGFyZ2V0Lm9mZnNldExlZnQpLCAoZS5wYWdlWSAtIGUudGFyZ2V0Lm9mZnNldFRvcCkpO1xyXG59XHJcblxyXG4vL3JldHVybnMgYSB2YWx1ZSByZWxhdGl2ZSB0byB0aGUgcmF0aW8gaXQgaGFzIHdpdGggYSBzcGVjaWZpYyByYW5nZSBcIm1hcHBlZFwiIHRvIGEgZGlmZmVyZW50IHJhbmdlXHJcbm0ubWFwID0gZnVuY3Rpb24odmFsdWUsIG1pbjEsIG1heDEsIG1pbjIsIG1heDIpe1xyXG4gICAgcmV0dXJuIG1pbjIgKyAobWF4MiAtIG1pbjIpICogKCh2YWx1ZSAtIG1pbjEpIC8gKG1heDEgLSBtaW4xKSk7XHJcbn1cclxuXHJcbi8vaWYgYSB2YWx1ZSBpcyBoaWdoZXIgb3IgbG93ZXIgdGhhbiB0aGUgbWluIGFuZCBtYXgsIGl0IGlzIFwiY2xhbXBlZFwiIHRvIHRoYXQgb3V0ZXIgbGltaXRcclxubS5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbHVlKSk7XHJcbn1cclxuXHJcbi8vZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBtb3VzZSBpcyBpbnRlcnNlY3RpbmcgdGhlIGFjdGl2ZSBlbGVtZW50XHJcbm0ubW91c2VJbnRlcnNlY3QgPSBmdW5jdGlvbihwTW91c2VTdGF0ZSwgcEVsZW1lbnQsIHBPZmZzZXR0ZXIpe1xyXG4gICAgaWYocE1vdXNlU3RhdGUudmlydHVhbFBvc2l0aW9uLnggPiBwRWxlbWVudC5wb3NpdGlvbi54IC0gcEVsZW1lbnQud2lkdGgvMiAtIHBPZmZzZXR0ZXIueCAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueCA8IHBFbGVtZW50LnBvc2l0aW9uLnggKyBwRWxlbWVudC53aWR0aC8yIC0gcE9mZnNldHRlci54KXtcclxuICAgICAgICBpZihwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA+IHBFbGVtZW50LnBvc2l0aW9uLnkgLSBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSAmJiBwTW91c2VTdGF0ZS52aXJ0dWFsUG9zaXRpb24ueSA8IHBFbGVtZW50LnBvc2l0aW9uLnkgKyBwRWxlbWVudC5oZWlnaHQvMiAtIHBPZmZzZXR0ZXIueSl7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHBNb3VzZVN0YXRlLmhhc1RhcmdldCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIC8vcEVsZW1lbnQubW91c2VPdmVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNle1xyXG4gICAgXHRyZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgLy9wRWxlbWVudC5tb3VzZU92ZXIgPSBmYWxzZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gZ2V0cyB0aGUgeG1sIG9iamVjdCBvZiBhIHN0cmluZ1xyXG5tLmdldFhtbCA9IGZ1bmN0aW9uKHhtbCl7XHJcblx0dmFyIHhtbERvYztcclxuXHRpZiAod2luZG93LkRPTVBhcnNlcil7XHJcblx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xyXG5cdFx0eG1sRG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh4bWwsIFwidGV4dC94bWxcIik7XHJcblx0fVxyXG5cdGVsc2V7IC8vIElFXHJcblx0XHR4bWxEb2MgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxET01cIik7XHJcblx0XHR4bWxEb2MuYXN5bmMgPSBmYWxzZTtcclxuXHRcdHhtbERvYy5sb2FkWE1MKHhtbCk7XHJcblx0fVxyXG5cdHJldHVybiB4bWxEb2M7XHJcbn1cclxuXHJcbi8vIGdldHMgdGhlIHNjYWxlIG9mIHRoZSBmaXJzdCBwYXJhbWV0ZXIgdG8gdGhlIHNlY29uZCAod2l0aCB0aGUgc2Vjb25kIGZpdHRpbmcgaW5zaWRlIHRoZSBmaXJzdClcclxubS5nZXRTY2FsZSA9IGZ1bmN0aW9uKHZpcnR1YWwsIGFjdHVhbCl7XHJcblx0cmV0dXJuIGFjdHVhbC55L3ZpcnR1YWwueCp2aXJ0dWFsLnkgPCBhY3R1YWwueCA/IGFjdHVhbC55L3ZpcnR1YWwueSA6IGFjdHVhbC54L3ZpcnR1YWwueDtcclxufVxyXG5cclxubS5yZXBsYWNlQWxsID0gZnVuY3Rpb24gKHN0ciwgdGFyZ2V0LCByZXBsYWNlbWVudCkge1xyXG5cdHdoaWxlIChzdHIuaW5kZXhPZih0YXJnZXQpIDwgMCkge1xyXG5cdFx0c3RyID0gc3RyLnJlcGxhY2UodGFyZ2V0LHJlcGxhY2VtZW50KTtcclxuXHR9XHJcblx0cmV0dXJuIHN0cjtcclxufSJdfQ==
