/* Made by José María Fernández, CNIO 2007*/
/* For ORFandDB/X */
var WidgetCommon = {};

/* Zero, JavaScript dependencies */
WidgetCommon.JSDEPS=new Array(
	"sarissa/sarissa.js",
	"sarissa/sarissa_ieemu_xpath.js",
	"ajaxslt/xmltoken.js",
	"ajaxslt/util.js",
	"ajaxslt/dom.js",
	"ajaxslt/xpath.js"
);

WidgetCommon._timer=null;
WidgetCommon._loaded=null;
WidgetCommon.onload=null;

/* First, essential functions!!!! */
WidgetCommon.dhtmlLoadScript = function (url,/* optional */ basehref,thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var head=thedoc.getElementsByTagName("head")[0];
	
	// Browser detection
	if(!basehref) {
		basehref='';
	}
	/*
	if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
		thedoc.write("<script src='"+basehref+url+"' type='text/javascript'></script>\n");
	} else {
	*/
		var e = thedoc.createElement("script");
		e.type="text/javascript";
		if(navigator.vendor) {
			if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
				e.defer='defer';
			}
		}
		/*
		if(!('readyState' in e)) {
			e.defer='defer';
			e.readyState=null;
			e.onload= function () {
				e.readyState='loaded';
			};
		}
		*/
		e.src = basehref+url;
		head.appendChild(e);
		return e;
	/*
	}
	*/
};

WidgetCommon.dhtmlDelayedLoadScript = function (urls,/* optional */ basehref,thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var head=thedoc.getElementsByTagName("head")[0];
	// Browser detection
	if(!basehref) {
		basehref='';
	}
	
	var delayed=null;
	if(navigator.vendor) {
		if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
			delayed=1;
		}
	/*
	} else if(navigator.userAgent) {
		if(navigator.userAgent.indexOf('MSIE')!=-1) {
			delayed=1;
		}
	*/
	}
	
	if(delayed) {
		var baseindex=0;
		var thecontext=thedoc;
		WidgetCommon._timer = setInterval(function() {
			//alert(baseindex+" "+urls.length+" "+thecontext.readyState+' '+thedoc.readyState+' '+thecontext.event);
			if (/loaded|complete/.test(thedoc.readyState)) {
			//if (/loaded|complete/.test(thecontext.readyState)) {
			//if (/complete/.test(thecontext.readyState)) {
				if(baseindex<urls.length) {
					thecontext=WidgetCommon.dhtmlLoadScript(urls[baseindex],basehref,thedoc); // call the onload handler
					/*
					for(var ia in thecontext) {
						alert(ia);
					}
					*/
					baseindex++;
				} else {
					clearInterval(WidgetCommon._timer);
					WidgetCommon._timer=null;
					WidgetCommon._loaded=1;

					if(WidgetCommon.onload instanceof Function) {
						WidgetCommon.onload();
					} else if(WidgetCommon.onload instanceof Array) {
						for(var loind in WidgetCommon.onload) {
							if(WidgetCommon.onload[loind] instanceof Function) {
								WidgetCommon.onload[loind]();
							}
						}
					}
				}
			}
		}, 100);
		return;
	}
	WidgetCommon.dhtmlBulkLoadScript(urls,basehref,thedoc);
};

WidgetCommon.dhtmlBulkLoadScript = function (urls,/* optional */ basehref,thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var head=thedoc.getElementsByTagName("head")[0];
	// Browser detection
	if(!basehref) {
		basehref='';
	}
	/*
	if(navigator.vendor.indexOf('KDE')!=-1 || navigator.vendor.indexOf('Apple')!=-1) {
		var towrite='';
		for(var uri in urls) {
			towrite+="<script src='"+basehref+urls[uri]+"' type='text/javascript'></script>\n";
		}
		head=thedoc.createElement('head');
		head.innerHTML = towrite;
		thedoc.appendChild(head);
		//thedoc.write(towrite);
		alert(towrite);
	} else {
	*/
		for(var uri in urls) {
			var e = thedoc.createElement("script");
			e.type="text/javascript";
			e.src = basehref+urls[uri];
			head.appendChild(e);
		}
	/*
	}
	*/
};

WidgetCommon.dhtmlLoadCSS = function (url,/* optional */ basehref,thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var e = thedoc.createElement("link");
	e.rel="stylesheet";
	if(!basehref) {
		basehref='';
	}
	e.href = basehref+url;;
	thedoc.getElementsByTagName("head")[0].appendChild(e);
};

WidgetCommon.widgetCommonInit = function ()
{
	var basehref=null;
	
	var scripts=document.getElementsByTagName("script");
	var isc;
	for(isc=0;isc < scripts.length ; isc++) {
		var src = scripts[isc].getAttribute("src");
		// Anonymous javascript blocks
		if(!src) {
			continue;
		}
		var last=src.lastIndexOf('widgetCommon.js');
		if(last!=-1 && src.match(/\/widgetCommon\.js$/)) {
			basehref=src.substring(0, last);
			break;
		}
	}
	
	if(!basehref) {
		basehref=location.href;
	}
	var lastslash=basehref.lastIndexOf('/');
	if((lastslash+1)!=basehref.length) {
		basehref=basehref.substring(0,lastslash+1);
	}
	WidgetCommon.dhtmlDelayedLoadScript(WidgetCommon.JSDEPS,basehref);
};

/* Second, dynamically loading the libraries (bootstraping) */
WidgetCommon.widgetCommonInit();

/* And third, the additional functions!!!! */
WidgetCommon.dhtmlLoadCSSContent = function (csscontent,/* optional */ thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var e = thedoc.createElement("style");
	e.type="text/css";
	e.innerHTML = csscontent;
	thedoc.getElementsByTagName("head")[0].appendChild(e);
};

WidgetCommon.dhtmlLoadScriptContent = function (javascriptcontent,/* optional */ thedoc)
{
	if(!thedoc) {
		thedoc=document;
	}
	var e = thedoc.createElement("script");
	e.type="text/javascript";
	thedoc.innerHTML = javascriptcontent;
	thedoc.getElementsByTagName("head")[0].appendChild(e);
};

// Sort of optimization
if(document.getElementById){    // test the most common method first.  Most browsers won't get past this test
	WidgetCommon.getElementById = function (id,/* optional */ thedoc) { if(!thedoc)  thedoc=document; return thedoc.getElementById(id); };
} else if(document.all){         // test older versions of IE
	WidgetCommon.getElementById = function (id,/* optional */ thedoc) { if(!thedoc)  thedoc=document; return thedoc.all[id]; };
} else if(document.layers){      // test older versions of Netscape
	WidgetCommon.getElementById = function (id,/* optional */ thedoc) { if(!thedoc)  thedoc=document; return thedoc.layers[id]; };
} else {                          // not sure what to do...return null
	WidgetCommon.getElementById = function (id,/* optional */ thedoc) { return null; };
}

WidgetCommon.getForm = ('forms' in document)?
	function (formName,/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		return thedoc.forms[formName];
	}:
	function (formName,/* optional */ thedoc) {
		if(!thedoc)  thedoc=document;
		return thedoc[formName];
	};


WidgetCommon.getIFrameDocument = function (aID,/* optional */ thedoc) {
	var rv = null;
	
	if(!thedoc)  thedoc=document;
	// if contentDocument exists, W3C compliant (Mozilla)
	var ael=thedoc.getElementById(aID);
	if(ael) {
		if ('contentDocument' in ael) {
			rv = ael.contentDocument; 
			// rv = thedoc.frames[aID].contentDocument;
		} else {
			// IE 
			rv = thedoc.frames[aID].document;
		}
	}
	
	return rv; 
};

// for sizing and positioning the iframe in the window
// .5 for height="50%"
WidgetCommon.setIFrameHeight = function (ifraname,h,headerHeight,viewport) {
	if(!viewport)  viewport=new WidgetCommon.Viewport();
	var theIframe = WidgetCommon.getElementById(ifraname);
	if (theIframe) {
		viewport.getWinHeight();
		//  both theIframe.height and theIframe.style.height seem to work
		//theIframe.style.height = Math.round( h * viewport.height ) + "px";
		theIframe.style.height = Math.round( (viewport.height - theIframe.offsetTop - headerHeight) * h)  + "px";
		//theIframe.style.marginTop = Math.round( (viewport.height - parseInt(theIframe.style.height) )/2 ) + "px";
	}
};

WidgetCommon.setIFrameAutoResize = function (ifraname,/* optional */ percent,headerHeight,canreplace) {
	if(!percent)  percent=1;
	if(!headerHeight)  headerHeight=0;
	
	//WidgetCommon.setIFrameHeight(ifraname,percent,headerHeight);
	var viewport=new WidgetCommon.Viewport();
	var daemonfunc = function() { WidgetCommon.setIFrameHeight(ifraname,percent,headerHeight,viewport); };
	daemonfunc();
	var olddaemonfunc = window.onresize;
	window.onresize = (!canreplace && olddaemonfunc)?(function() { olddaemonfunc();daemonfunc(); }):daemonfunc;
};

/* This is a sort of lazy evaluation */
WidgetCommon.xpathEvaluate = function (thexpath,thecontext,theObjResolver) {
	WidgetCommon.xpathEvaluate = (BrowserDetect.browser=='Konqueror' || BrowserDetect.browser=='Safari') ?
		function (thexpath,thecontext,theObjResolver) {
			var expcon=new ExprContext(thecontext);
			var tagname=thecontext.documentElement.tagName;
			// Getting main prefix (if any)
			var pretag=tagname.substring(0,tagname.indexOf(':',0));
			if(!pretag) {
				pretag='';
			} else {
				pretag+=':';
			}
			var prematch=new String(thexpath.match(/[^a-zA-Z0-9][a-zA-Z0-9]+:/));
			if(!prematch) {
				prematch='';
			} else {
				prematch=prematch.substr(1);
			}
			// Replacing prefixes
			var re=new RegExp("/"+prematch+"([^/])","g");
			var repxpath=thexpath.replace(re,"/"+pretag+"$1");
			var xp=xpathParse(repxpath);
			if(xp!=null) {
				var res=xp.evaluate(expcon);
				return (res!=null)?res.value:null;
			}
			return null;
		}:
		function (thexpath,thecontext,theObjResolver) {
			var namespaceString="";
			for(var prefix in theObjResolver) {
				namespaceString+=' xmlns:'+prefix+'="'+theObjResolver[prefix]+'"';
			}
			Sarissa.setXpathNamespaces(thecontext,namespaceString.substring(1));

			return thecontext.selectNodes(thexpath);
		};
	return WidgetCommon.xpathEvaluate(thexpath,thecontext,theObjResolver);
};

/* Second parameter is optional */
WidgetCommon.parseQS = function (qsParm,/* optional */ url,thedoc)
{
	if(!thedoc)  thedoc=document;
	var query = (url)?url:thedoc.location.search.substring(1);
	var parms = query.split('&');
	for (var i=0; i<parms.length; i++) {
		var pos = parms[i].indexOf('=');
		if (pos > 0) {
			var key = parms[i].substring(0,pos);
			key = unescape(key.replace(/\+/g,' '));
			var val = parms[i].substring(pos+1);
			val = unescape(val.replace(/\+/g,' '));
			// We are now dealing with arrays, but
			// it is easier not dealing with them outside here
			if(!(key in qsParm) || !qsParm[key] || !(qsParm[key] instanceof Array)) {
				qsParm[key]=(key in qsParm)?new Array((qsParm[key])?qsParm[key]:''):new Array();
			}
			qsParm[key].push(val);
		}
	}
	
	return qsParm;
};

WidgetCommon.generateQS = function (qsParm,baseurl)
{
	var query='';
	for (var term in qsParm) {
		if(qsParm[term]) {
			var iterarray=(qsParm[term] instanceof Array)?qsParm[term]:new Array(qsParm[term]);
			
			for(var key in iterarray) {
				query+='&'+escape(term)+'='+escape(iterarray[key]);
			}
		}
	}
	return baseurl+'?'+query.substring(1);
};


WidgetCommon.DebugError = function (e) {
	if(!e)  return 'Null or undefined error';
	if(typeof e == 'string' || typeof e == 'number') {
		return 'Exception message: '+e;
	} else {
		var dbgmsg='';
		for(var facet in e) {
			dbgmsg+=facet+"\n";
		}
		
		if(BrowserDetect.browser=='Konqueror' || BrowserDetect.browser=='Safari') {
			var name;
			var message;
			var line;
			try {
				name=e.name;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				message=e.message;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				line=e.line;
			} catch(ee) {
				// IgnoreIt!
			}
			if(!name)  name='';
			if(!message)  message='';
			if(!line)  line='';
			return 	"JavaScript error name: "+name+
				"\nMessage: "+message+
				"\nLine "+line;
		} else if(BrowserDetect.browser=='Explorer') {
			var name;
			var message;
			var number;
			var description;
			try {
				name=e.name;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				message=e.message;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				number=e.number;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				description=e.description;
			} catch(ee) {
				// IgnoreIt!
			}
			if(!name)  name='';
			if(!message)  message='';
			if(!number)  number='';
			if(!description)  description='';
			return 	"JavaScript error name: "+name+
				"\nMessage: "+message+
				"\nNumber: "+number+
				"\nDescription: "+description;
		} else {
			var name;
			var message;
			var fileName;
			var lineNumber;
			var stack;
			try {
				name=e.name
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				message=e.message;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				fileName=e.fileName;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				lineNumber=e.lineNumber;
			} catch(ee) {
				// IgnoreIt!
			}
			try {
				stack=e.stack;
			} catch(ee) {
				// IgnoreIt!
			}
			if(!name)  name='';
			if(!message)  message='';
			if(!fileName)  fileName='';
			if(!lineNumber)  lineNumber='';
			if(!stack)  stack='';
			return 	"JavaScript error name: "+name+
				"\nMessage: "+message+
				"\nFileName: "+fileName+", line "+lineNumber+
				"\nStackTrace: "+stack;
		}
	}
};


/* WidgetCommon.viewport is a revised version of dw_viewport.js */
/*************************************************************************

  dw_viewport.js
  version date Nov 2003
  
  This code is from Dynamic Web Coding 
  at http://www.dyn-web.com/
  Copyright 2003 by Sharon Paine 
  See Terms of Use at http://www.dyn-web.com/bus/terms.html
  Permission granted to use this code 
  as long as this entire notice is included.

*************************************************************************/  
  
WidgetCommon.Viewport = function (/* optional */ thedoc,thewin) {
	this.thedoc=(!thedoc)?document:thedoc;
	this.thewin=(!thewin)?window:thewin;
}

WidgetCommon.Viewport.prototype = {
	getWinWidth: function () {
		this.width = 0;
		if (this.thewin.innerWidth) this.width = this.thewin.innerWidth - 18;
		else if (this.thedoc.documentElement && this.thedoc.documentElement.clientWidth) 
  			this.width = this.thedoc.documentElement.clientWidth;
		else if (this.thedoc.body && this.thedoc.body.clientWidth) 
  			this.width = this.thedoc.body.clientWidth;
	},

	getWinHeight: function () {
		this.height = 0;
		if (this.thewin.innerHeight) this.height = this.thewin.innerHeight - 18;
		else if (this.thedoc.documentElement && this.thedoc.documentElement.clientHeight) 
  			this.height = this.thedoc.documentElement.clientHeight;
		else if (this.thedoc.body && this.thedoc.body.clientHeight) 
  			this.height = this.thedoc.body.clientHeight;
	},

	getScrollX: function () {
		this.scrollX = 0;
		if (typeof this.thewin.pageXOffset == "number") this.scrollX = this.thewin.pageXOffset;
		else if (this.thedoc.documentElement && this.thedoc.documentElement.scrollLeft)
  			this.scrollX = this.thedoc.documentElement.scrollLeft;
		else if (this.thedoc.body && this.thedoc.body.scrollLeft) 
  			this.scrollX = this.thedoc.body.scrollLeft; 
		else if (this.thewin.scrollX) this.scrollX = this.thewin.scrollX;
	},

	getScrollY: function () {
		this.scrollY = 0;    
		if (typeof this.thewin.pageYOffset == "number") this.scrollY = this.thewin.pageYOffset;
		else if (this.thedoc.documentElement && this.thedoc.documentElement.scrollTop)
  			this.scrollY = this.thedoc.documentElement.scrollTop;
		else if (this.thedoc.body && this.thedoc.body.scrollTop) 
  			this.scrollY = this.thedoc.body.scrollTop; 
		else if (this.thewin.scrollY) this.scrollY = this.thewin.scrollY;
	},

	getAll: function () {
		this.getWinWidth();
		this.getWinHeight();
		this.getScrollX();
		this.getScrollY();
	}

};


/*******************************************************/
/* Random numbers and string generators static methods */
/*******************************************************/

/*
	getRandomInt was taken from Mozilla Developer Center.
	It returns a random integer between min and max.
	Using Math.round() will give you a non-uniform distribution!
*/
WidgetCommon.getRandomInt = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**************************/
/* Now, an UUID generator */
/**************************/
WidgetCommon.getRandomUUID = function () {
	var rarr=new Array();
	for(var i=0;i<8;i++) {
		rarr.push(WidgetCommon.getRandomInt(0,65535).toString(16));
	}
	
	return rarr[0]+rarr[1]+'-'+rarr[2]+'-'+rarr[3]+'-'+rarr[4]+'-'+rarr[5]+rarr[6]+rarr[7];
}
