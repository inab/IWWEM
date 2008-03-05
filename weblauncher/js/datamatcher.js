/*
	datamatcher.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Data matcher, the heart beating for the royal crown */
function DataMatcher() {
	this.hashMIME={};
	this.hashMIME['*']=new Array();
}

DataMatcher.prototype = {
	addMatchers: function(matcherURLArray,enactview,callbackFunc,/*optional*/mI) {
		if(mI==undefined)  mI=0;
		if(mI<matcherURLArray.length) {
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
										thismatcher.matcherParser(response.documentElement.cloneNode(true));
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
							matcherRequest.onreadystatechange=function() {};
							matcherRequest=undefined;
							
							// And calling next step
							thismatcher.addMatchers(matcherURLArray,enactview,callbackFunc,mI+1);
						}
					}
				};
				//enactview.openReloadFrame();
				matcherRequest.open('GET',matcherURLArray[mI],true);
				matcherRequest.send(null);
			} catch(e) {
				enactview.addMessage(
					'<blink><h1 style="color:red">FATAL ERROR: Unable to start reload!</h1></blink><pre>'+
					WidgetCommon.DebugError(e)+'</pre>'
				);
			}
		} else if(typeof callbackFunc=='function') {
			callbackFunc();
		}
	},
	
	matcherParser: function(matcherDOM) {
		for(var child=matcherDOM.firstChild;child;child=child.nextSibling) {
			if(child.nodeType==1 && GeneralView.getLocalName(child)=='detectionPattern') {
				var decpat=new DataMatcher.DetectionPattern(child);
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
		if(!mimeList || !(mimeList instanceof Array) || mimeList.length==0) {
			// Default MIME list matchers
			mimeList = [ 'text/plain', 'text/xml', 'application/xml' ];
		}
		
		for(var mimi=0; mimi<mimeList.length ; mimi++) {
			// generate content for candidate matchers
			var themime=mimeList[mimi];
			if(themime in this.hashMIME) {
				var hasiarr=this.hashMIME[themime];
				candidateMatchers=candidateMatchers.concat(hasiarr);
			}
		}
		
		return candidateMatchers;
	},
	
	getMatches: function(data,candidateMatchers,callbackRes,/*optional*/matches) {
		if(matches==undefined)  matches=new Array();
		
		if(candidateMatchers.length>0) {
			var candMatch=candidateMatchers.shift();
			var matcher = this;
			candMatch.match(data,function(partialMatches) {
				matches = matches.concat(partialMatches);
				matcher.getMatches(data,candidateMatchers,callbackRes,matches);
			});
		} else if(typeof callbackRes=='function') {
			callbackRes(matches);
		}
	}
};

DataMatcher.Match = function(data,pattern,numMatch) {
	this.data=data;
	this.pattern=pattern;
	this.numMatch=numMatch;
};

DataMatcher.DetectionPattern = function(patternDOM) {
	this.name=patternDOM.getAttribute('name');
	this.description=undefined;
	this.expression=undefined;
	this.targetMIME=new Array();
	this.assignMIME=new Array();
	this.extractionStep=new Array();
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
					var ext = new DataMatcher.Expression(child);
					this.extractionStep.push(ext);
					//if(ext.encoding!='raw')  this.paramBASE64=1;
					break;
				case 'assignMIME':
					this.assignMIME.push(child.getAttribute('type'));
					break;
			}
		}
	}
};

DataMatcher.DetectionPattern.prototype = {
	match: function(data,callbackRes,/*optional*/candidates) {
		if(candidates==undefined) {
			candidates = this.expression.match(data);
			
			if(candidates!=undefined && candidates.length>0 && this.expression.encoding!='raw') {
				candienc=candidates;
				candidates=new Array();
				var decpat=this;
				var candtransi=0;
				var loopDecFunc=function(decData) {
					candidates.push(decData);
					candtransi++;
					if(candtransi<candienc.length) {
						Base64.streamFromBase64ToUTF8(candienc[candtransi],loopDecFunc);
					} else {
						decpat.match(undefined,callbackRes,candidates);
					}
				};
				Base64.streamFromBase64ToUTF8(candienc[0],loopDecFunc);
				
				return;
			}
		}
		
		var results=new Array();
		if(candidates!=undefined) {
			var candi;
			var fextStep=this.extractionStep[0];
			for(var candi=0; candi<candidates.length ;candi++) {
				var candres = candidates[candi];
				var farrRet=fextStep.match(candres);
				if(farrRet!=undefined && farrRet.length>0) {
					farrRet=farrRet[0];
					var paramArray=new Array();
					for(var extStepi=1;extStepi<this.extractionStep.length;extStepi++) {
						var extStep=this.extractionStep[extStepi];
						var arrRet=extStep.match(candres);
						arrRet = (arrRet!=undefined && arrRet.length>0)?arrRet[0]:undefined;
						var pmatch=new DataObject((extStep.encoding!='raw')?arrRet:undefined,(extStep.encoding=='raw')?arrRet:undefined);
						paramArray.push(pmatch);
					}
					var datamatch = new DataObject((fextStep.encoding!='raw')?farrRet:undefined,(fextStep.encoding=='raw')?farrRet:undefined,paramArray,this.assignMIME);
					var match=new DataMatcher.Match(datamatch,this.name,candi);
					results.push(match);
				}
			}
		}

		if(typeof callbackRes == 'function') {
			callbackRes(results);
		}
	}
};

DataMatcher.Expression = function(theDOM) {
	this.encoding=theDOM.getAttribute('encoding');
	if(!this.encoding) {
		this.encoding='raw';
	}
	
	var dontExtract = theDOM.getAttribute('dontExtract');
	if(dontExtract!=undefined && dontExtract!=null && dontExtract!='') {
		this.dontExtract = dontExtract=='true';
	} else {
		this.dontExtract = false;
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
					var pa=WidgetCommon.getTextContent(child);
					this.RE = (pa==undefined || pa==null || pa=='')?'':new RegExp(pa,'g');
					break;
			}
		}
	}
};

DataMatcher.Expression.prototype = {
	match: function(data) {
		var matchRes=undefined;
		if(data!=undefined) {
			if(this.RE!=undefined) {
				var redata;
				if(typeof data == 'string') {
					redata=data;
				} else {
					redata=WidgetCommon.getTextContent(data);
				}
				if(this.RE instanceof RegExp) {
					matchRes = redata.match(this.RE);
					if(this.dontExtract && matchRes && matchRes.length>0) {
						matchRes=new Array();
						matchRes.push(redata);
					}
				} else {
					matchRes=new Array();
					matchRes.push(redata);
				}
			} else {
				try {
					var xmldata;
					if(typeof data == 'string') {
						var parser = new DOMParser();
						xmldata = parser.parseFromString(data,'application/xml');
					} else {
						xmldata=data;
					}
					matchRes=WidgetCommon.xpathEvaluate(this.xpath,xmldata,this.nsMapping);
					if(this.dontExtract && matchRes && matchRes.length>0) {
						matchRes=new Array();
						matchRes.push(xmldata);
					}
				} catch(e) {
					//IgnoreIT(R)
				}
			}
		}
		if(matchRes==undefined)  matchRes=new Array();

		return matchRes;
	}
};
