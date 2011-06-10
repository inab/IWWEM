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