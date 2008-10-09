/*
	$Id$
	baclavahandling.js
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

function DataObject(base64Input,nativeInput,/* optional */ params,mimeList,isLink) {
	if(base64Input=='' && nativeInput==undefined) {
		nativeInput='';
	} else if(base64Input==undefined && nativeInput=='') {
		base64Input='';
	}
	
	this.data=[base64Input,nativeInput];
	this.dataMatches=undefined;
	this.matcherStatus=undefined;
	this.matcher=undefined;
	this.candidateMatches=undefined;
	this.params=params;
	this.mimeList=mimeList;
	this.isLink=isLink;
}

DataObject.prototype = {
	hasData: function() {
		return (this.data[0]!=undefined) || (this.data[1]!=undefined);
	},
	
	genCallParams: function(mime) {
		var retval = [mime];
		if(this.params instanceof Array) {
			var parmax=this.params.length;
			for(var pari=0;pari<parmax;pari++) {
				retval.push(this.params[pari]);
			}
		}
		
		return retval;
	},
	
	canBeMatched: function(matcher,mimeList) {
		if(this.matcherStatus==undefined) {
			var candidateMatchers=matcher.getCandidateMatchers(mimeList);
			
			if(candidateMatchers.length>0) {
				this.matcherStatus='maybe';
				this.matcher=matcher;
				this.candidateMatchers=candidateMatchers;
			} else {
				this.matcherStatus=false;
			}
		}
		
		return this.matcherStatus;
	},
	
	doMatching: function(callbackRes) {
		var dao=this;
		if(this.data[1]==undefined) {
			Base64.streamFromBase64ToUTF8(this.data[0],function(decData) {
				dao.data[1]=decData;
				dao.doMatching(callbackRes);
			});
			return;
		}

		// Run this only once
		if(this.matcherStatus=='maybe') {
			this.matcher.getMatches(this.data[1],this.candidateMatchers,function(dataMatches) {
				// Applying
				dao.dataMatches=dataMatches;
				
				dao.matcherStatus=dataMatches.length!=0;
				dao.matcher=undefined;
				dao.candidateMatchers=undefined;
				if(typeof callbackRes=='function') {
					callbackRes(dataMatches);
				}
			});
		} else if(typeof callbackRes=='function') {
			callbackRes(this.dataMatches);
		}
	}
};

function Baclava(dataThing) {
	this.name=dataThing.getAttribute('key');
	for(var child=dataThing.firstChild;child;child=child.nextSibling) {
		if(child.nodeType==1 && GeneralView.getLocalName(child)=='myGridDataDocument') {
			this.syntacticType=child.getAttribute('syntactictype');
			for(var myData=child.firstChild;myData;myData=myData.nextSibling) {
				if(myData.nodeType==1) {
					switch(GeneralView.getLocalName(myData)) {
						case 'metadata':
							this.setMetadata(myData);
							break;
						case 'partialOrder':
						case 'dataElement':
							this.data=Baclava.Data(myData);
							break;
					}
				}
			}
			break;
		}
	}
}

Baclava.BACLAVA_NS='http://org.embl.ebi.escience/baclava/0.1alpha';
Baclava.GOT='----GOT----';

Baclava.prototype = {
	// Stores the assigned metadata
	setMetadata: function(metadata) {
		var mime=new Array();
		var mimeNodes = GeneralView.getElementsByTagNameNS(metadata,GeneralView.XSCUFL_NS,'mimeType');
		if(mimeNodes.length>0) {
			for(var i=0;i<mimeNodes.length;i++) {
				var mim=mimeNodes.item(i);
				mime.push(WidgetCommon.getTextContent(mim));
			}
		} else {
			mime.push('text/plain');
		}
		this.mime=mime;
	}
};

/* A Baclava XML parser */
Baclava.Parser = function(baclavaXML,thehash,themessagediv) {
	if(baclavaXML && GeneralView.getLocalName(baclavaXML)=='dataThingMap') {
		for(var dataThing = baclavaXML.firstChild; dataThing; dataThing=dataThing.nextSibling) {
			if(dataThing.nodeType==1 && GeneralView.getLocalName(dataThing)=='dataThing') {
				var bacla=new Baclava(dataThing);
				thehash[bacla.name]=bacla;
			}
		}
	}
	// We should notify here in some way, like this one
	thehash[Baclava.GOT]=1;
};

Baclava.Data = function(partial) {
	var data=undefined;
	switch(GeneralView.getLocalName(partial)) {
		case 'partialOrder':
			var processRelations=undefined;
			switch(partial.getAttribute('type')) {
				case 'list':
					data={};
				case 'set':
					processRelations=1;
					break;
			}
			for(var list=partial.firstChild; list; list=list.nextSibling) {
				if(list.nodeType==1) {
					switch(GeneralView.getLocalName(list)) {
						case 'relationList':
							if(processRelations) {
								// Even Taverna core does nothing at this step!!!
							}
							break;
						case 'itemList':
							for(var item=list.firstChild;item;item=item.nextSibling) {
								if(item.nodeType==1) {
									var idx = item.getAttribute('index');
									data[idx] = Baclava.Data(item);
								}
							}
							break;
					}
				}
			}
			break;
		case 'dataElement':
			var ndata = GeneralView.getElementsByTagNameNS(partial,Baclava.BACLAVA_NS,'dataElementData');
			if(ndata && ndata.length>0) {
				//data=Base64.decode(WidgetCommon.getTextContent(ndata.item(0)));
				data=new DataObject(WidgetCommon.getTextContent(ndata.item(0)));
			}
			break;
	}
	
	return data;
};
