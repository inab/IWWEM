/*
	$Id$
	RunEvt.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2009
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
/*
	This SVG script is used to init the trampoline
	from an onload event from the SVG
*/
function RunEvt(LoadEvent) {
	var SVGDoc  = LoadEvent.target.ownerDocument;
	var SVGroot = SVGDoc.documentElement;
	
	var tramp = new SVGtramp(SVGDoc,1);
	
	// And at last, the hooks for the parent
	if(window.parent) {
		window.parent.SVGtrampoline = tramp;
	} else if(window.top) {
		window.top.SVGtrampoline = tramp;
	}
}
