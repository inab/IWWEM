/*
	IWWE-common.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Window handling code */
function GeneralView(customInit, /* optional */thedoc) {
	this.thedoc = (thedoc)?thedoc:document;
	this.outer=this.getElementById('outerAbsDiv');
	this.shimmer=this.getElementById('shimmer');
	this.frameIds=new Array();
	this.frameCounter=0;
	
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
		elem.className = elem.firstClassName+'checked '+elem.className;
	}
};

GeneralView.initBaseCN = function (elem) {
	if(elem && elem.className) {
		var className;
		
		elem.baseClassName=className=elem.className;
		elem.firstClassName=(className.indexOf(' ')==-1)?className:className.substring(0,className.indexOf(' '));
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
		var className;
		this.baseClassName=className=control.className;
		this.firstClassName=(className.indexOf(' ')==-1)?className:className.substring(0,className.indexOf(' '));
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
			this.control.className = this.firstClassName+'checked '+ this.control.className;
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

GeneralView.Option = function(genview,theval,thetext, /* Optional */selContext) {
	this.genview=genview;
	this.value=theval;
	this.text=thetext;
	this.index=undefined;
	this.optContext=undefined;
	this.selected=false;
	this.name=undefined;
	this.baseClassName=undefined;
	if(selContext) {
		this.appendOrInsertBeforeOrUpdateOption(selContext);
	}
};

GeneralView.Option.prototype = {
	appendOrInsertBeforeOrUpdateOption: function (/* Optional */ selContext,beforeOption) {
		// Replacing previous element
		var newel=undefined;
		var elera=this.getOptionContext();
		if(elera && elera.parentNode) {
			newel=elera;
		}
		
		if(newel) {
			newel.innerHTML=this.text;
		} else if(selContext) {
			this.optContext = newel = this.genview.createElement('div');
			this.baseClassName = newel.className = 'selOption';
			if(this.text instanceof Node) {
				newel.appendChild(this.text);
			} else {
				newel.innerHTML = this.text;
			}
			
			var context = selContext.context;
			this.name = selContext.name;
			if(beforeEl) {
				var beforeEl=context.options[beforeOption].getOptionContext();
				/* Appending the line and the new line to the context */
				context.insertBefore(newel,beforeEl);
			} else {
				/* Appending the line and the new line to the context */
				context.appendChild(newel);
			}
			var opt = this;
			var clickListener = function() {
				selContext.setIndex(opt.index);
			};
			WidgetCommon.addEventListener(newel, 'click', clickListener, false);
		}
		
		return newel;
	},
	
	removeOption: function () {
		if(this.optContext) {
			var elera=this.getOptionContext();
			if(elera && elera.parentNode) {
				// First remove hypothetical input
				this.setSelection(false);
				// Second remove itself!
				elera.parentNode.removeChild(elera);
			}
			this.name=undefined;
			this.optContext=undefined;
		}
	},
	
	getOptionContext: function() {
		return this.optContext;
	},
	
	setSelection: function(boolVal) {
		boolVal=(boolVal)?true:false;
		if(boolVal!=this.selected) {
			var elera=this.getOptionContext();
			if(elera && elera.parentNode) {
				if(boolVal) {
					var newhid = this.genview.createHiddenInput(this.name,this.value);
					elera.parentNode.insertBefore(newhid,elera);
					this.selected=true;
					elera.className += ' selected';
				} else {
					this.selected=false;
					elera.parentNode.removeChild(elera.previousSibling);
					elera.className=this.baseClassName;
				}
			}
		}
	},
	
	updateIndex: function(idx) {
		var prevIndex=(this.index)?this.index:0;
		if(idx%2 != prevIndex%2) {
			this.optContext.className = this.baseClassName = (idx%2)?'selOptionEven':'selOption';
			if(this.selected)  this.optContext.className += ' selected';
		}
		this.index=idx;
	}
};

GeneralView.Select = function(genview,name,context) {
	this.context=context;
	this.selectedIndex=-1;
	this.options=new Array();
	this.changeListeners=new Array();
	this.name=name;
	this.multiple=false;
	this.type='select-one';
};

GeneralView.Select.prototype = {
	add: function (anOption,/* Optional */ beforeIdx) {
		if(beforeIdx && beforeIdx<this.options.length) {
			anOption.appendOrInsertBeforeOrUpdateOption(this,beforeIdx);
			if(!this.multiple && this.selectedIndex!=-1 && beforeIdx>=this.selectedIndex) {
				this.selectedIndex++;
			}
			anOption.updateIndex(beforeIdx);
			for(var i=beforeIdx+1;i<this.options.length;i++) {
				this.options[i].updateIndex(i);
			}
			this.options.splice(beforeIdx,0,anOption);
		} else {
			anOption.appendOrInsertBeforeOrUpdateOption(this);
			anOption.updateIndex(this.options.length);
			this.options.push(anOption);
		}
	},
	
	remove: function (idx) {
		if(idx<this.options.length) {
			if(!this.multiple && this.selectedIndex==idx) {
				this.setIndex();
			}
			this.options[idx].removeOption();
			this.options.splice(idx,1);
		}
	},
	
	setIndex: function(idx) {
		var prevSel=this.selectedIndex;
		if(prevSel!=idx || this.multiple) {
			if(!this.multiple && prevSel!=-1) {
				this.options[prevSel].setSelection(false);
			}
			if(typeof idx == 'number' && idx > -1 && idx < this.options.length) {
				this.options[idx].setSelection(true);
				if(!this.multiple) {
					this.selectedIndex=idx;
				}
			} else if(!this.multiple) {
				this.selectedIndex=-1;
			}
			
			// And now, we have to call all the listeners!!!
			for(var i=0;i<this.changeListeners.length;i++) {
				var listener=this.changeListeners[i];
				try {
					if(typeof listener == 'string') {
						eval(listener);
					} else {
						listener();
					}
				} catch(e) {
					// Ignore them???
				}
			}
		}
	},
	
	setMultipleBehavior: function(isMultiple) {
		isMultiple = (isMultiple)?true:false;
		if(this.multiple != isMultiple) {
			this.type=(isMultiple)?'select-multiple':'select-one';
			this.multiple=isMultiple;
			// We have to deactivate all set options
			this.selectedIndex=-1;
			if(!isMultiple) {
				for(var i=this.options.length-1; i>=0;i--) {
					this.options[i].setSelection(false);
				}
			}
		}
	},
	
	addEventListener: function (eventType, listener, useCapture) {
		switch(eventType) {
			case 'change':
				this.changeListeners.push(listener);
				break;
			default:
				WidgetCommon.addEventListener(this.context,eventType,listener,useCapture);
				break;
		}
	},
	
	clear: function () {
		this.setIndex(-1);
		GeneralView.freeContainer(this.context);
		this.options=new Array();
		this.multiple=false;
		this.type='select-one';
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
	openFrame: function (/* optional */ divId, useShimmer) {
		if(this.visibleId) {
			this.suspendFrame();
		}
		var framePos=undefined;
		if(divId) {
			framePos=this.frameCounter;
			this.frameIds.push([divId,useShimmer,framePos]);
			this.frameCounter++;
		} else if(this.frameIds.length>0) {
			divId=this.frameIds[0][0];
			useShimmer=this.frameIds[0][1];
		}
		
		if(divId) {
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
		}
		
		return framePos;
	},
	
	suspendFrame: function() {
		if(this.visibleId) {
			var elem=this.getElementById(this.visibleId);

			elem.className='hidden';
			this.outer.className='hidden';
			if(this.usingShimmer) {
				this.shimmer.className='hidden';
			}
			this.usingShimmer=undefined;

			this.visibleId=undefined;
		}
	},
	
	closeFrame: function (framePos) {
		if(typeof framePos == 'number') {
			var framei;
			for(framei=0;framei<this.frameIds.length;framei++) {
				if(this.frameIds[framei][2]==framePos) {
					this.frameIds.splice(framei,1);
					if(framei==0) {
						/*
						var d=new Date();
						var to=d.getTime();
						*/
						this.openFrame();
						/* This is to take some times

						alert('Spent '+((to-this.from)/1000)+' seconds');
						*/
					}
					break;
				}
			}
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
			remover.className='remove';
			remover.innerHTML='&nbsp;';

			WidgetCommon.addEventListener(remover,'click',function() {
				containerDiv.removeChild(mydiv);

				// Keeping an accurate counter
				if(external && ('inputCounter' in external) && (typeof external.inputCounter == 'number')) {
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
			if(external && ('inputCounter' in external) && (typeof external.inputCounter == 'number')) {
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
