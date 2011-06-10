/*
	$Id$
	Processor.java
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
 * This is the (shim) object within the workflow.  This can be a beanshell,
 * a webservice, a workflow, etc...
 */
public class Processor {
	/**
	 *  A string containing name of the processor.
	 */
	public String name;
    
	/**
	 * A string containing the description of the processor if available.  
	 * Returns nil otherwise.
	 */
	public String description;
    
	/**
	 * A string for the type of processor, e.g. beanshell, workflow, webservice, etc...
	 */
	public String type;
    
	/**
	 * For processors that have type "dataflow", this is the the reference 
	 * to the dataflow.  For all other processor types, this is nil.
	 */
	public String dataflow_id;
    
	/**
	 * This only has a value in beanshell processors.  This is the actual script
	 * embedded with the processor which does all the "work"
	 */
	public String script;
    
	/**
	 * This is a list of inputs that the processor can take in.
	 */
	public List<String> inputs;
    
	/**
	 * This is a list of outputs that the processor can produce.
	 */
	public List<String> outputs;
    
	/**
	 * For processors of type "arbitrarywsdl", this is the URI to the location
	 * of the wsdl file.
	 */
	public String wsdl;
    
	/**
	 * For processors of type "arbitrarywsdl", this is the operation invoked.
	 */
	public String wsdl_operation;
    
	/**
	 * For soaplab and biomoby services, this is the endpoint URI.
	 */
	public String endpoint;
    
	/**
	 * Authority name for the biomoby service.
	 */
	public String biomoby_authority_name;

	/**
	 * Service name for the biomoby service. This is not necessarily the same 
	 * as the processors name.
	 */
	public String biomoby_service_name;
    
	/**
	 * Category for the biomoby service.
	 */
	public String biomoby_category;
	
	public Processor() {
		inputs = new ArrayList<String>();
		outputs = new ArrayList<String>();
	}
}