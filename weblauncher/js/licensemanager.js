/*
	$Id$
	licensemanager.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

/* Data matcher, the heart beating for the royal crown */
function License(/*optional*/ licDOM,baseURI) {
	this.baseURI=baseURI;
	if(licDOM!=undefined) {
		if(GeneralView.getLocalName(licDOM)=='license') {
			this.name=licDOM.getAttribute('name');
			this.uri=licDOM.getAttribute('uri');
			this.abbrevURI=licDOM.getAttribute('abbrevURI');
			this.logo=new Array();
			for(var logo=licDOM.firstChild;logo;logo=logo.nextSibling) {
				if(logo.nodeType==1) {
					var width=logo.getAttribute('width');
					if(width==undefined || !width)  width=undefined;
					
					var height=logo.getAttribute('height');
					if(height==undefined || !height)  height=undefined;
					
					var cachedLogo=WidgetCommon.getTextContent(logo);
					if(cachedLogo==undefined || !cachedLogo)  cachedLogo=undefined;
					
					this.logo.push({mime:logo.getAttribute('mime'),uri:logo.getAttribute('uri'),width:width,height:height,cachedLogo:cachedLogo});
				}
			}
		}
	} else {
		this.name='';
		this.uri='';
		this.abbrevURI=undefined;
		this.logo=new Array();
	}
}

License.prototype={
	getURI: function() {
		return this.uri;
	},
	
	getAbbrevURI: function() {
		return (this.abbrevURI)?this.abbrevURI:this.uri;
	},
	
	getName: function() {
		return this.name;
	},
	
	getLogoURL: function() {
		if(this.logo.length==0)
			return undefined;
		
		return (this.logo[0].cachedLogo)?((this.baseURI)?this.baseURI+'/'+this.logo[0].cachedLogo:this.logo[0].cachedLogo):this.logo[0].uri;
	},
	
	getLogoWidth: function() {
		if(this.logo.length==0)
			return undefined;
		
		return this.logo[0].width;
	},
	
	getLogoHeight: function() {
		if(this.logo.length==0)
			return undefined;
		
		return this.logo[0].height;
	},
	
	generateOption: function (/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		var licSelOpt = thedoc.createElement('option');
		licSelOpt.value = this.uri;
		licSelOpt.text = this.name;
		
		return licSelOpt;
	}
};

function LicenseManager(/*optional*/licsDOM,baseURI) {
	var licenses = this.licenses = new Array();
	licenses.push(new License());
	if(GeneralView.getLocalName(licsDOM)=='licenses') {
		this.baseURI=baseURI;
	
		for(var licDOM=licsDOM.firstChild;licDOM;licDOM=licDOM.nextSibling) {
			if(licDOM.nodeType==1) {
				licenses.push(new License(licDOM,baseURI));
			}
		}
	}
}

LicenseManager.init=function(genview,licURL,callbackFunc) {
		var baridx=licURL.lastIndexOf('/');
		var baseURI=(baridx!=-1)?licURL.substr(0,licURL.lastIndexOf('/')):'';
		var GETrequest=new XMLHttpRequest();
		var GETrequestonerror=undefined;
		var GETrequestonload = function() {
			if(GETrequest) {
				try {
					var response=genview.parseRequest(GETrequest,"parsing known licenses list");
					if(response!=undefined && response!=null)
						callbackFunc(new LicenseManager(response.documentElement.cloneNode(true),baseURI));
				} catch(e) {
					genview.addMessage(
						'<blink><h1 style="color:red">FATAL ERROR: Unable to complete license list load!</h1></blink><pre>'+
						WidgetCommon.DebugError(e)+'</pre>'
					);
				}
				if(GETrequest.onload) {
					GETrequest.onload=function() {};
					GETrequest.onerror=function() {};
					GETrequestonload=undefined;
					GETrequestonerror=undefined;
					GETrequest=undefined;
				}
			}
		};

		GETrequestonerror = function() {
			if(GETrequest) {
				try {
					callbackFunc(new LicenseManager());
				} catch(e) {
					genview.addMessage(
						'<blink><h1 style="color:red">FATAL ERROR: Unable to complete license list load!</h1></blink><pre>'+
						WidgetCommon.DebugError(e)+'</pre>'
					);
				}
				if(GETrequest.onload) {
					GETrequest.onload=function() {};
					GETrequest.onerror=function() {};
					GETrequestonload=undefined;
					GETrequestonerror=undefined;
					GETrequest=undefined;
				}
			}
		};

		var onreadystatechange = function() {
			if(GETrequest.readyState==4) {
				GETrequest.onreadystatechange=function() {};
				if(GETrequest.status==200 || GETrequest.status==304) {
					GETrequestonload();
				} else {
					GETrequestonerror();
				}
				GETrequest=undefined;
			}
		};
		
		var dovar=1;
		if(GETrequest.addEventListener) {
			try {
				GETrequest.addEventListener('load',GETrequestonload,false);
				GETrequest.addEventListener('error',GETrequestonerror,false);
				dovar=undefined;
			} catch(e) {
				try {
					GETrequest.addEventListener('readystatechange',onreadystatechange,false);
					dovar=undefined;
				} catch(e) {
					// IgnoreIT!(R)
				}
			}
		}
		
		if(dovar) {
			if(GETrequest.onload) {
				GETrequest.onload=GETrequestonload;
				GETrequest.onerror=GETrequestonerror;
			} else {
				GETrequest.onreadystatechange=onreadystatechange;
			}
		}

		
		// Now it is time to send the query
		GETrequest.open('GET',licURL,true);
		GETrequest.send(null);
};