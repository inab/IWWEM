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
	this.check=this.thedoc.getElementById('confirm');
	this.wfselect=this.thedoc.getElementById('workflow');
	this.svgdiv=this.thedoc.getElementById('svgdiv');
	
	this.manview=new ManagerView(this);
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
	
	openReloadFrame: function () {
		this.openFrame('reloadWorkflows');
	},
	
	closeFrame: function () {
		var elem=this.thedoc.getElementById(this.visibleId);
		this.visibleId=undefined;

		this.outer.className='hidden';
		elem.className='hidden';
	},
	
	closeReloadFrame: function() {
		this.closeFrame();
	},
};

/*
	This class manages the available workflows view
*/
function ManagerView(genview) {
	this.genview=genview;
	this.wfselect=genview.wfselect;
	this.check=genview.check;
	this.svgdiv=genview.svgdiv;
	
	this.svg=new TavernaSVG();
	this.wfA=new Array();
	
	this.listRequest=undefined;
	this.wfselect.onchange=function () {this.updateView()};
}

ManagerView.prototype = {
	/* This method updates the information shown about the focused workflow */
	updateView: function () {
		if(this.wfselect.selectedIndex!=-1) {
			this.svg.loadSVG(this.svgdiv.id,this.wfselect.options[this.wfselect.selectedIndex].svg);
		} else {
			this.svg.removeSVG();
		}
	},
	
	/* This method fills in  */
	function fillWorkflowList(listDOM) {
		if(listDOM) {
			// First, remove its graphical traces
			this.svg.removeSVG();

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
	
	function reloadList(/* optional */ wfToErase) {
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
							listRequest.manview.genview.closeReloadFrame();
						} catch(e) {
							alert(WidgetCommon.DebugError(e));
							listRequest.manview.genview.closeReloadFrame();
						}
					} else {
						alert('FATAL ERROR: Please notify it to INB Web Workflow Manager developer');
					}
				}
			};
			this.genview.openReloadFrame();
			listRequest.open('GET',listQuery,true);
			listRequest.send(null);
		} catch(e) {
			alert(WidgetCommon.DebugError(e));
		}
	},
	
	function deleteWorkflow() {
		if(this.check.checked && this.wfselect.selectedIndex!=-1) {
			this.check.checked=false;
			this.reloadList(this.wfselect.options[this.wfselect.selectedIndex].value);
		}
	},
};

var genview;
function InitWorkflowManager(thedoc) {
	genview=new GeneralView(thedoc);
}
