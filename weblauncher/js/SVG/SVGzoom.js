/*
	$Id$
	SVGzoom.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
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
	Self-contained SVG Zooming functions
*/
function SVGzoom(doc,myMapApp,/*optional*/ gElem, scaleX, scaleY) {
	this.zoomW=150;
	this.zoomH=150;
	
	this.scaleX=(typeof scaleX != 'number')?3:scaleX;
	this.scaleY=(typeof scaleY != 'number')?this.scaleX:scaleY;
	this.pageScaleX=this.pageScaleY=1;
	
	var SVGNS=(doc.documentElement.namespaceURI)?doc.documentElement.namespaceURI:'http://www.w3.org/2000/svg';
	
	var backClip=doc.createElementNS(SVGNS,"rect");
	//backClip.setAttribute('id','backclip');
	backClip.setAttribute('width',this.zoomW+'px');
	backClip.setAttribute('height',this.zoomH+'px');
	backClip.setAttribute('style',"fill:white;stroke:black;");
	
	var forthClip=doc.createElementNS(SVGNS,"rect");
	forthClip.setAttribute('width',this.zoomW+'px');
	forthClip.setAttribute('height',this.zoomH+'px');
	forthClip.setAttribute('style',"stroke:black;fill:none");
	
	var useElem=doc.createElementNS(SVGNS,"use");
	this.useElem = useElem;
	useElem.setAttribute('transform','scale('+this.scaleX+' '+this.scaleY+') translate(0 0)');
	
	var svgG=doc.createElementNS(SVGNS,"svg");
	svgG.setAttribute('width',this.zoomW+'px');
	svgG.setAttribute('height',this.zoomH+'px');
	svgG.appendChild(backClip);
	svgG.appendChild(useElem);
	svgG.appendChild(forthClip);
	
	var conG=doc.createElementNS(SVGNS,"g");
	conG.setAttribute('style','cursor:move;');
	conG.setAttribute('display','none');
	conG.setAttribute('transform','translate(0 0)');
	conG.appendChild(svgG);
	
	var zoomTextNode = doc.createTextNode("To use embedded zoom function press Z or Ctrl+click");
	var zoomText=doc.createElementNS(SVGNS,"text");
	zoomText.setAttribute("x","2px");
	zoomText.setAttribute("y","12px");
	zoomText.setAttribute("text-anchor","start");
	zoomText.setAttribute("style", "font-family:Arial; font-size:8px;fill:red;");
	zoomText.appendChild(zoomTextNode);
	
	/*
	var debugTextNode = doc.createTextNode("0 0");
	var debugText=doc.createElementNS(SVGNS,"text");
	debugText.setAttribute("x","2px");
	debugText.setAttribute("y","24px");
	debugText.setAttribute("text-anchor","start");
	debugText.setAttribute("style", "font-family:Arial; font-size:16px;fill:red;");
	debugText.appendChild(debugTextNode);
	*/

	var docEl=doc.documentElement;
	docEl.appendChild(conG);
	docEl.appendChild(zoomText);
	
	/*
	docEl.appendChild(debugText);
	*/
	
	// Inverse matriz needed to apply coordinate transformations
	var thiszoom=this;
	var xPos=undefined;
	var yPos=undefined;
	var gVis=undefined;
	var canEnter=true;
	var realZoom=function(evt) {
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
		if(gVis && canEnter) {
			canEnter=undefined;
			if(typeof xPos != 'number') {
				xPos=0;
			}
			
			if(typeof yPos != 'number') {
				yPos=0;
			}
			
			var point=docEl.createSVGPoint();
			point.x = xPos;
			point.y = yPos;
			
			point = myMapApp.calcPointCoord(point,docEl);
			var xPosTrans=point.x;
			var yPosTrans=point.y;
			
			/*
			// Which is the logic behind this?!?
			var pointG=docEl.createSVGPoint();
			pointG.x = xPos;
			pointG.y = yPos;
			
			pointG = myMapApp.calcPointCoord(pointG,thiszoom.other);
			
			var x = pointG.x;
			var y = pointG.y;
			*/
			
			var x = xPosTrans;
			var y = yPosTrans;
			
			x -= thiszoom.zoomW/(2.0*thiszoom.scaleX);
			y -= thiszoom.zoomH/(2.0*thiszoom.scaleY);
			
			var susId=undefined;
			try {
				susId=docEl.suspendRedraw(60);
			} catch(e) {
				// Adobe does not implement it!
			}
			
			useElem.setAttribute('transform','scale('+(thiszoom.scaleX)+' '+(thiszoom.scaleY)+') translate('+(-x)+' '+(-y)+')');
			conG.setAttribute('transform','translate('+(xPosTrans-thiszoom.zoomW/2.0)+' '+(yPosTrans-thiszoom.zoomH/2.0)+')');
			
			if(susId!=undefined) {
				docEl.unsuspendRedraw(susId);
			}
			
			//conG.setAttribute('transform','translate(100 100)');
			//useElem.setAttribute('transform', 'translate('+(-x)+' '+(-y)+') scale('+(thiszoom.scaleX)+' '+(thiszoom.scaleY)+')');
			canEnter=true;
		}
	};
	
	docEl.addEventListener('mousemove',realZoom,false);
	
	docEl.addEventListener('mousedown',function(evt) {
		if(evt.ctrlKey) {
			gVis=true;
			realZoom(evt);
			conG.setAttribute('display','inherit');
		}
	},false);
	
	docEl.addEventListener('mouseup',function(evt) {
		conG.setAttribute('display','none');
		gVis=undefined;
	},false);
	
	docEl.addEventListener('keydown',function(evt) {
		if(evt.keyCode==90) {
			//scale *= 1.5;
			if(gVis) {
				conG.setAttribute('display','none');
				gVis=undefined;
			} else {
				gVis=true;
				realZoom(evt);
				conG.setAttribute('display','inherit');
			}
		}
	},false);
	
	/*
	docEl.addEventListener('keydown',function(evt) {
		if(evt.keyCode == 17) {
			//scale *= 1.5;
			conG.setAttribute('display','inherit');
			realZoom(evt);
		}
	},false);
	
	docEl.addEventListener('keyup',function(evt) {
		if(evt.keyCode == 17) {
			//scale /= 1.5;
			conG.setAttribute('display','none');
			realZoom(evt);
		}
	},false);
	*/

/** This is high-level function.
 * It must react to delta being more/less than zero.
 */
	var handle = function (delta,evt) {
        	if (delta < 0) {
			thiszoom.scaleX-=0.5;
			thiszoom.scaleY-=0.5;
        	} else {
			thiszoom.scaleX+=0.5;
			thiszoom.scaleY+=0.5;
		}
		realZoom(evt);
	}

	/** Event handler for mouse wheel event.
	 */
	var wheel = function (event){
        	var delta = 0;
        	if (!event) /* For IE. */
                	event = window.event;
        	if (event.wheelDelta) { /* IE/Opera. */
                	delta = event.wheelDelta/120;
                	/** In Opera 9, delta differs in sign as compared to IE.
                	 */
                	if (window.opera)
                        	delta = -delta;
        	} else if (event.detail) { /** Mozilla case. */
                	/** In Mozilla, sign of delta is different than in IE.
                	 * Also, delta is multiple of 3.
                	 */
                	delta = -event.detail/3;
        	}
        	/** If delta is nonzero, handle it.
        	 * Basically, delta is now positive if wheel was scrolled up,
        	 * and negative, if wheel was scrolled down.
        	 */
        	if (delta)
                	handle(delta,event);
        	/** Prevent default actions caused by mouse wheel.
        	 * That might be ugly, but we handle scrolls somehow
        	 * anyway, so don't bother here..
        	 */
        	if (event.preventDefault)
                	event.preventDefault();
		event.returnValue = false;
	}

	/** Initialization code. 
	 * If you use your own event management code, change it as required.
	 */
	if (window.addEventListener)
        	/** DOMMouseScroll is for mozilla. */
        	window.addEventListener('DOMMouseScroll', wheel, false);
	/** IE/Opera. */
	window.onmousewheel = document.onmousewheel = wheel;

	this.focusOn(gElem);
}

SVGzoom.prototype = {
	focusOn: function (gElem,/*optional*/ other) {
		if(gElem) {
			if(!other)
				other=gElem;
			this.other = other;
			
			if(gElem!=this.gElem) {
				this.gElem = gElem;
				var gId=gElem.getAttribute('id');
				if(!gId) {
					gId='GPoint';
					gElem.setAttribute('id',gId);
				}
				this.useElem.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+gId);
			}
		}
	},
	rescale: function (sw,/*optional*/ sh) {
		if(typeof sh != 'number') {
			sh=sw;
		}
		this.pageScaleX=sw;
		this.pageScaleY=sh;
	}
};
