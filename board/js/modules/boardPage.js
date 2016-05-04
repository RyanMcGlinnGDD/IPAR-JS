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

// Html and its parts
var html;
var windowDiv;
var windowFilm;
var proceedContainer;
var pausedTime = 0;
var zoomSlider;

//persistent utilities
var prevTime; // date in milliseconds
var dt; // delta time in milliseconds

// Creates a board page object and loads it
function BoardPage(callback){
	
	// Get the html for the board page
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
	    if (request.readyState == 4 && request.status == 200) {
	    	
	    	// Save the HTML
	    	html = request.responseText;
	    	if(callback)
	    	  callback();
	    }
	}
	request.open("GET", "board.html", true);
	request.send();
}

//prototype
var p = BoardPage.prototype;

p.open = function(caseZip) {
	
	// Create the page
    this.createPage(caseZip);
    
    // Add listener to resize
    window.addEventListener("resize", this.resize);
    
    // Start the game loop
    this.loop();
	
}

//initialization, mouse events, and game instantiation
p.createPage = function(caseZip){
	
	// Set the html to the page
	document.body.innerHTML = html;
	
	// Get the parts of the page
	windowDiv = document.getElementById('window');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    proceedContainer = document.getElementById('proceedContainer');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Setup the window film
	windowFilm = document.getElementById('windowFlim');
	windowFilm.onclick = function() { windowDiv.innerHTML = ''; };
	
	// Setup dt
    prevTime = Date.now();
    dt = 0;
    
    // Create the game
    game = new Game(caseZip, canvas, windowDiv, proceedContainer);
    
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
p.loop = function(){
	// loop
	if(game){
	    window.requestAnimationFrame(this.loop.bind(this));
	    
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
}

// Called on window resize
p.resize = (e){
	
	canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Get the new scale
    game.scale = Utilities.getScale(Constants.boardSize, new Point(canvas.width, canvas.height));
}

// Called when the question window closes
p.windowClosed = function(){
	
	// Unpause the game and fully close the window
	pausedTime = 0;
	game.active = true;
	windowFilm.style.display = 'none';
	proceedContainer.style.display = "none";
	
	game.windowClosed();
	
}

// Call to close the board page
p.close = function(){
	document.body.innerHTML = '';
    window.removeEventListener("resize", this.resize);
    game = null;
	if(this.onclose)
		this.onclose();
}

module.exports = BoardPage;    