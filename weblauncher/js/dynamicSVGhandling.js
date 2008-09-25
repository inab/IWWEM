/*
	$Id$
	dynamicSVGhandling.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/*
	Class to deal with SVG files generated by INBWorkflowLauncher
	(which have an internal injected trampoline)
*/

function TavernaSVG(/* optional */ nodeid,url,bestScaleW,bestScaleH,callOnFinish,thedoc) {
	this._svgloadtimer = undefined;
	this.svglink = undefined;
	this.svgobj = undefined;
	this.defaultsvg = undefined;
	this.defaultid = undefined;
	this.defaultbestScaleW = undefined;
	this.defaultbestScaleH = undefined;
	this.defaultCallOnFinish = undefined;
	this.defaultthedoc = undefined;
	
	if(BrowserDetect.browser=='Konqueror' || BrowserDetect.browser=='Explorer') {
		this.defaultPreStyle="overflow: auto;";
		this.defaultCreateStyle="";
		this.asEmbed= BrowserDetect.browser!='Konqueror';
	} else {
		this.defaultPreStyle="overflow: hidden;";
		this.defaultCreateStyle="width:0;height:0;";
		this.asEmbed=false;
	}
	
	this.loading = undefined;
	this.queue = new Array();
	this.current = undefined;
	this.SVGtramp = undefined;
	this.once=1;
	this.noloaded = 0;
	
	var me = this;
	this.timeoutLoad = function() {
		clearTimeout(this.loading);
		me.loading=true;
		me.loadQueuedSVG();
	};
	
	if(nodeid && url) {
		this.defaultid = nodeid;
		this.defaultsvg = url;
		this.defaultbestScaleW = bestScaleW;
		this.defaultbestScaleH = bestScaleH;
		this.defaultCallOnFinish = callOnFinish;
		this.defaultthedoc = thedoc;
	}
}

TavernaSVG.prototype = {
	getTitleToNode: function() {
		if(this.SVGtramp) {
			return this.SVGtramp.titleToNode;
		}
		
		return undefined;
	},
	
	getNodeToTitle: function() {
		if(this.SVGtramp) {
			return this.SVGtramp.nodeToTitle;
		}
		
		return undefined;
	},
	
	getTrampoline: function() {
		return this.SVGtramp;
	},
	
	clearSVGInternal: function (/* optional */ thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		if(this.svglink) {
			this.svglink.parentNode.removeChild(this.svglink);
			this.svglink=undefined;
		}
		var svgobj=this.svgobj;
		if(svgobj) {
			if(!thedoc)  thedoc=document;
			// First, kill timer (if any!)
			if(this._svgloadtimer) {
				clearTimeout(this._svgloadtimer);
				this._svgloadtimer=undefined;
			}
			/*
			window.SVGtrampoline=undefined;
			if(BrowserDetect.browser!='Explorer' && BrowserDetect.browser!='Konqueror') {
				delete window['SVGtrampoline'];
			}
			*/
			// Second, remove trampoline
			this.SVGtramp=undefined;
			this.once=1;
			// Third, remove previous SVG
			if(this.asEmbed) {
				this.svgobj.style.display='none';
				this.svgobj.style.visibility='hidden';
			} else {
				this.svgobj.setAttribute("style","display:none;visibility:hidden;");
			}
			/*
			try {
				this.svgobj.parentNode.removeChild(this.svgobj);
			} catch(e) {
				// Be silent about failures!
				//alert('What!?!');
			}
			*/
			// And any trace!
			this.svgobj=undefined;
			this.current=undefined;
		}
		return svgobj;
	},
	
	clearSVG: function (/* optional */ thedoc) {
		var svgobj=this.clearSVGInternal(thedoc);
		if(svgobj) {
			svgobj.parentNode.removeChild(svgobj);
		}
	},

	removeSVG: function (/* optional */callbackFunc, thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		if(this.defaultsvg!=undefined) {
			var defCall;
			if(typeof callbackFunc=='function') {
				if(typeof this.defaultCallOnFinish=='function') {
					var defaultCall=this.defaultCallOnFinish;
					defCall=function() {
						try {
							defaultCall();
						} catch(e) {
							// DoNothing(R)
						}
						callbackFunc();
					};
				} else {
					defCall=callbackFunc;
				}
			} else {
				defCall=this.defaultCallOnFinish;
			}
			this.loadSVG(this.defaultid,this.defaultsvg,this.defaultbestScaleW,this.defaultbestScaleH,defCall,this.defaultthedoc);
		} else {
			this.clearSVG(thedoc);
			if(typeof callbackFunc=='function') {
				try {
					callbackFunc();
				} catch(e) {
					// DoNothing(R)
				}
			}
		}
	},

	SVGrescale: function (lenW, /* optional */ lenH, thedoc) {
		if(this.SVGtramp) {
			if(this.SVGtramp.isAutoResizing && this.SVGtramp.isAutoResizing()) {
				if(this.once) {
					this.once=undefined;
					if(this.asEmbed) {
						this.svgobj.style.width  = '100%';
						this.svgobj.style.height = '100%';
					} else {
						this.svgobj.setAttribute("style",this.defaultPreStyle+" width:100%;height:100%;");					
					}
				}
			} else {
				if(thedoc==undefined && this.current instanceof Array)  thedoc=this.current[5];
				if(thedoc==undefined)  thedoc=document;
				
				if(lenW && lenH) {
					this.SVGtramp.setBestScaleFromConstraintDimensions(lenW,lenH);
				}
				
				if(this.asEmbed) {
					this.svgobj.style.width  = this.SVGtramp.width;
					this.svgobj.style.height = this.SVGtramp.height;
				} else {
					//this.svgobj.setAttribute("style",this.defaultPreStyle+" width:"+this.SVGtramp.width+"; height:"+lenH+";");
					this.svgobj.setAttribute("style",this.defaultPreStyle+" width:"+this.SVGtramp.width+"; height:"+this.SVGtramp.height+";");
				}
			}
		}
	},

	loadSVG: function (nodeid,url,/* optional */ bestScaleW, bestScaleH, callOnFinish, thedoc) {
		this.queue.push(new Array(nodeid,url,bestScaleW, bestScaleH, callOnFinish, thedoc));
		if(!this.loading) {
			this.loading=setTimeout(this.timeoutLoad,163);
		}
	},
	
	loadQueuedSVG: function() {
		// Now it is time to generate a new SVG object
		var nodeid=undefined;
		var url=undefined;
		var bestScaleW=undefined;
		var bestScaleH=undefined;
		var callOnFinish=undefined;
		var thedoc=undefined;
		var load;
		var node;
		if(this.current) {
			load = this.current;
			nodeid=load[0];
			url=load[1];
			bestScaleW=load[2];
			bestScaleH=load[3];
			callOnFinish=load[4];
			thedoc=load[5];
			load=undefined;
		}
		var none=true;
		if(this.noloaded < this.queue.length) {
			load=this.queue[this.noloaded];
			this.noloaded++;
			//if(this.noloaded <= 2 || nodeid!=load[0] || url!=load[1]) {
			if(nodeid!=load[0] || url!=load[1]) {
				var tmpdoc=load[5];
				if(!tmpdoc)  tmpdoc=document;
				node=tmpdoc.getElementById(load[0]);
				if(node) {
					none=false;
					/*
					if(!bestScaleW)  bestScaleW='400pt';
					if(!bestScaleH)  bestScaleH=bestScaleW;
					*/
				}
			}
		} else {
			this.loading=undefined;
			return;
		}
		
		// Call the callback func even when nothing has been loaded...
		if(none) {
			callOnFinish=this.queue[this.noloaded-1][4];
			if(typeof callOnFinish=='function') {
				try {
					callOnFinish();
				} catch(e) {
					// DoNothing(R)
				}
			}
			
			this.loading=setTimeout(this.timeoutLoad,163);
			return;
		}
		
		// Let's create!
		nodeid=load[0];
		url=load[1];
		bestScaleW=load[2];
		bestScaleH=load[3];
		callOnFinish=load[4];
		thedoc=tmpdoc;
		
		// Needed to free resources later, due a Safari bug!
		var oldsvgobj=this.clearSVGInternal(thedoc);
		this.current=load;

		var ahref = thedoc.createElement('a');
		ahref.href=url;
		ahref.target='_blank';
		ahref.innerHTML='Open the graph<br>';
		node.appendChild(ahref);
		this.svglink=ahref;

		var gensvgid = WidgetCommon.getRandomUUID();
		
		var objres = this.svgobj = thedoc.createElement(this.asEmbed?"embed":"object");
		objres.setAttribute('id',gensvgid);
		objres.setAttribute("type","image/svg+xml");
		//objres.setAttribute("style","overflow: hidden; border: 1px dotted #000;width:0;height:0");
		//objres.setAttribute("style","overflow: auto; width:0;height:0;");
		objres.setAttribute("style",this.defaultPreStyle+this.defaultCreateStyle);
		
		var thissvg=this;
		if(BrowserDetect.browser!='Explorer') {
			var finishfunc = function(evt) {
				//((evt.currentTarget)?evt.currentTarget:evt.srcElement).onload=function() {};
				((evt.currentTarget)?evt.currentTarget:evt.srcElement).removeEventListener('load',finishfunc,false);
				// Transferring the trampoline!
				if ('SVGtrampoline' in window && window.SVGtrampoline) {
					thissvg.SVGtramp=window.SVGtrampoline;
					thissvg.once=1;
					window.SVGtrampoline=undefined;
					if(BrowserDetect.browser!='Konqueror') {
						delete window['SVGtrampoline'];
					}
					thissvg.SVGrescale(bestScaleW,bestScaleH);
				}
				try {
					if(typeof callOnFinish=='function') {
						callOnFinish();
					}
				} catch(e) {
					// DoNothing(R)
				}
				thissvg.loading=setTimeout(thissvg.timeoutLoad,163);
			};

			objres.setAttribute("wmode","transparent");
			//objres.onload=finishfunc;
			objres.addEventListener('load',finishfunc,false);
			
			/* Trying to add some error control path, with no success :-(
			objres.addEventListener('error',function(evt) {alert("CUA CUA CUA CUA");},false);
			var fallback=thedoc.createElement('script');
			fallback.type="text/javascript";
			fallback.appendChild(thedoc.createTextNode("<!--\n"+"alert('ALARMA');"+"\n// -->"));
			
			objres.appendChild(fallback);
			*/
			
			/*
			if(BrowserDetect.browser=='Explorer') {
				objres.setAttribute('codebase', 'http://www.adobe.com/svg/viewer/install/');
				objres.setAttribute('classid', 'clsid:78156a80-c6a1-4bbf-8e6a-3cd390eeb4e2');
			}
			*/
			objres.setAttribute("data",url);
		} else {
			objres.setAttribute("pluginspage","http://www.adobe.com/svg/viewer/install/");
			// This line was killing IE and WebKit js
			// objres.innerHTML="This browser is not able to show SVG: <a href='http://getfirefox.com'>http://getfirefox.com</a> is free and does it! If you use Internet Explorer, you can also get a plugin: <a href='http://www.adobe.com/svg/viewer/install/main.html'>http://www.adobe.com/svg/viewer/install/main.html</a>";
			
			objres.setAttribute("src",url);
			var finishfuncIE = function(evt) {
				// Transferring the trampoline!
				clearTimeout(thissvg._svgloadtimer);
				if((objres.readyState=='loaded' || objres.readyState=='complete') && window.SVGtrampoline) {
					thissvg._svgloadtimer=undefined;
					// Transferring the trampoline!
					thissvg.SVGtramp=window.SVGtrampoline;
					thissvg.once=1;
					thissvg.SVGrescale(bestScaleW,bestScaleH);
					window.SVGtrampoline=undefined;
					try {
						if(typeof callOnFinish=='function') {
							callOnFinish();
						}
					} catch(c) {
						// DoNothing(R)
					}
					thissvg.loading=setTimeout(thissvg.timeoutLoad,163);
				} else {
					thissvg._svgloadtimer=setTimeout(finishfuncIE,199);
				}
			};
			//objres.onload=finishfuncIE;

			this._svgloadtimer=setTimeout(finishfuncIE,199);
		}

		// All starts here!
		node.appendChild(objres);
		// And this is needed due a Safari bug! Nuts!
		if(oldsvgobj) {
			oldsvgobj.parentNode.removeChild(oldsvgobj);
		}
	}
}
