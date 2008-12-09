/*
	$Id$
	workflowdesc.js
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

/*
	These classes model the retrieved information about available workflows.
*/
function IODesc(ioD) {
	this.name=ioD.getAttribute('name');
	this.mime=new Array();
	for(var child=ioD.firstChild; child ; child=child.nextSibling) {
		if(child.nodeType==1) {
			switch(GeneralView.getLocalName(child)) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					this.description = WidgetCommon.getTextContent(child);
					break;
				case 'mime':
					this.mime.push(child.getAttribute('type'));
					break;
			}
		}
	}
	
}

function InputExample(workflow,inEx) {
	this.workflow=workflow;
	this.name=inEx.getAttribute('name');
	this.uuid=inEx.getAttribute('uuid');
	this.date=inEx.getAttribute('date');
	this.path=inEx.getAttribute('path');
	this.isAbsolute=path.indexOf('ftp:')==0 || path.indexOf('http:')==0 || path.indexOf('https:')==0;
	this.responsibleMail = inEx.getAttribute('responsibleMail');
	this.responsibleName = inEx.getAttribute('responsibleName');
	this.description = WidgetCommon.getTextContent(inEx);
}

InputExample.prototype = {
	getQualifiedUUID: function() {
		return 'example:'+this.workflow.uuid+':'+this.uuid;
	},
	
	getExamplePath: function() {
		return this.isAbsolute?this.path:(this.workflow.WFBase+'/'+this.path);
	},
	
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var exSelOpt = thedoc.createElement('option');
		exSelOpt.value = this.getQualifiedUUID();
		//exSelOpt.text = this.name+' ('+this.date+')';
		exSelOpt.text = this.name;
		
		return exSelOpt;
	}
};

function OutputSnapshot(workflow,ouSn) {
	this.workflow=workflow;
	this.name=ouSn.getAttribute('name');
	this.uuid=ouSn.getAttribute('uuid');
	this.date=ouSn.getAttribute('date');
	this.responsibleMail = ouSn.getAttribute('responsibleMail');
	this.responsibleName = ouSn.getAttribute('responsibleName');
	this.description = WidgetCommon.getTextContent(ouSn);
}

OutputSnapshot.prototype = {
	getQualifiedUUID: function() {
		return 'snapshot:'+this.workflow+':'+this.uuid;
	},
	
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var snSelOpt = thedoc.createElement('option');
		snSelOpt.value = this.getQualifiedUUID();
		snSelOpt.text = this.name+' ('+this.date+')';
		
		return snSelOpt;
	}
};

function WorkflowDesc(wfD,WFBase) {
	this.WFBase=WFBase;
	this.uuid = wfD.getAttribute('uuid');
	this.path = wfD.getAttribute('path');
	this.isAbsolute=path.indexOf('ftp:')==0 || path.indexOf('http:')==0 || path.indexOf('https:')==0;
	//this.svgpath = wfD.getAttribute('svg');
	this.title = wfD.getAttribute('title');
	this.lsid = wfD.getAttribute('lsid');
	this.author = wfD.getAttribute('author');
	this.date = wfD.getAttribute('date');
	this.responsibleMail = wfD.getAttribute('responsibleMail');
	this.responsibleName = wfD.getAttribute('responsibleName');
	this.licenseName = wfD.getAttribute('licenseName');
	this.licenseURI = wfD.getAttribute('licenseURI');
	this.graph = {};
	
	var depends=new Array();
	var inputs={};
	var outputs={};
	var examples={};
	var snapshots={};
	this.depends=depends;
	this.inputs=inputs;
	this.outputs=outputs;
	this.examples=examples;
	this.snapshots=snapshots;
	
	this.description=undefined;
	this.hasInputs=undefined;
	this.hasExamples=undefined;
	
	for(var child=wfD.firstChild;child;child=child.nextSibling) {
		// Only element children, please!
		if(child.nodeType == 1) {
			switch(GeneralView.getLocalName(child)) {
				case 'description':
					// This is needed because there are some
					// differences among the standars
					// and Internet Explorer behavior
					this.description = WidgetCommon.getTextContent(child);
					break;
				case 'graph':
					// Graph information
					var gpath=WidgetCommon.getTextContent(child);
					if(gpath.indexOf('ftp:')==0 || gpath.indexOf('http:')==0 || gpath.indexOf('https:')==0) {
						this.graph[child.getAttribute('mime')]=gpath;
					} else {
						this.graph[child.getAttribute('mime')]=this.WFBase+'/'+gpath;
					}
					break;
				case 'dependsOn':
					depends.push(child.getAttribute('sub'));
					break;
				case 'example':
					var newExample = new InputExample(this,child);
					examples[newExample.uuid]=newExample;
					this.hasExamples=1;
					break;
				case 'snapshot':
					var newSnapshot = new OutputSnapshot(this,child);
					snapshots[newSnapshot.uuid]=newSnapshot;
					break;
				case 'input':
					var newInput = new IODesc(child);
					inputs[newInput.name]=newInput;
					this.hasInputs=1;
					break;
				case 'output':
					var newOutput = new IODesc(child);
					outputs[newOutput.name]=newOutput;
					break;
			}
		}
	}
	
	// Now, handling SVG special case
	var svgpath = ('image/svg+xml' in this.graph)?this.graph['image/svg+xml']:wfD.getAttribute('svg');
	if(svgpath.indexOf('ftp:')==0 || svgpath.indexOf('http:')==0 || svgpath.indexOf('https:')==0) {
		this.svgpath=svgpath;
	} else {
		this.svgpath=this.WFBase+'/'+svgpath;
	}
}

WorkflowDesc.prototype = {
//	generateOption: function (/* optional */ genview) {
//		if(!genview)  genview=document;
//		var wfO = genview.createElement('option');
//		wfO.value = wfO.id = this.uuid;
//		wfO.text = this.title+' ['+this.lsid+']';
//		
//		return wfO;
//	}
	generateOption: function (/* optional */ genview) {
		if(!genview)  genview=document;
		return  new GeneralView.Option(genview,this.uuid,this.title+' ['+this.lsid+']');
		// wfO.id = this.uuid;
		
		return wfO;
	},
	
	/**
		Get the SVG path, prepended by the WFBase path
	*/
	getSVGPath: function() {
		return this.svgpath;
	},
	
	/**
		Get the native workflow definition path, prepended by the WFBase path
	*/
	getWFPath: function() {
		return this.isAbsolute?this.path:(this.WFBase+'/'+this.path);
	},
	
	/**
		Get the path of a graphical representation of the workflow, prepended by the WFBase path
		based on its MIME Type
	*/
	getGraphPath: function(mime) {
		return this.graph[mime];
	},
	
	getExample: function (uuid) {
		var retval=undefined;
		if(typeof uuid == 'string') {
			if(uuid.indexOf('example:')==0) {
				var stop=uuid.lastIndexOf(':');
				var wfUUID=uuid.substring(uuid.indexOf(':')+1,stop);
				if(wfUUID!=this.uuid) {
					uuid=undefined;
				} else {
					uuid=uuid.substr(stop+1);
				}
			}
			if(uuid!=undefined) {
				retval=this.examples[uuid];
			}
		}
		return retval;
	}
};

