/* Made by José María Fernández, CNIO 2007*/
/* For ORFandDB/X */

/* Widget Pager object declaration */
WidgetPager = function (theuri,theparamid,theparamns,theparamhtml,/* optional */ thedefaultlogo,thePager,thePageContent) {
	this.widgetURI=theuri;
	this.widgetParamId=theparamid;
	this.widgetParamNS=theparamns;
	this.widgetParamHTML=theparamhtml;
	this.DEFAULTLOGO=(!thedefaultlogo)?"<div align='center'><h3><i>NO LOGO WAS SET FOR THE WIDGET</i></h3></div>":thedefaultlogo;

	this.pagerPane=thePager;
	this.pageContentPane=thePageContent;
	
	this.defaultFetch=new Array();
	
	this.ishtmlfetch=null;
	this.viewMode='none';
	
	// Content stylesheet
	this.xslStylesheet=null;

	// Result list
	this.xmlDoc=null;

	this.pagerMode='none';
	// Default XSLT pager stylesheet
	this.xslDefaultPagerURL = "xslt/simplePager.xsl";


	// The search
	this.ensemblId=null;
	this.namespace=null;
	this.markup=null;

	// This array will host the shreded nodes
	this.content=new Array();
	this.maxcontent=0;
	this.state=new Array();

	// Possible widget GET parameters
	//this.qsParm = new Array();
	
	// widget message namespace
	this.NSprefix = {};
	this.NSprefix['msg'] = 'http://www.cnio.es/scombio/jmfernandez/widgetMessage/0.6';
	
	// Prefetching infrastructure
	this.continuedTimeOut=null;
	this.continueLoops=null;
	
	// This is needed by the asynchronous show
	this.activePlace=WidgetPager.ActivePagers.length;
	WidgetPager.ActivePagers[this.activePlace]=this;
	
	// Let's work!!!!!
	// this.widgetPagerInit();
	
	this.includeNodes=new Array();
};

WidgetPager._timer=null;
WidgetPager._init=null;
WidgetPager.FrameID='_ifra_';

WidgetPager.prototype = {
	setPanes: function (thePager,thePageContent) {
		if(thePager)  this.pagerPane=thePager;
		if(thePageContent)  this.pageContentPane=thePageContent;
	},
	
	showError: function (e,widURL) {
		this.xmlDoc=null;
		if(widURL!=null) {
			WidgetCommon.getElementById(this.pagerPane).innerHTML = this.DEFAULTLOGO;
		}
		var errmesg;
		if(!e) {
			errmesg='';
		} else {
			//alert(e.message);
			//throw(e);
			errmesg="<br /><pre>"+WidgetCommon.DebugError(e)+"</pre>";
		}
		var urlerrmesg=(widURL!=null && widURL!='')?"<i>There was an error while retrieving <a href='"+widURL+"'>"+widURL+"</a></i>":'';
		WidgetCommon.getElementById(this.pageContentPane).innerHTML = "<h2>"+urlerrmesg+errmesg+"</h2>";
	},

	widgetPagerInit: function () {
		/*
		if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
			if(!/loaded|complete/.test(document.readyState)) {
			//if(!/complete/.test(document.readyState)) {
				WidgetPager._timer = setInterval(function() {
					if (/loaded|complete/.test(document.readyState)) {
					//if (/complete/.test(document.readyState)) {
						this.widgetPagerInit(); // call the onload handler
					}
				}, 10);
				return;
			} else if(WidgetPager._timer) {
				clearInterval(WidgetPager._timer);
			}
		}
		*/
		if(WidgetPager._init)  return;
		WidgetPager._init=1;
		
		var widgetPager=this;
		if(navigator.vendor) {
			if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
				if(!WidgetCommon._loaded) {
					WidgetCommon.onload=function () { widgetPager.widgetPagerInit(); };
					if(!WidgetCommon._loaded) {
						WidgetPager._init=null;
						return;
					}
				}

				if(!/loaded|complete/.test(document.readyState)) {
				//if(!/complete/.test(document.readyState)) {
					WidgetPager._init=null;
					WidgetPager._timer = setInterval(function() {
						if (/loaded|complete/.test(document.readyState)) {
						//if (/complete/.test(document.readyState)) {
							widgetPager.widgetPagerInit(); // call the onload handler
						}
					}, 50);
					return;
				} else if(WidgetPager._timer) {
					clearInterval(WidgetPager._timer);
					WidgetPager._timer=null;
				}
			}
		}
		
		// Parsing Query String
		var qsParm = new Array();
		WidgetCommon.parseQS(qsParm);
		
		//netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");

		if(this.widgetURI!=null && this.pagerPane!=null && this.pageContentPane!=null) {
			if(BrowserDetect.browser=='Konqueror' || BrowserDetect.browser=='Safari') {
				this.ishtmlfetch='true';
			}
			
			/*
			this.ensemblId=null;
			this.namespace=null;
			*/

			if('ensemblId' in qsParm && qsParm['ensemblId'].length>0) {
				this.ensemblId=qsParm['ensemblId'];
			} else {
				if('ensID' in qsParm && qsParm['ensID'].length>0) {
					this.ensemblId=qsParm['ensID'];
				} else {
					if('search' in qsParm && qsParm['search'].length>0) {
						this.ensemblId=qsParm['search'];
					}
				}
			}

			if(this.ensemblId!=null && this.ensemblId.length==0) {
				this.ensemblId=null;
			}

			if('namespace' in qsParm && qsParm['namespace'].length>0) {
				this.namespace=qsParm['namespace'][0];
			} else {
				this.namespace='EnsEMBL';
			}

			if(this.namespace) {
				if(this.namespace.length==0) {
					this.namespace=null;
				} else if(this.namespace=='General') {
					this.markup=this.ensemblId[0];
				}
			}

			if(this.ensemblId!=null) {
				var widURL=this.buildWidgetURI(this.ensemblId,this.namespace);
				var myXMLHTTPRequest = new XMLHttpRequest();
				try {
					myXMLHTTPRequest.onreadystatechange = function() {
						if(myXMLHTTPRequest.readyState==4) {
							if('status' in myXMLHTTPRequest) {
								try {
									if(myXMLHTTPRequest.status==200) {
										var response=myXMLHTTPRequest.responseXML;
										if(!response) {
											if(myXMLHTTPRequest.responseText) {
												var parser=new DOMParser();
												response=parser.parseFromString(myXMLHTTPRequest.responseText,'application/xml');
											} else {
												throw new Error("Both responseXML and responseText were unparsable!\nPleast talk to the developer about this problem");
											}
										}
										widgetPager.gotResults(response,widURL);
									} else {
										widgetPager.gotResults(null,widURL);
									}
								} catch(e) {
									throw(e);
									//widgetPager.gotResults(null,widURL);
								}
							} else {
								alert("FATAL ERROR: Please notify it to this widget's developer");
							}
						}
					};

					// Go, go, power asynchronous
					WidgetCommon.getElementById(this.pagerPane).innerHTML = 'Querying for results. Please wait...';
					myXMLHTTPRequest.open("GET", widURL, true);
					myXMLHTTPRequest.send(null);

				} catch(e) {
					this.showError(e,widURL);
				}
			} else {
				WidgetCommon.getElementById(this.pagerPane).innerHTML = this.DEFAULTLOGO;
				//WidgetCommon.getElementById(pageContentPane).innerHTML = "<h2><i>No EnsEMBL ID has been specified using ensemblId parameter</i></h2>";
				WidgetCommon.getElementById(this.pageContentPane).innerHTML = "<h2><i>Please select a gene</i></h2>";
			}
		} else {
			if(this.pagerPane!=null && this.pageContentPane!=null) {
				WidgetCommon.getElementById(this.pagerPane).innerHTML = this.DEFAULTLOGO;
				WidgetCommon.getElementById(this.pageContentPane).innerHTML = "<h2><i>No widget params have been instantiated when the widget was created</i></h2>";
			} else {
				alert("FATAL ERROR: You (the widget creator) must call setPanes before using this generic widget pager!!!!");
			}
		}
	},
	
	buildWidgetURI: function (ensID,namespace,html)
	{
		var qsParm=new Array();
		qsParm[this.widgetParamId]=ensID;
		if(this.widgetParamNS && namespace) {
			qsParm[this.widgetParamNS]=namespace;
		}
		if(this.widgetParamHTML && html) {
			qsParm[this.widgetParamHTML]=html;
		}

		return WidgetCommon.generateQS(qsParm,this.widgetURI);
	},
	
	buildIncludeNodes: function (nodeList,includeNodes)
	{
		// Internet Explorer has a weird behavior
		// related to JavaScript and CSS on content dynamically
		// loaded using XMLHTTPRequest (like CARGO widgets)
		// and put as DIV children,
		// probably due the severe security problems
		// it had with JavaScript and CSS in the past.
		// So, we have to dynamically load both of them.
		if(nodeList!=null) {
			var iinc=0;
			var minc=nodeList.length;
			for(;iinc<minc;iinc++) {
				var include=new Object();
				include.includeType=nodeList[iinc].getAttribute("type");
				include.includeURL=nodeList[iinc].getAttribute("href");
				includeNodes.push(include);
			}
		}
	},

	includeNodesOnce: function (nodeList,thedoc)
	{
		// Internet Explorer has a weird behavior
		// related to JavaScript and CSS on content dynamically
		// loaded using XMLHTTPRequest (like CARGO widgets)
		// and put as DIV children,
		// probably due the severe security problems
		// it had with JavaScript and CSS in the past.
		// So, we have to dynamically load both of them.
		if(nodeList!=null) {
			if(!thedoc)  thedoc=document;
			
			var iinc=0;
			var minc=nodeList.length;
			for(;iinc<minc;iinc++) {
				var includeType=nodeList[iinc].getAttribute("type");
				var includeURL=nodeList[iinc].getAttribute("href");
				if(includeType=='CSS') {
					WidgetCommon.dhtmlLoadCSS(includeURL,null,thedoc);
				}
				if(includeType=='javascript') {
					WidgetCommon.dhtmlLoadScript(includeURL,null,thedoc);
				}
			}
		}
	},
	
	processIncludeNodes: function (includeNodes,thedoc)
	{
		// Internet Explorer has a weird behavior
		// related to JavaScript and CSS on content dynamically
		// loaded using XMLHTTPRequest (like CARGO widgets)
		// and put as DIV children,
		// probably due the severe security problems
		// it had with JavaScript and CSS in the past.
		// So, we have to dynamically load both of them.
		if(includeNodes!=null) {
			if(!thedoc)  thedoc=document;
			
			var iinc=0;
			var minc=includeNodes.length;
			for(;iinc<minc;iinc++) {
				var includeType=includeNodes[iinc].includeType;
				var includeURL=includeNodes[iinc].includeURL;

				if(includeType=='CSS') {
					WidgetCommon.dhtmlLoadCSS(includeURL,null,thedoc);
				}
				if(includeType=='javascript') {
					WidgetCommon.dhtmlLoadScript(includeURL,null,thedoc);
				}
			}
		}
	},
	
	gotResults: function (responseXML,widURL)
	{
		try {
			if(responseXML==null) {
				var err=new Error("RequestError");
				err.message="Request "+widURL+" failed";
				throw err;
			}

			this.xmlDoc = responseXML;
			WidgetCommon.getElementById(this.pageContentPane).innerHTML = 'Results have been obtained. Starting pre-processing task...';

			// Getting default fetch uri and parameters
			var nodeFetchURI=WidgetCommon.xpathEvaluate("//msg:defaultFetchURI",this.xmlDoc,this.NSprefix);
			if(nodeFetchURI!=null) {
				for(var fetchi=0; fetchi<nodeFetchURI.length; fetchi++) {
					var widgetFetchURI=nodeFetchURI[fetchi].getAttribute('href');
					var widgetFetchParamId=nodeFetchURI[fetchi].getAttribute('idAttr');
					var widgetFetchParamNS=nodeFetchURI[fetchi].getAttribute('nsAttr');
					var widgetFetchParamHTML=nodeFetchURI[fetchi].getAttribute('htmlAttr');
					var widgetFetchParamMarkup=nodeFetchURI[fetchi].getAttribute('markupAttr');
					var widgetFetchScope=nodeFetchURI[fetchi].getAttribute('scope');
					if(!widgetFetchURI) {
						widgetFetchURI=null;
					}
					if(!widgetFetchParamId) {
						widgetFetchParamId=null;
					}
					if(!widgetFetchParamNS) {
						widgetFetchParamNS=null;
					}
					if(!widgetFetchParamHTML) {
						widgetFetchParamHTML=null;
					}
					if(!widgetFetchParamMarkup) {
						widgetFetchParamMarkup=null;
					}
					if(!widgetFetchScope) {
						widgetFetchScope=null;
					}
					var adefaultfetch = new WidgetPager.DefaultFetchURI(widgetFetchURI,widgetFetchParamId,widgetFetchParamNS,widgetFetchParamHTML,widgetFetchParamMarkup,widgetFetchScope);
					this.defaultFetch[adefaultfetch.scope()]=adefaultfetch;
				}
			}
			nodeFetchURI=null;

			// Getting document fragments
			var nodeResult=WidgetCommon.xpathEvaluate("//msg:result",this.xmlDoc,this.NSprefix);
			if(nodeResult!=null && nodeResult.length>0) {
				var nodei=0;
				this.maxcontent=nodeResult.length;
				for(nodei=0;nodei<this.maxcontent;nodei++) {
					// Finding the child
					var child=nodeResult[nodei].firstChild;
					while(child!=null && child.nodeType!=1 && child.tagName.substr(child.tagName.indexOf(':',0)+1)!='content') {
						child=child.nextSibling;
					}
					// Did we find the child?
					this.content[nodei+1]=nodeResult[nodei];
					if(child!=null) {
						if(this.ishtmlfetch) {
							var strser="";
							var ser=new XMLSerializer();

							var itergrand=child.firstChild;
							while(itergrand) {
								if(itergrand.nodeType==1) {
									strser+=ser.serializeToString(itergrand);
								} else {
									if(itergrand.nodeType==3 || itergrand.nodeType==4) {
										strser+=Sarissa.getText(itergrand,false);
									}
								}
								itergrand=itergrand.nextSibling;
							}
							this.content[nodei+1]=strser;
						}
						this.state[nodei+1]=new String('');
					} else {
						this.state[nodei+1]=null;
					}
				}

				// Now do the pager task
				var pagerURL=null;

				// In HTML mode we must used a degraded pager (sigh)
				if(!this.ishtmlfetch) {
					// Get the pager
					var nodePager=WidgetCommon.xpathEvaluate("//msg:pagerView",this.xmlDoc,this.NSprefix);
					pagerURL=(nodePager!=null && nodePager.length>0)?nodePager[0].getAttribute('href'):null;

					if(pagerURL==null || pagerURL == undefined || pagerURL=='') {
						pagerURL=this.xslDefaultPagerURL;
						this.pagerMode='XSLT';
					} else {
						this.pagerMode=nodePager[0].getAttribute('showMode');
						if(!this.pagerMode) {
							this.pagerMode='none';
						}
						if(this.pagerMode!='none' && nodePager!=null && nodePager.length>0) {
							// It is custom, so apply what it is needed by the pager
							var nodeInc=WidgetCommon.xpathEvaluate("//msg:pagerView/msg:include",this.xmlDoc,this.NSprefix);

							this.includeNodesOnce(nodeInc);
						}
					}
				} else {
					this.pagerMode='none';
				}
				
				if(this.pagerMode!='none') {
					var myXMLHTTPRequest=new XMLHttpRequest();
					myXMLHTTPRequest.widgetPager=this;
					myXMLHTTPRequest.onreadystatechange = function() {
						if(myXMLHTTPRequest.readyState==4) {
							try {
								if(myXMLHTTPRequest.status==200) {
									var response=myXMLHTTPRequest.responseXML;
									if(!response) {
										if(myXMLHTTPRequest.responseText) {
											var parser=new DOMParser();
											response=parser.parseFromString(myXMLHTTPRequest.responseText,'application/xml');
										} else {
											throw new Error("Both responseXML and responseText were unparsable!\nPleast talk to the developer about this problem");
										}
									}
									myXMLHTTPRequest.widgetPager.gotPagerXSLT(response,pagerURL);
								} else {
									myXMLHTTPRequest.widgetPager.gotPagerXSLT(null,pagerURL);
								}
							} catch(e) {
								myXMLHTTPRequest.widgetPager.gotPagerXSLT(null,pagerURL);
							}
						}
					};

					// Go, go, power asynchronous
					myXMLHTTPRequest.open("GET", pagerURL, true);
					WidgetCommon.getElementById(this.pagerPane).innerHTML = "Fetching pager's stylesheet. Please wait...";
					myXMLHTTPRequest.send(null);
				} else {
					this.setLocalPager();
					this.processDefaultView();
				}
			} else {
				// Sanity
				if(!this.namespace) {
					this.namespace='';
				}
				if(!this.ensemblId) {
					this.ensemblId='';
				}
				// Last message
				WidgetCommon.getElementById(this.pageContentPane).innerHTML='No OMIM result was found for '+this.ensemblId+' on namespace '+this.namespace;
				WidgetCommon.getElementById(this.pagerPane).innerHTML=this.DEFAULTLOGO;
			}

		} catch(e) {
			this.showError(e,widURL);
		}
	},

	setLocalPager: function ()
	{
		// By program pager
		WidgetCommon.getElementById(this.pagerPane).innerHTML = '<div align="center">Found '+
			this.maxcontent+' result'+((this.maxcontent>1)?'s':'')+
			'<form name="pagerForm"><a href="javascript:widgetPager.showOne(1)">First</a> <select id="computedPager" name="pager" size="1" style="width:280" onChange="widgetPager.showOne(this.options[this.selectedIndex].value)"></select> <a href="javascript:widgetPager.showOne('+
			(this.content.length - 1)+')">Last</a></form></div>';
		var selectElem=WidgetCommon.getElementById('computedPager');
		for(var coni=1;coni<=this.maxcontent;coni++) {
			var title=this.content[coni].getAttribute('title');
			if(!title) {
				title=new String(coni);
			}

			var optelem=document.createElement('option');
			//optelem.text=title.substr(0,30)+((title.length>30)?'...':'');
			optelem.text=title;
			optelem.value=coni;
			try {
				selectElem.add(optelem,null);
			} catch(ex) {
				selectElem.add(optelem);
			}
		}
	},

	gotPagerXSLT: function (responseXML,xslPagerURL)
	{
		try {
			if(responseXML==null) {
				var err=new Error("RequestError");
				err.message="Request "+xslPagerURL+" failed";
				throw err;
			}

			// Do the pager task
			var xslPager = responseXML;

			var xsltProc = new XSLTProcessor();
			WidgetCommon.getElementById(this.pagerPane).innerHTML = "Importing pager's stylesheet...";
			xsltProc.importStylesheet(xslPager);
			xsltProc.clearParameters();
			
			WidgetCommon.getElementById(this.pagerPane).innerHTML = "Applying pager's stylesheet...";
			var fragment = xsltProc.transformToFragment(this.xmlDoc, document);
			//xsltProc.reset();

			WidgetCommon.getElementById(this.pagerPane).innerHTML = "";

			WidgetCommon.getElementById(this.pagerPane).appendChild(fragment);
			this.processDefaultView();
		} catch(e) {
			this.showError(e,xslPagerURL);
		}
	},

	processDefaultView: function ()
	{		
		// Get the XSL URL, if any
		var viewURL=null;
		if(!this.ishtmlfetch) {
			var nodeDefView=WidgetCommon.xpathEvaluate("//msg:defaultView",this.xmlDoc,this.NSprefix);
			if(nodeDefView!=null && nodeDefView.length>0) {
				viewURL=nodeDefView[0].getAttribute('href');
				this.viewMode=nodeDefView[0].getAttribute('showMode');
			}

			if(!this.viewMode) {
				this.viewMode='none';
			}
		} else {
			this.viewMode='none';
		}

		var nodeInc=WidgetCommon.xpathEvaluate("//msg:defaultView/msg:include",this.xmlDoc,this.NSprefix);
		this.buildIncludeNodes(nodeInc,this.includeNodes);

		if(!viewURL || this.viewMode=='none') {
			// And we don't have to forget this
			this.showOne(1);
		} else {
			// And now, get XSL itself
			var myXMLHTTPRequest=new XMLHttpRequest();
			myXMLHTTPRequest.widgetPager=this;
			myXMLHTTPRequest.onreadystatechange = function() {
				if(myXMLHTTPRequest.readyState==4) {
					try {
						if(myXMLHTTPRequest.status==200) {
							var resp=myXMLHTTPRequest.responseXML;
							if(resp==null || resp == undefined) {
								if(myXMLHTTPRequest.responseText) {
									var parser=new DOMParser();
									resp=parser.parseFromString(myXMLHTTPRequest.responseText,'application/xml');
								} else {
									throw new Error("Both responseXML and responseText were unparsable!\nPleast talk to the developer about this problem");
								}
							}
							
							myXMLHTTPRequest.widgetPager.gotContentXSLT(resp,viewURL);
						} else {
							myXMLHTTPRequest.widgetPager.gotContentXSLT(null,viewURL);
						}
					} catch(e) {
						myXMLHTTPRequest.widgetPager.gotContentXSLT(null,viewURL);
					}
				}
			};

			// Go, go, power asynchronous
			myXMLHTTPRequest.open("GET", viewURL, true);
			WidgetCommon.getElementById(this.pageContentPane).innerHTML = "Fetching content's stylesheet. Please wait...";
			myXMLHTTPRequest.send(null);
		}
	},

	gotContentXSLT: function (responseXML,xslURL)
	{
		try {
			if(responseXML==null) {
				var err=new Error("RequestError");
				err.message="Request "+xslURL+" failed";
				throw err;
			}
			
			this.xslStylesheet = responseXML;


			// And we don't have to forget this
			this.showOne(1);
		} catch(e) {
			this.showError(e,xslURL);
		}
	},
	
	showOne: function (theVal) {
		this.show(theVal,theVal);
		//this.prefetch(theVal+1,theVal+5);
	},

	show: function (fromVal,toVal)
	{
		// Killing previous show!!!
		if(this.continuedTimeOut!=null) {
			clearTimeout(this.continuedTimeOut);
			this.continuedTimeOut=null;
		}
		
		//WidgetCommon.getElementById(this.pageContentPane).innerHTML = "";
		var ifra=WidgetCommon.getIFrameDocumentFromId(WidgetPager.FrameID);
		if(!ifra) {
			var conpane=WidgetCommon.getElementById(this.pageContentPane);
			conpane.innerHTML="";
			conpane=null;
			
			conpane=WidgetCommon.getElementById(this.pageContentPane);
			conpane.innerHTML="<iframe id='"+WidgetPager.FrameID+"' name='"+WidgetPager.FrameID+"' frameborder='0' style='border-bottom:1px dashed gray; border-top:1px dashed gray; margin: 0px 0px 0px 0px; padding: 0px 0px 0px 0px; overflow: auto; width: 100%;'></iframe>";
			/*
			conpane.style.marginTop='0px';
			conpane.style.marginBottom='0px';
			*/
			conpane.style.marginLeft='0px';
			conpane.style.marginRight='0px';
			conpane.style.marginBottom='0px';
			conpane.style.paddingLeft='0px';
			conpane.style.paddingRight='0px';
			conpane.style.paddingBottom='0px';
			conpane=null;
			conpane=document.getElementsByTagName('body')[0];
			conpane.style.marginLeft='0px';
			conpane.style.marginRight='0px';
			conpane.style.marginBottom='0px';
			conpane.style.paddingLeft='0px';
			conpane.style.paddingRight='0px';
			conpane.style.paddingBottom='0px';
			
			WidgetCommon.setIFrameAutoResizeFromId(WidgetPager.FrameID);
			ifra=WidgetCommon.getIFrameDocumentFromId(WidgetPager.FrameID);
		}
		
		/*
		for(var facet in ifra) {
			alert(facet);
		}
		*/
		
		ifra.open('text/html');
		ifra.write('<html><head></head><body><div id="__result__"></div></body></html>');
		this.processIncludeNodes(this.includeNodes,ifra);
		ifra.close();
		ifra=null;
		
		this.prefetch(fromVal,toVal+5);
		WidgetPager.ContinueShow(this.activePlace,fromVal,toVal);
	},

	prefetch: function (fromVal,toVal)
	{
		if(toVal>this.maxcontent) {
			toVal=this.maxcontent;
		}
		if(fromVal<1) {
			fromVal=1;
		}
		for(var nodei=fromVal;nodei<=toVal;nodei++) {
			if(this.state[nodei]) {
				// Already fetched (or fetching)
				continue;
			}
			var thecontent=this.content[nodei];
			// So, let's fetch!
			var fetchURI=null;

			if(!thecontent.getAttribute('href')) {
				var id=thecontent.getAttribute('id');
				var namespace=thecontent.getAttribute('namespace');
				if(!namespace) {
					namespace=null;
				}
				
				// Let's seek the uri builder
				var nssearch=(!namespace)?WidgetPager.DefaultScope:namespace;
				var uriBuilder=null;
				if(nssearch in this.defaultFetch) {
					uriBuilder=this.defaultFetch[nssearch];
				} else if(WidgetPager.DefaultScope in this.defaultFetch) {
					uriBuilder=this.defaultFetch[WidgetPager.DefaultScope];
				} else {
					// Error
				}
				
				if(uriBuilder) {
					fetchURI=uriBuilder.buildURI(id,namespace,this.ishtmlfetch,this.markup);
				}
			} else {
				fetchURI=thecontent.getAttribute('href');
			}
				
			// It is a noop when there is no fetch uri
			if(fetchURI) {
				this.doPrefetch(fetchURI,nodei,fromVal);
			}
		}
	},

	doPrefetch: function (fetchURI,nodei,fromVal)
	{
		var prefetchXML=new XMLHttpRequest();
		prefetchXML.thei=nodei;
		prefetchXML.render=(nodei==fromVal)?1:null;
		prefetchXML.widget=this;
		prefetchXML.onreadystatechange = function() {
			if(prefetchXML.readyState==4) {
				try {
					if(prefetchXML.status==200) {
						if(prefetchXML.widget.ishtmlfetch) {
							prefetchXML.widget.content[prefetchXML.thei]=prefetchXML.responseText;
						} else {
							//content[prefetchXML.thei]=prefetchXML.responseXML;
							var response=prefetchXML.responseXML;
							if(!response) {
								// To avoid possible bugs!
								if(prefetchXML.responseText) {
									var parser=new DOMParser();
									response=parser.parseFromString(prefetchXML.responseText,'application/xml');
								} else {
									throw new Error("Both responseXML and responseText were unparsable!\nPleast talk to the developer about this problem");
								}
							}
							prefetchXML.widget.content[prefetchXML.thei].appendChild(response.documentElement);
						}

						prefetchXML.widget.state[prefetchXML.thei]=new String('');

						/*
						if(prefetchXML.render) {
							WidgetPager.ContinueShow(prefetchXML.widget.activePlace,prefetchXML.thei,prefetchXML.thei);
						}
						var divi=document.createElement('div');
						divi.innerHTML=prefetchXML.thei;
						WidgetCommon.getElementById(prefetchXML.widget.pageContentPane).appendChild(divi);
						*/
					} else {
						//alert("ERROR: Could not fetch information for "+id);
						prefetchXML.widget.state[prefetchXML.thei]=new String("ERROR: Could not fetch "+fetchURI);
					}
				} catch(e) {
					prefetchXML.widget.state[prefetchXML.thei]=new String(
						"ERROR: Could not fetch "+fetchURI+" because your browser is perhaps in offline mode!!!<pre>"+
						WidgetCommon.DebugError(e)+"</pre>"
					);
				}
			}
		};

		// Go, go, power asynchronous
		this.state[nodei]=prefetchXML;
		prefetchXML.open("GET", fetchURI, true);
		prefetchXML.send(null);
	}

};

// Static members/methods

WidgetPager.ActivePagers=new Array();

WidgetPager.ContinueShow = function (activePlace,fromVal,toVal) {
	var widget=WidgetPager.ActivePagers[activePlace];
	if(!widget) {
		// We should show some sort of error message here!!!!
		return;
	}
	if(widget.continuedTimeOut!=null) {
		clearTimeout(widget.continuedTimeOut);
		widget.continuedTimeOut=null;
	} else {
		widget.continueLoops=600;
	}
	if(toVal>widget.maxcontent) {
		toVal=widget.maxcontent;
	}
	if(fromVal<1) {
		fromVal=1;
	}
	if(fromVal<=toVal) {
		//WidgetCommon.getElementById(pageContentPane).innerHTML = "Importing content's stylesheet...";
		var ifra=WidgetCommon.getIFrameDocumentFromId(WidgetPager.FrameID);
		for(var nodei=fromVal;nodei<=toVal;nodei++) {
			// Avoiding race conditions
			var thestate=widget.state[nodei];
			// Skipping null contents
			if(thestate!=null && thestate instanceof String) {
				if(thestate.length==0) {
					var thecontent=widget.content[nodei];
					if(widget.viewMode=='none') {
						//WidgetCommon.getElementById(widget.pageContentPane).innerHTML += thecontent;
						var divres=ifra.createElement('div');
						divres.id='carajo';
						divres.innerHTML=thecontent;
						WidgetCommon.getElementById('__result__',ifra).appendChild(divres);
					} else {
						var xsltProc = new XSLTProcessor();
						xsltProc.importStylesheet(widget.xslStylesheet);
						xsltProc.clearParameters();

						// This is the ONLY point which was stopping Opera to work in native mode!
						try {
							var fragment;
							//fragment = xsltProc.transformToFragment(thecontent, document);
							//WidgetCommon.getElementById(widget.pageContentPane).appendChild(fragment);
							fragment = xsltProc.transformToFragment(thecontent, ifra);
							//var bod=ifra.getElementsByTagName('body')[0];
							//bod.appendChild(fragment);
							WidgetCommon.getElementById('__result__',ifra).appendChild(fragment);
						} catch(e) {
							/*
							alert(e.name);
							alert(e.message);
							alert(thecontent);
							alert(thestate);
							*/
							WidgetCommon.getElementById(widget.pageContentPane).innerHTML='Could not process this record?!?!?!?<br />Reason: <pre>'+WidgetCommon.DebugError(e)+'</pre>';
						}
						//xsltProc.reset();
					}
				} else {
					WidgetCommon.getElementById(widget.pageContentPane).innerHTML='Could not fetch/show this record?!?!?!?<br />Reason: '+thestate;
				}
			} else {
				if(thestate!=null) {
					//alert("Waiting for the fetch "+nodei+" state "+thestate);
					widget.continueLoops--;
					if(widget.continueLoops<=0) {
						//alert("Ya estoy hasta los bytes de iterar!");
						if('cancel' in thestate) {
							try {
								thestate.onreadystatechange=null;
								thestate.cancel();
							} catch(e) {
								// Do nothing(R)
							}
						}

					} else {
						// Each quarter of a second, results are checked
						widget.continuedTimeOut=setTimeout("WidgetPager.ContinueShow("+activePlace+","+nodei+","+toVal+")",500);
					}
				} else {
					try {
						throw new Error("FATAL ERROR: Null asynchronous query object found on WidgetPager.ContinueShow!");
					} catch(e) {
						widget.showError(e,null);
					}
					break;
				}
			}
		}
	}
};


WidgetPager.DefaultScope = '__default__';
WidgetPager.GlobalScope = 'General';

/* URI builder */
WidgetPager.DefaultFetchURI = function (thefetchuri,theidattr,thensattr,thehtmlattr,themarkupattr,thenamespace) {
	this.widgetFetchURI=thefetchuri;
	this.widgetFetchParamId=theidattr;
	this.widgetFetchParamNS=thensattr;
	this.widgetFetchParamHTML=thehtmlattr;
	this.widgetFetchParamMarkup=themarkupattr;
	this.widgetFetchScope=(!thenamespace)?WidgetPager.DefaultScope:thenamespace;
};

WidgetPager.DefaultFetchURI.prototype = {
	buildURI: function (id, /* optional */ ns, html, markup) {
		var qsParm=new Array();
		qsParm[this.widgetFetchParamId]=id;
		if(this.widgetFetchParamNS && namespace) {
			qsParm[this.widgetFetchParamNS]=namespace;
		}
		if(this.widgetFetchParamHTML && html) {
			qsParm[this.widgetFetchParamHTML]='true';
		}

		if(this.widgetFetchParamMarkup && markup) {
			qsParm[this.widgetFetchParamMarkup]=markup;
		}

		return WidgetCommon.generateQS(qsParm,this.widgetFetchURI);
	},
	
	isHTMLFetch: function () {
		return this.widgetFetchParamHTML;
	},
	
	scope: function() {
		return this.widgetFetchScope;
	}
};

/* Data: either content or view */
WidgetPager.Data = function (thecontent,thefetchuri,thedataname,theusagescope) {
	this.includeNodes=new Array();
	if(!thefetchuri) {
		this.state=new String('');
		this.content=thecontent;
		this.fetchURI=null;
	} else {
		this.state=null;
		this.content=null;
		this.fetchURI=thefetchuri;
	}
	this.dataName=thedataname;
	this.usageScope=theusagescope;
	this.onload=null;
	this.retries=0;
	this.dontFetch=null;
};

WidgetPager.Data.prototype = {
	scope: function() {
		return this.usageScope;
	},
	
	processIncludeNodes: function (nodeList)
	{
		// Internet Explorer has a weird behavior
		// related to JavaScript and CSS on content dynamically
		// loaded using XMLHTTPRequest (like CARGO widgets)
		// and put as DIV children,
		// probably due the severe security problems
		// it had with JavaScript and CSS in the past.
		// So, we have to dynamically load both of them.
		if(nodeList!=null) {
			var iinc=0;
			var minc=nodeList.length;
			for(;iinc<minc;iinc++) {
				var include=new Object();
				include.includeType=nodeList[iinc].getAttribute("type");
				include.includeURL=nodeList[iinc].getAttribute("href");
				this.includeNodes.push(include);
			}
		}
	},
	
	doPrefetch: function (/* optional */ onLoadFunction,force)
	{
		if(this.dontFetch)  return;
		
		if(this.state && !force) {
			return;
		}
		
		if(force) {
			if(!(this.state instanceof String) && !(this.state instanceof Error)) {
				// In progress fetches must not be cancelled...
				return;
			} else {
				// Forcing
				this.state=null;
				this.content=null;
			}
		}
		
		this.onload = onLoadFunction;
		var fetchURI = this.fetchURI;
		var prefetchXML=new XMLHttpRequest();
		prefetchXML.data=this;
		prefetchXML.onreadystatechange = function() {
			if(prefetchXML.readyState==4) {
				try {
					if(prefetchXML.status==200) {
						if(prefetchXML.data.ishtmlfetch) {
							prefetchXML.data.content=prefetchXML.responseText;
						} else {
							//content[prefetchXML.thei]=prefetchXML.responseXML;
							var response=prefetchXML.responseXML;
							if(!response) {
								if(prefetchXML.responseText) {
									var parser=new DOMParser();
									response=parser.parseFromString(prefetchXML.responseText,'application/xml');
								} else {
									var err=new Error("Both responseXML and responseText were unparsable!\nPlease talk to the developer about this problem");
									err.name='UnparsableResponse';
									throw err;
								}
							}
							prefetchXML.data.content=response.documentElement;
						}

						prefetchXML.data.state=new String('');

					} else {
						//alert("ERROR: Could not fetch information for "+id);
						var err = new Error("Could not fetch "+fetchURI+" (code "+prefetchXML.status+")");
						err.name='DataFetchError';
						prefetchXML.data.state=err;
						prefetchXML.data.retries++;
					}
				} catch(e) {
					prefetchXML.data.onreadystatechange=null;
					prefetchXML.data.state=e;
					prefetchXML.data.retries++;
					/*
					new String(
						"ERROR: Could not fetch "+fetchURI+" (Perhaps your browser is perhaps in offline mode?)<pre>"+
						WidgetCommon.DebugError(e)+"</pre>"
					);
					*/
				}
				// Calling the last function
				if(prefetchXML.data.onload instanceof Function) {
					prefetchXML.data.onload();
					prefetchXML.data.onload=null;
				}
			}
		};

		// Go, go, power asynchronous
		this.state=prefetchXML;
		prefetchXML.open("GET", fetchURI, true);
		prefetchXML.send(null);
	}
};
	
/* Contents */
WidgetPager.Content = function (theid,thenamespace,thecontent,thefetchuri,thetitle) {
	WidgetPager.Data.call(this,thecontent,thefetchuri,thetitle,(!thenamespace)?WidgetPager.GeneralScope:thenamespace);
	this.id=theid;
};
WidgetPager.Content.prototype = new WidgetPager.Data;
WidgetPager.Content.prototype.constructor = WidgetPager.Content;

/* Views */
WidgetPager.View = function (thename,thescope,theviewmode,thecontent,thefetchuri,themimetype) {
	WidgetPager.Data.call(this,thecontent,thefetchuri,thename,(!thescope)?WidgetPager.DefaultScope:thescope);
	this.viewMode=(!theviewmode)?'none':theviewmode;
	this.mimeType=themimetype;
};
WidgetPager.View.prototype = new WidgetPager.Data;
WidgetPager.View.prototype.constructor = WidgetPager.View;

WidgetPager.View.DEFAULT_CONTENT_PANE='__result__';

WidgetPager.View.prototype.applyView = function (data,/* optional */ thedoc, pageContentPane) {
	// Precondition: the information must be previously fetched (if needed).
	if(!thedoc)  thedoc=document;
	if(!pageContentPane)  pageContentPane=WidgetPager.View.DEFAULT_CONTENT_PANE;

	// Now, time to apply the view.
	if(this.state instanceof Error) {
		WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='ERROR: Could not fetch the view code used by this record<br />Reason: <pre>'+WidgetCommon.DebugError(this.state)+'</pre>';
	} else if(this.dontFetch && !this.fetchURI) {
		WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='FATAL ERROR: Unfetchable view!!!';
	} else if(data.state instanceof Error) {
		WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='ERROR: Could not fetch/show this record<br />Reason: <pre>'+WidgetCommon.DebugError(data.state)+'</pre>';
	} else if(data.dontFetch && !data.fetchURI) {
		WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='FATAL ERROR: Unfetchable record!!!';
	} else {
		for(var iinc=0;iinc<this.includeNodes.length;iinc++) {
			var include=this.includeNodes[iinc];

			if(include.includeType=='CSS') {
				WidgetCommon.dhtmlLoadCSS(include.includeURL,thedoc);
			}
			if(include.includeType=='javascript') {
				WidgetCommon.dhtmlLoadScript(include.includeURL,thedoc);
			}
		}
		
		switch(this.viewMode) {
			case 'CSS':
			case 'javascript':
				if(this.viewMode=='CSS') {
					if(this.dontFetch) {
						WidgetCommon.dhtmlLoadCSS(this.fetchURI,thedoc);
					} else {
						WidgetCommon.dhtmlLoadCSSContent(this.content,thedoc);
					}
				} else {
					if(this.dontFetch) {
						WidgetCommon.dhtmlLoadScript(this.fetchURI,thedoc);
					} else {
						WidgetCommon.dhtmlLoadScriptContent(this.content,thedoc);
					}
				}
			case 'none':
				if(data.dontFetch) {
					thedoc.parentWindow.location.replace(data.fetchURI);
				} else {
					var divres=thedoc.createElement('div');
					divres.id='fake';
					divres.innerHTML=data.content;
					WidgetCommon.getElementById(pageContentPane,thedoc).appendChild(divres);
				}
				break;
			case 'XSLT':
				if(this.dontFetch || data.dontFetch) {
					WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='FATAL ERROR: Applying XSLT over XML without prefetch all the participants is not supported yet!!!';
				} else {
					var xsltProc=null;
					try {
						xsltProc = new XSLTProcessor();
						xsltProc.importStylesheet(this.content);
						xsltProc.clearParameters();
					} catch(e) {
						WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='Error while creating XSLT processor<br />Reason: <pre>'+WidgetCommon.DebugError(e)+'</pre>';
					}

					if(xsltProc) {
						try {
							var fragment = xsltProc.transformToFragment(data.content, thedoc);
							WidgetCommon.getElementById(pageContentPane,thedoc).appendChild(fragment);
						} catch(e) {
							/*
							alert(e.name);
							alert(e.message);
							alert(thecontent);
							alert(thestate);
							*/
							WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='Could not apply XSLT stylesheet to this record<br />Reason: <pre>'+WidgetCommon.DebugError(e)+'</pre>';
						}
					}
				}
				break;
			case 'applet':
				/* Not implemented yet */
				/*				
<object 
  classid="clsid:CAFEEFAC-0015-0000-0000-ABCDEFFEDCBA"
  <param name="code" value="Applet1.class">
    <comment>
      <embed code="Applet1.class"
        type="application/x-java-applet;jpi-version=1.5.0">
        <noembed>
          No Java Support.
        </noembed>
      </embed>
    </comment>
  </object>
				*/
				break;
			case 'object':
				/* Not implemented yet */
				/*
<object width="550" height="400">
<param name="movie" value="somefilename.swf">
<embed src="somefilename.swf" width="550" height="400">
</embed>
</object>
				*/
				var objres=thedoc.createElement('object');
				for(var iobjparam=0;iobjparam<this.params.length;iobjparam++) {
					
				}
				WidgetCommon.getElementById(pageContentPane,thedoc).appendChild(objres);
				break;
			default:
				WidgetCommon.getElementById(pageContentPane,thedoc).innerHTML='FATAL ERROR: Unknown view '+this.viewMode+' for this record!';
				break;
		}
	}
};
