/*
	dynamicSVGhandling.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/*
	Class to deal with SVG files generated by INBWorkflowLauncher
	(which have an internal injected trampoline)
*/

function TavernaSVG(/* optional */ nodeid,url,bestScaleW,bestScaleH,thedoc) {
	this._svgloadtimer = undefined;
	this.svgobj = undefined;
	this.asEmbed=undefined;
	this.defaultsvg = undefined;
	this.defaultid = undefined;
	this.defaultbestScaleW = undefined;
	this.defaultbestScaleH = undefined;
	this.defaultthedoc = undefined;
	
	if(nodeid && url) {
		this.defaultid = nodeid;
		this.defaultsvg = url;
		this.defaultbestScaleW = bestScaleW;
		this.defaultbestScaleH = bestScaleH;
		this.defaultthedoc = thedoc;
		
		this.removeSVG();
	}
}

TavernaSVG.prototype = {
	clearSVG: function (/* optional */ thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		if(this.svgobj) {
			if(!thedoc)  thedoc=document;
			// First, kill timer (if any!)
			if(this._svgloadtimer) {
				clearInterval(this._svgloadtimer);
				this._svgloadtimer=undefined;
				if(BrowserDetect.browser!='Explorer') {
					delete window['SVGtrampoline'];
				} else {
					window['SVGtrampoline']=undefined;
				}
			}
			// Second, remove trampoline
			delete this['SVGtramp'];
			// Third, remove previous SVG
			try {
				this.svgobj.parentNode.removeChild(this.svgobj);
			} catch(e) {
				// Be silent about failures!
				//alert('What!?!');
				//alert(e);
			}
			// And any trace!
			this.svgobj=undefined;
			this.asEmbed=undefined;
		}
	},

	removeSVG: function (/* optional */ thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		if(this.defaultsvg) {
			this.loadSVG(this.defaultid,this.defaultsvg,this.defaultbestScaleW,this.defaultbestScaleH,this.defaultthedoc);
		} else {
			this.clearSVG(thedoc);
		}
	},

	SVGrescale: function (lenW, /* optional */ lenH, thedoc) {
		if(this.SVGtramp) {
			if(!thedoc)  thedoc=document;
			
			this.SVGtramp.setBestScaleFromConstraintDimensions(lenW,lenH);
			
			//if(!this.asEmbed) {
			/*
				this.svgobj.style.width  = this.SVGtramp.width;
				this.svgobj.style.height = this.SVGtramp.height;
			} else {
			*/
				this.svgobj.style.width  = this.SVGtramp.width;
				this.svgobj.style.height = this.SVGtramp.height;
			//}
		}
	},

	loadSVG: function (nodeid,url,/* optional */ bestScaleW, bestScaleH, thedoc) {
		if(!thedoc)  thedoc=document;
		this.clearSVG(thedoc);
		
		if(!bestScaleW)  bestScaleW='400pt';
		if(!bestScaleH)  bestScaleH=bestScaleW;
		// Now it is time to generate a new SVG object
		var node=thedoc.getElementById(nodeid);
		var gensvgid;

		if(node) {
			gensvgid = WidgetCommon.getRandomUUID();
			var objres;

			if(BrowserDetect.browser!='Explorer') {
				objres=thedoc.createElement('object');
				objres.setAttribute("type","image/svg+xml");
				objres.setAttribute("wmode","transparent");
				//objres.setAttribute("style","overflow: hidden; border: 1px dotted #000;width:0;height:0");
				if(BrowserDetect.browser!='Konqueror') {
					objres.setAttribute("style","overflow: hidden; width:0;height:0");
				} else {
					objres.setAttribute("style","overflow: auto;");
				}
				objres.setAttribute("data",url);
				objres.id=gensvgid;

				/* This one has been commented out because it was injecting two SVG loads in Firefox!

				var paramres=document.createElement('param');
				paramres.setAttribute("name","src");
				paramres.setAttribute("value",url);
				paramres.setAttribute("wmode","transparent");
				paramres.setAttribute("type","image/svg+xml");

				objres.appendChild(paramres);
				*/
				this.asEmbed=undefined;
			} else {
			
				objres=thedoc.createElement('embed');
				objres.setAttribute("type","image/svg+xml");
				objres.setAttribute("pluginspage","http://www.adobe.com/svg/viewer/install/");
				objres.setAttribute("src",url);
				this.asEmbed=true;
				// This line was killing IE and WebKit js
				// objres.innerHTML="This browser is not able to show SVG: <a href='http://getfirefox.com'>http://getfirefox.com</a> is free and does it! If you use Internet Explorer, you can also get a plugin: <a href='http://www.adobe.com/svg/viewer/install/main.html'>http://www.adobe.com/svg/viewer/install/main.html</a>";
			}
			
			node.appendChild(objres);
			this.svgobj = objres;
		}
		
		var thissvg=this;
		this._svgloadtimer=setInterval(function() {
			// Transferring the trampoline!
			if ('SVGtrampoline' in window && window['SVGtrampoline']) {
				clearInterval(thissvg._svgloadtimer);
				thissvg.SVGtramp=window['SVGtrampoline'];
				if(BrowserDetect.browser!='Explorer') {
					delete window['SVGtrampoline'];
				} else {
					window['SVGtrampoline']=undefined;
				}
				thissvg.SVGrescale(bestScaleW,bestScaleH);
				thissvg._svgloadtimer=undefined;
			}
		},100);
		
		return gensvgid;
	}
}
