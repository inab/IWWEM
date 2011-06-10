package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

/**
 * This represents a connection between any of the following pair of entities:
 * {processor -> processor}, {workflow -> workflow}, {workflow -> processor}, 
 * and {processor -> workflow}.
 */
public class Datalink {
	/**
	 * The name of the source (the starting point of the connection).
	 */
	public String source;
	
	/**
	 * The name of the source port (if available)
	 */
	public String source_port;
	
	/**
	 * The name of the sink (the endpoint of the connection).
	 */
	public String sink;
	
	/**
	 * The name of the sink port (if available)
	 */
	public String sink_port;
}
