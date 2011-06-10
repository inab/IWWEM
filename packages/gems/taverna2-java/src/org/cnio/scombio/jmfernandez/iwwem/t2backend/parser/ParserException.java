package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

public class ParserException
	extends Exception
{
	public ParserException(String message) {
		super(message);
	}
	
	public ParserException(Throwable cause) {
		super(cause);
	}
	
	public ParserException(String message, Throwable cause) {
		super(message,cause);
	}
}