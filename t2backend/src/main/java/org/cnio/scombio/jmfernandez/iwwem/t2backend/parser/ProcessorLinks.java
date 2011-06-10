/*
	$Id$
	ProcessorLinks.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008-2011
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
 * The code in this file is based on Ruby implementation written by
 * Emmanuel Tagarira and David Withers, which was originally hosted at
 * http://github.com/mannie/taverna2-gem/ , which was under LGPL3 licence
 */

package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

import java.util.ArrayList;
import java.util.List;

/**
  * This object is returned after invoking model.get_processor_links(processor)
  * .  The object contains two lists of processors.  Each element consists of: 
  * the input or output port the processor uses as a link, the name of the
  * processor being linked, and the port of the processor used for the linking,
  * all seperated by a colon (:) i.e. 
  *   my_port:name_of_processor:processor_port
  */

public class ProcessorLinks {
	/**
	 * The processors whose output is fed as input into the processor used in
	 * model.get_processors_linked_to(processor).
	 */
	public List<String> sources;
    
	/**
	 * A list of processors that are fed the output from the processor (used in
	 * model.get_processors_linked_to(processor) ) as input.
	 */
	public List<String> sinks;
	
	public ProcessorLinks() {
		sources = new ArrayList<String>();
		sinks = new ArrayList<String>();
	}
}