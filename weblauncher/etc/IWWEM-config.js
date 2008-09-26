/*
	$Id$
	IWWEM-config.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/

var IWWEM={
	Version:	'0.7.0alpha',
//	Logo:	'style/unknown-inb.svg',
	Logo:	'style/IWWEM-logo.svg',
	// To be used when there was a problem loading any SVG
	Unknown:	'style/unknown.svg',
	/* DO NOT CHANGE NEXT LINES UNLESS YOU ARE ADDING A NEW PLUGIN!!! */
	Plugins: [
		'js/prettify/prettify.js',		// Prettify
		'js/FCKeditor/fckeditor.js',	// FCKEditor
		'applets/jmol/Jmol.js',				// JMol Javascript
		'js/IWWEMprettyXML.js',			// IWWE&M's own XML pretty printer
	],
	/* DO NOT CHANGE NEXT LINES UNLESS YOU EXACTLY KNOW WHAT YOU ARE DOING!!! */
	FSBase:		'cgi-bin/IWWEMfs',
	ProxyBase:	'cgi-bin/IWWEMproxy',
	CommonDeps: [
		'js/dynamicSVGhandling.js',		// Dynamic SVG handling code
		// These JavaScripts are needed for data viewer integration
		// into WorkflowManager and EnactionViewer
		'js/base64.js',
		'js/baclavahandling.js',
		'js/databrowser.js',
		'js/datamatcher.js',
		'js/datatreeview.js',
		'js/enactionstep.js',
	],
	Loaded: undefined
};
