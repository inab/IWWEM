/*
	$Id: enactionviewer.js 1266 2008-04-07 13:21:47Z jmfernandez $
	enactionstep.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function EnactionStep(stepDOM, /* optional */ parentStep) {
	this.name=stepDOM.getAttribute('name') || stepDOM.getAttribute('jobId');
	this.state=stepDOM.getAttribute('state');
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

EnactionStep.prototype = {
	fetchBaclavaObject: function(theurl,thehash,enactview,/* optional */ thenotify, istep) {
		var request;
		try {
			request=new XMLHttpRequest();
			var onload = function() {
				var response = request.responseXML;
				if(!response) {
					if(request.responseText) {
						var parser = new DOMParser();
						response = parser.parseFromString(request.responseText,'application/xml');
					} else {
						// Backend error.
						enactview.addMessage(
							'<blink><h1 style="color:red">FATAL ERROR B: (with '+
							theurl+
							') Please notify it to INB Web Workflow Manager developer</h1></blink>'
						);
					}
				}
				// Only parse when an answer is available
				Baclava.Parser(response.documentElement.cloneNode(true),thehash,enactview);
				try {
					if(thenotify)  thenotify(istep);
				} catch(noti) {
					alert(WidgetCommon.DebugError(noti));
					// IgnoreIT(R)
				}
			};
			request.onreadystatechange=function() {
				//enactview.addMessage(request.readyState + '<br>');
				if(request.readyState==4) {
					try {
						if('status' in request) {
							if(request.status == 200 || request.status == 304) {
								if(request.parseError && request.parseError.errorCode!=0) {
									enactview.addMessage('<blink><h1 style="color:red">FATAL ERROR ('+
										request.parseError.errorCode+
										") while parsing list at ("+
										request.parseError.line+
										","+request.parseError.linePos+
										"):</h1></blink><pre>"+request.parseError.reason+"</pre>"
									);
								} else {
									var response = request.responseXML;
									if(!response) {
										if(request.responseText) {
											var parser = new DOMParser();
											response = parser.parseFromString(request.responseText,'application/xml');
										} else {
											// Backend error.
											enactview.addMessage(
												'<blink><h1 style="color:red">FATAL ERROR B: (with '+
												theurl+
												') Please notify it to INB Web Workflow Manager developer</h1></blink>'
											);
										}
									}
									// Only parse when an answer is available
									Baclava.Parser(response.documentElement.cloneNode(true),thehash,enactview);
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
								enactview.addMessage(
									'<blink><h1 style="color:red">FATAL ERROR while fetching '+
									theurl+
									': '+
									request.status+
									' '+
									statusText+
									'</h1></blink>'
								);
							}
						} else {
							enactview.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR F: (with '+
								theurl+
								') Please notify it to INB Web Workflow Manager developer</h1></blink>'
							);
						}
					} catch(e) {
						enactview.addMessage(
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
			enactview.addMessage(
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
	
	fetchBaclava: function(baseJob,enactview,gotInputHandler,gotOutputHandler,/* optional */ istep) {
		var relpath=baseJob+'/'+EnactionView.getJobDir(this.name)+'/';
		
		// Determining whether 
		if(this.hasInputs && !(this.input[Baclava.GOT]) && !this.bacInput) {
			this.bacInput=this.fetchBaclavaObject(relpath+'Inputs.xml',this.input,enactview,gotInputHandler,istep);
		}
		
		if(this.hasOutputs && !(this.output[Baclava.GOT]) && !this.bacOutput) {
			this.bacOutput=this.fetchBaclavaObject(relpath+'Outputs.xml',this.output,enactview,gotOutputHandler,istep);
		}
		
		// Now, the iterations
		if(this.iterations) {
			var iti = this.iterations;
			var itil = iti.length;
			for(var i=0; i<itil ; i++) {
				iti[i].fetchBaclava(relpath+'Iterations',enactview,gotInputHandler,gotOutputHandler,i);
			}
		}
	}
};
