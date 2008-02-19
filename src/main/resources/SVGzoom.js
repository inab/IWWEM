/*
	Zooming functions for SVG: made by José María Fernández, 2008
*/
function SVGzoom(doc,gElem,/* optional */scale) {
	var zoomW=150;
	var zoomH=150;
	var xPos=0;
	var yPos=0;
	
	var gId=gElem.getAttribute('id');
	if(!gId) {
		gId='GPoint';
		gElem.setAttribute('id',gId);
	}
	var clipId='ZOOMclip';
	if(!scale) {
		scale=3;
	}
	var SVGNS='http://www.w3.org/2000/svg';
	
	var clipRect=doc.createElementNS(SVGNS,"rect");
	clipRect.setAttribute('width',zoomW);
	clipRect.setAttribute('height',zoomH);
	var clipPath=doc.createElementNS(SVGNS,"clipPath");
	clipPath.setAttribute('id',clipId);
	clipPath.appendChild(clipRect);
	
	var backClip=doc.createElementNS(SVGNS,"rect");
	//backClip.setAttribute('id','backclip');
	backClip.setAttribute('width',zoomW);
	backClip.setAttribute('height',zoomH);
	backClip.setAttribute('style',"fill:white;stroke:black;");
	
	var forthClip=doc.createElementNS(SVGNS,"rect");
	forthClip.setAttribute('width',zoomW);
	forthClip.setAttribute('height',zoomH);
	forthClip.setAttribute('style',"stroke:black;fill:none");
	
	var useElem=doc.createElementNS(SVGNS,"use");
	useElem.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+gId);
	useElem.setAttribute('transform','scale('+scale+') translate(0 0)');
	
	var useElemG=doc.createElementNS(SVGNS,"g");
	useElemG.setAttribute('clip-path','url(#'+clipId+')');
	useElemG.appendChild(useElem);
	
	var conG=doc.createElementNS(SVGNS,"g");
	conG.setAttribute('display','none');
	conG.setAttribute('transform','translate(0 0)');
	conG.appendChild(backClip);
	conG.appendChild(useElemG);
	conG.appendChild(forthClip);
	
	var zoomTextNode = doc.createTextNode("To switch zoom function click graph and then press Ctrl or Z");
	var zoomText=doc.createElementNS(SVGNS,"text");
	zoomText.setAttribute("x","2");
	zoomText.setAttribute("y","12");
	zoomText.setAttribute("text-anchor","start");
	zoomText.setAttribute("style", "font-family:Arial; font-size:8pt;fill:red;");
	zoomText.appendChild(zoomTextNode);

	doc.documentElement.appendChild(clipPath);
	doc.documentElement.appendChild(conG);
	doc.documentElement.appendChild(zoomText);
	
	// Inverse matriz needed to apply coordinate transformations
	//var mInv = gElem.getScreenCTM().inverse();
	var gVis=undefined;
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
		if(gVis) {
			// var p = doc.documentElement.createSVGPoint();
			var x = xPos;
			var y = yPos;
			//p = p.matrixTransform(mInv);
			x -= zoomW/(2*scale);
			y -= zoomH/(2*scale);
			conG.setAttribute('transform','translate('+(xPos-zoomW/2)+' '+(yPos-zoomH/2)+')');
			useElem.setAttribute('transform','scale('+scale+') translate(-'+(x)+' -'+(y)+')');
		}
	};
	
	doc.documentElement.addEventListener('mousemove',realZoom,false);
	
	doc.documentElement.addEventListener('keydown',function(evt) {
		if(evt.keyCode == 17 || evt.keyCode==90) {
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
	doc.documentElement.addEventListener('keydown',function(evt) {
		if(evt.keyCode == 17) {
			//scale *= 1.5;
			conG.setAttribute('display','inherit');
			realZoom(evt);
		}
	},false);
	
	doc.documentElement.addEventListener('keyup',function(evt) {
		if(evt.keyCode == 17) {
			//scale /= 1.5;
			conG.setAttribute('display','none');
			realZoom(evt);
		}
	},false);
	*/
}
