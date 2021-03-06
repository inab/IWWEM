/*
	$Id$
	dynamicSVGhandling.js
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

/*
	Class to deal with SVG files generated by INBWorkflowLauncher
	(which have an internal injected trampoline)
*/

function DynamicSVG(nodeid,/* optional */ url,badurl,bestScaleW,bestScaleH,callOnFinish,callOnError,thedoc) {
	if(!url)
		url='SVGholder.svg';
	
	this._svgloadtimer = undefined;
	this.svglink = undefined;
	this.svgobj = undefined;
	this.defaultsvg = undefined;
	this.defaultid = undefined;
	this.defaultbestScaleW = undefined;
	this.defaultbestScaleH = undefined;
	this.defaultCallOnFinish = undefined;
	this.defaultCallOnError = undefined;
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
		clearTimeout(me.loading);
		me.loading=true;
		me.loadQueuedSVG();
	};
	
	this.defaultid = nodeid;
	this.defaultsvg = url;
	if(badurl) {
		this.badurl = badurl;
		this.defaultbestScaleW = bestScaleW;
		this.defaultbestScaleH = bestScaleH;
		this.defaultCallOnFinish = callOnFinish;
		this.defaultCallOnError = callOnError;
		this.defaultthedoc = thedoc;
	}
}

DynamicSVG.prototype = {
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
		if(this.SVGtramp) {
			// First, kill timer (if any!)
			if(this._svgloadtimer) {
				clearTimeout(this._svgloadtimer);
				this._svgloadtimer=undefined;
			}
			this.SVGtramp.clearSVG();
			this.current=undefined;
			this.once=1;
			return undefined;
		} else {
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
		}
	},
	
	clearSVG: function (/* optional */ thedoc) {
		var svgobj=this.clearSVGInternal(thedoc);
		if(svgobj) {
			svgobj.parentNode.removeChild(svgobj);
		}
	},
	
	initSVG: function (/* optional */callbackFunc, thedoc) {
		this.removeSVG(callbackFunc,thedoc);
	},
	
	removeSVG: function (/* optional */callbackFunc, thedoc) {
		if(this.SVGtramp) {
			this.SVGtramp.clearSVG(1);
			if(typeof callbackFunc=='function') {
				try {
					callbackFunc();
				} catch(e) {
					// DoNothing(R)
				}
			}
		} else {
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
			this.loadSVG(this.defaultid,this.defaultsvg,this.defaultbestScaleW,this.defaultbestScaleH,defCall,this.defaultCallOnError,this.defaultthedoc);
		}
	},

	SVGrescale: function (lenW, /* optional */ lenH, thedoc) {
		if(this.SVGtramp) {
			if(this.SVGtramp.isAutoResizing && this.SVGtramp.isAutoResizing()) {
				if(this.once) {
					this.once=undefined;
					// Due ANOTHER WebKit bug, we cannot set width and height to 100%
					// because most of the dynamic elements of the page are hidden :-(
					if(this.asEmbed) {
						this.svgobj.style.width  = '95%';
						this.svgobj.style.height = '95%';
					} else {
						this.svgobj.setAttribute("style",this.defaultPreStyle+" width:95%;height:95%;");
					}
				}
			} else {
				// Ancient code
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
		} else {
			// Think about being autoresizing
			if(this.once) {
				this.once=undefined;
				// Due ANOTHER WebKit bug, we cannot set width and height to 100%
				// because most of the dynamic elements of the page are hidden :-(
				if(this.svgobj) {
					if(this.asEmbed) {
						this.svgobj.style.width  = '95%';
						this.svgobj.style.height = '95%';
					} else {
						this.svgobj.setAttribute("style",this.defaultPreStyle+" width:95%;height:95%;");
					}
				}
			}
		}
	},

	loadSVG: function (nodeid,url,/* optional */ bestScaleW, bestScaleH, callOnFinish, callOnError, thedoc) {
		this.queue.push(new Array(nodeid,url,bestScaleW, bestScaleH, callOnFinish, callOnError, thedoc));
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
		var callOnError=undefined;
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
			callOnError=load[5];
			thedoc=load[6];
			load=undefined;
		}
		var none=true;
		if(this.noloaded < this.queue.length) {
			load=this.queue[this.noloaded];
			this.noloaded++;
			//if(this.noloaded <= 2 || nodeid!=load[0] || url!=load[1]) {
			if(nodeid!=load[0] || url!=load[1]) {
				var tmpdoc=load[6];
				if(!tmpdoc)  tmpdoc=document;
				node=tmpdoc.getElementById(load[0]);
				if(node || this.SVGtramp) {
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
		callOnError=load[5];
		thedoc=tmpdoc;

		if(this.SVGtramp) {
			this.svglink.href=url;
			thissvg=this;
			this.SVGtramp.loadSVG(url,true,false,function() {
				thissvg.once=1;

				if(typeof callOnFinish=='function') {
					try {
						callOnFinish();
					} catch(e) {
						// DoNothing(R)
					}
				}
				thissvg.loading=setTimeout(thissvg.timeoutLoad,163);
			},function() {
				thissvg.once=1;

				if(typeof callOnError=='function') {
					try {
						callOnError();
					} catch(e) {
					// DoNothing(R)
					}
				} else if(typeof callOnFinish=='function') {
					try {
						callOnFinish();
					} catch(e) {
						// DoNothing(R)
					}
				}
				thissvg.loading=setTimeout(thissvg.timeoutLoad,163);
			});
		} else {
			var thissvg=this;
			var HEADrequest=new XMLHttpRequest();
			var HEADrequestonerror=undefined;
			var HEADrequestonload = function() {
				if(HEADrequest) {
					if(HEADrequest.onload) {
						HEADrequest.onload=function() {};
						HEADrequest.onerror=function() {};
					}
					thissvg.rawLoadSVG(load,node,nodeid,url,bestScaleW,bestScaleH,callOnFinish,thedoc);
					HEADrequestonload=undefined;
					HEADrequestonerror=undefined;
					HEADrequest=undefined;
				}
			};

			// HEAD checks are subjected to the same restrictions as GET, POST and PUT requests.
			// So check whether we can apply it!
			var basehref = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
			if(BrowserDetect.browser!='Opera' && ((url.indexOf('http://')!=0 && url.indexOf('https://')!=0 && url.indexOf('ftp://')!=0) || url.indexOf(basehref)==0)) {
				HEADrequestonerror = function() {
					if(HEADrequest) {
						if(typeof callOnError == 'function') {
							try {
								callOnError();
							} catch(e) {
							}
						} else if(thissvg.defaultsvg!=undefined) {
							thissvg.rawLoadSVG(load,node,thissvg.defaultid,thissvg.badurl,thissvg.defaultbestScaleW,thissvg.defaultbestScaleH,callOnFinish,thedoc);
						} else {
							// Error path when there is no error path
							if(typeof callOnFinish=='function') {
								try {
									callOnFinish();
								} catch(e) {
								
								}
							}
						}
						if(HEADrequest.onload) {
							HEADrequest.onload=function() {};
							HEADrequest.onerror=function() {};
							HEADrequest.onreadystatechange=function() {};
						}
						HEADrequestonload=undefined;
						HEADrequestonerror=undefined;
						HEADrequest=undefined;
					}
				};

				var onreadystatechange = function() {
					if(!('readyState' in HEADrequest) || HEADrequest.readyState==4) {
						HEADrequest.onreadystatechange=function() {};
						if(HEADrequest.status==200 || HEADrequest.status==304) {
							HEADrequestonload();
						} else {
							HEADrequestonerror();
						}
						HEADrequest=undefined;
					}
				};

				var dovar=1;
				if(BrowserDetect.browser=='Opera') {
					HEADrequest.onreadystatechange=onreadystatechange;
				} else {
					if(HEADrequest.addEventListener) {
						try {
							HEADrequest.addEventListener('load',HEADrequestonload,false);
							HEADrequest.addEventListener('error',HEADrequestonerror,false);
							dovar=undefined;
						} catch(e) {
							try {
								HEADrequest.onreadystatechange=onreadystatechange;
								dovar=undefined;
							} catch(e) {
								// IgnoreIT!(R)
							}
						}
					}

					if(dovar) {
						if('onload' in HEADrequest) {
							HEADrequest.onload=HEADrequestonload;
							HEADrequest.onerror=HEADrequestonerror;
						}
						HEADrequest.onreadystatechange=onreadystatechange;
					}
				}

				// Now it is time to send the query
				HEADrequest.open('HEAD',url,true);
				HEADrequest.send(null);
			} else {
				HEADrequestonload();
			}
		}
	},
	
	rawLoadSVG: function(load,node,nodeid,url,bestScaleW,bestScaleH,callOnFinish,thedoc) {
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
				//((evt.currentTarget)?evt.currentTarget:evt.srcElement).removeEventListener('load',finishfunc,false);
				objres.removeEventListener('load',finishfunc,false);
				// Transferring the trampoline!
				if ('SVGtrampoline' in window && window.SVGtrampoline) {
					thissvg.SVGtramp=window.SVGtrampoline;
					thissvg.once=1;
					window.SVGtrampoline=undefined;
					if(BrowserDetect.browser!='Konqueror') {
						delete window['SVGtrampoline'];
					}
				}
				thissvg.SVGrescale(bestScaleW,bestScaleH);
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
			
			/*
			if(BrowserDetect.browser=='Opera') {
				objres.onreadystatechange = function(evt) {
					alert('JIODE');
					objres.onreadystatechange = function() {};
					finishfunc(evt);
				};
			} else {
			*/
				objres.addEventListener('load',finishfunc,false);
			/*
			}
			*/
			
			//objres.onreadystatechange=function (evt) { alert('PetaZetaERRC!'); };
			//objres.onabort=function (evt) { alert('PetaZetaERRA!'); };
			//objres.onerror=function (evt) { alert('PetaZetaERRE!'); };
			//objres.onprogress=function (evt) { alert('PetaZetaERRP!'); };

			/*
			var fallback=thedoc.createElement('p');
			fallback.appendChild(thedoc.createTextNode("Mielda Blanca"));

			objres.appendChild(fallback);
			*/
			
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

			thissvg._svgloadtimer=setTimeout(finishfuncIE,199);
		}

		// All starts here!
		if(oldsvgobj) {
			oldsvgobj.style.visibility='hidden';
		}
		node.appendChild(objres);
		/*
		var jaa=setTimeout(function() {
			var fav='';
			for(var facet in objres.contentDocument) {
				try {
					//fav+=facet+':'+objres[facet]+"\n";
					fav+=facet+"\n";
				} catch(e) {
				}
			}
			alert(objres.contentDocument.readyState);
			alert(fav);
			fav='';
			for(var facet in objres) {
				try {
					//fav+=facet+':'+objres[facet]+"\n";
					fav+=facet+"\n";
				} catch(e) {
				}
			}
			alert(fav);
			alert(objres.clientWidth+' '+objres.clientHeight);
			
			clearTimeout(jaa);
			jaa=undefined;
		},5000);
		*/
		// And this is needed due a Webkit bug! Nuts!
		if(oldsvgobj) {
			oldsvgobj.parentNode.removeChild(oldsvgobj);
		}
	}
}
