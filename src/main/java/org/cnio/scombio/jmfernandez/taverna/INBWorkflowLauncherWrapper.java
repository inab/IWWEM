package org.cnio.scombio.jmfernandez.taverna;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import net.sf.taverna.raven.repository.Artifact;
import net.sf.taverna.raven.repository.BasicArtifact;
import net.sf.taverna.raven.repository.Repository;
import net.sf.taverna.raven.repository.impl.LocalRepository;

import org.apache.log4j.Logger;
import org.apache.log4j.Level;
import org.apache.log4j.PropertyConfigurator;
import org.embl.ebi.escience.baclava.DataThing;
import org.embl.ebi.escience.scufl.Processor;
import org.embl.ebi.escience.scufl.tools.WorkflowLauncher;
import org.embl.ebi.escience.utils.TavernaSPIRegistry;
import org.jdom.JDOMException;

import org.embl.ebi.escience.baclava.factory.DataThingFactory;

import org.embl.ebi.escience.scufl.ScuflModel;
import org.embl.ebi.escience.scufl.parser.XScuflParser;

import org.embl.ebi.escience.scuflui.ScuflSVGDiagram;
import org.embl.ebi.escience.scufl.view.DotView;
// SVGDocument is a Document!!!
//import org.w3c.dom.svg.SVGDocument;

import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import org.w3c.dom.Document;

public class INBWorkflowLauncherWrapper
	extends INBWorkflowParserWrapper
{
	private static final String SCRIPT_NAME="inbworkflowlauncher";
	
	private static final String[][] ParamDescs={
		{"-inputdoc","1","All the workflow inputs, encoded in a Baclava document"},
		{"-input","2","A single pair input name / value"},
		{"-inputFile","2","A single pair input name / file where the value is stored"},
		{"-inputURL","2","A single pair input name / URL where the value can be fetched"},
		{"-inputArray","2","A single pair input name / file where a list of values are stored"},
		{"-inputArrayFile","2","A single pair input name / file which contains a list of file names which contain the values"},
		{"-outputdoc","1","All the workflow outputs, saved in a Baclava document"},
		{"-outputdir","1","All the workflow outputs, saved in a directory which will contain the structure of the outputs"},
		{"-report","1","Taverna XML report file"},
		{"-statusdir","1","Directory where all the intermediate results and events are saved"},
	};
	
	private static Logger logger;
	
	// Filling the parameters hash!
	static {
		// Some checks should be put here for these system properties...
		File log4j=new File(new File(System.getProperty("basedir"),"conf"),"log4j.properties");
		PropertyConfigurator.configure(log4j.getAbsolutePath());
		logger = Logger.getLogger(INBWorkflowParserWrapper.class);
		
		// Now, hash filling
		FillHashMap(ParamDescs);
	};
	
	File inputDocumentFile;

	File outputDocumentFile;
	
	File outputDir;
	
	File reportFile;
	
	File statusDir;
	
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
		
		Map<String, DataThing> inputs = loadInputDocument();
		if (inputs == null) {
			inputs = baseInputs;
		} else {
			inputs.putAll(baseInputs);
		}
		
		WorkflowLauncher launcher = new WorkflowLauncher(model);
		
		logger.debug("And now, executing workflow!!!!!");
		
		INBWorkflowEventListener iel=null;
		if(statusDir!=null) {
			iel=new INBWorkflowEventListener(statusDir);
		}
		Map<String, DataThing> outputs = launcher.execute(inputs,iel);
		logger.debug("Workflow has finished");
		if (outputDocumentFile==null && outputDir==null) {
			logger.warn("Neither -outputdoc nor -outputdir defined to save results. " +
				"Results returned contained "
				+ outputs.size() + " outputs.");
		} else {
			// These method calls only work when the file names are not null.
			saveOutputDocument(outputs);
			
			saveOutputDir(outputs);
		}
		
		if(reportFile!=null) {
			PrintStream ps=new PrintStream(new BufferedOutputStream(new FileOutputStream(reportFile)));
			
			ps.print(launcher.getProgressReportXML());
			
			ps.close();
		}
		
		return model;
	}
	
	/**
	 * Load an XML input document, if defined by the argument
	 * <code>-inputdoc</code>.
	 *
	 * @return The {@link Map} of input {@link DataThing}s, or
	 *         <code>null</code> if <code>-inputdoc</code> was not specified
	 * @throws FileNotFoundException If the input document can't be found
	 * @throws JDOMException If the input document is invalid XML
	 * @throws IOException If the input document can't be read
	 */
	protected Map<String, DataThing> loadInputDocument()
		throws FileNotFoundException, JDOMException, IOException
	{
		if (inputDocumentFile == null) {
			return null;
		}
		return WorkflowLauncher.loadInputDoc(inputDocumentFile);
	}

	/**
	 * Save an XML output document for the results of running the workflow to
	 * the location defined by <code>-outputdoc</code>, if specified.
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
	 * the location defined by <code>-outputdoc</code>, if specified.
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
	
	protected void processParam(String param, ArrayList<String> values)
		throws Exception
	{
		if (param.equals("-inputdoc")) {
			inputDocumentFile = NewFile(values.get(0));
		} else if (param.equals("-outputdoc")) {
			outputDocumentFile = NewFile(values.get(0));
		} else if (param.equals("-outputdir")) {
			outputDir = NewFile(values.get(0));
		} else if (param.equals("-statusdir")) {
			statusDir = NewFile(values.get(0));
			// Creating needed directories
			statusDir.mkdirs();
		} else if (param.equals("-report")) {
			reportFile = NewFile(values.get(0));
		} else if (param.equals("-input")) {
			baseInputs.put(values.get(0),DataThingFactory.bake(values.get(1)));
			logger.debug("Param "+values.get(0)+" has been set to "+values.get(1));
		} else if (param.equals("-inputFile")) {
			File ifile=NewFile(values.get(1));
			baseInputs.put(values.get(0),DataThingFactory.fetchFromURL(ifile.toURL()));
		} else if (param.equals("-inputURL")) {
			baseInputs.put(values.get(0),DataThingFactory.fetchFromURL(new URL(values.get(1))));
		} else if (param.equals("-inputArray")) {
			File farr=NewFile(values.get(1));
			BufferedReader br=new BufferedReader(new FileReader(farr));
			ArrayList<String> valueArr=new ArrayList<String>();
			String line;
			while((line=br.readLine())!=null) {
				valueArr.add(line);
			}
			br.close();
			baseInputs.put(values.get(0),DataThingFactory.bake(valueArr.toArray(new String[0])));
		} else if (param.equals("-inputArrayFile")) {
			File farr = NewFile(values.get(1));
			BufferedReader br=new BufferedReader(new FileReader(farr));
			ArrayList<String> valueArr=new ArrayList<String>();
			String line;
			while((line=br.readLine())!=null) {
				String linecontent;
				String content="";
				File filei = NewFile(line);
				BufferedReader filebr=new BufferedReader(new FileReader(filei));
				while((linecontent=filebr.readLine())!=null) {
					content += "\n" + linecontent;
				}
				filebr.close();
				valueArr.add(content);
			}
			br.close();
			baseInputs.put(values.get(0),DataThingFactory.bake(valueArr.toArray(new String[0])));
		} else {
			// Perhaps my superclass knows how to handle this!
			super.processParam(param,values);
		}
	}
	
	protected String getScriptName()
	{
		return SCRIPT_NAME;
	}
}
