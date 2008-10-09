/*
	$Id$
	IWWEMprettyXML.js
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
var IWWEMPrettyXML = {
	expandClick: function(event) {
		if(!event)  event=window.event;
		var target=(event.currentTarget)?event.currentTarget:event.srcElement;
		// theid=target.getAttribute("id");
        	try {
			//var target = event.originalTarget;
			if (target.className == 'expander') {
				if (target.parentNode.className == 'expander-closed') {
					target.parentNode.className = 'indent';
					target.firstChild.data = '\u2212';
				} else {
					target.parentNode.className = 'expander-closed';
					target.firstChild.data = '+';
				}
			}
        	} catch (e) {
        	}
	},

	generateBrowsableXML: function(XMLnode,thedoc) {
		var thediv = thedoc.createElement('div');
		thediv.className="indent";
		switch(XMLnode.nodeType) {
			case 1:	// ELEMENT_NODE
				var addedChildren=0;
				var expanderDiv;
				var shortExpander=undefined;
				// First let's know the number of true children
				if(XMLnode.firstChild) {
					var expanderDiv=thedoc.createElement('div');
					expanderDiv.className='expander-content';
					// Now, the children
					var lastNodeType=0;
					var streakLength=0;
					var firstChild;
					for(var child=XMLnode.firstChild;child;child=child.nextSibling) {
						if(lastNodeType!=child.nodeType || (lastNodeType!=3 && lastNodeType!=4)) {
							/*
							if(lastNodeType!=3 && lastNodeType!=4 && (child.nodeType==3 || child.nodeType==4)
							&& (!child.nextSibling || child.nextSibling.nodeType!=child.nodeType) &&
								child.nodeValue.indexOf(/[^ \t\n\r]/)==-1) {
							*/
							if((child.nodeType!=3 && child.nodeType!=4) ||
								streakLength>1 ||
								child.nodeValue.search(/[^ \t\n\r]/)!=-1
//								|| (lastNodeType!=0 && child.nextSibling)
							) {
								var childdiv=IWWEMPrettyXML.generateBrowsableXML(child,thedoc);
								expanderDiv.appendChild(childdiv);
								if(!addedChildren) {
									firstChild=childdiv;
								}
								addedChildren++;
							}
							streakLength=1;
						} else {
							streakLength++;
						}
						lastNodeType=child.nodeType;
					}
					if(addedChildren==1 &&
						(firstChild.tagName=='pre' || firstChild.tagName=='PRE') &&
						firstChild.firstChild.nodeValue.length<=50
					) {
						var textNode = firstChild.firstChild;
						firstChild.removeChild(textNode);
						expanderDiv=textNode;
						shortExpander=1;
					}
				}
				
				
				thediv.appendChild(IWWEMPrettyXML.doExpander(thedoc,(addedChildren<=0 || shortExpander)));

				// Start of tag
				var startSpan=thedoc.createElement('span');
				startSpan.className='markup';
				startSpan.appendChild(thedoc.createTextNode('<'));
				thediv.appendChild(startSpan);

				startSpan=thedoc.createElement('span');
				startSpan.className='start-tag';
				startSpan.appendChild(thedoc.createTextNode(XMLnode.tagName));
				thediv.appendChild(startSpan);

				// Attributes
				for(var attri=0 ; attri < XMLnode.attributes.length ; attri++) {
					var attr=XMLnode.attributes.item(attri);
					// Name
					var attrSpan=thedoc.createElement('span');
					attrSpan.className='attribute-name';
					attrSpan.appendChild(thedoc.createTextNode(' '+attr.name));
					thediv.appendChild(attrSpan);

					// Equals
					attrSpan=thedoc.createElement('span');
					attrSpan.className='markup';
					attrSpan.appendChild(thedoc.createTextNode('='));
					thediv.appendChild(attrSpan);

					// Value
					attrSpan=thedoc.createElement('span');
					attrSpan.className='attribute-value';
					attrSpan.appendChild(thedoc.createTextNode('"'+attr.value+'"'));
					thediv.appendChild(attrSpan);
				}

				// End of start of tag
				startSpan = thedoc.createElement('span');
				startSpan.className='markup';
				startSpan.appendChild(thedoc.createTextNode((addedChildren>0)?'>':'/>'));
				thediv.appendChild(startSpan);

				if(addedChildren>0) {
					thediv.appendChild(expanderDiv);

					// And the end!
					var stopSpan = thedoc.createElement('span');
					stopSpan.className='markup';
					stopSpan.appendChild(thedoc.createTextNode('</'));
					thediv.appendChild(stopSpan);

					stopSpan = thedoc.createElement('span');
					stopSpan.className='end-tag';
					stopSpan.appendChild(thedoc.createTextNode(XMLnode.tagName));
					thediv.appendChild(stopSpan);

					stopSpan = thedoc.createElement('span');
					stopSpan.className='markup';
					stopSpan.appendChild(thedoc.createTextNode('>'));
					thediv.appendChild(stopSpan);
				}
				break;
			case 3:	// TEXT_NODE
				var nodeValue=XMLnode.nodeValue;
				for(var sibling=XMLnode.nextSibling;sibling && sibling.nodeType==XMLnode.nodeType;sibling=sibling.nextSibling) {
					nodeValue+=sibling.nodeValue;
				}
				
				nodeValue=nodeValue.split("\n").join("\r\n");
				thediv=thedoc.createElement('pre');
				thediv.className = 'text';
				thediv.appendChild(thedoc.createTextNode(nodeValue));
				break;
			case 4:	// CDATA_SECTION_NODE
				var nodeValue=XMLnode.nodeValue;
				for(var sibling=XMLnode.nextSibling;sibling && sibling.nodeType==XMLnode.nodeType;sibling=sibling.nextSibling) {
					nodeValue+=sibling.nodeValue;
				}
				
				nodeValue=nodeValue.split("\n").join("\r\n");
				//nodeValue=nodeValue.replace(/\n/g,"\r\n");
				thediv=thedoc.createElement('pre');
				thediv.className = 'cdata';
				thediv.appendChild(thedoc.createTextNode(nodeValue));
				break;
			case 7:	// PROCESSING_INSTRUCTION_NODE
				thediv.appendChild(IWWEMPrettyXML.doExpander(thedoc,(XMLnode.nodeValue.length <= 50)));
				if(XMLnode.nodeValue.length <= 50) {
					thediv.className += ' pi';
					thediv.appendChild(thedoc.createTextNode('<?'+XMLnode.nodeName+
						' '+XMLnode.nodeValue+'?>')
					);
				} else {
					var startSpan=thedoc.createElement('span');
					startSpan.className='pi';
					startSpan.appendChild(thedoc.createTextNode('<?'+XMLnode.nodeName));
					thediv.appendChild(startSpan);

					var divContent=thedoc.createElement('div');
					divContent.className='pi indent expander-content';
					divContent.appendChild(thedoc.createTextNode(XMLnode.nodeValue));
					thediv.appendChild(divContent);

					var stopSpan=thedoc.createElement('span');
					stopSpan.className='pi';
					stopSpan.appendChild(thedoc.createTextNode('?>'));
					thediv.appendChild(stopSpan);
				}
				break;
			case 8:	// COMMENT_NODE
				thediv.appendChild(IWWEMPrettyXML.doExpander(thedoc,(XMLnode.nodeValue.length <= 50)));
				if(XMLnode.nodeValue.length <= 50) {
					thediv.className += ' comment';
					thediv.appendChild(thedoc.createTextNode('<!--'+XMLnode.nodeValue+'-->'));
				} else {
					var startSpan=thedoc.createElement('span');
					startSpan.className='comment';
					startSpan.appendChild(thedoc.createTextNode('<!--'));
					thediv.appendChild(startSpan);

					var divContent=thedoc.createElement('div');
					divContent.className='comment indent expander-content';
					divContent.appendChild(thedoc.createTextNode(XMLnode.nodeValue));
					thediv.appendChild(divContent);

					var stopSpan=thedoc.createElement('span');
					stopSpan.className='comment';
					stopSpan.appendChild(thedoc.createTextNode('-->'));
					thediv.appendChild(stopSpan);
				}
				break;
			case 9:	// DOCUMENT_NODE
			case 11:	// DOCUMENT_FRAGMENT_NODE
				thediv.className='prettyprint noborder';
				
				/*
				// Stylesheets
				var e = thedoc.createElement("link");
				e.setAttribute('rel',"stylesheet");
				e.setAttribute('type','text/css');
				e.setAttribute('href','style/IWWEMprettyXML/XMLPrettyPrint.css');
				thediv.appendChild(e);
				
				e = thedoc.createElement("link");
				e.setAttribute('title',"Monospace");
				e.setAttribute('rel',"alternate stylesheet");
				e.setAttribute('type','text/css');
				e.setAttribute('href','style/IWWEMprettyXML/XMLMonoPrint.css');
				thediv.appendChild(e);
				*/
				
				for(var child=XMLnode.firstChild;child;child=child.nextSibling) {
					var childdiv = IWWEMPrettyXML.generateBrowsableXML(child,thedoc);
					if(childdiv)
						thediv.appendChild(childdiv);
				}

				break;
		}

	/*
	2 	ATTRIBUTE_NODE
	5 	ENTITY_REFERENCE_NODE
	6 	ENTITY_NODE
	10 	DOCUMENT_TYPE_NODE
	12 	NOTATION_NODE
	*/
		return thediv;
	},
	
	doExpander: function (thedoc,/*optional*/ doHidden) {
		var expander = thedoc.createElement('span');
		expander.className='expander';
		expander.appendChild(thedoc.createTextNode('\u2212'));
		if(doHidden) {
			expander.setAttribute('style','visibility:hidden');
		} else {
			WidgetCommon.addEventListener(expander,'click',IWWEMPrettyXML.expandClick,false);
		}

		return expander;
	}
};
