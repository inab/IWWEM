/*
	$Id$
	IWWEM-common.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
	
	This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.

	IWWE&M is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	IWWE&M is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with IWWE&M.  If not, see <http://www.gnu.org/licenses/agpl.txt>.

	Original IWWE&M concept, design and coding done by José María Fernández González, INB (C) 2008.
	Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem
*/

/* Window handling code */
function GeneralView(customInit, /* optional */thedoc) {
	this.thedoc = (thedoc)?thedoc:document;
	
	// Used for busy cursor and others
	var thebody = this.thedoc.getElementsByTagName("body")[0];
	this.thebody=thebody;
	
	// Shimmer
	var shimmer = this.thedoc.createElement('iframe');
	shimmer.className='hidden';
	shimmer.frameBorder=0;
	shimmer.src='about:blank';
	shimmer.id='shimmer';
	thebody.appendChild(shimmer);
	
	this.shimmer=shimmer;
	
	// OuterAbsDiv
	var outer = this.thedoc.createElement('div');
	outer.className='hidden';
	outer.id='outerAbsDiv';
	thebody.insertBefore(outer,thebody.firstChild);
	
	this.outer=outer;
	
	// Loading-like frames
	var loading = this.thedoc.createElement('div');
	loading.className='hidden';
	var ltable=this.thedoc.createElement('table');
	ltable.setAttribute('style','width:100%; height:100%;');
	var ltr=this.thedoc.createElement('tr');
	ltr.setAttribute('valign','middle');
	var ltd=this.thedoc.createElement('td');
	ltd.setAttribute('align','center');
	var limg=this.thedoc.createElement('img');
	limg.setAttribute('alt','Image not loaded (yet)');
	limg.src='about:blank';
	ltd.appendChild(limg);
	ltr.appendChild(ltd);
	ltable.appendChild(ltr);
	loading.appendChild(ltable);
	thebody.insertBefore(loading,shimmer);
	
	this.loadingImage=limg;
	this.loadingDiv=loading;
	this.loadingHash={};
	
	this.frameIds=new Array();
	this.frameCounter=0;
	this.messageDiv=this.getElementById('messageDiv');
	
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

GeneralView.IWWEM_NS='http://www.cnio.es/scombio/jmfernandez/inb/IWWEM/frontend';
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

GeneralView.Check = function(control,/* optional */ setDefaultEH,genview,thetext,isRight,color,parentNode) {
	if(control==undefined) {
		if(!color || (color!='red' && color!='green' && color!='blue')) {
			color='blue';
		}
		control=genview.createElement('span');
		control.className='checkbox'+color+' checkbox '+((isRight)?'right':'left');
		control.innerHTML=thetext;
		if(parentNode!=undefined) {
			try {
				parentNode.appendChild(control);
			} catch(e) {
				// IgnoreIT(R)
			}
		}
	}
	
	this.control=control;
	this.checked=false;
	
	if(control && control.className) {
		var className;
		this.baseClassName=className=control.className;
		this.firstClassName=(className.indexOf(' ')==-1)?className:className.substring(0,className.indexOf(' '));
	}
	
	if(setDefaultEH!=undefined) {
		if(typeof setDefaultEH != 'function') {
			var check=this;
			setDefaultEH = function() {
				if(check.checked) {
					check.doUncheck();
				} else {
					check.doCheck();
				}
			};
		}
		this.addEventListener('click', setDefaultEH, false);
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
			if(typeof this.text=='string') {
				newel.innerHTML = this.text;
			} else {
				newel.appendChild(this.text);
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
		if(beforeIdx!=undefined && beforeIdx<this.options.length) {
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
		// Unnumbered lists
		thedesc = thedesc.replace(/\n*\*[\t ]+(.+)\n*/mg,"<ul><li>$1</li></ul>");
		// thedesc = thedesc.replace(/<\/ul><ul>/g,"");
		
		// Numbered lists
		thedesc = thedesc.replace(/\n*([0-9]+)[.)]-?[\t ]+(.+)\n*/mg,"<ol start='$1'><li>$2</li></ol>");
		
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
	setMessage: function(message) {
		this.messageDiv.innerHTML=message;
	},
	
	addMessage: function(message) {
		this.messageDiv.innerHTML+=message;
	},
	
	clearMessage: function() {
		GeneralView.freeContainer(this.messageDiv);
	},
	
	busy:	function(/*optional*/ isBusy) {
		this.thebody.className=(isBusy)?'busy':'';
	},
	
	addLoadingFrames:	function(loadingHash) {
		for(var divId in loadingHash) {
			this.loadingHash[divId]=loadingHash[divId];
		}
	},
	
	openFrame: function (/* optional */ divId, useShimmer) {
		if(this.visibleId && divId && !(divId in this.loadingHash)) {
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
			if(useShimmer || BrowserDetect.browser=='Explorer' || BrowserDetect.browser=='Safari') {
				this.shimmer.className='shimmer';
				this.usingShimmer=1;
				this.frameIds[0][1]=1;
			}
			this.outer.className='outerAbsDiv';
			
			var elem=undefined;
			if(divId in this.loadingHash) {
				elem=this.loadingDiv;
				this.loadingImage.src=this.loadingHash[divId].src;
				this.loadingImage.setAttribute('alt',this.loadingHash[divId].alt);
			} else {
				this.visibleId=divId;
				elem=this.getElementById(divId);
			}
			elem.className='transAbsDiv';
			/* This is to take some times

			var d=new Date();
			this.from=d.getTime();
			*/
		}
		
		return framePos;
	},
	
	suspendFrame: function(/* optional */ vId,usingShimmer) {
		if(vId==undefined) {
			vId = this.visibleId;
			usingShimmer = this.usingShimmer;
		}
		
		if(vId!=undefined) {
			var elem=(vId in this.loadingHash)?this.loadingDiv:this.getElementById(vId);

			elem.className='hidden';
			if(elem==this.loadingDiv) {
				// Unload image if it is necessary
				this.loadingImage.src='about:blank';
				this.loadingImage.setAttribute('alt','Image not loaded (yet)');
			}
			this.outer.className='hidden';
			if(this.visibleId==undefined || vId==this.visibleId) {
				this.visibleId=undefined;
				if(usingShimmer) {
					this.shimmer.className='hidden';
					this.usingShimmer=undefined;
				}
			}
		}
	},
	
	closeFrame: function (framePos) {
		if(typeof framePos == 'number') {
			var framei;
			for(framei=0;framei<this.frameIds.length;framei++) {
				if(this.frameIds[framei][2]==framePos) {
					this.suspendFrame(this.frameIds[framei][0],this.frameIds[framei][1]);
					this.frameIds.splice(framei,1);
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
	generateFileSpan: function (thetext,controlname, /* optional */ external,siblings) {
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
		
		if(siblings!=undefined) {
			if(siblings instanceof Array) {
				for(var si=0;si<siblings.length;si++) {
					thediv.appendChild(siblings[si]);
				}
			} else {
				thediv.appendChild(siblings);
			}
		}

		thediv.appendChild(containerDiv);

		return thediv;
	},
	
	generateCheckControl: function(thetext,/* optional */isRight,color,setDefaultEH,parentNode) {
		var check=new GeneralView.Check(undefined,setDefaultEH,this,thetext,isRight,color,parentNode);
		
		return check;
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
	
	createHiddenInput: function(thename,thevalue,/* optional */ thetype) {
		if(thetype==undefined || thetype=='')
			thetype='hidden';
		
		var input = this.createElement('input');
		input.type=thetype;
		input.name=thename;
		// This value must be 1 for IE data islands
		input.value=thevalue;
		
		return input;
	},
	
	createInput: function(thename,thevalue) {
		return this.createHiddenInput(thename,thevalue,'text');
	},
	
	/**
	 * This method returns the fetched XML content, or fires an error message,
	 * so it does the error handling task!
	 * 
	 * It returns undefined on error
	 */
	parseRequest: function(request,labelMessage) {
		var response=undefined;
		// Beware parsing errors in Explorer
		if('status' in request) {
			if(request.status==200) {
				// Beware parsing errors in Explorer
				if(request.parseError && request.parseError.errorCode!=0) {
					this.addMessage(
						'<blink><h1 style="color:red">FATAL ERROR ('+
						request.parseError.errorCode+
						") while "+labelMessage+" at ("+
						request.parseError.line+
						","+request.parseError.linePos+
						"):</h1></blink><pre>"+
						request.parseError.reason+"</pre>"
					);
				} else {
					response = request.responseXML;
					if(response==undefined || response==null) {
						if(request.responseText!=undefined && request.responseText!=null) {
							var parser = new DOMParser();
							response = parser.parseFromString(request.responseText,'application/xml');
							var reason=undefined;
							var place=undefined;
							if(response!=null && response!=undefined && GeneralView.getLocalName(response.documentElement)=='parsererror') {
								for(var child=response.documentElement.firstChild;child;child=child.nextSibling) {
									if(child.nodeType==1 && GeneralView.getLocalName(child)=='sourcetext') {
										place=WidgetCommon.getTextContent(child);
									} else if(child.nodeType==3 || child.nodeType==4) {
										if(reason==undefined) {
											reason=WidgetCommon.getTextContent(child);
										} else {
											reason += WidgetCommon.getTextContent(child);
										}
									}
								}
								response=undefined;
							}
							if(response==undefined) {
								if(reason==undefined)
									reason="an unknown reason";
								if(place==undefined)
									place="<i>unknown place</i>";
								this.addMessage(
									'<blink><h1 style="color:red">FATAL ERROR while '+labelMessage+' due "+' +
									reason+":</h1></blink><pre>"+
									place+"</pre>"
								);
							}
						} else {
							// Backend error.
							this.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR B('+labelMessage+'): Please notify it to INB IWWE&amp;M developer</h1></blink>'
							);
						}
					}
				}
			} else {
				// Communications error.
				var statusText='';
				if(('statusText' in request) && request['statusText']) {
					statusText=request.statusText;
				}
				this.addMessage(
					'<blink><h1 style="color:red">FATAL ERROR C('+labelMessage+'): '+
					request.status+' '+statusText+'</h1></blink>'
				);
			}
		} else {
			this.addMessage(
				'<blink><h1 style="color:red">FATAL ERROR F('+labelMessage+'): Please notify it to INB Web Workflow Manager developer</h1></blink>'
			);
		}
		return response;
	},
	
	createFCKEditor: function (divContainer,fckObjectName,/* optional */fckHeight,fakeCols,fakeRows) {
		if(FCKeditor_IsCompatibleBrowser()) {
			// Rich-Text Editor
			if(fckHeight==undefined)
				fckHeight='250';
			
			var fckObject=new FCKeditor(fckObjectName,undefined,fckHeight,'IWWEM');
			var basehref = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
			fckObject.BasePath='js/FCKeditor/';
			fckObject.Config['CustomConfigurationsPath']=basehref+'/etc/fckconfig_IWWEM.js';
			var fckdiv=this.createElement('div');
			fckdiv.style.margin='0px';
			fckdiv.style.padding='0px';
			fckdiv.innerHTML = fckObject.CreateHtml();
			divContainer.appendChild(fckdiv);
		} else {
			if(fakeCols==undefined)
				fakeCols=60;
			if(fakeRows==undefined)
				fakeRows=10;
			
			// I prefer my own defaults
			var fakeFckObject=this.createElement('textarea');
			fakeFckObject.cols=fakeCols;
			fakeFckObject.rows=fakeRows;
			fakeFckObject.name=fckObjectName;
			divContainer.appendChild(fakeFckObject);
		}
	}
};

var genview;

function InitIWWEM(customInit, customJSARR, /* optional */ thedoc) {
	//WidgetCommon.DebugMSG("Initializing IWWE&M");
	WidgetCommon.widgetCommonInit(IWWEM.Plugins,function() {
		//WidgetCommon.DebugMSG("IWWE&M plugins loaded");
		WidgetCommon.widgetCommonInit(IWWEM.CommonDeps,function() {
			//WidgetCommon.DebugMSG("IWWE&M common dependencies loaded");
			var lastfunc = function() {
				//WidgetCommon.DebugMSG("IWWE&M was loaded");
				genview=new GeneralView(customInit,thedoc);
				IWWEM.Loaded=true;
			};
			if(customJSARR==undefined) {
				lastfunc();
			} else {
				WidgetCommon.widgetCommonInit(customJSARR,lastfunc,'');
			}
		},'');
	},'');
}

function DisposeIWWEM(customDispose) {
	// Killing a remaining timer
	if(GeneralView._loadtimer)  clearInterval(GeneralView._loadtimer);
	// Disposing from inside
	if(genview!=undefined) {
		genview.dispose(customDispose);
		// Freeing resources
		genview=undefined;
	}
}
