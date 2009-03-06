/*
	$Id$
	SVGtooltip.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
	
	Class to create SVG tooltips.
	The original code was obtained from carto.net
	Original Credits:
 == Title.js -- Copyright (C) Stefan Goessner ========================

	
	This modified file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.

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
function Title(doc, myMapApp, sz) {
	// Setting up SVGNS to the value associated to the document
	if(doc.documentElement.namespaceURI)
		Title.SVGNS=doc.documentElement.namespaceURI;
	var docEl=doc.documentElement;
	
	this.element = null;  // element to show title of ..
	this.size = sz;      // text size ..
	this.doc = doc;
	
	var svgTitle = this;
	
	this.passivate = function (evt) {
		with(svgTitle) {
			if (element != null) {
				grp.setAttribute("visibility", "hidden");
				element.removeEventListener("mouseout", passivate, false);
				element.addEventListener("mouseover", activate, false);
				element = null;
			}
		}
	};
	
	this.activate = function (evt) {
		with(svgTitle) {
			if (element == null) {
				// var coords = myMapApp.calcCoord(evt,docEl);
				var xPos=undefined;
				var yPos=undefined;
				if('pageX' in evt) {
					xPos=evt.pageX;
					yPos=evt.pageY;
				} else if('clientX' in evt) {
					xPos=evt.clientX;
					yPos=evt.clientY;
				} else if('screenX' in evt) {
					xPos=evt.screenX;
					yPos=evt.screenY;
				}
				/*
				try {
					if(evt.pageX) {
						xPos=evt.pageX;
						yPos=evt.pageY;
					} else {
						xPos=evt.clientX;
						yPos=evt.clientY;
					}
				} catch(e) {
					if(evt.clientX) {
						xPos=evt.clientX;
						yPos=evt.clientY;
					}
				}
				*/
				if(typeof xPos != 'number') {
					xPos=0;
				}

				if(typeof yPos != 'number') {
					yPos=0;
				}

				var coords=docEl.createSVGPoint();
				coords.x=xPos;
				coords.y=yPos;
				coords = myMapApp.calcPointCoord(coords,svgTitle.contextElem);
				
				/*
				var  x,y;
				if(evt.pageX) {
					x = (evt.pageX - off.x)/scl +  0.25*size;
					y = (evt.pageY - off.y)/scl - size;
				} else {
					x = (evt.clientX - off.x)/scl +  0.25*size,
					y = (evt.clientY - off.y)/scl - size;
				}
				
				var yRect=parseFloat(rec.getAttribute('height'));
				if(y<yRect)  y=yRect;
				*/
				var x = coords.x+0.25*size;
				var y = coords.y-size;
				
				var evtelement = evt.currentTarget;
				var strtext = Title.TextOf(Title.ElementOf(evtelement)).toString();
				
				element=evtelement;
				strtext=strtext.replace(/.*WORKFLOWINTERNALSOURCE_/,'');
				strtext=strtext.replace(/.*WORKFLOWINTERNALSINK_/,'');

				str.nodeValue=strtext;

				element.removeEventListener("mouseover", activate, false);
				element.addEventListener("mouseout", passivate, false);

				//str.nodeValue=''+x + ' '+y+' trafalgar';
				var twidth=txt.getComputedTextLength();
				if(!twidth)  twidth = txt.getBBox().width;
				var xRect = twidth + 0.5*size;
				//var gWidth=parseFloat(doc.documentElement.getAttribute('width'));
				//if(x+xRect > gWidth) x-=x+xRect-gWidth;
				rec.setAttribute("width", xRect+'px');
				grp.setAttribute("transform", "translate(" + x + " " + y + ")");

				grp.setAttribute("visibility", "visible");
			}
		}
	};

	
	var zoom = function (evt) {
		var newscl = svgTitle.contextElem.currentScale;
		
		with(svgTitle) {
			size *= scl/newscl;
			scl = newscl;
			off = contextElem.currentTranslate;

			rec.setAttribute("y", -0.9*size+'px');
			rec.setAttribute("x", -0.25*size+'px');
			rec.setAttribute("height", 1.25*size+'px');
			rec.setAttribute("style", "stroke:black;fill:#edefc2;stroke-width:" + 1/scl +'px;');
			txt.setAttribute("style", "font-family:Arial; font-size:" + size + "px;fill:black;");
		}
	};
	
	//doc.documentElement.addEventListener("zoom", zoom, false);
}

Title.SVGNS='http://www.w3.org/2000/svg';

Title.prototype = {
	create: function(contextElem) {
		this.contextElem=contextElem;
		doc = this.doc;
		
		if(this.contextElem && this.grp) {
			this.contextElem.removeChild(this.grp);
		}
		this.rec = doc.createElementNS(Title.SVGNS,"rect");
		this.rec.setAttribute("y", -(this.size+5)+'px');
		this.rec.setAttribute("x", -0.25*this.size+'px');
		this.rec.setAttribute("width", this.size+100+'px');
		this.rec.setAttribute("height", this.size+10+'px');
		this.rec.setAttribute("style", "stroke:black;fill:#edefc2;stroke-width:1px;");

		this.str = doc.createTextNode("");

		this.txt = doc.createElementNS(Title.SVGNS,"text");
		this.txt.setAttribute("style", "font-family:Arial; font-size:" + this.size + "px;fill:black;");
		this.txt.appendChild(this.str);

		this.grp = doc.createElementNS(Title.SVGNS,"g");
		this.grp.setAttribute("transform", "translate(0 0)");
		this.grp.setAttribute("visibility", "hidden");
		this.grp.appendChild(this.rec);
		this.grp.appendChild(this.txt);

		contextElem.appendChild(this.grp);
	},
	
	register: function (elem) {
		if (Title.ElementOf(elem) != null)
			elem.addEventListener("mouseover", this.activate, false);
	},
	
	setEvents: function (/* optional */ elem) {
		if(!elem)
			elem=this.doc.documentElement;
		this.scl = elem.currentScale;	  // scaling modified by zooming ..
		this.off = elem.currentTranslate; // offset modified by zooming ..
		this.create(elem);
		this.addEvents(elem);
	},
	
	addEvents: function (elem) {
		var childs = elem.childNodes;

		for (var i=0; i<childs.length; i++)
			if (childs.item(i).nodeType == 1) // element node ..
				this.addEvents(childs.item(i));
		
		var title=Title.ElementOf(elem);
		if(title) {
			title=Title.TextOf(title).toString();
		}
		if (title && title!='scufl_graph'
			&& title.indexOf('cluster_')!=0
			&& title.indexOf('WORKFLOWINTERNALSOURCECONTROL')==-1
			&& title.indexOf('WORKFLOWINTERNALSINKCONTROL')==-1
			)
			elem.addEventListener("mouseover", this.activate, false);
	}
};
	
// --- local helper functions ------------------------
	
Title.ElementOf = function (elem) {
	var childs = elem.childNodes;

	for (var i=0; i<childs.length; i++)
		if (childs.item(i).nodeType == 1 && childs.item(i).nodeName == "title") // title element ..
			return childs.item(i);

	return null;
};

Title.TextOf = function (elem) {
	var childs = elem ? elem.childNodes : null;

	for (var i=0; childs && i<childs.length; i++)
		if (childs.item(i).nodeType == 3) // text node ..
			return childs.item(i).nodeValue;

	return "";
};

// === end ======================================================
