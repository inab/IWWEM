var g_element;
var SVGDoc;
var SVGRoot;
var realWidth;
var realHeight;
var realWidthUnits;
var realHeightUnits;
function RunScript(LoadEvent) {
	SVGDoc    = LoadEvent.target.ownerDocument;
	g_element = SVGDoc.getElementById("graph0");
	
	realWidth  = SVGDoc.documentElement.getAttribute("width");
	realHeight = SVGDoc.documentElement.getAttribute("height");
	
	var idx;
	
	if((idx=realWidth.search(/[^0-9.]+$/))!=-1) {
		realWidthUnits=realWidth.substring(idx);
		realWidth=realWidth.substring(0,idx);
	} else {
		realWidthUnits='';
	}
	
	if((idx=realHeight.search(/[^0-9.]+$/))!=-1) {
		realHeightUnits=realHeight.substring(idx);
		realHeight=realHeight.substring(0,idx);
	} else {
		realHeightUnits='';
	}

	var SVGtramp = new Object();
	SVGtramp.setDimensionScale = setDimensionScale;
	SVGtramp.setDimension = setDimension;
	SVGtramp.setHandler	= setHandler;
	SVGtramp.changeColor = changeColor;
	top.SVGtramp = SVGtramp;
}

function setDimensionScale(sw,sh) {
	var newWidth = realWidth*sw + realWidthUnits;
	var newHeight = realHeight*sh + realHeightUnits;
	
	suspendRedraw();
	SVGDoc.documentElement.setAttribute("width", newWidth);
	SVGDoc.documentElement.setAttribute("height", newHeight);
	top.SVGtramp.width  = newWidth;
	top.SVGtramp.height = newHeight;
	
	setScale(sw, sh);
	unsuspendRedraw();
}

function setScale(sw, sh) {
	var newScale="scale(" + sw + " , " + sh + ")";
	var previousTransform=g_element.getAttribute("transform");
	
	if(!previousTransform)  previousTransform="";
	var newTransform;
	if(previousTransform.indexOf("scale(")==-1) {
		newTransform = newScale + " " + previousTransform;
	} else {
		newTransform = previousTransform.replace(/scale\([^)]*\)/,newScale);
	}
	
	g_element.setAttribute("transform", newTransform);
}

function setDimension(w,h) {
	var idx;
	var wNum;
	var hNum;
	var wUnits;
	var hUnits;
	
	if((idx=w.search(/[^0-9.]+$/))!=-1) {
		wUnits=w.substring(idx);
		wNum=w.substring(0,idx);
	} else {
		wUnits='';
		wNum=w;
	}
	
	if((idx=h.search(/[^0-9.]+$/))!=-1) {
		hUnits=h.substring(idx);
		hNum=h.substring(0,idx);
	} else {
		hUnits='';
		hNum=h;
	}

	SVGDoc.documentElement.setAttribute("width", w);
	SVGDoc.documentElement.setAttribute("height", h);
	
	var sw = w / realWidth;
	var sh = h / realHeight;
	
	setScale(sw,sh);
}

function setCSSProp(styleNode,prop,newValue) {
	if(styleNode && prop) {
		if(newValue) {
			var newProp = prop+": "+newValue;

			//var previouscssText = styleNode.style.cssText;
			suspendRedraw();
			var previouscssText = styleNode.getAttribute("style");
			if(!previouscssText)  previouscssText="";

			var propR = new RegExp(prop+" *:[^;]*");

			if(previouscssText.search(propR)==-1) {
				newcssText = newProp + ";" + previouscssText;
			} else {
				var newcssText=previouscssText.replace(propR,newProp);
			}

			//styleNode.style.cssText=newcssText;
			styleNode.setAttribute("style",newcssText);
			unsuspendRedraw();
		} else {
			removeCSSProp(styleNode,prop);
		}
	}
}

function removeCSSProp(styleNode,prop) {
	if(styleNode && prop) {
		//var previouscssText = styleNode.style.cssText;
		var previouscssText = styleNode.getAttribute("style");
		if(previouscssText) {
			suspendRedraw();

			var propR = new RegExp(prop+" *:[^;]*;? *");

			var newcssText=previouscssText.replace(propR,'');

			//styleNode.style.cssText=newcssText;
			styleNode.setAttribute("style",newcssText);
			unsuspendRedraw();
		}
	}
}

// Setting up the color of the element
function changeColor(node,color) {
	var retval=false;
	if(node) {
		var theNode=SVGDoc.getElementById(node);
		if(theNode) {
			var polygons=theNode.getElementsByTagName("polygon");
			if(polygons.length>0) {
				setCSSProp(polygons.item(0),"fill",color);

				retval=true;
			}
		}
	}
		
	return retval;
}

// Setting up a handler
function setHandler(node,handler,event) {
	var retval=false;
	
	if(!event)  event='click';
	try {
		// Only events, please!!!!!!
		if(event.length > 0) {
			// Giving the correct name
			event = 'on' + event;
			var theNode=SVGDoc.getElementById(node);
			if(theNode) {
				theNode[event]=handler;
				
				if(handler!=null) {
					setCSSProp(theNode,"cursor","pointer");
				} else {
					// Removing pointer cursor when no event is set
					var removeProp=1;
					for(var attrib in theNode) {
						if(attrib.length > 2 && attrib.indexOf('on')==0 && theNode[attrib]) {
							removeProp=null;
							break;
						}
					}
					
					if(removeProp) {
						removeCSSProp(theNode,"cursor");
					}
				}

				retval=true;
			}
		}
	} catch(e) {}
	
	return retval;
}

function suspendRedraw()
{
	// ASV doesn't implement suspendRedraw, so we wrap this in a try-block:
	try {
		document.documentElement.suspendRedraw(0);
	} catch(e) {}
}

function unsuspendRedraw()
{
	// ASV doesn't implement suspendRedraw, so we wrap this in a try-block:
	try {
		document.documentElement.unsuspendRedraw(0);
	} catch(e) {}
}
