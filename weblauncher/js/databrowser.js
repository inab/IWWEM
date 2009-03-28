/*
	$Id$
	databrowser.js
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

/* Data viewer, the must-be royal crown */
function DataBrowser(genview,databrowserId,mimePathDivId,/*optional*/preprocessId) {
	this.genview=genview;
	this.preprocessId=preprocessId;
	
	this.databrowserDiv=genview.getElementById(databrowserId);
	
	var mimePathDiv=genview.getElementById(mimePathDivId);
	
	// mime and others form creation
	var theform=genview.createElement('form');
	theform.style.padding='0px';
	theform.style.margin='0px';
	theform.acceptEncoding='UTF-8';
	//theform.setAttribute('style','padding:0px;margin:0px;');
	
	// IOStep Span
	var uPan=genview.createElement('u');
	uPan.innerHTML='Step:&nbsp;';
	theform.appendChild(uPan);
	this.IOStepSpan=genview.createElement('span');
	theform.appendChild(this.IOStepSpan);
	
	theform.appendChild(genview.createElement('br'));
	
	// IOPath Span
	uPan=genview.createElement('u');
	uPan.innerHTML='Path:';
	theform.appendChild(uPan);
	theform.appendChild(genview.thedoc.createTextNode(' '));
	this.IOPathSpan=genview.createElement('span');
	theform.appendChild(this.IOPathSpan);
	
	theform.appendChild(genview.createElement('br'));
	
	// Text
	uPan=genview.createElement('u');
	uPan.innerHTML='MIME';
	theform.appendChild(uPan);

	theform.appendChild(genview.thedoc.createTextNode(' '));
	
	// MIME Select
	var mimeSelect = this.mimeSelect = genview.createElement('select');
	theform.appendChild(mimeSelect);
	
	// More text
	uPan=genview.createElement('u');
	uPan.innerHTML='Viewer';
	theform.appendChild(uPan);
	// View Select
	var viewSelect = this.viewSelect = genview.createElement('select');
	theform.appendChild(viewSelect);
	
	// Appending the form to the parent
	mimePathDiv.appendChild(theform);
	
	// Other information
	this.dataObject=undefined;
	this.mimeList=undefined;
	this.setCallback=undefined;
	this.setViewCallback=undefined;
	this.frameId=undefined;
	
	var databrowser=this;
	// Changed due Internet Explorer
	this.mimeChangeFunc=function(event) {
		if(mimeSelect.selectedIndex!=-1) {
			databrowser.applyView(mimeSelect.options[mimeSelect.selectedIndex].value);
		}
	};
	
	this.viewChangeFunc=function(event) {
		if(mimeSelect.selectedIndex!=-1 && viewSelect.selectedIndex!=-1) {
			databrowser.applyView(mimeSelect.options[mimeSelect.selectedIndex].value,viewSelect.options[viewSelect.selectedIndex].value);
		}
	};
	
	// Last, viewers initialization
	DataBrowser.immediateInit=1;
	/*
	for(var i=0;i<DataBrowser.Viewers.length;i++) {
		viewerProto=DataBrowser.Viewers[i];
		if(typeof viewerProto.init == 'function') {
			try {
				viewerProto.init();
			} catch(ie) {
				// IgnoreIT(R)
			}
		}
	}
	*/
}

// List of available MIME Viewers
DataBrowser.Viewers = [];

// Do immediate init?
// DataBrowser.immediateInit=undefined;
DataBrowser.immediateInit=1;

// The way to register a MIME Viewer
DataBrowser.addViewer = function (viewerProto) {
	var accMime=viewerProto.acceptedMIME;
	var accMimeLength=accMime.length;
	
	for(var mimeId=0;mimeId<accMimeLength;mimeId++) {
		var mime=accMime[mimeId];
		
		if(mime) {
			var viewlist = undefined;
			if(mime in DataBrowser.Viewers) {
				viewlist=DataBrowser.Viewers[mime];
			} else {
				DataBrowser.Viewers[mime]=viewlist=[];
			}
			
			viewlist.push(viewerProto);
		}
	}
	
	// Last, init (if needed)
	if(DataBrowser.immediateInit && typeof viewerProto.init == 'function') {
		try {
			viewerProto.init();
		} catch(ie) {
			// IgnoreIT(R)
		}
	}
};

DataBrowser.LocatedData = function(jobId,stepName,iteration,IOMode,/*optional*/IOPath) {
	this.jobId=jobId;
	this.stepName=stepName;
	if(iteration!=undefined) {
		iteration=parseInt(iteration,10);
	}
	this.iteration=(iteration==-1)?undefined:iteration;
	this.IOMode=IOMode;
	this.IOPath=IOPath;
	this.dataObject=undefined;
	this.prevSelMime=undefined;
	this.viewers=undefined;
};

DataBrowser.LocatedData.prototype = {
	newChild: function(newIOPathStep,/* optional */ isVirtual) {
		var stepPiece=newIOPathStep.toString();
		stepPiece=stepPiece.replace(/&/g,'&amp;');
		stepPiece=stepPiece.replace(/#/g,'&#35;');
		stepPiece=stepPiece.replace(/\//g,'&#47;');
		if(isVirtual)
			stepPiece = '#'+stepPiece;
		return new DataBrowser.LocatedData(this.jobId,this.stepName,this.iteration,this.IOMode,(this.IOPath!=undefined)?(this.IOPath+'/'+stepPiece):stepPiece);
	},
	
	setDataObject: function(dataObject) {
		this.dataObject = dataObject;
	},

	genDownloadURL: function(mime,/* optional */ withName) {
		var qsParm={
			jobId: Base64._utf8_encode(this.jobId),
			step: Base64._utf8_encode(this.stepName),
			IOMode: Base64._utf8_encode(this.IOMode),
			IOPath: Base64._utf8_encode(this.IOPath),
			asMime: Base64._utf8_encode(mime)
		};
		if(this.iteration!=undefined)
			qsParm['iteration']=Base64._utf8_encode(this.iteration);
		if(withName!=undefined)
			qsParm['withName']=Base64._utf8_encode(withName);
		
		return WidgetCommon.generateQS(qsParm,IWWEM.ProxyBase);
	}
};

DataBrowser.prototype={
	openProcessFrame: function () {
		if(this.preprocessId!=undefined)
			this.frameId=this.genview.openFrame(this.preprocessId,1);
	},
	
	closeProcessFrame: function() {
		if(this.frameId!=undefined)
			this.genview.closeFrame(this.frameId);
	},
	
	clearView: function () {
		if(this.setCallback) {
			WidgetCommon.removeEventListener(this.mimeSelect,'change',this.mimeChangeFunc,false);
			this.setCallback=undefined;
		}
		if(this.setViewCallback) {
			WidgetCommon.removeEventListener(this.viewSelect,'change',this.viewChangeFunc,false);
			this.setViewCallback=undefined;
		}
		this.prevSelMime=undefined;
		this.locObject=undefined;
		this.dataObject=undefined;
		this.mimeList=undefined;
		this.viewers=undefined;
		GeneralView.freeContainer(this.databrowserDiv);
		GeneralView.freeContainer(this.IOStepSpan);
		GeneralView.freeContainer(this.IOPathSpan);
		GeneralView.freeSelect(this.mimeSelect);
		GeneralView.freeSelect(this.viewSelect);
	},
	
	show: function(locObject,mimeList) {
		this.clearView();
		
		// First, fill in mime type
		if(mimeList instanceof Array) {
			if(mimeList.length==0) {
				mimeList.push('text/plain');
			}
			this.mimeList=mimeList;
			
			// Filling data origins
			var inode=this.genview.createElement('tt');
			//inode.style.fontStyle='italic';
			inode.appendChild(this.genview.thedoc.createTextNode('('+((locObject.IOMode=='I')?'Input':'Output')+')'));
			this.IOStepSpan.appendChild(inode);
			this.IOStepSpan.appendChild(this.genview.thedoc.createTextNode(locObject.stepName+((locObject.iteration!=undefined)?('['+locObject.iteration+']'):'')));
			
			// this.IOStepSpan.innerHTML=locObject.stepName+((locObject.iteration!=undefined)?('['+locObject.iteration+']'):'')+'<i>('+(((locObject.IOMode=='I')?'Input':'Output')+')</i>');
			
			// this.IOPathSpan.innerHTML='<a href="'+locObject.genDownloadURL()+'" target="_blank">'+locObject.IOPath+'</a>';

			// Filling MIME type selector
			for(var i=0;i<mimeList.length;i++) {
				var iterM=this.genview.createElement('option');
				iterM.text=iterM.value=mimeList[i];
				try {
					this.mimeSelect.add(iterM,null);
				} catch(e) {
					this.mimeSelect.add(iterM);
				}
			}
			
			this.locObject=locObject;
			this.dataObject=locObject.dataObject;
			this.setCallback=undefined;
			this.setViewCallback=undefined;
			// base64 processing is delayed to the last momment
			this.applyView();
		} else {
			// Default case, no view
			var iterM=this.genview.createElement('option');
			iterM.text=iterM.value='NO ONE';
			try {
				this.mimeSelect.add(iterM,null);
			} catch(e) {
				this.mimeSelect.add(iterM);
			}
			this.mimeList=undefined;
			this.locObject=undefined;
			this.dataObject=undefined;
		}
	},
	
	applyView: function (/* optional */ mime,viewId) {
		// Choose the best view
		if(!mime) {
			if(this.mimeList) {
				// Default case
				mime=undefined;
				var bestIndex=-1;
				var tpIndex=-1;
				for(var i=0;i<this.mimeList.length;i++) {
					if(bestIndex==-1 && this.mimeList[i]!='text/plain' && this.mimeList[i]!='application/octet-stream') {
						bestIndex=i;
					}
					if(this.mimeList[i]=='text/plain' || (tpIndex==-1 && this.mimeList[i]=='application/octet-stream')) {
						tpIndex=i;
					}
				}
				
				if(bestIndex==-1) {
					if(tpIndex==-1) {
						tpIndex=0;
					}
					bestIndex=tpIndex;
				}
				mime=this.mimeList[bestIndex];
				
				this.mimeSelect.selectedIndex=bestIndex;
			} else {
				// No data :-(
				this.databrowserDiv.innerHTML='<i>NO DATA/NO VIEW</i>';
				return;
			}
		}
		
		// Now, time to apply view
		GeneralView.freeContainer(this.databrowserDiv);

		var selmime = mime;
		if(!(selmime in DataBrowser.Viewers)) {
			selmime = '*';
		}
		
		if(this.prevSelMime!=selmime) {
			this.prevSelMime=selmime;
			
			GeneralView.freeSelect(this.viewSelect);
			
			// Filling viewSelect
			var fetchURL=this.locObject.genDownloadURL(selmime);
			var downloadURL=this.locObject.genDownloadURL(selmime,'');
			
			GeneralView.freeContainer(this.IOPathSpan);
			var ioLink=this.genview.createElement('a');
			ioLink.setAttribute('href',downloadURL);
			ioLink.setAttribute('target','_blank');
			ioLink.appendChild(genview.thedoc.createTextNode(this.locObject.IOPath));
			this.IOPathSpan.appendChild(ioLink);

			var viewers = this.viewers = DataBrowser.Viewers[selmime];
			if(viewers instanceof Array) {
				// Filling viewSelect
				for(var viewid=0;viewid<viewers.length;viewid++) {
					var iterM=this.genview.createElement('option');
					iterM.text=viewers[viewid].name;
					iterM.value=viewid;
					try {
						this.viewSelect.add(iterM,null);
					} catch(e) {
						this.viewSelect.add(iterM);
					}
					
				}
			} else {
				// Default case, no view
				var iterM=this.genview.createElement('option');
				iterM.text=iterM.value='NO ONE';
				try {
					this.viewSelect.add(iterM,null);
				} catch(e) {
					this.viewSelect.add(iterM);
				}
				this.mimeList=undefined;
				this.locObject=undefined;
				this.dataObject=undefined;
				this.databrowserDiv.innerHTML='<i>NO VIEW</i>';
			}
		}
		
		if(viewId==undefined)  viewId=0;
		
		var viewIntId=parseInt(viewId,10);
		if(!isNaN(viewIntId)) {
			var viewers = this.viewers;
			var databrowser=this;
			var doApplyView = function(/* optional */ doCloseFrame) {
				if(doCloseFrame) {
					databrowser.closeProcessFrame();
				}
				
				var viewer = viewers[viewIntId];
				if(viewer) {
					var dataObject = databrowser.dataObject;
					var dataValue=undefined;
					if(viewer.dataSource==DataBrowser.Inline || dataObject.isLink) {
						dataValue = dataObject.data[(viewer.dataFormat == DataBrowser.Native)?1:0];
					} else {
						dataValue=fetchURL;
						// Left enactproxy base64 case integration
					}

					// Last, applying view
					try {
						viewer.applyView(dataValue,dataObject.genCallParams(mime),databrowser.databrowserDiv,databrowser.genview);
					} catch(eee) {
						alert(eee);
					}
				}
				
				if(!databrowser.setCallback) {
					databrowser.setCallback=true;

					// Fourth, assign handler
					WidgetCommon.addEventListener(databrowser.mimeSelect,'change',databrowser.mimeChangeFunc,false);
				}
				
				if(!databrowser.setViewCallback) {
					databrowser.setViewCallback=true;

					// Fourth, assign handler
					WidgetCommon.addEventListener(databrowser.viewSelect,'change',databrowser.viewChangeFunc,false);
				}
			};
			
			var doTranslate=undefined;
			if(!this.dataObject.data[1] || !this.dataObject.data[0]) {
				// First, check if we have the information in the proper format
				var viewer = viewers[viewIntId];
				if(viewer) {
					if(viewer.dataSource==DataBrowser.Inline) {
						if(!databrowser.dataObject.data[(viewer.dataFormat == DataBrowser.Native)?1:0]) {
							doTranslate=viewer.dataFormat;
						}
					/*
					} else {
						// IWWEMproxy does not have this problem
						// Left IWWEMproxy integration
					*/
					}
				}
			}
			
			// Second, apply proper translations!
			if(doTranslate) {
				this.openProcessFrame();
				if(doTranslate==DataBrowser.Native) {
					Base64.streamFromBase64ToUTF8(this.dataObject.data[0],function(decdata) {
						databrowser.dataObject.data[1]=decdata;

						// Third, apply best view(s)!
						doApplyView(true);
					});
				} else {
					Base64.streamFromUTF8ToBase64(this.dataObject.data[1],function(encdata) {
						databrowser.dataObject.data[0]=encdata;

						// Third, apply best view(s)!
						doApplyView(true);
					});
				}
			} else {
				doApplyView();
			}
		}
	}
};

DataBrowser.Inline = 'inline';
DataBrowser.Link = 'link';

DataBrowser.Native = 'native';
DataBrowser.Base64 = 'base64';

DataBrowser.XMLViewer = {
	name:	'XML PrettyPrint',
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'application/xml',
		'text/xml',
	],
	init:	undefined,
	
	applyView: function(data,paramArray,databrowserDiv,genview) {
		var xmldata=data;
		if(typeof xmldata == 'string') {
			var parser = new DOMParser();
			xmldata = parser.parseFromString(data,'application/xml');
		}
		if(xmldata && GeneralView.getLocalName(xmldata.documentElement)!='parsererror') {
			var xmldiv=IWWEMPrettyXML.generateBrowsableXML(xmldata,genview.thedoc);
			databrowserDiv.appendChild(xmldiv);
		} else {
			databrowserDiv.appendChild(genview.thedoc.createTextNode("Unable to parse as XML. Please try a different mime/type or viewer"));
		}
	}
};
DataBrowser.addViewer(DataBrowser.XMLViewer);

DataBrowser.HTMLViewer = {
	name:	'Embedded HTML',
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'text/html',
		'text/xhtml'
	],
	init:	undefined,
	
	applyView: function(data,paramArray,databrowserDiv,genview) {
		// A bit risky, isn't it?
		// Better an iframe, but not know
		//databrowserDiv.innerHTML=data;
		var ifraId='_ifra_';
		databrowserDiv.innerHTML="<iframe id='"+ifraId+"' name='"+ifraId+"' frameborder='0' style='margin: 0px; padding: 0px; overflow: auto; height:100%; width: 100%;'></iframe>";
		var ifra=WidgetCommon.getIFrameDocumentFromId(ifraId);
		ifra.open('text/html');
		ifra.write(data);
		ifra.close();
		ifra=null;
	}
};
DataBrowser.addViewer(DataBrowser.HTMLViewer);

DataBrowser.LinkViewer = {
	name:	'Link',
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['text/x-taverna-web-url'],
	init:	undefined,
	
	applyView: function(data,paramArray,databrowserDiv,genview) {
		var ifraId='_ifra_';
		databrowserDiv.innerHTML="<a href='"+data+"'>"+data+
			"</a><br><iframe id='"+ifraId+
			"' name='"+ifraId+
			"' src='"+data+
			"' frameborder='0' style='margin: 0px; padding: 0px; overflow: auto; height:100%; width: 100%;'></iframe>";
		/*
		var a=genview.createElement('a');
		a.href=data;
		a.target='_blank';
		a.innerHTML=data;
		databrowserDiv.appendChild(a);
		*/
	}
};
DataBrowser.addViewer(DataBrowser.LinkViewer);

DataBrowser.SVGViewer = {
	name:	'Embedded SVG',
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['image/svg+xml'],
	init:	undefined,
	
	applyView: function(url,paramArray,databrowserDiv,genview) {
		var objres=undefined;
		if(BrowserDetect.browser!='Explorer') {
			objres=genview.createElement('object');
			objres.setAttribute("data",url);
		} else {
			objres=genview.createElement('embed');
			objres.setAttribute("pluginspage","http://www.adobe.com/svg/viewer/install/");
			objres.setAttribute("src",url);
		}
		objres.setAttribute("type","image/svg+xml");
		objres.setAttribute("wmode","transparent");
		objres.setAttribute("width",'100%');
		objres.setAttribute("height",'100%');
		databrowserDiv.appendChild(objres);
	}
};
DataBrowser.addViewer(DataBrowser.SVGViewer);

DataBrowser.OctetStreamViewer = {
	name:	'Binary info',
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['application/octet-stream'],
	init:	undefined,
	
	applyView: function(uri,paramArray,databrowserDiv,genview) {
		databrowserDiv.innerHTML='Sorry, unable to show binary-labeled data (yet)!<br>';
		var a=genview.createElement('a');
		a.href=uri;
		a.target='_blank';
		a.innerHTML='Download binary-labeled data';
		databrowserDiv.appendChild(a);
	}
};
DataBrowser.addViewer(DataBrowser.OctetStreamViewer);

DataBrowser.ImageViewer = {
	name:	'Internal Viewer',
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'image/*',
		'image/png',
		'image/jpeg',
		'image/gif'
	],
	init:	undefined,
	
	applyView: function (uri,paramArray,databrowserDiv,genview) {
		var img=new Image();
		// This works with any browser but explorer, nuts!
		//img.src='data:'+mime+';base64,'+data;
		img.src=uri;
		img.alt="Unable to fetch/show "+uri;
		if(paramArray.length>1) {
			img.title=paramArray[1].data[1];
		}
		databrowserDiv.appendChild(img);
	}
};
DataBrowser.addViewer(DataBrowser.ImageViewer);

// JMol intialization
function JMolAlert(appname,info,addi) {
	if(info=='Script completed' && DataBrowser.MolViewer.jmolRunme) {
		//var d=new Date();
		//alert('alerta '+d.getTime()+' '+appname+' '+info+' '+addi);
		// This alert avoids a Java plugin deadlock
		setTimeout(DataBrowser.MolViewer.jmolRunme,100);
	}
};
	
DataBrowser.MolViewer = {
	name:	'JMol',
	/*
	dataSource:	DataBrowser.Inline,
	*/
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'chemical/x-alchemy',
		'chemical/x-cif',
		'chemical/x-gaussian-cube',
		'chemical/x-mdl-molfile',
		'chemical/x-mdl-sdfile',
		'chemical/x-mmcif',
		'chemical/x-mol2',
		'chemical/x-mopac-out',
		'chemical/x-pdb',
		'chemical/x-xyz'
	],
	
	jmolId:	'jmol',
	
	jmolRunme:	undefined,
	
	init:	function() {
		DataBrowser.MolViewer.jmolFirst=undefined;
		jmolInitialize('applets/jmol');
		jmolSetDocument(false);
		jmolSetCallback('messageCallback','JMolAlert');
	},
	
	applyView: function (data,paramArray,databrowserDiv,genview) {
		/*
		databrowserDiv.innerHTML=jmolAppletInline([300,450],
			data,
			'cartoon on;color cartoons structure',
			DataBrowser.MolViewer.jmolId
		);
		*/
		//jmolSetCallback('loadStructCallback',);
		var jmolParams=undefined;
		if(paramArray.length>1) {
			jmolParams=paramArray[1].data[1];
		}
		
		if(!jmolParams) {
			jmolParams='select all ; wireframe off ; spacefill off ; cartoon on ; color cartoons structure';
		}
		databrowserDiv.innerHTML=jmolApplet(['100%','100%'],
			'load '+data+' ; '+jmolParams,
			DataBrowser.MolViewer.jmolId
		);
		/*
		switch(BrowserDetect.browser) {
			case 'Explorer':
			case 'Safari':
			case 'Opera':
				databrowserDiv.innerHTML=jmolAppletInline(['100%','100%'],
					data,
					jmolParams,
					DataBrowser.MolViewer.jmolId
				);
				break;
			default:
			/*
				DataBrowser.MolViewer.jmolRunme = function () {
					jmolLoadInlineScript(data,
						jmolParams,
						DataBrowser.MolViewer.jmolId);
					DataBrowser.MolViewer.jmolRunme = undefined;
				};
				databrowserDiv.innerHTML=jmolApplet(['100%','100%'],'echo',DataBrowser.MolViewer.jmolId);
				break;
			/*
			default:
				var applet = genview.createElement('applet');
				var param = genview.createElement("param");
				param.setAttribute("name","progressbar");
				param.setAttribute("value","true");
				applet.appendChild(param);
				applet.name=DataBrowser.MolViewer.jmolId;
				applet.setAttribute("archive","JmolApplet0.jar");
				applet.setAttribute("codebase","applets/jmol");
				applet.setAttribute("mayscript","true");
				applet.setAttribute("style","width:300;height:450");
				applet.setAttribute("code","JmolApplet");

				databrowserDiv.appendChild(applet);

				var loadme = function() {
					try {
						if(applet.isActive() && applet.loadInline) {
							//alert(applet.loadInline);
							setTimeout(function() {
								applet.loadInline(
									data,
									'select all ; wireframe off ; spacefill off ; cartoon on ; color cartoons structure'
//									'define ~myset (*.N?);select ~myset;color green;select *;color cartoons structure;color rockets chain;color backbone blue'
								);
							},500);
						} else {
							setTimeout(loadme,100);
						}
					} catch(e) {
						setTimeout(loadme,100);
					}
				};
				loadme();
				break;
		}
		*/
	}
};


DataBrowser.addViewer(DataBrowser.MolViewer);

DataBrowser.NewickViewer = {
	name:	'ATV',
	/*
	dataSource:	DataBrowser.Inline,
	*/
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'biotree/newick'
	],
	init:	undefined,
	
	applyView: function (data,paramArray,databrowserDiv,genview) {
		var fullhref=window.location.href;
		var basehref = fullhref.substring(0,fullhref.lastIndexOf('/')+1);
		var applet = genview.createElement('applet');
		
		// Embedded ATV
		var param = genview.createElement("param");
		param.setAttribute("name","config_file");
		param.setAttribute("value",basehref+"etc/atv.conf");
		applet.appendChild(param);
		
		param = genview.createElement("param");
		param.setAttribute("name","url_of_tree_to_load");
		param.setAttribute("value",basehref+data);
		applet.appendChild(param);
		
		applet.name=DataBrowser.NewickViewer.name;
		applet.setAttribute("archive","applets/forester-4.00_alpha13.jar");
		applet.setAttribute("mayscript","true");
		applet.setAttribute("style","width:100%;height:100%");
		applet.setAttribute('width','100%');
		applet.setAttribute('height','100%');
		/*
		applet.width='100%';
		applet.height='100%';
		*/
		applet.setAttribute("code","org.forester.atv.ATVapplet");

		databrowserDiv.appendChild(applet);
		/*
		var appletstr="<applet name='"+DataBrowser.NewickViewer.name+"' archive='applets/forester-4.00_alpha13.jar' mayscript='true' style='width:100%;height:100%' code='org.forester.atv.ATVapplet'>"
			+"<param name='config_file' value='"+basehref+"etc/atv.conf'>"
			+"<param name='url_of_tree_to_load' value='"+basehref+data+"'>"
			+"</applet>";
		databrowserDiv.innerHTML=appletstr;
		*/
	}
};

DataBrowser.addViewer(DataBrowser.NewickViewer);

DataBrowser.MSAViewer = {
	name:	'Jalview',
	/*
	dataSource:	DataBrowser.Inline,
	*/
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'bioinformatics/x-msa'
	],
	init:	undefined,
	
	applyView: function (data,paramArray,databrowserDiv,genview) {
		var applet = genview.createElement('applet');
		
		// Embedded JalView
		var param = genview.createElement("param");
		param.setAttribute("name","embedded");
		param.setAttribute("value","true");
		applet.appendChild(param);
		
		//var fullhref=window.location.href;
		//var basehref = fullhref.substring(0,fullhref.lastIndexOf('/')+1);

		param = genview.createElement("param");
		param.setAttribute("name","file");
		param.setAttribute("value",data);
		applet.appendChild(param);
		
		applet.name=DataBrowser.MSAViewer.name;
		applet.setAttribute("archive","applets/jalviewApplet-2.3.jar");
		applet.setAttribute("mayscript","true");
		applet.setAttribute("style","width:100%;height:100%");
		applet.setAttribute("code","jalview.bin.JalviewLite");
		applet.setAttribute('width','100%');
		applet.setAttribute('height','100%');
		/*
		applet.width='100%';
		applet.height='100%';
		*/

		databrowserDiv.appendChild(applet);
	}
};

DataBrowser.addViewer(DataBrowser.MSAViewer);

// Default view must be the last one to be registered
// so its priority is the least one
DataBrowser.DefaultViewer = {
	name:	'default',
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'text/plain',
		'text/xml',
		'application/xml',
		'*'
	],
	init:	undefined,
	
	applyView: function(data,paramArray,databrowserDiv,genview) {
		// Use the prettyfier!
		var dataCont = genview.createElement('pre');
		dataCont.className='prettyprint noborder';
		databrowserDiv.appendChild(dataCont);
		var basedata=data.toString();
		var baseidx=0;
		var newidx;
		var line=undefined;
		var getfirst=true;
		var possibleMarkup=false;
		var lines=new Array();
		do {
			newidx=basedata.indexOf("\n",baseidx);
			if(baseidx!=0) {
				//strdata += "\r\n";
				lines.push("\r\n");
			}
			if(baseidx!=newidx) {
				var endidx=(newidx==-1)?basedata.length:newidx;
				line=basedata.substring(baseidx,endidx);
				if(getfirst) {
					possibleMarkup=/^\s*</.test(line);
					getfirst=false;
				}
				//strdata += line;
				lines.push(line);
			}
			baseidx=newidx+1;
		} while(newidx!=-1);
		var strdata=lines.join("");
		dataCont.appendChild(genview.thedoc.createTextNode(strdata));
		
		// Now, prettyPrint!!!!
		if(possibleMarkup && />\s*$/.test(line)) {
			strdata=basedata;
			strdata=strdata.replace(/&/g,'&amp;');
			strdata=strdata.replace(/</g,'&lt;');
			strdata=strdata.replace(/>/g,'&gt;');
			strdata=strdata.replace(/"/g,'&quot;');
			dataCont.innerHTML=prettyPrintOne(strdata);
		}
	}
};
DataBrowser.addViewer(DataBrowser.DefaultViewer);
