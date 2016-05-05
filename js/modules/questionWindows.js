"use strict";

//Module export
var m = module.exports;

m.taskWindow = '\
<div class="title">\
	Task\
</div>\
<div class="windowContent" style="overflow-y: scroll;height:40vh;">\
	<h3><b>%title%</b></h3>\
	<p>%instructions%</p>\
	<hr/>\
	<p><b>%question%</b></p>\
	<hr/>\
	<p class="feedback"></p>\
</div>\
';


m.resourceWindow = '\
<div class="title">\
	Resource\
</div>\
<div class="windowContent" style="overflow-y: scroll; height:20vh;">\
	%resources%\
</div>\
';

m.resource = '\
<div class="resource">\
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
<div class="title">\
	Answers\
</div>\
<div class="windowContent" style="min-height:20vh;">\
</div>\
';

m.fileWindow = '\
<div class="window">\
  <div class="title">\
    Files\
  </div>\
  <div class="windowContent, center" style="height:20vh;background-color:#FFFFFF">\
    <input type="file" multiple/>\
  </div>\
</div>\
';

m.messageWindow = '\
<div class="title">\
	Message\
</div>\
<div class="windowContent" style="height:80vh;overflow-y:scroll;">\
	<p><b>From </b>%title%</p>\
	<hr/>\
	<p><b>Subject </b>%instructions%</p>\
	<hr/>\
	<p>%question%</p>\
  <button>Mark as Read</button>\
</div>\
';