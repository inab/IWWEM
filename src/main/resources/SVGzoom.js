/*
	SVGzoom.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/
/*
	Self-contained SVG Zooming functions
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
	
	var backClip=doc.createElementNS(SVGNS,"rect");
	//backClip.setAttribute('id','backclip');
	backClip.setAttribute('width',zoomW+'px');
	backClip.setAttribute('height',zoomH+'px');
	backClip.setAttribute('style',"fill:white;stroke:black;");
	
	var forthClip=doc.createElementNS(SVGNS,"rect");
	forthClip.setAttribute('width',zoomW+'px');
	forthClip.setAttribute('height',zoomH+'px');
	forthClip.setAttribute('style',"stroke:black;fill:none");
	
	var useElem=doc.createElementNS(SVGNS,"use");
	useElem.setAttributeNS('http://www.w3.org/1999/xlink','href','#'+gId);
	useElem.setAttribute('transform','scale('+scale+') translate(0 0)');
	
	var svgG=doc.createElementNS(SVGNS,"svg");
	svgG.setAttribute('width',zoomW+'px');
	svgG.setAttribute('height',zoomH+'px');
	svgG.appendChild(backClip);
	svgG.appendChild(useElem);
	svgG.appendChild(forthClip);
	
	var conG=doc.createElementNS(SVGNS,"g");
	conG.setAttribute('style','cursor:move;');
	conG.setAttribute('display','none');
	conG.setAttribute('transform','translate(0 0)');
	conG.appendChild(svgG);
	
	var zoomTextNode = doc.createTextNode("To switch zoom function click graph and then press Ctrl or Z");
	var zoomText=doc.createElementNS(SVGNS,"text");
	zoomText.setAttribute("x","2");
	zoomText.setAttribute("y","12");
	zoomText.setAttribute("text-anchor","start");
	zoomText.setAttribute("style", "font-family:Arial; font-size:8px;fill:red;");
	zoomText.appendChild(zoomTextNode);

	doc.documentElement.appendChild(conG);
	doc.documentElement.appendChild(zoomText);
	
	// Inverse matriz needed to apply coordinate transformations
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
			
			var x = xPos;
			var y = yPos;
			x -= zoomW/(2.0*scale);
			y -= zoomH/(2.0*scale);
			conG.setAttribute('transform','translate('+(xPos-zoomW/2.0)+' '+(yPos-zoomH/2.0)+')');
			useElem.setAttribute('transform','scale('+scale+') translate('+(-x)+' '+(-y)+')');
			canEnter=true;
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
