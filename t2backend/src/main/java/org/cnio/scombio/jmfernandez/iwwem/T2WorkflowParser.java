package org.cnio.scombio.jmfernandez.iwwem;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import net.sf.taverna.t2.facade.WorkflowInstanceFacade;
import net.sf.taverna.t2.invocation.InvocationContext;
import net.sf.taverna.t2.platform.spring.RavenAwareClassPathXmlApplicationContext;
import net.sf.taverna.t2.platform.taverna.Enactor;
import net.sf.taverna.t2.platform.taverna.InvocationContextFactory;
import net.sf.taverna.t2.platform.taverna.TavernaBaseProfile;
import net.sf.taverna.t2.platform.taverna.WorkflowParser;
import net.sf.taverna.t2.reference.T2Reference;
import net.sf.taverna.t2.workflowmodel.Dataflow;
import net.sf.taverna.t2.workflowmodel.DataflowValidationReport;
import net.sf.taverna.t2.workflowmodel.EditException;
import net.sf.taverna.t2.workflowmodel.serialization.DeserializationException;

import org.springframework.context.ApplicationContext;

/**
 * Skeleton application, initializes the platform from the 'context.xml'
 */
public class T2WorkflowParser {
	private static final String SCRIPT_NAME="t2workflowparser";
	
	private static final String[][] ParamDescs={
		{"-h","0","Shows this help"},
		{"-help","0","Shows this help"},
		{"--help","0","Shows this help"},
		// {"-debug","0","Turns on debugging"},
		{"-workflow","1","Workflow to be processed/run"},
		// {"-offline","0","Workflow processing will be done in Taverna offline mode"},
		{"-svggraph","1","File where to save workflow graph in SVG format"},
		{"-dotgraph","1","File where to save workflow graph in DOT format"},
		{"-pnggraph","1","File where to save workflow graph in PNG format"},
		{"-pdfgraph","1","File where to save workflow graph in PDF format"},
		{"-expandSubWorkflows","0","Sub-Workflows are expanded when workflow graph is generated"},
		{"-collapseSubWorkflows","0","Sub-Workflows are collapsed when workflow graph is generated"},
		{"-topDownOrientation","0","Workflow graph layout must be top-down"},
		{"-leftRightOrientation","0","Workflow graph layout must be left-right"},
		{"-baseDir","1","Spring repository dirname"},
		{"-onlyUpdateBaseDir","0","Only update Spring repository"},
	};
	
	// private static Logger logger;
	
	private static ArrayList<String[][]> OptionArray=new ArrayList<String[][]>();
	private static HashMap<String,Integer> OptionHash=new HashMap<String,Integer>();

	protected static void FillHashMap(String[][] ParamDescs) {
		// Saving the reference to the hash
		OptionArray.add(ParamDescs);

		// Now, hash filling
		for(String[] param: ParamDescs) {
			OptionHash.put(param[0],Integer.parseInt(param[1]));
		}
	}

	// Filling the parameters hash!
	static {
		// Living the headless life!
		System.setProperty("java.awt.headless", "true");

		// Some checks should be put here for these system properties...
		// File log4j=new File(new File(System.getProperty("basedir"),"conf"),"log4j.properties");
		// logger = Logger.getLogger(T2ParserWrapper.class);

		// Now, hash filling
		FillHashMap(ParamDescs);
	};
	
	protected File workflowFile;

	File baseDir;

	File dotFile;

	protected File SVGFile;

	protected File PNGFile;

	protected File PDFFile;

	boolean alignmentParam=false;
	boolean expandWorkflowParam=false;
	boolean onlySpringUpdate=false;
	// boolean isOfflineMode=false;
	
	// @SuppressWarnings("unchecked")
	public static void main(String[] args) {
		try {
			new T2WorkflowParser().run(args);
		} catch(Throwable t) {
			t.printStackTrace();
			System.exit(1);
		}
	}
	
	/**
	 *	Due a problem with mvn appassembler plugin, the application
	 *	user.dir is not set to the appropriate value, so we need to
	 *	rescue it, and then patch any file construction! Nuts!
	 */
	protected static File NewFile(String filename)
		throws IOException
	{
		File f=new File(filename);
		
		/*
		if(!f.isAbsolute()) {
			if(OriginalDir!=null) {
				f=new File(OriginalDir,filename);
			}
			f=f.getCanonicalFile();
		}
		*/

		return f;
	}

	public void run(String[] args)
		throws Exception
	{
		// Process args
		processArgs(args);
		
		
		
		// Initialise the platform
		System.out.println("Initializing platform...");
		ApplicationContext actx = new RavenAwareClassPathXmlApplicationContext("context.xml");
		TavernaBaseProfile profile = new TavernaBaseProfile(actx);
		System.out.println("Platform created.");
		
		InvocationContextFactory icf = profile.getInvocationContextFactory();
		InvocationContext ic = icf.createInvocationContext();
		
		// TODO: Explore Workflow XML Renderer as a way to save into XML an in memory workflow

		// Do stuff with platform!
		// Your code here...
		WorkflowParser parser = profile.getWorkflowParser();
		try {
			FileInputStream fis = new FileInputStream(args[0]);
			try {
				Dataflow workflow = parser.createDataflow(fis);
				DataflowValidationReport dvr = workflow.checkValidity();
				if(!dvr.isValid()) {
					System.err.println("Something smells rotten in Denmark");
				}

				Enactor e = profile.getEnactor();
				WorkflowInstanceFacade instance = e.createFacade(workflow,ic);
				
				// It starts, asynchronous, for workflows with no input
				// instance.fire();
				
				// When there are inputs, then use pushData
				
				// Look at http://taverna.cvs.sourceforge.net/viewvc/taverna/platform-test-application/src/main/java/net/sf/taverna/testapp/ExampleApplication.java?revision=1.3&view=markup
				
				// Now we should push here the input data
				
				// And we should wait for the results
				Map<String, T2Reference> results = e.waitForCompletion(instance);
			} catch(DeserializationException de) {
				de.printStackTrace();
			} catch(EditException ee) {
				ee.printStackTrace();
			}
		} catch(FileNotFoundException fnfe) {
			fnfe.printStackTrace();
		}
	}
	
	protected void processParam(String param, ArrayList<String> values)
		throws Exception
	{
		/*
		if(param.equals("-debug")) {
			setDebugMode();
		} else
		*/
		if(param.equals("--help") || param.equals("-help") || param.equals("-h")) {
			showHelp(0);
		} else if (param.equals("-workflow")) {
			workflowFile = NewFile(values.get(0));
		} else if (param.equals("-baseDir")) {
			baseDir = NewFile(values.get(0));
		} else if (param.equals("-dotgraph")) {
			dotFile = NewFile(values.get(0));
		} else if (param.equals("-svggraph")) {
			SVGFile = NewFile(values.get(0));
		} else if (param.equals("-pnggraph")) {
			PNGFile = NewFile(values.get(0));
		} else if (param.equals("-pdfgraph")) {
			PDFFile = NewFile(values.get(0));
		} else if (param.equals("-topDownOrientation")) {
			alignmentParam=false;
		} else if (param.equals("-leftRightOrientation")) {
			alignmentParam=true;
		} else if (param.equals("-expandSubWorkflows")) {
			expandWorkflowParam=true;
		} else if (param.equals("-collapseSubWorkflows")) {
			expandWorkflowParam=false;
		} else if (param.equals("-onlyUpdateBaseDir")) {
			onlySpringUpdate=true;
		/*
		} else if (param.equals("-offline")) {
			isOfflineMode=true;
		} else {
			logger.warn("Argument "+param+" has not been processed because this parsing code is incomplete!");
		*/
		}
	}

	/**
		Post-processing, like additional checks or
		post-loading modifications.
	 */
	protected void checkSetParams()
		throws Exception
	{
		if (workflowFile == null && !onlySpringUpdate) {
			/*
			logger.error("You must specify a workflow with the argument -workflow");
			logger.error("e.g. "+getScriptName()+" -workflow myworkflow.xml");
			logger.error("or "+getScriptName()+".bat -workflow C:/myworkflow.xml");
			*/
			System.err.println("You must specify a workflow with the argument -workflow");
			System.err.println("e.g. "+getScriptName()+" -workflow myworkflow.xml");
			System.err.println("or "+getScriptName()+".bat -workflow C:/myworkflow.xml");
			showHelp(2);
		}
	}
	/**
	 * Process command line argument and set attributes for input/output
	 * document, basedir and workflow.
	 *
	 * @param args The list of arguments from {@link #main(String[])}
	 */
	private void processArgs(String[] args)
		throws Exception
	{
		if(args.length==0) {
			showHelp(0);
			//throw new Exception("");
		}

		// TODO: Use org.apache.commons.cli instead of manual parsing
		String param=null;
		int leftpars=0;
		ArrayList<String> values=new ArrayList<String>();
		for (String arg: args) {
			if(param==null) {
				if(!OptionHash.containsKey(arg)) {
					String errstr="Unrecognised argument: " + arg;
					showHelp(errstr);
				} else {
					param=arg;
					leftpars=OptionHash.get(arg);
				}
			} else if(leftpars>0) {
				values.add(arg);
				leftpars--;
			}

			// Time to process the parameter
			if(param!=null && leftpars==0) {
				processParam(param,values);

				// Freeing resources
				param=null;
				values.clear();
			}
		}

		if(param!=null && leftpars>0) {
			String errstr="Argument" + param + " needs " + leftpars + " additional parameter"+((leftpars>1)?"s":"");
			showHelp(errstr);
		}

		checkSetParams();
	}
	
	protected String getScriptName()
	{
		return SCRIPT_NAME;
	}

	protected void internalShowHelp()
	{
		String usage="Usage: "+getScriptName()+" {param}*\n\n  where {param} can be:";
		// logger.info(usage);
		System.err.println(usage);
		for(String[][] ParamDescsArr: OptionArray) {
			for(String[] param: ParamDescsArr) {
				String line="\t"+param[0]+" ("+param[1]+" argument"+("1".equals(param[1])?"":"s")+")\n\t\t"+param[2];
				// logger.info(line);
				System.err.println(line);
			}
		}
	}

	protected void showHelp(int exitval)
	{
		showHelp(exitval,null);
	}
	
	protected void showHelp(String message)
	{
		showHelp(1,message);
	}
	protected void showHelp(int exitval,String message)
	{
		if(message!=null) {
			System.err.println(message);
		}
		internalShowHelp();
		System.exit(exitval);
	}

}
