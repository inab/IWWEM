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

function Baclava(dataThing) {
	this.name=dataThing.getAttribute('key');
	for(var child=dataThing.firstChild;child;child=child.nextSibling) {
		if(child.nodeType==1 && GeneralView.getLocalName(child)=='myGridDataDocument') {
			this.syntacticType=child.getAttribute('syntactictype');
			for(var myData=child.firstChild;myData;myData=myData.nextSibling) {
				if(myData.nodeType==1) {
					switch(GeneralView.getLocalName(myData)) {
						case 'metadata':
							this.setMetadata(myData);
							break;
						case 'partialOrder':
						case 'dataElement':
							this.data=Baclava.Data(myData);
							break;
					}
				}
			}
			break;
		}
	}
}

Baclava.BACLAVA_NS='http://org.embl.ebi.escience/baclava/0.1alpha';

Baclava.prototype = {
	// Stores the assigned metadata
	setMetadata: function(metadata) {
		var mime=new Array();
		var mimeNodes = GeneralView.getElementsByTagNameNS(metadata,GeneralView.XSCUFL_NS,'mimeType');
		if(mimeNodes.length>0) {
			for(var i=0;i<mimeNodes.length;i++) {
				var mim=mimeNodes.item(i);
				mime.push(WidgetCommon.getTextContent(mim));
			}
		} else {
			mime.push('text/plain');
		}
		this.mime=mime;
	}
};

/* A Baclava XML parser */
Baclava.Parser = function(baclavaXML,thehash,themessagediv) {
	if(baclavaXML && baclavaXML.documentElement && GeneralView.getLocalName(baclavaXML.documentElement)=='dataThingMap') {
		for(var dataThing = baclavaXML.documentElement.firstChild; dataThing; dataThing=dataThing.nextSibling) {
			if(dataThing.nodeType==1 && GeneralView.getLocalName(dataThing)=='dataThing') {
				var bacla=new Baclava(dataThing);
				thehash[bacla.name]=bacla;
			}
		}
	}
	// We should notify here in some way, like this one
	thehash[WorkflowStep.GOT]=1;
};

Baclava.Data = function(partial) {
	var data=undefined;
	switch(GeneralView.getLocalName(partial)) {
		case 'partialOrder':
			var processRelations=undefined;
			switch(partial.getAttribute('type')) {
				case 'list':
					data={};
				case 'set':
					processRelations=1;
					break;
			}
			for(var list=partial.firstChild; list; list=list.nextSibling) {
				if(list.nodeType==1) {
					switch(GeneralView.getLocalName(list)) {
						case 'relationList':
							if(processRelations) {
								// Even Taverna core does nothing at this step!!!
							}
							break;
						case 'itemList':
							for(var item=list.firstChild;item;item=item.nextSibling) {
								if(item.nodeType==1) {
									var idx = item.getAttribute('index');
									data[idx] = Baclava.Data(item);
								}
							}
							break;
					}
				}
			}
			break;
		case 'dataElement':
			var ndata = GeneralView.getElementsByTagNameNS(partial,Baclava.BACLAVA_NS,'dataElementData');
			if(ndata && ndata.length>0) {
				//data=Base64.decode(WidgetCommon.getTextContent(ndata.item(0)));
				data=WidgetCommon.getTextContent(ndata.item(0));
			}
			break;
	}
	
	return data;
};

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
	for(var child = stepDOM.firstChild; child; child = child.nextSibling) {
		if(child.nodeType==1) {
			switch(GeneralView.getLocalName(child)) {
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

WorkflowStep.GOT='----GOT----';

WorkflowStep.prototype = {
	fetchBaclavaObject: function(theurl,thehash,themessagediv,/* optional */ thenotify, istep) {
		var request;
		try {
			request=new XMLHttpRequest();
			request.onreadystatechange=function() {
				//themessagediv.innerHTML += request.readyState + '<br>';
				if(request.readyState==4) {
					try {
						if('status' in request) {
							if(request.status == 200 || request.status == 304) {
								if(request.parseError && request.parseError.errorCode!=0) {
									themessagediv.innerHTML+='<blink><h1 style="color:red">FATAL ERROR ('+
										request.parseError.errorCode+
										") while parsing list at ("+
										request.parseError.line+
										","+request.parseError.linePos+
										"):</h1></blink><pre>"+request.parseError.reason+"</pre>";
								} else {
									var response = request.responseXML;
									if(!response) {
										if(request.responseText) {
											var parser = new DOMParser();
											response = parser.parseFromString(request.responseText,'application/xml');
										} else {
											// Backend error.
											themessagediv.innerHTML+='<blink><h1 style="color:red">FATAL ERROR B: (with '+theurl+') Please notify it to INB Web Workflow Manager developer</h1></blink>';
										}
									}
									// Only parse when an answer is available
									Baclava.Parser(response,thehash,themessagediv);
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
								themessagediv.innerHTML+='<blink><h1 style="color:red">FATAL ERROR while fetching '+theurl+': '+
									request.status+' '+statusText+'</h1></blink>';
							}
						} else {
							themessagediv.innerHTML+='<blink><h1 style="color:red">FATAL ERROR F: (with '+theurl+') Please notify it to INB Web Workflow Manager developer</h1></blink>';
						}
					} catch(e) {
						themessagediv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to complete '+theurl+' reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
					} finally {
						request.onreadystatechange=new Function();
					}
				}
			};
			
			// Now it is time to send the query
			request.open('GET',theurl,true);
			request.send(null);
		} catch(e) {
			themessagediv.innerHTML+='<blink><h1 style="color:red">FATAL ERROR: Unable to start '+theurl+' reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
			request=undefined;
		}
		
		return request;
	},
	
	fetchBaclava: function(baseJob,themessagediv,gotInputHandler,gotOutputHandler,/* optional */ istep) {
		var relpath=baseJob+'/'+EnactionView.getJobDir(this.name)+'/';
		
		// Determining whether 
		if(this.hasInputs && !(this.input[WorkflowStep.GOT]) && !this.bacInput) {
			this.bacInput=this.fetchBaclavaObject(relpath+'Inputs.xml',this.input,themessagediv,gotInputHandler,istep);
		}
		
		if(this.hasOutputs && !(this.output[WorkflowStep.GOT]) && !this.bacOutput) {
			this.bacOutput=this.fetchBaclavaObject(relpath+'Outputs.xml',this.output,themessagediv,gotOutputHandler,istep);
		}
		
		// Now, the iterations
		if(this.iterations) {
			var iti = this.iterations;
			var itil = iti.length;
			for(var i=0; i<itil ; i++) {
				iti[i].fetchBaclava(relpath+'Iterations',themessagediv,gotInputHandler,gotOutputHandler,i);
			}
		}
	}
};

function JMolAlert(appname,info,addi) {
	if(info=='Script completed' && JMolAlert.runme) {
		//var d=new Date();
		//alert('alerta '+d.getTime()+' '+appname+' '+info+' '+addi);
		// This alert avoids a Java plugin deadlock
		setTimeout(JMolAlert.runme,100);
	}
}

JMolAlert.runme=undefined;

/* Data viewer, the must-be royal crown */
function DataViewer(dataviewerId,genview) {
	this.genview=genview;
	
	this.dataviewerDiv=genview.getElementById(dataviewerId);
	this.mimeSelect=genview.getElementById('mimeSelect');
	this.data=undefined;
	this.base64data=undefined;
	this.mimeList=undefined;
	
	jmolInitialize('js/jmol');
	jmolSetDocument(false);
	jmolSetCallback('messageCallback','JMolAlert');
	
	var dataview=this;
	this.mimeChangeFunc=function() {
		if(this.selectedIndex!=-1) {
			dataview.applyView(this.options[this.selectedIndex].value);
		}
	};
}

DataViewer.prototype={
	openProcessFrame: function () {
		this.genview.openFrame('preprocessData',1);
	},
	
	closeProcessFrame: function() {
		this.genview.closeFrame();
	},
	
	clearView: function () {
		WidgetCommon.removeEventListener(this.mimeSelect,'change',this.mimeChangeFunc,false);
		this.data=undefined;
		this.base64data=undefined;
		this.mimeList=undefined;
		GeneralView.freeContainer(this.dataviewerDiv);
		GeneralView.freeSelect(this.mimeSelect);
	},
		
	show: function(data,mimeList) {
		this.clearView();
		
		// First, fill in mime type
		if(mimeList) {
			if(mimeList.length==0) {
				mimeList.push('text/plain');
			}
			this.mimeList=mimeList;

			for(var i=0;i<mimeList.length;i++) {
				var iterM=this.genview.createElement('option');
				iterM.text=iterM.value=mimeList[i];
				try {
					this.mimeSelect.add(iterM,null);
				} catch(e) {
					this.mimeSelect.add(iterM);
				}
			}

			// Second, set the data
			// which it is in base64
			this.openProcessFrame();
			var dataview=this;
			this.base64data=data;
			// Base64.streamDecode(data,function(decdata) {
			Base64.streamBase64UTF8Decode(data,function(decdata) {
				dataview.data=decdata;
				
				dataview.closeProcessFrame();
				// Third, apply best view!
				dataview.applyView();
				
				// Fourth, assign handler
				WidgetCommon.addEventListener(dataview.mimeSelect,'change',dataview.mimeChangeFunc,false);
			});
		} else {
			// Default case, no view
			var iterM=this.genview.createElement('option');
			iterM.text=iterM.value='NO ONE';
			try {
				this.mimeSelect.add(iterM,null);
			} catch(e) {
				this.mimeSelect.add(iterM);
			}
			this.mimeList=undefined;
			this.data=undefined;
		}
	},
	
	applyView: function (mime) {
		// Choose the best view
		if(!mime) {
			if(this.mimeList) {
				// Default case
				mime=undefined;
				var bestIndex=-1;
				var tpIndex=-1;
				for(var i=0;i<this.mimeList.length;i++) {
					if(bestIndex==-1 && this.mimeList[i]!='text/plain' && this.mimeList[i]!='application/octet-stream') {
						bestIndex=i;
					}
					if(this.mimeList[i]=='text/plain' || (tpIndex==-1 && this.mimeList[i]=='application/octet-stream')) {
						tpIndex=i;
					}
				}
				
				if(bestIndex==-1) {
					if(tpIndex==-1) {
						tpIndex=0;
					}
					bestIndex=tpIndex;
				}
				mime=this.mimeList[bestIndex];
				
				this.mimeSelect.selectedIndex=bestIndex;
			} else {
				// No data :-(
				this.dataviewerDiv.innerHTML='<i>NO DATA</i>';
				return;
			}
		}
		
		
		// Now, time to apply view
		if(this.data) {
			GeneralView.freeContainer(this.dataviewerDiv);
			switch(mime) {
				case 'application/octet-stream':
					this.dataviewerDiv.innerHTML='Sorry, unable to show binary-labeled data (yet)!';
					break;
				case 'image/*':
				case 'image/png':
				case 'image/jpeg':
				case 'image/gif':
					// This works with any browser but explorer, nuts!
					var img=new Image();
					img.src='data:'+mime+';base64,'+this.base64data;
					this.dataviewerDiv.appendChild(img);
					break;
				case 'image/svg+xml':
					var objres=undefined;
					if(BrowserDetect.browser!='Explorer') {
						objres=this.genview.createElement('object');
						objres.setAttribute("data",url);
					} else {
						objres=this.genview.createElement('embed');
						objres.setAttribute("pluginspage","http://www.adobe.com/svg/viewer/install/");
						objres.setAttribute("src",url);
					}
					objres.setAttribute("type","image/svg+xml");
					objres.setAttribute("wmode","transparent");
					objres.setAttribute("width",'100%');
					objres.setAttribute("height",'100%');
					this.dataviewerDiv.appendChild(objres);
					break;
				case 'chemical/x-alchemy':
				case 'chemical/x-cif':
				case 'chemical/x-gaussian-cube':
				case 'chemical/x-mdl-molfile':
				case 'chemical/x-mdl-sdfile':
				case 'chemical/x-mmcif':
				case 'chemical/x-mol2':
				case 'chemical/x-mopac-out':
				case 'chemical/x-pdb':
				case 'chemical/x-xyz':
					/*
					this.dataviewerDiv.innerHTML=jmolAppletInline([300,450],
						this.data,
						'cartoon on;color cartoons structure',
						'jmol'
					);
					*/
					//jmolSetCallback('loadStructCallback',);
					switch(BrowserDetect.browser) {
						case 'Explorer':
						case 'Safari':
						case 'Opera':
							this.dataviewerDiv.innerHTML=jmolAppletInline([300,450],
								this.data,
								'select all ; wireframe off ; spacefill off ; cartoon on ; color cartoons structure',
								'jmol'
							);
						default:
							var dataview=this;
							JMolAlert.runme=function() {
								jmolLoadInlineScript(dataview.data,
									'select all ; wireframe off ; spacefill off ; cartoon on ; color cartoons structure',
									'jmol');
								JMolAlert.runme=undefined;
							};
							this.dataviewerDiv.innerHTML=jmolApplet([300,450],'echo','jmol');
							break;
						/*
						default:
							var applet = this.genview.createElement('applet');
							var param = this.genview.createElement("param");
							param.setAttribute("name","progressbar");
							param.setAttribute("value","true");
							applet.appendChild(param);
							applet.name="jmol";
							applet.setAttribute("archive","JmolApplet0.jar");
							applet.setAttribute("codebase","js/jmol");
							applet.setAttribute("mayscript","true");
							applet.setAttribute("style","width:300;height:450");
							applet.setAttribute("code","JmolApplet");

							this.dataviewerDiv.appendChild(applet);

							var dataview=this;

							var loadme = function() {
								try {
									if(applet.isActive() && applet.loadInline) {
										//alert(applet.loadInline);
										setTimeout(function() {
											applet.loadInline(
												dataview.data,
												'select all ; wireframe off ; spacefill off ; cartoon on ; color cartoons structure'
	//											'define ~myset (*.N?);select ~myset;color green;select *;color cartoons structure;color rockets chain;color backbone blue'
											);
										},500);
									} else {
										setTimeout(loadme,100);
									}
								} catch(e) {
									setTimeout(loadme,100);
								}
							};
							loadme();
							break;
						*/
					}
					break;
				case 'text/html':
					// A bit risky, isn't it?
					// Better an iframe, but not know
					//this.dataviewerDiv.innerHTML=this.data;
					var ifraId='_ifra_';
					this.dataviewerDiv.innerHTML="<iframe id='"+ifraId+"' name='"+ifraId+"' frameborder='0' style='margin: 0px; padding: 0px; overflow: auto; height:100%; width: 100%;'></iframe>";
					var ifra=WidgetCommon.getIFrameDocumentFromId(ifraId);
					ifra.open('text/html');
					ifra.write(this.data);
					ifra.close();
					ifra=null;
					break;
				case 'text/x-taverna-web-url':
					var a=this.genview.createElement('a');
					a.href=this.data;
					a.target='_blank';
					a.innerHTML=this.data;
					this.dataviewerDiv.appendChild(a);
					break;
				case 'text/xml':
				case 'text/plain':
				//case 'chemical/x-fasta':
				default:
					// Use the prettyfier!
					var dataCont = this.genview.createElement('pre');
					dataCont.className='prettyprint noborder';
					var tnode = this.genview.thedoc.createTextNode(this.data);
					dataCont.appendChild(tnode);
					this.dataviewerDiv.appendChild(dataCont);
					
					// Now, prettyPrint!!!!
					if(/^\s*</.test(this.data) && />\s*$/.test(this.data)) {
						var htmldata=this.data.toString();
						htmldata=htmldata.replace(/&/g,'&amp;');
						htmldata=htmldata.replace(/</g,'&lt;');
						htmldata=htmldata.replace(/>/g,'&gt;');
						htmldata=htmldata.replace(/"/g,'&quot;');
						dataCont.innerHTML=prettyPrintOne(htmldata);
					}
					break;
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
	this.statusSpan=genview.getElementById('statusSpan');
	
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
	
	this.iterationSelect=genview.getElementById('iterationSelect');
	this.inContainer=genview.getElementById('inputs');
	this.outContainer=genview.getElementById('outputs');
	this.inputsSpan=genview.getElementById('inputsSpan');
	this.outputsSpan=genview.getElementById('outputsSpan');
	
	this.IOTypeSpan=genview.getElementById('IOTypeSpan');
	this.IONameSpan=genview.getElementById('IONameSpan');
	this.dataviewer=new DataViewer('dataviewer',genview);
	
	var enactview=this;
	
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
	
	// Now, time to initialize all!

	//this.JobsBase=undefined;
	//
	//this.domStatus=undefined;
	this.internalDispose();
	
	this.stepClickHandler = function (theid) {
		enactview.showStepFromId(this.getAttribute?this.getAttribute("id"):theid);
	};
	
	this.jobClickHandler = function (theid) {
		enactview.showWorkflowJobFromId(this.getAttribute?this.getAttribute("id"):theid);
	};
	
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

EnactionView.BaseHREF = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
	
EnactionView.prototype = {
	openReloadFrame: function () {
		this.genview.openFrame('reloadEnaction',1);
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame();
	},
	
	clearView: function () {
		this.svg.removeSVG();
		
		// TODO
		// Some free containers will be here
		GeneralView.freeSelect(this.mimeSelect);
		
		this.step=undefined;
		this.istep=undefined;
		this.setStep();
		
		this.dataviewer.clearView();
		GeneralView.freeContainer(this.dateSpan);
		GeneralView.freeContainer(this.generalStatusSpan);
		GeneralView.freeContainer(this.stageSpan);
		GeneralView.freeContainer(this.statusSpan);
		GeneralView.freeContainer(this.IOTypeSpan);
		GeneralView.freeContainer(this.IONameSpan);
	},
	
	internalDispose: function() {
		this.JobsBase=undefined;
		this.jobDir=undefined;
		this.domStatus=undefined;
		this.svg.removeSVG();
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
		// TODO?
	},
	
	fillEnactionStatus: function(enactDOM) {
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
				
				var state=enStatus.getAttribute('state');
				
				// First run
				if(state!='unknown' && state!='queued' && !this.initializedSVG) {
					this.initializedSVG=1;
					var enactview=this;
					this.waitingSVG=1;
					this.svg.loadSVG(GeneralView.SVGDivId,
						this.JobsBase+'/'+this.jobDir+'/workflow.svg',
						'100mm',
						'120mm',
						function() {
							enactview.waitingSVG=undefined;
							enactview.refreshEnactionStatus(state);
						});
				} else {
					this.refreshEnactionStatus(state);
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
				gstate="<span style='color:blue'><b>"+gstate+"</b></span>";
				break;
			case 'dead':
			case 'error':
				gstate="<span style='color:red'><b>"+gstate+"</b></span>";
				break;
			case 'unknown':
				gstate='<b>'+gstate+'</b>';
			case 'running':
				gstate='<i>'+gstate+'</i>';
				break;
		}

		return gstate;
	},
	
	refreshEnactionStatus: function(state) {
		if(!state)  state='undefined';
		
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
		} else {
			this.svg.removeSVG();
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
					tramp.removeNodeHandler(step.name,this.stepClickHandler,'click');
					tramp.setNodeHandler(step.name,this.stepClickHandler,'click');
					break;
			}
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
	
	setStep: function (step,iteration) {
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
				iteration=parseInt(iteration);
			}
			if(!this.step || this.step.name!=step.name || this.step!=step) {
				this.stageSpan.innerHTML=step.name;
				this.statusSpan.innerHTML=this.genGraphicalState(step.state);
			}
			this.step=step;
			this.istep=iteration;

			// Filling iterations
			var iterO=this.genview.createElement('option');
			iterO.value=-1;
			iterO.text=(((step.input[WorkflowStep.GOT]) && (step.output[WorkflowStep.GOT]))?'':'* ')+'Whole';
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
				var giter=gstep.iterations;
				var giterl = giter.length;
				for(var i=0;i<giterl;i++) {
					var ministep=giter[i];
					iterO=this.genview.createElement('option');
					iterO.value=i;
					iterO.text=(((ministep.input[WorkflowStep.GOT]) && (ministep.output[WorkflowStep.GOT]))?'':'* ')+ministep.name;
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

				this.iterSelectHandler=function() {
					if(this.selectedIndex!=-1) {
						enactview.setStep(gstep,this.options[this.selectedIndex].value);
					}
				};
				WidgetCommon.addEventListener(this.iterationSelect,'change',this.iterSelectHandler,false);
			}
			// Fetching data after, not BEFORE creating the select
			var outputSignaler = function(istep) {
				enactview.tryUpdateIOStatus(gstep,istep,'output',enactview.outputsSpan,enactview.outContainer,'hasOutputs');
			};
			gstep.fetchBaclava(EnactionView.BaseHREF+'/'+this.JobsBase+((step.name!=this.jobId)?('/'+this.jobDir+'/Results'):''),this.messageDiv,inputSignaler,outputSignaler);
			
			
			// For this concrete (sub)step
			// Inputs
			this.updateIOStatus(step.input,this.inputsSpan,this.inContainer,step.hasInputs);

			// Outputs
			this.updateIOStatus(step.output,this.outputsSpan,this.outContainer,step.hasOutputs);
		} else {
			// Clearing view
			GeneralView.freeContainer(this.inContainer);
			GeneralView.freeContainer(this.outContainer);
			this.stageSpan.innerHTML='NONE';
			this.statusSpan.innerHTML='NONE'
			this.inContainer.innerHTML='<i>(None)</i>';
			this.outContainer.innerHTML='<i>(None)</i>';
			var iterO=this.genview.createElement('option');
			iterO.value='NONE';
			iterO.text='NONE';
			try {
				this.iterationSelect.add(iterO,null);
			} catch(e) {
				this.iterationSelect.add(iterO);
			}
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
					tramp.changeNodeFill(tit,(stateName=='frozen')?'blue':'red');
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
	
	updateIOStatus: function(stepIO,IOSpan,IOContainer,hasIO) {
		GeneralView.freeContainer(IOContainer);
		var loaded=stepIO[WorkflowStep.GOT];
		IOSpan.className=(!hasIO || loaded)?'IOStat':'IOStatLoading';
		if(loaded) {
			for(var IO in stepIO) {
				if(IO==WorkflowStep.GOT)  continue;
				this.generateIO(IO,(loaded)?stepIO[IO].data:undefined,(loaded)?stepIO[IO].mime:undefined,IOContainer);
			}
		}
	},
	
	tryUpdateIOStatus: function(gstep,istep,stepIOFacet,IOSpan,IOContainer,hasIOFacet) {
		if(this.step==gstep) {
			// Update the selection text
			var tstep;
			if(!istep) {
				istep=-1;
				tstep='Whole';
			} else {
				istep=parseInt(istep);
				tstep=istep+1;
			}
			
			this.iterationSelect.options[istep+1].text=tstep;
			
			// And perhaps the generated tree!
			if(this.istep==istep) {
				this.updateIOStatus(gstep[stepIOFacet],IOSpan,IOContainer,gstep[hasIOFacet]);
			}
		}
	},
	
	// Tree-like structure
	generateIO: function(thekey,theval,mime,parentContainer) {
		if(typeof theval != 'object') {
			// A leaf
			var span = this.genview.createElement('div');
			span.innerHTML=thekey;
			if(theval) {
				span.className='leaf';
				var dataviewer=this.dataviewer;
				// Event to show the information
				WidgetCommon.addEventListener(span,'click',function () {
					dataviewer.show(theval,mime);
				},false);
			} else {
				span.className='deadleaf';
			}
			
			//parentContainer.appendChild(this.genview.createElement('br'));
			parentContainer.appendChild(span);
		} else {
			// A branch
			var div = this.genview.createElement('div');
			div.className='branch';
			var span = this.genview.createElement('span');
			span.className='branchlabel';
			span.innerHTML=thekey;
			div.appendChild(span);
			parentContainer.appendChild(div);
			// Event to show the contents
			WidgetCommon.addEventListener(span,'click',function () {
				if(this.parentNode.className=='branch') {
					this.parentNode.className+=' open';
				} else {
					this.parentNode.className='branch';
				}
			},false);
			
			// Now the children
			for(var facet in theval) {
				this.generateIO(facet,theval[facet],mime,div);
			}
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
											enactQueryReq.enactview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR B: Please notify it to INB Web Workflow Manager developer</h1></blink>';
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
						enactQueryReq.onreadystatechange = new Function();
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
			this.check.doUncheck();
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
		
		this.genview.openFrame('viewOtherEnaction',1);
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
		this.genview.openFrame('snapshotEnaction',1);
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
		this.genview.closeFrame();
		GeneralView.freeContainer(this.snapshotDescContainer);
	}
};
