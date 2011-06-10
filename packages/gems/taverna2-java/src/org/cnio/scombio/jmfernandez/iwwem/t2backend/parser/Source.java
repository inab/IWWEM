package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

import java.util.ArrayList;
import java.util.List;

/**
 * This is the start node of a Datalink.  Each source has a name and a port
 * which is seperated by a colon; ":".
 * This is represented as "source of a processor:port_name".
 * A string that does not contain a colon can often be returned, signifiying
 * a workflow source as opposed to that of a processor.
 */
public class Source {
	public String name;
	
	public List<String> descriptions;
	
	public List<String> example_values;
	
	public Source() {
		descriptions = new ArrayList<String>();
		example_values = new ArrayList<String>();
	}
}
