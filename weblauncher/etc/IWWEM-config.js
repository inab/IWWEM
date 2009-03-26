/*
	$Id$
	IWWEM-config.js
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

var IWWEM={
	Version:	'0.7.0alpha2',
//	Logo:	'style/unknown-inb.svg',
	Logo:	'style/IWWEM-logo.svg',
	// To be used when there was a problem loading any SVG
	Unknown:	'style/unknown.svg',
	// To be used meanwhile we are waiting something...
	Wait:		'style/clock.svg',
	/* DO NOT CHANGE NEXT LINES UNLESS YOU ARE ADDING A NEW PLUGIN!!! */
	Plugins: new Array(
		'js/prettify/prettify.js',		// Prettify
		'js/FCKeditor/fckeditor.js',	// FCKEditor
		'applets/jmol/Jmol.js',				// JMol Javascript
		'js/IWWEMprettyXML.js'			// IWWE&M's own XML pretty printer
	),
	/* DO NOT CHANGE NEXT LINES UNLESS YOU EXACTLY KNOW WHAT YOU ARE DOING!!! */
	FSBase:		'cgi-bin/IWWEMfs',
	ProxyBase:	'cgi-bin/IWWEMproxy',
	CommonDeps: new Array(
		// Dynamic SVG handling code
		'js/dynamicSVGhandling.js',
		// These JavaScripts are needed for data viewer integration
		// into WorkflowManager and EnactionViewer
		'js/base64.js',
		'js/baclavahandling.js',
		'js/databrowser.js',
		'js/datamatcher.js',
		'js/datatreeview.js',
		'js/enactionstep.js'
	),
	Loaded: undefined
};
