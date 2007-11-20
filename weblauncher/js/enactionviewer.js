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

function EnactionViewerCustomDispose() {
	if(this.enactview && this.enactview.svg) {
		this.enactview.svg.clearSVG();
	}
}

function WorkflowStep(stepDOM, /* optional */ parentStep) {
	this.name=stepDOM.getAttribute('name');
	this.state=stepDOM.getAttribute('state');
	this.parentStep=parentStep;
	this.input={};
	this.output={};
	for(var child = stepDOM.firstChild; child; child = child.nextSibling) {
		if(child.nodeType==1) {
			switch(child.tagName) {
				case 'iterations':
					var iterations=new Array();
					for(var iter=child.firstChild;iter;iter=iter.nextSibling) {
						if(child.nodeType==1 && child.tagName=='step') {
							iterations.push(new WorkflowStep(iter,this));
						}
					}
					// To finish
					this.iterations=iterations;
					break;
				case 'input':
					// Baclava not cached (yet)
					this.input[child.getAttribute('name')]=undefined;
					break;
				case 'output':
					// Baclava not cached (yet)
					this.output[child.getAttribute('name')]=undefined;
					break;
			}
		}
	}
}

/* Data viewer, the must-be royal crown */
function DataViewer(dataviewerId,genview) {
	this.genview=genview;
	
	this.dataviewerDiv=genview.getElementById(dataviewerId);
}

/* Window handling code */
function EnactionView(genview) {
	this.genview=genview;
	
	// Relevant objects, ordered by document appearance
	this.dateSpan=genview.getElementById('dateSpan');
	this.generalStatusSpan=genview.getElementById('generalStatusSpan');
	this.stageSpan=genview.getElementById('stageSpan');
	this.statusSpan=genview.getElementById('statusSpan');
	
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
	
	this.iterationSelect=genview.getElementById('iterationSelect');
	this.inContainer=genview.getElementById('inputs');
	this.outContainer=genview.getElementById('outputs');
	
	this.IOTypeSpan=genview.getElementById('IOTypeSpan');
	this.IONameSpan=genview.getElementById('IONameSpan');
	this.mimeSelect=genview.getElementById('mimeSelect');
	this.dataviewer=new DataViewer('dataviewer',genview);
	
	var enactview=this;
	
	this.check=genview.getElementById('confirm');
	GeneralView.initCheck(this.check);
	WidgetCommon.addEventListener(this.check,'click', function() {
		if(this.checked) {
			this.setCheck(false);
		} else {
			this.setCheck(true);
		}
	},false);
	
	this.messageDiv=genview.getElementById('messageDiv');
	// Now, transient divs
	
	// viewOtherEnaction is not needed at this level
	this.formViewEnaction=genview.getElementById('formViewEnaction');
	this.jobIdField=genview.getElementById('jobId');
	
	this.snapshotEnaction=genview.getElementById('snapshotEnaction');
	this.snapshotName=genview.getElementById('snapshotName');
	// formSnapshotEnaction is not needed at this level
	// snapshotDesc is dynamic, so it is not caught here
	this.snapshotDescContainer=genview.getElementById('snapshotDescContainer');
	
	// Now, time to initialize all!

	//this.JobsBase=undefined;
	//
	//this.domStatus=undefined;
	this.internalDispose();
	
	
	
	// At last, getting the enaction id
	var qsParm=new Array();
	WidgetCommon.parseQS(qsParm);
	if(('jobId' in qsParm) && qsParm['jobId'] && qsParm['jobId'].length > 0) {
		var jobId=qsParm['jobId'];
		this.reloadStatus(jobId,true);
	} else {
		this.openOtherEnactionFrame();
	}
}

EnactionView.getJobDir = function(jobId) {
	if(jobId) {
		jobId=jobId.toString();
		if(jobId.indexOf('snapshot:')==0) {
			jobId=jobId.substring(jobId.lastIndexOf(':')+1);
		}
	}
	
	return jobId;
};
	
EnactionView.prototype = {
	openReloadFrame: function () {
		this.genview.openFrame('reloadEnaction');
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame();
	},
	
	clearView: function () {
		this.svg.removeSVG();
		
		// TODO
		// Some free containers will be here
		this.clearMimeSelect();
		this.dataviewer.clearView();
		GeneralView.freeContainer(this.dateSpan);
		GeneralView.freeContainer(this.generalStatusSpan);
		GeneralView.freeContainer(this.stageSpan);
		GeneralView.freeContainer(this.statusSpan);
		GeneralView.freeContainer(this.IOTypeSpan);
		GeneralView.freeContainer(this.IONameSpan);
	},
	
	clearMimeSelect: function() {
		for(var ri=this.mimeSelect.length-1;ri>=0;ri--) {
			this.mimeSelect.remove(ri);
		}
	},
	
	internalDispose: function() {
		this.JobsBase=undefined;
		this.domStatus=undefined;
		this.svg.removeSVG();
		this.initializedSVG=undefined;
		this.waitingSVG=undefined;
		this.stepCache={};
		// TODO?
	},
	
	fillEnactionStatus: function(enactDOM) {
		// First, get the jobs rel uri
		var statusL=enactDOM.getElementsByTagName('enactionstatus');
		
		// Second, get the relevant information 
		for(var i=0;i< statusL.length;i++) {
			var enStatus=statusL.item(i);
			if(enStatus.getAttribute('jobId')==this.jobId) {
				this.jobDir=EnactionView.getJobDir(this.jobId);
				this.JobsBase=enStatus.getAttribute('relURI');
				this.domStatus=enStatus;
				
				this.dateSpan.innerHTML=enStatus.getAttribute('time');
				
				var state=enStatus.getAttribute('state');
				
				// First run
				if(state!='unknown' && !this.initializedSVG) {
					this.initializedSVG=1;
					var enactview=this;
					this.waitingSVG=1;
					this.svg.loadSVG(GeneralView.SVGDivId,
						this.JobsBase+'/'+this.jobDir+'/workflow.svg',
						'100mm',
						'120mm',
						function() {
							alert('cachondeo');
							enactview.clearJobNodes();
							enactview.waitingSVG=undefined;
							enactview.refreshEnactionStatus(state);
						});
				} else {
					if(state=='unknown') {
						this.waitingSVG=1;
					}
					this.refreshEnactionStatus(state);
				}
				
				// Found, so no more iterations
				break;
			}
		}
	},
	
	refreshEnactionStatus: function(state) {
		var gstate=state;
		if(state=='dead' || state=='error') {
			gstate="<span style='color:red'><b>"+gstate+"</b></span>";
			this.errorJobNodes();
		} else if(state=='running' || state=='unknown') {
			gstate='<i>'+gstate+'</i>';
			if(state=='unknown') {
				gstate='<b>'+gstate+'</b>';
			}
		}

		if(state=='finished') {
			this.finishedJobNodes();
		}

		this.generalStatusSpan.innerHTML=gstate;
		for(var child=this.domStatus.firstChild;child; child=child.nextSibling) {
			// Walking through the steps
			if(child.nodeType==1 && child.tagName=='step') {
				var stepName = child.getAttribute('name');
				var update=1;
				// Is it cached?
				if(stepName in this.stepCache) {
					var stepState=child.getAttribute('state');
					var prevStepState=this.stepCache[stepName].state;
					if(stepState==prevStepState && !this.stepCache[stepName].iterations) {
						update=undefined;
					}
				}
				// Updating the step cache
				if(update) {
					var step=new WorkflowStep(child);
					this.stepCache[step.name]=step;
					this.updateStepView(step);
				}
			}
		}
	},
	
	updateStepView: function(step) {
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			// Setting the fill
			switch(step.state) {
				case 'queued':
					tramp.changeNodeFill(step.name,'violet');
					break;
				case 'running':
					tramp.changeNodeFill(step.name,'yellow');
					break;
				case 'finished':
					tramp.changeNodeFill(step.name,'green');
					break;
				case 'error':
					tramp.changeNodeFill(step.name,'red');
					break;
			}
			
			// And the click property
			switch(step.state) {
				case 'running':
				case 'finished':
				case 'error':
					var enactview=this;
					tramp.setNodeHandler(step.name,function () {
						enactview.showStepFromId(this.getAttribute("id"));
					},'click');
					break;
			}
		} finally {
			tramp.unsuspendRedraw(susId);
		}
	},
	
	showStepFromId: function (theid) {
		var nodeToTitle=this.svg.getNodeToTitle();
		if(theid in nodeToTitle) {
			var step=this.stepCache[nodeToTitle[theid]];
			// To finish
			this.stageSpan.innerHTML=step.name;
			this.statusSpan.innerHTML=step.state;
			GeneralView.freeContainer(this.inContainer);
			for(var input in step.input) {
				this.inContainer.innerHTML += input+'<br>';
			}
			GeneralView.freeContainer(this.outContainer);
			for(var output in step.output) {
				this.outContainer.innerHTML += output+'<br>';
			}
		}
	},
	
	clearJobNodes: function() {
		var titleToNode=this.svg.getTitleToNode();
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			for(var tit in titleToNode) {
				if(tit.indexOf('WORKFLOWINTERNALSOURCE')!=0) {
					tramp.changeNodeFillOpacity(tit,'0.0');
				}
			}
		} finally {
			tramp.unsuspendRedraw(susId);
		}
	},
	
	errorJobNodes: function() {
		var titleToNode=this.svg.getTitleToNode();
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			for(var tit in titleToNode) {
				if(tit.indexOf('WORKFLOWINTERNALSINK')==0) {
					tramp.changeNodeFill(tit,'red');
				}
			}
		} finally {
			tramp.unsuspendRedraw(susId);
		}
	},
	
	finishedJobNodes: function() {
		var titleToNode=this.svg.getTitleToNode();
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			for(var tit in titleToNode) {
				if(tit.indexOf('WORKFLOWINTERNALSINK')==0) {
					tramp.changeNodeFillOpacity(tit,'1.0');
				}
			}
		} finally {
			tramp.unsuspendRedraw(susId);
		}
	},
	
	reloadStatus: function(jobId,isFullReload,snapshotName,snapshotDesc) {
		// Getting the enaction information
		if(!jobId)  jobId=this.jobId;
		var qsParm = new Array();
		qsParm['jobId']=jobId;
		if(snapshotName) {
			qsParm['snapshotName']=snapshotName;
			if(snapshotDesc) {
				qsParm['snapshotDesc']=snapshotDesc;
			}
		}
		var enactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
		var enactQueryReq = this.enactQueryReq = new XMLHttpRequest();
		enactQueryReq.enactview=this;
		// Cleaning up obsolete resources
		if(isFullReload) {
			this.internalDispose();
		}
		this.jobId=jobId;
		GeneralView.freeContainer(this.messageDiv);
		try {
			enactQueryReq.onreadystatechange = function() {
				if(enactQueryReq.readyState==4) {
					try {
						if('status' in enactQueryReq) {
							if(enactQueryReq.status==200) {
								if(enactQueryReq.parseError && enactQueryReq.parseError.errorCode!=0) {
									enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR ('+
										enactQueryReq.parseError.errorCode+
										") while parsing list at ("+
										enactQueryReq.parseError.line+
										","+enactQueryReq.parseError.linePos+
										"):</h1></blink><pre>"+enactQueryReq.parseError.reason+"</pre>";
								} else {
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
								}
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in enactQueryReq) && enactQueryReq['statusText']) {
									statusText=enactQueryReq.statusText;
								}
								enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR while collecting enaction status: '+
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
			this.check.setCheck(false);
			if(sureDispose) {
				this.openOtherEnactionFrame(true);
			}
		}
	},
	
	openOtherEnactionFrame: function(/* optional */ isFullDispose) {
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
		
		this.genview.openFrame('viewOtherEnaction');
	},
	
	viewEnaction: function() {
		if(this.jobIdField.value && this.jobIdField.value.length>0) {
			// Let's submit the query
			this.genview.closeFrame();
			this.reloadStatus(this.jobIdField.value);
		} else {
			alert('You must enter an enaction Id\nbefore watching its evolution.');
		}
	},
	
	closeOtherEnactionFrame: function() {
		if(this.jobId) {
			this.genview.closeFrame();
		} else {
			alert('You must enter an enaction Id\nbecause there is no previous known enaction.');
		}
	},
	
	openSnapshotFrame: function() {
		if(FCKeditor_IsCompatibleBrowser()) {
			// Rich-Text Editor
			var snapshotDesc=new FCKeditor('snapshotDesc',undefined,'250','IWWEM');
			var basehref = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
			snapshotDesc.BasePath='js/FCKeditor/';
			snapshotDesc.Config['CustomConfigurationsPath']=basehref+'/js/fckconfig_IWWEM.js';
			this.snapshotDescContainer.innerHTML = snapshotDesc.CreateHtml();
		} else {
			// I prefer my own defaults
			var snapshotDesc=this.genview.createElement('textarea');
			snapshotDesc.cols=60;
			snapshotDesc.rows=10;
			snapshotDesc.name='snapshotDesc';
			this.snapshotDescContainer.appendChild(snapshotDesc);
		}
		this.genview.openFrame('snapshotEnaction');
	},
	
	takeSnapshot: function() {
		if(this.snapshotName.value && this.snapshotName.value.length>0) {
			var snapshotName=this.snapshotName.value;
			var snapshotDesc;
			var snapDescInput=this.genview.getElementById('snapshotDesc');
			if(snapDescInput && snapDescInput.value) {
				snapshotDesc=snapDescInput.value;
			}
			this.closeSnapshotFrame();
			this.reloadStatus(undefined,false,snapshotName,snapshotDesc);
		} else {
			alert('Please, give a name to the snapshot before taking it');
		}
	},
	
	closeSnapshotFrame: function() {
		this.genview.closeFrame();
		GeneralView.freeContainer(this.snapshotDescContainer);
	}
};
