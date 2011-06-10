/*
	$Id$
	Dataflow.java
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
  * The entities within the Taverna 2 mdoel which contains the different 
  * elements of the workflows; processors, sinks, sources, etc...
  */
public class Dataflow {
	/**
	 * This returns a DataflowAnnotation object.
	 */
	public DataflowAnnotation annotations;
	
	/**
	 * Retrieve the list of processors specific to the dataflow.
	 */
	public List<Processor> processors;
    
	/**
	 * Retrieve the list of datalinks specific to the dataflow.
	 */
	public List<Datalink> datalinks;
    
	/**
	 * Retrieve the list of sources specific to the dataflow.
	 */
	public List<Source> sources;
    
	/**
	 * Retrieve the list of sinks specific to the dataflow.
	 */
	public List<Sink> sinks;
    
	/**
	 * Retrieve the list of coordinations specific to the dataflow.
	 */
	public List<Coordination> coordinations;
    
	/**
	 * The unique identifier of the dataflow.
	 */
	public String dataflow_id;
    
	/**
	 * Creates a new Dataflow object.
	 */
	public Dataflow() {
		annotations = new DataflowAnnotation();
		processors = new ArrayList<Processor>();
		datalinks = new ArrayList<Datalink>();
		sources = new ArrayList<Source>();
		sinks = new ArrayList<Sink>();
		coordinations = new ArrayList<Coordination>();
	}
    
	/**
	 * Retrieve beanshell processors specific to this dataflow.
	 */
	public List<Processor> beanshells() {
		ArrayList<Processor> retval = new ArrayList<Processor>();
		for(Processor x: processors) {
			if("beanshell".equals(x.type))
				retval.add(x);
		}
		
		return retval;
	}
}