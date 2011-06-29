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
public class T2IWWEMLauncherOptions
	extends T2IWWEMParserOptions
{

	private static final Logger logger = Logger
			.getLogger(T2IWWEMLauncherOptions.class);
	private CommandLine commandLine;

	public T2IWWEMLauncherOptions(String[] args)
		throws InvalidOptionException
	{
		super(args);
	}

	protected void checkForInvalid()
		throws InvalidOptionException
	{
		super.checkForInvalid();
		
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
	
	/**
	 * 
	 * @return the directory to write the results to
	 */
	public String getOutputDirectory() {
		return getOptionValue("outputDir");
	}

	/**
	 * 
	 * @return the path to the output document
	 */
	public String getOutputDocument() {
		return getOptionValue("outputDoc");
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
	protected Options initialiseOptions() {
		Option outputOption = OptionBuilder
				.withArgName("directory")
				.hasArg()
				.withDescription(
						"save outputs as files in directory, default "
								+ "is to make a new directory workflowName_output")
				.create("outputDir");

		Option outputdocOption = OptionBuilder.withArgName("document")
				.hasArg()
				.withDescription("save outputs to a new Baclava document")
				.create("outputDoc");

		Option inputdocOption = OptionBuilder.withArgName("document")
				.hasArg()
				.withDescription("load inputs from a Baclava document")
				.create("inputDoc");

		Option inputFileOption = OptionBuilder
				.withArgName("inputname filename").hasArgs(2)
				.withValueSeparator(' ').withDescription(
						"load the named input from file or URL").create(
						"inputFile");

		Option inputValueOption = OptionBuilder.withArgName("inputname value")
				.hasArgs(2).withValueSeparator(' ').withDescription(
						"directly use the value for the named input").create(
						"input");

		Option inputDelimiterOption = OptionBuilder
				.withArgName("inputname delimiter")
				.hasArgs(2)
				.withValueSeparator(' ')
				.withDescription(
						"causes an inputvalue or inputfile to be split into a list according to the delimiter. The associated workflow input must be expected to receive a list")
				.create("inputdelimiter");

		Options options = super.initialiseOptions();
		options.addOption(inputFileOption);
		options.addOption(inputValueOption);
		options.addOption(inputDelimiterOption);
		options.addOption(inputdocOption);
		options.addOption(outputOption);
		options.addOption(outputdocOption);
		
		return options;

	}

	/**
	 * Save the results to a directory if -output has been explicitly defined,
	 * and/or if -outputDoc hasn't been defined
	 * 
	 * @return boolean
	 */
	public boolean saveResultsToDirectory() {
		return (options.hasOption("outputDir") ||
			!options.hasOption("outputDoc"));
	}
}
