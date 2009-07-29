/*
	$Id$
	datatreeview.js
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

function DataTreeView(genview,dataTreeDivId,dataBrowserDivId,mimePathDivId, /*optional*/ procFrameId,preprocFrameId) {
	this.genview=genview;
	
	this.procFrameId=procFrameId;
	this.matcher = new DataMatcher();
	this.databrowser=new DataBrowser(genview,dataBrowserDivId,mimePathDivId,preprocFrameId);
	
	// Let's go!
	var dataTreeDiv=genview.getElementById(dataTreeDivId);
	
	// Form creation
	var theform = genview.createElement('form');
	theform.acceptEncoding='UTF-8';
	
	// Iteration Div
	this.iterDiv=genview.createElement('div');
	this.iterDiv.style.display='none';
	var bIter=genview.createElement('b');
	bIter.appendChild(genview.thedoc.createTextNode('Iteration '));
	this.iterDiv.appendChild(bIter);
	// Iteration selection
	this.iterationSelect=genview.createElement('select');
	this.iterDiv.appendChild(this.iterationSelect);

	var italspan=genview.createElement('span');
	italspan.style.fontStyle='italic';
	italspan.appendChild(genview.thedoc.createTextNode('(done '));
	this.iterNumberSpan=genview.createElement('span');
	this.iterNumberSpan.style.fontWeight='bold';
	italspan.appendChild(this.iterNumberSpan);
	italspan.appendChild(genview.thedoc.createTextNode(' of '));
	this.iterMaxSpan=genview.createElement('span');
	this.iterMaxSpan.style.fontWeight='bold';
	italspan.appendChild(this.iterMaxSpan);
	italspan.appendChild(genview.thedoc.createTextNode(', '));
	this.iterPercentSpan=genview.createElement('span');
	italspan.appendChild(this.iterPercentSpan);
	italspan.appendChild(genview.thedoc.createTextNode('%)'));
	this.iterDiv.appendChild(italspan);
	theform.appendChild(this.iterDiv);

	// SchedStamp div
	this.schedStampDiv=genview.createElement('div');
	this.schedStampDiv.style.display='none';
	bIter=genview.createElement('b');
	bIter.appendChild(genview.thedoc.createTextNode('Scheduled: '));
	this.schedStampDiv.appendChild(bIter);
	// SchedStamp span
	this.schedStampSpan=genview.createElement('span');
	this.schedStampSpan.innerHTML='&nbsp;';
	this.schedStampDiv.appendChild(this.schedStampSpan);
	theform.appendChild(this.schedStampDiv);

	// StartStamp div
	this.startStampDiv=genview.createElement('div');
	this.startStampDiv.style.display='none';
	bIter=genview.createElement('b');
	bIter.appendChild(genview.thedoc.createTextNode('Started: '));
	this.startStampDiv.appendChild(bIter);
	// StartStamp span
	this.startStampSpan=genview.createElement('span');
	this.startStampSpan.innerHTML='&nbsp;';
	this.startStampDiv.appendChild(this.startStampSpan);
	theform.appendChild(this.startStampDiv);

	// StopStamp div
	this.stopStampDiv=genview.createElement('div');
	this.stopStampDiv.style.display='none';
	bIter=genview.createElement('b');
	bIter.appendChild(genview.thedoc.createTextNode('Stopped: '));
	this.stopStampDiv.appendChild(bIter);
	// StopStamp span
	this.stopStampSpan=genview.createElement('span');
	this.stopStampSpan.innerHTML='&nbsp;';
	this.stopStampDiv.appendChild(this.stopStampSpan);
	theform.appendChild(this.stopStampDiv);

	// Error div
	this.errStepDiv=genview.createElement('div');
	this.errStepDiv.innerHTML='&nbsp;';
	theform.appendChild(this.errStepDiv);

	// Inputs Span
	this.inputsSpan=genview.createElement('span');
	this.inputsSpan.className='IOStat';
	this.inputsSpan.innerHTML='Inputs&nbsp;';
	var img=genview.createElement('img');
	img.setAttribute('src','style/ajaxLoader.gif');
	img.setAttribute('alt','Loading...');
	img.setAttribute('title','Loading...');
	this.inputsSpan.appendChild(img);
	theform.appendChild(this.inputsSpan);

	// Inputs Div
	this.inContainer=genview.createElement('div');
	this.inContainer.innerHTML='&nbsp;';
	theform.appendChild(this.inContainer);

	// Outputs Span
	this.outputsSpan=genview.createElement('span');
	this.outputsSpan.className='IOStat';
	this.outputsSpan.innerHTML='Outputs&nbsp;';
	var img=genview.createElement('img');
	img.setAttribute('src','style/ajaxLoader.gif');
	img.setAttribute('alt','Loading...');
	img.setAttribute('title','Loading...');
	this.outputsSpan.appendChild(img);
	theform.appendChild(this.outputsSpan);

	// Outputs Div
	this.outContainer=genview.createElement('div');
	this.outContainer.innerHTML='&nbsp;';
	theform.appendChild(this.outContainer);

	// Last, appending the form to the parent
	dataTreeDiv.appendChild(theform);
	
	this.step=undefined;
	this.istep=undefined;
}

DataTreeView.prototype = {
	updateInputsStatus: function(jobId,gstep,step,iteration) {
		this.updateIOStatus(
			step.input,
			this.inputsSpan,
			this.inContainer,
			step.hasInputs,
			new DataBrowser.LocatedData(jobId,gstep.name,(iteration!=-1)?step.name:undefined,'I')
		);
	},
	
	updateOutputsStatus: function(jobId,gstep,step,iteration) {
		this.updateIOStatus(
			step.output,
			this.outputsSpan,
			this.outContainer,
			step.hasOutputs,
			new DataBrowser.LocatedData(jobId,gstep.name,(iteration!=-1)?step.name:undefined,'O')
		);
	},
	
	updateIOStatus: function(stepIO,IOSpan,IOContainer,hasIO,locObject) {
		GeneralView.freeContainer(IOContainer);
		var loaded=stepIO[Baclava.GOT];
		IOSpan.className=(!hasIO || loaded)?'IOStat':'IOStatLoading';
		if(!hasIO) {
			IOSpan.style.display='none';
			IOContainer.style.display='none';
		} else {
			IOSpan.style.display='inline';
			IOContainer.style.display='block';
		}
		if(loaded) {
			for(var IO in stepIO) {
				if(IO==Baclava.GOT)  continue;
				this.generateIO(IO,(loaded)?stepIO:undefined,(loaded)?stepIO[IO].mime:undefined,IOContainer,locObject.newChild(IO));
			}
		}
	},
	
	tryUpdateInputsStatus: function(jobId,step,istep) {
		this.tryUpdateIOStatus(jobId,step,istep,'input',this.inputsSpan,this.inContainer,'hasInputs');
	},
	
	tryUpdateOutputsStatus: function(jobId,step,istep) {
		this.tryUpdateIOStatus(jobId,step,istep,'output',this.outputsSpan,this.outContainer,'hasOutputs');
	},
	
	tryUpdateIOStatus: function(jobId,step,istep,stepIOFacet,IOSpan,IOContainer,hasIOFacet) {
		var gstep=step.parentStep?step.parentStep:step;
		if(this.step==gstep) {
			// Update the selection text
			var tstep;
			var s_istep=istep;
			if(istep==undefined) {
				s_istep=istep=-1;
			}
			istep=parseInt(istep,10);
			tstep=(istep!=-1)?s_istep:'Whole';

			this.setSelectOptionText(istep+1,tstep);
			
			// And perhaps the generated tree!
			if(this.istep==istep) {
				this.updateIOStatus(step[stepIOFacet],IOSpan,IOContainer,step[hasIOFacet],new DataBrowser.LocatedData(jobId,gstep.name,s_istep,(stepIOFacet=='input')?'I':'O'));
			}
		}
	},
	
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
				var datatreeview=this;
				if(beMatched==true) {
					var fruit=this.genview.createElement('img');
					fruit.src='style/twisty-fruit.png';
					span.appendChild(fruit);
					
					var conspan=this.genview.createElement('div');
					conspan.className='branchcontainer';
					var virhash={};
					for(var matchi=0;matchi<data.dataMatches.length;matchi++) {
						var match=data.dataMatches[matchi];
						var virfacet=match.pattern+'['+match.numMatch+']';
						var virfacetname='#'+virfacet;
						virhash[virfacetname]=match.data;
						this.generateIO(virfacetname,virhash,match.data.mimeList,conspan,locObject.newChild(virfacet,true));
					}

					span.appendChild(conspan);
					retval=2;
				} else if(beMatched=='maybe') {
					var seed=this.genview.createElement('img');
					seed.src='style/seed-small.png';
					seed.style.marginLeft='5px';
					seed.style.cursor='pointer';
					seed.setAttribute('title','Possible embedded data. Click to try finding something');
					seed.setAttribute('alt','Seed');
					
					var seedgrow = function (event) {
						seed.src='style/seed-growing-test.gif';
						seed.setAttribute('title','Possible embedded data (test in progress)');
						seed.setAttribute('alt','Seed growing');
						var frameId=undefined;
						if(datatreeview.procFrameId!=undefined) {
							frameId=datatreeview.genview.openFrame(datatreeview.procFrameId,1);
						}
						data.doMatching(function(dataMatches) {
							if(dataMatches.length>0) {
								seed.src='style/twisty-fruit.png';
								seed.setAttribute('title','Embedded data. Click to (un)fold');
								seed.setAttribute('alt','Fruit');
								// Call generateIO to follow the party!
								var conspan=datatreeview.genview.createElement('div');
								conspan.className='branchcontainer';
								var virhash={};
								for(var matchi=0;matchi<dataMatches.length;matchi++) {
									var match=dataMatches[matchi];
									var virfacet=match.pattern+'['+match.numMatch+']';
									var virfacetname='#'+virfacet;
									virhash[virfacetname]=match.data;
									datatreeview.generateIO(virfacetname,virhash,match.data.mimeList,conspan,locObject.newChild(virfacet,true));
								}

								span.appendChild(conspan);
							} else {
								// Last, updating the class...
								span.removeChild(seed);
							}
							if(frameId!=undefined) {
								datatreeview.genview.closeFrame(frameId);
							}
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
					datatreeview.databrowser.show(locObject,mime);
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

			// Event to show the contents
			WidgetCommon.addEventListener(span,'click',EnactionView.BranchClick,false);
			
			div.appendChild(condiv);
			parentContainer.appendChild(div);
			
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
				var expandClass;
				div.className='branch';
				if(isscroll) {
					expandContent=' [\u2212]';
					expandClass='scrollswitch';
					condiv.className+=' scrollbranchcontainer'
				} else {
					expandContent=' [=]';
					expandClass='noscrollswitch';
				}
				var expandSpan = this.genview.createElement('span');
				expandSpan.className=expandClass;
				expandSpan.innerHTML=expandContent;
				// Event to expand/collapse
				WidgetCommon.addEventListener(expandSpan,'click',EnactionView.ScrollClick,false);
				WidgetCommon.addEventListener(expandSpan,'selectstart',EnactionView.NoSelect,false);
				div.insertBefore(expandSpan,condiv);
				
				retval=3;
			}
		}
		
		return retval;
	},
	
	clearView: function() {
		// TODO
		// Some free containers will be here
		this.databrowser.clearView();
		GeneralView.freeContainer(this.errStepDiv);
		this.schedStampDiv.style.display='none';
		this.startStampDiv.style.display='none';
		this.stopStampDiv.style.display='none';
	},
	
	addSelectEventListener: function(eventType,iterSelectHandler) {
		if(this.iterSelectHandler && this.iterEventType) {
			try {
				WidgetCommon.removeEventListener(this.iterationSelect,this.iterEventType,this.iterSelectHandler,false);
			} catch(e) {
				// DoNothing(R)
			}
		}
		this.iterEventType=eventType;
		this.iterSelectHandler=iterSelectHandler;
		WidgetCommon.addEventListener(this.iterationSelect,eventType,iterSelectHandler,false);
	},

	removeSelectEventListener: function() {
		// Unfilling iterations
		if(this.iterSelectHandler) {
			try {
				WidgetCommon.removeEventListener(this.iterationSelect,this.iterEventType,this.iterSelectHandler,false);
			} catch(e) {
				// DoNothing(R)
			}
			this.iterSelectHandler=undefined;
			this.iterEventType=undefined;
		}
	},
	
	clearSelect: function() {
		GeneralView.freeSelect(this.iterationSelect);
		GeneralView.freeContainer(this.iterNumberSpan);
		GeneralView.freeContainer(this.iterMaxSpan);
		GeneralView.freeContainer(this.iterPercentSpan);
		this.step=undefined;
		this.istep=undefined;
	},
	
	addToSelect: function(iterO) {
		try {
			this.iterationSelect.add(iterO,null);
		} catch(e) {
			this.iterationSelect.add(iterO);
		}
	},
	
	setSelectedIndex: function(theval) {
		this.iterationSelect.selectedIndex=theval;
	},
	
	setSelectOptionText: function(stepNo,tstep) {
		this.iterationSelect.options[stepNo].text=tstep;
	},
	
	clearContainers: function() {
		GeneralView.freeContainer(this.inContainer);
		GeneralView.freeContainer(this.outContainer);
		this.inContainer.innerHTML='<i>(None)</i>';
		this.outContainer.innerHTML='<i>(None)</i>';
		this.iterDiv.style.display='none';
		/*
		var iterO=this.genview.createElement('option');
		iterO.value='NONE';
		iterO.text='NONE';
		this.datatreeview.addToSelect(iterO);
		*/
	},
	
	setStep: function(baseJob,jobId,step,iteration) {
		if(iteration==undefined || (typeof iteration=='string' && iteration=='')) {
			iteration=-1;
		}
		if(typeof iteration == 'string')
			iteration=parseInt(iteration,10);
		var prevstep=this.step;
		
		if(prevstep!=step)
			this.clearSelect();
		this.step=step;
		this.istep=iteration;

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
			//var errHTML='<span style="color:red;font-weight:bold;">Processing Errors</span><br>';
			var errbranch = this.genview.createElement('div');
			errbranch.className='branch';
			
			var errSpan = this.genview.createElement('span');
			errSpan.setAttribute('style','color:red;font-weight:bold;');
			errSpan.className='branchlabel';
			errSpan.appendChild(this.genview.thedoc.createTextNode('Processing Errors'));
			errbranch.appendChild(errSpan);
			
			var branchcontainer = this.genview.createElement('div');
			branchcontainer.className='branchcontainer';
			errbranch.appendChild(branchcontainer);
			
			for(var ierr=0;ierr<step.stepError.length;ierr++) {
				var therr=step.stepError[ierr];
				//var lierr=this.genview.createElement('ul');
				// errHTML += '<u>'+therr.header+'</u><br><pre>'+therr.message+'</pre><br>';
				var theu = this.genview.createElement('u');
				theu.appendChild(this.genview.thedoc.createTextNode(therr.header));
				branchcontainer.appendChild(theu);
				branchcontainer.appendChild(this.genview.createElement('br'));
				var thepre=this.genview.createElement('pre');
				// It is a bit 'pre-processed' (sigh)
				thepre.innerHTML=therr.message;
				branchcontainer.appendChild(thepre);
				branchcontainer.appendChild(this.genview.createElement('br'));
			}
			//this.errStepDiv.innerHTML=errHTML;
			this.errStepDiv.appendChild(errbranch);
			WidgetCommon.addEventListener(errSpan,'click',EnactionView.BranchClick,false);
		}

		// For the global step
		var datatreeview=this;
		var gstep=step;
		// I'm using here absolute paths, because when this function is called from inside SVG
		// click handlers, base href is the one from the SVG, not the one from this page.
		if(prevstep!=gstep) {
			// Filling iterations
			var iterO=this.genview.createElement('option');
			iterO.value=-1;
			iterO.text=(((gstep.input[Baclava.GOT]) && (gstep.output[Baclava.GOT]))?'':'* ')+'Whole';
			this.addToSelect(iterO);
		}
		
		if(gstep.iterations) {
			// Looking this concrete iteration
			if(iteration!=-1) {
				step=gstep.iterations[iteration];
			}
			if(prevstep!=gstep) {
				// Filling iterations
				this.iterDiv.style.display='block';
				var giter=gstep.iterations;
				var giterl = giter.length;
				for(var i=0;i<giterl;i++) {
					var ministep=giter[i];
					iterO=this.genview.createElement('option');
					iterO.text=(((ministep.input[Baclava.GOT]) && (ministep.output[Baclava.GOT]))?'':'* ')+ministep.name;
					iterO.value=i;
					this.addToSelect(iterO);
				}
				this.iterNumberSpan.appendChild(this.genview.thedoc.createTextNode(giterl));
				this.iterMaxSpan.appendChild(this.genview.thedoc.createTextNode(gstep.iterMax));
				var perText=giterl*100.0/parseInt(gstep.iterMax,10)+'';
				this.iterPercentSpan.appendChild(this.genview.thedoc.createTextNode(perText.substr(0,5)));
			}
			// Showing the correct position
			this.removeSelectEventListener();
			this.setSelectedIndex(iteration+1);
			
			this.addSelectEventListener('change',function(event) {
				if(!event)  event=window.event;
				var target=(event.currentTarget)?event.currentTarget:event.srcElement;
				if(target.selectedIndex!=-1) {
					datatreeview.setStep(baseJob,jobId,gstep,target.options[target.selectedIndex].value);
				}
			});
		} else {
			this.iterDiv.style.display='none';
		}
		var inputSignaler = function(istep) {
			datatreeview.tryUpdateInputsStatus(jobId,step,istep);
		};
		var outputSignaler = function(istep) {
			datatreeview.tryUpdateOutputsStatus(jobId,step,istep);
		};
		
		// Fetching data after, not BEFORE creating the select
		step.fetchBaclava(baseJob,this.genview,inputSignaler,outputSignaler,(step!=gstep)?iteration:undefined);
		
		// For this concrete (sub)step
		// Inputs
		this.updateInputsStatus(jobId,gstep,step,iteration);

		// Outputs
		this.updateOutputsStatus(jobId,gstep,step,iteration);
	}
};
