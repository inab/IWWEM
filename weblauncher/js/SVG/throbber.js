function Throbber(SVGDoc,container,colour,nSlices,x,y,isDissolve) {
	var SVGroot=SVGDoc.documentElement;
	var SVGNS=(SVGroot.namespaceURI)?SVGroot.namespaceURI:'http://www.w3.org/2000/svg';
	var throbberGroup = SVGDoc.createElementNS(SVGNS,'g');
	if(!container)
		container=SVGroot;
	if(!colour)
		colour='blue';
	if(!nSlices || nSlices<3)
		nSlices=12;
	if(!x)
		x=0;
	if(!y)
		y=x;
	throbberGroup.setAttribute('stroke-width','15');
	throbberGroup.setAttribute('stroke-linecap','round');
	throbberGroup.setAttribute('stroke',colour);
	throbberGroup.setAttribute('transform','translate('+x+' '+y+')');
	
	var angle=360/nSlices;
	var opac=1/nSlices;
	
	if(isDissolve) {
		var slice=SVGDoc.createElementNS(SVGNS,'line');
		this.slice=slice;
		slice.setAttribute('x1',0);
		slice.setAttribute('y1',-35);
		slice.setAttribute('x2',0);
		slice.setAttribute('y2',-60);
		this.tid=Throbber.lastId++;
		var id='__throbber'+(this.tid);
		slice.setAttribute('id',id);
		throbberGroup.appendChild(slice);

		for(var i=1;i<nSlices;i++) {
			var clone=SVGDoc.createElementNS(SVGNS,'use');
			clone.setAttributeNS(Throbber.XLINKNS,'href','#'+id);
			clone.setAttribute('transform','rotate('+(i*angle)+' 0 0)');
			clone.setAttribute('opacity',opac*i);
			throbberGroup.appendChild(clone);
		}
	} else {
		for(var i=0;i<nSlices;i++) {
			var slice=SVGDoc.createElementNS(SVGNS,'line');
			slice.setAttribute('x1',0);
			slice.setAttribute('y1',-35);
			slice.setAttribute('x2',0);
			slice.setAttribute('y2',-60);
			if(i==0) {
				this.slice=slice;
			} else {
				slice.setAttribute('transform','rotate('+(i*angle)+' 0 0)');
				slice.setAttribute('opacity',opac*i);
			}
			throbberGroup.appendChild(slice);
		}
	}
	container.appendChild(throbberGroup);
	this.container=container;
	this.tOutId=undefined;
}

Throbber.lastId=0;
Throbber.XLINKNS='http://www.w3.org/1999/xlink';
// These ones are here to circumvent ASV limitations
Throbber.pending=new Object();
Throbber.pendingTimer=new Object();
Throbber.doTick=function(slot) {
	Throbber.pending[slot].tick();
};

Throbber.prototype={
	tick: function() {
		var node=this.slice;
		var opac=node.getAttribute('opacity');
		var susId=undefined;
		try {
			susId=this.container.suspendRedraw(60);
		} catch(e) {
			// Adobe does not implement it!
		}
		for(node=node.nextSibling;node;node=node.nextSibling) {
			var newopac=node.getAttribute('opacity');
			if(!opac) {
				node.removeAttribute('opacity');
			} else {
				node.setAttribute('opacity',opac);
			}
			opac=newopac;
		}
		if(!opac) {
			this.slice.removeAttribute('opacity');
		} else {
			this.slice.setAttribute('opacity',opac);
		}
		if(susId!=undefined) {
			this.container.unsuspendRedraw(susId);
		}
	},
	start: function(speed) {
		if(!speed || speed<100) {
			speed=250;
		}
		this.stop();
		var th=this;
		Throbber.pending[this.tid]=this;
		var tOutId=setInterval("Throbber.doTick("+this.tid+")",speed);
		Throbber.pendingTimer[this.tid]=tOutId;
	},
	stop: function() {
		if(this.tid in Throbber.pendingTimer) {
			var tOutId=Throbber.pendingTimer[this.tid];
			clearInterval(tOutId);
			delete Throbber.pending[this.tid]
			delete Throbber.pendingTimer[this.tid]
		}
	}
};
