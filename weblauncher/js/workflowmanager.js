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
					try {
						this.description = child.textContent;
					} catch(e) {
						this.description = child.text;
					}
					break;
				case 'mime':
					this.mime.push(child.getAttribute('type'));
					break;
			}
		}
	}
	
}

function WorkflowDesc(wfD) {
	this.path = wfD.getAttribute('path');
	this.svgpath = wfD.getAttribute('svg');
	this.title = wfD.getAttribute('title');
	this.lsid = wfD.getAttribute('lsid');
	this.author = wfD.getAttribute('author');
	this.input=new Array();
	this.output=new Array();
	
	for(var child=wfD.firstChild;child;child=child.nextSibling) {
		// Only element children, please!
		if(child.nodeType == 1) {
			switch(child.tagName) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					try {
						this.description = child.textContent;
					} catch(e) {
						this.description = child.text;
					}
					break;
				case 'input':
					var newInput = new IODesc(child);
					this.input[newInput.name]=newInput;
					break;
				case 'output':
					var newOutput = new IODesc(child);
					this.output[newOutput.name]=newOutput;
					break;
			}
		}
	}
}

WorkflowDesc.WFBase='workflows';

WorkflowDesc.prototype = {
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var wfO = thedoc.createElement('option');
		wfO.value = wfO.id = this.path;
		wfO.text = this.title+' ['+this.lsid+']';
		
		return wfO;
	},
};

/* Window handling code */
function GeneralView(/* optional */thedoc) {
	this.thedoc = (thedoc)?thedoc:document;
	this.outer=this.thedoc.getElementById('outerAbsDiv');
	
	this.manview=new ManagerView(this);
	this.newwfview=new NewWorkflowView(this);
	this.newenactview=new NewEnactionView(this);
	this.visibleId=undefined;
}

GeneralView.prototype = {
	openFrame: function (divId) {
		if(this.visibleId) {
			this.closeFrame();
		}

		this.visibleId=divId;
		this.outer.className='outerAbsDiv';
		var elem=this.thedoc.getElementById(divId);
		elem.className='transAbsDiv';
	},
	
	closeFrame: function () {
		var elem=this.thedoc.getElementById(this.visibleId);
		this.visibleId=undefined;

		this.outer.className='hidden';
		elem.className='hidden';
	},
	
	createCustomizedFileControl: function (thename) {
		var filecontrol = this.newWFControl = this.thedoc.createElement('input');
		filecontrol.type="file";
		filecontrol.name=thename;
		filecontrol.className='file hidden';
		
		var divfilecontrol = this.thedoc.createElement('div');
		divfilecontrol.className = 'fileinputs';
		divfilecontrol.appendChild(filecontrol);
		
		var fakeFileUpload = this.thedoc.createElement('div');
		fakeFileUpload.className = 'fakefile';
		fakeFileUpload.appendChild(this.thedoc.createElement('input'));
		var image = this.thedoc.createElement('img');
		image.src='style/button_select.gif';
		fakeFileUpload.appendChild(image);
		
		divfilecontrol.appendchild(fakeFileUpload);
		
		filecontrol.onchange = filecontrol.onmouseout = function () {
			fakeFileUpload.value = filecontrol.value;
		};
		
		return filecontrol;
	},
};

GeneralView.freeContainer = function (container) {
	// Removing all the content from the container
	var eraseme = container.firstChild;

	while(eraseme) {
		var toerase = eraseme;
		eraseme = eraseme.nextSibling;
		container.removeChild(toerase);
	}
}
	
/*
	This class manages the available workflows view
*/
function ManagerView(genview) {
	this.genview=genview;
	this.check=genview.thedoc.getElementById('confirm');
	this.wfselect=genview.thedoc.getElementById('workflow');
	this.svgdiv=genview.thedoc.getElementById('svgdiv');
	
	this.titleContainer=genview.thedoc.getElementById('title');
	this.lsidContainer=genview.thedoc.getElementById('lsid');
	this.authorContainer=genview.thedoc.getElementById('author');
	this.descContainer=genview.thedoc.getElementById('description');
	this.inContainer=genview.thedoc.getElementById('inputs');
	this.outContainer=genview.thedoc.getElementById('outputs');
	
	this.svg=new TavernaSVG();
	this.wfA=new Array();
	
	this.listRequest=undefined;
	this.wfselect.onchange=function () { this.updateView(); };
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
			this.svg.loadSVG(this.svgdiv.id,WorkflowDesc.WFBase+'/'+workflow.svgpath);
			
			// Basic information
			this.titleContainer.innerHTML = workflow.title;
			this.lsidContainer.innerHTML = workflow.lsid;
			this.authorContainer.innerHTML = workflow.author;
			
			// Naive detection of rich description
			if(workflow.description && workflow.description.indexOf('<')!=-1) {
				this.descContainer.innerHTML = workflow.description;
			} else {
				this.descContainer.innerHTML = '<pre>'+workflow.description+'</pre>'
			}
			
			var br;
			var alink;
			
			// This is needed to append links to the description itself
			br = this.genview.thedoc.createElement('br');
			alink = this.genview.thedoc.createElement('a');
			alink.href = WorkflowDesc.WFBase+'/'+workflow.path;
			alink.target = '_blank';
			alink.innerHTML = '<b>Download Workflow</b>';
			br.appendChild(alink);
			this.descContainer.appendChild(br);
			
			br = this.genview.thedoc.createElement('br');
			alink = this.genview.thedoc.createElement('a');
			alink.href = WorkflowDesc.WFBase+'/'+workflow.svgpath;
			alink.target = '_blank';
			alink.innerHTML = '<b>Download Workflow Graph (SVG)</b>';
			br.appendChild(alink);
			this.descContainer.appendChild(br);
			
			// And now, inputs and outputs
			if(workflow.input.length > 0 ) {
				var ul=this.genview.thedoc.createElement('ul');
				for(var io in workflow.input) {
					var li=this.genview.thedoc.createElement('li');
					li.innerHTML=io.name+' ('+io.mime.join(', ')+')';
					ul.appendChild(li);
				}
				this.inContainer.appendChild(ul);
			} else {
				this.inContainer.innerHTML='<i>(None)</i>';
			}
			if(workflow.output.length > 0 ) {
				var ul=this.genview.thedoc.createElement('ul');
				for(var io in workflow.output) {
					var li=this.genview.thedoc.createElement('li');
					li.innerHTML=io.name+' ('+io.mime.join(', ')+')';
					ul.appendChild(li);
				}
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
			var wfL = listDOM.getElementsByTagName('workflow');
			for(var i=0;i<wfL.length;i++) {
				var workflow=new WorkflowDesc(wfL.item(i));
				this.wfA[workflow.path]=workflow;

				var wfO = workflow.generateOption(this.genview.thedoc);

				// Last: save selection!
				try {
					this.wfselect.add(wfO,null);
				} catch(e) {
					this.wfselect.add(wfO);
				}
			}
		}
	},
	
	reloadList: function (/* optional */ wfToErase) {
		var qsParm = new Array();
		if(wfToErase) {
			qsParm['eraseWFId']=wfToErase;
		}
		var listQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/workflowmanager");
		this.listRequest = new XMLHttpRequest();
		var listRequest=this.listRequest;
		listRequest.manview=this;
		try {
			listRequest.onreadystatechange = function() {
				if(listRequest.readyState==4) {
					if('status' in listRequest) {
						try {
							if(listRequest.status==200) {
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
							} else {
								// TODO
								// Communications error.
							}
							// Removing 'Loading...' frame
							listRequest.manview.closeReloadFrame();
						} catch(e) {
							alert(WidgetCommon.DebugError(e));
							listRequest.manview.closeReloadFrame();
						}
					} else {
						alert('FATAL ERROR: Please notify it to INB Web Workflow Manager developer');
					}
				}
			};
			this.openReloadFrame();
			listRequest.open('GET',listQuery,true);
			listRequest.send(null);
		} catch(e) {
			alert(WidgetCommon.DebugError(e));
		}
	},
	
	deleteWorkflow: function () {
		if(this.check.checked && this.wfselect.selectedIndex!=-1) {
			this.check.checked=false;
			this.reloadList(this.wfselect.options[this.wfselect.selectedIndex].value);
		}
	},
};

function NewWorkflowView(genview) {
	this.genview = genview;
	
	this.newWFForm=genview.thedoc.getElementById('formManager');
	this.newWFContainer=genview.thedoc.getElementById('newWFContainer');
	this.newWFUploading=genview.thedoc.getElementById('newWFUploading');
	
	this.newWFStyleText=genview.thedoc.getElementById('newWFStyleText');
	this.newWFStyleFile=genview.thedoc.getElementById('newWFStyleFile');
	
	this.newWFStyleText.onchange = function() { this.setTextControl(); };
	this.newWFStyleFile.onchange = function() { this.setFileControl(); };
	
	this.newWFControl = undefined;
	//this.iframe = undefined;
}

NewWorkflowView.prototype = {
	openNewWorkflowFrame: function () {
		// These methods only work when they must!
		this.setTextControl();
		this.setFileControl();
		this.newWFUploading.style.display='none';
		
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
			var textbox = this.newWFControl = this.genview.thedoc.createElement('textarea');
			textbox.name="workflow";
			textbox.rows=80;
			textbox.columns=25;
			
			this.newWFContainer.appendChild(textbox);
		}
	},
	
	setFileControl: function() {
		if(this.newWFStyleFile.checked) {
			this.clearView();
			var filecontrol = this.genview.generateCustomizedFileControl("workflow");
			
			// We are appending the fake control!
			this.newWFContainer.appendChild(filecontrol.parentNode);
		}
	},
	
	closeNewWorkflowFrame: function() {
		this.genview.closeFrame();
		this.clearView();
	},
	
	upload: function () {
		if(this.newWFControl && this.newWFControl.value && this.newWFControl.value.length > 0) {
			this.newWFUploading.style.display='block';
			
			// The iframe which will contain what we need
			var iframe = this.genview.thedoc.createElement('iframe');
			var iframeName = iframe.name = WidgetCommon.getRandomUUID();
			iframe.frameBorder = '0';
			iframe.style.display = 'none';
			
			// Setting up hooks to be fired!
			iframe.onload = function() {
				// First, parsing content
				var xdoc;
				if('contentDocument' in iframe) {
					xdoc=iframe.contentDocument;
				} else {
					xdoc=iframe.document;
				}
				this.genview.manview.fillWorkflowList(xdoc);
				
				// Now, cleaning up iframe traces!
				this.closeNewWorkflowFrame();
				this.newWFUploading.removeChild(iframe);
				delete iframe['onload'];
				iframe = undefined;
				this.newWFForm.target = undefined;
			};
			
			// Iframe must live somewhere
			this.newWFUploading.appendChild(iframe);
			// And results must go there
			this.newWFForm.target=iframeName;
			// Let's go!
			this.newWFForm.submit();
			
		} else {
			alert('Please introduce the new workflow before submitting it!');
		}
	},
};

function NewEnactionView(genview) {
	this.genview = genview;
	this.manview=genview.manview;
	
	this.newEnactForm=genview.thedoc.getElementById('formEnactor');
	this.inputsContainer=genview.thedoc.getElementById('newInputs');
	this.baclavaContainer=genview.thedoc.getElementById('newBaclava');
	this.enactSVGContainer = genview.thedoc.getElementById('enactsvg');
	
	this.enactSVG = new TavernaSVG();
	this.inputs=new Array();
	this.baclava=new Array();
	
	this.workflow=undefined;
}

NewEnactionView.prototype = {
	openNewEnactionFrame: function () {
		var workflow = this.manview.getCurrentWorkflow();
		if(workflow) {
			// First, do the needed preparations!
			
			// SVG graph
			this.workflow = workflow;
			this.enactSVG.loadSVG(this.enactSVGContainer.id,WorkflowDesc.WFBase+'/'+workflow.svgpath);
			
			// Inputs
			for(var input in workflow.input) {
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
		thespan.innerHTML='Input '+input.name;
		
		
		var theinputtext=this.genview.thedoc.createElement('input');
		theinputtext.type='radio';
		theinputtext.name=randominputid;
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
		
		// The addition button
		var theadd = this.genview.thedoc.createElement('span');
		theadd.className='add';
		theadd.onclick=function() {
			if(theinputfile.checked  || theinputtext.checked) {
				var newinput;
				var glass;
				var controlname='PARAM_'+input.name
				if(theinputfile.checked) {
					newinput=this.genview.generateCustomizedFileControl(controlname);
					
					// As we are interested in the container (the parent)
					// let's get it...
					newinput=newinput.parentNode;
				} else {
					newinput=this.genview.thedoc.createElement('input');
					newinput.type='text';
					newinput.name=controlname;
					
					glass=this.genview.thedoc.createElement('span');
					glass.className='magglass';
					glass.onclick=function() {
						var renewinput;
						if(newinput.type=='text') {
							renewinput=this.genview.thedoc.createElement('textarea');
							renewinput.rows=40;
							renewinput.columns=10;
						} else {
							renewinput=this.genview.thedoc.createElement('input');
							renewinput.type='text';
						}
						// Replacing old text are with new one!
						renewinput.name=controlname;
						renewinput.value=newinput.value;
						mydiv.replaceChild(renewinput,newinput);
						newinput=renewinput;
					};

				}
				
				var remover=this.genview.thedoc.createElement('span');
				remover.className='remove';
				remover.onclick=function() {
					containerChild.removeChild(myDiv);
				};
				
				var mydiv=this.genview.thedoc.createElement('div');
				mydiv.appendChild(remover);
				if(glass)  mydiv.appendChild(glass);
				mydiv.appendChild(newinput);
				
				// Adding it to the container
				containerChild.appendChild(myDiv);
			}
		};

		// Now, it is time to create the selection
		var thechoice = this.genview.thedoc.createElement('span');
		thechoice.className='borderedOption';
		thechoice.appendChild(thechoicetext);
		thechoice.appendChild(thechoicefile);

		// Last children!
		thediv.appendChild(theadd);
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
	
	enact: function () {
		this.newEnactForm.submit();
		this.closeNewEnactionFrame();
	},
};

var genview;
function InitWorkflowManager(thedoc) {
	genview=new GeneralView(thedoc);
}
