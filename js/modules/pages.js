"use strict";

//Module export
var m = module.exports;

// The Title page
m.TitlePage = '\
<div id="center"> \
	<div> \
		<h1>IPAR</h1> \
		<button id="load-button">Load Case</button> \
		<input type="file" id="load-input" /> \
	</div> \
</div> \
<img id="logo" src="img/nsflogo.png" />\
';

// The Case page
m.CasePage = '\
<div id="center">\
	<div>\
		<h1 id="title"></h1>\
		<div id="right-content">\
			<div>\
				<button id="resume-button">Resume Session</button><br/>\
				<button id="start-button">Start from Beginning</button><br/>\
				<button id="back-button" class="bottom">&lt; &lt; Back</button>\
			</div>\
		</div>\
		<div id="left-content">\
			<div id="description-box"><p id="description"></p></div>\
		</div>\
	</div>\
</div>\
<img id="logo" src="../img/nsflogo.png" />\
';

// The Profile Page
m.ProfilePage = '\
<div id="center">\
	<div>\
		<h1 id="title">Profile Information</h1><br/>\
		<form>\
			First Name: <span id="first-name"></span><br/>\
			<hr/>\
			Last Name: <span id="last-name"></span><br/>\
			<span id="email"><hr/> Email: <input name="email" id="input-email" /></span><br/>\
		</form>\
		<br/>\
		<button id="back-button">Back</button>\
		<button id="proceed-button">Proceed</button>\
	</div>\
</div>\
<img id="logo" src="../img/nsflogo.png" />\
';

// The Board Page
m.BoardPage = '\
<canvas id="canvas">The browser you are using does not support modern functionality</canvas>\
<div id="controlBar" class="buttonBar">\
	<button id="zoom-in">+</button>\
	<input id="zoom-slider" type="range" step="0.1" min="-2.0" max="-0.5" />\
	<button id="zoom-out">-</button>\
</div>\
<div id="bottomBar" class="buttonBar"></div>\
<!-- save button -->\
<button id="blob" class="saveBtn"><img src="../img/iconSave.png" /></button>\
<!-- hidden save as link -->\
<input type="file" id="load-input" style="display: none;" />\
<div id="windowFlim">\
	<div id="proceedContainer" style="display: none">\
		<button id="proceedBtnLong" class="proceedWidthStart">Proceed</button>\
		<div id="proceedBtnRound" class="proceedLeftStart">\
			<div id="rightArrow"> > </div>\
		</div>\
	</div>\
</div>\
<div id="window"></div>\
';