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
	this.outer=this.getElementById('outerAbsDiv');
	this.shimmer=this.getElementById('shimmer');
	
	this.visibleId=undefined;
	this.usingShimmer=undefined;
	if(customInit && typeof customInit == 'function') {
		this.customInit=customInit;
		this.customInit();
	}
}

GeneralView._loadtimer=undefined;
GeneralView.SVGDivId='svgdiv';
GeneralView.dataIslandMarker='dataIsland';

GeneralView.IWWEM_NS='http://www.cnio.es/scombio/jmfernandez/taverna/inb/frontend';
GeneralView.XSCUFL_NS='http://org.embl.ebi.escience/xscufl/0.1alpha';


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

GeneralView.freeSelect = function (container) {
	// Removing all the content from the container
	var erased=0;
	if(container) {
		for(var ri=container.length-1;ri>=0;ri--) {
			container.remove(ri);
			erased++;
		}
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

GeneralView.Check = function(control) {
	this.control=control;
	this.checked=false;
	
	if(control && control.className) {
		this.baseClassName=control.className;
	}
};

GeneralView.Check.prototype = {
	setCheck: function (state) {
		if(state && !this.checked) {
			this.doCheck();
		} else if(!state && this.checked) {
			this.doUncheck();
		}
	},
	
	doCheck: function () {
		if(this.baseClassName) {
			this.control.className += ' checked';
		}
		this.checked=true;
	},
	
	doUncheck: function () {
		if(this.baseClassName) {
			this.control.className=this.baseClassName;
		}
		this.checked=false;
	},
	
	addEventListener: function (eventType, listener, useCapture) {
		WidgetCommon.addEventListener(this.control, eventType, listener, useCapture);
	},
	
	removeEventListener: function (eventType, listener, useCapture) {
		WidgetCommon.removeEventListener(this.control, eventType, listener, useCapture);
	}
};

GeneralView.getLocalName = function(node) {
	if(node.localName)  return node.localName;
	
	var nodeTagName = node.tagName;
	if(nodeTagName.indexOf(':')!=-1) {
		nodeTagName = nodeTagName.substring(nodeTagName.indexOf(':')+1);
	}
	
	return nodeTagName;
};

GeneralView.isLocalName = function(node,tagName) {
	var nodeTagName=GeneralView.getLocalName(node);
	if(tagName.indexOf(':')!=-1) {
		tagName=tagName.substring(tagName.indexOf(':')+1);
	}
	
	return nodeTagName==tagName;
};

GeneralView.getElementsByTagNameNS = function(node,namespace,localName) {
	if(node.getElementsByTagNameNS)  return node.getElementsByTagNameNS(namespace,localName);
	
	return GeneralView.slowGetElementsByTagNameNS(node,namespace,localName);
}

GeneralView.slowGetElementsByTagNameNS = function(node,namespace,localName, /* optional */ nodelist) {
	if(!nodelist)  {
		nodelist=new Array();
		nodelist.item=function(i) {
			return this[i];
		};
	}
	
	if(node.nodeType==9)  node=node.documentElement;
	
	if(localName=='*' || GeneralView.getLocalName(node)==localName) {
		nodelist.push(node);
	}
	
	for(var child=node.firstChild;child;child=child.nextSibling) {
		if(child.nodeType==1) {
			GeneralView.slowGetElementsByTagNameNS(child,namespace,localName,nodelist);
		}
	}
	
	return nodelist;
};

GeneralView.preProcess = function (thedesc) {
	if(!thedesc)  thedesc='';
	thedesc=thedesc.toString();
	if(thedesc.search(/<[^>]+>/m)==-1) {
		thedesc = thedesc.replace(/((?:ftp)|(?:https?):\/\/[a-zA-Z0-9.]+[^\n\r\t ()]*)/g,"<a href='$1' target='_blank'>$1</a>");
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
	openFrame: function (divId, /* optional */ useShimmer) {
		if(this.visibleId) {
			this.closeFrame();
		}

		this.visibleId=divId;
		if(useShimmer || BrowserDetect.browser=='Explorer' || BrowserDetect.browser=='Safari') {
			this.shimmer.className='shimmer';
			this.usingShimmer=1;
		}
		this.outer.className='outerAbsDiv';
		var elem=this.getElementById(divId);
		elem.className='transAbsDiv';
		/* This is to take some times
		
		var d=new Date();
		this.from=d.getTime();
		*/
	},
	
	closeFrame: function () {
		var d=new Date();
		var to=d.getTime();
		var elem=this.getElementById(this.visibleId);
		this.visibleId=undefined;

		elem.className='hidden';
		this.outer.className='hidden';
		if(this.usingShimmer) {
			this.shimmer.className='hidden';
		}
		/* This is to take some times
		
		alert('Spent '+((to-this.from)/1000)+' seconds');
		*/
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
		theinput.className = 'add';
		theinput.innerHTML=thetext;
		
		var genview=this;
		var addlistener = function() {
			var newinput=genview.createCustomizedFileControl(controlname);

			// As we are interested in the container (the parent)
			// let's get it...
			//newinput=newinput.parentNode;

			var adder=genview.createElement('span');
			adder.className='add';
			adder.innerHTML='&nbsp;';
			WidgetCommon.addEventListener(adder, 'click', addlistener, false);
			
			var remover=genview.createElement('span');
			remover.className='add remove';
			remover.innerHTML='&nbsp;';

			WidgetCommon.addEventListener(remover,'click',function() {
				containerDiv.removeChild(mydiv);

				// Keeping an accurate counter
				if(external && external.inputCounter) {
					external.inputCounter--;
				}
			},false);

			var mydiv=genview.createElement('div');
			mydiv.appendChild(adder);
			mydiv.appendChild(remover);
			mydiv.appendChild(newinput);

			// Adding it to the container
			containerDiv.appendChild(mydiv);
			
			// Keeping an accurate counter
			if(external && external.inputCounter) {
				external.inputCounter++;
			}
		};
		WidgetCommon.addEventListener(theinput, 'click', addlistener, false);

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
		return WidgetCommon.getElementById(theid,this.thedoc);
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
