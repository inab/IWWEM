/*
	enactionviewer.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function EnactionViewerCustomInit() {
	this.enactview=new EnactionView(this);
}

/* Window handling code */
function EnactionView(genview) {
	this.genview=genview;
	this.svgdiv=genview.thedoc.getElementById('svgdiv');
	this.check=genview.thedoc.getElementById('confirm');
	
	this.svg=new TavernaSVG(this.svgdiv.id,'style/unknown.svg','75mm','90mm');
	this.internalDispose();
	
	// At last, getting the enaction id
	var qsParm=new Array();
	WidgetCommon.parseQS(qsParm);
	if(('jobId' in qsParm) && qsParm['jobId'] && qsParm['jobId'].length > 0) {
		this.jobId=qsParm['jobId'];
		this.reloadStatus(true);
	} else {
		this.otherEnactionFrame();
	}
}

EnactionView.prototype = {
	openReloadFrame: function () {
		this.genview.openFrame('reloadWorkflows');
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame();
	},
	
	clearView: function () {
		this.svg.removeSVG();
		
		// TODO
		// Some free containers will be here
	},
	
	internalDispose: function() {
		this.wfDOM=undefined;
		this.svg.removeSVG();
		// TODO?
	},
	
	fillEnactionStatus: function(enactDOM) {
	},
	
	reloadStatus: function(isFullReload) {
		// Getting the enaction information
		var qsParm = new Array();
		qsParm['jobId']=this.jobId;
		var enactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
		var enactQueryReq = this.enactQueryReq = new XMLHttpRequest();
		enactQueryReq.enactview=this;
		// Cleaning up obsolete resources
		if(isFullReload) {
			this.internalDispose();
		}
		try {
			enactQueryReq.onreadystatechange = function() {
				if(enactQueryReq.readyState==4) {
					try {
						if('status' in enactQueryReq) {
							if(enactQueryReq.status==200) {
								var response = enactQueryReq.responseXML;
								if(!response) {
									if(enactQueryReq.responseText) {
										var parser = new DOMParser();
										response = parser.parseFromString(enactQueryReq.responseText,'application/xml');
									} else {
										// TODO
										// Backend error.
									}
								}
								enactQueryReq.enactview.fillEnactionStatus(response);
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in enactQueryReq) && enactQueryReq['statusText']) {
									statusText=enactQueryReq.statusText;
								}
								enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR while fetching list: '+
									enactQueryReq.status+' '+statusText+'</h1></blink>';
							}
						} else {
							enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR F: Please notify it to INB Web Workflow Manager developer</h1></blink>';
						}
					} catch(e) {
						enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
					} finally {
						// Removing 'Loading...' frame
						enactQueryReq.enactview.closeReloadFrame();
						enactQueryReq.enactview.enactQueryReq=undefined;
						enactQueryReq=undefined;
					}
				}
			};
			this.openReloadFrame();
			enactQueryReq.open('GET',enactQuery,true);
			enactQueryReq.send(null);
		} catch(e) {
			this.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
		}
	},
	
	disposeEnaction: function() {
		if(this.check.checked) {
			var sureDispose=confirm('Are you REALLY sure you want to dispose this enaction?');
			this.check.checked=false;
			if(sureDispose) {
				this.otherEnactionFrame(true);
			}
		}
	},
	
	otherEnactionFrame: function(/* optional */ isFullDispose) {
		if(isFullDispose) {
			if(this.jobId) {
				var dispo=new XMLHttpRequest();
				var qsParm=new Array();
				qsParm['jobId']=this.jobId;
				qsParm['dispose']=1;
				var disposeQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
				dispo.open('GET',disposeQuery);
				dispo.send(null);
			}
			this.internalDispose();
		}
		
		var oldJobId=this.jobId;
		var newJobId=undefined;
		do {
			// TODO
		} while(!newJobId);
		
		this.jobId=newJobId;
		
		this.reloadStatus((oldJobId && oldJobId!=newJobId)?true:undefined);
	}
};
