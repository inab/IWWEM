/*
	$Id$
	enactionviewer.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
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

var ENDEPS=new Array();

var ENLOADINGFRAMES={
	'reloadEnaction':	{
		src:	"style/big-ajax-loader.gif",
		alt:	"Reloading enaction information"
	},
	'extractData':	{
		src:	"style/big-ajax-extract.gif",
		alt:	"Extracting data from input"
	},
	'preprocessData':	{
		src:	"style/big-ajax-process.gif",
		alt:	"Pre-processing data to be shown"
	}
};

function EnactionViewerCustomInit() {
	this.addLoadingFrames(ENLOADINGFRAMES);
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
	this.responsibleSpan=genview.getElementById('responsibleSpan');
	this.generalStatusSpan=genview.getElementById('generalStatusSpan');
	this.wfTitleSpan=genview.getElementById('wfTitleSpan');
	this.stageSpan=genview.getElementById('stageSpan');
	this.stageStateSpan=genview.getElementById('stageStateSpan');
	
	// Detailed info about a step
	this.datatreeview=new DataTreeView(genview,'dataTreeDiv','databrowser','mimeInfoSelect','extractData','preprocessData');
	
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
	
	this.relaunchButton=genview.getElementById('relaunchButton');
	WidgetCommon.addEventListener(this.relaunchButton,'click',function() {
		enactview.reenact();
	},false);
	
	this.killButton=genview.getElementById('killButton');
	WidgetCommon.addEventListener(this.killButton,'click',function() {
		enactview.disposeEnaction();
	},false);
	
	this.disposeButton=genview.getElementById('disposeButton');
	WidgetCommon.addEventListener(this.disposeButton,'click',function() {
		enactview.disposeEnaction(1);
	},false);
	
	//this.svg=new DynamicSVG();
	
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
	
	// Now, transient divs
	
	// viewOtherEnaction is not needed at this level
	this.otherEnactionsFrame=genview.getElementById('otherEnactionsFrameId');
	
	this.formViewEnaction=genview.getElementById('formViewEnaction');
	this.jobIdField=genview.getElementById('jobId');
	
	this.snapshotEnaction=genview.getElementById('snapshotEnaction');
	this.snapshotName=genview.getElementById('snapshotName');
	this.responsibleMailInput=genview.getElementById('responsibleMail');
	this.responsibleNameInput=genview.getElementById('responsibleName');
	// formSnapshotEnaction is not needed at this level
	// snapshotDesc is dynamic, so it is not caught here
	this.snapshotDescContainer=genview.getElementById('snapshotDescContainer');
	
	var pageTitle=this.genview.getElementById('titleB');
	var newTitle='Interactive Web Workflow Enaction/Snapshot Viewer v'+IWWEM.Version;
	this.genview.thedoc.title=newTitle;
	pageTitle.innerHTML='';
	pageTitle.appendChild(this.genview.thedoc.createTextNode(newTitle));

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
	this.svg=new DynamicSVG(GeneralView.SVGDivId,undefined,IWWEM.Unknown,undefined,undefined,function() {
		enactview.updateSVGSize();
	});
	// SVG resize
	WidgetCommon.addEventListener(window,'resize',function() {
		enactview.updateSVGSize();
	},false);
}

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
		var genview=this.genview;
		this.svg.removeSVG(function() {
			datatreeview.matcher.addMatchers(['etc/EVpatterns.xml'],genview,function() {
				enactview.internalDispose(function() {
					var qsParm={};
					WidgetCommon.parseQS(qsParm);
					if(('jobId' in qsParm) && qsParm['jobId']!=undefined && qsParm['jobId'].length > 0 && qsParm['jobId'][0].length > 0) {
						var jobId=qsParm['jobId'][0];
						if(jobId.indexOf('enaction:')==0) {
							jobId=jobId.substring(jobId.indexOf(':')+1);
						}
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
		this.setStep();
		
		// TODO
		// Some free containers will be here
		GeneralView.freeContainer(this.dateSpan);
		GeneralView.freeContainer(this.responsibleSpan);
		GeneralView.freeContainer(this.generalStatusSpan);
		GeneralView.freeContainer(this.wfTitleSpan);
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
		this.responsibleName='';
		this.responsibleMail='';
		this.domStatus=undefined;
		this.initializedSVG=undefined;
		this.waitingSVG=undefined;
		this.stepCache={};
		this.datatreeview.clearSelect();
		this.step=undefined;
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
				this.jobDir=EnactionStep.getJobDir(this.jobId);
				this.JobsBase=enStatus.getAttribute('relURI');
				if(this.JobsBase.charAt(0)!='/' && IWWEM.FSBase!=undefined) {
					this.JobsBase = IWWEM.FSBase + '/'+ this.JobsBase; 
				}
				this.responsibleMail=enStatus.getAttribute('responsibleMail');
				this.responsibleName=enStatus.getAttribute('responsibleName');

				this.domStatus=enStatus;
				
				this.dateSpan.innerHTML=enStatus.getAttribute('time');
				if(this.responsibleMail!=undefined && this.responsibleMail.length>0) {
					var email=this.responsibleMail;
					var ename=(this.responsibleName && this.responsibleName.length>0)?GeneralView.preProcess(this.responsibleName):email;
					this.responsibleSpan.innerHTML='<a href="mailto:'+email+'">'+ename+'</a>';
				} else {
					this.responsibleSpan.innerHTML='<i>(unknown)</i>';
				}
				GeneralView.freeContainer(this.wfTitleSpan);
				this.wfTitleSpan.appendChild(this.genview.thedoc.createTextNode(enStatus.getAttribute('title')));
				
				var state = enStatus.getAttribute('state');
				
				// First run
				if(state!='unknown' && state!='queued' && !this.initializedSVG) {
					this.initializedSVG=1;
					var enactview=this;
					this.waitingSVG=1;
					var parentno=this.genview.getElementById(GeneralView.SVGDivId).parentNode;
					var maxwidth=(parentno.offsetWidth-32)+'px';
					var maxheight=(parentno.offsetHeight-32)+'px';
					this.svg.loadSVG(GeneralView.SVGDivId,
						this.JobsBase+'/'+this.jobDir+'/workflow.svg',
//						'100mm',
//						'120mm',
						maxwidth,
						maxheight,
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
	
	genGraphicalState: function(state,/* optional */ globalstate) {
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
				switch(globalstate) {
					case 'frozen':
					case 'dead':
					case 'error':
					case 'dubious':
					case 'killed':
						gstate=state+" when "+globalstate;
				}
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
					var possibleStep=new EnactionStep(child);
					var update=1;
					// Is it cached?
					if(possibleStep.name in this.stepCache) {
						var currentStep=this.stepCache[possibleStep.name];
						if(possibleStep.state==currentStep.state) {
							if(possibleStep.hasInputs==currentStep.hasInputs && possibleStep.hasOutputs==currentStep.hasOutputs) {
								update=undefined;
								for(var input in possibleStep.input) {
									if(!(input in currentStep.input)) {
										update=1;
										break;
									}
								}
								if(update==undefined) {
									for(var output in possibleStep.output) {
										if(!(output in currentStep.output)) {
											update=1;
											break;
										}
									}
								}
								if(update==undefined) {
									if((possibleStep.iterations!=undefined && currentStep.iterations==undefined) ||
										(possibleStep.iterations!=undefined && currentStep.iterations!=undefined
										&& possibleStep.iterations.length!=currentStep.iterations.length)
									) {
										update=1;
									}
								}
							}
						}
					}
					// Updating the step cache
					if(update!=undefined) {
						this.stepCache[possibleStep.name]=possibleStep;
						this.updateStepView(possibleStep);
						if(this.step && possibleStep.name==this.step.name) {
							this.setStep(possibleStep);
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
		//var maxwidth=(parentno.clientWidth-32)+'px';
		var maxwidth=(parentno.offsetWidth-32)+'px';
		var maxheight=(parentno.offsetHeight-32)+'px';
		this.svg.SVGrescale(maxwidth,maxheight);
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
	
	setStep: function (/* optional */ step) {
		var globalstate=this.state;
		// To finish
		if(!step) {
			step=this.step;
		}
		// Unfilling iterations

		if(step) {
			var iteration=undefined;
			
			if(this.step!=undefined && this.step.name==step.name) {
				iteration=this.datatreeview.istep;
			}
			
			if(iteration==undefined) {
				iteration=-1;
			} else {
				iteration=parseInt(iteration,10);
			}
			if(this.step==undefined || this.step.name!=step.name || this.step!=step) {
				this.stageSpan.innerHTML=step.name;
				this.stageStateSpan.innerHTML=this.genGraphicalState(step.state,globalstate);
			}
			this.step=step;
			
			// Filling step information
			var baseJob = this.getBaseHREF()+'/'+this.JobsBase+((step.name!=this.jobId)?('/'+this.jobDir+'/Results'):'');
			this.datatreeview.setStep(baseJob,this.jobId,step,iteration);
		} else {
			// Clearing view
			this.datatreeview.clearSelect();
			this.datatreeview.clearContainers();
			this.stageSpan.innerHTML='<i>None selected</i>';
			this.stageStateSpan.innerHTML='N/A'
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
	
	reloadStatus: function(/* optional */ jobId,isFullReload,snapshotName,snapshotDesc,isKill,responsibleMail,responsibleName) {
		// Final states
		if(
			this.state=='frozen' ||
			(snapshotName==undefined && (
				this.state=='dead' ||
				this.state=='error' ||
				this.state=='fatal' ||
				this.state=='dubious' ||
				this.state=='killed' ||
				this.state=='finished'
			))
		)  return;
		
		// In progress request
		if(this.enactQueryReq)  return;
		
		// Start the wait clock
		this.genview.busy(true);
		
		// Kill pending timer!
		if(this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer=undefined;
		}
		
		// Getting the enaction information
		if(!jobId)  jobId=this.jobId;
		var qsParm = {
			jobId: Base64._utf8_encode(jobId)
		};
		if(snapshotName) {
			qsParm['snapshotName']=Base64._utf8_encode(snapshotName);
			if(snapshotDesc) {
				qsParm['snapshotDesc']=Base64._utf8_encode(snapshotDesc);
			}
		}
		if(isKill) {
			qsParm['dispose']='0';
		}
		if(responsibleMail) {
			qsParm['responsibleMail']=Base64._utf8_encode(responsibleMail);
			if(responsibleName) {
				qsParm['responsibleName']=Base64._utf8_encode(responsibleName);
			}
		}
		var enactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionstatus");
		this.genview.clearMessage();
		
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
		var genview=this.genview;
		try {
			enactQueryReq.onreadystatechange = function() {
				if(enactQueryReq.readyState==4) {
					//enactview.closeReloadFrame();
					try {
						var response = genview.parseRequest(enactQueryReq,"collecting enaction status");
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
							// or anything similar
							genview.busy(false);
						});
					} catch(e) {
						genview.busy(false);
						genview.setMessage(
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
			this.genview.setMessage(
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
					var qsParm={
						jobId: Base64._utf8_encode(this.jobId),
						dispose: '1'
					};
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
		this.otherEnactionsFrame.src='workflowmanager.html?id=enaction:';
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
			this.otherEnactionsFrame.src='about:blank';
			this.genview.closeFrame(this.frameOtherId);
		} else {
			alert('You must enter an enaction Id\nbecause there is no previous known enaction.');
		}
	},
	
	openSnapshotFrame: function() {
		// No snapshots over already taken snapshots
		if(this.state=='frozen')  return;
		
		this.genview.createFCKEditor(this.snapshotDescContainer,'snapshotDesc');
		/*
		if(FCKeditor_IsCompatibleBrowser()) {
			// Rich-Text Editor
			var snapshotDesc=new FCKeditor('snapshotDesc',undefined,'250','IWWEM');
			var basehref = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
			snapshotDesc.BasePath='js/FCKeditor/';
			snapshotDesc.Config['CustomConfigurationsPath']=basehref+'/etc/fckconfig_IWWEM.js';
			this.snapshotDescContainer.innerHTML = snapshotDesc.CreateHtml();
		} else {
			// I prefer my own defaults
			var snapshotDesc=this.genview.createElement('textarea');
			snapshotDesc.cols=60;
			snapshotDesc.rows=10;
			snapshotDesc.name='snapshotDesc';
			this.snapshotDescContainer.appendChild(snapshotDesc);
		}
		*/
		this.responsibleMailInput.value=this.responsibleMail;
		this.responsibleNameInput.value=this.responsibleName;
		this.frameSnapId=this.genview.openFrame('snapshotEnaction',1);
	},
	
	takeSnapshot: function() {
		if(this.snapshotName.value==undefined || this.snapshotName.value.length==0) {
			alert('Please, give a name to the snapshot before taking it');
		} else if(this.responsibleMailInput.value==undefined || this.responsibleMailInput.value.length==0) {
			alert('The snapshot must have a responsible.\nYou must write a valid e-mail address,\nto get its approval message.');
		} else {
			var responsibleMail=this.responsibleMailInput.value;
			var responsibleName=this.responsibleNameInput.value;
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
			this.reloadStatus(undefined,false,snapshotName,snapshotDesc,undefined,responsibleMail,responsibleName);
		}
	},
	
	closeSnapshotFrame: function() {
		this.genview.closeFrame(this.frameSnapId);
		GeneralView.freeContainer(this.snapshotDescContainer);
	},
	
	openReenactFrame: function() {
		this.reenactFrameId=this.genview.openFrame('extractData',1);
	},
	
	closeReenactFrame: function() {
		if(this.reenactFrameId) {
			this.genview.closeFrame(this.reenactFrameId);
			this.reenactFrameId=undefined;
		}
	},
	
	/* This method has been adapted from NewEnactionview.reenact */
	reenact: function() {
		// The enaction id is the only we need!
		if(!this.jobId)  return;
		
		var enUUID=this.jobId;
		if(enUUID.indexOf(':')==-1) {
			enUUID='enaction:'+enUUID;
		}
		
		// First, locking the window
		this.openReenactFrame();
		
		var qsParm = {
			id: Base64._utf8_encode(enUUID),
			reusePrevInput: '1',
			// Setting responsible
			responsibleMail: Base64._utf8_encode(this.responsibleMail),
			responsibleName: Base64._utf8_encode(this.responsibleName)
		};
		
		var reenactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionlauncher");
		var reenactRequest = new XMLHttpRequest();
		var enactview=this;
		var genview=this.genview;
		genview.clearMessage();
		try {
			reenactRequest.onreadystatechange = function() {
				if(reenactRequest.readyState==4) {
					try {
						var response = genview.parseRequest(reenactRequest,"completing reenaction startup");
						if(response!=undefined)
							enactview.parseEnactionIdAndRelaunch(response);
					} catch(e) {
						genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to complete reenaction!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
					}
					// Removing 'Loading...' frame
					enactview.closeReenactFrame();
					reenactRequest.onreadystatechange=function() {};
					reenactRequest=undefined;
				}
			};
			reenactRequest.open('GET',reenactQuery,true);
			reenactRequest.send(null);
		} catch(e) {
			this.genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to start reenaction of '+
				enUUID+'!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
		}
	},
	
	/* This method has been adapted from NewEnactionview.parseEnactionAndLaunch */
	parseEnactionIdAndRelaunch: function(enactIdDOM) {
		var enactId;
		
		if(enactIdDOM) {
			if(enactIdDOM.documentElement &&
				enactIdDOM.documentElement.tagName &&
				(GeneralView.getLocalName(enactIdDOM.documentElement)=='enactionlaunched')
			) {
				enactId = enactIdDOM.documentElement.getAttribute('jobId');
				if(enactId) {
					var thewin=(top)?top:((parent)?parent:window);
					thewin.open('enactionviewer.html?jobId='+enactId,'_top');
				}
			} else {
				this.genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to start the re-enaction process</h1></blink>');
			}
		}
		
		return enactId;
	}
};
