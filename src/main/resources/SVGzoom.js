/*
	$Id$
	SVGzoom.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/
/*
	Self-contained SVG Zooming functions
*/
function SVGzoom(doc,gElem,myMapApp,/*optional*/ scaleX, scaleY) {
	this.zoomW=150;
	this.zoomH=150;
	
	this.scaleX=(typeof scaleX != 'number')?3:scaleX;
	this.scaleY=(typeof scaleY != 'number')?this.scaleX:scaleY;
	this.pageScaleX=this.pageScaleY=1;
	
	var gId=gElem.getAttribute('id');
	if(!gId) {
		gId='GPoint';
		gElem.setAttribute('id',gId);
	}
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
	useElem.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+gId);
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
	zoomText.setAttribute("x","2");
	zoomText.setAttribute("y","12");
	zoomText.setAttribute("text-anchor","start");
	zoomText.setAttribute("style", "font-family:Arial; font-size:8px;fill:red;");
	zoomText.appendChild(zoomTextNode);
	
	var docEl=doc.documentElement;
	docEl.appendChild(conG);
	docEl.appendChild(zoomText);
	
	// Inverse matriz needed to apply coordinate transformations
	var thiszoom=this;
	var xPos=0;
	var yPos=0;
	var gVis=undefined;
	var canEnter=true;
	var realZoom=function(evt) {
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
		if(gVis && canEnter) {
			canEnter=undefined;
			if(typeof xPos != 'number') {
				xPos=0;
			}
			
			if(typeof yPos != 'number') {
				yPos=0;
			}
			
			var point=docEl.createSVGPoint();
			point.x=xPos;
			point.y=yPos;
			point = myMapApp.calcPointCoord(point,docEl);
			var xPosTrans=point.x;
			var yPosTrans=point.y;
			
			var x = xPosTrans;
			var y = yPosTrans;
			x -= thiszoom.zoomW/(2.0*thiszoom.scaleX);
			y -= thiszoom.zoomH/(2.0*thiszoom.scaleY);
			conG.setAttribute('transform','translate('+(xPosTrans-thiszoom.zoomW/2.0)+' '+(yPosTrans-thiszoom.zoomH/2.0)+')');
			useElem.setAttribute('transform','scale('+(thiszoom.scaleX)+' '+(thiszoom.scaleY)+') translate('+(-x)+' '+(-y)+')');
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
}

SVGzoom.prototype = {
	rescale: function (sw,/*optional*/ sh) {
		if(typeof sh != 'number') {
			sh=sw;
		}
		this.pageScaleX=sw;
		this.pageScaleY=sh;
	}
};
