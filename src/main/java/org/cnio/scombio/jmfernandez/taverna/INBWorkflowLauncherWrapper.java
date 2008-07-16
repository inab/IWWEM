/*
	$Id$
	INBWorkflowLauncherWrapper.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/
package org.cnio.scombio.jmfernandez.taverna;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStreamReader;
import java.io.IOException;
import java.io.PrintStream;

import java.net.URL;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;
import org.apache.log4j.Level;
import org.apache.log4j.PropertyConfigurator;

import org.embl.ebi.escience.baclava.DataThing;
import org.embl.ebi.escience.baclava.factory.DataThingFactory;

import org.embl.ebi.escience.scufl.enactor.WorkflowSubmissionException;
import org.embl.ebi.escience.scufl.ScuflModel;
import org.embl.ebi.escience.scufl.tools.WorkflowLauncher;

import org.jdom.JDOMException;

// SVGDocument is a Document!!!
//import org.w3c.dom.svg.SVGDocument;

import uk.ac.soton.itinnovation.freefluo.main.InvalidInputException;

public class INBWorkflowLauncherWrapper
	extends INBWorkflowParserWrapper
{
	private static final String SCRIPT_NAME="inbworkflowlauncher";
	
	private static final String[][] ParamDescs={
		{"-inputDoc","1","A bunch of workflow inputs, encoded in a Baclava document"},
		{"-input","2","A single pair input name / value"},
		{"-inputFile","2","A single pair input name / file where the value is stored"},
		{"-inputURL","2","A single pair input name / URL where the value can be fetched"},
		{"-inputMap","1","A file containing tuples of input name / file encoding / one or more files. Each field is tab-separated"},
		{"-inputArray","2","A single pair input name / file where a list of values are stored"},
		{"-inputArrayFile","2","A single pair input name / file which contains a list of file names which contain the values"},
		{"-inputArrayDir","2","A single pair input name / directory where files with the values are stored"},
		{"-saveInputs","1","All the inputs, saved in a Baclava document"},
		{"-onlySaveInputs","1","All the inputs, saved in a Baclava document, but no enaction!"},
		{"-outputDoc","1","All the workflow outputs, saved in a Baclava document"},
		{"-outputDir","1","All the workflow outputs, saved in a directory which will contain the structure of the outputs"},
		{"-report","1","Taverna XML report file"},
		{"-statusDir","1","Directory where all the intermediate results and events are saved"},
	};
	
	private static Logger logger;
	
	// Filling the parameters hash!
	static {
		// Some checks should be put here for these system properties...
		File log4j=new File(new File(System.getProperty("basedir"),"conf"),"log4j.properties");
		PropertyConfigurator.configure(log4j.getAbsolutePath());
		logger = Logger.getLogger(INBWorkflowLauncherWrapper.class);
		
		// Now, hash filling
		FillHashMap(ParamDescs);
	};
	
	File outputDocumentFile;
	
	File outputDir;
	
	File reportFile;
	
	File statusDir;
	
	File saveInputFile;
	
	boolean onlySave=false;
	
	protected HashMap<String, DataThing> baseInputs = new HashMap<String, DataThing>();
	
	public static void main(String[] args) {
		try {
			new INBWorkflowLauncherWrapper().run(args);
		} catch (Exception e) {
			e.printStackTrace();
			System.exit(1);
		}
	}

	/**
	 * The execution entry point, called by {@link #main(String[])}
	 *
	 * @param args
	 *            the arguments as passed to {@link #main(String[])}
	 * @throws Exception if anything goes wrong
	 */
	public ScuflModel run(String[] args)
		throws Exception
	{
		// All the tasks from parent (including parameter parsing) have been done
		ScuflModel model=super.run(args);
		
		if(model!=null && !onlySave) {
			WorkflowLauncher launcher = new WorkflowLauncher(model);
			
			logger.debug("And now, executing workflow!!!!!");

			Map<String, DataThing> outputs=null;
			try {
				if(statusDir!=null) {
					// The listener (which should create the reporting thread!)
					INBWorkflowEventListener iel=new INBWorkflowEventListener(statusDir,lcl,debugMode);
					
					outputs = launcher.execute(baseInputs,iel);
				} else {
					outputs = launcher.execute(baseInputs);
				}
                	} catch (InvalidInputException e) {
                        	logger.error("Invalid inputs for workflow " + workflowFile.getAbsolutePath(),e);
                        	System.exit(8);
                	} catch (WorkflowSubmissionException e) {
                        	logger.error("Could not execute workflow " + workflowFile.getAbsolutePath(),e);
                        	//System.exit(9);
                	}

			logger.debug("Workflow has finished");
			if (outputDocumentFile==null && outputDir==null) {
				logger.warn("Neither -outputDoc nor -outputDir defined to save results. " +
					"Results returned contained "
					+ outputs.size() + " outputs.");
			} else {
				// These method calls only work when the file names are not null.
				saveOutputDocument(outputs);

				saveOutputDir(outputs);
			}

			if(reportFile!=null) {
				PrintStream ps=new PrintStream(reportFile,"UTF-8");

				ps.print(launcher.getProgressReportXML());

				ps.close();
			}
		}
		
		return model;
	}
	
	/**
	 * Load an XML input document, if defined by the argument
	 * <code>-inputDoc</code>.
	 *
	 * @return The {@link Map} of input {@link DataThing}s, or
	 *         <code>null</code> if <code>-inputDoc</code> was not specified
	 * @throws FileNotFoundException If the input document can't be found
	 * @throws JDOMException If the input document is invalid XML
	 * @throws IOException If the input document can't be read
	 */
	protected Map<String, DataThing> loadInputDocument(File inputDocumentFile)
		throws FileNotFoundException, JDOMException, IOException
	{
		if (inputDocumentFile == null) {
			return null;
		}
		return WorkflowLauncher.loadInputDoc(inputDocumentFile);
	}

	/**
	 * Save an XML output document for the results of running the workflow to
	 * the location defined by <code>-outputDoc</code>, if specified.
	 *
	 * @param outputs The {@link Map} of results to be saved
	 * @throws IOException If the results could not be saved
	 */
	protected void saveOutputDocument(Map<String, DataThing> outputs)
		throws IOException
	{
		if (outputDocumentFile != null) {
			WorkflowLauncher.saveOutputDoc(outputs, outputDocumentFile);
			System.out.println("Outputs saved as a baclava file at "+outputDocumentFile.getAbsolutePath());
		}
	}

	/**
	 * Save an XML output document for the results of running the workflow to
	 * the location defined by <code>-outputDir</code>, if specified.
	 *
	 * @param outputs The {@link Map} of results to be saved
	 * @throws IOException If the results could not be saved
	 */
	protected void saveOutputDir(Map<String, DataThing> outputs)
		throws IOException
	{
		if (outputDir != null) {
			outputDir.mkdirs();
			WorkflowLauncher.saveOutputs(outputs, outputDir);
			System.out.println("Outputs saved in directory "+outputDir.getAbsolutePath());
		}
	}
	
	protected void setDebugMode() {
		super.setDebugMode();
		logger.setLevel(Level.DEBUG);
	}
	
	protected void processParam(String param, ArrayList<String> values)
		throws Exception
	{
		if (param.equals("-inputDoc")) {
			File inputDocumentFile = NewFile(values.get(0));
			logger.debug("Loading baclava file "+values.get(0)+" (full path "+inputDocumentFile.getAbsolutePath()+")");
			Map<String, DataThing> loadedValues = loadInputDocument(inputDocumentFile);
			if(loadedValues==null) {
				throw new IOException("Unable to obtain inputs from baclava file "+inputDocumentFile.getAbsolutePath());
			}
			baseInputs.putAll(loadedValues);
			loadedValues=null;
			logger.debug("Loaded baclava file "+values.get(0)+" (full path "+inputDocumentFile.getAbsolutePath()+")");
		} else if (param.equals("-outputDoc")) {
			outputDocumentFile = NewFile(values.get(0));
		} else if (param.equals("-outputDir")) {
			outputDir = NewFile(values.get(0));
		} else if (param.equals("-statusDir")) {
			statusDir = NewFile(values.get(0));
			// Creating needed directories
			statusDir.mkdirs();
		} else if (param.equals("-report")) {
			reportFile = NewFile(values.get(0));
		} else if(param.equals("-saveInputs")) {
			saveInputFile=NewFile(values.get(0));
			onlySave=false;
		} else if(param.equals("-onlySaveInputs")) {
			saveInputFile=NewFile(values.get(0));
			onlySave=true;
		} else if (param.equals("-input")) {
			baseInputs.put(values.get(0),DataThingFactory.bake(values.get(1)));
			logger.debug("Param "+values.get(0)+" has been set to "+values.get(1));
		} else if (param.equals("-inputFile")) {
			File ifile=NewFile(values.get(1));
			
			// Reading input file
			FileInputStream fis = new FileInputStream(ifile);
			InputStreamReader isr=new InputStreamReader(fis,"UTF-8");
			BufferedReader br = new BufferedReader(isr);
			char[] buffer=new char[16384];
			StringBuilder content=new StringBuilder();
			int read;
			while((read=br.read(buffer,0,buffer.length))!=-1) {
				content.append(buffer,0,read);
			}
			br.close();
			isr.close();
			fis.close();
			baseInputs.put(values.get(0),DataThingFactory.bake(content.toString()));
		} else if (param.equals("-inputURL")) {
			baseInputs.put(values.get(0),DataThingFactory.fetchFromURL(new URL(values.get(1))));
		} else if (param.equals("-inputMap")) {
			File ifile=NewFile(values.get(0));
			
			// Reading input file
			FileInputStream fis = new FileInputStream(ifile);
			InputStreamReader isr=new InputStreamReader(fis,"UTF-8");
			BufferedReader br = new BufferedReader(isr);
			String line;
			int lineNumber=0;
			while((line=br.readLine())!=null) {
				lineNumber++;
				if(line.charAt(0)=='#')  continue;
				String[] fields=line.split("\t");
				if(fields.length < 3) {
					throw new IOException(ifile.getAbsolutePath()+" is garbled at line "+lineNumber+": expected at least 3 fields, found only "+fields.length);
				}
				String encoding=fields[1];
				DataThing dt=null;
				boolean isBinary = "binary".equals(encoding);
				if("".equals(encoding))  encoding="UTF-8";
				ArrayList<byte[]> valueBArr=new ArrayList<byte[]>();
				ArrayList<String> valueArr=new ArrayList<String>();
				for(int ifield=2;ifield<fields.length;ifield++) {
					File[] files=null;

					File fbase = NewFile(fields[ifield]);

					if(!fbase.exists())
						throw new IOException(fbase.getAbsolutePath()+" is not a directory or it is not readable");
					
					// Setting up the file list
					if(fbase.isDirectory()) {
						files = fbase.listFiles();
						if(files==null) {
							throw new IOException(fbase.getAbsolutePath()+" is not a readable directory");
						}
					} else {
						files = new File[] { fbase };
					}

					for(File filefield: files) {
						if(filefield.isDirectory() || ! filefield.isFile() || filefield.isHidden()) {
							logger.debug("Entry "+filefield.getAbsolutePath()+" was skipped");
							continue;
						}
						logger.debug("Loading file "+filefield.getAbsolutePath()+" for input "+fields[0]);

						if(!filefield.exists())
							throw new IOException(filefield.getAbsolutePath()+" is not a directory or it is not readable");

						FileInputStream fisfield = new FileInputStream(filefield);
						if(isBinary) {
							BufferedInputStream bisfield=new BufferedInputStream(fisfield);
							byte[] buffer=new byte[(int)filefield.length()];
							int bpos=0;
							int read;
							while((read=bisfield.read(buffer,bpos,buffer.length-bpos))!=-1) {
								bpos+=read;
							}
							bisfield.close();
							valueBArr.add(buffer);
						} else {
							InputStreamReader isrfield=new InputStreamReader(fisfield,encoding);
							BufferedReader filebr=new BufferedReader(isrfield);
							char[] buffer=new char[16384];
							StringBuilder content=new StringBuilder();
							int read;
							while((read=filebr.read(buffer,0,buffer.length))!=-1) {
								content.append(buffer,0,read);
							}
							filebr.close();
							isrfield.close();
							valueArr.add(content.toString());
						}
						fisfield.close();
					}
				}
				
				if(isBinary) {
					if(valueBArr.size()>1) {
						dt=DataThingFactory.bake(valueBArr.toArray(new byte[0][0]));
					} else {
						dt=DataThingFactory.bake(valueBArr.get(0));
					}
				} else {
					if(valueArr.size()>1) {
						dt=DataThingFactory.bake(valueArr.toArray(new String[0]));
					} else {
						dt=DataThingFactory.bake(valueArr.get(0));
					}
				}
				baseInputs.put(fields[0],dt);
			}
			br.close();
			isr.close();
			fis.close();
		} else if (param.equals("-inputArray")) {
			File farr=NewFile(values.get(1));
			// Reading input values file
			FileInputStream fis = new FileInputStream(farr);
			InputStreamReader isr=new InputStreamReader(fis,"UTF-8");
			BufferedReader br=new BufferedReader(isr);
			ArrayList<String> valueArr=new ArrayList<String>();
			String line;
			while((line=br.readLine())!=null) {
				valueArr.add(line);
			}
			br.close();
			isr.close();
			fis.close();
			baseInputs.put(values.get(0),DataThingFactory.bake(valueArr.toArray(new String[0])));
		} else if (param.equals("-inputArrayFile")) {
			File farr = NewFile(values.get(1));
			// Reading input values file
			FileInputStream fis = new FileInputStream(farr);
			InputStreamReader isr=new InputStreamReader(fis,"UTF-8");
			BufferedReader br=new BufferedReader(isr);
			ArrayList<String> valueArr=new ArrayList<String>();
			String line;
			while((line=br.readLine())!=null) {
				File filei = NewFile(line);
				FileInputStream fisi = new FileInputStream(filei);
				InputStreamReader isri=new InputStreamReader(fisi,"UTF-8");
				BufferedReader filebr=new BufferedReader(isri);
				char[] buffer=new char[16384];
				StringBuilder content=new StringBuilder();
				int read;
				while((read=filebr.read(buffer,0,buffer.length))!=-1) {
					content.append(buffer,0,read);
				}
				filebr.close();
				isri.close();
				fisi.close();
				valueArr.add(content.toString());
			}
			br.close();
			baseInputs.put(values.get(0),DataThingFactory.bake(valueArr.toArray(new String[0])));
		} else if (param.equals("-inputArrayDir")) {
			File farr = NewFile(values.get(1));
			File[] files = farr.listFiles();
			if(files==null) {
				throw new IOException(farr.getAbsolutePath()+" is not a directory or it is not readable");
			}
			ArrayList<String> valueArr=new ArrayList<String>();
			for(File filei: files) {
				if(filei.isDirectory() || ! filei.isFile() || filei.isHidden()) {
					logger.debug("Entry "+filei.getAbsolutePath()+" was skipped");
					continue;
				}
				logger.debug("Loading file "+filei.getAbsolutePath()+" for input "+values.get(0));
				FileInputStream fisi = new FileInputStream(filei);
				InputStreamReader isri=new InputStreamReader(fisi,"UTF-8");
				BufferedReader filebr=new BufferedReader(isri);
				char[] buffer=new char[16384];
				StringBuilder content=new StringBuilder();
				int read;
				while((read=filebr.read(buffer,0,buffer.length))!=-1) {
					content.append(buffer,0,read);
				}
				filebr.close();
				isri.close();
				fisi.close();
				valueArr.add(content.toString());
			}
			baseInputs.put(values.get(0),DataThingFactory.bake(valueArr.toArray(new String[0])));
		} else {
			// Perhaps my superclass knows how to handle this!
			super.processParam(param,values);
		}
	}
	
	protected void checkSetParams()
		throws Exception
	{
		super.checkSetParams();
		
		if(statusDir!=null) {
			logger.debug("statusDir has been set, so setting up outputDocument and report");
			statusDir.mkdirs();
			outputDocumentFile=new File(statusDir,INBWorkflowEventListener.OUTPUTS+INBWorkflowEventListener.EXT);
			//outputDir=new File(statusDir,INBWorkflowEventListener.OUTPUTS);
			reportFile=new File(statusDir,"report.xml");
			SVGFile=new File(statusDir,"workflow.svg");
			//PDFFile=new File(statusDir,"workflow.pdf");
			//PNGFile=new File(statusDir,"workflow.png");
			
			/*
			File newWorkflowFile=new File(statusDir,"workflow.xml");
			// Copying input workflow
			try {
				// Create channel on the source
				FileChannel srcChannel = new FileInputStream(workflowFile).getChannel();

				// Create channel on the destination
				FileChannel dstChannel = new FileOutputStream(newWorkflowFile).getChannel();

				// Copy file contents from source to destination
				dstChannel.transferFrom(srcChannel, 0, srcChannel.size());

				// Close the channels
				srcChannel.close();
				dstChannel.close();
				workflowFile=newWorkflowFile;
			} catch (IOException ioe) {
				logger.error("Unable to copy workflow to status directory",ioe);
				System.exit(3);
			}
			*/
		}
		
		if(saveInputFile!=null) {
			WorkflowLauncher.saveOutputDoc(baseInputs, saveInputFile);
			System.out.println("Inputs saved as a baclava file at "+saveInputFile.getAbsolutePath());
		}
	}
	
	protected String getScriptName()
	{
		return SCRIPT_NAME;
	}
}
