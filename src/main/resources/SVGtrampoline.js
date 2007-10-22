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
}

// Setting up the color of the element
function changeColor(node,color) {
	var retval=false;
	var theNode=SVGDoc.getElementById(node);
	if(theNode) {
		var polygons=theNode.getElementsByTagName("polygon");
		if(polygons.length>0) {
			setCSSProp(polygons.item(0),"fill",color);
			
			retval=true;
		}
	}
		
	return retval;
}

// Setting up an onclick handler
function setHandler(node,handler) {
	var retval=false;
	var theNode=SVGDoc.getElementById(node);
	if(theNode) {
		theNode.onclick=handler;
		
		setCSSProp(theNode,"cursor","pointer");
		
		retval=true;
	}
	
	return retval;
}

function suspendRedraw()
{
	// asv doesn't implement suspendRedraw, so we wrap this in a try-block:
	try {
		document.documentElement.suspendRedraw(0);
	} catch(e) {}
}

function unsuspendRedraw()
{
	// asv doesn't implement suspendRedraw, so we wrap this in a try-block:
	try {
		document.documentElement.unsuspendRedraw(0);
	} catch(e) {}
}
