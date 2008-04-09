/*
	$Id$
	workflowmanager.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function WorkflowManagerCustomInit() {
	var manview = this.manview=new ManagerView(this);
	this.newwfview=new NewWorkflowView(this);
	this.newenactview=new NewEnactionView(this);
	
	manview.svg.removeSVG(function() {
		manview.reloadList();
	});
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
	This class manages the available workflows view
*/
function ManagerView(genview) {
	this.genview=genview;
	//this.wfselect=genview.getElementById('workflow');
	this.wfselect=new GeneralView.Select(genview,'workflow',genview.getElementById('workflow'));
	this.messageDiv=genview.getElementById('messageDiv');
	
	this.wfreport=new WorkflowReport(genview,'wfReportDiv');
	
	this.reloadButton=genview.getElementById('reloadButton');
	this.updateTextSpan=genview.getElementById('updateTextSpan');

	this.launchButton=genview.getElementById('launchButton');
	this.deleteButton=genview.getElementById('deleteButton');
	this.launchButton.className='buttondisabled';
	this.deleteButton.className='buttondisabled';
	
	// this.svg=new TavernaSVG(this.svgdiv.id,'style/unknown.svg','75mm','90mm');
	this.svg=new TavernaSVG(GeneralView.SVGDivId,'style/unknown-inb.svg');
	
	this.wfA={};
	this.listRequest=undefined;
	this.WFBase=undefined;
	
	var manview = this;
	// As confirm check is no more a real check, let's fake it!
	var check;
	check = this.check = new GeneralView.Check(genview.getElementById('confirm'),function() {
		if(check.checked) {
			check.doUncheck();
		} else if(manview.wfselect.selectedIndex!=-1) {
			check.doCheck();
		} else {
			alert('This confirmation can only be checked when a workflow is selected');
		}
	});
	
	// To update on automatic changes of the selection box
	this.wfselect.addEventListener('change',function () {
		manview.updateView(function() {
			if(manview.wfselect.selectedIndex==-1) {
				manview.launchButton.className='buttondisabled';
				manview.deleteButton.className='buttondisabled';
				if(manview.check.checked) {
					manview.check.setCheck(false);
				}
			} else {
				manview.launchButton.className='button';
				manview.deleteButton.className='button';
			}
		});
	},false);
	
	WidgetCommon.addEventListener(this.deleteButton,'click',function() {
		manview.deleteWorkflow();
	},false);
	
	WidgetCommon.addEventListener(this.reloadButton,'click',function() {
		manview.reloadList();
	},false);
	
	// SVG resize
	WidgetCommon.addEventListener(window,'resize',function() {
		manview.updateSVGSize();
	},false);
	
	/*
	WidgetCommon.addEventListener(this.wfselect,'change',function () {
		manview.updateView(function() {
			if(manview.wfselect.selectedIndex==-1 && manview.check.checked) {
				manview.check.setCheck(false);
			}
		});
	},false);
	*/
	
	this.frameReloadId=undefined;
}


ManagerView.prototype = {
	openReloadFrame: function () {
		this.frameReloadId=this.genview.openFrame('reloadWorkflows');
	},
	
	closeReloadFrame: function() {
		this.genview.closeFrame(this.frameReloadId);
	},
	
	clearView: function (/*optional*/callbackFunc) {
		var wfreport=this.wfreport;
		this.svg.removeSVG(function() {
			wfreport.clearView();
			if(typeof callbackFunc=='function') {
				callbackFunc();
			}
		});
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
	updateView: function (/*optional*/callbackFunc) {
		var workflow = this.getCurrentWorkflow();
		if(workflow) {
			// SVG graph
			//this.svg.loadSVG(GeneralView.SVGDivId,this.WFBase+'/'+workflow.svgpath,'100mm','120mm');
			var wfreport=this.wfreport;
			var WFBase=this.WFBase;
			var parentno=this.genview.getElementById(GeneralView.SVGDivId).parentNode;
			var maxwidth=(parentno.clientWidth-32)+'px';
			this.svg.loadSVG(GeneralView.SVGDivId,this.WFBase+'/'+workflow.svgpath,maxwidth,'120mm',function() {
				wfreport.updateView(WFBase,workflow);
				if(typeof callbackFunc=='function') {
					callbackFunc();
				}
			});
		} else {
			this.clearView(callbackFunc);
		}
	},
	
	/* This method updates the size of the workflow */
	updateSVGSize: function () {
		var parentno=this.genview.getElementById(GeneralView.SVGDivId).parentNode;
		var maxwidth=(parentno.clientWidth-32)+'px';
		this.svg.SVGrescale(maxwidth,'120mm');
	},
	
	/* This method fills in the known information about the workflow */
	fillWorkflowList: function (listDOM,/*optional*/callbackFunc) {
		if(listDOM) {
			// First, remove its graphical traces
			var me=this;
			this.clearView(function() {
				me.fillWorkflowListInternal(listDOM);
				if(typeof callbackFunc=='function') {
					callbackFunc();
				}
			});
		}
	},
			
	fillWorkflowListInternal: function (listDOM) {
		// Second, remove its content
		this.wfA={};
		//GeneralView.freeSelect(this.wfselect);
		this.wfselect.clear();

		// Third, populate it!
		/*
		var docFacet = 'documentElement';
		if((docFacet in listDOM) &&
			('tagName' in listDOM[docFacet]) &&
			(listDOM[docFacet]['tagName']=='workflowlist')
		) {
		*/
		if(listDOM &&
			listDOM.tagName &&
			GeneralView.getLocalName(listDOM)=='workflowlist'
		) {
			this.WFBase = listDOM.getAttribute('relURI');
			for(var child=listDOM.firstChild ; child ; child=child.nextSibling) {
				if(child.nodeType==1) {
					 switch(GeneralView.getLocalName(child)) {
						case 'workflow':
							var workflow=new WorkflowDesc(child);
							this.wfA[workflow.uuid]=workflow;

							var wfO = workflow.generateOption(this.genview);

							// Last: save selection!
							this.wfselect.add(wfO);
							break;
						case 'message':
							var mtext=WidgetCommon.getTextContent(child);
							if(!mtext)  mtext='';
							this.messageDiv.innerHTML += '<p><u>Return Value:</u> '+child.getAttribute('retval')+'</p><pre>'+mtext+'</pre>';
							break;
					}
				}
			}
		} else {
			this.WFBase='.';
			this.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to fetch the workflow repository listing!</h1></blink>';
		}
	},
	
	reloadList: function (/* optional */ wfToErase) {
		// In progress request
		if(this.listRequest)  return;

		// First, uncheck the beast!
		this.check.setCheck(false);
		
		var qsParm = {};
		if(wfToErase) {
			qsParm['eraseId']=wfToErase;
		}
		var listQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/workflowmanager");
		var listRequest = this.listRequest = new XMLHttpRequest();
		var manview=this;
		GeneralView.freeContainer(this.messageDiv);
		try {
			listRequest.onreadystatechange = function() {
				if(listRequest.readyState==4) {
					manview.openReloadFrame();
					var doClose=1;
					try {
						if('status' in listRequest) {
							if(listRequest.status==200) {
								// Beware parsing errors in Explorer
								if(listRequest.parseError && listRequest.parseError.errorCode!=0) {
									manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR ('+
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
											manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR B: Please notify it to INB Web Workflow Manager developer</h1></blink>';
										}
									}
									manview.fillWorkflowList(response.documentElement.cloneNode(true),function() {
										manview.closeReloadFrame();
										manview.reloadButton.className='button';
										manview.updateTextSpan.innerHTML='Update';
										manview.listRequest=undefined;
									});
									doClose=undefined;
								}
							} else {
								// Communications error.
								var statusText='';
								if(('statusText' in listRequest) && listRequest['statusText']) {
									statusText=listRequest.statusText;
								}
								manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR while fetching list: '+
									listRequest.status+' '+statusText+'</h1></blink>';
							}
						} else {
							manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR F: Please notify it to INB Web Workflow Manager developer</h1></blink>';
						}
					} catch(e) {
						manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>';
					} finally {
						// Removing 'Loading...' frame
						if(doClose) {
							manview.closeReloadFrame();
							manview.reloadButton.className='button';
							manview.updateTextSpan.innerHTML='Update';
							manview.listRequest=undefined;
						}
						listRequest.onreadystatechange=function() {};
						listRequest=undefined;
					}
				}
			};
			this.reloadButton.className="buttondisabled";
			this.updateTextSpan.innerHTML='Updating <img src="style/ajaxLoader.gif">';
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
	}
};

function NewWorkflowView(genview) {
	this.genview = genview;
	this.uploading = undefined;
	
	this.iframe=genview.getElementById('uploadIFRAME');
	this.newWFForm=genview.getElementById('formNewWF');
	this.newWFContainer=genview.getElementById('newWFContainer');
	this.newWFUploading=genview.getElementById('newWFUploading');
	
	// Either text or file
	var newwfview = this;
	this.newWFStyleText=new GeneralView.Check(genview.getElementById('newWFStyleText'), function() { newwfview.setTextControl(); });
	this.newWFStyleFile=new GeneralView.Check(genview.getElementById('newWFStyleFile'), function() { newwfview.setFileControl(); });
	
	this.newWFControl = undefined;
	//this.iframe = undefined;
	
	// More on subworkflows
	this.newSubWFContainer=genview.getElementById('newSubWFContainer');
	this.embedCheck=undefined;
	
	// Setting up data island request
	if(BrowserDetect.browser=='Konqueror') {
		// This value must be 1 for IE data islands
		var dataIsland = genview.createHiddenInput(GeneralView.dataIslandMarker,"2");
		this.newWFForm.appendChild(dataIsland);
	}
	this.frameNewId=undefined;
}

NewWorkflowView.prototype = {
	openNewWorkflowFrame: function () {
		// These methods only work when they must!
		this.setFileControl();
		this.generateSubworkflowSpan();
		this.newWFUploading.style.visibility='hidden';
		
		this.frameNewId=this.genview.openFrame('newWorkflow');
	},
	
	clearView: function () {
		this.newWFControl = undefined;
		// Removing all the content from the container
		GeneralView.freeContainer(this.newWFContainer);
	},
	
	setTextControl: function() {
		this.newWFStyleText.doCheck();
		this.newWFStyleFile.doUncheck();
		this.clearView();
		var textbox = this.genview.createElement('textarea');
		this.newWFControl = textbox;
		textbox.name="workflow";
		textbox.cols=80;
		textbox.rows=15;

		this.newWFContainer.appendChild(textbox);
	},
	
	setFileControl: function() {
		this.newWFStyleFile.doCheck();
		this.newWFStyleText.doUncheck();
		this.clearView();
		var filecontrol = this.genview.createCustomizedFileControl("workflow");
		this.newWFControl = filecontrol;

		// We are appending the fake control!
		//this.newWFContainer.appendChild(filecontrol.parentNode);
		this.newWFContainer.appendChild(filecontrol);
	},
	
	/* Generates a new graphical input */
	generateSubworkflowSpan: function () {
		var check=this.genview.generateCheckControl('Embed',undefined,undefined,1);
		var checkSpan = this.genview.createElement('span');
		checkSpan.className='borderedOption';
		checkSpan.appendChild(check.control);
		var fileSpan= this.genview.generateFileSpan('Add local subworkflow&nbsp;','workflowDep',undefined,checkSpan);
		
		this.embedCheck=check;
		this.newSubWFContainer.appendChild(fileSpan);
	},
	
	closeNewWorkflowFrame: function() {
		if(!this.uploading) {
			this.embedCheck=undefined;
			this.genview.closeFrame(this.frameNewId);
			this.clearView();
			GeneralView.freeContainer(this.newSubWFContainer);
		}
	},
	
	upload: function () {
		if(!this.uploading) {
			if(this.newWFControl && this.newWFControl.value && this.newWFControl.value.length > 0) {
				if(this.embedCheck.checked) {
					var freeze = this.genview.createHiddenInput('freezeWorkflowDeps','1');
					this.newSubWFContainer.appendChild(freeze);
				}
				
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
					
					newwfview.genview.manview.fillWorkflowList(xdoc.documentElement,function() {
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
					});
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
	
	var newenactview = this;
	
	WidgetCommon.addEventListener(this.manview.launchButton,'click',function() {
		newenactview.openNewEnactionFrame();
	},false);

	
	this.enactSVG = new TavernaSVG();
	this.inputs=new Array();
	
	this.workflow=undefined;
	this.WFBase=undefined;
	
	this.frameEnactId=undefined;
	
	// Setting up data island request
	if(BrowserDetect.browser=='Konqueror') {
		// This value must be 1 for IE data islands
		var dataIsland = genview.createHiddenInput(GeneralView.dataIslandMarker,"2");
		this.newEnactForm.appendChild(dataIsland);
	}
	
	this.noneExampleSpan=new GeneralView.Check(genview.getElementById('noneExampleSpan'));
	
	this.saveAsExample=new GeneralView.Check(genview.getElementById('saveAsExampleSpan'));
	
	this.useExampleSpan=new GeneralView.Check(genview.getElementById('useExampleSpan'));
	
	this.inputstatecontrol=undefined;
	
	this.saveExampleDiv=genview.getElementById('saveExampleDiv');
	
	this.inputmode=undefined;

	this.setupInputType();
}

NewEnactionView.prototype = {
	setInputMode: function(control) {
		if(!this.inputstatecontrol || this.inputstatecontrol.control!=control) {
			if(control==this.useExampleSpan.control && this.workflow && !this.workflow.hasExamples) {
				alert('Sorry, there is no registered input example for this workflow');
				return;
			}
			// Graphical handling
			if(this.inputstatecontrol) {
				this.inputstatecontrol.doUncheck();
			}
			
			var radiocontrol=undefined;
			if(control) {
				if(control==this.useExampleSpan.control) {
					radiocontrol=this.useExampleSpan;
				} else {
					radiocontrol=this.noneExampleSpan;
				}
			}
			this.inputstatecontrol=radiocontrol;
			
			this.disposeContainers();
			
			if(radiocontrol) {
				radiocontrol.doCheck();
				if(radiocontrol==this.noneExampleSpan) {
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
		var oninputClickHandler = function(event) {
			if(!event)  event=window.event;
			var target=(event.currentTarget)?event.currentTarget:event.srcElement;
			newenact.setInputMode(target);
		};
		
		this.noneExampleSpan.addEventListener('click', oninputClickHandler, false);
		this.useExampleSpan.addEventListener('click', oninputClickHandler, false);
		
		var saveExampleClickHandler = function() {
			newenact.switchSaveExampleMode();
		};
		
		this.saveAsExample.addEventListener('click', saveExampleClickHandler, false);
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
			this.setInputMode(this.noneExampleSpan.control);
			this.setSaveExampleMode(false);
			
			// And at last, open frame
			this.frameEnactId=this.genview.openFrame('newEnaction');
		/*
		} else {
			alert('Please, first select a workflow before trying to enact one');
		*/
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
		this.inputsContainer.align='center';
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
				output += '<p><i><a href="'+WFBase+'/'+example.path+'">Download example in Baclava format</a></i></p>';
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
		theinput.className = 'add';
		theinput.innerHTML='Input <span style="color:red;">'+input.name+'</span> ';
		
		var thechoicetext=this.genview.createElement('span');
		thechoicetext.className='radio left';
		thechoicetext.innerHTML='as text';
		var radiothechoicetext=new GeneralView.Check(thechoicetext);
		radiothechoicetext.doCheck();
		
		var thechoicefile=this.genview.createElement('span');
		thechoicefile.className='radio left';
		thechoicefile.innerHTML='as file';
		var radiothechoicefile=new GeneralView.Check(thechoicefile);
		
		var radiostatecontrol=radiothechoicetext;
		
		var newenactview=this;
		var onclickHandler=function(event) {
			if(!event)  event=window.event;
			var target=(event.currentTarget)?event.currentTarget:event.srcElement;
			if(!radiostatecontrol || radiostatecontrol.control!=target) {
				if(radiostatecontrol) {
					radiostatecontrol.doUncheck();
				}
				radiostatecontrol=(target==radiothechoicefile.control)?radiothechoicefile:radiothechoicetext;
				radiostatecontrol.doCheck();
				
				// Keeping an accurate number of inputs
				newenactview.inputCounter -= GeneralView.freeContainer(containerDiv);
			}
		};
		
		radiothechoicetext.addEventListener('click', onclickHandler, false);
		radiothechoicefile.addEventListener('click', onclickHandler, false);
		
		var addlistener = function() {
			var newinput;
			var glass;
			var controlname='PARAM_'+input.name
			if(radiostatecontrol == radiothechoicefile) {
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

			var adder = newenactview.genview.createElement('span');
			// The addition button
			adder.className = 'add';
			adder.innerHTML='&nbsp;';
			WidgetCommon.addEventListener(adder, 'click', addlistener, false);
			
			var remover=newenactview.genview.createElement('span');
			remover.className='remove';
			remover.innerHTML='&nbsp;';

			var mydiv=newenactview.genview.createElement('div');
			WidgetCommon.addEventListener(remover,'click',function() {
				containerDiv.removeChild(mydiv);
			},false);

			mydiv.appendChild(adder);
			mydiv.appendChild(remover);
			if(glass)  mydiv.appendChild(glass);
			mydiv.appendChild(newinput);

			// Adding it to the container
			containerDiv.appendChild(mydiv);
			// Keeping an accurate input counter
			newenactview.inputCounter++;
		};
		WidgetCommon.addEventListener(theinput, 'click', addlistener, false);

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
		this.inputsContainer.align='left';
	},
	
	clearView: function() {
		// Removing all the content from the containers
		var me=this;
		this.enactSVG.removeSVG(function() {
			me.disposeContainers();
			me.setInputMode(undefined);
		});
	},
	
	closeNewEnactionFrame: function() {
		this.genview.closeFrame(this.frameEnactId);
		
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
