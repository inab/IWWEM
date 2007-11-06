/*
	Class to deal with SVG files generated by INBWorkflowLauncher
	(which have an internal injected trampoline)
*/

function TavernaSVG(/* optional */ nodeid,url,bestScale,thedoc) {
	this._svgloadtimer = undefined;
	this.svgobj = undefined;
	this.defaultsvg = undefined;
	this.defaultid = undefined;
	this.defaultbestScale = undefined;
	this.defaultthedoc = undefined;
	
	if(nodeid && url) {
		this.defaultid = nodeid;
		this.defaultsvg = url;
		this.defaultbestScale = bestScale;
		this.defaultthedoc = thedoc;
		
		this.removeSVG();
	}
}

TavernaSVG.W3CDOM = (document.createElement && document.getElementsByTagName);

TavernaSVG.prototype = {
	clearSVG: function (/* optional */ thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		if(this.svgobj) {
			if(!thedoc)  thedoc=document;
			// First, kill timer (if any!)
			if(this._svgloadtimer) {
				clearInterval(this._svgloadtimer);
				this._svgloadtimer=undefined;
				delete window['SVGtramp'];
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
		}
	},

	removeSVG: function (/* optional */ thedoc) {
		// Before any creation, clear SVG trampoline and SVG object traces!
		this.clearSVG();
		if(this.defaultsvg) {
			this.loadSVG(this.defaultid,this.defaultsvg,this.defaultbestScale,this.defaultthedoc);
		}
	},

	SVGrescale: function (len,/* optional */ thedoc) {
		if('SVGtramp' in this) {
			if(!thedoc)  thedoc=document;
			this.SVGtramp.setBestScaleFromConstraintDimensions(len,len);
        		if (!TavernaSVG.W3CDOM) return;
			
			this.svgobj.style.width  = this.SVGtramp.width;
			this.svgobj.style.height = this.SVGtramp.height;
		}
	},

	loadSVG: function (nodeid,url,/* optional */ bestScale,thedoc) {
		if(!thedoc)  thedoc=document;
		this.clearSVG(thedoc);
		
		if(!bestScale)  bestScale='400pt';
		// Now it is time to generate a new SVG object
		var node=thedoc.getElementById(nodeid);
		var gensvgid;

		if(node) {
			gensvgid = WidgetCommon.getRandomUUID();
			var objres=thedoc.createElement('object');

			objres.setAttribute("type","image/svg+xml");
			objres.setAttribute("wmode","transparent");
			//objres.setAttribute("style","overflow: hidden; border: 1px dotted #000;width:0;height:0");
			objres.setAttribute("style","overflow: hidden; width:0;height:0");
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

			var embedres=thedoc.createElement('embed');
			embedres.setAttribute("src",url);
			embedres.setAttribute("type","image/svg+xml");
			embedres.setAttribute("pluginspage","http://www.adobe.com/svg/viewer/install/");
			embedres.innerHTML="This browser is not able to show SVG: <a href='http://getfirefox.com'>http://getfirefox.com</a> is free and does it! If you use Internet Explorer, you can also get a plugin: <a href='http://www.adobe.com/svg/viewer/install/main.html'>http://www.adobe.com/svg/viewer/install/main.html</a>";
			
			objres.appendChild(embedres);
			
			node.appendChild(objres);
			this.svgobj = objres;
		}
		
		var thissvg=this;
		this._svgloadtimer=setInterval(function() {
			// Transferring the trampoline!
			if ('SVGtramp' in window) {
				clearInterval(thissvg._svgloadtimer);
				thissvg.SVGtramp=window['SVGtramp'];
				delete window['SVGtramp'];
				thissvg.SVGrescale(bestScale);
				thissvg._svgloadtimer=undefined;
			}
		},100);
		
		return gensvgid;
	}
}
