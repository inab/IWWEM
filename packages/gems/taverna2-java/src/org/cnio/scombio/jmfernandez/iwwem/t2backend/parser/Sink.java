package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

import java.util.ArrayList;
import java.util.List;

/**
 * This is the start node of a Datalink.  Each sink has a name and a port
 * which is seperated by a colon; ":".
 * This is represented as "sink of a processor:port_name".
 * A string that does not contain a colon can often be returned, signifiying
 * a workflow sink as opposed to that of a processor.
 */
public class Sink {
	public String name;
	
	public List<String> descriptions;
	
	public List<String> example_values;
	
	public Sink() {
		descriptions = new ArrayList<String>();
		example_values = new ArrayList<String>();
	}
}
