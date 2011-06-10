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