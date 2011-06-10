package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

import java.util.ArrayList;
import java.util.List;

/** 
 * This is the annotation object specific to the dataflow it belongs to.
 * A DataflowAnnotation contains metadata about a given dataflow element.
 */
public class DataflowAnnotation {
	/**
	 * The name used of the dataflow
	 */
	public String name;
	
	/**
	 * A list of titles that have been assigned to the dataflow.
	 */
	public List<String> titles;
	
	/**
	 * A list ot descriptive strings about the dataflow.
	 */
	public List<String> descriptions;
	
	/**
	 * A list of authors of the dataflow
	 */
	public List<String> authors;
	
	public DataflowAnnotation() {
		descriptions = new ArrayList<String>();
		authors = new ArrayList<String>();
		titles = new ArrayList<String>();
	}
}
