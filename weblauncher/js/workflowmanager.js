/*
	$Id$
	workflowmanager.js
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

var WFDEPS=new Array(
	"js/licensemanager.js",
	"js/workflowdesc.js",
	"js/workflowreport.js"
);

var WFLOADINGFRAMES={
	reloadWorkflows:	{
		src:	"style/big-ajax-loader.gif",
		alt:	"Reloading workflows"
	},
	submitEnaction:	{
		src:	"style/big-ajax-submit.gif",
		alt:	"Submitting job"
	},
	extractData:	{
		src:	"style/big-ajax-extract.gif",
		alt:	"Extracting data from input"
	}
};

function WorkflowManagerCustomInit() {
	var genview=this;
	this.addLoadingFrames(WFLOADINGFRAMES);
	var manview = this.manview=new ManagerView(genview);
	this.newwfview=new NewWorkflowView(genview,this.manview.restrictId);
	this.newenactview=new NewEnactionView(manview);
	
	manview.svg.initSVG(function() {
		LicenseManager.init(genview,'licenses/licenses.xml',function(licManager) {
			genview.licenseManager=licManager;
			manview.reloadList();
		});
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
	
	this.reloadButton=genview.getElementById('reloadButton');
	this.updateTextSpan=genview.getElementById('updateTextSpan');
	
	this.nWfSpan=genview.getElementById('nWfSpan');
	this.searchWFInput=genview.getElementById('searchWFInput');
	this.doSearchWFInput=genview.getElementById('doSearchWFInput');

	this.openEnactionButton=genview.getElementById('openEnactionButton');
	this.launchButton=genview.getElementById('launchButton');
	this.relaunchButton=genview.getElementById('relaunchButton');
	this.deleteButton=genview.getElementById('deleteButton');
	
	this.openEnactionButton.className='buttondisabled';
	this.launchButton.className='buttondisabled';
	this.relaunchButton.className='buttondisabled';
	this.deleteButton.className='buttondisabled';
	
	var manview = this;
	// this.svg=new DynamicSVG(this.svgdiv.id,'style/unknown.svg','75mm','90mm');
	this.svgdivid='wfsvgdiv';
	var parentno=this.genview.getElementById(this.svgdivid).parentNode;
	/*

	var maxwidth=(parentno.offsetWidth-32)+'px';
	var maxheight=(parentno.offsetHeight-32)+'px';
	
	this.svg=new DynamicSVG(this.svgdivid,IWWEM.Logo,IWWEM.Unknown,maxwidth,maxheight,function() {
		manview.updateSVGSize();
	});
	*/
	
	this.svg=new DynamicSVG(this.svgdivid,undefined,IWWEM.Unknown,undefined,undefined,function() {
		manview.updateSVGSize();
	});
	
	this.wfA={};
	this.listRequest=undefined;
	this.WFBase=[];
	
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
		genview.busy(true);
		manview.updateView(function() {
			if(manview.wfselect.selectedIndex==-1) {
				manview.openEnactionButton.className='buttondisabled';
				manview.launchButton.className='buttondisabled';
				manview.relaunchButton.className='buttondisabled';
				manview.deleteButton.className='buttondisabled';
				if(manview.check.checked) {
					manview.check.setCheck(false);
				}
			} else {
				manview.openEnactionButton.className='button';
				manview.launchButton.className='button';
				manview.relaunchButton.className='button';
				manview.deleteButton.className='button';
			}
			genview.busy(false);
		});
	},false);
	
	// Weird. This one does not work when assigned using
	// addEventListener
	this.searchWFInput.onkeypress=function(e) {
		var characterCode;
		if(!e)
			e=window.event;

		if(e.keyCode){
			characterCode = e.keyCode	// modern browsers and IE
		} else{
			characterCode = e.which		// old NN4
		}
		
		if(characterCode == 13) { //if generated character code is equal to ascii 13 (if enter key)
			manview.searchWorkflows();
			//e.cancelBubble=true;
			//if(e.stopPropagation)  e.stopPropagation();
			return false;
		} else{
			return true;
		}
	};
	WidgetCommon.addEventListener(this.doSearchWFInput,'click',function() {
		manview.searchWorkflows();
	},false);
	
	WidgetCommon.addEventListener(this.deleteButton,'click',function() {
		manview.deleteWorkflow();
	},false);
	
	WidgetCommon.addEventListener(this.reloadButton,'click',function() {
		manview.reloadList();
	},false);
	
	// SVG resize
	this.tableContainer=this.genview.getElementById("tableContainer");
	this.formManager=this.genview.getElementById("formManager");
	
	// Supress submissions
	// WidgetCommon.addEventListener(this.formManager,'submit',function() {
	//	return false;
	// },false);
	
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
	
	this.restrictId=undefined;
	
	this.classTitle=this.genview.getElementById('classB');
	// Parsing id param
	var pageTitle=this.genview.getElementById('titleB');
	var qsParm={};
	WidgetCommon.parseQS(qsParm);
	var newTitle=undefined;
	this.handlingEnactions=undefined;
	if(('id' in qsParm) && qsParm['id']!=undefined && qsParm['id'].length>0 && qsParm['id'][0].length > 0) {
		this.restrictId=qsParm['id'][0];
		
		if(this.restrictId.indexOf('enaction:')==0 || this.restrictId.indexOf('snapshot:')==0) {
			WidgetCommon.addEventListener(this.openEnactionButton,'click',function() {
				manview.doOpenEnaction();
			},false);

			// Setting up the title
			newTitle='Interactive Enaction Inspector v'+IWWEM.Version;
			// Deactivating buttons!!!
			var useDiv=this.genview.getElementById('useDiv');
			useDiv.style.display='none';
			this.handlingEnactions=true;
		}
	}
	
	this.wfreport=new WorkflowReport(genview,'wfReportDiv',this.handlingEnactions);
	
	if(newTitle==undefined) {
		// Deactivating buttons!!!
		this.openEnactionButton.style.display='none';
		this.relaunchButton.style.display='none';
		// Setting up the title
		newTitle='Interactive Web Workflow Enactor & Manager v'+IWWEM.Version;
	}
	this.genview.thedoc.title=newTitle;
	GeneralView.freeContainer(pageTitle);
	pageTitle.appendChild(this.genview.thedoc.createTextNode(newTitle));
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
	
	/* */
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
			if(workflow.isReference) {
				this.reloadList(workflow.uuid,undefined,callbackFunc);
			} else {
				// SVG graph
				//this.svg.loadSVG(this.svgdivid,this.WFBase+'/'+workflow.svgpath,'100mm','120mm');
				var wfreport=this.wfreport;
				var parentno=this.genview.getElementById(this.svgdivid).parentNode;
				var maxwidth=(parentno.offsetWidth-32)+'px';
				var maxheight=(parentno.offsetHeight-32)+'px';
				var svg=this.svg;
				svg.loadSVG(this.svgdivid,workflow.getSVGPath(),maxwidth,maxheight,function() {
					wfreport.updateView(workflow);
					if(typeof callbackFunc=='function') {
						callbackFunc();
					}
				},function() {
					svg.getTrampoline().loadImage(workflow.getImagePath());
					wfreport.updateView(workflow);
					if(typeof callbackFunc=='function') {
						callbackFunc();
					}
				});
			}
		} else {
			this.clearView(callbackFunc);
		}
	},
	
	/* This method updates the size of the workflow */
	updateSVGSize: function () {
		var svgdiv=this.genview.getElementById(this.svgdivid);
		var parentno=svgdiv.parentNode;
		var maxwidth=(parentno.offsetWidth-32)+'px';
		var maxheight=(parentno.offsetHeight-32)+'px';
		//alert(parentno.offsetHeight+"||"+parentno.clientHeight);
		this.svg.SVGrescale(maxwidth,maxheight);
	},
	
	/* This method fills in the known information about the workflow */
	fillWorkflowList: function (listDOM,/*optional*/callbackFunc,viewAdd,wfCallback) {
		if(listDOM) {
			// First, remove its graphical traces
			var me=this;
			this.clearView(function() {
				me.fillWorkflowListInternal(listDOM,viewAdd,wfCallback);
				if(typeof callbackFunc=='function') {
					callbackFunc();
				}
			});
		}
	},
			
	fillWorkflowListInternal: function (listDOM, /* optional */viewAdd,wfCallback) {
		if(viewAdd==undefined) {
			// Second, remove its content
			this.wfA={};
			//GeneralView.freeSelect(this.wfselect);
			this.wfselect.clear();
		}

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
			var sortArr=undefined;
			var wfSearch=undefined;
			var wfSearchIdx=undefined;
			if(viewAdd==undefined) {
				sortArr=new Array();
				this.WFBase = new Array();
				wfSearch=new Object();
			}
			for(var domain=listDOM.firstChild ; domain ; domain=domain.nextSibling) {
				if(domain.nodeType==1 && GeneralView.getLocalName(domain)=='domain') {
					var WFBase = domain.getAttribute('relURI');
					var domainClass = domain.getAttribute('class');
					GeneralView.freeContainer(this.classTitle);
					var thett=genview.createElement('tt');
					thett.appendChild(this.genview.thedoc.createTextNode(domainClass));
					this.classTitle.appendChild(thett);
					this.classTitle.appendChild(this.genview.thedoc.createTextNode(' domain'));
					if(WFBase.indexOf('ftp:')!=0 && WFBase.indexOf('http:')!=0 && WFBase.indexOf('https:')!=0 && WFBase.charAt(0)!='/' && IWWEM.FSBase!=undefined) {
						WFBase = IWWEM.FSBase + '/'+ WFBase;
					}
					// Only add on fresh shows
					if(viewAdd==undefined) {
						this.WFBase.push(WFBase);
					}
					for(var child=domain.firstChild ; child ; child=child.nextSibling) {
						if(child.nodeType==1) {
							switch(GeneralView.getLocalName(child)) {
								case 'workflow':
									var workflow=new WorkflowDesc(child,WFBase);
									this.wfA[workflow.uuid]=workflow;
									if(sortArr!=undefined) {
										sortArr.push(workflow);
									}
									if(wfSearch!=undefined) {
										// And the full text
										var title = workflow.title;
										if(title!=undefined && title!='') {
											var splitTitle=title.toLowerCase().split(/[\n\t.,;: ()"'?!]+/);
											for(var ispl=0; ispl<splitTitle.length ; ispl++) {
												var lcFullWord=splitTitle[ispl];
												
												// Alone dashes are rejected
												if(lcFullWord=='-')
													continue;
												
												var splitWord=lcFullWord.split(/-+/);
												if(splitWord.length>1) {
													splitWord.push(lcFullWord);
												}
												for(var iw=0;iw<splitWord.length;iw++) {
													var lcWord=splitWord[iw];
													if(lcWord==undefined || lcWord=='')
														continue;
													if(!(lcWord in wfSearch)) {
														wfSearch[lcWord]=new Array();
													}
													wfSearch[lcWord].push(workflow);
												}
											}
										}
									}
									break;

								case 'message':
									var mtext=WidgetCommon.getTextContent(child);
									if(!mtext)  mtext='';
									this.genview.addMessage('<p><u>Return Value:</u> '+
										child.getAttribute('retval')+
										'</p><pre>'+mtext+'</pre>'
									);
									break;
							}
						}
					}
				}
			}
			
			// Building search index
			if(wfSearch!=undefined) {
				wfSearchIdx=new Array();
				/*
				var tips='';
				for(var facet in wfSearch) {
					tips+=wfSearch[facet].length+" ";
					wfSearchIdx.push(facet);
				}
				alert(tips);
				*/
				for(var facet in wfSearch) {
					wfSearchIdx.push(facet);
				}
				this.wfSearchIdx=wfSearchIdx.sort();
				this.wfSearch=wfSearch;
			}
			
			if(sortArr!=undefined) {
				// This is needed when searches are cleared
				this.sortArr = this.showSelectedWorkflows(sortArr);
			} else {
				// Show just the element!
				this.updateView(wfCallback);
			}
		} else {
			this.WFBase=[];
			this.genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to fetch the workflow repository listing!</h1></blink>');
		}
	},
	
	showSelectedWorkflows: function(sortArr,/*optional*/searchTerms) {
		// First, clear the list
		this.wfselect.clear();
		
		if(sortArr==undefined)
			return undefined;
		
		var nWf = sortArr.length;
		var newText = nWf + ' '+(this.handlingEnactions?'enaction':'workflow')+((nWf!=1)?'s':'');
		if(searchTerms!=undefined && searchTerms!='')
			newText += ' (with <i>'+searchTerms+'</i>)';
		this.nWfSpan.innerHTML=newText;
		// Now, time to sort this... TODO
		var sortFunc=function (a,b) {
			if(a.WFBase < b.WFBase)  return -1;
			if(a.WFBase > b.WFBase)  return 1;
			var atitle=a.title.toLowerCase();
			var btitle=b.title.toLowerCase();
			if(atitle < btitle)  return -1;
			if(atitle > btitle)  return 1;
			if(a.date < b.date)  return 1;
			if(a.date > b.date)  return -1;

			return 0;
		};

		if(this.restrictId!=undefined) {
			sortFunc=function (a,b) {
				if(a.date < b.date)  return 1;
				if(a.date > b.date)  return -1;
				var atitle=a.title.toLowerCase();
				var btitle=b.title.toLowerCase();
				if(atitle < btitle)  return -1;
				if(atitle > btitle)  return 1;
				if(a.WFBase < b.WFBase)  return -1;
				if(a.WFBase > b.WFBase)  return 1;
				return 0;
			};
		}

		sortArr=sortArr.sort(sortFunc);

		// And show them!
		for(var soi=0;soi<sortArr.length;soi++) {
			var workflow=sortArr[soi];
			var wfO = workflow.generateOption(this.genview);

			// Last: save selection!
			this.wfselect.add(wfO);
		}
		
		return sortArr;
	},
	
	searchWorkflows: function(/*optional*/words) {
		if(words==undefined)
			words=this.searchWFInput.value;
		
		var sortArr=undefined;
		if(words==undefined || words=='') {
			sortArr=this.sortArr;
		} else {
			var wordList=words.toLowerCase().split(/[\n\t.,;: ()"'?!]+/);
			var foundSets=new Array();

			// First, find search subsets
			var wfSearchIdx=this.wfSearchIdx;
			var wfSearch=this.wfSearch;
			for(var iwl=0;iwl<wordList.length;iwl++) {
				var lcFullWord=wordList[iwl];
				
				// Fixing the bug found by Jose Manuel
				if(lcFullWord.length==0)
					continue;
				
				var splitWord=lcFullWord.split(/-+/);
				if(splitWord.length>1) {
					splitWord.push(lcFullWord);
				}
				for(var iw=0;iw<splitWord.length;iw++) {
					var v = splitWord[iw];
					var h = wfSearchIdx.length;
					var l = -1;
					var m = -1;
					while((h - l) > 1) {
						m = (h + l) >> 1;
						if(wfSearchIdx[m] < v) {
							l = m;
						} else {
							h = m;
							if(wfSearchIdx[m]==v)
								break;
						}
					}
					var vlength=v.length;
					var facet='';
					for(var p=h;p<wfSearchIdx.length && wfSearchIdx[p].substr(0,vlength)==v ;p++) {
						facet+=' '+wfSearchIdx[p];
						foundSets.push(wfSearch[wfSearchIdx[p]]);
					}
				}
			}
			
			// Second, remove subset duplicates
			for(var f1=0;f1<foundSets.length;f1++) {
				for(var f2=f1+1;f2<foundSets.length;f2++) {
					if(foundSets[f1]==foundSets[f2])
						foundSets.splice(f2--,1);
				}
			}

			sortArr=new Array();
			if(foundSets.length>0) {
				sortArr = sortArr.concat(foundSets[0]);

				// Third, create combined array without duplicates
				for(var f3=1;f3<foundSets.length;f3++) {
					var arr=foundSets[f3];
					// Only old values are going to be checked
					// because new ones are different among them
					var sortArrLength=sortArr.length;
					for(var f4=0;f4<arr.length;f4++) {
						var newval=arr[f4];
						var addit=true;
						for(var f5=0;f5<sortArrLength;f5++) {
							if(sortArr[f5]==newval) {
								addit=undefined;
								break;
							}
						}
						if(addit) {
							sortArr.push(newval);
						}
					}
				}
			}
		}
		
		// And at last, let's show selected workflows!
		this.showSelectedWorkflows(sortArr,words);
		if(sortArr.length==1 && words!=undefined && words!='')
			this.wfselect.setIndex(0);
	},
	
	reloadList: function (/* optional */ wf, wfToErase, wfCallback) {
		// In progress request
		if(this.listRequest)  return;
		
		var genview=this.genview;
		genview.busy(true);
		
		// First, uncheck the beast!
		this.check.setCheck(false);
		
		var qsParm = {};
		if(wf!=undefined && wfToErase==undefined) {
			qsParm['id']=Base64._utf8_encode(wf);
		} else if(this.restrictId!=undefined) {
			qsParm['id']=Base64._utf8_encode(this.restrictId);
		}
		if(wf!=undefined && wfToErase!=undefined) {
			qsParm['eraseId']=Base64._utf8_encode(wf);
		}
		
		var listQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/workflowmanager");
		var listRequest = this.listRequest = new XMLHttpRequest();
		var manview=this;
		genview.clearMessage();
		try {
			listRequest.onreadystatechange = function() {
				if(listRequest.readyState==4) {
					manview.openReloadFrame();
					var doClose=1;
					try {
						var response = genview.parseRequest(listRequest,"fetching workflow repository status");
						if(response!=undefined) {
							var viewAdd=undefined;
							if(wf!=undefined && wfToErase==undefined)
								viewAdd=wf;
							manview.fillWorkflowList(response.documentElement.cloneNode(true),function() {
								manview.closeReloadFrame();
								manview.reloadButton.className='button';
								manview.updateTextSpan.innerHTML='Update';
								manview.listRequest=undefined;
								if(wf!=undefined && wfToErase!=undefined)
									alert('Workflow '+wf+' erase will be effective when original uploader confirms it');
								genview.busy(false);
							},viewAdd,wfCallback);
							doClose=undefined;
						}
					} catch(e) {
						genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
					}
					
					// Removing 'Loading...' frame
					if(doClose) {
						genview.busy(false);
						manview.closeReloadFrame();
						manview.reloadButton.className='button';
						manview.updateTextSpan.innerHTML='Update';
						manview.listRequest=undefined;
					}
					listRequest.onreadystatechange=function() {};
					listRequest=undefined;
				}
			};
			this.reloadButton.className="buttondisabled";
			this.updateTextSpan.innerHTML='Updating <img src="style/ajaxLoader.gif">';
			this.svg.getTrampoline().showCachedSVG('wait');
			listRequest.open('GET',listQuery,true);
			listRequest.send(null);
		} catch(e) {
			genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
		}
	},
	
	deleteWorkflow: function () {
		if(this.check.checked && this.wfselect.selectedIndex!=-1) {
			var sureErase=confirm('Are you REALLY sure you want to erase this workflow?');
			if(sureErase) {
				this.reloadList(this.wfselect.options[this.wfselect.selectedIndex].value,true);
			}
		}
	},
	
	doOpenEnaction: function() {
		if(this.wfselect.selectedIndex!=-1) {
			var thewin=(top)?top:((parent)?parent:window);
			thewin.open('enactionviewer.html?jobId='+this.wfselect.options[this.wfselect.selectedIndex].value,'_top');
		}
	}
};

function NewWorkflowView(genview,restrictId) {
	this.genview = genview;
	this.restrictId=restrictId;
	this.uploading = undefined;
	
	this.iframe=genview.getElementById('uploadIFRAME');
	this.newWFForm=genview.getElementById('formNewWF');
	this.newWFContainer=genview.getElementById('newWFContainer');
	this.newWFLic=genview.getElementById('newWFLic');
	this.newWFUploading=genview.getElementById('newWFUploading');
	var newWFButton=genview.getElementById('newWFButton');
	
	this.responsibleMail = genview.getElementById('NWresponsibleMail');
	this.responsibleName = genview.getElementById('NWresponsibleName');
	
	// Either text or file
	var newwfview = this;
	this.newWFStyleText=new GeneralView.Check(genview.getElementById('newWFStyleText'), function() { newwfview.setTextControl(); });
	this.newWFStyleFile=new GeneralView.Check(genview.getElementById('newWFStyleFile'), function() { newwfview.setFileControl(); });
	this.newWFStyleRef=new GeneralView.Check(genview.getElementById('newWFStyleRef'), function() { newwfview.setRefControl(); });
	this.currControl=undefined;
	
	// Either from a list or set by hand
	this.newWFLicList=new GeneralView.Check(genview.getElementById('newWFLicList'), function() { newwfview.setLicenseList(); });
	this.newWFLicOwn=new GeneralView.Check(genview.getElementById('newWFLicOwn'), function() { newwfview.setLicenseByHand(); });
	
	if(restrictId!=undefined) {
		// Hiding new Workflow button
		newWFButton.style.visibility='hidden';
	} else {
		// Attaching the event
		WidgetCommon.addEventListener(newWFButton,'click',function() {
			newwfview.openNewWorkflowFrame()
		},false);
	}
	
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
		this.setLicenseList();
		this.generateSubworkflowSpan();
		this.newWFUploading.style.visibility='hidden';
		
		this.frameNewId=this.genview.openFrame('newWorkflow');
	},
	
	clearView: function () {
		this.newWFControl = undefined;
		// Removing all the content from the container
		GeneralView.freeContainer(this.newWFContainer);
	},
	
	clearLicArea: function () {
		// Removing all the content from the container
		GeneralView.freeContainer(this.newWFLic);
	},
	
	setTextControl: function() {
		this.newWFStyleText.doCheck();
		if(this.currControl)
			this.currControl.doUncheck();
		this.currControl=this.newWFStyleText;
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
		if(this.currControl)
			this.currControl.doUncheck();
		this.currControl=this.newWFStyleFile;
		this.clearView();
		var filecontrol = this.genview.createCustomizedFileControl("workflow");
		this.newWFControl = filecontrol;

		// We are appending the fake control!
		//this.newWFContainer.appendChild(filecontrol.parentNode);
		this.newWFContainer.appendChild(filecontrol);
	},
	
	setRefControl: function() {
		this.newWFStyleRef.doCheck();
		if(this.currControl)
			this.currControl.doUncheck();
		this.currControl=this.newWFStyleRef;
		this.clearView();
		var textbox = this.genview.createInput("workflowRef",'');
		this.newWFControl = textbox;
		
		this.newWFContainer.appendChild(textbox);
	},
	
	setLicenseList: function() {
		this.newWFLicList.doCheck();
		this.newWFLicOwn.doUncheck();
		this.clearLicArea();
		
		// TODO
		//this.newWFLic.appendChild();
		var licSelect = this.genview.createElement('select');
		licSelect.name = 'licenseURI';
		this.newWFLic.appendChild(licSelect);
		var licenses = this.genview.licenseManager.licenses; 
		for(var lici=0;lici<licenses.length;lici++) {
			var license=licenses[lici];
			var licSelOpt=license.generateOption();

			// Last: save selection!
			try {
				licSelect.add(licSelOpt,null);
			} catch(e) {
				licSelect.add(licSelOpt);
			}
		}
		
		var licName = this.genview.createHiddenInput('licenseName','');
		this.newWFLic.appendChild(licName);
		
		var licHRef=this.genview.createElement('a');
		licHRef.setAttribute('target','_blank');
		licHRef.setAttribute('href','about:blank');
		this.newWFLic.appendChild(licHRef);
		var licImg = this.genview.createElement('img');
		licImg.setAttribute('alt','(NO IMAGE)');
		licImg.setAttribute('style','vertical-align:middle;');
		licImg.setAttribute('border','0');
		licHRef.appendChild(licImg);
		
		WidgetCommon.addEventListener(licSelect,'change',function() {
			if(licSelect.selectedIndex!=-1) {
				licName.value=licSelect.options[licSelect.selectedIndex].text;
				var license=licenses[licSelect.selectedIndex];
				var theuri=license.getAbbrevURI();
				var thealt;
				if(theuri) {
					thealt=theuri;
				} else {
					theuri='about:blank';
					thealt='(NO IMAGE)';
				}
				licImg.setAttribute('alt',thealt);
				licHRef.setAttribute('href',theuri);
				var width=license.getLogoWidth();
				if(width) {
					licImg.setAttribute('width',width);
				} else {
					licImg.removeAttribute('width');
				}
				var height=license.getLogoHeight();
				if(height) {
					licImg.setAttribute('height',height);
				} else {
					licImg.removeAttribute('height');
				}
				var logourl=license.getLogoURL();
				if(!logourl)
					logourl='about:blank';
				licImg.setAttribute('src',logourl);
			} else {
				licName.value='';
				licHRef.setAttribute('href','about:blank');
				licImg.setAttribute('alt','(NO IMAGE)');
				licImg.removeAttribute('width');
				licImg.removeAttribute('height');
				licImg.setAttribute('src','about:blank');
			}
		},false);
		
	},
	
	setLicenseByHand: function() {
		this.newWFLicOwn.doCheck();
		this.newWFLicList.doUncheck();
		this.clearLicArea();
		
		// TODO
		this.newWFLic.appendChild(this.genview.thedoc.createTextNode('License URI'));
		var licURI=this.genview.createElement('input');
		licURI.type='text';
		licURI.name='licenseURI';
		this.newWFLic.appendChild(licURI);
		this.newWFLic.appendChild(this.genview.thedoc.createTextNode('  License Name'));
		var licName=this.genview.createElement('input');
		licName.type='text';
		licName.name='licenseName';
		this.newWFLic.appendChild(licName);
	},
	
	/* Generates a new graphical input */
	generateSubworkflowSpan: function () {
		var check=this.genview.generateCheckControl('Embed workflow dependencies',undefined,undefined,1);
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
			if(this.responsibleMail.value.indexOf('@')==-1) {
				alert('You must introduce a valid workflow responsible e-mail address');
			} else if(this.responsibleName.value.length==0) {
				alert('You must introduce a workflow responsible name');
			} else if(!this.newWFControl || !this.newWFControl.value || this.newWFControl.value.length == 0) {
				alert('Please introduce the new workflow before submitting it!');
			} else {
				if(this.embedCheck.checked) {
					var freeze = this.genview.createHiddenInput('freezeWorkflowDeps','1');
					this.newSubWFContainer.appendChild(freeze);
				}
				
				if(this.restrictId!=undefined) {
					var resId = this.genview.createHiddenInput('id',this.restrictId);
					this.newSubWFContainer.appendChild(resId);
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
					newwfview.genview.clearMessage();
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
								
								// No error detection method was added, because next functions must be strong enough 
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
						alert('Workflow addition will be effective when original uploader confirms it');
					});
				};
				
				WidgetCommon.addEventListener(iframe,'load',onUpload,false);
				
				// And results must go there
				this.newWFForm.target=iframeName;
				// Let's go!
				this.uploading=true;
				this.newWFForm.submit();
			}
		}
	}
};

function NewEnactionView(manview) {
	this.manview=manview;
	var genview = this.genview = manview.genview;
	this.restrictId=manview.restrictId;
	
	this.iframe=genview.getElementById('enactIFRAME');
	this.newEnactForm=genview.getElementById('formEnactor');
	this.workflowHiddenInput=genview.getElementById('workflowHiddenInput');
	this.inputsContainer=genview.getElementById('newInputs');
	this.enactSVGContainer = genview.getElementById('enactsvg');
	this.newEnactUploading = genview.getElementById('newEnactUploading');
	this.submittedList = genview.getElementById('submittedList');
	this.newEnactWFName = genview.getElementById('newEnactWFName');
	
	this.responsibleMail = genview.getElementById('NEresponsibleMail');
	this.responsibleName = genview.getElementById('NEresponsibleName');
	
	this.enactButton = genview.getElementById('enactButton');
	this.noEnactButton = genview.getElementById('noEnactButton');
	
	var newenactview = this;
	
	WidgetCommon.addEventListener(manview.launchButton,'click',function() {
		newenactview.openNewEnactionFrame();
	},false);

	WidgetCommon.addEventListener(manview.relaunchButton,'click',function() {
		newenactview.reenact();
	},false);
	
	WidgetCommon.addEventListener(this.noEnactButton,'click',function() {
		newenactview.closeNewEnactionFrame();
	},false);
	
	WidgetCommon.addEventListener(this.enactButton,'click',function() {
		newenactview.enact();
	},false);
	
	this.enactSVG = undefined;
	this.inputs=new Array();
	
	this.workflow=undefined;
	
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
	this.saveOnlyCheck=undefined;
	
	this.inputmode=undefined;

	this.setupInputType();
	
	WidgetCommon.addEventListener(window,'resize',function() {
		newenactview.updateSVGSize();
	},false);
}

NewEnactionView.Encodings=['ISO-8859-1','binary','UTF-8'];

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
				this.inputsContainer.className='scrolldatawide';
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
	
	updateSVGSize: function() {
		var parentno=this.enactSVGContainer.parentNode;
		var maxwidth=(parentno.offsetWidth-32)+'px';
		var maxheight=(parentno.offsetHeight-32)+'px';
		//alert(parentno.offsetHeight+"||"+parentno.clientHeight);
		//alert(maxwidth+' '+maxheight);
		if(this.enactSVG)
			this.enactSVG.SVGrescale(maxwidth,maxheight);
	},
	
	setSaveExampleMode: function(state) {
		if(!this.inputmode) {
			if(state!=this.saveAsExample.checked) {
				if(this.saveAsExample.checked) {
					this.saveAsExample.setCheck(false);
					this.saveOnlyCheck=undefined;
					GeneralView.freeContainer(this.saveExampleDiv);
				} else {
					this.saveAsExample.setCheck(true);
					
					// MORE - creating dialog fields
					var spanName=this.genview.createElement('span');
					spanName.innerHTML='Example Name ';
					//var brName=this.genview.createElement('br');
					var exampleName=this.genview.createElement('input');
					exampleName.type='text';
					exampleName.name='exampleName';
					var br=this.genview.createElement('br');
					var spanDesc=this.genview.createElement('span');
					spanDesc.innerHTML='Description';
					var brDesc=this.genview.createElement('br');
					
					this.saveExampleDiv.appendChild(spanName);
					//this.saveExampleDiv.appendChild(brName);
					this.saveExampleDiv.appendChild(exampleName);
					this.saveOnlyCheck = this.genview.generateCheckControl(
								'Only Save Example',
								undefined,
								undefined,
								1,
								this.saveExampleDiv
							);
					this.saveExampleDiv.appendChild(br);
					this.saveExampleDiv.appendChild(spanDesc);
					this.saveExampleDiv.appendChild(brDesc);
					
					this.genview.createFCKEditor(this.saveExampleDiv,'exampleDesc');
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
			
			this.workflow = workflow;
			GeneralView.freeContainer(this.newEnactWFName);
			this.newEnactWFName.appendChild(this.genview.thedoc.createTextNode(workflow.title+' ['+workflow.lsid+']'));
			
			// Inputs
			this.setInputMode(this.noneExampleSpan.control);
			this.setSaveExampleMode(false);
			
			// And at last, open frame
			this.frameEnactId=this.genview.openFrame('newEnaction');
			
			// SVG graph
			var parentno=this.enactSVGContainer.parentNode;
			var maxwidth=(parentno.offsetWidth-32)+'px';
			var maxheight=(parentno.offsetHeight-32)+'px';
			//alert(maxwidth+' '+maxheight);
			var newenactview=this;
			
			if(this.enactSVG==undefined) {
				this.enactSVG = new DynamicSVG(this.enactSVGContainer.id,undefined,IWWEM.Unknown,undefined,undefined,function() {
					newenactview.updateSVGSize();
				});
				var me = this;
				this.enactSVG.initSVG(function() {
					me.enactSVG.loadSVG(me.enactSVGContainer.id,workflow.getSVGPath(),maxwidth,maxheight,function() {
						newenactview.updateSVGSize();
					},function() {
						newenactview.enactSVG.getTrampoline().loadImage(workflow.getImagePath());
						newenactview.updateSVGSize();
					});
				});
			} else {
				this.enactSVG.loadSVG(this.enactSVGContainer.id,workflow.getSVGPath(),maxwidth,maxheight,function() {
					newenactview.updateSVGSize();
				},function() {
					newenactview.enactSVG.getTrampoline().loadImage(workflow.getImagePath());
					newenactview.updateSVGSize();
				});
			}
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
		this.inputsContainer.innerHTML='Example ';
		this.inputsContainer.appendChild(exSelect);
		
		// Choicing...
		var thechoicedesc=this.genview.createElement('span');
		thechoicedesc.className='radio left';
		thechoicedesc.innerHTML='Desc';
		var radiothechoicedesc=new GeneralView.Check(thechoicedesc);
		radiothechoicedesc.doCheck();
		
		var thechoicedata=this.genview.createElement('span');
		thechoicedata.className='radio left';
		thechoicedata.innerHTML='Data';
		var radiothechoicedata=new GeneralView.Check(thechoicedata);
		
		var radiostatecontrol=radiothechoicedesc;
		
		var descdataSpan=this.genview.createElement('span');
		descdataSpan.className='borderedOption';
		descdataSpan.appendChild(thechoicedesc);
		descdataSpan.appendChild(thechoicedata);
		
		this.inputsContainer.appendChild(descdataSpan);

		this.inputsContainer.appendChild(divdesc);
		

		// Table for data browser
		var table=this.genview.createElement('table');
		table.className='wfdatabrowse';
		var tabledisplay=table.style.display;
		table.style.display='none';
		
		var tbody=this.genview.createElement('tbody');
		tbody.className='generictbody';
		table.appendChild(tbody);
		
		var tr0=this.genview.createElement('tr');
		tr0.style.height='1%';
		tbody.appendChild(tr0);
		var td1=this.genview.createElement('td');
		td1.rowSpan=2;
		td1.style.width='50%';
		td1.style.height='100%';
		tr0.appendChild(td1);
		var dataTreeDiv=this.genview.createElement('div');
		var dataTreeDivId=WidgetCommon.getRandomUUID();
		dataTreeDiv.setAttribute('id',dataTreeDivId);
		dataTreeDiv.className='scrolldatawide';
		td1.appendChild(dataTreeDiv);
		
		var mimeInfoSelect=this.genview.createElement('td');
		mimeInfoSelectId=WidgetCommon.getRandomUUID();
		mimeInfoSelect.setAttribute('id',mimeInfoSelectId);
		mimeInfoSelect.style.width='50%';
		mimeInfoSelect.style.height='1%';
		mimeInfoSelect.style.overflow='hidden';
		tr0.appendChild(mimeInfoSelect);
		
		var tr=this.genview.createElement('tr');
		tr.style.height='100%';
		tbody.appendChild(tr);
		var td2=this.genview.createElement('td');
		td2.style.width='50%';
		td2.style.height='100%';
		tr.appendChild(td2);
		var databrowser=this.genview.createElement('div');
		var databrowserId=WidgetCommon.getRandomUUID();
		databrowser.setAttribute('id',databrowserId);
		databrowser.className='scroll';
		td2.appendChild(databrowser);

		this.inputsContainer.appendChild(table);
		
		// And now... the browser object!
		var datatreeview = new DataTreeView(this.genview,dataTreeDivId,databrowserId,mimeInfoSelectId, undefined);
		
		// the on change event, which must be taken into account
		var newenactview=this;
		var stepCache={};
		var step=undefined;
		var viewExample=function(exampleUUID) {
			var step=stepCache[exampleUUID];
			datatreeview.setStep(example.workflow.WFBase,exampleUUID,step,-1);
		};
		var onSelectChange=function() {
			if(exSelect.selectedIndex!=-1) {
				var example = workflow.getExample(exSelect.options[exSelect.selectedIndex].value);
				if(radiothechoicedesc.checked) {
					newenactview.inputsContainer.className='scrolldatawide';
					GeneralView.freeContainer(divdesc);
					table.style.display='none';
					divdesc.style.display='block';
					var output='<b>Example name:</b> '+example.name;
					output += '<p><b>UUID:</b>&nbsp;'+example.uuid+'</p>';
					output += '<p><b>Date:</b> '+example.date+'</p>';
					output += '<p><b>Uploader:</b> ';
					if(example.responsibleMail!=undefined && example.responsibleMail.length>0) {
						var email=example.responsibleMail;
						var ename=(example.responsibleName && example.responsibleName.length>0)?GeneralView.preProcess(example.responsibleName):email;
						output += '<a href="mailto:'+email+'">'+ename+'</a></p>';
					} else {
						output += '<i>(unknown)</i></p>';
					}
					output += '<p><i><a href="'+example.getExamplePath()+'">Download example in Baclava format</a></i></p>';
					output += '<b>Description</b><br>';
					if(example.description && example.description.length>0) {
						output += GeneralView.preProcess(example.description);
					} else {
						output += '<i>(None)</i>';
					}

					divdesc.innerHTML=output;
				} else {
					newenactview.inputsContainer.className='fulldiv';
					divdesc.style.display='none';
					table.style.display=tabledisplay;
					
					var exampleUUID=example.getQualifiedUUID();
					if(exampleUUID in stepCache) {
						viewExample(exampleUUID);
					} else {
						var request;
						var genview=this.genview;
						var theurl = IWWEM.FSBase + '/id/' + Base64._utf8_encode(exampleUUID)+'?digested=1';
						try {
							request=new XMLHttpRequest();
							var requestonload = function() {
								var response=genview.parseRequest(request,"parsing examples list");
								if(response!=undefined) {
									// Only parse when an answer is available
									stepCache[exampleUUID]=new EnactionStep(response.documentElement);
									viewExample(exampleUUID);
								}
								if(request.onload) {
									request.onload=function() {};
									requestonload=undefined;
									request=undefined;
								}
							};
							
							if(request.onload) {
								request.onload=requestonload;
							} else {
								request.onreadystatechange = function() {
									if(request.readyState==4) {
										try {
											requestonload();
										} catch(e) {
											genview.setMessage(
												'<blink><h1 style="color:red">FATAL ERROR: Unable to complete example load!</h1></blink><pre>'+
												WidgetCommon.DebugError(e)+'</pre>'
											);
										}
										request.onreadystatechange=function() {};
										request=undefined;
									}
								};
							}

							// Now it is time to send the query
							request.open('GET',theurl,true);
							request.send(null);
						} catch(e) {
							genview.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR: Unable to browse '+
								theurl+
								' example!</h1></blink><pre>'+
								WidgetCommon.DebugError(e)+
								'</pre>'
							);
							request=undefined;
						}
					}
				}
			}
		};
		
		WidgetCommon.addEventListener(exSelect,'change',onSelectChange,false);
		
		// And the onclick event!
		var onclickHandler=function(event) {
			if(!event)  event=window.event;
			var target=(event.currentTarget)?event.currentTarget:event.srcElement;
			if(!radiostatecontrol || radiostatecontrol.control!=target) {
				if(radiostatecontrol) {
					radiostatecontrol.doUncheck();
				}
				radiostatecontrol=(target==radiothechoicedata.control)?radiothechoicedata:radiothechoicedesc;
				radiostatecontrol.doCheck();
				// Redraw!
				onSelectChange();
			}
		};
		
		radiothechoicedesc.addEventListener('click', onclickHandler, false);
		radiothechoicedata.addEventListener('click', onclickHandler, false);
		
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
		theinput.appendChild(this.genview.thedoc.createTextNode('Input '));
		var inputname=this.genview.createElement('span');
		inputname.style.color='red';
		inputname.appendChild(this.genview.thedoc.createTextNode(input.name));
		theinput.appendChild(inputname);
		
		var theinputhelp=this.genview.createElement('a');
		theinputhelp.setAttribute('href','javascript:void(0)');
		var iconhelp=this.genview.createElement('img');
		iconhelp.setAttribute('src','style/iconhelp.png');
		iconhelp.setAttribute('alt','?');
		theinputhelp.appendChild(iconhelp);
		var helpdesc=(input.description && input.description.length>0)?input.description:'(no available help)';
		if(BrowserDetect.browser=='Explorer') {
			theinputhelp.className='inputhelpie';
			iconhelp.setAttribute('title',helpdesc);
		} else {
			theinputhelp.className='inputhelp';
			var texthelp=this.genview.createElement('span');
			texthelp.appendChild(this.genview.thedoc.createTextNode(helpdesc));
			theinputhelp.appendChild(texthelp);
		}
		
		var thechoicetext=this.genview.createElement('span');
		thechoicetext.className='radio left';
		thechoicetext.innerHTML='as text';
		var radiothechoicetext=new GeneralView.Check(thechoicetext);
		radiothechoicetext.doCheck();
		
		var thechoicefile=this.genview.createElement('span');
		thechoicefile.className='radio left';
		thechoicefile.innerHTML='as file';
		var radiothechoicefile=new GeneralView.Check(thechoicefile);
		
		var encodingSelect=this.genview.createElement('select');
		encodingSelect.name='ENCODING_'+input.name;
		for(var i=0;i<NewEnactionView.Encodings.length;i++) {
			var iterM=this.genview.createElement('option');
			iterM.text=iterM.value=NewEnactionView.Encodings[i];
			try {
				encodingSelect.add(iterM,null);
			} catch(e) {
				encodingSelect.add(iterM);
			}
		}

		// Now, it is time to create the selection
		var thechoice = this.genview.createElement('span');
		thechoice.className='borderedOption';
		var radiostatecontrol=radiothechoicetext;
		
		var newenactview=this;
		var onclickHandler=function(event) {
			if(!event)  event=window.event;
			var target=(event.currentTarget)?event.currentTarget:event.srcElement;
			if(!radiostatecontrol || radiostatecontrol.control!=target) {
				if(radiostatecontrol) {
					radiostatecontrol.doUncheck();
				}
				
				if(target==radiothechoicefile.control) {
					radiostatecontrol=radiothechoicefile;
					thechoice.parentNode.insertBefore(encodingSelect,thechoice.nextSibling);
				} else {
					radiostatecontrol=radiothechoicetext;
					thechoice.parentNode.removeChild(encodingSelect);
				}
				
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
			var controlname='PARAM_'+input.name;
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

		// Now, it is time to create the option selection
		thechoice.appendChild(thechoicetext);
		thechoice.appendChild(thechoicefile);

		// Last children!
		thediv.appendChild(theinput);
		thediv.appendChild(theinputhelp);
		thediv.appendChild(this.genview.thedoc.createTextNode(''));
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
		this.enactSVG.clearSVG();
		this.disposeContainers();
		this.setInputMode(undefined);
	},
	
	closeNewEnactionFrame: function() {
		this.genview.closeFrame(this.frameEnactId);
		
		this.clearView();
		this.workflow=undefined;
	},
	
	openSubmitFrame: function(/* optional */useShimmer) {
		// if(useShimmer) {
			this.reEnactFrameId=this.genview.openFrame('submitEnaction',useShimmer);
		// } else {
		//	var elem=this.genview.getElementById('submitEnaction');
		//	elem.className='submitEnaction';
		// }
	},
	
	closeSubmitFrame: function(/* optional */useShimmer) {
		if(this.reEnactFrameId) {
			this.genview.closeFrame(this.reEnactFrameId);
			this.reEnactFrameId=undefined;
		} else {
			var elem=this.genview.getElementById('submitEnaction');
			elem.className='hidden';
		}
	},
	
	enact: function () {
		if(this.responsibleMail.value.indexOf('@')==-1) {
			alert('You must introduce a valid enaction responsible e-mail address');
		} else if(this.responsibleName.value.length==0) {
			alert('You must introduce an enaction responsible name');
		} else if(this.workflow.hasInputs && !this.inputmode && this.inputCounter<=0) {
			alert('You must introduce an input before trying to\nstart the enaction process');
		} else {
			// Creating the hidden value for 
			if(this.saveOnlyCheck && this.saveOnlyCheck.checked)  {
				var newhid = this.genview.createHiddenInput('onlySaveAsExample','1');
				this.workflowHiddenInput.parentNode.insertBefore(newhid,this.workflowHiddenInput.nextSibling);
			}
			
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
				newenactview.genview.clearMessage();
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
							
							// No error detection method was added, because next functions must be strong enough 
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
				if(newenactview.saveAsExample.checked)
					alert('Example addition will be effective when original uploader confirms it');
			};
			WidgetCommon.addEventListener(iframe,'load',iframeLoaded,false);

			// And results must go there
			this.newEnactForm.target=iframeName;
			// Let's go!
			this.newEnactForm.submit();
		}
	},
	
	reenact: function() {
		var manview=this.manview;
		var genview=this.genview;
		if(manview.wfselect.selectedIndex!=-1) {
			// The enaction id is the only we need!
			var enUUID=manview.wfselect.options[manview.wfselect.selectedIndex].value;
			
			// First, locking the window
			this.openSubmitFrame(1);
			
			var workflow = this.manview.wfA[enUUID];
			var qsParm = {
				id: Base64._utf8_encode(enUUID),
				reusePrevInput: '1',
				// Setting responsible
				responsibleMail: Base64._utf8_encode(workflow.responsibleMail),
				responsibleName: Base64._utf8_encode(workflow.responsibleName)
			};
			
			var reenactQuery = WidgetCommon.generateQS(qsParm,"cgi-bin/enactionlauncher");
			var reenactRequest = new XMLHttpRequest();
			var newenact=this;
			genview.clearMessage();
			try {
				reenactRequest.onreadystatechange = function() {
					if(reenactRequest.readyState==4) {
						try {
							var response = genview.parseRequest(reenactRequest,"finishing reenaction startup");
							if(response!=undefined)
								newenact.parseEnactionIdAndLaunch(response,1);
						} catch(e) {
							genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to complete reenaction!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
						}
						// Removing 'Loading...' frame
						newenact.closeSubmitFrame();
						reenactRequest.onreadystatechange=function() {};
						reenactRequest=undefined;
					}
				};
				reenactRequest.open('GET',reenactQuery,true);
				reenactRequest.send(null);
			} catch(e) {
				genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to start reenaction of '+
					enUUID+'!</h1></blink><pre>'+WidgetCommon.DebugError(e)+'</pre>');
			}
		}
	},
	
	parseEnactionIdAndLaunch: function(enactIdDOM,/* optional */reenact) {
		var enactId;
		
		if(enactIdDOM) {
			if(enactIdDOM.documentElement &&
				enactIdDOM.documentElement.tagName &&
				(GeneralView.getLocalName(enactIdDOM.documentElement)=='enactionlaunched')
			) {
				if(this.saveOnlyCheck==undefined || !this.saveOnlyCheck.checked) {
					enactId = enactIdDOM.documentElement.getAttribute('jobId');
					if(enactId) {
						if(reenact) {
							var thewin=(top)?top:((parent)?parent:window);
							thewin.open('enactionviewer.html?jobId='+enactId,'_top');
						} else {
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
					}
				}
				this.saveOnlyCheck=undefined;
			} else {
				this.genview.setMessage('<blink><h1 style="color:red">FATAL ERROR: Unable to start the '+
					((reenact)?'re-':'')+
					'enaction process</h1></blink>');
			}
		}
		
		return enactId;
	}
};
