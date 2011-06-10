/*
	$Id$
	T2IWWEMLauncherOptions.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008-2011
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
	
	This modified file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.

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

/* Original Copyright */
/*******************************************************************************
 * Copyright (C) 2007 The University of Manchester   
 * 
 *  Modifications to the initial code base are copyright of their
 *  respective authors, or their employers as appropriate.
 * 
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public License
 *  as published by the Free Software Foundation; either version 2.1 of
 *  the License, or (at your option) any later version.
 *    
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Lesser General Public License for more details.
 *    
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 ******************************************************************************/
package org.cnio.scombio.jmfernandez.iwwem.t2backend.options;

import java.io.IOException;
import java.io.InputStream;

import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.InvalidOptionException;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.GnuParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.OptionBuilder;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.commons.io.IOUtils;
import org.apache.log4j.Logger;

/**
 * Handles the processing of command line arguments for enacting a workflow.
 * This class encapsulates all command line options, and exposes them through higher-level
 * accessors. Upon creation it checks the validity of the command line options and raises an
 * {@link InvalidOptionException} if they are invalid.
 * 
 * @author Stuart Owen
 * @author José María Fernández
 *
 */
public class T2IWWEMLauncherOptions {

	private static final Logger logger = Logger
			.getLogger(T2IWWEMLauncherOptions.class);
	private Options options;
	private CommandLine commandLine;

	public T2IWWEMLauncherOptions(String[] args) throws InvalidOptionException {
		this.options = intitialiseOptions();
		this.commandLine = processArgs(args);		
		checkForInvalid();
	}

	public boolean askedForHelp() {
		return hasOption("help") || (getArgs().length==0 && getOptions().length==0);
	}

	protected void checkForInvalid() throws InvalidOptionException {
		if (askedForHelp()) return;
		if (hasOption("provenance")
				&& !(hasOption("embedded") || hasOption("clientserver") || hasOption("dbproperties")))
			throw new InvalidOptionException(
					"You should be running with a database to use provenance");
		if (hasOption("provenance") && hasOption("inmemory"))
			throw new InvalidOptionException(
					"You should be running with a database to use provenance");
		if ((hasOption("inputfile") || hasOption("inputvalue"))
				&& hasOption("inputdoc"))
			throw new InvalidOptionException(
					"You can't provide both -input and -inputdoc arguments");
		
		if (hasOption("inputdelimiter") && hasOption("inputdoc"))
			throw new InvalidOptionException("You cannot combine the -inputdelimiter and -inputdoc arguments");

		if (getArgs().length == 0
				&& !(hasOption("help") || hasOption("startdb")))
			throw new InvalidOptionException("You must specify a workflow");
		
		if (hasOption("inmemory") && hasOption("embedded"))
			throw new InvalidOptionException(
					"The options -embedded, -clientserver and -inmemory cannot be used together");
		if (hasOption("inmemory") && hasOption("clientserver"))
			throw new InvalidOptionException(
					"The options -embedded, -clientserver and -inmemory cannot be used together");
		if (hasOption("embedded") && hasOption("clientserver"))
			throw new InvalidOptionException(
					"The options -embedded, -clientserver and -inmemory cannot be used together");
	}

	public void displayHelp() {
		boolean full = false;
		if (hasOption("help")) full=true;
		displayHelp(full);
	}

	public void displayHelp(boolean showFullText) {

		HelpFormatter formatter = new HelpFormatter();
		try {
			formatter
					.printHelp("executeworkflow [options] [workflow]", options);
			if (showFullText) {
				InputStream helpStream = T2IWWEMLauncherOptions.class
						.getClassLoader().getResourceAsStream("help.txt");
				String helpText = IOUtils.toString(helpStream);
				System.out.println(helpText);
			}

		} catch (IOException e) {
			logger.error("Error reading the help document", e);
			System.exit(-1);
		}
	}

	public String[] getArgs() {
		return commandLine.getArgs();
	}		
	
	/**
	 * 
	 * @return the port that the database should run on
	 */
	public String getDatabasePort() {
		return getOptionValue("port");
	}

	/**
	 * 
	 * @return a path to a properties file that contains database configuration
	 *         settings
	 */
	public String getDatabaseProperties() {
		return getOptionValue("dbproperties");
	}

	/**
	 * 
	 * @return the path to the input document
	 */
	public String getInputDocument() {
		return getOptionValue("inputdoc");
	}

	/**
	 * Returns an array that alternates between a portname and path to a file
	 * containing the input values. Therefore the array will always contain an
	 * even number of elements
	 * 
	 * @return an array of portname and path to files containing individual
	 *         inputs.
	 */
	public String[] getInputFiles() {
		if (hasInputFiles()) {
			return getOptionValues("inputfile");
		} else {
			return new String[] {};
		}
	}

	public String[] getInputValues() {
		if (hasInputValues()) {
			return getOptionValues("inputvalue");
		} else {
			return new String[] {};
		}
	}
	
	public String getSVGFile() {
		return getOptionValue("svggraph");
	}
	
	public String getDOTFile() {
		return getOptionValue("dotgraph");
	}
	
	public String getPNGFile() {
		return getOptionValue("pnggraph");
	}
	
	public String getPDFFile() {
		return getOptionValue("pdfgraph");
	}
	
	public String getLogFile() {
		return getOptionValue("logfile");
	}

	public Option [] getOptions() {
		return commandLine.getOptions();
	}

	private String getOptionValue(String opt) {
		return commandLine.getOptionValue(opt);
	}

	private String[] getOptionValues(String arg0) {
		return commandLine.getOptionValues(arg0);
	}

	/**
	 * 
	 * @return the directory to write the results to
	 */
	public String getOutputDirectory() {
		return getOptionValue("outputdir");
	}

	/**
	 * 
	 * @return the path to the output document
	 */
	public String getOutputDocument() {
		return getOptionValue("outputdoc");
	}

	public boolean getStartDatabase() {
		return hasOption("startdb");
	}

	public boolean getStartDatabaseOnly()
		throws InvalidOptionException
	{
		return (getStartDatabase() && (getWorkflow() == null));
	}

	public String getWorkflow()
		throws InvalidOptionException
	{
		if (getArgs().length == 0) {
			return null;
		} else if (getArgs().length != 1) {
			throw new InvalidOptionException(
					"You should only specify one workflow file");
		} else {
			return getArgs()[0];
		}
	}

	public boolean hasDelimiterFor(String inputName) {
		boolean result = false;
		if (hasOption("inputdelimiter")) {
			String [] values = getOptionValues("inputdelimiter");
			for (int i=0;i<values.length;i+=2) {
				if (values[i].equals(inputName))
				{
					result=true;
					break;
				}
			}
		}
		return result;
	}

	public boolean hasInputFiles() {
		return hasOption("inputfile");
	}

	public boolean hasInputValues() {
		return hasOption("inputvalue");
	}

	public boolean hasLogFile() {
		return hasOption("logfile");
	}

	public boolean hasOption(String option) {
		return commandLine.hasOption(option);
	}

	public String inputDelimiter(String inputName) {
		String result = null;
		if (hasOption("inputdelimiter")) {
			String [] values = getOptionValues("inputdelimiter");
			for (int i=0;i<values.length;i+=2) {
				if (values[i].equals(inputName))
				{
					result=values[i+1];
					break;
				}
			}
		}
		return result;
	}

	@SuppressWarnings("static-access")
	private Options intitialiseOptions() {
		Option helpOption = new Option("help", "displays comprehensive help information");

		Option outputOption = OptionBuilder
				.withArgName("directory")
				.hasArg()
				.withDescription(
						"save outputs as files in directory, default "
								+ "is to make a new directory workflowName_output")
				.create("outputdir");

		Option outputdocOption = OptionBuilder.withArgName("document").hasArg()
				.withDescription("save outputs to a new Baclava document")
				.create("outputdoc");

		Option logFileOption = OptionBuilder
				.withArgName("filename")
				.hasArg()
				.withDescription(
						"the logfile to which more verbose logging will be written to")
				.create("logfile");

		Option inputdocOption = OptionBuilder.withArgName("document").hasArg()
				.withDescription("load inputs from a Baclava document").create(
						"inputdoc");

		Option inputFileOption = OptionBuilder
				.withArgName("inputname filename").hasArgs(2)
				.withValueSeparator(' ').withDescription(
						"load the named input from file or URL").create(
						"inputfile");

		Option inputValueOption = OptionBuilder.withArgName("inputname value")
				.hasArgs(2).withValueSeparator(' ').withDescription(
						"directly use the value for the named input").create(
						"inputvalue");

		Option inputDelimiterOption = OptionBuilder
				.withArgName("inputname delimiter")
				.hasArgs(2)
				.withValueSeparator(' ')
				.withDescription(
						"causes an inputvalue or inputfile to be split into a list according to the delimiter. The associated workflow input must be expected to receive a list")
				.create("inputdelimiter");

		Option dbProperties = OptionBuilder.withArgName("filename").hasArg()
				.withDescription(
						"loads a properties file to configure the database")
				.create("dbproperties");

		Option port = OptionBuilder
				.withArgName("portnumber")
				.hasArg()
				.withDescription(
						"the port that the database is running on. If set requested to start its own internal server, this is the start port that will be used.")
				.create("port");

		Option embedded = new Option("embedded",
				"connects to an embedded Derby database. This can prevent mulitple invocations");
		Option clientserver = new Option("clientserver",
				"connects as a client to a derby server instance.");
		Option inMemOption = new Option(
				"inmemory",
				"runs the workflow with data stored in-memory rather than in a database. This can give performance inprovements, at the cost of overall memory usage");
		Option startDB = new Option("startdb",
				"automatically starts an internal Derby database server.");
		Option provenance = new Option("provenance",
				"generates provenance information and stores it in the database.");
		Option svgGraph = OptionBuilder
				.withArgName("svgFile")
				.hasArg()
				.withDescription(
					"File where to save workflow graph in SVG format")
				.create("svggraph");
		Option dotGraph = OptionBuilder
				.withArgName("dotFile")
				.hasArg()
				.withDescription(
					"File where to save workflow graph in DOT format")
				.create("dotgraph");
		Option pngGraph = OptionBuilder
				.withArgName("pngFile")
				.hasArg()
				.withDescription(
					"File where to save workflow graph in PNG format")
				.create("pnggraph");
		Option pdfGraph = OptionBuilder
				.withArgName("pdfFile")
				.hasArg()
				.withDescription(
					"File where to save workflow graph in PDF format")
				.create("pdfgraph");
		
		Options options = new Options();
		options.addOption(helpOption);
		options.addOption(inputFileOption);
		options.addOption(inputValueOption);
		options.addOption(inputDelimiterOption);
		options.addOption(inputdocOption);
		options.addOption(outputOption);
		options.addOption(outputdocOption);
		
		options.addOption(svgGraph);
		options.addOption(dotGraph);
		options.addOption(pngGraph);
		options.addOption(pdfGraph);
		
		options.addOption(inMemOption);
		options.addOption(embedded);
		options.addOption(clientserver);
		options.addOption(dbProperties);
		options.addOption(port);
		options.addOption(startDB);
		options.addOption(provenance);
		options.addOption(logFileOption);

		return options;

	}

	public boolean isClientServer() {
		return hasOption("clientserver");
	}

	public boolean isEmbedded() {
		return hasOption("embedded");
	}

	public boolean isInMemory() {
		return hasOption("inmemory");
	}

	private CommandLine processArgs(String[] args) {
		CommandLineParser parser = new GnuParser();
		CommandLine line = null;
		try {
			// parse the command line arguments
			line = parser.parse(options, args);
		} catch (ParseException exp) {
			// oops, something went wrong
			System.err.println("Parsing failed.  Reason: " + exp.getMessage());
			System.exit(1);
		}
		return line;
	}

	/**
	 * Save the results to a directory if -output has been explicitly defined,
	 * and/or if -outputdoc hasn't been defined
	 * 
	 * @return boolean
	 */
	public boolean saveResultsToDirectory() {
		return (options.hasOption("outputdir") || !options
				.hasOption("outputdoc"));
	}
}
