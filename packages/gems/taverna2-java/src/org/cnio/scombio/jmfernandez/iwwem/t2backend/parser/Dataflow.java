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