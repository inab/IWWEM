/*
	enactionviewer.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
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

function WorkflowStep(stepDOM, /* optional */ parentStep) {
	this.name=stepDOM.getAttribute('name') || stepDOM.getAttribute('jobId');
	this.state=stepDOM.getAttribute('state');
	this.parentStep=parentStep;
	this.input={};
	this.hasInputs=undefined;
	this.bacInput=undefined;
	this.output={};
	this.hasOutputs=undefined;
	this.bacOutput=undefined;
	
	this.schedStamp=undefined;
	this.startStamp=undefined;
	this.stopStamp=undefined;
	this.iterNumber=undefined;
	this.iterMax=undefined;
	this.stepError=undefined;
	for(var child = stepDOM.firstChild; child; child = child.nextSibling) {
		if(child.nodeType==1) {
			switch(GeneralView.getLocalName(child)) {
				case 'extraStepInfo':
					var schedStamp=child.getAttribute('sched');
					if(schedStamp!=undefined && schedStamp!=null && schedStamp!='') {
						this.schedStamp=schedStamp;
					}
					var startStamp=child.getAttribute('start');
					if(startStamp!=undefined && startStamp!=null && startStamp!='') {
						this.startStamp=startStamp;
					}
					var stopStamp=child.getAttribute('stop');
					if(stopStamp!=undefined && stopStamp!=null && stopStamp!='') {
						this.stopStamp=stopStamp;
					}
					var iterNumber=child.getAttribute('iterNumber');
					if(iterNumber!=undefined && iterNumber!=null && iterNumber!='') {
						this.iterNumber=iterNumber;
					}
					var iterMax=child.getAttribute('iterMax');
					if(iterMax!=undefined && iterMax!=null && iterMax!='') {
						this.iterMax=iterMax;
					}
					var stepError=new Array();
					for(var stepErr=child.firstChild;stepErr;stepErr=stepErr.nextSibling) {
						if(stepErr.nodeType==1 && GeneralView.getLocalName(stepErr)=='stepError') {
							stepError.push({
								header:  stepErr.getAttribute('header'),
								message: WidgetCommon.getTextContent(stepErr)
							});
						}
					}
					// To finish
					if(stepError.length>0)  this.stepError=stepError;
					break;
				case 'iterations':
					var iterations=new Array();
					for(var iter=child.firstChild;iter;iter=iter.nextSibling) {
						if(iter.nodeType==1 && GeneralView.getLocalName(iter)=='step') {
							iterations.push(new WorkflowStep(iter,this));
						}
					}
					// To finish
					this.iterations=iterations;
					break;
				case 'input':
					// Baclava not cached (yet)
					this.input[child.getAttribute('name')]=undefined;
					this.hasInputs=1;
					break;
				case 'output':
					// Baclava not cached (yet)
					this.output[child.getAttribute('name')]=undefined;
					this.hasOutputs=1;
					break;
			}
		}
	}
}

WorkflowStep.prototype = {
	fetchBaclavaObject: function(theurl,thehash,enactview,/* optional */ thenotify, istep) {
		var request;
		try {
			request=new XMLHttpRequest();
			request.onreadystatechange=function() {
				//enactview.addMessage(request.readyState + '<br>');
				if(request.readyState==4) {
					try {
						if('status' in request) {
							if(request.status == 200 || request.status == 304) {
								if(request.parseError && request.parseError.errorCode!=0) {
									enactview.addMessage('<blink><h1 style="color:red">FATAL ERROR ('+
										request.parseError.errorCode+
										") while parsing list at ("+
										request.parseError.line+
										","+request.parseError.linePos+
										"):</h1></blink><pre>"+request.parseError.reason+"</pre>"
									);
								} else {
									var response = request.responseXML;
									if(!response) {
										if(request.responseText) {
											var parser = new DOMParser();
											response = parser.parseFromString(request.responseText,'application/xml');
										} else {
											// Backend error.
											enactview.addMessage(
												'<blink><h1 style="color:red">FATAL ERROR B: (with '+
												theurl+
												') Please notify it to INB Web Workflow Manager developer</h1></blink>'
											);
										}
									}
									// Only parse when an answer is available
									Baclava.Parser(response,thehash,enactview);
									try {
										if(thenotify)  thenotify(istep);
									} catch(noti) {
										alert(WidgetCommon.DebugError(noti));
										// IgnoreIT(R)
									}
								}
								
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in request) && request.statusText) {
									statusText=request.statusText;
								}
								enactview.addMessage(
									'<blink><h1 style="color:red">FATAL ERROR while fetching '+
									theurl+
									': '+
									request.status+
									' '+
									statusText+
									'</h1></blink>'
								);
							}
						} else {
							enactview.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR F: (with '+
								theurl+
								') Please notify it to INB Web Workflow Manager developer</h1></blink>'
							);
						}
					} catch(e) {
						enactview.addMessage(
							'<blink><h1 style="color:red">FATAL ERROR: Unable to complete '+
							theurl+
							' reload!</h1></blink><pre>'+
							WidgetCommon.DebugError(e)+
							'</pre>'
						);
					} finally {
						request.onreadystatechange=function() {};
					}
				}
			};
			
			// Now it is time to send the query
			request.open('GET',theurl,true);
			request.send(null);
		} catch(e) {
			enactview.addMessage(
				'<blink><h1 style="color:red">FATAL ERROR: Unable to start '+
				theurl+
				' reload!</h1></blink><pre>'+
				WidgetCommon.DebugError(e)+
				'</pre>'
			);
			request=undefined;
		}
		
		return request;
	},
	
	fetchBaclava: function(baseJob,enactview,gotInputHandler,gotOutputHandler,/* optional */ istep) {
		var relpath=baseJob+'/'+EnactionView.getJobDir(this.name)+'/';
		
		// Determining whether 
		if(this.hasInputs && !(this.input[Baclava.GOT]) && !this.bacInput) {
			this.bacInput=this.fetchBaclavaObject(relpath+'Inputs.xml',this.input,enactview,gotInputHandler,istep);
		}
		
		if(this.hasOutputs && !(this.output[Baclava.GOT]) && !this.bacOutput) {
			this.bacOutput=this.fetchBaclavaObject(relpath+'Outputs.xml',this.output,enactview,gotOutputHandler,istep);
		}
		
		// Now, the iterations
		if(this.iterations) {
			var iti = this.iterations;
			var itil = iti.length;
			for(var i=0; i<itil ; i++) {
				iti[i].fetchBaclava(relpath+'Iterations',enactview,gotInputHandler,gotOutputHandler,i);
			}
		}
	}
};

/* Window handling code */
function EnactionView(genview) {
	this.genview=genview;
	
	// Relevant objects, ordered by document appearance
	this.dateSpan=genview.getElementById('dateSpan');
	this.generalStatusSpan=genview.getElementById('generalStatusSpan');
	this.stageSpan=genview.getElementById('stageSpan');
	this.stageStateSpan=genview.getElementById('stageStateSpan');
	
	// Detailed info about a step
	this.schedStampDiv=genview.getElementById('schedStampDiv');
	this.schedStampSpan=genview.getElementById('schedStampSpan');
	this.startStampDiv=genview.getElementById('startStampDiv');
	this.startStampSpan=genview.getElementById('startStampSpan');
	this.stopStampDiv=genview.getElementById('stopStampDiv');
	this.stopStampSpan=genview.getElementById('stopStampSpan');
	this.errStepDiv=genview.getElementById('errStepDiv');
	this.iterDiv=genview.getElementById('iterDiv');
	
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
	
	//this.svg=new TavernaSVG();
	
	this.iterationSelect=genview.getElementById('iterationSelect');
	this.inContainer=genview.getElementById('inputs');
	this.outContainer=genview.getElementById('outputs');
	this.inputsSpan=genview.getElementById('inputsSpan');
	this.outputsSpan=genview.getElementById('outputsSpan');
	
	this.databrowser=new DataBrowser('databrowser',genview);
	
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
	
	this.matcher = new DataMatcher();
	
	// Important update facets
	this.enactQueryReq=undefined;
	this.updateTimer=undefined;
	
	// Now, time to initialize all!

	//this.JobsBase=undefined;
	//
	//this.domStatus=undefined;
	
	this.stepClickHandler = function (theid) {
		enactview.showStepFromId(this.getAttribute?this.getAttribute("id"):theid);
	};
	
	this.jobClickHandler = function (theid) {
		enactview.showWorkflowJobFromId(this.getAttribute?this.getAttribute("id"):theid);
	};
	
	// At last, getting the enaction id
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
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
		target.parentNode.className+=' open';
	} else {
		target.parentNode.className=(target.parentNode.className.indexOf('scroll')!=-1)?'scrollbranch':'branch';
	}
};
	
EnactionView.ScrollClick = function (event) {
	if(!event)  event=window.event;
	var target=(event.currentTarget)?event.currentTarget:event.srcElement;
	var parentOpen=(target.parentNode.className.indexOf(' open')!=-1)?' open':'';
	if(target.parentNode.className.indexOf('scroll')!=-1) {
		target.innerHTML=' [=]';
		target.parentNode.className='branch'+parentOpen;
	} else {
		target.innerHTML=' [\u2212]';
		target.parentNode.className='scrollbranch'+parentOpen;
	}
};
	
EnactionView.prototype = {
	init: function() {
		var enactview=this;
		this.svg.removeSVG(function() {
			enactview.matcher.addMatchers(['EVpatterns.xml'],this,function() {
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
		// TODO
		// Some free containers will be here
		GeneralView.freeSelect(this.mimeSelect);
		
		this.step=undefined;
		this.istep=undefined;
		this.setStep();
		
		this.databrowser.clearView();
		GeneralView.freeContainer(this.dateSpan);
		GeneralView.freeContainer(this.generalStatusSpan);
		GeneralView.freeContainer(this.stageSpan);
		GeneralView.freeContainer(this.stageStateSpan);
		GeneralView.freeContainer(this.errStepDiv);
		this.schedStampDiv.style.display='none';
		this.startStampDiv.style.display='none';
		this.stopStampDiv.style.display='none';
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
		this.step=undefined;
		this.istep=undefined;
		this.setStep();
		if(this.iterSelectHandler) {
			WidgetCommon.removeEventListener(this.iterationSelect,'change',this.iterSelectHandler,false);
			this.iterationSelect=undefined;
		}
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
					this.svg.loadSVG(GeneralView.SVGDivId,
						this.JobsBase+'/'+this.jobDir+'/workflow.svg',
//						'100mm',
						'120mm',
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
			var step=new WorkflowStep(this.domStatus);
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
						var step=new WorkflowStep(child);
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
	
	updateStepView: function(step) {
		var tramp=this.svg.getTrampoline();
		var susId=tramp.suspendRedraw();
		try {
			// Setting the fill
			switch(step.state) {
				case 'queued':
					//tramp.changeNodeFill(step.name,'violet');
					tramp.setNodeBulbColor(step.name,'violet');
					break;
				case 'running':
					//tramp.changeNodeFill(step.name,'yellow');
					tramp.setNodeBulbColor(step.name,'yellow');
					break;
				case 'finished':
					//tramp.changeNodeFill(step.name,'green');
					tramp.setNodeBulbColor(step.name,'green');
					break;
				case 'error':
					//tramp.changeNodeFill(step.name,'red');
					tramp.setNodeBulbColor(step.name,'red');
					break;
			}
			
			// And the click property
			switch(step.state) {
				case 'running':
				case 'finished':
				case 'error':
					var enactview=this;
					tramp.removeNodeHandler(step.name,this.stepClickHandler,'click');
					tramp.setNodeHandler(step.name,this.stepClickHandler,'click');
					break;
			}
		} catch(e) {
			// DoNothing(R)
		} finally {
			tramp.unsuspendRedraw(susId);
		}
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
		} finally {
			tramp.unsuspendRedraw(susId);
		}
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
	
	setStep: function (step,/*optional*/ iteration) {
		// To finish
		if(!step) {
			step=this.step;
		}
		// Unfilling iterations
		if(this.iterSelectHandler) {
			WidgetCommon.removeEventListener(this.iterationSelect,'change',this.iterSelectHandler,false);
			this.iterSelectHandler=undefined;
		}
		GeneralView.freeSelect(this.iterationSelect);

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
			if(step.schedStamp && iteration==-1) {
				this.schedStampDiv.style.display='block';
				this.schedStampSpan.innerHTML=step.schedStamp;
			} else {
				this.schedStampDiv.style.display='none';
			}

			if(step.startStamp && iteration==-1) {
				this.startStampDiv.style.display='block';
				this.startStampSpan.innerHTML=step.startStamp;
			} else {
				this.startStampDiv.style.display='none';
			}

			if(step.stopStamp && iteration==-1) {
				this.stopStampDiv.style.display='block';
				this.stopStampSpan.innerHTML=step.stopStamp;
			} else {
				this.stopStampDiv.style.display='none';
			}
			
			GeneralView.freeContainer(this.errStepDiv);
			if(step.stepError && iteration==-1) {
				var errHTML='<span style="color:red;font-weight:bold;">Processing Errors</span><br>';
				for(var ierr=0;ierr<step.stepError.length;ierr++) {
					var therr=step.stepError[ierr];
					var lierr=this.genview.createElement('ul');
					errHTML += '<u>'+therr.header+'</u><br><pre>'+therr.message+'</pre><br>';
				}
				this.errStepDiv.innerHTML=errHTML;
			}

			// Filling iterations
			var iterO=this.genview.createElement('option');
			iterO.value=-1;
			iterO.text=(((step.input[Baclava.GOT]) && (step.output[Baclava.GOT]))?'':'* ')+'Whole';
			try {
				this.iterationSelect.add(iterO,null);
			} catch(e) {
				this.iterationSelect.add(iterO);
			}
			
			// For the global step
			var enactview=this;
			var gstep=step;
			// I'm using here absolute paths, because when this function is called from inside SVG
			// click handlers, base href is the one from the SVG, not the one from this page.
			var inputSignaler = function(istep) {
				enactview.tryUpdateIOStatus(gstep,istep,'input',enactview.inputsSpan,enactview.inContainer,'hasInputs');
			};
			
			if(step.iterations) {
				this.iterDiv.style.display='block';
				var giter=gstep.iterations;
				var giterl = giter.length;
				for(var i=0;i<giterl;i++) {
					var ministep=giter[i];
					iterO=this.genview.createElement('option');
					iterO.text=(((ministep.input[Baclava.GOT]) && (ministep.output[Baclava.GOT]))?'':'* ')+ministep.name;
					iterO.value=i;
					try {
						this.iterationSelect.add(iterO,null);
					} catch(e) {
						this.iterationSelect.add(iterO);
					}
				}

				// Looking this concrete iteration
				if(iteration!=-1) {
					step=gstep.iterations[iteration];
				}

				// Showing the correct position
				this.iterationSelect.selectedIndex=iteration+1;

				this.iterSelectHandler=function(event) {
					if(!event)  event=window.event;
					var target=(event.currentTarget)?event.currentTarget:event.srcElement;
					if(target.selectedIndex!=-1) {
						enactview.setStep(gstep,target.options[target.selectedIndex].value);
					}
				};
				WidgetCommon.addEventListener(this.iterationSelect,'change',this.iterSelectHandler,false);
			} else {
				this.iterDiv.style.display='none';
			}
			// Fetching data after, not BEFORE creating the select
			var outputSignaler = function(istep) {
				enactview.tryUpdateIOStatus(gstep,istep,'output',enactview.outputsSpan,enactview.outContainer,'hasOutputs');
			};
			gstep.fetchBaclava(EnactionView.BaseHREF+'/'+this.JobsBase+((step.name!=this.jobId)?('/'+this.jobDir+'/Results'):''),this,inputSignaler,outputSignaler);
			
			
			// For this concrete (sub)step
			// Inputs
			this.updateIOStatus(step.input,this.inputsSpan,this.inContainer,step.hasInputs,new DataBrowser.LocatedData(this.jobId,gstep.name,(iteration!=-1)?step.name:undefined,'I'));

			// Outputs
			this.updateIOStatus(step.output,this.outputsSpan,this.outContainer,step.hasOutputs,new DataBrowser.LocatedData(this.jobId,gstep.name,(iteration!=-1)?step.name:undefined,'O'));
		} else {
			// Clearing view
			GeneralView.freeContainer(this.inContainer);
			GeneralView.freeContainer(this.outContainer);
			this.stageSpan.innerHTML='NONE';
			this.stageStateSpan.innerHTML='NONE'
			this.inContainer.innerHTML='<i>(None)</i>';
			this.outContainer.innerHTML='<i>(None)</i>';
			this.iterDiv.style.display='none';
			/*
			var iterO=this.genview.createElement('option');
			iterO.value='NONE';
			iterO.text='NONE';
			try {
				this.iterationSelect.add(iterO,null);
			} catch(e) {
				this.iterationSelect.add(iterO);
			}
			*/
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
		} finally {
			tramp.unsuspendRedraw(susId);
		}
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
		} catch(e) {
			// DoNothing(R)
		} finally {
			tramp.unsuspendRedraw(susId);
		}
	},
	
	tryUpdateIOStatus: function(gstep,istep,stepIOFacet,IOSpan,IOContainer,hasIOFacet) {
		if(this.step==gstep) {
			// Update the selection text
			var tstep;
			var s_istep=istep;
			if(istep==undefined) {
				s_istep=istep=-1;
			}
			istep=parseInt(istep,10);
			tstep=(istep!=-1)?s_istep:'Whole';
			
			this.iterationSelect.options[istep+1].text=tstep;
			
			// And perhaps the generated tree!
			if(this.istep==istep) {
				this.updateIOStatus(gstep[stepIOFacet],IOSpan,IOContainer,gstep[hasIOFacet],new DataBrowser.LocatedData(this.jobId,gstep.name,s_istep,(stepIOFacet=='input')?'I':'O'));
			}
		}
	},
	
	updateIOStatus: function(stepIO,IOSpan,IOContainer,hasIO,locObject) {
		GeneralView.freeContainer(IOContainer);
		var loaded=stepIO[Baclava.GOT];
		IOSpan.className=(!hasIO || loaded)?'IOStat':'IOStatLoading';
		if(loaded) {
			for(var IO in stepIO) {
				if(IO==Baclava.GOT)  continue;
				this.generateIO(IO,(loaded)?stepIO:undefined,(loaded)?stepIO[IO].mime:undefined,IOContainer,locObject.newChild(IO));
			}
		}
	},
	
	// Tree-like structure
	generateIO: function(thekey,thehash,mime,parentContainer,locObject) {
		var data;
		if(thehash && thehash[thekey] instanceof Baclava) {
			data = thehash[thekey].data;
		} else {
			data = thehash[thekey];
		}
		var retval;
		if(data instanceof DataObject) {
			// A leaf
			var retval;
			var span = this.genview.createElement('div');
			var spanlabel = this.genview.createElement('span');
			spanlabel.className='leaflabel';
			spanlabel.innerHTML=thekey;
			span.appendChild(spanlabel);
			if(data.hasData()) {
				mime=mime.concat();
				var beMatched = (data.matcherStatus==undefined)?data.canBeMatched(this.matcher,mime):data.matcherStatus;

				span.className='leaf';
				locObject.setDataObject(data);
				var enactview=this;
				if(beMatched==true) {
					var fruit=this.genview.createElement('img');
					fruit.src='style/twisty-fruit.png';
					span.appendChild(fruit);
					
					var conspan=this.genview.createElement('div');
					conspan.className='branchcontainer';
					var virhash={};
					for(var matchi=0;matchi<data.dataMatches.length;matchi++) {
						var match=data.dataMatches[matchi];
						var virfacet='#'+match.pattern+'['+match.numMatch+']';
						virhash[virfacet]=match.data;
						this.generateIO(virfacet,virhash,match.data.mimeList,conspan,locObject.newChild(virfacet));
					}

					span.appendChild(conspan);
					retval=2;
				} else if(beMatched=='maybe') {
					var seed=this.genview.createElement('img');
					seed.src='style/twisty-question.png';
					
					var seedgrow = function (event) {
						var frameId=enactview.genview.openFrame('extractData',1);
						data.doMatching(function(dataMatches) {
							if(dataMatches.length>0) {
								seed.src='style/twisty-fruit.png';
								// Call generateIO to follow the party!
								var conspan=enactview.genview.createElement('div');
								conspan.className='branchcontainer';
								var virhash={};
								for(var matchi=0;matchi<dataMatches.length;matchi++) {
									var match=dataMatches[matchi];
									var virfacet='#'+match.pattern+'['+match.numMatch+']';
									virhash[virfacet]=match.data;
									enactview.generateIO(virfacet,virhash,match.data.mimeList,conspan,locObject.newChild(virfacet));
								}

								span.appendChild(conspan);
							} else {
								// Last, updating the class...
								span.removeChild(seed);
							}
							enactview.genview.closeFrame(frameId);
						});
						WidgetCommon.removeEventListener(seed,'click',seedgrow,false);
					};
					WidgetCommon.addEventListener(seed,'click',seedgrow,false);
					span.appendChild(seed);
					retval=1;
				} else {
					retval=0;
				}
				
				// Event to show the information
				WidgetCommon.addEventListener(spanlabel,'click',function () {
					enactview.databrowser.show(locObject,mime);
				},false);
			} else {
				span.className='deadleaf';
				retval=-1;
			}

			//parentContainer.appendChild(this.genview.createElement('br'));
			parentContainer.appendChild(span);
		} else {
			// A branch
			var div = this.genview.createElement('div');
			div.className='branch';
			var span = this.genview.createElement('span');
			span.className='branchlabel';
			div.appendChild(span);
			var condiv = this.genview.createElement('div');
			condiv.className='branchcontainer';

			// Now the children
			var isscroll=true;
			var isdead=true;
			var citem=0;
			var aitem=0;
			for(var facet in data) {
				citem++;
				var geval=this.generateIO(facet,data,mime,condiv,locObject.newChild(facet));
				if(geval>0)  isscroll=undefined;
				if(geval>=0) {
					isdead=undefined;
					aitem++;
				}
			}
			var spai = thekey+' <i>('+citem+' item'+((citem!=1)?'s':'');
			if(citem!=aitem)  spai+=', '+aitem+' alive';
			spai += ')</i>';
			span.innerHTML=spai;
			
			if(isscroll && aitem<8)  isscroll=undefined;
			
			if(isdead) {
				div.className += ' hiddenbranch';
				retval=-2;
			} else {
				var expandContent;
				if(isscroll) {
					div.className='scrollbranch';
					expandContent=' [\u2212]';
				} else {
					expandContent=' [=]';
				}
				var expandSpan = this.genview.createElement('span');
				expandSpan.className='scrollswitch';
				expandSpan.innerHTML=expandContent;
				div.appendChild(expandSpan);
				
				// Event to expand/collapse
				WidgetCommon.addEventListener(expandSpan,'click',EnactionView.ScrollClick,false);
				// Event to show the contents
				WidgetCommon.addEventListener(span,'click',EnactionView.BranchClick,false);
				retval=3;
			}
			div.appendChild(condiv);
			parentContainer.appendChild(div);
		}
		
		return retval;
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
									enactview.fillEnactionStatus(response,function() {
										var state=enactview.state;
										// Only run timer when 
										if(
											state!='frozen' &&
											state!='dead' &&
											state!='error' &&
											state!='killed' &&
											state!='finished'
										) {
											var timeout=11;
											var timeoutFunc=undefined;
											timeoutFunc=function() {
												timeout--;
												if(timeout>0) {
													enactview.updateTextSpan.innerHTML='Update in '+timeout;
													enactview.updateTimer=setTimeout(timeoutFunc,1000);
												} else {
													enactview.updateTextSpan.innerHTML='Update';
													enactview.reloadStatus();
													enactview=undefined;
													timeoutFunc=undefined;
												}
											};
											timeoutFunc();
										} else {
											enactview.updateTextSpan.innerHTML='Update';
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
					} finally {
						enactview.enactQueryReq=undefined;
						enactQueryReq.onreadystatechange = function() {};
						enactQueryReq=undefined;
					}
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
			this.check.checked &&
			this.state!='frozen' &&
			this.state!='dead' &&
			this.state!='error' &&
			this.state!='killed' &&
			this.state!='finished'
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
