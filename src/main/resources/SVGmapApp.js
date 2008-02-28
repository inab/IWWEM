/* This code is based on two original files */
/**
 * @fileoverview
 * 
 * ECMAScript <a href="http://www.carto.net/papers/svg/resources/helper_functions.html">helper functions</a>, main purpose is to serve in SVG mapping or other SVG based web applications
 *
 * This ECMA script library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library (http://www.carto.net/papers/svg/resources/lesser_gpl.txt); if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * Please report bugs and send improvements to neumann@karto.baug.ethz.ch
 * If you use these scripts, please link to the original (http://www.carto.net/papers/svg/resources/helper_functions.html)
 * somewhere in the source-code-comment or the "about" of your project and give credits, thanks!
 * 
 * See <a href="js_docs_out/overview-summary-helper_functions.js.html">documentation</a>. 
 * 
 * @author Andreas Neumann a.neumann@carto.net
 * @copyright LGPL 2.1 <a href="http://www.gnu.org/copyleft/lesser.txt">Gnu LGPL 2.1</a>
 * @credits Bruce Rindahl, numerous people on svgdevelopers@yahoogroups.com
 */

/*
Scripts for creating SVG apps, converting clientX/Y to viewBox coordinates
and for displaying tooltips

Copyright (C) <2002-2007>  <Andreas Neumann>
Version 1.2.2, 2007-04-03
neumann@karto.baug.ethz.ch
http://www.carto.net/
http://www.carto.net/neumann/

Credits:
* thanks to Kevin Lindsey for his many examples and providing the ViewBox class

----

Documentation: http://www.carto.net/papers/svg/gui/mapApp/

----

current version: 1.2.2

version history:
1.0 (2006-06-01)
initial version
Was programmed earlier, but now documented

1.1 (2006-06-15)
added properties this.innerWidth, this.innerHeight (wrapper around different behaviour of viewers), added method ".adjustViewBox()" to adjust the viewBox to the this.innerWidth and this.innerHeight of the UA's window

1.2 (2006-10-06)
added two new constructor parameter "adjustVBonWindowResize" and "resizeCallbackFunction". If the first parameter is set to true, the viewBox of this mapApp will always adjust itself to the innerWidth and innerHeight of the browser window or frame containing the SVG application
the "resizeCallbackFunction" can be of type "function", later potentially also of type "object". This function is called every time the mapApp was resized (browser/UA window was resized). It isn't called the first time when the mapApp was initialized
added a new way to detect resize events in Firefox which didn't implement the SVGResize event so far
added several arrays to hold GUI references

1.2.1 (2007-01-09)
fixed an issue in the method .updateTooltip() for cases where an element did not have a tooltip text, attribute or an empty string. Now, the tooltip disappears for these elements instead of triggering a javascript error.

1.2.2 (2007-04-03)
improved the navigator detection to correctly handle Webkit/Safari
added this.htmlAreas and this.tables as new arrays to hold GUI component references

-------


This ECMA script library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this library (lesser_gpl.txt); if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

----

original document site: http://www.carto.net/papers/svg/gui/mapApp/
Please contact the author in case you want to use code or ideas commercially.
If you use this code, please include this copyright header, the included full
LGPL 2.1 text and read the terms provided in the LGPL 2.1 license
(http://www.gnu.org/copyleft/lesser.txt)

-------------------------------

Please report bugs and send improvements to neumann@karto.baug.ethz.ch
If you use this code, please link to the original (http://www.carto.net/papers/svg/gui/mapApp/)
somewhere in the source-code-comment or the "about" of your project and give credits, thanks!

*/


//this mapApp object helps to convert clientX/clientY coordinates to the coordinates of the group where the element is within
//normally one can just use .getScreenCTM(), but ASV3 does not implement it, 95% of the code in this function is for ASV3!!!
//credits: Kevin Lindsey for his example at http://www.kevlindev.com/gui/utilities/viewbox/ViewBox.js
function SVGmapApp(/*optional*/thedoc,adjustVBonWindowResize,resizeCallbackFunction) {
	if(!thedoc) thedoc=document;
	this.thedoc=thedoc;
	this.adjustVBonWindowResize = adjustVBonWindowResize;
	this.resizeCallbackFunction = resizeCallbackFunction;
	this.initialized = false;
	if (!thedoc.documentElement.getScreenCTM) {
		//add zoom and pan event event to document element
		//this part is only required for viewers not supporting document.documentElement.getScreenCTM() (e.g. ASV3)
		thedoc.documentElement.addEventListener("SVGScroll",this,false);
		thedoc.documentElement.addEventListener("SVGZoom",this,false);
	}
	//add SVGResize event, note that because FF does not yet support the SVGResize event, there is a workaround
 	try {
  		//browsers with native SVG support
  		top.addEventListener("resize",this,false);
 	} catch(er) {
		//SVG UAs, like Batik and ASV/Iex
		thedoc.documentElement.addEventListener("SVGResize",this,false);
	}
	//determine the browser main version
	this.navigator = "Batik";
	if (window.navigator) {
		if (window.navigator.appName.match(/Adobe/gi)) {
			this.navigator = "Adobe";
		}
		if (window.navigator.appName.match(/Netscape/gi)) {
			this.navigator = "Mozilla";
		}
		if (window.navigator.userAgent) {
			if (window.navigator.userAgent.match(/Opera/gi)) {
				this.navigator = "Opera";
			}
			if (window.navigator.userAgent.match(/AppleWebKit/gi) || window.navigator.userAgent.match(/Safari/gi) ) {
				this.navigator = "Safari";
			}
		}
	}
	//we need to call this once to initialize this.innerWidth/this.innerHeight
	this.resetFactors();
	//per default, tooltips are disabled
	this.tooltipsEnabled = false;
	//create new arrays to hold GUI references
	this.Windows = new Array();
	this.checkBoxes = new Array();
	this.radioButtonGroups = new Array();
	this.tabgroups = new Array();
	this.textboxes = new Array();
	this.buttons = new Array();	
	this.selectionLists = new Array();	
	this.comboboxes = new Array();	
	this.sliders = new Array();
	this.scrollbars = new Array();
	this.colourPickers = new Array();
	this.htmlAreas = new Array();
	this.tables = new Array();
}

//global variables necessary to create elements in these namespaces, do not delete them!!!!

/**
 * This variable is a shortcut to the full URL of the SVG namespace
 * @final
 * @type String
 */
SVGmapApp.svgNS = "http://www.w3.org/2000/svg";

/**
 * This variable is a shortcut to the full URL of the XLink namespace
 * @final
 * @type String
 */
SVGmapApp.xlinkNS = "http://www.w3.org/1999/xlink";

/**
 * This variable is a shortcut to the full URL of the attrib namespace
 * @final
 * @type String
 */
SVGmapApp.cartoNS = "http://www.carto.net/attrib";

/**
 * This variable is a alias to the full URL of the attrib namespace
 * @final
 * @type String
 */
SVGmapApp.attribNS = "http://www.carto.net/attrib";

/**
 * This variable is a alias to the full URL of the Batik extension namespace
 * @final
 * @type String
 */
SVGmapApp.batikNS = "http://xml.apache.org/batik/ext";

SVGmapApp.Helpers = {
	/**
	 * Returns the polar direction from a given vector
	 * @param {Number} xdiff	the x-part of the vector
	 * @param {Number} ydiff	the y-part of the vector
	 * @return direction		the direction in radians
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #toPolarDist
	 * @see #toRectX
	 * @see #toRectY
	 */
	toPolarDir: function (xdiff,ydiff) {
		var direction = (Math.atan2(ydiff,xdiff));
		return(direction);
	},

	/**
	 * Returns the polar distance from a given vector
	 * @param {Number} xdiff	the x-part of the vector
	 * @param {Number} ydiff	the y-part of the vector
	 * @return distance			the distance
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #toPolarDir
	 * @see #toRectX
	 * @see #toRectY
	 */
	toPolarDist: function (xdiff,ydiff) {
		var distance = Math.sqrt(xdiff * xdiff + ydiff * ydiff);
		return(distance);
	},
	
	/**
	 * Returns the x-part of a vector from a given direction and distance
	 * @param {Number} direction	the direction (in radians)
	 * @param {Number} distance		the distance
	 * @return x					the x-part of the vector
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #toPolarDist
	 * @see #toPolarDir
	 * @see #toRectY
	 */
	toRectX: function (direction,distance) {
		var x = distance * Math.cos(direction);
		return(x);
	},
	
	/**
	 * Returns the y-part of the vector from a given direction and distance
	 * @param {Number} direction	the direction (in radians)
	 * @param {Number} distance		the distance
	 * @return y					the y-part of the vector
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #toPolarDist
	 * @see #toPolarDir
	 * @see #toRectX
	 */
	toRectY: function (direction,distance) {
		y = distance * Math.sin(direction);
		return(y);
	},
	
	/**
	 * Converts degrees to radians
	 * @param {Number} deg	the degree value
	 * @return rad			the radians value
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #RadToDeg
	 */
	DegToRad: function (deg) {
		return (deg / 180.0 * Math.PI);
	},
	
	/**
	 * Converts radians to degrees
	 * @param {Number} rad	the radians value
	 * @return deg			the degree value
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #DegToRad
	 */
	RadToDeg: function (rad) {
		return (rad / Math.PI * 180.0);
	},
	
	/**
	 * Converts decimal degrees to degrees, minutes, seconds
	 * @param {Number} dd	the decimal degree value
	 * @return degrees		the degree values in the following notation: {deg:degrees,min:minutes,sec:seconds}
	 * @type literal
	 * @version 1.0 (2007-04-30)
	 * @see #dms2dd
	 */
	dd2dms: function(dd) {
        	var minutes = (Math.abs(dd) - Math.floor(Math.abs(dd))) * 60;
        	var seconds = (minutes - Math.floor(minutes)) * 60;
        	var minutes = Math.floor(minutes);
        	if (dd >= 0) {
        	    var degrees = Math.floor(dd);
        	}
        	else {
        	    var degrees = Math.ceil(dd);       
        	}
        	return {deg:degrees,min:minutes,sec:seconds};
	},
	
	/**
	 * Converts degrees, minutes and seconds to decimal degrees
	 * @param {Number} deg	the degree value
	 * @param {Number} min	the minute value
	 * @param {Number} sec	the second value
	 * @return deg			the decimal degree values
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @see #dd2dms
	 */
	dms2dd: function (deg,min,sec) {
		if (deg < 0) {
			return deg - (min / 60) - (sec / 3600);
		}
		else {
			return deg + (min / 60) + (sec / 3600);
		}
	},

	/**
	 * log function, missing in the standard Math object
	 * @param {Number} x	the value where the log function should be applied to
	 * @param {Number} b	the base value for the log function
	 * @return logResult	the result of the log function
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 */
	log: function (x,b) {
		if(b==null) b=Math.E;
		return Math.log(x)/Math.log(b);
	},

	/**
	 * interpolates a value (e.g. elevation) bilinearly based on the position within a cell with 4 corner values
	 * @param {Number} za		the value at the upper left corner of the cell
	 * @param {Number} zb		the value at the upper right corner of the cell
	 * @param {Number} zc		the value at the lower right corner of the cell
	 * @param {Number} zd		the value at the lower left corner of the cell
	 * @param {Number} xpos		the x position of the point where a new value should be interpolated
	 * @param {Number} ypos		the y position of the point where a new value should be interpolated
	 * @param {Number} ax		the x position of the lower left corner of the cell
	 * @param {Number} ay		the y position of the lower left corner of the cell
	 * @param {Number} cellsize	the size of the cell
	 * @return interpol_value	the result of the bilinear interpolation function
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 */
	intBilinear: function (za,zb,zc,zd,xpos,ypos,ax,ay,cellsize) { //bilinear interpolation function
		var e = (xpos - ax) / cellsize;
		var f = (ypos - ay) / cellsize;

		//calculation of weights
		var wa = (1 - e) * (1 - f);
		var wb = e * (1 - f);
		var wc = e * f;
		var wd = f * (1 - e);

		var interpol_value = wa * zc + wb * zd + wc * za + wd * zb;
		return interpol_value;	
	},

	/**
	 * tests if a given point is left or right of a given line
	 * @param {Number} pointx		the x position of the given point
	 * @param {Number} pointy		the y position of the given point
	 * @param {Number} linex1		the x position of line's start point
	 * @param {Number} liney1		the y position of line's start point
	 * @param {Number} linex2		the x position of line's end point
	 * @param {Number} liney2		the y position of line's end point
	 * @return leftof				the result of the leftOfTest, 1 means leftOf, 0 means rightOf
	 * @type Number (integer, 0|1)
	 * @version 1.0 (2007-04-30)
	 */
	leftOfTest: function (pointx,pointy,linex1,liney1,linex2,liney2) {
		var result = (liney1 - pointy) * (linex2 - linex1) - (linex1 - pointx) * (liney2 - liney1);
		if (result < 0) {
			var leftof = 1; //case left of
		}
		else {
			var leftof = 0; //case left of	
		}
		return leftof;
	},

	/**
	 * calculates the distance between a given point and a given line
	 * @param {Number} pointx		the x position of the given point
	 * @param {Number} pointy		the y position of the given point
	 * @param {Number} linex1		the x position of line's start point
	 * @param {Number} liney1		the y position of line's start point
	 * @param {Number} linex2		the x position of line's end point
	 * @param {Number} liney2		the y position of line's end point
	 * @return distance				the result of the leftOfTest, 1 means leftOf, 0 means rightOf
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 */
	distFromLine: function (xpoint,ypoint,linex1,liney1,linex2,liney2) {
		var dx = linex2 - linex1;
		var dy = liney2 - liney1;
		var distance = (dy * (xpoint - linex1) - dx * (ypoint - liney1)) / Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));
		return distance;
	},

	/**
	 * calculates the angle between two vectors (lines)
	 * @param {Number} ax		the x part of vector a
	 * @param {Number} ay		the y part of vector a
	 * @param {Number} bx		the x part of vector b
	 * @param {Number} by		the y part of vector b
	 * @return angle			the angle in radians
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @credits <a href="http://www.mathe-online.at/mathint/vect2/i.html#Winkel">Mathe Online (Winkel)</a>
	 */
	angleBetwTwoLines: function (ax,ay,bx,by) {
		var angle = Math.acos((ax * bx + ay * by) / (Math.sqrt(Math.pow(ax,2) + Math.pow(ay,2)) * Math.sqrt(Math.pow(bx,2) + Math.pow(by,2))));
		return angle;
	},

	/**
	 * calculates the bisector vector for two given vectors
	 * @param {Number} ax		the x part of vector a
	 * @param {Number} ay		the y part of vector a
	 * @param {Number} bx		the x part of vector b
	 * @param {Number} by		the y part of vector b
	 * @return c				the resulting vector as an Array, c[0] is the x part of the vector, c[1] is the y part
	 * @type Array
	 * @version 1.0 (2007-04-30)
	 * @credits <a href="http://www.mathe-online.at/mathint/vect1/i.html#Winkelsymmetrale">Mathe Online (Winkelsymmetrale)</a>
	 * see #calcBisectorAngle
	 *  */
	calcBisectorVector: function (ax,ay,bx,by) {
		var betraga = Math.sqrt(Math.pow(ax,2) + Math.pow(ay,2));
		var betragb = Math.sqrt(Math.pow(bx,2) + Math.pow(by,2));
		var c = new Array();
		c[0] = ax / betraga + bx / betragb;
		c[1] = ay / betraga + by / betragb;
		return c;
	},

	/**
	 * calculates the bisector angle for two given vectors
	 * @param {Number} ax		the x part of vector a
	 * @param {Number} ay		the y part of vector a
	 * @param {Number} bx		the x part of vector b
	 * @param {Number} by		the y part of vector b
	 * @return angle			the bisector angle in radians
	 * @type Number
	 * @version 1.0 (2007-04-30)
	 * @credits <a href="http://www.mathe-online.at/mathint/vect1/i.html#Winkelsymmetrale">Mathe Online (Winkelsymmetrale)</a>
	 * see #calcBisectorVector
	 * */
	calcBisectorAngle: function (ax,ay,bx,by) {
		var betraga = Math.sqrt(Math.pow(ax,2) + Math.pow(ay,2));
		var betragb = Math.sqrt(Math.pow(bx,2) + Math.pow(by,2));
		var c1 = ax / betraga + bx / betragb;
		var c2 = ay / betraga + by / betragb;
		var angle = SVGmapApp.Helpers.toPolarDir(c1,c2);
		return angle;
	},

	/**
	 * calculates the intersection point of two given lines
	 * @param {Number} line1x1	the x the start point of line 1
	 * @param {Number} line1y1	the y the start point of line 1
	 * @param {Number} line1x2	the x the end point of line 1
	 * @param {Number} line1y2	the y the end point of line 1
	 * @return interSectPoint	the intersection point, interSectPoint.x contains x-part, interSectPoint.y the y-part of the resulting coordinate
	 * @type Object
	 * @version 1.0 (2007-04-30)
	 * @credits <a href="http://astronomy.swin.edu.au/~pbourke/geometry/lineline2d/">P. Bourke</a>
	 */
	intersect2lines: function (line1x1,line1y1,line1x2,line1y2,line2x1,line2y1,line2x2,line2y2) {
		var interSectPoint = new Object();
		var denominator = (line2y2 - line2y1)*(line1x2 - line1x1) - (line2x2 - line2x1)*(line1y2 - line1y1);
		if (denominator == 0) {
			alert("lines are parallel");
		} else {
			var ua = ((line2x2 - line2x1)*(line1y1 - line2y1) - (line2y2 - line2y1)*(line1x1 - line2x1)) / denominator;
			var ub = ((line1x2 - line1x1)*(line1y1 - line2y1) - (line1y2 - line1y1)*(line1x1 - line2x1)) / denominator;
		}
		interSectPoint["x"] = line1x1 + ua * (line1x2 - line1x1);
		interSectPoint["y"] = line1y1 + ua * (line1y2 - line1y1);
		return interSectPoint;
	},

	/**
	 * reformats a given number to a string by adding separators at every third digit
	 * @param {String|Number} inputNumber	the input number, can be of type number or string
	 * @param {String} separator			the separator, e.g. ' or ,
	 * @return newString					the intersection point, interSectPoint.x contains x-part, interSectPoint.y the y-part of the resulting coordinate
	 * @type String
	 * @version 1.0 (2007-04-30)
	 */
	formatNumberString: function (inputNumber,separator) {
		//check if of type string, if number, convert it to string
		if (typeof(inputNumber) == "Number") {
			var myTempString = inputNumber.toString();
		} else {
			var myTempString = inputNumber;
		}
		var newString="";
		//if it contains a comma, it will be split
		var splitResults = myTempString.split(".");
		var myCounter = splitResults[0].length;
		if (myCounter > 3) {
			while(myCounter > 0) {
				if (myCounter > 3) {
					newString = separator + splitResults[0].substr(myCounter - 3,3) + newString;
				} else {
					newString = splitResults[0].substr(0,myCounter) + newString;
				}
				myCounter -= 3;
			}
		} else {
			newString = splitResults[0];
		}
		//concatenate if it contains a comma
		if (splitResults[1]) {
			newString = newString + "." + splitResults[1];
		}
		return newString;
	},

	/**
	 * writes a status text message out to a SVG text element's first child
	 * @param {String} statusText	the text message to be displayed
	 * @version 1.0 (2007-04-30)
	 */
	statusChange: function (statusText,/*optional*/thedoc) {
		if(!thedoc)  thedoc=document;
		thedoc.getElementById("statusText").firstChild.nodeValue = "Statusbar: " + statusText;
	},

	/**
	 * scales an SVG element, requires that the element has an x and y attribute (e.g. circle, ellipse, use element, etc.)
	 * @param {dom::Event} evt		the evt object that triggered the scaling
	 * @param {Number} factor	the scaling factor
	 * @version 1.0 (2007-04-30)
	 */
	scaleObject: function (evt,factor) {
		//reference to the currently selected object
		var element = evt.currentTarget;
		var myX = element.getAttributeNS(null,"x");
		var myY = element.getAttributeNS(null,"y");
		var newtransform = "scale(" + factor + ") translate(" + (myX * 1 / factor - myX) + " " + (myY * 1 / factor - myY) +")";
		element.setAttributeNS(null,'transform', newtransform);
	},

	/**
	 * returns the transformation matrix (ctm) for the given node up to the root element
	 * the basic use case is to provide a wrapper function for the missing SVGLocatable.getTransformToElement method (missing in ASV3)
	 * @param {svg::SVGTransformable} node		the node reference for the SVGElement the ctm is queried
	 * @return CTM								the current transformation matrix from the given node to the root element
	 * @type svg::SVGMatrix
	 * @version 1.0 (2007-05-01)
	 * @credits <a href="http://www.kevlindev.com/tutorials/basics/transformations/toUserSpace/index.htm">Kevin Lindsey (toUserSpace)</a>
	 * @see #getTransformToElement
	 */
	getTransformToRootElement: function (node,/*optional*/thedoc) {
		if(!thedoc)  thedoc=document;
		try {
			//this part is for fully conformant players (like Opera, Batik, Firefox, Safari ...)
			var CTM = node.getTransformToElement(thedoc.documentElement);
		} catch (ex) {
			//this part is for ASV3 or other non-conformant players
			// Initialize our CTM the node's Current Transformation Matrix
			var CTM = node.getCTM();
			// Work our way through the ancestor nodes stopping at the SVG Document
			while ( ( node = node.parentNode ) != thedoc ) {
				// Multiply the new CTM to the one with what we have accumulated so far
				CTM = node.getCTM().multiply(CTM);
			}
		}
		return CTM;
	},

	/**
	 * returns the transformation matrix (ctm) for the given dom::Node up to a different dom::Node
	 * the basic use case is to provide a wrapper function for the missing SVGLocatable.getTransformToElement method (missing in ASV3)
	 * @param {svg::SVGTransformable} node			the node reference for the element the where the ctm should be calculated from
	 * @param {svg::SVGTransformable} targetNode	the target node reference for the element the ctm should be calculated to
	 * @return CTM									the current transformation matrix from the given node to the target element
	 * @type svg::SVGMatrix
	 * @version 1.0 (2007-05-01)
	 * @credits <a href="http://www.kevlindev.com/tutorials/basics/transformations/toUserSpace/index.htm">Kevin Lindsey (toUserSpace)</a>
	 * @see #getTransformToRootElement
	 */
	getTransformToElement: function (node,targetNode) {
	    try {
        	//this part is for fully conformant players
        	var CTM = node.getTransformToElement(targetNode);
	    }
	    catch (ex) {
  			//this part is for ASV3 or other non-conformant players
			// Initialize our CTM the node's Current Transformation Matrix
			var CTM = node.getCTM();
			// Work our way through the ancestor nodes stopping at the SVG Document
			while ( ( node = node.parentNode ) != targetNode ) {
				// Multiply the new CTM to the one with what we have accumulated so far
				CTM = node.getCTM().multiply(CTM);
			}
	    }
	    return CTM;
	},
	
	/**
	 * converts HSV to RGB values
	 * @param {Number} hue		the hue value (between 0 and 360)
	 * @param {Number} sat		the saturation value (between 0 and 1)
	 * @param {Number} val		the value value (between 0 and 1)
	 * @return rgbArr			the rgb values (associative array or object, the keys are: red,green,blue), all values are scaled between 0 and 255
	 * @type Object
	 * @version 1.0 (2007-05-01)
	 * @see #rgb2hsv
	 */
	hsv2rgb: function (hue,sat,val) {
		var rgbArr = new Object();
		if ( sat == 0) {
			rgbArr["red"] = Math.round(val * 255);
			rgbArr["green"] = Math.round(val * 255);
			rgbArr["blue"] = Math.round(val * 255);
		} else {
			var h = hue / 60;
			var i = Math.floor(h);
			var f = h - i;
			if (i % 2 == 0) {
				f = 1 - f;
			}
			var m = val * (1 - sat); 
			var n = val * (1 - sat * f);
			switch(i) {
				case 0:
					rgbArr["red"] = val;
					rgbArr["green"] = n;
					rgbArr["blue"] = m;
					break;
				case 1:
					rgbArr["red"] = n;
					rgbArr["green"] = val;
					rgbArr["blue"] = m;
					break;
				case 2:
					rgbArr["red"] = m;
					rgbArr["green"] = val;
					rgbArr["blue"] = n;
					break;
				case 3:
					rgbArr["red"] = m;
					rgbArr["green"] = n;
					rgbArr["blue"] = val;
					break;
				case 4:
					rgbArr["red"] = n;
					rgbArr["green"] = m;
					rgbArr["blue"] = val;
					break;
				case 5:
					rgbArr["red"] = val;
					rgbArr["green"] = m;
					rgbArr["blue"] = n;
					break;
				case 6:
					rgbArr["red"] = val;
					rgbArr["green"] = n;
					rgbArr["blue"] = m;
					break;
			}
			rgbArr["red"] = Math.round(rgbArr["red"] * 255);
			rgbArr["green"] = Math.round(rgbArr["green"] * 255);
			rgbArr["blue"] = Math.round(rgbArr["blue"] * 255);
		}
		return rgbArr;
	},

	/**
	 * converts RGB to HSV values
	 * @param {Number} red		the hue value (between 0 and 255)
	 * @param {Number} green	the saturation value (between 0 and 255)
	 * @param {Number} blue		the value value (between 0 and 255)
	 * @return hsvArr			the hsv values (associative array or object, the keys are: hue (0-360),sat (0-1),val (0-1))
	 * @type Object
	 * @version 1.0 (2007-05-01)
	 * @see #hsv2rgb
	 */
	rgb2hsv: function (red,green,blue) {
		var hsvArr = new Object();
		red = red / 255;
		green = green / 255;
		blue = blue / 255;
		myMax = Math.max(red, Math.max(green,blue));
		myMin = Math.min(red, Math.min(green,blue));
		v = myMax;
		if (myMax > 0) {
			s = (myMax - myMin) / myMax;
		} else {
			s = 0;
		}
		if (s > 0) {
			myDiff = myMax - myMin;
			rc = (myMax - red) / myDiff;
			gc = (myMax - green) / myDiff;
			bc = (myMax - blue) / myDiff;
			if (red == myMax) {
				h = (bc - gc) / 6;
			}
			if (green == myMax) {
				h = (2 + rc - bc) / 6;
			}
			if (blue == myMax) {
				h = (4 + gc - rc) / 6;
			}
		} else {
			h = 0;
		}
		
		if (h < 0) {
			h += 1;
		}
		hsvArr["hue"] = Math.round(h * 360);
		hsvArr["sat"] = s;
		hsvArr["val"] = v;
		return hsvArr;
	},

	/**
	 * populates an array such that it can be addressed by both a key or an index nr,
	 * note that both Arrays need to be of the same length
	 * @param {Array} arrayKeys		the array containing the keys
	 * @param {Array} arrayValues	the array containing the values
	 * @return returnArray			the resulting array containing both associative values and also a regular indexed array
	 * @type Array
	 * @version 1.0 (2007-05-01)
	 */
	arrayPopulate: function (arrayKeys,arrayValues) {
		var returnArray = new Array();
		if (arrayKeys.length != arrayValues.length) {
			alert("error: arrays do not have the same length!");
		} else {
			for (i=0;i<arrayKeys.length;i++) {
				returnArray[arrayKeys[i]] = arrayValues[i];
			}
		}
		return returnArray;
	},
	
	/**
	 * Starts a SMIL animation element with the given id by triggering the '.beginElement()' method. 
	 * This is a convenience (shortcut) function. 
	 * @param {String} id		a valid id of a valid SMIL animation element
	 * @version 1.0 (2007-05-01)
	 */
	//starts an animtion with the given id
	//this function is useful in combination with window.setTimeout()
	startAnimation: function (id,/*optional*/ thedoc) {
		if(!thedoc)  thedoc=document;
		thedoc.getElementById(id).beginElement();
	}
};

/**
 * Wrapper object for network requests, uses getURL or XMLHttpRequest depending on availability
 * The callBackFunction receives a XML or text node representing the rootElement
 * of the fragment received or the return text, depending on the returnFormat. 
 * See also the following <a href="http://www.carto.net/papers/svg/network_requests/">documentation</a>.
 * @class this is a wrapper object to provide network request functionality (get|post)
 * @param {String} url												the URL/IRI of the network resource to be called
 * @param {Function|Object} callBackFunction						the callBack function or object that is called after the data was received, in case of an object, the method 'receiveData' is called; both the function and the object's 'receiveData' method get 2 return parameters: 'node.firstChild'|text (the root element of the XML or text resource), this.additionalParams (if defined) 
 * @param {String} returnFormat										the return format, either 'xml' or 'json' (or text)
 * @param {String} method											the method of the network request, either 'get' or 'post'
 * @param {String|Undefined} postText								the String containing the post text (optional) or Undefined (if not a 'post' request)
 * @param {Object|Array|String|Number|Undefined} additionalParams	additional parameters that will be passed to the callBackFunction or object (optional) or Undefined
 * @return a new getData instance
 * @type getData
 * @constructor
 * @version 1.0 (2007-02-23)
 */
SVGmapApp.GetData = function (url,callBackFunction,returnFormat,method,postText,additionalParams) {
	this.url = url;
	this.callBackFunction = callBackFunction;
	this.returnFormat = returnFormat;
	this.method = method;
	this.additionalParams = additionalParams;
	if (method != "get" && method != "post") {
		alert("Error in network request: parameter 'method' must be 'get' or 'post'");
	}
	this.postText = postText;
	this.xmlRequest = null; //@private reference to the XMLHttpRequest object
};

SVGmapApp.GetData.prototype = {
	/**
	 * triggers the network request defined in the constructor
	 */
	getData: function(/*optional*/thedoc) {
		//call getURL() if available
		if(!thedoc)  thedoc=document;
		this.thedoc=thedoc;
		if (window.getURL) {
			if (this.method == "get") {
				getURL(this.url,this);
			}
			if (this.method == "post") {
				postURL(this.url,this.postText,this);
			}
		} else if (window.XMLHttpRequest) {
		//or call XMLHttpRequest() if available
			var _this = this;
			this.xmlRequest = new XMLHttpRequest();
			if (this.method == "get") {
				if (this.returnFormat == "xml") {
					this.xmlRequest.overrideMimeType("text/xml");
				}
				this.xmlRequest.open("GET",this.url,true);
			}
			if (this.method == "post") {
				this.xmlRequest.open("POST",this.url,true);
			}
			this.xmlRequest.onreadystatechange = function() {_this.handleEvent()};
			if (this.method == "get") {
				this.xmlRequest.send(null);
			}
			if (this.method == "post") {
				//test if postText exists and is of type string
				var reallyPost = true;
				if (!this.postText) {
					reallyPost = false;
					alert("Error in network post request: missing parameter 'postText'!");
				}
				if (typeof(this.postText) != "string") {
					reallyPost = false;
					alert("Error in network post request: parameter 'postText' has to be of type 'string')");
				}
				if (reallyPost) {
					this.xmlRequest.send(this.postText);
				}
			}
		} else {
		//write an error message if neither method is available
			alert("your browser/svg viewer neither supports window.getURL nor window.XMLHttpRequest!");
		}	
	},

	/**
	 * this is the callback method for the getURL() or postURL() case
	 * @private
	 */
	operationComplete: function(data) {
		//check if data has a success property
		if (data.success) {
			//parse content of the XML format to the variable "node"
			if (this.returnFormat == "xml") {
				//convert the text information to an XML node and get the first child
				var node = parseXML(data.content,this.thedoc);
				//distinguish between a callback function and an object
				if (typeof(this.callBackFunction) == "function") {
					this.callBackFunction(node.firstChild,this.additionalParams);
				}
				if (typeof(this.callBackFunction) == "object") {
					this.callBackFunction.receiveData(node.firstChild,this.additionalParams);
				}
			}
			if (this.returnFormat == "json") {
				if (typeof(this.callBackFunction) == "function") {
					this.callBackFunction(data.content,this.additionalParams);
				}
				if (typeof(this.callBackFunction) == "object") {
					this.callBackFunction.receiveData(data.content,this.additionalParams);
				}			
			}
		}
		else {
			alert("something went wrong with dynamic loading of geometry!");
		}
	},

	/**
	 * this is the callback method for the XMLHttpRequest case
	 * @private
	 */
	handleEvent: function() {
		if (this.xmlRequest.readyState == 4) {
			if (this.returnFormat == "xml") {
				//we need to import the XML node first
				var importedNode = this.thedoc.importNode(this.xmlRequest.responseXML.documentElement,true);
				if (typeof(this.callBackFunction) == "function") {
					this.callBackFunction(importedNode,this.additionalParams);
				}
				if (typeof(this.callBackFunction) == "object") {
					this.callBackFunction.receiveData(importedNode,this.additionalParams);
				}			
			}
			if (this.returnFormat == "json") {
				if (typeof(this.callBackFunction) == "function") {
					this.callBackFunction(this.xmlRequest.responseText,this.additionalParams);
				}
				if (typeof(this.callBackFunction) == "object") {
					this.callBackFunction.receiveData(this.xmlRequest.responseText,this.additionalParams);
				}			
			}		
		}	
	}
};

/*************************************************************************/

/*****
*
*   ViewBox.js
*
*   copyright 2002, Kevin Lindsey
*
*****/

/*****
*
*   constructor
*
*****/
SVGmapApp.ViewBox = function (svgNode,/*optional*/ thedoc) {
	if(!thedoc)  thedoc=document;
	this.thedoc=thedoc;
	if ( arguments.length > 0 ) {
		this.init(svgNode);
	}
};

SVGmapApp.ViewBox.VERSION = "1.0";

SVGmapApp.ViewBox.prototype = {
	/*****
	*
	*   init
	*
	*****/
	init: function(svgNode) {
		var viewBox = svgNode.getAttributeNS(null, "viewBox");
		var preserveAspectRatio = svgNode.getAttributeNS(null, "preserveAspectRatio");

		if ( viewBox != "" ) {
			var params = viewBox.split(/\s*,\s*|\s+/);

			this.x      = parseFloat( params[0] );
			this.y      = parseFloat( params[1] );
			this.width  = parseFloat( params[2] );
			this.height = parseFloat( params[3] );
		} else {
			this.x      = 0;
			this.y      = 0;
			this.width  = innerWidth;
			this.height = innerHeight;
		}

		this.setPAR(preserveAspectRatio);
		var dummy = this.getTM(); //to initialize this.windowWidth/this.windowHeight
	},


	/*****
	*
	*   getTM
	*
	*****/
	getTM: function() {
		var svgRoot      = this.thedoc.documentElement;
		var matrix       = svgRoot.createSVGMatrix();
		//case width/height contains percent
		this.windowWidth = svgRoot.getAttributeNS(null,"width");
		if (this.windowWidth.match(/%/) || this.windowWidth == null) {
			if (this.windowWidth == null) {
				if (top.innerWidth) {
					this.windowWidth = top.innerWidth;
				} else {
					this.windowWidth = svgRoot.viewport.width;
				}
			} else {
				var factor = parseFloat(this.windowWidth.replace(/%/,""))/100;
				if (top.innerWidth) {
					this.windowWidth = top.innerWidth * factor;
				} else {
					this.windowWidth = svgRoot.viewport.width * factor;
				}
			}
		} else {
			this.windowWidth = parseFloat(this.windowWidth);
		}
		this.windowHeight = svgRoot.getAttributeNS(null,"height");
		if (this.windowHeight.match(/%/) || this.windowHeight == null) {
			if (this.windowHeight == null) {
				if (top.innerHeight) {
					this.windowHeight = top.innerHeight;
				} else {
					this.windowHeight = svgRoot.viewport.height;
				}
			} else {
				var factor = parseFloat(this.windowHeight.replace(/%/,""))/100;
				if (top.innerHeight) {
					this.windowHeight = top.innerHeight * factor;
				} else {
					this.windowHeight = svgRoot.viewport.height * factor;
				}
			}
		} else {
			this.windowHeight = parseFloat(this.windowHeight);
		}
		var x_ratio = this.width  / this.windowWidth;
		var y_ratio = this.height / this.windowHeight;

		matrix = matrix.translate(this.x, this.y);
		if ( this.alignX == "none" ) {
			matrix = matrix.scaleNonUniform( x_ratio, y_ratio );
		} else {
			if (
				x_ratio < y_ratio &&
				this.meetOrSlice == "meet" ||
				x_ratio > y_ratio &&
				this.meetOrSlice == "slice"
			) {
				var x_trans = 0;
				var x_diff  = this.windowWidth*y_ratio - this.width;

				if ( this.alignX == "Mid" )
					x_trans = -x_diff/2;
				else if ( this.alignX == "Max" )
					x_trans = -x_diff;

				matrix = matrix.translate(x_trans, 0);
				matrix = matrix.scale( y_ratio );
			} else if (
				x_ratio > y_ratio &&
				this.meetOrSlice == "meet" ||
				x_ratio < y_ratio &&
				this.meetOrSlice == "slice"
			) {
				var y_trans = 0;
				var y_diff  = this.windowHeight*x_ratio - this.height;

				if ( this.alignY == "Mid" )
					y_trans = -y_diff/2;
				else if ( this.alignY == "Max" )
					y_trans = -y_diff;

				matrix = matrix.translate(0, y_trans);
				matrix = matrix.scale( x_ratio );
			} else {
				// x_ratio == y_ratio so, there is no need to translate
				// We can scale by either value
				matrix = matrix.scale( x_ratio );
			}
		}

		return matrix;
	},


	/*****
	*
	*   get/set methods
	*
	*****/

	/*****
	*
	*   setPAR
	*
	*****/
	setPAR: function(PAR) {
		// NOTE: This function needs to use default values when encountering
		// unrecognized values
		if ( PAR ) {
			var params = PAR.split(/\s+/);
			var align  = params[0];

			if ( align == "none" ) {
				this.alignX = "none";
				this.alignY = "none";
			} else {
				this.alignX = align.substring(1,4);
				this.alignY = align.substring(5,9);
			}

			if ( params.length == 2 ) {
				this.meetOrSlice = params[1];
			} else {
				this.meetOrSlice = "meet";
			}
		} else {
			this.align  = "xMidYMid";
			this.alignX = "Mid";
			this.alignY = "Mid";
			this.meetOrSlice = "meet";
		}
	}
};

SVGmapApp.prototype = {
	handleEvent: function(evt) {
		if (evt.type == "SVGResize" || evt.type == "resize" || evt.type == "SVGScroll" || evt.type == "SVGZoom") {
			this.resetFactors();
		}
		if ((evt.type == "mouseover" || evt.type == "mouseout" || evt.type == "mousemove") && this.tooltipsEnabled) {
			this.displayTooltip(evt);
		}
	},

	resetFactors: function() {
		//set inner width and height
		if (top.innerWidth) {
			this.innerWidth = top.innerWidth;
			this.innerHeight = top.innerHeight;
		} else {
			var viewPort = this.thedoc.documentElement.viewport;
			this.innerWidth = viewPort.width;
			this.innerHeight = viewPort.height;
		}
		if (this.adjustVBonWindowResize) {
			this.adjustViewBox();
		}
		//this code is for ASV3
		if (!this.thedoc.documentElement.getScreenCTM) {
			var svgroot = this.thedoc.documentElement;
			this.viewBox = new SVGmapApp.ViewBox(svgroot);
			var trans = svgroot.currentTranslate;
			var scale = svgroot.currentScale;
			this.m = this.viewBox.getTM();
			//undo effects of zoom and pan
			this.m = this.m.scale( 1/scale );
			this.m = this.m.translate(-trans.x, -trans.y);
		}
		if (this.resizeCallbackFunction && this.initialized) {
			if (typeof(this.resizeCallbackFunction) == "function") {
				this.resizeCallbackFunction();
			}
		}
		this.initialized = true;
	},

	//set viewBox of document.documentElement to innerWidth and innerHeight
	adjustViewBox: function() {
		this.thedoc.documentElement.setAttributeNS(null,"viewBox","0 0 "+this.innerWidth+" "+this.innerHeight);
	},

	calcCoord: function(evt,ctmNode) {
		var svgPoint = this.thedoc.documentElement.createSVGPoint();
		//svgPoint.x = evt.clientX;
		//svgPoint.y = evt.clientY;
		try {
			if(evt.pageX) {
				svgPoint.x=evt.pageX;
				svgPoint.y=evt.pageY;
			} else {
				svgPoint.x=evt.clientX;
				svgPoint.y=evt.clientY;
			}
		} catch(e) {
			if(evt.clientX) {
				svgPoint.x=evt.clientX;
				svgPoint.y=evt.clientY;
			}
		}
		if(!ctmNode) {
			ctmNode=evt.target;
		}
		
		return this.calcPointCoord(svgPoint,ctmNode);
	},
	
	calcPointCoord: function(svgPoint,ctmNode) {
		if (!this.thedoc.documentElement.getScreenCTM) {
			//undo the effect of transformations
			var matrix = SVGmapApp.Helpers.getTransformToRootElement(ctmNode,this.thedoc);
  			svgPoint = svgPoint.matrixTransform(matrix.inverse().multiply(this.m));
		} else {
			//case getScreenCTM is available
			var matrix = ctmNode.getScreenCTM();
			svgPoint = svgPoint.matrixTransform(matrix.inverse());
		}
		//undo the effect of viewBox and zoomin/scroll
		return svgPoint;
	},

	calcInvCoord: function(svgPoint) {
		if (!this.thedoc.documentElement.getScreenCTM) {
			var matrix = SVGmapApp.Helpers.getTransformToRootElement(this.thedoc.documentElement,this.thedoc);
		} else {
			var matrix = this.thedoc.documentElement.getScreenCTM();
		}
		svgPoint = svgPoint.matrixTransform(matrix);
		return svgPoint;
	},

	//initialize tootlips
	initTooltips: function(groupId,tooltipTextAttribs,tooltipRectAttribs,xOffset,yOffset,padding) {
		var nrArguments = 6;
		if (arguments.length == nrArguments) {
			this.toolTipGroup = this.thedoc.getElementById(groupId);
			this.tooltipTextAttribs = tooltipTextAttribs;
			if (!this.tooltipTextAttribs["font-size"]) {
				this.tooltipTextAttribs["font-size"] = 12;
			}	
			this.tooltipRectAttribs = tooltipRectAttribs;
			this.xOffset = xOffset;
			this.yOffset = yOffset;
			this.padding = padding;
			if (!this.toolTipGroup) {
				alert("Error: could not find tooltip group with id '"+groupId+"'. Please specify a correct tooltip parent group id!");
			} else {
				//set tooltip group to invisible
				this.toolTipGroup.setAttributeNS(null,"visibility","hidden");
				this.toolTipGroup.setAttributeNS(null,"pointer-events","none");
				this.tooltipsEnabled = true;
				//create tooltip text element
				this.tooltipText = this.thedoc.createElementNS(SVGmapApp.svgNS,"text");
				for (var attrib in this.tooltipTextAttribs) {
					value = this.tooltipTextAttribs[attrib];
					if (attrib == "font-size") {
						value += "px";
					}
					this.tooltipText.setAttributeNS(null,attrib,value);
				}
				//create textnode
				var textNode = this.thedoc.createTextNode("Tooltip");
				this.tooltipText.appendChild(textNode);
				this.toolTipGroup.appendChild(this.tooltipText);
				var bbox = this.tooltipText.getBBox();
				this.tooltipRect = this.thedoc.createElementNS(SVGmapApp.svgNS,"rect");
				this.tooltipRect.setAttributeNS(null,"x",bbox.x-this.padding);
				this.tooltipRect.setAttributeNS(null,"y",bbox.y-this.padding);
				this.tooltipRect.setAttributeNS(null,"width",bbox.width+this.padding*2);
				this.tooltipRect.setAttributeNS(null,"height",bbox.height+this.padding*2);
				for (var attrib in this.tooltipRectAttribs) {
					this.tooltipRect.setAttributeNS(null,attrib,this.tooltipRectAttribs[attrib]);
				}
				this.toolTipGroup.insertBefore(this.tooltipRect,this.tooltipText);
			}
		} else {
				alert("Error in method 'initTooltips': wrong nr of arguments! You have to pass over "+nrArguments+" parameters.");			
		}
	},

	addTooltip: function(tooltipNode,tooltipTextvalue,followmouse,checkForUpdates,targetOrCurrentTarget,childAttrib) {
		var nrArguments = 6;
		if (arguments.length == nrArguments) {
			//get reference
			if (typeof(tooltipNode) == "string") {
				tooltipNode = this.thedoc.getElementById(tooltipNode);
			}
			//check if tooltip attribute present or create one
			if (!tooltipNode.hasAttributeNS(SVGmapApp.attribNS,"tooltip")) {
				if (tooltipTextvalue) {
					tooltipNode.setAttributeNS(SVGmapApp.attribNS,"tooltip",tooltipTextvalue);
				}
				else {
					tooltipNode.setAttributeNS(SVGmapApp.attribNS,"tooltip","Tooltip");			
				}
			}
			//see if we need updates
			if (checkForUpdates) {
				tooltipNode.setAttributeNS(SVGmapApp.attribNS,"tooltipUpdates","true");		
			}
			//see if we have to use evt.target
			if (targetOrCurrentTarget == "target") {
				tooltipNode.setAttributeNS(SVGmapApp.attribNS,"tooltipParent","true");
			}
			//add childAttrib
			if (childAttrib) {
				tooltipNode.setAttributeNS(SVGmapApp.attribNS,"tooltipAttrib",childAttrib);
			}
			//add event listeners
			tooltipNode.addEventListener("mouseover",this,false);
			tooltipNode.addEventListener("mouseout",this,false);
			if (followmouse) {
				tooltipNode.addEventListener("mousemove",this,false);
			}
		}
		else {
			alert("Error in method 'addTooltip()': wrong nr of arguments! You have to pass over "+nrArguments+" parameters.");			
		}
	},

	displayTooltip: function(evt) {
		var curEl = evt.currentTarget;
		var coords = this.calcCoord(evt,this.toolTipGroup.parentNode);
		if (evt.type == "mouseover") {
			this.toolTipGroup.setAttributeNS(null,"visibility","visible");
			this.toolTipGroup.setAttributeNS(null,"transform","translate("+(coords.x+this.xOffset)+","+(coords.y+this.yOffset)+")");
			this.updateTooltip(evt);
		}
		if (evt.type == "mouseout") {
			this.toolTipGroup.setAttributeNS(null,"visibility","hidden");
		}
		if (evt.type == "mousemove") {
			this.toolTipGroup.setAttributeNS(null,"transform","translate("+(coords.x+this.xOffset)+","+(coords.y+this.yOffset)+")");		
			if (curEl.hasAttributeNS(SVGmapApp.attribNS,"tooltipUpdates")) {
				this.updateTooltip(evt);
			}
		}
	},

	updateTooltip: function(evt) {
		var el = evt.currentTarget;
		if (el.hasAttributeNS(SVGmapApp.attribNS,"tooltipParent")) {
			var attribName = "tooltip";
			if (el.hasAttributeNS(SVGmapApp.attribNS,"tooltipAttrib")) {
				attribName = el.getAttributeNS(SVGmapApp.attribNS,"tooltipAttrib");
			}
			el = evt.target;
			var myText = el.getAttributeNS(SVGmapApp.attribNS,attribName);
		}
		else {
			var myText = el.getAttributeNS(SVGmapApp.attribNS,"tooltip");
		}
		if (myText) {
			var textArray = myText.split("\\n");
			while(this.tooltipText.hasChildNodes()) {
				this.tooltipText.removeChild(this.tooltipText.lastChild);
			}
			for (var i=0;i<textArray.length;i++) {
				var tspanEl = this.thedoc.createElementNS(SVGmapApp.svgNS,"tspan");
				tspanEl.setAttributeNS(null,"x",0);
				var dy = this.tooltipTextAttribs["font-size"];
				if (i == 0) {
					var dy = 0;
				}
				tspanEl.setAttributeNS(null,"dy",dy);
				var textNode = this.thedoc.createTextNode(textArray[i]);
				tspanEl.appendChild(textNode);
				this.tooltipText.appendChild(tspanEl);
			}
			// set text and rect attributes
			var bbox = this.tooltipText.getBBox();
			this.tooltipRect.setAttributeNS(null,"x",bbox.x-this.padding);
			this.tooltipRect.setAttributeNS(null,"y",bbox.y-this.padding);
			this.tooltipRect.setAttributeNS(null,"width",bbox.width+this.padding*2);
			this.tooltipRect.setAttributeNS(null,"height",bbox.height+this.padding*2);	
		}
		else {
			this.toolTipGroup.setAttributeNS(null,"visibility","hidden");	
		}
	},

	enableTooltips: function() {
		this.tooltipsEnabled = true;
	},

	disableTooltips: function() {
		this.tooltipsEnabled = false;
		this.toolTipGroup.setAttributeNS(null,"visibility","hidden");
	}
};
