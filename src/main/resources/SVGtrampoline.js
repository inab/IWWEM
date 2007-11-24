/*
	SVGtrampoline.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/*
	This class contains the trampoline used to manipulate
	and access this SVG from outside
*/
function SVGtramp(LoadEvent) {
	this.SVGDoc    = LoadEvent.target.ownerDocument;
	this.SVGroot   = this.SVGDoc.documentElement;
	
	// First, let's detect the accuracy of convertToSpecifiedUnits!
	// Bad implementation :-(
	this.mmPerPixel = 1e-4;
	try {
		if(this.SVGroot.pixelUnitToMillimeterX && this.SVGroot.pixelUnitToMillimeterY) {
			this.mmPerPixel = (this.SVGroot.pixelUnitToMillimeterX > this.SVGroot.pixelUnitToMillimeterY)?this.SVGroot.pixelUnitToMillimeterX:this.SVGroot.pixelUnitToMillimeterY;
		}
	} catch(e) {
		this.mmPerPixel = 1e-4;
	}
	if(this.mmPerPixel<=0.0) {
		this.mmPerPixel = 1e-4;
	}

	this.fakeConvert=true;
	this.fullConvert=undefined;
	try {
		var testLength=this.SVGroot.createSVGLength();
		if(!('SVG_LENGTHTYPE_CM' in testLength)) {
			throw 'Ill SVGLength implementation';
		}
		testLength.newValueSpecifiedUnits(testLength.SVG_LENGTHTYPE_CM,1.0);
		testLength.convertToSpecifiedUnits(testLength.SVG_LENGTHTYPE_PX);
		if(testLength.valueInSpecifiedUnits > 1.0) {
			this.fakeConvert=undefined;
		}
	} catch(e) {
		// Shut up!
		this.fakeConvert=undefined;
		this.fullConvert=true;
	}
	
	// SVG must enumerate itself...
	var nodes = this.SVGDoc.getElementsByTagName("g");
	var titleToNode=new Object();
	var nodeToTitle=new Object();
	for(var i=0; i<nodes.length ; i++) {
		var node=nodes.item(i);
		if(node.getAttribute("class") == 'node') {
			var nodeId=node.getAttribute("id");
			var titles=node.getElementsByTagName('title');
			if(titles.length>0) {
				var textContent=SVGtramp.getTextContent(titles.item(0));
				if(textContent && textContent.length > 0) {
					titleToNode[textContent]=nodeId;
					nodeToTitle[nodeId]=textContent;
				}
			}
		}
	}
	
	this.titleToNode=titleToNode;
	this.nodeToTitle=nodeToTitle;
	
	// Now it is time to find the g point ;-)
	if(nodes.length > 0) {
		this.g_element = nodes.item(0);
	}
	
	this.width=this.SVGroot.getAttribute("width");
	this.height=this.SVGroot.getAttribute("height");
	this.realWidth  = this.createTypedLength(this.width);
	this.realHeight = this.createTypedLength(this.height);
	
	// Default scale value
	this.realScaleH=this.realScaleW=1.0;
	
	if(this.g_element) {
		var baseTransform=this.g_element.getAttribute("transform");
		if(baseTransform) {
			var scales = /scale\( *([0-9.]+) *,? *([0-9.]+) *\)/.exec(baseTransform);
			if(scales && scales.length>0) {
				this.realScaleW=parseFloat(scales[1]);
				this.realScaleH=parseFloat(scales[2]);
			} else {
				var scale = /scale\( *([0-9.]+) *\)/.exec(baseTransform);
				if(scale && scale.length>0) {
					this.realScaleH=this.realScaleW=parseFloat(scale[1]);
				}
			}
		}
	}
	
	// And at last, the hooks
	if(top) {
		top.SVGtrampoline = this;
	}
}

SVGtramp.getTextContent = function (oNode) {
	var retval;
	if(oNode) {
		try {
			if(navigator.userAgent && navigator.userAgent.indexOf('MSIE')!=-1) {
				retval=oNode.text;
			} else if((navigator.vendor && navigator.vendor.indexOf('Apple')!=-1)||
				(navigator.appName && navigator.appName.indexOf('Adobe')!=-1)){
				retval=SVGtramp.nodeGetText(oNode,true);
			} else {
				retval=oNode.textContent;
			}
		} catch(e) {
			retval=SVGtramp.nodeGetText(oNode,true);
		}
	}
	
	return retval;
};

SVGtramp.nodeGetText = function (oNode,deep) {
	var s = "";
	for(var node=oNode.firstChild; node; node=node.nextSibling){
		var nodeType = node.nodeType;
		if(nodeType == 3 || nodeType == 4){
			s += node.data;
		} else if(deep == true
			&& (nodeType == 1
			|| nodeType == 9
			|| nodeType == 11)){
			s += SVGtramp.nodeGetText(node, true);
		}
	}
	return s;
};

SVGtramp.prototype = {
	/*
		Second parameter dictates the behavior of the function
		If it is not set, the first parameter is treated as a string
		If it is set, the first parameter must be a length type,
		and the second one the value as a float
	*/
	createTypedLength: function (lenstr, /* optional */ thevalue) {
		var idx;
		var realLength;
		var realLengthUnitsStr;
		var realLengthUnits;
		
		if(thevalue) {
			realLengthUnits=lenstr;
			realLength=thevalue;
		} else {
			var matches = /^ *[0-9.]+ *([^ ]*) */.exec(lenstr);
			realLengthUnitsStr=matches[1];
			realLength=parseFloat(lenstr);

			var typedLength;
			if(this.fullConvert) {
				typedLength=new SVGtramp.SVGLength(this.mmPerPixel);
			} else {
				typedLength=this.SVGroot.createSVGLength();
			}
			switch(realLengthUnitsStr) {
				case '':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_NUMBER;
					//realLengthUnits=typedLength.SVG_LENGTHTYPE_PT;
					break;
				case '%':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_PERCENTAGE;
					break;
				case 'em':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_EMS;
					break;
				case 'ex':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_EXS;
					break;
				case 'px':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_PX;
					break;
				case 'cm':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_CM;
					break;
				case 'mm':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_MM;
					break;
				case 'in':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_IN;
					break;
				case 'pt':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_PT;
					break;
				case 'pc':
					realLengthUnits=typedLength.SVG_LENGTHTYPE_PC;
					break;
				default:
					realLengthUnits=typedLength.SVG_LENGTHTYPE_UNKNOWN;
					break;
			}
		}
		
		typedLength.newValueSpecifiedUnits(realLengthUnits,realLength);
		
		// Now it is time to detect whether convertToSpecifiedUnits
		// must be patched or not
		if(this.fakeConvert) {
			typedLength.mmPerPixel=this.mmPerPixel;
			typedLength.translateToPx = SVGtramp.SVGLength.prototype.translateToPx;
			typedLength.getTransformedValue = SVGtramp.SVGLength.prototype.getTransformedValue;
			typedLength.convertToSpecifiedUnits = SVGtramp.SVGLength.prototype.convertToSpecifiedUnits;
		}
		
		return typedLength;
	},
	
	setDimensionFromScale: function (sw,sh) {
		var newWidth = this.createTypedLength(this.realWidth.unitType,this.realWidth.valueInSpecifiedUnits*sw);
		var newHeight = this.createTypedLength(this.realHeight.unitType,this.realHeight.valueInSpecifiedUnits*sh);
		
		//var newWidth = this.realWidth*sw + this.realWidthUnits;
		//var newHeight = this.realHeight*sh + this.realHeightUnits;
		
		var susId = this.suspendRedraw();
		
		this.setScale(sw, sh);
		
		this.SVGroot.setAttribute("height", newHeight.valueAsString);
		this.height = newHeight.valueAsString;
		this.SVGroot.setAttribute("width", newWidth.valueAsString);
		this.width  = newWidth.valueAsString;
		
		this.unsuspendRedraw(susId);
	},
	
	setScale: function (sw, sh) {
		// Now it is time to apply the correction factor
		// to avoid blank borders
		sw *= this.realScaleW;
		sh *= this.realScaleH;
		
		var newScale="scale(" + sw + " , " + sh + ")";
		var previousTransform=this.g_element.getAttribute("transform");
		
		if(!previousTransform)  previousTransform="";
		var newTransform;
		if(previousTransform.indexOf("scale(")==-1) {
			newTransform = newScale + " " + previousTransform;
		} else {
			newTransform = previousTransform.replace(/scale\([^)]*\)/,newScale);
		}

		this.g_element.setAttribute("transform", newTransform);
	},
	
	setScaleFromDimension: function (w,h) {
		var wLength=this.createTypedLength(w);
		var hLength=this.createTypedLength(h);
		
		// This is not working in Opera
		wLength.convertToSpecifiedUnits(this.realWidth.unitType);
		hLength.convertToSpecifiedUnits(this.realHeight.unitType);
		
		var sw = wLength.valueInSpecifiedUnits / this.realWidth.valueInSpecifiedUnits;
		var sh = hLength.valueInSpecifiedUnits / this.realHeight.valueInSpecifiedUnits;
		
		var susId = this.suspendRedraw();
		
		this.setScale(sw,sh);
		this.SVGroot.setAttribute("height", hLength.valueAsString);
		this.height = hLength.valueAsString;
		this.SVGroot.setAttribute("width", wLength.valueAsString);
		this.width = wLength.valueAsString;
		
		this.unsuspendRedraw(susId);
	},
	
	setBestScaleFromConstraintDimensions: function (w,h,isWorst) {
		var wLength=this.createTypedLength(w);
		var hLength=this.createTypedLength(h);
		
		// This is not working in Opera
		wLength.convertToSpecifiedUnits(this.realWidth.unitType);
		hLength.convertToSpecifiedUnits(this.realHeight.unitType);
		
		var sw = wLength.valueInSpecifiedUnits / this.realWidth.valueInSpecifiedUnits;
		var sh = hLength.valueInSpecifiedUnits / this.realHeight.valueInSpecifiedUnits;
		if((sw<sh && isWorst) || (sw>sh)) {
			wLength.newValueSpecifiedUnits(this.realWidth.unitType,sh*this.realWidth.valueInSpecifiedUnits);
			sw=sh;
		} else if(sh!=sw) {
			hLength.newValueSpecifiedUnits(this.realHeight.unitType,sw*this.realHeight.valueInSpecifiedUnits);
			sh=sw;
		}
		
		var susId = this.suspendRedraw();
		
		this.setScale(sw,sh);
		this.SVGroot.setAttribute("height", hLength.valueAsString);
		this.height = hLength.valueAsString;
		this.SVGroot.setAttribute("width", wLength.valueAsString);
		this.width = wLength.valueAsString;
		
		this.unsuspendRedraw(susId);
	},
	
	setCSSProp: function (styleNode,prop,newValue) {
		if(styleNode && prop) {
			if(newValue) {
				if(typeof newValue != 'string') {
					newValue=newValue.toString();
				}
				if(newValue!='') {
					var newProp = prop+": "+newValue;

					//var previouscssText = styleNode.style.cssText;
					var susId = this.suspendRedraw();
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
					this.unsuspendRedraw(susId);
				}
			} else {
				this.removeCSSProp(styleNode,prop);
			}
		}
	},
	
	removeCSSProp: function (styleNode,prop) {
		if(styleNode && prop) {
			//var previouscssText = styleNode.style.cssText;
			var previouscssText = styleNode.getAttribute("style");
			if(previouscssText) {
				var susId = this.suspendRedraw();

				var propR = new RegExp(prop+" *:[^;]*;? *");

				var newcssText=previouscssText.replace(propR,'');

				//styleNode.style.cssText=newcssText;
				styleNode.setAttribute("style",newcssText);
				this.unsuspendRedraw(susId);
			}
		}
	},
	
	// Setting up the color and opacity of the element
	changeFill: function (node,color,opacity) {
		var retval=false;
		if(node) {
			var theNode=this.SVGDoc.getElementById(node);
			if(theNode) {
				var polygons=theNode.getElementsByTagName("polygon");
				if(polygons.length>0) {
					this.setCSSProp(polygons.item(0),"fill",color);
					this.setCSSProp(polygons.item(0),"fill-opacity",opacity);

					retval=true;
				}
			}
		}

		return retval;
	},
	
	// Setting up the color and opacity of the element with the next title
	changeNodeFill: function (nodeName,color,opacity) {
		if(nodeName in this.titleToNode) {
			return this.changeFill(this.titleToNode[nodeName],color,opacity);
		}
		
		return false;
	},
	
	// Setting up the opacity of the element
	changeFillOpacity: function (node,opacity) {
		var retval=false;
		if(node) {
			var theNode=this.SVGDoc.getElementById(node);
			if(theNode) {
				var polygons=theNode.getElementsByTagName("polygon");
				if(polygons.length>0) {
					this.setCSSProp(polygons.item(0),"fill-opacity",opacity);

					retval=true;
				}
			}
		}

		return retval;
	},
	
	// Setting up the opacity of the element with the next title
	changeNodeFillOpacity: function (nodeName,opacity) {
		if(nodeName in this.titleToNode) {
			return this.changeFillOpacity(this.titleToNode[nodeName],opacity);
		}
		
		return false;
	},
	
	// Setting up an event handler
	setHandler: function (node,handler,event) {
		var retval=false;
		
		if(!event)  event='click';
		try {
			// Only events, please!!!!!!
			if(event.length > 0) {
				var theNode=this.SVGDoc.getElementById(node);
				if(theNode) {
					//theNode[event]=handler;

					if(handler!=null) {
						this.setCSSProp(theNode,"cursor","pointer");
						SVGtramp.addEventListener(theNode,event,handler,false);
					}

					retval=true;
				}
			}
		} catch(e) {}

		return retval;
	},
	
	// Setting up a handler to the element with the next title
	setNodeHandler: function (nodeName,handler,event) {
		if(nodeName in this.titleToNode) {
			return this.setHandler(this.titleToNode[nodeName],handler,event);
		}
		
		return false;
	},
	
	// Setting up an event handler
	removeHandler: function (node,handler,event) {
		var retval=false;
		
		if(!event)  event='click';
		try {
			// Only events, please!!!!!!
			if(event.length > 0) {
				var theNode=this.SVGDoc.getElementById(node);
				if(theNode) {
					SVGtramp.removeEventListener(theNode,event,handler,false);
					// Removing pointer cursor when no event is set
					var removeProp=1;
					/*
					for(var attrib in theNode) {
						if(attrib.length > 2 && attrib.indexOf('on')==0 && theNode[attrib]) {
							removeProp=null;
							break;
						}
					}
					*/

					if(removeProp) {
						this.removeCSSProp(theNode,"cursor");
					}

					retval=true;
				}
			}
		} catch(e) {}

		return retval;
	},
	
	removeNodeHandler: function (nodeName,handler,event) {
		if(nodeName in this.titleToNode) {
			return this.removeHandler(this.titleToNode[nodeName],handler,event);
		}
		
		return false;
	},
	
	suspendRedraw: function (timeout)
	{
		// ASV doesn't implement suspendRedraw, so we wrap this in a try-block:
		try {
			if(!timeout)  timeout=60;
			return this.SVGroot.suspendRedraw(timeout);
		} catch(e) {
			return null;
		}
	},

	unsuspendRedraw: function (susId)
	{
		// ASV doesn't implement suspendRedraw, so we wrap this in a try-block:
		try {
			this.SVGroot.unsuspendRedraw(susId);
		} catch(e) {}
	}
};

/*
	This class implements SVGLength for platforms (Konqueror, cough, Adobe, cough)
	where it is not implemented.
*/
SVGtramp.SVGLength = function (mmPerPixel) {
	this.mmPerPixel=mmPerPixel;
	
	this.SVG_LENGTHTYPE_UNKNOWN=0;
	this.SVG_LENGTHTYPE_NUMBER=1;
	this.SVG_LENGTHTYPE_PERCENTAGE=2;
	this.SVG_LENGTHTYPE_EMS=3;
	this.SVG_LENGTHTYPE_EXS=4;
	this.SVG_LENGTHTYPE_PX=5;
	this.SVG_LENGTHTYPE_CM=6;
	this.SVG_LENGTHTYPE_MM=7;
	this.SVG_LENGTHTYPE_IN=8;
	this.SVG_LENGTHTYPE_PT=9;
	this.SVG_LENGTHTYPE_PC=10;
	
	this.unitType=this.SVG_LENGTHTYPE_NUMBER;
	this.value=0.0;
	this.valueAsString='0';
	this.valueInSpecifiedUnits=0.0;
};

SVGtramp.SVGLength.prototype = {
	newValueSpecifiedUnits: function (lengthType,newValue) {
		// Let's check the input lengthType
		switch(lengthType) {
			case this.SVG_LENGTHTYPE_NUMBER:
				lengthType=this.SVG_LENGTHTYPE_PX;
				break;
			case this.SVG_LENGTHTYPE_PX:
			case this.SVG_LENGTHTYPE_CM:
			case this.SVG_LENGTHTYPE_MM:
			case this.SVG_LENGTHTYPE_IN:
			case this.SVG_LENGTHTYPE_PT:
			case this.SVG_LENGTHTYPE_PC:
				break;
			//case this.SVG_LENGTHTYPE_PERCENTAGE:
			//case this.SVG_LENGTHTYPE_EMS:
			//case this.SVG_LENGTHTYPE_EXS:
			//case this.SVG_LENGTHTYPE_UNKNOWN:
			default:
				return;
				break;
		}
		
		this.unitType = lengthType;
		this.valueInSpecifiedUnits = newValue;
		this.value = this.translateToPx();
		var unitstr;
		switch(this.unitType) {
			case this.SVG_LENGTHTYPE_PERCENTAGE:
				unistr='%';
				break;
			case this.SVG_LENGTHTYPE_EMS:
				unistr='em';
				break;
			case this.SVG_LENGTHTYPE_EXS:
				unistr='ex'
				break;
			case this.SVG_LENGTHTYPE_PX:
				unistr='px';
				break;
			case this.SVG_LENGTHTYPE_CM:
				unistr='cm';
				break;
			case this.SVG_LENGTHTYPE_MM:
				unistr='mm';
				break;
			case this.SVG_LENGTHTYPE_IN:
				unistr='in';
				break;
			case this.SVG_LENGTHTYPE_PT:
				unistr='pt';
				break;
			case this.SVG_LENGTHTYPE_PC:
				unistr='pc';
				break;
			case this.SVG_LENGTHTYPE_NUMBER:
			default:
				unistr='';
				break;
		}
		this.valueAsString= this.valueInSpecifiedUnits+unistr;
	},
	
	translateToPx: function() {
		var transVal = this.valueInSpecifiedUnits;
		switch(this.unitType) {
			/*	Lack of context!!!!
			case this.SVG_LENGTHTYPE_PERCENTAGE:
				var axisLength =;
				transVal *= axisLength;
				transVal /= 100.0;
				break;
			*/
			case this.SVG_LENGTHTYPE_CM:
				transVal *= 10.0;
				transVal /= this.mmPerPixel;
				break;
			case this.SVG_LENGTHTYPE_MM:
				transVal /= this.mmPerPixel;
				break;
			case this.SVG_LENGTHTYPE_IN:
				transVal *= 25.4;
				transVal /= this.mmPerPixel;
				break;
			case this.SVG_LENGTHTYPE_PC:
				transVal *= 25.4 * 12.0;
				transVal /= 72.0;
				transVal /= this.mmPerPixel;
				break;
			case this.SVG_LENGTHTYPE_PT:
				transVal *= 25.4;
				transVal /= 72.0;
				transVal /= this.mmPerPixel;
				break;
			//case this.SVG_LENGTHTYPE_UNKNOWN:
			//case this.SVG_LENGTHTYPE_EXS:
			//case this.SVG_LENGTHTYPE_EMS:
			//case this.SVG_LENGTHTYPE_NUMBER:
			//case this.SVG_LENGTHTYPE_PX:
			default:
				// It is left as such, it is already neutral!!!!
				break;
		}
		
		return transVal;
	},
	
	getTransformedValue: function(lengthType) {
		if(this.unitType!=lengthType) {
			// Let's check the input lengthType
			switch(lengthType) {
				case this.SVG_LENGTHTYPE_NUMBER:
					lengthType=this.SVG_LENGTHTYPE_PX;
					break;
				case this.SVG_LENGTHTYPE_PX:
				case this.SVG_LENGTHTYPE_CM:
				case this.SVG_LENGTHTYPE_MM:
				case this.SVG_LENGTHTYPE_IN:
				case this.SVG_LENGTHTYPE_PT:
				case this.SVG_LENGTHTYPE_PC:
					break;
				//case this.SVG_LENGTHTYPE_PERCENTAGE:
				//case this.SVG_LENGTHTYPE_EMS:
				//case this.SVG_LENGTHTYPE_EXS:
				//case this.SVG_LENGTHTYPE_UNKNOWN:
				default:
					return undefined;
					break;
			}
			
			var transVal = this.translateToPx(this.valueInSpecifiedUnits);

			switch(lengthType) {
				/*	Again, lack of context!!!
				case this.SVG_LENGTHTYPE_PERCENTAGE:
					var axisLength =;
					transVal *= 100.0;
					transVal /= axisLength;
					break;
				*/
				case this.SVG_LENGTHTYPE_CM:
					transVal *= this.mmPerPixel;
					transVal /= 10.0;
					break;
				case this.SVG_LENGTHTYPE_MM:
					transVal *= this.mmPerPixel;
					break;
				case this.SVG_LENGTHTYPE_IN:
					transVal *= this.mmPerPixel;
					transVal /= 25.4;
					break;
				case this.SVG_LENGTHTYPE_PC:
					transVal *= this.mmPerPixel * 72.0;
					transVal /= 12.0;
					transVal /= 25.4;
					break;
				case this.SVG_LENGTHTYPE_PT:
					transVal *= this.mmPerPixel * 72.0;
					transVal /= 25.4;
					break;
				//case this.SVG_LENGTHTYPE_UNKNOWN:
				//case this.SVG_LENGTHTYPE_EXS:
				//case this.SVG_LENGTHTYPE_EMS:
				//case this.SVG_LENGTHTYPE_NUMBER:
				//case this.SVG_LENGTHTYPE_PX:
				default:
					// It is left as such, it is already neutral!!!!
					break;
			}
			
			return transVal;
		} else {
			return this.valueInSpecifiedUnits;
		}
	},
	
	convertToSpecifiedUnits: function (lengthType) {
		var transVal=this.getTransformedValue(lengthType);
		if(transVal) {
			this.newValueSpecifiedUnits(lengthType,transVal);
		}
	}
};

/***********************/
/* Event handling code */
/***********************/
/* Based on a previous work on widgetCommon */
/* Based on a previous work on widgetCommon */
SVGtramp.HandlerHash={};

SVGtramp.callHashHandler = function(theid,eventType) {
	var listeners=SVGtramp.HandlerHash[theid][eventType];
	if(listeners && listeners.length>0) {
		for(var i=0;i<listeners.length;i++) {
			try {
				if(typeof listeners[i] == 'string') {
					eval(listeners[i]);
				} else {
					listeners[i](theid);
				}
			} catch(e) {
				// Ignore them???
			}
		}
	}
};

SVGtramp.addEventListener = function (object, eventType, listener, useCapture) {
	if(!top || (navigator.appName && navigator.appName.indexOf('Adobe')!=-1)) {
		// Adobe & KDE aberrations
		SVGtramp.addEventListener = function (object, eventType, listener, useCapture) {
			try {
				if(eventType && object && listener) {
					if(!(object.id in SVGtramp.HandlerHash)) {
						SVGtramp.HandlerHash[object.id]={};
					}
					if(!(eventType in SVGtramp.HandlerHash[object.id])) {
						SVGtramp.HandlerHash[object.id][eventType]=new Array();
					}
					SVGtramp.HandlerHash[object.id][eventType].push(listener);
					object.setAttribute('on'+eventType,'SVGtramp.callHashHandler("'+object.id+'","'+eventType+'")');
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else if(top.addEventListener) {
		// W3C DOM compatible browsers
		SVGtramp.addEventListener = function (object, eventType, listener, useCapture) {
			if(!useCapture)  useCapture=false;
			try {
				if(object.addEventListener) {
					object.addEventListener(eventType,listener,useCapture);
				} else {
					object["on"+eventType]=listener;
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else if(top.attachEvent) {
		// Internet Explorer ???? (no native implementation yet)
		SVGtramp.addEventListener = function (object, eventType, listener, useCapture) {
			try {
				if(object.attachEvent) {
					object.attachEvent("on"+eventType,listener);
				} else {
					object["on"+eventType]=listener;
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else {
		// Other????
		SVGtramp.addEventListener = function (object, eventType, listener, useCapture) {
			try {
				object["on"+eventType]=listener;
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	}
	SVGtramp.addEventListener(object, eventType, listener, useCapture);
};

SVGtramp.addEventListenerToId = function (objectId, eventType, listener, useCapture, /* optional */ thedoc) {
	if(!thedoc)  thedoc=document;
	SVGtramp.addEventListener(thedoc.getElementById(objectId), eventType, listener, useCapture);
};

SVGtramp.removeEventListener = function (object, eventType, listener, useCapture) {
	if(!top || (navigator.appName && navigator.appName.indexOf('Adobe')!=-1)) {
		// Adobe & KDE aberrations
		SVGtramp.removeEventListener = function (object, eventType, listener, useCapture) {
			try {
				if(eventType && object && listener) {
					if((object.id in SVGtramp.HandlerHash) &&
						(eventType in SVGtramp.HandlerHash[object.id]) &&
						SVGtramp.HandlerHash[object.id][eventType].length>0
					) {
						var listeners=SVGtramp.HandlerHash[object.id][eventType];
						for(var i=0;i<listeners.length;i++) {
							if(listener==listeners[i]) {
								listeners.splice(i,1);
								break;
							}
						}
						
						if(listeners.length==0) {
							object.removeAttribute('on'+eventType);
						}
						
					}
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else if(top.removeEventListener) {
		// W3C DOM compatible browsers
		SVGtramp.removeEventListener = function (object, eventType, listener, useCapture) {
			if(!useCapture)  useCapture=false;
			try {
				if(object.removeEventListener) {
					object.removeEventListener(eventType,listener,useCapture);
				} else if(object["on"+eventType] && object["on"+eventType]==listener) {
					object["on"+eventType]=undefined;
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else if(top.detachEvent) {
		// Internet Explorer ???? (no native implementation yet)
		SVGtramp.removeEventListener = function (object, eventType, listener, useCapture) {
			try {
				if(object.detachEvent) {
					object.detachEvent("on"+eventType,listener);
				} else if(object["on"+eventType] && object["on"+eventType]==listener) {
					object["on"+eventType]=undefined;
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	} else {
		// Other????
		SVGtramp.removeEventListener = function (object, eventType, listener, useCapture) {
			try {
				if(object["on"+eventType] && object["on"+eventType]==listener) {
					object["on"+eventType]=undefined;
				}
			} catch(e) {
				// IgnoreIt!(R)
			}
		};
	}
	SVGtramp.removeEventListener(object, eventType, listener, useCapture);
};

SVGtramp.removeEventListenerFromId = function (objectId, eventType, listener, useCapture, /* optional */ thedoc) {
	if(!thedoc)  thedoc=document;
	SVGtramp.removeEventListener(thedoc.getElementById(objectId), eventType, listener, useCapture);
};

/*
	This SVG script is used to init the trampoline
	from an onload event from the SVG
*/
function RunScript(LoadEvent) {
	new SVGtramp(LoadEvent);
}
