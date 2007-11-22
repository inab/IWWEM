/*
	workflowmanager.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function WorkflowManagerCustomInit() {
	this.manview=new ManagerView(this);
	this.newwfview=new NewWorkflowView(this);
	this.newenactview=new NewEnactionView(this);
	this.manview.reloadList();
}

function WorkflowManagerCustomDispose() {
	if(this.manview && this.manview.svg) {
		this.manview.svg.clearSVG();
	}
	if(this.newenactview && this.newenactview.enactSVG) {
		this.newenactview.enactSVG.clearSVG();
	}
}

/*
	These classes model the retrieved information about available workflows.
*/
function IODesc(ioD) {
	this.name=ioD.getAttribute('name');
	this.mime=new Array();
	for(var child=ioD.firstChild; child ; child=child.nextSibling) {
		if(child.nodeType==1) {
			switch(GeneralView.getLocalName(child)) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					this.description = WidgetCommon.getTextContent(child);
					break;
				case 'mime':
					this.mime.push(child.getAttribute('type'));
					break;
			}
		}
	}
	
}

function InputExample(inEx) {
	this.name=inEx.getAttribute('name');
	this.uuid=inEx.getAttribute('uuid');
	this.date=inEx.getAttribute('date');
	this.path=inEx.getAttribute('path');
	this.description = WidgetCommon.getTextContent(inEx);
}

InputExample.prototype = {
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var exSelOpt = thedoc.createElement('option');
		exSelOpt.value = this.uuid;
		exSelOpt.text = this.name+' ('+this.date+')';
		
		return exSelOpt;
	}
};

function OutputSnapshot(ouSn) {
	this.name=ouSn.getAttribute('name');
	this.uuid=ouSn.getAttribute('uuid');
	this.date=ouSn.getAttribute('date');
	this.description = WidgetCommon.getTextContent(ouSn);
}

OutputSnapshot.prototype = {
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var snSelOpt = thedoc.createElement('option');
		snSelOpt.value = this.uuid;
		snSelOpt.text = this.name+' ('+this.date+')';
		
		return snSelOpt;
	}
};

function WorkflowDesc(wfD) {
	this.uuid = wfD.getAttribute('uuid');
	this.path = wfD.getAttribute('path');
	this.svgpath = wfD.getAttribute('svg');
	this.title = wfD.getAttribute('title');
	this.lsid = wfD.getAttribute('lsid');
	this.author = wfD.getAttribute('author');
	
	var depends=new Array();
	var inputs=new Array();
	var outputs=new Array();
	var examples=new Array();
	var snapshots=new Array();
	this.depends=depends;
	this.inputs=inputs;
	this.outputs=outputs;
	this.examples=examples;
	this.snapshots=snapshots;
	
	this.description=undefined;
	this.hasInputs=undefined;
	this.hasExamples=undefined;
	
	for(var child=wfD.firstChild;child;child=child.nextSibling) {
		// Only element children, please!
		if(child.nodeType == 1) {
			switch(GeneralView.getLocalName(child)) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					this.description = WidgetCommon.getTextContent(child);
					break;
				case 'dependsOn':
					depends.push(child.getAttribute('sub'));
					break;
				case 'example':
					var newExample = new InputExample(child);
					examples[newExample.uuid]=newExample;
					this.hasExamples=1;
					break;
				case 'snapshot':
					var newSnapshot = new OutputSnapshot(child);
					snapshots[newSnapshot.uuid]=newSnapshot;
					break;
				case 'input':
					var newInput = new IODesc(child);
					inputs[newInput.name]=newInput;
					this.hasInputs=1;
					break;
				case 'output':
					var newOutput = new IODesc(child);
					outputs[newOutput.name]=newOutput;
					break;
			}
		}
	}
}

WorkflowDesc.prototype = {
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var wfO = thedoc.createElement('option');
		wfO.value = wfO.id = this.uuid;
		wfO.text = this.title+' ['+this.lsid+']';
		
		return wfO;
	}
};

/*
	This class manages the available workflows view
*/
function ManagerView(genview) {
	this.genview=genview;
	this.wfselect=genview.getElementById('workflow');
	this.messageDiv=genview.getElementById('messageDiv');
	
	this.titleContainer=genview.getElementById('title');
	this.lsidContainer=genview.getElementById('lsid');
	this.authorContainer=genview.getElementById('author');
	this.descContainer=genview.getElementById('description');
	this.inContainer=genview.getElementById('inputs');
	this.outContainer=genview.getElementById('outputs');
	this.snapContainer=genview.getElementById('snapshots');

	// this.svg=new TavernaSVG(this.svgdiv.id,'style/unknown.svg','75mm','90mm');
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
	
	this.wfA=new Array();
	this.listRequest=undefined;
	this.WFBase=undefined;
	
	var manview = this;
	// As confirm check is no more a real check, let's fake it!
	this.check=genview.getElementById('confirm');
	GeneralView.initCheck(this.check);
	WidgetCommon.addEventListener(this.check,'click', function() {
		if(this.checked) {
			this.setCheck(false);
		} else if(manview.wfselect.selectedIndex!=-1) {
			this.setCheck(true);
		} else {
			alert('This confirmation can only be checked when a workflow is selected');
		}
	},false);
	
	// To update on automatic changes of the selection box
	WidgetCommon.addEventListener(this.wfselect,'change',function () {
		manview.updateView();
		if(this.selectedIndex==-1 && manview.check.checked) {
			manview.check.setCheck(false);
		}
	},false);
	
}


ManagerView.prototype = {
	openReloadFrame: function () {
		this.genview.openFrame('reloadWorkflows');
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame();
	},
	
	clearView: function () {
		this.svg.removeSVG();
		
		GeneralView.freeContainer(this.titleContainer);
		GeneralView.freeContainer(this.lsidContainer);
		GeneralView.freeContainer(this.authorContainer);
		GeneralView.freeContainer(this.descContainer);
		GeneralView.freeContainer(this.snapContainer);
		GeneralView.freeContainer(this.inContainer);
		GeneralView.freeContainer(this.outContainer);
	},
	
	/**/
	getCurrentWorkflow: function () {
		var workflow;
		if(this.wfselect.selectedIndex!=-1) {
			workflow = this.wfA[this.wfselect.options[this.wfselect.selectedIndex].value];
		}
		
		return workflow;
	},
	
	/* This method updates the information shown about the focused workflow */
	updateView: function () {
		var workflow = this.getCurrentWorkflow();
		if(workflow) {
			// SVG graph
			this.svg.loadSVG(GeneralView.SVGDivId,this.WFBase+'/'+workflow.svgpath,'100mm','120mm');
			
			// Basic information
			this.titleContainer.innerHTML = (workflow.title && workflow.title.length>0)?workflow.title:'<i>(no title)</i>';
			this.lsidContainer.innerHTML = workflow.lsid;
			this.authorContainer.innerHTML = (workflow.author && workflow.author.length>0)?GeneralView.preProcess(workflow.author):'<i>(anonymous)</i>';
			
			// Naive detection of rich description
			if(workflow.description && workflow.description.length>0) {
				this.descContainer.innerHTML = GeneralView.preProcess(workflow.description);
			} else {
				this.descContainer.innerHTML = '<i>(None)</i>';
			}
			
			var br;
			var alink;
			
			// This is needed to append links to the description itself
			var thep = this.genview.createElement('p');
			alink = this.genview.createElement('a');
			alink.href = this.WFBase+'/'+workflow.svgpath;
			alink.target = '_blank';
			alink.innerHTML = '<i>Download Workflow Graph (SVG)</i>';
			thep.appendChild(alink);
			this.descContainer.appendChild(thep);
			
			thep = this.genview.createElement('p');
			alink = this.genview.createElement('a');
			alink.href = this.WFBase+'/'+workflow.path;
			alink.target = '_blank';
			alink.innerHTML = '<i>Download Workflow</i>';
			thep.appendChild(alink);
			this.descContainer.appendChild(thep);
			
			// Possible dependencies
			if(workflow.depends.length>0) {
				thep = this.genview.createElement('p');
				thep.innerHTML = '<i>(This workflow depends on '+workflow.depends.length+' subworkflow'+((workflow.depends.length>1)?'s':'')+')</i>';
				this.descContainer.appendChild(thep);
			}
			
			// Now, inputs and outputs
			this.attachIOReport(workflow.inputs,this.inContainer);
			this.attachIOReport(workflow.outputs,this.outContainer);
			
			// And at last, snapshots
			this.attachIOReport(workflow.snapshots,this.snapContainer,function(snap) {
				return '<i><a href="enactionviewer.html?jobId='+snap.uuid+'">'+snap.name+'</a> ('+snap.date+')</i>';
			});
		} else {
			this.clearView();
		}
	},
	
	/* This method fills in the known information about the workflow */
	fillWorkflowList: function (listDOM) {
		if(listDOM) {
			// First, remove its graphical traces
			this.clearView();
			
			// Second, remove its content
			this.wfA=new Array();
			GeneralView.freeSelect(this.wfselect);
			
			// Third, populate it!
			/*
			var docFacet = 'documentElement';
			if((docFacet in listDOM) &&
				('tagName' in listDOM[docFacet]) &&
				(listDOM[docFacet]['tagName']=='workflowlist')
			) {
			*/
			if(listDOM.documentElement &&
				listDOM.documentElement.tagName &&
				GeneralView.getLocalName(listDOM.documentElement)=='workflowlist'
			) {
				var wfL = GeneralView.getElementsByTagNameNS(listDOM,GeneralView.IWWEM_NS,'workflow');
				this.WFBase = listDOM.documentElement.getAttribute('relURI');
				for(var i=0;i<wfL.length;i++) {
					var workflow=new WorkflowDesc(wfL.item(i));
					this.wfA[workflow.uuid]=workflow;

					var wfO = workflow.generateOption(this.genview.thedoc);

					// Last: save selection!
					try {
						this.wfselect.add(wfO,null);
					} catch(e) {
						this.wfselect.add(wfO);
					}
				}

				// Including the possible error message
				var message = GeneralView.getElementsByTagNameNS(listDOM,GeneralView.IWWEM_NS,'message');
				if(message.length>0) {
					var child=message.item(0);
					var mtext;
					mtext=WidgetCommon.getTextContent(child);
					if(!mtext)  mtext='';
					this.messageDiv.innerHTML += '<p><u>Return Value:</u> '+child.getAttribute('retval')+'</p><pre>'+mtext+'</pre>';
				}
			} else {
				this.WFBase='.';
				this.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to fetch the workflow repository listing!</h1></blink>';
			}
		}
	},
	
	reloadList: function (/* optional */ wfToErase) {
		// First, uncheck the beast!
		this.check.setCheck(false);
		
		var qsParm = new Array();
		if(wfToErase) {
			qsParm['eraseWFId']=wfToErase;
		}
		var listQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/workflowmanager");
		var listRequest = this.listRequest = new XMLHttpRequest();
		listRequest.manview=this;
		GeneralView.freeContainer(this.messageDiv);
		try {
			listRequest.onreadystatechange = function() {
				if(listRequest.readyState==4) {
					try {
						if('status' in listRequest) {
							if(listRequest.status==200) {
								// Beware parsing errors in Explorer
								if(listRequest.parseError && listRequest.parseError.errorCode!=0) {
									listRequest.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR ('+
										listRequest.parseError.errorCode+
										") while parsing list at ("+
										listRequest.parseError.line+
										","+listRequest.parseError.linePos+
										"):</h1></blink><pre>"+listRequest.parseError.reason+"</pre>";
								} else {
									var response = listRequest.responseXML;
									if(!response) {
										if(listRequest.responseText) {
											var parser = new DOMParser();
											response = parser.parseFromString(listRequest.responseText,'application/xml');
										} else {
											// Backend error.
											listRequest.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR B: Please notify it to INB Web Workflow Manager developer</h1></blink>';
										}
									}
									listRequest.manview.fillWorkflowList(response);
								}
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in listRequest) && listRequest['statusText']) {
									statusText=listRequest.statusText;
								}
								listRequest.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR while fetching list: '+
									listRequest.status+' '+statusText+'</h1></blink>';
							}
						} else {
							listRequest.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR F: Please notify it to INB Web Workflow Manager developer</h1></blink>';
						}
					} catch(e) {
						listRequest.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
					} finally {
						// Removing 'Loading...' frame
						listRequest.manview.closeReloadFrame();
						listRequest.manview.listRequest=undefined;
						listRequest=undefined;
					}
				}
			};
			this.openReloadFrame();
			listRequest.open('GET',listQuery,true);
			listRequest.send(null);
		} catch(e) {
			this.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
		}
	},
	
	deleteWorkflow: function () {
		if(this.check.checked && this.wfselect.selectedIndex!=-1) {
			var sureErase=confirm('Are you REALLY sure you want to erase this workflow?');
			if(sureErase) {
				this.reloadList(this.wfselect.options[this.wfselect.selectedIndex].value);
			}
		}
	},
	
	attachIOReport: function(ioarray,ioContainer, /* optional */lineProc) {
		GeneralView.freeContainer(ioContainer);
		
		var ul;
		for(var iofacet in ioarray) {
			var io=ioarray[iofacet];
			if(!ul)  ul=this.genview.createElement('ul');
			var li=this.genview.createElement('li');
			var line;
			if(lineProc) {
				line=lineProc(io);
			} else {
				line='<i>'+io.name+' ('+io.mime.join(', ')+')</i>';
			}
			if('description' in io) {
				line += '<br>'+GeneralView.preProcess(io.description);
			}
			li.innerHTML=line;
			ul.appendChild(li);
		}
		if(ul) {
			ioContainer.appendChild(ul);
		} else {
			ioContainer.innerHTML='<i>(None)</i>';
		}
	}
};

function NewWorkflowView(genview) {
	this.genview = genview;
	this.uploading = undefined;
	
	this.iframe=genview.getElementById('uploadIFRAME');
	this.newWFForm=genview.getElementById('formNewWF');
	this.newWFContainer=genview.getElementById('newWFContainer');
	this.newWFUploading=genview.getElementById('newWFUploading');
	
	this.newWFStyleText=genview.getElementById('newWFStyleText');
	GeneralView.initBaseCN(this.newWFStyleText);
	
	this.newWFStyleFile=genview.getElementById('newWFStyleFile');
	GeneralView.initBaseCN(this.newWFStyleFile);
	
	var newwfview = this;
	// Either text or file
	WidgetCommon.addEventListener(this.newWFStyleText, 'click', function() { newwfview.setTextControl(); }, false);
	WidgetCommon.addEventListener(this.newWFStyleFile, 'click', function() { newwfview.setFileControl(); }, false);
	
	this.newWFControl = undefined;
	//this.iframe = undefined;
	
	// More on subworkflows
	this.newSubWFContainer=genview.getElementById('newSubWFContainer');
	
	// Setting up data island request
	if(BrowserDetect.browser=='Konqueror') {
		// This value must be 1 for IE data islands
		var dataIsland = genview.createHiddenInput(GeneralView.dataIslandMarker,"2");
		this.newWFForm.appendChild(dataIsland);
	}
}

NewWorkflowView.prototype = {
	openNewWorkflowFrame: function () {
		// These methods only work when they must!
		this.setFileControl();
		this.generateSubworkflowSpan();
		this.newWFUploading.style.visibility='hidden';
		
		this.genview.openFrame('newWorkflow');
	},
	
	clearView: function () {
		this.newWFControl = undefined;
		// Removing all the content from the container
		GeneralView.freeContainer(this.newWFContainer);
	},
	
	setTextControl: function() {
		GeneralView.checkCN(this.newWFStyleText);
		GeneralView.revertCN(this.newWFStyleFile);
		this.clearView();
		var textbox = this.genview.createElement('textarea');
		this.newWFControl = textbox;
		textbox.name="workflow";
		textbox.cols=80;
		textbox.rows=15;

		this.newWFContainer.appendChild(textbox);
	},
	
	setFileControl: function() {
		GeneralView.revertCN(this.newWFStyleText);
		GeneralView.checkCN(this.newWFStyleFile);
		this.clearView();
		var filecontrol = this.genview.createCustomizedFileControl("workflow");
		this.newWFControl = filecontrol;

		// We are appending the fake control!
		//this.newWFContainer.appendChild(filecontrol.parentNode);
		this.newWFContainer.appendChild(filecontrol);
	},
	
	/* Generates a new graphical input */
	generateSubworkflowSpan: function () {
		var fileSpan= this.genview.generateFileSpan('Add local subworkflow','workflowDep');
		this.newSubWFContainer.appendChild(fileSpan);
	},
	
	closeNewWorkflowFrame: function() {
		if(!this.uploading) {
			this.genview.closeFrame();
			this.clearView();
			GeneralView.freeContainer(this.newSubWFContainer);
		}
	},
	
	upload: function () {
		if(!this.uploading) {
			if(this.newWFControl && this.newWFControl.value && this.newWFControl.value.length > 0) {
				this.newWFUploading.style.visibility='visible';
				
				/*
					Dynamic IFRAME handling
					which not works in IE :-(
				
				// The iframe which will contain what we need
				var iframe = this.genview.createElement('iframe');
				var iframeName = iframe.name = WidgetCommon.getRandomUUID();
				iframe.frameBorder = '0';
				// This one is not working with Konqueror
				// iframe.style.display = 'none';
				iframe.style.height='0';
				iframe.style.width='0';
				iframe.style.visibility='hidden';

				// Iframe must live somewhere
				this.newWFUploading.appendChild(iframe);
				*/
				var iframe=this.iframe;
				var iframeName=iframe.name;
				
				// Setting up hooks to be fired!
				var newwfview=this;
				
				
				var onUpload = function() {
					// First, parsing content
					GeneralView.freeContainer(newwfview.genview.manview.messageDiv);
					var xdoc=WidgetCommon.getIFrameDocument(iframe);
					if(xdoc) {
						if(BrowserDetect.browser=='Explorer') {
							/* If we use a data island...
							
							xdoc = WidgetCommon.getElementById(GeneralView.dataIslandMarker,xdoc);
							if(xdoc)  xdoc = xdoc.XMLDocument;
							*/
							xdoc = xdoc.XMLDocument;
						} else if(BrowserDetect.browser=='Konqueror') {
							var CDATAIsland = WidgetCommon.getElementById(GeneralView.dataIslandMarker,xdoc);
							if(CDATAIsland) {
								var islandContent=WidgetCommon.getTextContent(CDATAIsland);
								var parser = new DOMParser();
								xdoc = parser.parseFromString(islandContent,'application/xml');
							}
						}
					}
					
					newwfview.genview.manview.fillWorkflowList(xdoc);
					// Now, cleaning up iframe traces!
					newwfview.uploading=false;
					newwfview.closeNewWorkflowFrame();
					/*
						Dynamic IFRAME handling
						which not works in IE :-(
					
					newwfview.newWFUploading.removeChild(iframe);
					*/
					WidgetCommon.removeEventListener(iframe,'load',onUpload,false);
					newwfview.newWFForm.target = undefined;
					// Avoiding post messages on page reload
					iframe.src="about:blank";
					iframe = undefined;
				};
				
				WidgetCommon.addEventListener(iframe,'load',onUpload,false);
				
				// And results must go there
				this.newWFForm.target=iframeName;
				// Let's go!
				this.uploading=true;
				this.newWFForm.submit();
			} else {
				alert('Please introduce the new workflow before submitting it!');
			}
		}
	}
};

function NewEnactionView(genview) {
	this.genview = genview;
	this.manview=genview.manview;
	
	this.iframe=genview.getElementById('enactIFRAME');
	this.newEnactForm=genview.getElementById('formEnactor');
	this.workflowHiddenInput=genview.getElementById('workflowHiddenInput');
	this.inputsContainer=genview.getElementById('newInputs');
	this.enactSVGContainer = genview.getElementById('enactsvg');
	this.newEnactUploading = genview.getElementById('newEnactUploading');
	this.submittedList = genview.getElementById('submittedList');
	
	this.enactSVG = new TavernaSVG();
	this.inputs=new Array();
	this.baclava=new Array();
	
	this.workflow=undefined;
	this.WFBase=undefined;
	
	// Setting up data island request
	if(BrowserDetect.browser=='Konqueror') {
		// This value must be 1 for IE data islands
		var dataIsland = genview.createHiddenInput(GeneralView.dataIslandMarker,"2");
		this.newEnactForm.appendChild(dataIsland);
	}
	
	this.noneExampleSpan=genview.getElementById('noneExampleSpan');
	GeneralView.initBaseCN(this.noneExampleSpan);
	
	this.saveAsExample=genview.getElementById('saveAsExampleSpan');
	GeneralView.initCheck(this.saveAsExample);
	
	this.useExampleSpan=genview.getElementById('useExampleSpan');
	GeneralView.initBaseCN(this.useExampleSpan);
	
	this.inputstatecontrol=undefined;
	
	this.saveExampleDiv=genview.getElementById('saveExampleDiv');
	
	this.inputmode=undefined;

	this.setupInputType();
}

NewEnactionView.prototype = {
	setInputMode: function(control) {
		if(this.inputstatecontrol!=control) {
			if(control==this.useExampleSpan && this.workflow && !this.workflow.hasExamples) {
				alert('Sorry, there is no registered input example for this workflow');
				return;
			}
			// Graphical handling
			if(this.inputstatecontrol) {
				GeneralView.revertCN(this.inputstatecontrol);
			}
			this.inputstatecontrol=control;
			
			this.disposeContainers();
			
			if(control) {
				GeneralView.checkCN(control);
				if(control==this.noneExampleSpan) {
					this.inputmode=false;
					this.generateInputsHandlers();
				} else {
					this.setSaveExampleMode(false);
					this.inputmode=true;
					this.generateExamplesSelect();
				}
			} else {
				this.inputmode=undefined;
			}
		}
	},
	
	setSaveExampleMode: function(state) {
		if(!this.inputmode) {
			if(state!=this.saveAsExample.checked) {
				if(this.saveAsExample.checked) {
					this.saveAsExample.setCheck(false);
					GeneralView.freeContainer(this.saveExampleDiv);
				} else {
					this.saveAsExample.setCheck(true);
					
					// MORE - creating dialog fields
					var spanName=this.genview.createElement('span');
					spanName.innerHTML='Example Name';
					var brName=this.genview.createElement('br');
					var exampleName=this.genview.createElement('input');
					exampleName.type='text';
					exampleName.name='exampleName';
					var br=this.genview.createElement('br');
					var spanDesc=this.genview.createElement('span');
					spanDesc.innerHTML='Description';
					var brDesc=this.genview.createElement('br');
					
					this.saveExampleDiv.appendChild(spanName);
					this.saveExampleDiv.appendChild(brName);
					this.saveExampleDiv.appendChild(exampleName);
					this.saveExampleDiv.appendChild(br);
					this.saveExampleDiv.appendChild(spanDesc);
					this.saveExampleDiv.appendChild(brDesc);
					
					if(FCKeditor_IsCompatibleBrowser()) {
						// Rich-Text Editor
						var exampleDesc=new FCKeditor('exampleDesc',undefined,'250','IWWEM');
						var basehref = window.location.pathname.substring(0,window.location.pathname.lastIndexOf('/'));
						exampleDesc.BasePath='js/FCKeditor/';
						exampleDesc.Config['CustomConfigurationsPath']=basehref+'/js/fckconfig_IWWEM.js';
						this.saveExampleDiv.innerHTML += exampleDesc.CreateHtml();
					} else {
						// I prefer my own defaults
						var exampleDesc=this.genview.createElement('textarea');
						exampleDesc.cols=60;
						exampleDesc.rows=10;
						exampleDesc.name='exampleDesc';
						this.saveExampleDiv.appendChild(exampleDesc);
					}
				}
			}
		}
	},
	
	switchSaveExampleMode: function() {
		this.setSaveExampleMode(this.saveAsExample.checked?false:true);
	},
	
	setupInputType: function() {
		// Input type selectors
		var newenact = this;
		var oninputClickHandler = function() {
			newenact.setInputMode(this);
		};
		
		WidgetCommon.addEventListener(this.noneExampleSpan, 'click', oninputClickHandler, false);
		WidgetCommon.addEventListener(this.useExampleSpan, 'click', oninputClickHandler, false);
		
		var saveExampleClickHandler = function() {
			newenact.switchSaveExampleMode();
		};
		
		WidgetCommon.addEventListener(this.saveAsExample, 'click', saveExampleClickHandler, false);
	},
	
	openNewEnactionFrame: function () {
		var workflow = this.manview.getCurrentWorkflow();
		if(workflow) {
			// First, do the needed preparations!
			var WFBase = this.manview.WFBase;
			
			// SVG graph
			this.workflow = workflow;
			this.WFBase = WFBase;
			this.enactSVG.loadSVG(this.enactSVGContainer.id,WFBase+'/'+workflow.svgpath,'100mm','120mm');
			
			// Inputs
			this.setInputMode(this.noneExampleSpan);
			this.setSaveExampleMode(false);
			
			// And at last, open frame
			this.genview.openFrame('newEnaction');
		} else {
			alert('Please, first select a workflow before trying to enact one');
		}
	},
	
	generateExamplesSelect: function() {
		// Examples selection
		var workflow=this.workflow;
		
		// First cell will have the selection form
		var exSelect = this.genview.createElement('select');
		exSelect.name = 'BACLAVA_FILE';
		
		// Second one will have the div
		// for the description
		var divdesc = this.genview.createElement('div');
		divdesc.className = 'scrolldatamin';
		
		// And last!!!!
		this.inputsContainer.innerHTML='Example ';
		this.inputsContainer.appendChild(exSelect);
		this.inputsContainer.appendChild(divdesc);
		
		// And the on change event, which must be taken into account
		var WFBase = this.manview.WFBase;
		var onSelectChange=function() {
			GeneralView.freeContainer(divdesc);
			if(exSelect.selectedIndex!=-1) {
				var example = workflow.examples[exSelect.options[exSelect.selectedIndex].value];
				
				var output='<b>Example name:</b> '+example.name;
				output += '<p>UUID:</b>&nbsp;'+example.uuid+'</p>';
				output += '<p><b>Date:</b> '+example.date+'</p>';
				output += '<p><i><a href="'+WFBase+'/'+example.path+'">Download link</a></i></p>';
				output += '<b>Description</b><br>';
				if(example.description && example.description.length>0) {
					output += GeneralView.preProcess(example.description);
				} else {
					output += '<i>(None)</i>';
				}
				
				divdesc.innerHTML=output;
			}
		};
		
		WidgetCommon.addEventListener(exSelect,'change',onSelectChange,false);
		
		if(workflow.hasExamples) {
			// Now it is time to fill in the select control
			for(var examplefacet in workflow.examples) {
				var example=workflow.examples[examplefacet];
				var exSelOpt=example.generateOption();

				// Last: save selection!
				try {
					exSelect.add(exSelOpt,null);
				} catch(e) {
					exSelect.add(exSelOpt);
				}
			}

			// And setting it up!
			exSelect.selectedIndex=0;
			onSelectChange();
		}
	},
	
	generateInputsHandlers: function() {
		this.inputCounter=0;
		// baclava onclick
		var thebaclava = this.generateBaclavaSpan();
		this.inputsContainer.appendChild(thebaclava);
		
		// Inputs
		var workflow=this.workflow;
		for(var inputfacet in workflow.inputs) {
			var input=workflow.inputs[inputfacet];
			var thediv = this.generateGraphicalInput(input);

			// And the container for the input!
			this.inputsContainer.appendChild(thediv);
		}
	},
	
	/* Generates a new graphical input */
	generateGraphicalInput: function (input) {
		var randominputid=WidgetCommon.getRandomUUID();

		// The container of all these 'static' elements
		var thediv = this.genview.createElement('div');
		thediv.className='borderedInput';

		// Dynamic input container
		var containerDiv=this.genview.createElement('div');
		containerDiv.id=randominputid;

		// 'Static' elements
		var theinput = this.genview.createElement('span');
		// The addition button
		theinput.className = 'plus';
		theinput.innerHTML='Input <span style="color:red;">'+input.name+'</span> ';
		
		var thechoicetext=this.genview.createElement('span');
		thechoicetext.className='radio left';
		GeneralView.initBaseCN(thechoicetext);
		GeneralView.checkCN(thechoicetext);
		thechoicetext.innerHTML='as text';
		
		var thechoicefile=this.genview.createElement('span');
		thechoicefile.className='radio left';
		GeneralView.initBaseCN(thechoicefile);
		thechoicefile.innerHTML='as file';
		
		var statecontrol=thechoicetext;
		
		var newenactview=this;
		var onclickHandler=function() {
			if(statecontrol!=this) {
				if(statecontrol) {
					GeneralView.revertCN(statecontrol);
				}
				GeneralView.checkCN(this);
				statecontrol=this;
				
				// Keeping an accurate number of inputs
				newenactview.inputCounter -= GeneralView.freeContainer(containerDiv);
			}
		};
		
		WidgetCommon.addEventListener(thechoicetext, 'click', onclickHandler, false);
		WidgetCommon.addEventListener(thechoicefile, 'click', onclickHandler, false);
		
		WidgetCommon.addEventListener(theinput, 'click', function() {
			var newinput;
			var glass;
			var controlname='PARAM_'+input.name
			if(statecontrol == thechoicefile) {
				newinput=newenactview.genview.createCustomizedFileControl(controlname);

				// As we are interested in the container (the parent)
				// let's get it...
				//newinput=newinput.parentNode;
			} else {
				newinput=newenactview.genview.createElement('input');
				newinput.type='text';
				newinput.name=controlname;

				glass=newenactview.genview.createElement('span');
				glass.className='magglass';
				glass.innerHTML='&nbsp;';
				WidgetCommon.addEventListener(glass,'click',function() {
					var renewinput;
					if(newinput.type=='text') {
						renewinput=newenactview.genview.createElement('textarea');
						renewinput.cols=60;
						renewinput.rows=10;
					} else {
						renewinput=newenactview.genview.createElement('input');
						renewinput.type='text';
					}
					// Replacing old text are with new one!
					renewinput.name=controlname;
					renewinput.value=newinput.value;
					mydiv.replaceChild(renewinput,newinput);
					newinput=renewinput;
				},false);

			}

			var remover=newenactview.genview.createElement('span');
			remover.className='plus remove';
			remover.innerHTML='&nbsp;';

			var mydiv=newenactview.genview.createElement('div');
			WidgetCommon.addEventListener(remover,'click',function() {
				containerDiv.removeChild(mydiv);
			},false);

			mydiv.appendChild(remover);
			if(glass)  mydiv.appendChild(glass);
			mydiv.appendChild(newinput);

			// Adding it to the container
			containerDiv.appendChild(mydiv);
			// Keeping an accurate input counter
			newenactview.inputCounter++;
		}, false);

		// Now, it is time to create the selection
		var thechoice = this.genview.createElement('span');
		thechoice.className='borderedOption';
		thechoice.appendChild(thechoicetext);
		thechoice.appendChild(thechoicefile);

		// Last children!
		thediv.appendChild(theinput);
		thediv.appendChild(thechoice);

		thediv.appendChild(containerDiv);
		
		
		return thediv;
	},
	
	/* Generates a new graphical input */
	generateBaclavaSpan: function () {
		return this.genview.generateFileSpan('Add Baclava file','BACLAVA_FILE',this);
	},
	
	disposeContainers: function() {
		GeneralView.freeContainer(this.inputsContainer);
	},
	
	clearView: function() {
		// Removing all the content from the containers
		this.enactSVG.removeSVG();
		this.disposeContainers();
		this.setInputMode(undefined);
	},
	
	closeNewEnactionFrame: function() {
		this.genview.closeFrame();
		
		this.clearView();
		this.workflow=undefined;
	},
	
	openSubmitFrame: function() {
		var elem=this.genview.getElementById('submitEnaction');
		elem.className='submitEnaction';
	},
	
	closeSubmitFrame: function() {
		var elem=this.genview.getElementById('submitEnaction');
		elem.className='hidden';
	},
	
	enact: function () {
		if(this.workflow.hasInputs && !this.inputmode && this.inputCounter<=0) {
			alert('You must introduce an input before trying to\nstart the enaction process');
		} else {

			// First, locking the window
			this.openSubmitFrame();

			/*
				Dynamic IFRAME handling
				which not works in IE :-(

			// The iframe which will contain what we need
			var iframe = this.genview.createElement('iframe');
			var iframeName = iframe.name = WidgetCommon.getRandomUUID();
			iframe.frameBorder = '0';
			// This one was not working with Konqueror
			// iframe.style.display = 'none';
			iframe.style.height=0;
			iframe.style.width=0;
			iframe.style.visibility='hidden';

			// Iframe must live somewhere
			this.newEnactUploading.appendChild(iframe);
			*/
			var iframe=this.iframe;
			var iframeName=this.iframe.name;
			this.workflowHiddenInput.value = this.workflow.uuid;

			// The hooks
			var newenactview = this;
			var iframeLoaded = function() {
				// First, parsing content
				GeneralView.freeContainer(newenactview.genview.manview.messageDiv);
				var xdoc=WidgetCommon.getIFrameDocument(iframe);
				if(xdoc) {
					if(BrowserDetect.browser=='Explorer') {
						/* If we use a data island...

						xdoc = WidgetCommon.getElementById(GeneralView.dataIslandMarker,xdoc);
						if(xdoc)  xdoc = xdoc.XMLDocument;
						*/
						xdoc = xdoc.XMLDocument;
					} else if(BrowserDetect.browser=='Konqueror') {
						var CDATAIsland = WidgetCommon.getElementById(GeneralView.dataIslandMarker,xdoc);
						if(CDATAIsland) {
							var islandContent=WidgetCommon.getTextContent(CDATAIsland);
							var parser = new DOMParser();
							xdoc = parser.parseFromString(islandContent,'application/xml');
						}
					}
				}

				// Second, job id and others
				var launched=newenactview.parseEnactionIdAndLaunch(xdoc);

				// Now, cleaning up iframe traces!
				newenactview.closeSubmitFrame();
				//if(launched) {
				newenactview.closeNewEnactionFrame();
				//}

				/*
					Dynamic IFRAME handling
					which not works in IE :-(

				newenactview.newEnactUploading.removeChild(iframe);
				*/
				WidgetCommon.removeEventListener(iframe,'load',iframeLoaded,false);
				newenactview.newEnactForm.target = undefined;
				// Avoiding post messages on page reload
				iframe.src="about:blank";
				iframe = undefined;
			};
			WidgetCommon.addEventListener(iframe,'load',iframeLoaded,false);

			// And results must go there
			this.newEnactForm.target=iframeName;
			// Let's go!
			this.newEnactForm.submit();
		}
	},
	
	parseEnactionIdAndLaunch: function(enactIdDOM) {
		var enactId;
		
		if(enactIdDOM) {
			if(enactIdDOM.documentElement &&
				enactIdDOM.documentElement.tagName &&
				(GeneralView.getLocalName(enactIdDOM.documentElement)=='enactionlaunched')
			) {
				enactId = enactIdDOM.documentElement.getAttribute('jobId');
				if(enactId) {
					var time=enactIdDOM.documentElement.getAttribute('time');
					// Time to open a new window
					var theURL="enactionviewer.html?jobId="+enactId;
					var popup=window.open(theURL,'_blank');
					if(!popup) {
						alert('Your browser has just blocked the new enaction window.\nYou can find the link under the\nSubmitted Enaction Jobs area');
					}
					
					// And leave a trace!
					var theli=this.genview.createElement('li');
					theli.innerHTML=time+': <a href="'+theURL+'" target="_blank">'+enactId+'</a>';
					this.submittedList.appendChild(theli);
				}
			} else {
				this.genview.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to start the enaction process</h1></blink>';
			}
		}
		
		return enactId;
	}
};
