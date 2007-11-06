function SVGtramp(LoadEvent) {
	this.SVGDoc    = LoadEvent.target.ownerDocument;
	this.SVGroot   = this.SVGDoc.documentElement;
	
	// First, let's detect the accuracy of convertToSpecifiedUnits!
	this.fakeConvert=true;
	try {
		var testLength=this.SVGroot.createSVGLength();
		testLength.newValueSpecifiedUnits(testLength.SVG_LENGTHTYPE_CM,1.0);
		testLength.convertToSpecifiedUnits(testLength.SVG_LENGTHTYPE_PX);
		if(testLength.valueInSpecifiedUnits > 1.0) {
			this.fakeConvert=undefined;
		}
	} catch(e) {
		// Shut up!
	}
	
	if(this.fakeConvert) {
		// Bad implementation :-(
		try {
			this.mmPerPixel = (this.SVGroot.pixelUnitToMillimeterX > this.SVGroot.pixelUnitToMillimeterY)?this.SVGroot.pixelUnitToMillimeterX:this.SVGroot.pixelUnitToMillimeterY;
		} catch(e) {
			this.mmPerPixel = 1e-4;
		}
		if(this.mmPerPixel<=0.0) {
			this.mmPerPixel = 1e-4;
		}
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
			if(titles.length>0 && titles[0].textContent && titles[0].textContent.length > 0) {
				var textContent = titles[0].textContent;
				titleToNode[textContent]=nodeId;
				nodeToTitle[nodeId]=textContent;
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
			if(scales.length>0) {
				this.realScaleW=parseFloat(scales[1]);
				this.realScaleH=parseFloat(scales[2]);
			} else {
				var scale = /scale\( *([0-9.]+) *\)/.exec(baseTransform);
				if(scale.length>0) {
					this.realScaleH=this.realScaleW=parseFloat(scale[1]);
				}
			}
		}
	}
	
	// And at last, the hooks
	top.SVGtramp = this;
}

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

			var typedLength=this.SVGroot.createSVGLength();
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
		// must be a fake function or not
		if(this.fakeConvert) {
			typedLength.convertToSpecifiedUnits = function (lengthType) {
				var oldUnits = this.unitType;
				if(oldUnits!=lengthType) {
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
					
					// Next lines are based on Mozilla Firefox internal implementation
					// of units translation
					
					// As it seems valid, let's translate the number to something neutral
					// and then comeback!
					var transVal = this.valueInSpecifiedUnits;
					switch(oldUnits) {
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
					this.newValueInSpecifiedUnits(lengthType,transVal);
				}
			};
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
	
	setBestScaleFromConstraintDimensions: function (w,h) {
		var wLength=this.createTypedLength(w);
		var hLength=this.createTypedLength(h);
		
		// This is not working in Opera
		wLength.convertToSpecifiedUnits(this.realWidth.unitType);
		hLength.convertToSpecifiedUnits(this.realHeight.unitType);
		
		var sw = wLength.valueInSpecifiedUnits / this.realWidth.valueInSpecifiedUnits;
		var sh = hLength.valueInSpecifiedUnits / this.realHeight.valueInSpecifiedUnits;
		if(sw>sh) {
			wLength.newValueSpecifiedUnits(this.realWidth.unitType,sh*this.realWidth.valueInSpecifiedUnits);
			sw=sh;
		} else if(sh>sw) {
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
			if(newValue && newValue!='') {
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
	
	// Setting up a handler
	setHandler: function (node,handler,event) {
		var retval=false;
		
		if(!event)  event='click';
		try {
			// Only events, please!!!!!!
			if(event.length > 0) {
				// Giving the correct name
				event = 'on' + event;
				var theNode=this.SVGDoc.getElementById(node);
				if(theNode) {
					theNode[event]=handler;

					if(handler!=null) {
						this.setCSSProp(theNode,"cursor","pointer");
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
							this.removeCSSProp(theNode,"cursor");
						}
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

function RunScript(LoadEvent) {
	new SVGtramp(LoadEvent);
}
