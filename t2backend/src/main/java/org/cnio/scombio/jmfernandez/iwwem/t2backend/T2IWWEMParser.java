/*
	$Id$
	T2IWWEMParser.java
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
package org.cnio.scombio.jmfernandez.iwwem.t2backend;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import javax.naming.NamingException;

import net.sf.taverna.raven.launcher.Launchable;
import net.sf.taverna.t2.facade.WorkflowInstanceFacade;
import net.sf.taverna.t2.invocation.InvocationContext;
import net.sf.taverna.t2.invocation.TokenOrderException;
import net.sf.taverna.t2.invocation.WorkflowDataToken;
import net.sf.taverna.t2.provenance.ProvenanceConnectorFactory;
import net.sf.taverna.t2.provenance.ProvenanceConnectorFactoryRegistry;
import net.sf.taverna.t2.provenance.connector.ProvenanceConnector;
import net.sf.taverna.t2.reference.ReferenceService;
import net.sf.taverna.t2.workbench.reference.config.DataManagementConfiguration;
import net.sf.taverna.t2.workflowmodel.Dataflow;
import net.sf.taverna.t2.workflowmodel.DataflowInputPort;
import net.sf.taverna.t2.workflowmodel.DataflowOutputPort;
import net.sf.taverna.t2.workflowmodel.DataflowValidationReport;
import net.sf.taverna.t2.workflowmodel.EditException;
import net.sf.taverna.t2.workflowmodel.Edits;
import net.sf.taverna.t2.workflowmodel.EditsRegistry;
import net.sf.taverna.t2.workflowmodel.InvalidDataflowException;
import net.sf.taverna.t2.workflowmodel.serialization.DeserializationException;
import net.sf.taverna.t2.workflowmodel.serialization.xml.XMLDeserializer;
import net.sf.taverna.t2.workflowmodel.serialization.xml.XMLDeserializerRegistry;

import org.cnio.scombio.jmfernandez.iwwem.common.PatchDotSVG;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.DatabaseConfigurationHandler;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.InputsHandler;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.DatabaseConfigurationException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.InvalidOptionException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.OpenDataflowException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.ReadInputException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.options.T2IWWEMParserOptions;

import org.cnio.scombio.jmfernandez.iwwem.t2backend.parser.Dot;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.parser.Model;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.parser.Parser;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.parser.ParserException;

/*
import net.sf.taverna.t2.workbench.models.graph.DotWriter;
import net.sf.taverna.t2.workbench.models.graph.svg.SVGGraphController;
import net.sf.taverna.t2.workbench.models.graph.svg.SVGUtil;
import java.io.FileWriter;
*/

import org.apache.log4j.Level;
import org.apache.log4j.LogManager;
import org.apache.log4j.Logger;
import org.apache.log4j.PatternLayout;
import org.apache.log4j.PropertyConfigurator;
import org.apache.log4j.RollingFileAppender;
import org.jdom.Element;
import org.jdom.JDOMException;
import org.jdom.input.SAXBuilder;

// For image translations
import org.apache.batik.bridge.BridgeContext;
import org.apache.batik.bridge.GVTBuilder;
import org.apache.batik.bridge.UserAgentAdapter;
import org.apache.batik.dom.svg.SAXSVGDocumentFactory;
import org.apache.batik.gvt.GraphicsNode;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.batik.transcoder.image.ImageTranscoder;
import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.util.XMLResourceDescriptor;

import org.apache.fop.svg.PDFTranscoder;

import org.w3c.dom.svg.SVGDocument;


/**
 * A utility class that wraps the process of validating a workflow, allowing
 * workflows to be easily validated independently of the GUI.
 * 
 * Original author: Stuart Owen
 * @author José María Fernández
 */

public class T2IWWEMParser
	implements Launchable
{

	private static Logger logger = Logger.getLogger(T2IWWEMParser.class);
	
	static {
		// Living the headless way!
		System.setProperty("java.awt.headless","true");
	};

	/**
	 * Main method, purely for development and debugging purposes. Full
	 * execution of workflows will not work through this method.
	 * 
	 * @param args
	 * @throws Exception
	 */
	public static void main(String[] args) {
		new T2IWWEMParser().launch(args);
	}
	
	public int launch(String[] args)
	{
		try {
			Dataflow dataflow = launchInternal(args);
			return dataflow!=null ? 0 : 1;
		} catch (EditException e) {
			error("There was an error opening the workflow: " + e.getMessage(),e);
		} catch (DeserializationException e) {
			error("There was an error opening the workflow: " + e.getMessage(),e);
		} catch (InvalidDataflowException e) {
			error("There was an error validating the workflow: " + e.getMessage(),e);
		} catch (TokenOrderException e) {
			error("There was an error starting the workflow execution: " + e.getMessage(),e);
		} catch (InvalidOptionException e) {
			error(e);
		} catch (ReadInputException e) {
			error(e);
		} catch (OpenDataflowException e) {
			error(e);
		} catch (DatabaseConfigurationException e) {
			error(e);
		}
		return 0;
	}
	
	protected Dataflow launchInternal(String[] args)
		throws EditException, DeserializationException, InvalidDataflowException,
			TokenOrderException, InvalidOptionException, ReadInputException,
			OpenDataflowException, DatabaseConfigurationException
	{
		T2IWWEMParserOptions options = parseOptions(args);
		initialiseLogging(options);
		return setupAndExecute(args,options);
	}
	
	protected T2IWWEMParserOptions parseOptions(String[] args)
		throws InvalidOptionException
	{
		return new T2IWWEMParserOptions(args);
	}
	
	private void initialiseLogging(T2IWWEMParserOptions options)
	{
		LogManager.resetConfiguration();

		if (System.getProperty("log4j.configuration") == null) {
			try {
				PropertyConfigurator.configure(
					T2IWWEMParser.class.getClassLoader()
						.getResource("cl-log4j.properties")
						.toURI()
						.toURL()
				);
			} catch (MalformedURLException e) {
				logger.error(
					"There was a serious error reading the default logging configuration",
					e
				);
			} catch (URISyntaxException e) {
				logger.error(
					"There was a serious error reading the default logging configuration",
					e
				);
			}
						
		} else {			
			PropertyConfigurator.configure(System.getProperty("log4j.configuration"));
		}	
		
		if (options.hasLogFile()) {
			RollingFileAppender appender;
			try {
				PatternLayout layout = new PatternLayout("%-5p %d{ISO8601} (%c:%L) - %m%n");
				appender = new RollingFileAppender(layout, options.getLogFile());
				appender.setMaxFileSize("1MB");
				appender.setEncoding("UTF-8");
				appender.setMaxBackupIndex(4);
				// Let root logger decide level
				appender.setThreshold(Level.ALL);
				LogManager.getRootLogger().addAppender(appender);
			} catch (IOException e) {
				System.err.println("Could not log to " + options.getLogFile());
			}
		}
	}

	public Dataflow setupAndExecute(String[] args,T2IWWEMParserOptions options)
		throws InvalidOptionException, EditException, DeserializationException,
			InvalidDataflowException, TokenOrderException, ReadInputException,
			OpenDataflowException, DatabaseConfigurationException
	{
		Dataflow dataflow = null;
		if (!options.askedForHelp()) {
			setupDatabase(options);

			if (options.getWorkflow() != null) {
				URL workflowURL = readWorkflowURL(options.getWorkflow());
				
				// As this step does not depend on workflow validation
				drawDataflow(workflowURL, options);

				dataflow = openDataflow(workflowURL);
				validateDataflow(dataflow);
			}
		} else {
			options.displayHelp();
		}

		// wait until user hits CTRL-C before exiting
		if (options.getStartDatabaseOnly()) {
			// FIXME: need to do this more gracefully.
			while (true) {
				try {
					Thread.sleep(500);
				} catch (InterruptedException e) {
					return dataflow;
				}
			}
		}

		return dataflow;
	}

	protected void validateDataflow(Dataflow dataflow)
		throws InvalidDataflowException
	{
		// FIXME: this needs expanding upon to give more details info back to
		// the user
		// FIXME: added a getMessage to InvalidDataflowException may be good
		// place to do this.
		DataflowValidationReport report = dataflow.checkValidity();
		if (!report.isValid()) {
			throw new InvalidDataflowException(dataflow, report);
		}
	}
	
	protected void drawDataflow(URL dataflowURL,T2IWWEMParserOptions options)
		throws OpenDataflowException, ReadInputException
	{
		String dotFilename = options.getDOTFile();
		String svgFilename = options.getSVGFile();
		String pngFilename = options.getPNGFile();
		String pdfFilename = options.getPDFFile();
		
		// Working only when it is needed
		if(dotFilename!=null || svgFilename!=null || pngFilename!=null || pdfFilename!=null) {
			
			try {
				File dotFile = (dotFilename!=null)?new File(dotFilename):File.createTempFile("IWWEM","t2");
				
				try {
					PrintStream printStream = new PrintStream(dotFile,"UTF-8");
					Parser t2parser = new Parser();
					InputStream dataflowStream = dataflowURL.openStream();
					Model model = null;
					try {
						model = t2parser.parse(dataflowStream);
					} catch(ParserException pe) {
						throw new OpenDataflowException("Ruby-based parsed failed!",pe);
					}
					
					Dot dotgen = new Dot("all");
					dotgen.write_dot(printStream,model);
					printStream.close();
					
					if(svgFilename!=null || pngFilename!=null || pdfFilename!=null) {
						File SVGFile = (svgFilename!=null)?new File(svgFilename):File.createTempFile("IWWEM","t2");
						
						try {
							Runtime r = Runtime.getRuntime();
							String[] dotParams = {"dot","-Tsvg","-o"+SVGFile.getAbsolutePath(),dotFile.getAbsolutePath()};
							Process p = r.exec(dotParams);
							int retval = -1;
							
							try {
								retval = p.waitFor();
							} catch(InterruptedException ie) {
								throw new ReadInputException("Unexpected interruption on dot call",ie);
							}
							
							// Was the SVG properly generated?
							if(retval==0) {
								String parser = XMLResourceDescriptor.getXMLParserClassName();
								SAXSVGDocumentFactory f = new SAXSVGDocumentFactory(parser);
								SVGDocument svg = f.createSVGDocument(SVGFile.toURI().toString());
								
								PatchDotSVG pds = new PatchDotSVG();
								pds.doPatch(svg,SVGFile);

								if(pdfFilename!=null) {
									File PDFFile = new File(pdfFilename);
									// Create a PDF transcoder
									PDFTranscoder pdft = new PDFTranscoder();

									TranscoderInput input = new TranscoderInput(svg);

									// Create the transcoder output.
									FileOutputStream foe = new FileOutputStream(PDFFile);
									TranscoderOutput output = new TranscoderOutput(foe);

									// Save the PDF
									try {
										pdft.transcode(input, output);
									} catch(TranscoderException te) {
										logger.fatal("Transcoding to PDF failed",te);
										// System.exit(1);
									} finally {
										// Flush and close the stream.
										foe.flush();
										foe.close();
									}
								}
								
								if(pngFilename!=null) {
									File PNGFile = new File(pngFilename);
									// Create a PNG transcoder
									PNGTranscoder pngt = new PNGTranscoder();

									// Set the transcoding hints.
									// Transparent background must be white pixels
									// and we are using a reduced color palette
									pngt.addTranscodingHint(ImageTranscoder.KEY_FORCE_TRANSPARENT_WHITE,new Boolean(true));
									pngt.addTranscodingHint(PNGTranscoder.KEY_INDEXED, new Integer(8));

									TranscoderInput input = new TranscoderInput(svg);

									// Create the transcoder output.
									FileOutputStream foe = new FileOutputStream(PNGFile);
									TranscoderOutput output = new TranscoderOutput(foe);

									// Save the image.
									try {
										pngt.transcode(input, output);
									} catch(TranscoderException te) {
										logger.fatal("Transcoding to PNG failed",te);
										// System.exit(1);
									} finally {
										// Flush and close the stream.
										foe.flush();
										foe.close();
									}
								}
							} else {
							}
						} finally {
							if(svgFilename==null) {
								SVGFile.delete();
							}
						}
					}
				} finally {
					// Erasing temp file
					if(dotFilename==null) {
						dotFile.delete();
					}
				}
			} catch(IOException ioe) {
				throw new ReadInputException("Error meanwhile doing I/O on graph drawing generation",ioe);
			}
		}
		
	/*
		try {
			SVGGraphController graphController = new SVGGraphController(dataflow,false,null);
			FileWriter fileWriter = new FileWriter("/tmp/prueba.svg");
			DotWriter dotWriter = new DotWriter(fileWriter);
			dotWriter.writeGraph(graphController.getGraph());
			fileWriter.close();
			// String layout = SVGUtil.getDot(stringWriter.toString());
		} catch(IOException ioe) {
			throw new DeserializationException(ioe.getMessage());
		}
	*/
	}

	private void setupDatabase(T2IWWEMParserOptions options)
		throws DatabaseConfigurationException
	{
		DatabaseConfigurationHandler dbHandler = new DatabaseConfigurationHandler(options);
		dbHandler.configureDatabase();
		if (!options.isInMemory()) {
			try {
				dbHandler.testDatabaseConnection();
			} catch (NamingException e) {
				throw new DatabaseConfigurationException(
					"There was an error trying to setup the database datasource: " + e.getMessage(),
					e
				);
			} catch (SQLException e) {
				if (options.isClientServer()) {
					throw new DatabaseConfigurationException(
						"There was an error whilst making a test database connection. If running with -clientserver you should check that a server is running (check -startdb or -dbproperties)",
						e
					);
				}
				if (options.isEmbedded()) {
					throw new DatabaseConfigurationException(
						"There was an error whilst making a test database connection. If running with -embedded you should make sure that another process isn't using the database, or a server running through -startdb",
						e
					);
				}
			}
		}
	}

	protected void error(String msg)
	{
		error(msg,null);
	}

	protected void error(Throwable t)
	{
		error(null,t);
	}

	protected void error(String msg, Throwable t)
	{
		if(msg!=null)
			System.err.println(msg);
		
		if(t!=null) {
			if(msg==null)
				System.err.println(t.getMessage());
			t.printStackTrace();
		}
		System.exit(-1);
	}

	private URL readWorkflowURL(String workflowOption)
		throws OpenDataflowException
	{
		URL url;
		try {
			url = new URL("file:");
			return new URL(url, workflowOption);
		} catch (MalformedURLException e) {
			throw new OpenDataflowException(
				"The was an error processing the URL to the workflow: " + e.getMessage(),
				e
			);
		}
	}

	protected Dataflow openDataflow(URL workflowURL)
		throws DeserializationException, EditException, OpenDataflowException
	{
		XMLDeserializer deserializer = XMLDeserializerRegistry.getInstance().getDeserializer();
		SAXBuilder builder = new SAXBuilder();
		Element el;
		try {
			InputStream stream = workflowURL.openStream();
			el = builder.build(stream).detachRootElement();
		} catch (JDOMException e) {
			throw new OpenDataflowException(
				"There was a problem processing the workflow XML: " + e.getMessage(),
				e
			);
		} catch (IOException e) {
			throw new OpenDataflowException(
				"There was a problem reading the workflow file: " + e.getMessage(),
				e
			);
		}
		return deserializer.deserializeDataflow(el);
	}

}
