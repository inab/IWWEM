/*
	datamatcher.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Data matcher, the heart beating for the royal crown */
function DataMatcher(enactview,matcherURL) {
	this.patterns=new Array();
	this.hashMIME={};
	this.hashMIME['*']=new Array();
	this.addMatchers([matcherURL],enactview);
}

DataMatcher.prototype = {
	addMatchers: function(matcherURLArray,enactview) {
		if(matcherURLArray.length>0) {
			var matcherRequest = new XMLHttpRequest();
			var thismatcher=this;
			try {
				matcherRequest.onreadystatechange = function() {
					if(matcherRequest.readyState==4) {
						try {
							if('status' in matcherRequest) {
								if(matcherRequest.status==200) {
									// Beware parsing errors in Explorer
									if(matcherRequest.parseError && matcherRequest.parseError.errorCode!=0) {
										enactview.addMessage(
											'<blink><h1 style="color:red">FATAL ERROR ('+
											matcherRequest.parseError.errorCode+
											") while parsing list at ("+
											matcherRequest.parseError.line+
											","+matcherRequest.parseError.linePos+
											"):</h1></blink><pre>"+
											matcherRequest.parseError.reason+"</pre>"
										);
									} else {
										var response = matcherRequest.responseXML;
										if(!response) {
											if(matcherRequest.responseText) {
												var parser = new DOMParser();
												response = parser.parseFromString(matcherRequest.responseText,'application/xml');
											} else {
												// Backend error.
												enactview.addMessage(
													'<blink><h1 style="color:red">FATAL ERROR B: Please notify it to INB Web Workflow Manager developer</h1></blink>'
												);
											}
										}
										thismatcher.matcherParser(response);
									}
								} else {
									// Communications error.
									var statusText='';
									if(('statusText' in listRequest) && listRequest['statusText']) {
										statusText=matcherRequest.statusText;
									}
									enactview.addMessage(
										'<blink><h1 style="color:red">FATAL ERROR while fetching list: '+
										matcherRequest.status+' '+statusText+'</h1></blink>'
									);
								}
							} else {
								enactview.addMessage(
									'<blink><h1 style="color:red">FATAL ERROR F: Please notify it to INB Web Workflow Manager developer</h1></blink>'
								);
							}
						} catch(e) {
							enactview.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+
								WidgetCommon.DebugError(e)+'</pre>'
							);
						} finally {
							// Removing 'Loading...' frame
							//enactview.closeReloadFrame();
							matcherRequest.onreadystatechange=new Function();
							matcherRequest=undefined;
							
							// And calling next step
							matcherURLArray.shift();
							thismatcher.addMatchers(matcherURLArray,enactview);
						}
					}
				};
				//enactview.openReloadFrame();
				matcherRequest.open('GET',matcherURLArray[0],true);
				matcherRequest.send(null);
			} catch(e) {
				enactview.addMessage(
					'<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+
					WidgetCommon.DebugError(e)+'</pre>'
				);
			}
		}
	},
	
	matcherParser: function(matcherDOM) {
		for(var child=matcherDOM.firstChild;child;child=child.nextSibling) {
			if(child.nodeType==1 && GeneralView.getLocalName(child)=='detectionPattern') {
				var decpat=new DataMatcher.DetectionPattern(child);
				patterns.push(decpat);
				// Now, let's build the fast hash
				with(decpat) {
					if(targetMIME.length==0) {
						this.hashMIME['*'].push(decpat);
					} else {
						for(var i=0;i<targetMIME.length;i++) {
							themime=targetMIME[i];
							if(!(themime in this.hashMIME)) {
								this.hashMIME[themime]=new Array();
							}
							
							this.hashMIME[themime].push(decpat);
						}
					}
				}
				break;
			}
		}
	},
	
	getCandidateMatchers: function(mimeList) {
		var candidateMatchers = new Array();
		if(!mimeList || !mimeList instanceof Array || mimeList.length==0) {
			// Default MIME list matchers
			mimeList = [ 'text/plain', 'text/xml', 'application/xml' ];
		}
		
		for(var mimi=0; mimi<mimeList.length ; mimi++) {
			// generate content for candidate matchers
			var themime=mimeList[mimi];
			if(themime in this.hashMIME) {
				var hasiarr=this.hashMIME[themime];
				for(var hasi=0;hasi<hasiarr.length;hasi++) {
					candidateMatchers.push(hasiarr[hasi]);
				}
			}
		}
		
		return candidateMatchers;
	},
	
	getMatches: function(data,candidateMatchers) {
		var matches = new Array();
		
		for(var candi=0;candi<candidateMatchers.length;candi++) {
			// TODO, test matchers and generate objects
		}
		
		return matches;
	}
};

DataMatcher.DetectionPattern = function(patternDOM) {
	this.name=patternDOM.getAttribute('name');
	this.description=undefined;
	this.expression=undefined;
	this.targetMIME=new Array();
	this.assignMIME=new Array();
	for(var child=patternDOM.firstChild;child;child=child.nextSibling) {
		if(child.nodeType==1) {
			switch(GeneralView.getLocalName(child)) {
				case 'description':
					this.description=WidgetCommon.getTextContent(child);
					break;
				case 'applyToMIME':
					this.targetMIME.push(child.getAttribute('type'));
					break;
				case 'expression':
					this.expression = new DataMatcher.Expression(child);
					break;
				case 'extractionStep':
					this.extractionStep.push(new DataMatcher.Expression(child));
					break;
				case 'assignMIME':
					this.assignMIME.push(child.getAttribute('type'));
					break;
			}
		}
	}
};

DataMatcher.Expression = function(theDOM) {
	if(GeneralView.getLocalName(theDOM)=='extractionStep' && theDOM.hasAttribute('encoding')) {
		this.encoding = this.getAttribute('encoding');
	} else {
		this.encoding = 'raw';
	}
	
	for(var child=theDOM.firstChild;child;child=child.nextSibling) {
		if(child.nodeType==1) {
			this.exptype=GeneralView.getLocalName(child);
			switch(this.exptype) {
				case 'xpath':
					this.xpath=child.getAttribute('expression');
					this.nsMapping={};
					for(var ns=child.firstChild;ns;ns=ns.nextSibling) {
						if(ns.nodeType==1 && GeneralView.getLocalName(ns)=='nsMapping') {
							this.nsMapping[ns.getAttribute('prefix')]=ns.getAttribute('ns');
						}
					}
					break;
				case 'reExpression':
					this.RE = new RegExp(WidgetCommon.getTextContent(child));
					break;
			}
		}
	}
};
