/*
	$Id$
	SVGtooltip.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/
/*
	Class to create SVG tooltips
	The original code was from carto.net
	Original Credits:
 == Title.js -- Copyright (C) Stefan Goessner ========================
*/
function Title(doc, myMapApp, sz) {
	// Setting up SVGNS to the value associated to the document
	if(doc.documentElement.namespaceURI)
		Title.SVGNS=doc.documentElement.namespaceURI;
	
	this.element = null;  // element to show title of ..
	this.size = sz;      // text size ..
	this.scl = doc.documentElement.currentScale;	  // scaling modified by zooming ..
	this.off = doc.documentElement.currentTranslate; // offset modified by zooming ..
	
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
				var coords = myMapApp.calcCoord(evt,doc.documentElement);
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
		var newscl = evt.target.ownerDocument.documentElement.currentScale;
		
		with(svgTitle) {
			size *= scl/newscl;
			scl = newscl;
			off = evt.target.ownerDocument.documentElement.currentTranslate;

			rec.setAttribute("y", -0.9*size+'px');
			rec.setAttribute("x", -0.25*size+'px');
			rec.setAttribute("height", 1.25*size+'px');
			rec.setAttribute("style", "stroke:black;fill:#edefc2;stroke-width:" + 1/scl +'px;');
			txt.setAttribute("style", "font-family:Arial; font-size:" + size + "px;fill:black;");
		}
	};
	
	this.create(doc);
	this.addEvents(doc.documentElement);
	//doc.documentElement.addEventListener("zoom", zoom, false);
}

Title.SVGNS='http://www.w3.org/2000/svg';

Title.prototype = {
	create: function(doc) {
		this.doc = doc;
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

		doc.documentElement.appendChild(this.grp);
	},
	
	register: function (elem) {
		if (Title.ElementOf(elem) != null)
			elem.addEventListener("mouseover", this.activate, false);
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
