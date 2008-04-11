/*
	$Id: workflowmanager.js 1277 2008-04-08 21:14:22Z jmfernandez $
	workflowreport.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

function WorkflowReport(genview,reportDivId) {
	this.genview=genview;
	
	var reportDiv=genview.getElementById(reportDivId);
	
	// Last update date
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
	
	// LSID info
	b=genview.createElement('b');
	b.innerHTML='Taverna&nbsp;LSID:&nbsp;';
	reportDiv.appendChild(b);
	this.lsidContainer=genview.createElement('span');
	reportDiv.appendChild(this.lsidContainer);
	
	// Author info
	var p=genview.createElement('p');
	b=genview.createElement('b');
	b.innerHTML='Author:&nbsp;';
	p.appendChild(b);
	this.authorContainer=genview.createElement('span');
	p.appendChild(this.authorContainer);
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
	b=genview.createElement('b');
	b.innerHTML='Available enaction snapshots';
	reportDiv.appendChild(b);
	this.snapContainer=genview.createElement('div');
	this.snapContainer.setAttribute('style',"text-align:justify;");
	this.snapContainer.innerHTML='&nbsp;';
	reportDiv.appendChild(this.snapContainer);
}

WorkflowReport.prototype={
	clearView: function() {
		GeneralView.freeContainer(this.dateContainer);
		GeneralView.freeContainer(this.titleContainer);
		GeneralView.freeContainer(this.uuidContainer);
		GeneralView.freeContainer(this.lsidContainer);
		GeneralView.freeContainer(this.authorContainer);
		GeneralView.freeContainer(this.descContainer);
		GeneralView.freeContainer(this.snapContainer);
		GeneralView.freeContainer(this.inContainer);
		GeneralView.freeContainer(this.outContainer);
	},
	
	updateView: function(WFBase,workflow) {
		// Basic information
		this.dateContainer.innerHTML = workflow.date;
		this.titleContainer.innerHTML = (workflow.title && workflow.title.length>0)?workflow.title:'<i>(no title)</i>';
		this.uuidContainer.innerHTML = workflow.uuid;
		this.lsidContainer.innerHTML = workflow.lsid;
		this.authorContainer.innerHTML = (workflow.author && workflow.author.length>0)?GeneralView.preProcess(workflow.author):'<i>(anonymous)</i>';

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
		alink.href = WFBase+'/'+workflow.path;
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
			alink.href = WFBase+'/'+workflow.graph[gmime];
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
		this.attachIOReport(workflow.snapshots,this.snapContainer,function(snap) {
			return '<i><a href="enactionviewer.html?jobId='+snap.getQualifiedUUID()+'">'+snap.name+'</a> ('+snap.date+')</i>';
		});
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
				line='<i>'+io.name+' ('+io.mime.join(', ')+')</i>';
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