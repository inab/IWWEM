/*
	$Id$
	enactionstep.js
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

function EnactionStep(stepDOM, /* optional */ parentStep) {
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
	
	
	if(GeneralView.getLocalName(stepDOM)=='dataBundle') {
		this.name=stepDOM.getAttribute('uuid');
		this.isExample=1;
	} else {
		this.name=stepDOM.getAttribute('name') || stepDOM.getAttribute('jobId');
		this.state=stepDOM.getAttribute('state');
		this.isExample=undefined;
	}
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
							iterations.push(new EnactionStep(iter,this));
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

EnactionStep.getJobDir = function(jobId) {
	if(jobId) {
		jobId=jobId.toString();
		if(jobId.indexOf('snapshot:')==0) {
			jobId=jobId.substring(jobId.lastIndexOf(':')+1);
		} else if(jobId.indexOf('example:')==0) {
			jobId=jobId.substring(jobId.indexOf(':')+1,jobId.lastIndexOf(':'))+'/examples/'+jobId.substring(jobId.lastIndexOf(':')+1)+'.xml';
		}
	}
	
	return jobId;
};

EnactionStep.prototype = {
	fetchBaclavaObject: function(theurl,thehash,genview,/* optional */ thenotify, istep) {
		var request;
		try {
			request=new XMLHttpRequest();
			var onload = function() {
				var response=genview.parseRequest(request,"parsing examples list");
				if(response!=undefined) {
					// Only parse when an answer is available
					Baclava.Parser(response.documentElement.cloneNode(true),thehash,genview);
				}
				try {
					if(thenotify)  thenotify(istep);
				} catch(noti) {
					alert(WidgetCommon.DebugError(noti));
					// IgnoreIT(R)
				}
			};
			request.onreadystatechange=function() {
				//genview.addMessage(request.readyState + '<br>');
				if(request.readyState==4) {
					try {
						var response = genview.parseRequest(request,"parsing enaction step");
						
						// Only parse when an answer is available
						if(response!=undefined) {
							Baclava.Parser(response.documentElement.cloneNode(true),thehash,genview);
						}
						try {
							if(thenotify)  thenotify(istep);
						} catch(noti) {
							alert(WidgetCommon.DebugError(noti));
							// IgnoreIT(R)
						}
					} catch(e) {
						genview.addMessage(
							'<blink><h1 style="color:red">FATAL ERROR: Unable to complete '+
							theurl+
							' reload!</h1></blink><pre>'+
							WidgetCommon.DebugError(e)+
							'</pre>'
						);
					}
					request.onreadystatechange=function() {};
				}
			};
			
			// Now it is time to send the query
			request.open('GET',theurl,true);
			request.send(null);
		} catch(e) {
			genview.addMessage(
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
	
	fetchBaclava: function(baseJob,genview,gotInputHandler,gotOutputHandler,/* optional */ istep) {
		var relpath=this.getRelPath(baseJob);
		// Determining whether is an example or a true job step
		if(this.isExample) {
			if(this.hasInputs && !(this.input[Baclava.GOT]) && !this.bacInput) {
				this.bacInput=this.fetchBaclavaObject(relpath,this.input,genview,gotInputHandler,istep);
			}
		} else {
			if(this.hasInputs && !(this.input[Baclava.GOT]) && !this.bacInput) {
				this.bacInput=this.fetchBaclavaObject(relpath+'/Inputs.xml',this.input,genview,gotInputHandler,istep);
			}

			if(this.hasOutputs && !(this.output[Baclava.GOT]) && !this.bacOutput) {
				this.bacOutput=this.fetchBaclavaObject(relpath+'/Outputs.xml',this.output,genview,gotOutputHandler,istep);
			}

			// Now, the iterations, but not always!
			var iti = this.iterations;
			if(iti!=undefined && iti.length <=10) {
				var itil = iti.length;
				for(var i=0; i<itil ; i++) {
					iti[i].fetchBaclava(baseJob,genview,gotInputHandler,gotOutputHandler,i);
				}
			}
		}
	},
	
	getRelPath: function(baseJob) {
		if(this.parentStep!=undefined)
			baseJob=this.parentStep.getRelPath(baseJob)+'/Iterations';
		return baseJob+'/'+EnactionStep.getJobDir(this.name);
	}
};
