/*
	databrowser.js
	from INB Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Data viewer, the must-be royal crown */
function DataBrowser(databrowserId,genview) {
	this.genview=genview;
	
	this.databrowserDiv=genview.getElementById(databrowserId);
	this.mimeSelect=genview.getElementById('mimeSelect');
	this.IOStepSpan=genview.getElementById('IOStepSpan');
	this.IOPathSpan=genview.getElementById('IOPathSpan');
	this.dataObject=undefined;
	this.mimeList=undefined;
	this.setCallback=undefined;
	this.frameId=undefined;
	
	var databrowser=this;
	// Changed due Internet Explorer
	this.mimeChangeFunc=function(event) {
		if(!event)  event=window.event;
		var target=(event.currentTarget)?event.currentTarget:event.srcElement;
		if(target.selectedIndex!=-1) {
			databrowser.applyView(target.options[target.selectedIndex].value);
		}
	};
}

// List of available MIME Viewers
DataBrowser.Viewers = [];

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
};

DataBrowser.LocatedData = function(jobId,stepName,iteration,IOMode,/*optional*/IOPath) {
	this.jobId=jobId;
	this.stepName=stepName;
	this.iteration=(iteration==-1)?undefined:iteration;
	this.IOMode=IOMode;
	this.IOPath=IOPath;
	this.dataObject=undefined;
};

DataBrowser.LocatedData.prototype = {
	newChild: function(newIOPathStep) {
		return new DataBrowser.LocatedData(this.jobId,this.stepName,this.iteration,this.IOMode,(this.IOPath!=undefined)?(this.IOPath+'/'+newIOPathStep):newIOPathStep);
	},
	
	setDataObject: function(dataObject) {
		this.dataObject = dataObject;
	},

	genDownloadURL: function(mime) {
		var qsParm={jobId: this.jobId , step: this.stepName , IOMode: this.IOMode , IOPath: this.IOPath , asMime: mime};
		if(this.iteration!=undefined)  qsParm['iteration']=this.iteration;
		return WidgetCommon.generateQS(qsParm,"cgi-bin/enactproxy");
	}
};

DataBrowser.prototype={
	openProcessFrame: function () {
		this.frameId=this.genview.openFrame('preprocessData',1);
	},
	
	closeProcessFrame: function() {
		this.genview.closeFrame(this.frameId);
	},
	
	clearView: function () {
		WidgetCommon.removeEventListener(this.mimeSelect,'change',this.mimeChangeFunc,false);
		this.locObject=undefined;
		this.dataObject=undefined;
		this.mimeList=undefined;
		this.setCallback=undefined;
		GeneralView.freeContainer(this.databrowserDiv);
		GeneralView.freeContainer(this.IOStepSpan);
		GeneralView.freeContainer(this.IOPathSpan);
		GeneralView.freeSelect(this.mimeSelect);
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
			this.IOStepSpan.innerHTML=locObject.stepName+((locObject.iteration!=undefined)?('['+locObject.iteration+']'):'')+'('+((locObject.IOMode=='I')?'Input)':'Output)');
			//this.IOPathSpan.innerHTML='<a href="'+locObject.genDownloadURL()+'" target="_blank">'+locObject.IOPath+'</a>';

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
	
	applyView: function (mime) {
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
				this.databrowserDiv.innerHTML='<i>NO DATA</i>';
				return;
			}
		}
		
		// Now, time to apply view
		GeneralView.freeContainer(this.databrowserDiv);

		var selmime = mime;
		if(!(selmime in DataBrowser.Viewers)) {
			selmime = '*';
		}
		
		var downloadURL=this.locObject.genDownloadURL(selmime);
		this.IOPathSpan.innerHTML='<a href="'+downloadURL+'" target="_blank">'+this.locObject.IOPath+'</a>';
		var viewers= DataBrowser.Viewers[selmime];
		if(viewers instanceof Array) {
			var databrowser=this;
			var doApplyView = function(/* optional */ doCloseFrame) {
				if(doCloseFrame) {
					databrowser.closeProcessFrame();
				}
				
				for(var viewid=0;viewid<viewers.length;viewid++) {
					var viewer = viewers[viewid];
					if(viewer) {
						var dataObject = databrowser.dataObject;
						var dataValue=undefined;
						if(viewer.dataSource==DataBrowser.Inline) {
							dataValue = dataObject.data[(viewer.dataFormat == DataBrowser.Native)?1:0];
						} else {
							dataValue=downloadURL;
							// Left enactproxy base64 case integration
						}

						// Last, applying view
						viewer.applyView(dataValue,dataObject.genCallParams(mime),databrowser.databrowserDiv,databrowser.genview);
					}
				}
				
				if(!databrowser.setCallback) {
					databrowser.setCallback=true;

					// Fourth, assign handler
					WidgetCommon.addEventListener(databrowser.mimeSelect,'change',databrowser.mimeChangeFunc,false);
				}
			};
			
			var doTranslate=undefined;
			if(!this.dataObject.data[1] || !this.dataObject.data[0]) {
				// First, check if we have the information in the proper format
				for(var viewid=0;viewid<viewers.length;viewid++) {
					var viewer = viewers[viewid];
					if(viewer) {
						if(viewer.dataSource==DataBrowser.Inline) {
							if(!databrowser.dataObject.data[(viewer.dataFormat == DataBrowser.Native)?1:0]) {
								doTranslate=viewer.dataFormat;
								break;
							}
						/*
						} else {
							// enactproxy does not have this problem
							// Left enactproxy integration
						*/
						}
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

DataBrowser.DefaultViewer = {
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'text/xml',
		'text/plain',
		'*'
	],
	applyView: function(data,paramArray,databrowserDiv,genview) {
		// Use the prettyfier!
		var dataCont = genview.createElement('pre');
		dataCont.className='prettyprint noborder';
		var tnode = genview.thedoc.createTextNode(data);
		dataCont.appendChild(tnode);
		databrowserDiv.appendChild(dataCont);

		// Now, prettyPrint!!!!
		if(/^\s*</.test(data) && />\s*$/.test(data)) {
			var htmldata=data.toString();
			htmldata=htmldata.replace(/&/g,'&amp;');
			htmldata=htmldata.replace(/</g,'&lt;');
			htmldata=htmldata.replace(/>/g,'&gt;');
			htmldata=htmldata.replace(/"/g,'&quot;');
			dataCont.innerHTML=prettyPrintOne(htmldata);
		}
	}
};
DataBrowser.addViewer(DataBrowser.DefaultViewer);

DataBrowser.HTMLViewer = {
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'text/html',
		'text/xhtml'
	],
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
	dataSource:	DataBrowser.Inline,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['text/x-taverna-web-url'],
	applyView: function(data,paramArray,databrowserDiv,genview) {
		var a=genview.createElement('a');
		a.href=data;
		a.target='_blank';
		a.innerHTML=data;
		databrowserDiv.appendChild(a);
	}
};
DataBrowser.addViewer(DataBrowser.LinkViewer);

DataBrowser.SVGViewer = {
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['image/svg+xml'],
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
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	['application/octet-stream'],
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
	dataSource:	DataBrowser.Link,
	dataFormat:	DataBrowser.Native,
	acceptedMIME:	[
		'image/*',
		'image/png',
		'image/jpeg',
		'image/gif'
	],
	applyView: function (uri,paramArray,databrowserDiv,genview) {
		// This works with any browser but explorer, nuts!
		var img=new Image();
		//img.src='data:'+mime+';base64,'+data;
		img.src=uri;
		databrowserDiv.appendChild(img);
	}
};
DataBrowser.addViewer(DataBrowser.ImageViewer);

DataBrowser.MolViewer = {
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
			jmolParams=paramArray[1];
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
				applet.setAttribute("codebase","js/jmol");
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
// JMol intialization
function JMolAlert(appname,info,addi) {
	if(info=='Script completed' && DataBrowser.MolViewer.jmolRunme) {
		//var d=new Date();
		//alert('alerta '+d.getTime()+' '+appname+' '+info+' '+addi);
		// This alert avoids a Java plugin deadlock
		setTimeout(DataBrowser.MolViewer.jmolRunme,100);
	}
};
	

jmolInitialize('js/jmol');
jmolSetDocument(false);
jmolSetCallback('messageCallback','JMolAlert');
DataBrowser.addViewer(DataBrowser.MolViewer);
