/*
	$Id$
	workflowreport.js
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

function WorkflowReport(genview,reportDivId,handlingEnactions) {
	this.genview=genview;
	this.handlingEnactions = handlingEnactions;
	
	var reportDiv=genview.getElementById(reportDivId);
	
	// Last update date
	var b=genview.createElement('b');
	b.innerHTML='Version:&nbsp;';
	reportDiv.appendChild(b);
	this.versionContainer=genview.createElement('span');
	reportDiv.appendChild(this.versionContainer);
	reportDiv.appendChild(genview.thedoc.createTextNode(' '));
	
	var b=genview.createElement('b');
	b.innerHTML='Date:&nbsp;';
	reportDiv.appendChild(b);
	this.dateContainer=genview.createElement('span');
	reportDiv.appendChild(this.dateContainer);
	reportDiv.appendChild(genview.createElement('br'));
	
	// Title info
	var b=genview.createElement('b');
	b.innerHTML='Title:&nbsp;';
	reportDiv.appendChild(b);
	this.titleContainer=genview.createElement('span');
	reportDiv.appendChild(this.titleContainer);
	reportDiv.appendChild(genview.createElement('br'));
	
	// UUID info
	b=genview.createElement('b');
	b.innerHTML='IWWE&amp;M&nbsp;UUID:&nbsp;';
	reportDiv.appendChild(b);
	this.uuidContainer=genview.createElement('span');
	reportDiv.appendChild(this.uuidContainer);
	reportDiv.appendChild(genview.createElement('br'));
	
	// Workflow Type info
	b=genview.createElement('b');
	b.innerHTML='Workflow&nbsp;type:&nbsp;';
	reportDiv.appendChild(b);
	this.wfTypeContainer=genview.createElement('span');
	reportDiv.appendChild(this.wfTypeContainer);
	reportDiv.appendChild(genview.createElement('br'));
	
	// LSID info
	var lsidSwitch = this.lsidSwitch = genview.createElement('span');
	b=genview.createElement('b');
	b.innerHTML='Taverna&nbsp;LSID:&nbsp;';
	lsidSwitch.appendChild(b);
	this.lsidContainer=genview.createElement('span');
	lsidSwitch.appendChild(this.lsidContainer);
	lsidSwitch.setAttribute('style','display:none;');
	reportDiv.appendChild(lsidSwitch);
	
	// Author info
	var p=genview.createElement('p');
	b=genview.createElement('b');
	b.innerHTML='Author:&nbsp;';
	p.appendChild(b);
	this.authorContainer=genview.createElement('span');
	p.appendChild(this.authorContainer);
	p.appendChild(genview.createElement('br'));
	b=genview.createElement('b');
	b.innerHTML=((handlingEnactions)?'Submitter':'Uploader')+':&nbsp;';
	p.appendChild(b);
	this.uploaderContainer=genview.createElement('span');
	p.appendChild(this.uploaderContainer);
	p.appendChild(genview.createElement('br'));
	b=genview.createElement('b');
	b.innerHTML='License:&nbsp;';
	p.appendChild(b);
	this.licenseContainer=genview.createElement('span');
	p.appendChild(this.licenseContainer);
	reportDiv.appendChild(p);
	
	// Inputs
	b=genview.createElement('b');
	b.innerHTML='Inputs';
	reportDiv.appendChild(b);
	this.inContainer=genview.createElement('div');
	this.inContainer.innerHTML='&nbsp;';
	reportDiv.appendChild(this.inContainer);
	
	// Outputs
	b=genview.createElement('b');
	b.innerHTML='Outputs';
	reportDiv.appendChild(b);
	this.outContainer=genview.createElement('div');
	this.outContainer.innerHTML='&nbsp;';
	reportDiv.appendChild(this.outContainer);
	
	// Description
	b=genview.createElement('b');
	b.innerHTML='Description';
	reportDiv.appendChild(b);
	this.descContainer=genview.createElement('div');
	this.descContainer.setAttribute('style',"text-align:justify;");
	this.descContainer.innerHTML='&nbsp;';
	reportDiv.appendChild(this.descContainer);
	
	// Available snapshots
	if(!handlingEnactions) {
		b=genview.createElement('b');
		b.innerHTML='Available enaction snapshots';
		reportDiv.appendChild(b);
		this.snapContainer=genview.createElement('div');
		this.snapContainer.setAttribute('style',"text-align:justify;");
		this.snapContainer.innerHTML='&nbsp;';
		reportDiv.appendChild(this.snapContainer);
	}
}

WorkflowReport.prototype={
	clearView: function() {
		GeneralView.freeContainer(this.versionContainer);
		GeneralView.freeContainer(this.dateContainer);
		GeneralView.freeContainer(this.titleContainer);
		GeneralView.freeContainer(this.uuidContainer);
		GeneralView.freeContainer(this.lsidContainer);
		GeneralView.freeContainer(this.wfTypeContainer);
		GeneralView.freeContainer(this.authorContainer);
		GeneralView.freeContainer(this.uploaderContainer);
		GeneralView.freeContainer(this.licenseContainer);
		GeneralView.freeContainer(this.descContainer);
		if(!this.handlingEnactions)
			GeneralView.freeContainer(this.snapContainer);
		GeneralView.freeContainer(this.inContainer);
		GeneralView.freeContainer(this.outContainer);
	},
	
	updateView: function(workflow) {
		// Basic information
		GeneralView.freeContainer(this.versionContainer);
		if(workflow.version!=undefined && workflow.version!='') {
			this.versionContainer.appendChild(this.genview.thedoc.createTextNode(workflow.version));
		} else {
			var ispan=this.genview.createElement('i');
			ispan.appendChild(this.genview.thedoc.createTextNode("(unknown)"));
			this.versionContainer.appendChild(ispan);
		}
		GeneralView.freeContainer(this.dateContainer);
		this.dateContainer.appendChild(this.genview.thedoc.createTextNode(workflow.date));
		this.titleContainer.innerHTML = (workflow.title && workflow.title.length>0)?workflow.title:'<i>(no title)</i>';
		GeneralView.freeContainer(this.uuidContainer);
		this.uuidContainer.appendChild(this.genview.thedoc.createTextNode(workflow.uuid));
		GeneralView.freeContainer(this.wfTypeContainer);
		this.wfTypeContainer.appendChild(this.genview.thedoc.createTextNode(workflow.getWorkflowType()));
		GeneralView.freeContainer(this.lsidContainer);
		if(workflow.lsid && workflow.lsid.length>0) {
			this.lsidContainer.appendChild(this.genview.thedoc.createTextNode(workflow.lsid));
			this.lsidSwitch.setAttribute('style','display:default');
		} else {
			this.lsidSwitch.setAttribute('style','display:none')
		}
		this.authorContainer.innerHTML = (workflow.author && workflow.author.length>0)?GeneralView.preProcess(workflow.author):'<i>(anonymous)</i>';
		var email=workflow.responsibleMail;
		var ename=(workflow.responsibleName && workflow.responsibleName.length>0)?GeneralView.preProcess(workflow.responsibleName):((email && email.length>0)?email:'<i>(unknown)</i>');
		if(email && email.length>0) {
			ename = '<a href="mailto:'+email+'">'+ename+'</a>';
		}
		this.uploaderContainer.innerHTML = ename;
		
		if(workflow.licenseURI && workflow.licenseURI.length>0) {
			var lname=(workflow.licenseName && workflow.licenseName.length>0)?GeneralView.preProcess(workflow.licenseName):workflow.licenseURI;
			this.licenseContainer.innerHTML = '<a href="'+workflow.licenseURI+'" target="_blank">'+lname+'</a>';
		}  else {
			this.licenseContainer.innerHTML = '<i>(private)</i>';
		}

		// Naive detection of rich description
		if(workflow.description && workflow.description.length>0) {
			this.descContainer.innerHTML = GeneralView.preProcess(workflow.description);
		} else {
			this.descContainer.innerHTML = '<i>(None)</i>';
		}

		var br;
		var alink;

		// This is needed to append links to the description itself
		var thep = this.genview.createElement('p');
		alink = this.genview.createElement('a');
		alink.href = workflow.getWFPath();
		alink.target = '_blank';
		alink.innerHTML = '<i>Download Workflow</i>';
		thep.appendChild(alink);

		// Possible dependencies
		if(workflow.depends.length>0) {
			thep.appendChild(this.genview.createElement('br'));
			var thei = this.genview.createElement('i');
			thei.innerHTML = '(This workflow depends on '+workflow.depends.length+' external subworkflow'+((workflow.depends.length>1)?'s':'')+')';
			thep.appendChild(thei);
		}
		this.descContainer.appendChild(thep);

		thep = this.genview.createElement('p');
		for(var gmime in workflow.graph) {
			alink = this.genview.createElement('a');
			alink.href = workflow.getGraphPath(gmime);
			alink.target = '_blank';
			alink.innerHTML = '<i>Get Workflow Graph ('+gmime+')</i>';
			thep.appendChild(alink);
			thep.appendChild(this.genview.createElement('br'));
		}
		this.descContainer.appendChild(thep);

		// Now, inputs and outputs
		this.attachIOReport(workflow.inputs,this.inContainer);
		this.attachIOReport(workflow.outputs,this.outContainer);

		// And at last, snapshots
		if(!this.handlingEnactions) {
			this.attachIOReport(workflow.snapshots,this.snapContainer,function(snap) {
				return '<i><a href="enactionviewer.html?jobId='+snap.getQualifiedUUID()+'">'+snap.name+'</a> ('+snap.date+')</i>';
			});
		}
	},
	
	attachIOReport: function(ioarray,ioContainer, /* optional */lineProc) {
		GeneralView.freeContainer(ioContainer);
		
		var ul;
		for(var iofacet in ioarray) {
			var io=ioarray[iofacet];
			if(!ul)  ul=this.genview.createElement('ul');
			var li=this.genview.createElement('li');
			var line;
			if(typeof lineProc=='function') {
				line=lineProc(io);
			} else {
				line='<tt>'+io.name+'</tt> <i>('+io.mime.join(', ')+')</i>';
			}
			if('description' in io) {
				line += '<br>'+GeneralView.preProcess(io.description);
			}
			li.innerHTML=line;
			ul.appendChild(li);
		}
		if(ul) {
			ioContainer.appendChild(ul);
		} else {
			ioContainer.innerHTML='<i>(None)</i>';
		}
	}
};
