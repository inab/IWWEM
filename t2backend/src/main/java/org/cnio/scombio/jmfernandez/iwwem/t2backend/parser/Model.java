/*
	$Id$
	Model.java
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
import java.util.regex.Pattern;

/**
 * The model for a given Taverna 2 workflow.
 */
public class Model {
	/**
	 * The list of all the dataflows that make up the workflow.
	 */
	public List<Dataflow> dataflows;
	/**
	 * The list of any dependencies that have been found inside the workflow.
	 */
	public List<String> dependencies;
	
	/**
	 * Creates an empty model for a Taverna 2 workflow.
	 */
	public Model() {
		dataflows = new ArrayList<Dataflow>();
		dependencies = new ArrayList<String>();
	}
	
	/**
	 * Retrieve the top level dataflow ie the MAIN (containing) dataflow
	 */
	public Dataflow main()
		throws IndexOutOfBoundsException
	{
		return dataflows.get(0);
	}
	
	/**
	 * Retrieve the dataflow with the given ID
	 */
	public Dataflow dataflow(String df_id) {
		
		for(Dataflow df: dataflows) {
			if(df_id.equals(df.dataflow_id)) {
				return df;
			}
		}
		
		return null;
	}
	
	/**
	 * Retrieve ALL the processors containing beanshells within the workflow.
	 */
	public List<Processor> beanshells() {
		ArrayList<Processor> retval = new ArrayList<Processor>();
		
		for(Processor proc: all_processors()) {
			if("beanshell".equals(proc.type)) {
				retval.add(proc);
			}
		}
		
		return retval;
	}
	
	/**
	 * Retrieve ALL processors of that are webservices WITHIN the model.
	 */
	public List<Processor> web_services() {
		ArrayList<Processor> retval = new ArrayList<Processor>();
		Pattern pat = Pattern.compile("wsdl|soaplab|biomoby",Pattern.CASE_INSENSITIVE);
		
		for(Processor proc: all_processors()) {
			if(pat.matcher(proc.type).matches()) {
				retval.add(proc);
			}
		}
		
		return retval;
	}
	
	/**
	 * Retrieve ALL local workers WITHIN the workflow
	 */
	public List<Processor> local_workers() {
		ArrayList<Processor> retval = new ArrayList<Processor>();
		Pattern pat = Pattern.compile("local",Pattern.CASE_INSENSITIVE);
		
		for(Processor proc: all_processors()) {
			if(pat.matcher(proc.type).matches()) {
				retval.add(proc);
			}
		}
		
		return retval;
	}
	
	/**
	 * Retrieve the datalinks from the top level of a nested workflow.
	 * If the workflow is not nested, retrieve all datalinks.
	 */
	public List<Datalink> datalinks()
		throws IndexOutOfBoundsException
	{
		return main().datalinks;
	}
	
	/**
	 * Retrieve ALL the datalinks within a nested workflow
	 */
	public List<Datalink> all_datalinks() {
		ArrayList<Datalink> retval = new ArrayList<Datalink>();
		
		for(Dataflow df: dataflows) {
			retval.addAll(df.datalinks);
		}
		
		return retval;
	}
	
	/**
	 * Retrieve the annotations specific to the workflow.  This does not return 
	 * any annotations from workflows encapsulated within the main workflow.
	 */
	public DataflowAnnotation annotations()
		throws IndexOutOfBoundsException
	{
		return main().annotations;
	}
	
	/**
	 * Retrieve processors from the top level of a nested workflow.
	 * If the workflow is not nested, retrieve all processors.
	 */
	public List<Processor> processors()
		throws IndexOutOfBoundsException
	{
		return main().processors;
	}
	
	/**
	 * Retrieve ALL the processors found in a nested workflow
	 */
	public List<Processor> all_processors() {
		ArrayList<Processor> retval = new ArrayList<Processor>();
		
		for(Dataflow df: dataflows) {
			retval.addAll(df.processors);
		}
		
		return retval;
	}
	
	/**
	 * Retrieve the sources(inputs) to the workflow
	 */
	public List<Source> sources()
		throws IndexOutOfBoundsException
	{
		return main().sources;
	}
	
	/**
	 * Retrieve ALL the sources(inputs) within the workflow
	 */
	public List<Source> all_sources() {
		ArrayList<Source> retval = new ArrayList<Source>();
		
		for(Dataflow df: dataflows) {
			retval.addAll(df.sources);
		}
		
		return retval;
	}
	
	/**
	 * Retrieve the sinks(outputs) to the workflow
	 */
	public List<Sink> sinks()
		throws IndexOutOfBoundsException
	{
		return main().sinks;
	}
	
	/**
	 * Retrieve ALL the sinks(outputs) within the workflow
	 */
	public List<Sink> all_sinks() {
		ArrayList<Sink> retval = new ArrayList<Sink>();
		
		for(Dataflow df: dataflows) {
			retval.addAll(df.sinks);
		}
		
		return retval;
	}
	
	/**
	 * Retrieve the unique dataflow ID for the top level dataflow.
	 */
	public String model_id()
		throws IndexOutOfBoundsException
	{
		return main().dataflow_id;
	}
	
	/**
	 * For the given dataflow, return the beanshells and/or services which
	 * have direct links to or from the given processor.
	 * If no dataflow is specified, the top-level dataflow is used.
	 * This does a recursive search in nested workflows.
	 * == Usage
	 *   my_processor = model.processor[0]
	 *   linked_processors = model.get_processors_linked_to(my_processor)
	 *   processors_feeding_into_my_processor = linked_processors.sources
	 *   processors_feeding_from_my_processor = linked_processors.sinks
	 */
	public ProcessorLinks get_processor_links(Processor processor) {
		if(processor==null)
			return null;
		
		ProcessorLinks proc_links = new ProcessorLinks();
		
		ArrayList<Datalink> sources = new ArrayList<Datalink>();
		ArrayList<Datalink> sinks = new ArrayList<Datalink>();
		
		Pattern pPat = Pattern.compile(processor.name+":.+");
		
		for(Datalink dl: all_datalinks()) {
			// SOURCES
			if(pPat.matcher(dl.sink).matches()) {
				sources.add(dl);
			}
			// SINKS
			if(pPat.matcher(dl.source).matches()) {
				sinks.add(dl);
			}
		}
		proc_links.sources.clear();
		proc_links.sinks.clear();
		ArrayList<Datalink> temp_sinks = new ArrayList<Datalink> (sinks);
		
		// Match links by port into format
		// my_port:name_of_link_im_linked_to:its_port
		for(Datalink connection: sources) {
			String link = connection.sink;
			String splitted[] = link.split(":");
			String connected_proc_name = splitted[0];
			String my_connection_port = (splitted.length > 1)?splitted[1]:null;
			
			if(my_connection_port != null && my_connection_port.length()>0 && connection.source !=null && connection.source.length()>0) {
				proc_links.sources.add(my_connection_port + ":" + connection.source);
			}
		}
		
		for(Datalink connection: sinks) {
			String link = connection.source;
			String splitted[] = link.split(":");
			String connected_proc_name = splitted[0];
			String my_connection_port = (splitted.length > 1)?splitted[1]:null;
			
			if(my_connection_port != null && my_connection_port.length()>0 && connection.sink !=null && connection.sink.length()>0) {
				proc_links.sinks.add(my_connection_port + ":" + connection.sink);
			}
		}
		
		return proc_links;
	}
}