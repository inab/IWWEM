/*
	IWWE-common.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007
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
GeneralView.SVGDivId='svgdiv';
GeneralView.dataIslandMarker='dataIsland';

GeneralView.freeContainer = function (container) {
	// Removing all the content from the container
	var erased=0;
	if(container) {
		var eraseme = container.firstChild;
		
		while(eraseme) {
			var toerase = eraseme;
			eraseme = eraseme.nextSibling;
			container.removeChild(toerase);
			erased++;
		}

		// Last resort!
		//container.innerHTML = '&nbsp;';
	}
	
	return erased;
};

GeneralView.checkCN = function (elem) {
	if(elem && elem.className) {
		elem.className += ' checked';
	}
};

GeneralView.initBaseCN = function (elem) {
	if(elem && elem.className) {
		elem.baseClassName=elem.className;
	}
};

GeneralView.revertCN = function (elem) {
	if(elem && elem.baseClassName) {
		elem.className=elem.baseClassName;
	}
};

GeneralView.initCheck = function(check) {
	check.checked=false;
	GeneralView.initBaseCN(check);
	check.setCheck = function (state) {
		if(state && !this.checked) {
			GeneralView.checkCN(this);
			this.checked=true;
		} else if(!state && this.checked) {
			GeneralView.revertCN(this);
			this.checked=false;
		}
	};
};

GeneralView.preProcess = function (thedesc) {
	if(!thedesc)  thedesc='';
	thedesc=thedesc.toString();
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


/* Now, the instance methods */
GeneralView.prototype = {
	openFrame: function (divId) {
		if(this.visibleId) {
			this.closeFrame();
		}

		this.visibleId=divId;
		if(BrowserDetect.browser=='Explorer' || BrowserDetect.browser=='Safari') {
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
		if(BrowserDetect.browser=='Explorer' || BrowserDetect.browser=='Safari') {
			this.shimmer.className='hidden';
		}
	},
	
	/*
	createCustomizedFileControl: function (thename) {
		var filecontrol = this.createElement('input');
		filecontrol.type="file";
		filecontrol.name=thename;
		filecontrol.className='file hidden';
		
		var divfilecontrol = this.createElement('div');
		divfilecontrol.className = 'fileinputs';
		divfilecontrol.appendChild(filecontrol);
		
		var fakeFileUpload = this.createElement('div');
		fakeFileUpload.className = 'fakefile';
		fakeFileUpload.appendChild(this.createElement('input'));
		var image = this.createElement('img');
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
		var filecontrol = this.createElement('input');
		filecontrol.type="file";
		filecontrol.name=thename;
		
		return filecontrol;
	},
	
	/* Generates a new graphical input */
	generateFileSpan: function (thetext,controlname, /* optional */ external) {
		var randominputid=WidgetCommon.getRandomUUID();

		// The container of all these 'static' elements
		var thediv = this.createElement('div');
		thediv.className='borderedInput';

		// Dynamic input container
		var containerDiv=this.createElement('div');
		containerDiv.id=randominputid;

		// 'Static' elements
		var theinput = this.createElement('span');
		// The addition button
		theinput.className = 'plus';
		theinput.innerHTML=thetext;
		
		var genview=this;
		WidgetCommon.addEventListener(theinput, 'click', function() {
			var newinput=genview.createCustomizedFileControl(controlname);

			// As we are interested in the container (the parent)
			// let's get it...
			//newinput=newinput.parentNode;

			var remover=genview.createElement('span');
			remover.className='plus remove';
			remover.innerHTML='&nbsp;';

			var mydiv=genview.createElement('div');
			WidgetCommon.addEventListener(remover,'click',function() {
				containerDiv.removeChild(mydiv);

				// Keeping an accurate counter
				if(external && external.inputCounter) {
					external.inputCounter--;
				}
			},false);

			mydiv.appendChild(remover);
			mydiv.appendChild(newinput);

			// Adding it to the container
			containerDiv.appendChild(mydiv);
			
			// Keeping an accurate counter
			if(external && external.inputCounter) {
				external.inputCounter++;
			}
		}, false);

		// Last children!
		thediv.appendChild(theinput);

		thediv.appendChild(containerDiv);

		return thediv;
	},
	
	dispose: function(customDispose) {
		// Nothing to do
		
		// Now, custom dispose
		this.customDispose=customDispose;
		this.customDispose();
	},
	
	getElementById: function(theid) {
		return this.thedoc.getElementById(theid);
	},
	
	createElement: function(tagName) {
		return this.thedoc.createElement(tagName);
	},
	
	createHiddenInput: function(thename,thevalue) {
		var input = this.createElement('input');
		input.type="hidden";
		input.name=thename;
		// This value must be 1 for IE data islands
		input.value=thevalue;
		
		return input;
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

function DisposeIWWEM(customDispose) {
	// Killing a remaining timer
	if(GeneralView._loadtimer)  clearInterval(GeneralView._loadtimer);
	// Disposing from inside
	genview.dispose(customDispose);
	// Freeing resources
	genview=undefined;
}
