/*
	IWWE-common.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Window handling code */
function GeneralView(customInit, /* optional */thedoc) {
	this.thedoc = (thedoc)?thedoc:document;
	this.outer=this.thedoc.getElementById('outerAbsDiv');
	this.shimmer=this.thedoc.getElementById('shimmer');
	
	this.visibleId=undefined;
	if(customInit && typeof customInit == 'function') {
		this.customInit=customInit;
		this.customInit();
	}
}

GeneralView._loadtimer=undefined;

GeneralView.freeContainer = function (container) {
	// Removing all the content from the container
	if(container) {
		var eraseme = container.firstChild;

		while(eraseme) {
			var toerase = eraseme;
			eraseme = eraseme.nextSibling;
			container.removeChild(toerase);
		}

		// Last resort!
		//container.innerHTML = '&nbsp;';
	}
};

GeneralView.preProcess = function (thedesc) {
	if(!thedesc)  thedesc='';
	if(thedesc.search(/<[^>]+>/m)==-1) {
		thedesc = thedesc.replace(/((?:ftp)|(?:https?):\/\/[a-zA-Z0-9.]+\/[^\n\r\t ()]*)/g,"<a href='$1' target='_blank'>$1</a>");
		thedesc = thedesc.replace(/([a-zA-Z0-9.%]+@[a-zA-Z0-9.%]+)/g,"<a href='mailto:$1' target='_blank'>$1</a>");
		// thedesc = thedesc.replace(/mailto:([^\n\r\t ()]+)/g,"<a href='mailto:$1' target='_blank'>$1</a>");
		
		// I have found that mozilla RegExp has some bugs!
		thedesc = thedesc.replace(/\n*\*[\t ]+(.+)\n*/mg,"<ul><li>$1</li></ul>");
		// thedesc = thedesc.replace(/<\/ul><ul>/g,"");
		
		thedesc = thedesc.replace(/([\n\t ])&([\n\t ])/g,"$1&amp;$2");
		thedesc = thedesc.replace(/^&([\n\t ])/,"&amp;$1");
		thedesc = thedesc.replace(/([\n\t ])&$/,"$1&amp;");
		thedesc = thedesc.replace(/\n/g,"<br>");
		thedesc = thedesc.replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;");
	}
	
	return thedesc;
};

GeneralView.dataIslandMarker='dataIsland';

GeneralView.prototype = {
	openFrame: function (divId) {
		if(this.visibleId) {
			this.closeFrame();
		}

		this.visibleId=divId;
		if(BrowserDetect.browser!='Konqueror') {
			this.shimmer.className='shimmer';
		}
		this.outer.className='outerAbsDiv';
		var elem=this.thedoc.getElementById(divId);
		elem.className='transAbsDiv';
		
	},
	
	closeFrame: function () {
		var elem=this.thedoc.getElementById(this.visibleId);
		this.visibleId=undefined;

		elem.className='hidden';
		this.outer.className='hidden';
		if(BrowserDetect.browser!='Konqueror') {
			this.shimmer.className='hidden';
		}
	},
	
	/*
	createCustomizedFileControl: function (thename) {
		var filecontrol = this.thedoc.createElement('input');
		filecontrol.type="file";
		filecontrol.name=thename;
		filecontrol.className='file hidden';
		
		var divfilecontrol = this.thedoc.createElement('div');
		divfilecontrol.className = 'fileinputs';
		divfilecontrol.appendChild(filecontrol);
		
		var fakeFileUpload = this.thedoc.createElement('div');
		fakeFileUpload.className = 'fakefile';
		fakeFileUpload.appendChild(this.thedoc.createElement('input'));
		var image = this.thedoc.createElement('img');
		image.src='style/button_select.gif';
		fakeFileUpload.appendChild(image);
		
		divfilecontrol.appendChild(fakeFileUpload);
		
		var transferFileValue = function () {
			fakeFileUpload.value = filecontrol.value;
		};
		WidgetCommon.addEventListener(filecontrol,'change',transferFileValue,false);
		WidgetCommon.addEventListener(filecontrol,'mouseout',transferFileValue,false);
		
		return filecontrol;
	},
	*/
	
	createCustomizedFileControl: function (thename) {
		var filecontrol = this.thedoc.createElement('input');
		filecontrol.type="file";
		filecontrol.name=thename;
		
		return filecontrol;
	}
};
	
var genview;
function InitIWWEM(customInit, /* optional */ thedoc) {
	if (('WidgetCommon' in window) && ('_loaded' in window['WidgetCommon']) && window['WidgetCommon']['_loaded']) {
		genview=new GeneralView(customInit,thedoc);
	} else {
		GeneralView._loadtimer = setInterval(function() {
			if (('WidgetCommon' in window) && ('_loaded' in window['WidgetCommon']) && window['WidgetCommon']['_loaded']) {
				clearInterval(GeneralView._loadtimer);
				genview=new GeneralView(customInit,thedoc);
				GeneralView._loadtimer=undefined;
			}
		}, 10);
	}
}
