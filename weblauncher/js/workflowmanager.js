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

/*
	These classes model the retrieved information about available workflows.
*/
function IODesc(ioD) {
	this.name=ioD.getAttribute('name');
	this.mime=new Array();
	for(var child=ioD.firstChild; child ; child=child.nextSibling) {
		if(child.nodeType==1) {
			switch(child.tagName) {
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

IODesc.prototype = {
};

function WorkflowDesc(wfD) {
	this.uuid = wfD.getAttribute('uuid');
	this.path = wfD.getAttribute('path');
	this.svgpath = wfD.getAttribute('svg');
	this.title = wfD.getAttribute('title');
	this.lsid = wfD.getAttribute('lsid');
	this.author = wfD.getAttribute('author');
	var inputs=new Array();
	var outputs=new Array();
	this.inputs=inputs;
	this.outputs=outputs;
	this.description=undefined;
	
	for(var child=wfD.firstChild;child;child=child.nextSibling) {
		// Only element children, please!
		if(child.nodeType == 1) {
			switch(child.tagName) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					this.description = WidgetCommon.getTextContent(child);
					break;
				case 'input':
					var newInput = new IODesc(child);
					inputs[newInput.name]=newInput;
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
	this.check=genview.thedoc.getElementById('confirm');
	this.wfselect=genview.thedoc.getElementById('workflow');
	this.svgdiv=genview.thedoc.getElementById('svgdiv');
	this.messageDiv=genview.thedoc.getElementById('messageDiv');
	
	this.titleContainer=genview.thedoc.getElementById('title');
	this.lsidContainer=genview.thedoc.getElementById('lsid');
	this.authorContainer=genview.thedoc.getElementById('author');
	this.descContainer=genview.thedoc.getElementById('description');
	this.inContainer=genview.thedoc.getElementById('inputs');
	this.outContainer=genview.thedoc.getElementById('outputs');

	this.svg=new TavernaSVG(this.svgdiv.id,'style/unknown.svg','75mm','90mm');
	
	this.wfA=new Array();
	this.listRequest=undefined;
	this.WFBase=undefined;
	
	// To update on automatic changes of the selection box
	var manview = this;
	this.wfselect.onchange=function () { manview.updateView(); };
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
			this.svg.loadSVG(this.svgdiv.id,this.WFBase+'/'+workflow.svgpath,'100mm','120mm');
			
			// Clearing input & output info
			GeneralView.freeContainer(this.inContainer);
			GeneralView.freeContainer(this.outContainer);
			
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
			var thep = this.genview.thedoc.createElement('p');
			alink = this.genview.thedoc.createElement('a');
			alink.href = this.WFBase+'/'+workflow.path;
			alink.target = '_blank';
			alink.innerHTML = '<i>Download Workflow</i>';
			thep.appendChild(alink);
			this.descContainer.appendChild(thep);
			
			thep = this.genview.thedoc.createElement('p');
			alink = this.genview.thedoc.createElement('a');
			alink.href = this.WFBase+'/'+workflow.svgpath;
			alink.target = '_blank';
			alink.innerHTML = '<i>Download Workflow Graph (SVG)</i>';
			thep.appendChild(alink);
			this.descContainer.appendChild(thep);
			
			// And now, inputs and outputs
			var ul;
			for(var iofacet in workflow.inputs) {
				var io=workflow.inputs[iofacet];
				if(!ul)  ul=this.genview.thedoc.createElement('ul');
				var li=this.genview.thedoc.createElement('li');
				var line='<i>'+io.name+' ('+io.mime.join(', ')+')</i>';
				if('description' in io) {
					line += '<br>'+GeneralView.preProcess(io.description);
				}
				li.innerHTML=line;
				ul.appendChild(li);
			}
			if(ul) {
				this.inContainer.appendChild(ul);
			} else {
				this.inContainer.innerHTML='<i>(None)</i>';
			}
			
			ul=undefined;
			for(var iofacet in workflow.outputs) {
				var io=workflow.outputs[iofacet];
				if(!ul)  ul=this.genview.thedoc.createElement('ul');
				var li=this.genview.thedoc.createElement('li');
				var line='<i>'+io.name+' ('+io.mime.join(', ')+')</i>';
				if('description' in io) {
					line += '<br>'+GeneralView.preProcess(io.description);
				}
				li.innerHTML=line;
				ul.appendChild(li);
			}
			if(ul) {
				this.outContainer.appendChild(ul);
			} else {
				this.outContainer.innerHTML='<i>(None)</i>';
			}
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
			for(var ri=this.wfselect.length-1;ri>=0;ri--) {
				this.wfselect.remove(ri);
			}

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
				listDOM.documentElement.tagName=='workflowlist'
			) {
				var wfL = listDOM.getElementsByTagName('workflow');
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
				var message = listDOM.getElementsByTagName('message');
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
											// TODO
											// Backend error.
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
			this.check.checked=false;
			if(sureErase) {
				this.reloadList(this.wfselect.options[this.wfselect.selectedIndex].value);
			}
		}
	}
};

function NewWorkflowView(genview) {
	this.genview = genview;
	this.uploading = undefined;
	
	this.iframe=genview.thedoc.getElementById('uploadIFRAME');
	this.newWFForm=genview.thedoc.getElementById('formNewWF');
	this.newWFContainer=genview.thedoc.getElementById('newWFContainer');
	this.newWFUploading=genview.thedoc.getElementById('newWFUploading');
	
	this.newWFStyleText=genview.thedoc.getElementById('newWFStyleText');
	this.newWFStyleFile=genview.thedoc.getElementById('newWFStyleFile');
	
	var newwfview = this;
	this.newWFStyleText.onchange = function() { newwfview.setTextControl(); };
	this.newWFStyleFile.onchange = function() { newwfview.setFileControl(); };
	
	this.newWFControl = undefined;
	//this.iframe = undefined;
}

NewWorkflowView.prototype = {
	openNewWorkflowFrame: function () {
		// These methods only work when they must!
		this.setTextControl();
		this.setFileControl();
		this.newWFUploading.style.visibility='hidden';
		
		this.genview.openFrame('newWorkflow');
	},
	
	clearView: function () {
		this.newWFControl = undefined;
		// Removing all the content from the container
		GeneralView.freeContainer(this.newWFContainer);
	},
	
	setTextControl: function() {
		if(this.newWFStyleText.checked) {
			this.clearView();
			var textbox = this.genview.thedoc.createElement('textarea');
			this.newWFControl = textbox;
			textbox.name="workflow";
			textbox.cols=80;
			textbox.rows=25;
			
			this.newWFContainer.appendChild(textbox);
		}
	},
	
	setFileControl: function() {
		if(this.newWFStyleFile.checked) {
			this.clearView();
			var filecontrol = this.genview.createCustomizedFileControl("workflow");
			this.newWFControl = filecontrol;
			
			// We are appending the fake control!
			//this.newWFContainer.appendChild(filecontrol.parentNode);
			this.newWFContainer.appendChild(filecontrol);
		}
	},
	
	closeNewWorkflowFrame: function() {
		if(!this.uploading) {
			this.genview.closeFrame();
			this.clearView();
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
				var iframe = this.genview.thedoc.createElement('iframe');
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
					var xdoc;
					if('contentDocument' in iframe) {
						xdoc=iframe.contentDocument;
					} else {
						xdoc=iframe.document;
					}
					GeneralView.freeContainer(newwfview.genview.manview.messageDiv);
					newwfview.genview.manview.fillWorkflowList(xdoc);

					// Now, cleaning up iframe traces!
					newwfview.uploading=false;
					newwfview.closeNewWorkflowFrame();
					/*
						Dynamic IFRAME handling
						which not works in IE :-(
					
					newwfview.newWFUploading.removeChild(iframe);
					*/
					delete iframe['onload'];
					iframe = undefined;
					newwfview.newWFForm.target = undefined;
				};
				
				iframe.onload = onUpload;
				
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
	
	this.iframe=genview.thedoc.getElementById('enactIFRAME');
	this.newEnactForm=genview.thedoc.getElementById('formEnactor');
	this.inputsContainer=genview.thedoc.getElementById('newInputs');
	this.baclavaContainer=genview.thedoc.getElementById('newBaclava');
	this.enactSVGContainer = genview.thedoc.getElementById('enactsvg');
	this.newEnactUploading = genview.thedoc.getElementById('newEnactUploading');
	this.submittedList = genview.thedoc.getElementById('submittedList');
	
	this.enactSVG = new TavernaSVG();
	this.inputs=new Array();
	this.baclava=new Array();
	
	this.workflow=undefined;
	
	// baclava onclick
	this.newBaclavaSpan=genview.thedoc.getElementById('newBaclavaSpan');
	var newenactview=this;
	var containerDiv=this.baclavaContainer;
	this.newBaclavaSpan.onclick=function() {
		var controlname='BACLAVA_FILE';
		var newinput=newenactview.genview.createCustomizedFileControl(controlname);

		// As we are interested in the container (the parent)
		// let's get it...
		//newinput=newinput.parentNode;
		
		var remover=newenactview.genview.thedoc.createElement('span');
		remover.className='remove';
		remover.innerHTML='&nbsp;';

		var mydiv=newenactview.genview.thedoc.createElement('div');
		remover.onclick=function() {
			containerDiv.removeChild(mydiv);
		};
		
		mydiv.appendChild(remover);
		mydiv.appendChild(newinput);
		
		// Adding it to the container
		containerDiv.appendChild(mydiv);
	};
}

NewEnactionView.prototype = {
	openNewEnactionFrame: function () {
		var workflow = this.manview.getCurrentWorkflow();
		if(workflow) {
			// First, do the needed preparations!
			var WFBase = this.manview.WFBase;
			
			// SVG graph
			this.workflow = workflow;
			this.enactSVG.loadSVG(this.enactSVGContainer.id,WFBase+'/'+workflow.svgpath,'100mm','120mm');
			
			// Inputs
			for(var inputfacet in workflow.inputs) {
				var input=workflow.inputs[inputfacet];
				var thediv = this.generateGraphicalInput(input);
				
				// And the container for the input!
				this.inputsContainer.appendChild(thediv);
			}
			
			// And at last, open frame
			this.genview.openFrame('workflowInputs');
		}
	},
	
	/* Generates a new graphical input */
	generateGraphicalInput: function (input) {
		var randominputid=WidgetCommon.getRandomUUID();

		// The container of all these 'static' elements
		var thediv = this.genview.thedoc.createElement('div');
		thediv.className='borderedInput';

		// Dynamic input container
		var containerDiv=this.genview.thedoc.createElement('div');
		containerDiv.id=randominputid;

		// 'Static' elements
		var theinput = this.genview.thedoc.createElement('span');
		// The addition button
		theinput.className = 'add';
		theinput.innerHTML='Input <span style="color:red;">'+input.name+'</span> ';
		
		
		var theinputtext=this.genview.thedoc.createElement('input');
		theinputtext.type='radio';
		theinputtext.name=randominputid;
		theinputtext.checked=true;
		theinputtext.onchange=function() { GeneralView.freeContainer(containerDiv); };

		var thechoicetext=this.genview.thedoc.createElement('label');
		thechoicetext.innerHTML='as text';
		thechoicetext.appendChild(theinputtext);

		var theinputfile=this.genview.thedoc.createElement('input');
		theinputfile.type='radio';
		theinputfile.name=randominputid;
		theinputfile.onchange=function() { GeneralView.freeContainer(containerDiv); };

		var thechoicefile=this.genview.thedoc.createElement('label');
		thechoicefile.innerHTML='as file';
		thechoicefile.appendChild(theinputfile);
		
		var newenactview=this;
		theinput.onclick=function() {
			if(theinputfile.checked  || theinputtext.checked) {
				var newinput;
				var glass;
				var controlname='PARAM_'+input.name
				if(theinputfile.checked) {
					newinput=newenactview.genview.createCustomizedFileControl(controlname);
					
					// As we are interested in the container (the parent)
					// let's get it...
					//newinput=newinput.parentNode;
				} else {
					newinput=newenactview.genview.thedoc.createElement('input');
					newinput.type='text';
					newinput.name=controlname;
					
					glass=newenactview.genview.thedoc.createElement('span');
					glass.className='magglass';
					glass.innerHTML='&nbsp;';
					glass.onclick=function() {
						var renewinput;
						if(newinput.type=='text') {
							renewinput=newenactview.genview.thedoc.createElement('textarea');
							renewinput.cols=60;
							renewinput.rows=10;
						} else {
							renewinput=newenactview.genview.thedoc.createElement('input');
							renewinput.type='text';
						}
						// Replacing old text are with new one!
						renewinput.name=controlname;
						renewinput.value=newinput.value;
						mydiv.replaceChild(renewinput,newinput);
						newinput=renewinput;
					};

				}
				
				var remover=newenactview.genview.thedoc.createElement('span');
				remover.className='remove';
				remover.innerHTML='&nbsp;';
				
				var mydiv=newenactview.genview.thedoc.createElement('div');
				remover.onclick=function() {
					containerDiv.removeChild(mydiv);
				};
				
				mydiv.appendChild(remover);
				if(glass)  mydiv.appendChild(glass);
				mydiv.appendChild(newinput);
				
				// Adding it to the container
				containerDiv.appendChild(mydiv);
			}
		};

		// Now, it is time to create the selection
		var thechoice = this.genview.thedoc.createElement('span');
		thechoice.className='borderedOption';
		thechoice.appendChild(thechoicetext);
		thechoice.appendChild(thechoicefile);

		// Last children!
		thediv.appendChild(theinput);
		thediv.appendChild(thechoice);

		thediv.appendChild(containerDiv);
		
		
		return thediv;
	},
	
	clearView: function() {
		// Removing all the content from the containers
		this.enactSVG.removeSVG();
		GeneralView.freeContainer(this.baclavaContainer);
		GeneralView.freeContainer(this.inputsContainer);
	},
	
	closeNewEnactionFrame: function() {
		this.genview.closeFrame();
		
		this.clearView();
		this.workflow=undefined;
	},
	
	openSubmitFrame: function() {
		var elem=this.genview.thedoc.getElementById('submitEnaction');
		elem.className='submitEnaction';
	},
	
	closeSubmitFrame: function() {
		var elem=this.genview.thedoc.getElementById('submitEnaction');
		elem.className='hidden';
	},
	
	enact: function () {
		// First, locking the window
		this.openSubmitFrame();
		
		/*
			Dynamic IFRAME handling
			which not works in IE :-(
			
		// The iframe which will contain what we need
		var iframe = this.genview.thedoc.createElement('iframe');
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
		
		// The hooks
		var newenactview = this;
		iframe.onload = function() {
			// First, parsing content
			var xdoc;
			if('contentDocument' in iframe) {
				xdoc=iframe.contentDocument;
			} else {
				xdoc=iframe.document;
			}
			
			// Second, job id and others
			GeneralView.freeContainer(newwfview.genview.manview.messageDiv);
			var launched=newenactview.parseEnactionIdAndLaunch(xdoc);
			
			// Now, cleaning up iframe traces!
			newenactview.closeSubmitFrame();
			if(launched) {
				newenactview.closeNewEnactionFrame();
			}
			
			/*
				Dynamic IFRAME handling
				which not works in IE :-(

			newenactview.newEnactUploading.removeChild(iframe);
			*/
			delete iframe['onload'];
			iframe = undefined;
			newenactview.newEnactForm.target = undefined;
		};
		
		// And results must go there
		this.newEnactForm.target=iframeName;
		// Let's go!
		this.newEnactForm.submit();
	},
	
	parseEnactionIdAndLaunch: function(enactIdDOM) {
		var enactId;
		
		if(enactIdDOM) {
			if(('documentElement' in enactIdDOM) &&
				('tagName' in enactIdDOM['documentElement']) &&
				(enactIdDOM['documentElement']['tagName']=='enactionlaunched')
			) {
				enactId = enactIdDOM.documentElement.getAttribute('jobId');
				if(enactId) {
					var time=enactIdDOM.documentElement.getAttribute('time');
					// Time to open a new window
					var theURL="enactionviewer.html?jobId="+enactId;
					window.open(theURL);

					// And leave a trace!
					var theli=this.genview.thedoc.createElement('li');
					theli.innerHTML=time+': <a href="'+theURL+'">'+enactId+'</a>';
					this.submittedList.appendChild(theli);
				}
			} else {
				this.genview.manview.messageDiv.innerHTML='<blink><h1 style="color:red">FATAL ERROR: Unable to start the enaction process</h1></blink>';
			}
		}
		
		return enactId;
	}
};
