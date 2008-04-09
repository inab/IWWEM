/*
	$Id$
	enactionviewer.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function EnactionViewerCustomInit() {
	this.enactview=new EnactionView(this);
	this.enactview.init();
}

function EnactionViewerCustomDispose() {
	if(this.enactview && this.enactview.svg) {
		this.enactview.svg.clearSVG();
	}
}

/* Window handling code */
function EnactionView(genview) {
	this.genview=genview;
	
	// Relevant objects, ordered by document appearance
	this.dateSpan=genview.getElementById('dateSpan');
	this.generalStatusSpan=genview.getElementById('generalStatusSpan');
	this.stageSpan=genview.getElementById('stageSpan');
	this.stageStateSpan=genview.getElementById('stageStateSpan');
	
	// Detailed info about a step
	this.datatreeview=new DataTreeView(genview,'dataTreeDiv','databrowser','mimeInfoSelect','extractData');
	
	// Update button text
	this.updateTextSpan=genview.getElementById('updateTextSpan');
	
	var enactview = this;
	
	this.reloadButton=genview.getElementById('reloadButton');
	WidgetCommon.addEventListener(this.reloadButton,'click',function() {
		enactview.reloadStatus();
	},false);
	
	this.snapButton=genview.getElementById('snapButton');
	WidgetCommon.addEventListener(this.snapButton,'click',function() {
		enactview.openSnapshotFrame();
	},false);
	
	this.killButton=genview.getElementById('killButton');
	WidgetCommon.addEventListener(this.killButton,'click',function() {
		enactview.disposeEnaction();
	},false);
	
	this.disposeButton=genview.getElementById('disposeButton');
	WidgetCommon.addEventListener(this.disposeButton,'click',function() {
		enactview.disposeEnaction(1);
	},false);
	
	//this.svg=new TavernaSVG();
	
	this.frameViewId=undefined;
	this.frameOtherId=undefined;
	this.frameSnapId=undefined;
	
	var check = this.check=new GeneralView.Check(genview.getElementById('confirm'));
	this.check.addEventListener('click', function() {
		if(check.checked) {
			check.doUncheck();
		} else {
			check.doCheck();
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
	
	// Important update facets
	this.enactQueryReq=undefined;
	this.updateTimer=undefined;
	
	// Now, time to initialize all!

	//this.JobsBase=undefined;
	//
	//this.domStatus=undefined;
	
	this.stepClickHandler = function (event) {
		var theid;
		if(typeof event == 'string') {
			theid=event;
		} else {
			var target;
			if(this.getAttribute) {
				target=this;
			} else {
				if(!event)  event=window.event;
				target=(event.currentTarget)?event.currentTarget:event.srcElement;
			}
			theid=target.getAttribute("id");
		}
		
		enactview.showStepFromId(theid);
	};
	
	this.jobClickHandler = function (event) {
		var theid;
		if(typeof event == 'string') {
			theid=event;
		} else {
			var target;
			if(this.getAttribute) {
				target=this;
			} else {
				if(!event)  event=window.event;
				target=(event.currentTarget)?event.currentTarget:event.srcElement;
			}
			theid=target.getAttribute("id");
		}
		
		enactview.showWorkflowJobFromId(theid);
	};
	
	// At last, getting the enaction id
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
	// SVG resize
	WidgetCommon.addEventListener(window,'resize',function() {
		enactview.updateSVGSize();
	},false);
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

EnactionView.BaseHREF = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));

EnactionView.BranchClick = function (event) {
	if(!event)  event=window.event;
	var target=(event.currentTarget)?event.currentTarget:event.srcElement;
	if(target.parentNode.className=='branch' || target.parentNode.className=='scrollbranch') {
		target.className+='open';
		target.parentNode.className+='open';
	} else {
		target.className='branchlabel';
		target.parentNode.className=(target.parentNode.className.indexOf('scroll')!=-1)?'scrollbranch':'branch';
	}
};
	
EnactionView.ScrollClick = function (event) {
	if(!event)  event=window.event;
	var target=(event.currentTarget)?event.currentTarget:event.srcElement;
	var next=target.nextSibling;
	if(target.className.indexOf('no')!=-1) {
		target.innerHTML=' [\u2212]';
		target.className='scrollswitch';
		next.className+=' scrollbranchcontainer';
	} else {
		target.innerHTML=' [=]';
		target.className='noscrollswitch';
		next.className='branchcontainer';
	}
};

EnactionView.NoSelect = function (event) {
	return false;
};
	
EnactionView.prototype = {
	init: function() {
		var datatreeview=this.datatreeview;
		var enactview=this;
		this.svg.removeSVG(function() {
			datatreeview.matcher.addMatchers(['EVpatterns.xml'],enactview,function() {
				enactview.internalDispose(function() {
					var qsParm={};
					WidgetCommon.parseQS(qsParm);
					if(('jobId' in qsParm) && qsParm['jobId'] && qsParm['jobId'].length > 0) {
						var jobId=qsParm['jobId'];
						enactview.reloadStatus(jobId,true);
					} else {
						enactview.openOtherEnactionFrame();
					}
				});
			});
		});
	},
	
	openReloadFrame: function () {
		this.frameViewId=this.genview.openFrame('reloadEnaction',1);
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame(this.frameViewId);
	},
	
	clearView: function () {
		var enactview=this;
		this.svg.removeSVG(function() {
			enactview.clearViewInternal();
		});
	},
	
	clearViewInternal: function () {
		
		this.step=undefined;
		this.istep=undefined;
		this.setStep();
		
		// TODO
		// Some free containers will be here
		GeneralView.freeContainer(this.dateSpan);
		GeneralView.freeContainer(this.generalStatusSpan);
		GeneralView.freeContainer(this.stageSpan);
		GeneralView.freeContainer(this.stageStateSpan);
		
		this.datatreeview.clearView();
	},
	
	internalDispose: function(/*optional*/callbackFunc) {
		var enactview=this;
		this.svg.removeSVG(function() {
			enactview.internalDisposeInternal();
			if(typeof callbackFunc=='function') {
				callbackFunc();
			}
		});
	},
	
	internalDisposeInternal: function() {
		this.jobId=undefined;
		this.JobsBase=undefined;
		this.jobDir=undefined;
		this.domStatus=undefined;
		this.initializedSVG=undefined;
		this.waitingSVG=undefined;
		this.stepCache={};
		this.datatreeview.clearSelect();
		this.step=undefined;
		this.istep=undefined;
		this.setStep();
		this.state='unknown';
		this.reloadButton.className='button';
		this.snapButton.className='button';
		this.killButton.className='button';
		// TODO?
	},
	
	fillEnactionStatus: function(enactDOM,/*optional*/ callbackFill) {
		// First, get the jobs rel uri
		var statusL=GeneralView.getElementsByTagNameNS(enactDOM,GeneralView.IWWEM_NS,'enactionstatus');
		
		// Second, get the relevant information
		for(var i=0;i< statusL.length;i++) {
			var enStatus=statusL.item(i);
			if(enStatus.getAttribute('jobId')==this.jobId) {
				this.jobDir=EnactionView.getJobDir(this.jobId);
				this.JobsBase=enStatus.getAttribute('relURI');

				this.domStatus=enStatus;
				
				this.dateSpan.innerHTML=enStatus.getAttribute('time');
				
				var state = enStatus.getAttribute('state');
				
				// First run
				if(state!='unknown' && state!='queued' && !this.initializedSVG) {
					this.initializedSVG=1;
					var enactview=this;
					this.waitingSVG=1;
					var parentno=this.genview.getElementById(GeneralView.SVGDivId).parentNode;
					var maxwidth=(parentno.clientWidth-32)+'px';
					this.svg.loadSVG(GeneralView.SVGDivId,
						this.JobsBase+'/'+this.jobDir+'/workflow.svg',
//						'100mm',
//						'120mm',
						maxwidth,
						'120mm',
						function() {
							enactview.waitingSVG=undefined;
							enactview.refreshEnactionStatus(state,callbackFill);
						});
				} else {
					this.refreshEnactionStatus(state,callbackFill);
				}
				
				// Found, so no more iterations
				break;
			}
		}
	},
	
	genGraphicalState: function(state) {
		var gstate=state;
		switch(state) {
			case 'queued':
			case '':
				gstate="<tt>queued</tt>";
				break;
			case 'frozen':
				gstate="<span style='color:blue; font-weight: bold;'>"+gstate+"</span>";
				break;
			case 'dead':
			case 'error':
			case 'fatal':
			case 'dubious':
			case 'killed':
				gstate="<span style='color:red;font-weight: bold;'>"+gstate+"</span>";
				break;
			case 'unknown':
				gstate='<b>'+gstate+'</b>';
			case 'running':
				gstate="<span style='color:orange; font-style: italic;'>"+gstate+"</span>"
				break;
			case 'finished':
				gstate="<span style='color:green; font-weight: bold;'>"+gstate+"</span>";
		}

		return gstate;
	},
	
	refreshEnactionStatus: function(state,callbackFill) {
		if(!state)  state='undefined';
		
		this.state = state;
		
		if(
			state=='frozen' ||
			state=='dead' ||
			state=='error' ||
			state=='dubious' ||
			state=='fatal' ||
			state=='killed' ||
			state=='finished'
		) {
			this.reloadButton.className='buttondisabled';
			this.killButton.className='buttondisabled';
		} else {
			this.reloadButton.className='button';
			this.killButton.className='button';
		}
		if(state=='frozen') {
			this.snapButton.className='buttondisabled';
		} else {
			this.snapButton.className='button';
		}
		
		if(state!='unknown' && state!='queued' && state!='undefined') {
			// Updating the step cache for the meta-step
			// i.e., the workflow
			var step=new EnactionStep(this.domStatus);
			this.stepCache[this.jobId]=step;
			this.updateJobView(step);
			if(this.step && step.name==this.step.name) {
				this.setStep(step);
			}
			
			
			for(var child=this.domStatus.firstChild; child; child=child.nextSibling) {
				// Walking through the steps
				if(child.nodeType==1 && GeneralView.getLocalName(child)=='step') {
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
						var step=new EnactionStep(child);
						this.stepCache[step.name]=step;
						this.updateStepView(step);
						if(this.step && step.name==this.step.name) {
							this.setStep(step);
						}
					}
				}
			}
			if(typeof callbackFill == 'function') {
				callbackFill();
			}
		} else {
			var gstate=this.genGraphicalState(state);
			this.generalStatusSpan.innerHTML=gstate;
			this.svg.removeSVG(callbackFill);
		}
	},
	
	/* This method updates the size of the workflow */
	updateSVGSize: function () {
		var parentno=this.genview.getElementById(GeneralView.SVGDivId).parentNode;
		var maxwidth=(parentno.clientWidth-32)+'px';
		this.svg.SVGrescale(maxwidth,'120mm');
	},
	
	updateStepView: function(step) {
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		var color=undefined;
		switch(step.state) {
			case 'queued':
				//tramp.changeNodeFill(step.name,'violet');
				color='violet';
				break;
			case 'running':
				//tramp.changeNodeFill(step.name,'yellow');
				color='yellow';
				break;
			case 'finished':
				//tramp.changeNodeFill(step.name,'green');
				color='green';
				break;
			case 'error':
				//tramp.changeNodeFill(step.name,'red');
				color='red';
				break;
		}
		try {
			if(color!=undefined) {
				tramp.setNodeBulbColor(step.name,color);
			}
		} catch(e) {
			// Fallback for very old SVGs
			try {
				tramp.changeNodeFill(step.name,color);
			} catch(ee) {
				// Do Nothing(R)
			}
		}
			
		// And the click property
		switch(step.state) {
			case 'running':
			case 'finished':
			case 'error':
				var enactview=this;
				try {
					tramp.removeNodeHandler(step.name,this.stepClickHandler,'click');
				} catch(e) {
					// Do Nothing(R)
				}
				try {
					tramp.setNodeHandler(step.name,this.stepClickHandler,'click');
				} catch(e) {
					// DoNothing(R)
					alert(e);
				}
				break;
		}
		tramp.unsuspendRedraw(susId);
	},
	
	updateJobView: function(step) {
		var gstate=this.genGraphicalState(step.state);
		this.generalStatusSpan.innerHTML=gstate;
		
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			// And the click property
			switch(step.state) {
				case 'finished':
					this.finishedJobNodes();
					break;
			}
			
			// Setting up Input/Output handlers
			switch(step.state) {
				case 'queued':
					this.clearJobNodes();
					break;
				case 'error':
				case 'fatal':
				case 'dubious':
				case 'frozen':
				case 'dead':
					this.errorJobNodes(step.state);
				case 'running':
				case 'finished':
					var enactview=this;
					for(var input in step.input) {
						var sname='WORKFLOWINTERNALSOURCE_'+input;
						tramp.removeNodeHandler(sname,this.jobClickHandler,'click');
						tramp.setNodeHandler(sname,this.jobClickHandler,'click');
					}

					for(var output in step.output) {
						var sname='WORKFLOWINTERNALSINK_'+output;
						tramp.removeNodeHandler(sname,this.jobClickHandler,'click');
						tramp.setNodeHandler(sname,this.jobClickHandler,'click');
					}
					break;
			}
		} catch(e) {
			// DoNothing(R)
		}
		tramp.unsuspendRedraw(susId);
	},
	
	showStepFromId: function (theid) {
		var nodeToTitle=this.svg.getNodeToTitle();
		if(theid in nodeToTitle) {
			var step=this.stepCache[nodeToTitle[theid]];
			this.setStep(step);
		}
	},
	
	showWorkflowJobFromId: function (theid) {
		var step=this.stepCache[this.jobId];
		this.setStep(step);
	},
	
	getBaseHREF: function() {
		return EnactionView.BaseHREF;
	},
	
	setStep: function (step,/*optional*/ iteration) {
		// To finish
		if(!step) {
			step=this.step;
		}
		// Unfilling iterations
		this.datatreeview.clearSelect();

		if(step) {
			if(!iteration) {
				iteration=-1;
			} else {
				iteration=parseInt(iteration,10);
			}
			if(!this.step || this.step.name!=step.name || this.step!=step) {
				this.stageSpan.innerHTML=step.name;
				this.stageStateSpan.innerHTML=this.genGraphicalState(step.state);
			}
			this.step=step;
			this.istep=iteration;
			
			// Filling step information
			this.datatreeview.setStep(this,step,iteration);
		} else {
			// Clearing view
			this.datatreeview.clearContainers();
			this.stageSpan.innerHTML='NONE';
			this.stageStateSpan.innerHTML='NONE'
		}
	},
	
	clearJobNodes: function() {
		var titleToNode=this.svg.getTitleToNode();
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			for(var tit in titleToNode) {
				if(tit.indexOf('WORKFLOWINTERNALSOURCECONTROL')!=0) {
					tramp.changeNodeFillOpacity(tit,'0.0');
				}
			}
		} catch(e) {
			// DoNothing(R)
		}
		tramp.unsuspendRedraw(susId);
	},
	
	errorJobNodes: function(stateName) {
		var titleToNode=this.svg.getTitleToNode();
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			for(var tit in titleToNode) {
				if(tit.indexOf('WORKFLOWINTERNALSINK')==0) {
					//tramp.changeNodeFill(tit,(stateName=='frozen')?'blue':'red');
					tramp.setNodeBulbColor(tit,(stateName=='frozen')?'blue':'red');
				}
			}
		} catch(e) {
			// DoNothing(R)
		}
		tramp.unsuspendRedraw(susId);
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
		} catch(e) {
			// DoNothing(R)
		}
		tramp.unsuspendRedraw(susId);
	},
	
	setMessage: function(message) {
		this.messageDiv.innerHTML=message;
	},
	
	addMessage: function(message) {
		this.messageDiv.innerHTML+=message;
	},
	
	clearMessage: function() {
		GeneralView.freeContainer(this.messageDiv);
	},
	
	reloadStatus: function(/* optional */ jobId,isFullReload,snapshotName,snapshotDesc,isKill) {
		// Final states
		if(
			this.state=='frozen' ||
			this.state=='dead' ||
			this.state=='error' ||
			this.state=='fatal' ||
			this.state=='dubious' ||
			this.state=='killed' ||
			this.state=='finished'
		)  return;
		
		// In progress request
		if(this.enactQueryReq)  return;
		
		// Kill pending timer!
		if(this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer=undefined;
		}
		
		// Getting the enaction information
		if(!jobId)  jobId=this.jobId;
		var qsParm = {};
		qsParm['jobId']=jobId;
		if(snapshotName) {
			qsParm['snapshotName']=snapshotName;
			if(snapshotDesc) {
				qsParm['snapshotDesc']=snapshotDesc;
			}
		}
		if(isKill) {
			qsParm['dispose']='0';
		}
		var enactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
		this.clearMessage();
		
		// Cleaning up obsolete resources
		if(isFullReload) {
			this.internalDisposeInternal();
		}
		this.reloadStatusInternal(jobId,enactQuery);
	},
	
	reloadStatusInternal: function(jobId,enactQuery) {		
		this.jobId=jobId;
		var enactQueryReq = this.enactQueryReq = new XMLHttpRequest();
		var enactview=this;
		try {
			enactQueryReq.onreadystatechange = function() {
				if(enactQueryReq.readyState==4) {
					//enactview.closeReloadFrame();
					try {
						if('status' in enactQueryReq) {
							if(enactQueryReq.status==200) {
								if(enactQueryReq.parseError && enactQueryReq.parseError.errorCode!=0) {
									enactview.setMessage(
										'<blink><h1 style="color:red">FATAL ERROR ('+
										enactQueryReq.parseError.errorCode+
										") while parsing list at ("+
										enactQueryReq.parseError.line+
										","+enactQueryReq.parseError.linePos+
										"):</h1></blink><pre>"+
										enactQueryReq.parseError.reason+
										"</pre>"
									);
								} else {
									var response = enactQueryReq.responseXML;
									if(!response) {
										if(enactQueryReq.responseText) {
											var parser = new DOMParser();
											response = parser.parseFromString(enactQueryReq.responseText,'application/xml');
										} else {
											// TODO
											enactview.setMessage(
												'<blink><h1 style="color:red">FATAL ERROR B: Please notify it to INB Web Workflow Manager developer</h1></blink>'
											);
											// Backend error.
										}
									}
									var me=enactview;
									me.fillEnactionStatus(response.documentElement.cloneNode(true),function() {
										var state=me.state;
										// Only run timer when 
										if(
											state!='frozen' &&
											state!='dead' &&
											state!='error' &&
											state!='dubious' &&
											state!='killed' &&
											state!='finished'
										) {
											var timeout=11;
											var timeoutFunc=undefined;
											timeoutFunc=function() {
												timeout--;
												if(timeout>0) {
													me.updateTextSpan.innerHTML='Update in '+timeout;
													me.updateTimer=setTimeout(timeoutFunc,1000);
												} else {
													me.updateTextSpan.innerHTML='Update';
													me.reloadStatus();
													me=undefined;
													timeoutFunc=undefined;
												}
											};
											timeoutFunc();
										} else {
											me.updateTextSpan.innerHTML='Update';
										}
										// Removing 'Loading...' frame
									});
								}
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in enactQueryReq) && enactQueryReq['statusText']) {
									statusText=enactQueryReq.statusText;
								}
								enactview.setMessage(
									'<blink><h1 style="color:red">FATAL ERROR while collecting enaction status: '+
									enactQueryReq.status+' '+statusText+'</h1></blink>'
								);
							}
						} else {
							enactview.setMessage(
								'<blink><h1 style="color:red">FATAL ERROR F: Please notify it to INB Web Workflow Manager developer</h1></blink>'
							);
						}
					} catch(e) {
						enactview.setMessage(
							'<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+
							WidgetCommon.DebugError(e)+'</pre>'
						);
					}
					enactview.enactQueryReq=undefined;
					enactQueryReq.onreadystatechange = function() {};
					enactQueryReq=undefined;
				}
			};
			this.reloadButton.className='buttondisabled';
			this.updateTextSpan.innerHTML='Updating <img src="style/ajaxLoader.gif">';
			enactQueryReq.open('GET',enactQuery,true);
			enactQueryReq.send(null);
		} catch(e) {
			this.setMessage(
				'<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+
				WidgetCommon.DebugError(e)+'</pre>'
			);
		}
	},
	
	disposeEnaction: function(isDispose) {
		if(
			this.check.checked && (
				isDispose || (
					this.state!='frozen' &&
					this.state!='dead' &&
					this.state!='error' &&
					this.state!='fatal' &&
					this.state!='dubious' &&
					this.state!='killed' &&
					this.state!='finished'
				)
			)
		) {
			var sureDispose=confirm('Are you REALLY sure you want to '+(isDispose?'dispose (and kill)':'kill (but not dispose)')+' this enaction?');
			this.check.doUncheck();
			if(sureDispose) {
				this.openOtherEnactionFrame(true,isDispose);
			}
		}
	},
	
	openOtherEnactionFrame: function(/* optional */ isDispose,isFullDispose) {
		if(isDispose) {
			if(this.jobId) {
				if(isFullDispose) {
					var dispo=new XMLHttpRequest();
					var qsParm={};
					qsParm['jobId']=this.jobId;
					qsParm['dispose']='1';
					var disposeQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
					dispo.open('GET',disposeQuery);
					dispo.send(null);
					var enactview=this;
					this.internalDispose(function() {
						enactview.frameOtherId=enactview.genview.openFrame('viewOtherEnaction',1);
					});
				} else {
					this.reloadStatus(undefined,undefined,undefined,undefined,1);
				}
			}
		} else {
			this.frameOtherId=this.genview.openFrame('viewOtherEnaction',1);
		}
	},
	
	viewEnaction: function() {
		if(this.jobIdField.value && this.jobIdField.value.length>0) {
			// Let's submit the query
			this.genview.closeFrame(this.frameOtherId);
			this.reloadStatus(this.jobIdField.value);
		} else {
			alert('You must enter an enaction Id\nbefore watching its evolution.');
		}
	},
	
	closeOtherEnactionFrame: function() {
		if(this.jobId) {
			this.genview.closeFrame(this.frameOtherId);
		} else {
			alert('You must enter an enaction Id\nbecause there is no previous known enaction.');
		}
	},
	
	openSnapshotFrame: function() {
		// No snapshots over already taken snapshots
		if(this.state=='frozen')  return;
		
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
		this.frameSnapId=this.genview.openFrame('snapshotEnaction',1);
	},
	
	takeSnapshot: function() {
		if(this.snapshotName.value && this.snapshotName.value.length>0) {
			var snapshotName=this.snapshotName.value;
			var snapshotDesc;
			if(FCKeditor_IsCompatibleBrowser()) {
				for ( var i = 0; i < window.frames.length; ++i )
					if ( window.frames[i].FCK )
						window.frames[i].FCK.UpdateLinkedField();
			}
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
		this.genview.closeFrame(this.frameSnapId);
		GeneralView.freeContainer(this.snapshotDescContainer);
	}
};
