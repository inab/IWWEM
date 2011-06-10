package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

/**
 * This is a representation of the 'Run after...' function in Taverna
 * where the selected processor or workflow is set to run after another.
 */
public class Coordination {
	/**
	 * The name of the processor/workflow which is to run first.
	 */
	public String control;
	
	/**
	 * The name of the processor/workflow which is to run after the control.
	 */
	public String target;
}