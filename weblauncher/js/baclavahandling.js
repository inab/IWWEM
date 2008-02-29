/*
	baclavahandling.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function DataObject(base64Input,nativeInput,/* optional */ params,mimeList) {
	if(!base64Input)  base64Input=undefined;
	if(!nativeInput)  nativeInput=undefined;
	
	this.data=[base64Input,nativeInput];
	this.dataMatches=undefined;
	this.matcherStatus=undefined;
	this.matcher=undefined;
	this.candidateMatches=undefined;
	this.params=params;
	this.mimeList=mimeList;
}

DataObject.prototype = {
	hasData: function() {
		return this.data[0] || this.data[1];
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
	
	doMatching: function() {
		// Run this only once
		if(this.matcherStatus=='maybe') {
			// Applying
			this.dataMatches = this.matcher.getMatches(this.data[1],this.candidateMatchers);
			
			this.matcherStatus=dataMatches.length!=0;
			this.matcher=undefined;
			this.candidateMatchers=undefined;
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
	if(baclavaXML && baclavaXML.documentElement && GeneralView.getLocalName(baclavaXML.documentElement)=='dataThingMap') {
		for(var dataThing = baclavaXML.documentElement.firstChild; dataThing; dataThing=dataThing.nextSibling) {
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
