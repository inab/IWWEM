/*
	$Id$
	datamatcher.js
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

/* Data matcher, the heart beating for the royal crown */
function DataMatcher() {
	this.hashMIME={};
	this.hashMIME['*']=new Array();
}

DataMatcher.prototype = {
	addMatchers: function(matcherURLArray,genview,callbackFunc,/*optional*/mI) {
		if(mI==undefined)  mI=0;
		if(mI<matcherURLArray.length) {
			var matcherRequest = new XMLHttpRequest();
			var thismatcher=this;
			try {
				matcherRequest.onreadystatechange = function() {
					if(matcherRequest.readyState==4) {
						try {
							var response=genview.parseRequest(matcherRequest,"parsing matchers list");
							if(response!=undefined && response!=null)
								thismatcher.matcherParser(response.documentElement.cloneNode(true));
						} catch(e) {
							genview.addMessage(
								'<blink><h1 style="color:red">FATAL ERROR: Unable to complete reload!</h1></blink><pre>'+
								WidgetCommon.DebugError(e)+'</pre>'
							);
						}
						// Removing 'Loading...' frame
						//enactview.closeReloadFrame();
						matcherRequest.onreadystatechange=function() {};
						matcherRequest=undefined;
						
						// And calling next step
						thismatcher.addMatchers(matcherURLArray,genview,callbackFunc,mI+1);
					}
				};
				//enactview.openReloadFrame();
				matcherRequest.open('GET',matcherURLArray[mI],true);
				matcherRequest.send(null);
			} catch(e) {
				genview.addMessage(
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
	
	getMatches: function(data,candidateMatchers,callbackRes,/*optional*/matches,candi) {
		if(matches==undefined) {
			matches=new Array();
			candi=0;
		}
		
		if(candi<candidateMatchers.length) {
			var candMatch=candidateMatchers[candi];
			var matcher = this;
			candMatch.match(data,function(partialMatches) {
				matches = matches.concat(partialMatches);
				candi++;
				if(candi<candidateMatchers.length) {
					matcher.getMatches(data,candidateMatchers,callbackRes,matches,candi);
				} else if(typeof callbackRes=='function') {
					try {
						callbackRes(matches);
					} catch(casi) {
						// IgnoreIT!!!(R)
					}
				}
			});
		} else if(typeof callbackRes=='function') {
			try {
				callbackRes(matches);
			} catch(casi) {
				// IgnoreIT!!!(R)
			}
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
	this.isLink=patternDOM.getAttribute('gotLinks')=='true';
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
					if(typeof farrRet == 'object') {
						farrRet = WidgetCommon.getTextContent(farrRet);
					}
					var paramArray=new Array();
					for(var extStepi=1;extStepi<this.extractionStep.length;extStepi++) {
						var extStep=this.extractionStep[extStepi];
						var arrRet=extStep.match(candres);
						if(arrRet!=undefined && arrRet.length>0) {
							arrRet=arrRet[0];
							if(typeof arrRet == 'object') {
								arrRet = WidgetCommon.getTextContent(arrRet);
							}
						} else {
							arrRet=undefined;
						}
						var pmatch=new DataObject((extStep.encoding!='raw')?arrRet:undefined,(extStep.encoding=='raw')?arrRet:undefined);
						paramArray.push(pmatch);
					}
					var datamatch = new DataObject((fextStep.encoding!='raw')?farrRet:undefined,(fextStep.encoding=='raw')?farrRet:undefined,paramArray,this.assignMIME,this.isLink);
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
					// We are only searching on those case where we are handling XML content!
					if(xmldata && GeneralView.getLocalName(xmldata.documentElement)!='parsererror') {
						matchRes=WidgetCommon.xpathEvaluate(this.xpath,xmldata,this.nsMapping);
						if(this.dontExtract && matchRes && matchRes.length>0) {
							matchRes=new Array();
							matchRes.push(xmldata);
						}
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
