package org.cnio.scombio.jmfernandez.taverna;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStream;
import java.io.InputStreamReader;
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

import org.w3c.dom.CDATASection;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * <p>
 * A simplified example application demonstrating how to invoke the Taverna API
 * through Raven, without the need to bootstrap the application.
 * </p>
 * <p>
 * Its main point is to demonstrate populating an {@link Repository} instance
 * with the system artifacts and external artifacts required to execute a
 * workflow. Workflow execution is the most popular request, but this technique
 * can also be applied to access other parts of the Taverna API.
 * </p>
 * <p>
 * The system artifacts relate to the artifacts that already exist within the
 * applications classpath. Correctly defining these ensures that the
 * applications classloader is used to create instances of classes contained
 * within these artifacts. This prevents Raven creating instances through its
 * own classloaders leading to ClassCastException or similar errors. These
 * artifacts are defined in
 * {@link INBWorkflowLauncherWrapper#buildSystemArtifactSet()}
 * </p>
 * <p>
 * Since you necessarily will be accessing parts of Taverna's API, you will need
 * to include the relevant artifacts on your application's classpath to be able
 * to access the classes. If you access other parts of Taverna than this example
 * shows, you will need to add those artifacts to
 * {@link #buildSystemArtifactSet()} as well.
 * </p>
 * <p>
 * For instance, if you are constructing a new workflow using the API, and you
 * need access to a
 * {@link org.embl.ebi.escience.scuflworkers.soaplab.SoaplabProcessor}, you
 * will need to both list taverna-soaplab-processor as a system artifact and
 * include it and its dependencies in your application's classpath.
 * </p>
 * <p>
 * The external artifacts relate to artifacts that exist outside of the
 * application as SPI plugin points, ie. artifacts that are <strong>not</strong>
 * on the application's classpath. For the purpose of this example this is the
 * {@link Processor}s that are needed during workflow execution. These
 * artifacts are defined in
 * {@link INBWorkflowLauncherWrapper#buildExternalArtifactSet()}. Depending on
 * which parts of Taverna's API you are invoking, you might have to include more
 * artifacts from Taverna's distribution profile.
 * </p>
 * <p>
 * Because these artifacts are not defined in the application they, and their
 * dependencies, need to be downloaded when the application is first run and are
 * downloaded to the local repository location defined by the method
 * {@link INBWorkflowLauncherWrapper#getRepositoryBaseFile()}, and ultimately the
 * runtime argument <em>-basedir</em> if provided.
 * </p>
 * <p>
 * The external artifacts are downloaded from the remote repository locations
 * defined in {@link INBWorkflowLauncherWrapper#buildRepositoryLocationSet}.
 * </p>
 * <p>
 * The key to this approach is initialising a {@link Repository} using the API
 * call:
 * </p>
 *
 * <pre>
 * Repository repository =
 * 	LocalRepository.getRepository(localrepository, applicationClassloader,
 * 		systemArtifacts);
 * </pre>
 *
 * <p>
 * Then making sure the local repository is up to date with a call:
 * </p>
 *
 * <pre>
 * repository.update();
 * </pre>
 *
 * <p>
 * The repository is then registered with the {@link TavernaSPIRegistry} with
 * the call:
 * </p>
 *
 * <pre>
 * TavernaSPIRegistry.setRepository(repository);
 * </pre>
 *
 * <p>
 * This all takes place within
 * {@link INBWorkflowLauncherWrapper#initialiseRepository()}
 * </p>
 * <p>
 * Note that for simplicity in this example the external artifacts and remote
 * repositories have been hardcoded and would normally be better defined
 * separately in a file. For the same reason, exception handling has also been
 * kept to a minimum.
 * </p>
 * <p>
 * There is nothing requiring you to use this mechanism from an
 * {@link #main(String[])} method started from the command line, this is just to
 * make this example self-contained and simple. As long as you include the
 * necessary dependencies this example should be easily ported to be used within
 * a servlet container such as Tomcat.
 * </p>
 * <h4>To use:</h4>
 * <p>
 * First build using maven together with the appassembler plugin:
 * </p>
 * <pre>mvn package appassembler:assemble</pre>
 * <p>
 * Then navigate to the <code>target/appassembler/bin</code> directory
 * and run the <code>runme[.bat]</code> command:
 * </p>
 * <pre>
 * inbworkflowlauncher [-inputdoc &lt;path to input doc&gt;
 *        -outputdoc &lt;path to output doc&gt;
 *        -basedir &lt;path to local repository download dir&gt;]
 *        -workflow &lt;path to workflow scufl file&gt;.
 * </pre>
 *
 * @author Stuart Owen
 * @author Stian Soiland
 */
public class INBWorkflowParserWrapper {

	/**
	 * The version of Taverna core components that is used, for instance
	 * <code>1.6.2.0</code>.
	 * <p>
	 * (Note that although processors and plugins might be updated by their
	 * minor-minor version, say a
	 * {@link org.embl.ebi.escience.scuflworkers.soaplab.SoaplabProcessor} can
	 * be in version <code>1.6.2.1</code>, the core components listed by
	 * {@link #buildSystemArtifactSet()} would still be <code>1.6.2.0</code>,
	 * and thus this constant would also be <code>1.6.2.0</code>. You might
	 * have to update use of <code>TAVERNA_BASE_VERSION</code> in
	 * {@link #buildExternalArtifactSet()} if you want a newer version of a
	 * processor or similar.)
	 * <p>
	 * This version has to match the version of the real dependency you have to
	 * Taverna libraries on your classpath (ie. the pom.xml dependencies).
	 */
	public static final String TAVERNA_BASE_VERSION = "1.6.2.0";
	private static final String SCRIPT_NAME="inbworkflowparser";
	private static final String SVG_TRAMPOLINE="SVGtrampoline.js";
	private static final String SVG_JSINIT="RunScript(evt)";
	
	private static final String[][] ParamDescs={
		{"-h","0","Shows this help"},
		{"-help","0","Shows this help"},
		{"-debug","0","Turns on debugging"},
		{"-workflow","1","Workflow to be processed/run"},
		{"-svggraph","1","File where to save workflow graph in SVG format"},
		{"-dotgraph","1","File where to save workflow graph in DOT format"},
		{"-basedir","1","Maven repository dirname"},
	};
	
	private static final String TAVERNA_GROUP_ID="uk.org.mygrid.taverna";
	private static final String TAVERNA_PROCESSORS_GROUP_ID = TAVERNA_GROUP_ID + ".processors";
	private static final String TAVERNA_BACLAVA_GROUP_ID = TAVERNA_GROUP_ID + ".baclava";
	private static final String TAVERNA_SCUFL_GROUP_ID = TAVERNA_GROUP_ID + ".scufl";
	
	private static final String[][] SystemArtifactList={
		{TAVERNA_GROUP_ID,"taverna-core",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-enactor",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-tools",TAVERNA_BASE_VERSION},
		{TAVERNA_BACLAVA_GROUP_ID,"baclava-core",TAVERNA_BASE_VERSION},
		{TAVERNA_BACLAVA_GROUP_ID,"baclava-tools",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-core",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-model",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-tools",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-workflow",TAVERNA_BASE_VERSION},
//		{"jaxen","jaxen","1.0-FCS"},
	};
	
	private static final String[][] ExternalArtifactList={
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-beanshell-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-biomart-processor",TAVERNA_BASE_VERSION},
		{"biomoby.org","taverna-biomoby",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-contrib",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-java-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-localworkers",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-notification-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-soaplab-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-stringconstant-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-wsdl-processor",TAVERNA_BASE_VERSION},
	};
	
	private static final String[] RepositoryLocationList={
		"http://www.mygrid.org.uk/maven/repository/",
		"http://mirrors.sunsite.dk/maven2/",
		"http://www.ibiblio.org/maven2/",
		"http://mobycentral.icapture.ubc.ca/maven/",
		"http://www.mygrid.org.uk/maven/snapshot-repository/",
	};
	
	private static HashMap<String,Integer> OptionHash=new HashMap<String,Integer>();
	
	private static ArrayList<String[][]> OptionArray=new ArrayList<String[][]>();
	
	private static Logger logger;
	
	private static File originalDir;
	
	// Filling the parameters hash!
	static {
		// Living the headless way!
		System.setProperty("java.awt.headless", "true");
		
		// Getting the property
		originalDir=new File(System.getProperty("inb.originaldir"));
		
		// Some checks should be put here for these system properties...
		File log4j=new File(new File(System.getProperty("basedir"),"conf"),"log4j.properties");
		PropertyConfigurator.configure(log4j.getAbsolutePath());
		logger = Logger.getLogger(INBWorkflowParserWrapper.class);
		
		// Now, hash filling
		FillHashMap(ParamDescs);
	};
	
	File workflowFile;
	
	File baseDir;
	
	File dotFile;
	
	File SVGFile;

	protected HashMap<String, DataThing> baseInputs = new HashMap<String, DataThing>();
	
	public static void main(String[] args) {
		try {
			new INBWorkflowParserWrapper().run(args);
		} catch (Exception e) {
			e.printStackTrace();
			System.exit(1);
		}
	}

	/**
	 *	Due a problem with mvn appassembler plugin, the application
	 *	user.dir is not set to the appropriate value, so we need to
	 *	rescue it, and then patch any file construction! Nuts!
	 */
	protected static File NewFile(String filename)
	{
		File f=new File(filename);
		if(!f.isAbsolute()) {
			f=new File(originalDir,filename);
		}
		
		return f;
	}
	
	protected static void FillHashMap(String[][] ParamDescs) {
		// Saving the reference to the hash
		OptionArray.add(ParamDescs);
		
		// Now, hash filling
		for(String[] param: ParamDescs) {
			OptionHash.put(param[0],Integer.parseInt(param[1]));
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
		logger.debug("Starting param processing");
		processArgs(args,baseInputs);
		InputStream workflowInputStream = new FileInputStream(workflowFile);

		logger.debug("Param processing has finished. Starting repository initialization");
		Repository repository = initialiseRepository();
		logger.debug("Repository initialization has finished. Starting TavernaSPI");
		TavernaSPIRegistry.setRepository(repository);
		logger.debug("TavernaSPI has finished. Starting WorkflowLauncher");
		
		INBWorkflowEventListener iel=new INBWorkflowEventListener(logger.getLevel());
                ScuflModel model = new ScuflModel();
                XScuflParser.populate(workflowInputStream, model, null);
		/*
		model.addListener(iel);
		*/
		
		// Now it is time to generate workflow SVG (if it is possible!)
		generateWorkflowGraph(model);
		
		return model;
	}

	/**
	 * <p>
	 * Provide the required initialisation of a {@link Repository} instance for
	 * executing a workflow.
	 * </p>
	 * <p>
	 * This involves first defining the artifacts that exist within the
	 * application classpath, external plugin artifacts required during workflow
	 * execution (processors) and a location to download these artifacts to.</p>
	 * <p>
	 * Based upon this information the repository is updated, causing any
	 * external artifacts to be downloaded to the local repository location
	 * defined by <code>-basedir</code> if required.
	 *
	 * @return The initialised {@link Repository} instance
	 * @throws IOException
	 */
	protected Repository initialiseRepository()
		throws IOException
	{

		// these lines are necessary if working with Taverna 1.5.2 or earlier:

		// System.setProperty("raven.profile",
		//   "http://www.mygrid.org.uk/taverna/updates/1.5.2/taverna-1.5.2.1-profile.xml");
		// Bootstrap.properties = new Properties();

		Set<Artifact> systemArtifacts = buildSystemArtifactSet();
		Set<Artifact> externalArtifacts = buildExternalArtifactSet();
		List<URL> repositoryLocations = buildRepositoryLocationSet();

		File base = getRepositoryBaseFile();
		ClassLoader myLoader = getClass().getClassLoader();
		if (myLoader == null) {
			myLoader = ClassLoader.getSystemClassLoader();
		}
		Repository repository =
			LocalRepository.getRepository(base,
				myLoader, systemArtifacts);
		for (Artifact artifact : externalArtifacts) {
			logger.debug("Adding external artifact "+artifact.getArtifactId());
			repository.addArtifact(artifact);
		}

		for (URL location : repositoryLocations) {
			logger.debug("Adding external location "+location.toString());
			repository.addRemoteRepository(location);
		}

		repository.update();
		return repository;
	}

	/**
	 * Provide an ordered list of {@link URL}s to public Maven 2 repositories
	 * containing required artifacts. This should contain at a minimum:
	 * <ul>
	 * <li>http://www.mygrid.org.uk/maven/repository/ - the myGrid artifact
	 * repository</li>
	 * <li>http://mobycentral.icapture.ubc.ca/maven/ - Biomoby specific
	 * artifacts</li>
	 * <li>http://www.ibiblio.org/maven2/ - the central Maven repository and/or
	 * any mirrors</li>
	 * </ul>
	 * <p>
	 * The repositories will be searched in order.
	 * </p>
	 * <p>
	 * Although the URLs are hard-coded in this example, it is advisable to
	 * store these in a separate file in a real application.
	 *
	 * @return A {@link List} containing the list of URL locations
	 * @throws MalformedURLException if the programmer entered an invalid URL :-)
	 */
	protected List<URL> buildRepositoryLocationSet()
		throws MalformedURLException
	{
		List<URL> result = new ArrayList<URL>();

		// Guess local Maven2 repository is in ~/.m2/repository
		File home = new File(System.getProperty("user.home"));
		File m2Repository = new File(new File(home, ".m2"), "repository");
		if (m2Repository.isDirectory()) {
			// This is useful for developers
			logger.debug("Including local maven repository " + m2Repository);
			result.add(m2Repository.toURI().toURL());
		}

		for(String repository: RepositoryLocationList) {
			logger.debug("Setting up repository "+repository);
			result.add(new URL(repository));
		}
		
		return result;
	}

	/**
	 * <p>
	 * Provide a set of {@link Artifact}s (normally {@link BasicArtifact}
	 * instances) defining the artifacts (ie. JAR files) whose classes and
	 * dependencies also exist within the applications classpath.
	 * </p>
	 * <p>
	 * These are used to let Raven know that these classes already exist and
	 * prevents it creating duplicate classes from its own classloaders leading
	 * to a potential ClassCastException or similar.
	 *
	 * @return Set<Artifact> containing the list of system {@link Artifact}s
	 */
	protected Set<Artifact> buildSystemArtifactSet() {

		Set<Artifact> systemArtifacts = new HashSet<Artifact>();
		
		for(String[] systemArtifact: SystemArtifactList) {
			logger.debug("Setting up system artifact "+systemArtifact[1]);
			systemArtifacts.add(new BasicArtifact(systemArtifact[0],
				systemArtifact[1], systemArtifact[2]));
		}

		return systemArtifacts;
	}

	/**
	 * <p>
	 * Provide additional artifacts that are external SPI plugins and won't
	 * already exist on the classpath. This can be compared to the Taverna
	 * distributions' profile to specify which components should be dynamically
	 * loaded.
	 * </p>
	 * <p>
	 * In this example, the application executes a workflow, and therefore
	 * define all required {@link Processor} types. These artifacts, and their
	 * dependencies, will be downloaded from the
	 * {@link #buildRepositoryLocationSet()} to {@link #getRepositoryBaseFile()}
	 * when the application is first run.
	 * </p>
	 * <p>
	 * Although hard-coded for this example it would be advisable to define
	 * these artifacts in an external file.
	 * </p>
	 *
	 * @return Set<Artifact> containing the list of external artifacts.
	 */
	protected Set<Artifact> buildExternalArtifactSet() {
		Set<Artifact> externalArtifacts = new HashSet<Artifact>();
		
		for(String[] externalArtifact: ExternalArtifactList) {
			logger.debug("Setting up external artifact "+externalArtifact[1]);
			externalArtifacts.add(new BasicArtifact(externalArtifact[0],
				externalArtifact[1], externalArtifact[2]));
		}

		return externalArtifacts;
	}

	/**
	 * <p>
	 * Provide a {@link File} representation of the local repository directory
	 * that external artifacts and their dependencies will be downloaded to.</p>
	 * <p>
	 * This is defined by the argument <code>-basedir</code>. If this is not
	 * defined a temporary directory is created.</p>
	 *
	 * @return a {@link File} representation
	 * @throws IOException if the base directory could not be accessed
	 */
	protected File getRepositoryBaseFile()
		throws IOException
	{
		if (baseDir != null) {
			baseDir.mkdirs();
			return baseDir;
		} else {
			File temp = new File(System.getProperty("user.home"),".inb-maven");
			temp.mkdirs();
			logger.warn("No -basedir defined, so using default location of: "
				+ temp.getAbsolutePath());
			return temp;
		}
	}
	
	/**
	 * Process command line argument and set attributes for input/output
	 * document, basedir and workflow.
	 *
	 * @param args The list of arguments from {@link #main(String[])}
	 */
	private void processArgs(String[] args,Map<String, DataThing> baseInputs)
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
	
	protected void processParam(String param, ArrayList<String> values)
		throws Exception
	{
		if(param.equals("-debug")) {
			logger.setLevel(Level.DEBUG);
		} else if(param.equals("-help") || param.equals("-h")) {
			showHelp(0);
			//throw new Exception("");
		} else if (param.equals("-workflow")) {
			workflowFile = NewFile(values.get(0));
		} else if (param.equals("-basedir")) {
			baseDir = NewFile(values.get(0));
		} else if (param.equals("-dotgraph")) {
			dotFile = NewFile(values.get(0));
		} else if (param.equals("-svggraph")) {
			SVGFile = NewFile(values.get(0));
		} else {
			logger.warn("Argument "+param+" has not been processed because this parsing code is incomplete!");
		}
	}
	
	protected void checkSetParams() {
		if (workflowFile == null) {
			logger.error("You must specify a workflow with the argument -workflow");
			logger.error("e.g. "+getScriptName()+" -workflow myworkflow.xml");
			logger.error("or "+getScriptName()+".bat -workflow C:/myworkflow.xml");
			showHelp(2);
		}
	}
	
	protected String getScriptName()
	{
		return SCRIPT_NAME;
	}
	
	protected void internalShowHelp()
	{
		String usage="Usage: "+getScriptName()+" {param}*\n\n  where {param} can be:";
		logger.info(usage);
		System.err.println(usage);
		for(String[][] ParamDescsArr: OptionArray) {
			for(String[] param: ParamDescsArr) {
				String line="\t"+param[0]+" ("+param[1]+" argument"+("1".equals(param[1])?"":"s")+")\n\t\t"+param[2];
				logger.info(line);
				System.err.println(line);
			}
		}
	}
	
	protected void showHelp(int exitval)
	{
		internalShowHelp();
		System.exit(exitval);
	}
	
	protected void showHelp(String exceptionMessage)
		throws Exception
	{
		internalShowHelp();
		if(exceptionMessage!=null) {
			logger.error(exceptionMessage);
			throw new Exception(exceptionMessage);
		}
	}
	
	
	private void generateWorkflowGraph(ScuflModel model)
		throws Exception
	{
		if(dotFile!=null || SVGFile!=null) {
			DotView dotView=new DotView(model);
			// TODO
			// Here the different graph drawing parameters
			dotView.setPortDisplay(DotView.BOUND);
			
			// And here, getting the dot
			String dotContent=dotView.getDot();
			// Freeing resources
			dotView=null;
			
			// At last, saving!!!
			if(dotFile!=null) {
				PrintStream ps=new PrintStream(new BufferedOutputStream(new FileOutputStream(dotFile)));

				ps.print(dotContent);

				ps.close();
				
			}
			
			if(SVGFile!=null) {
				// Translating to SVG!!!!!
				Document svg=ScuflSVGDiagram.getSVG(dotContent);
				
				// Adding the ECMAscript trampoline needed to
				// manipulate SVG from outside
				
				// First, we need a class loader
				ClassLoader cl = getClass().getClassLoader();
				if (cl == null) {
					cl = ClassLoader.getSystemClassLoader();
				}
				
				// Then, we can fetch it!
				InputStream SVGtrampHandler=cl.getResourceAsStream(SVG_TRAMPOLINE);
				if(SVGtrampHandler!=null) {
					InputStreamReader SVGtrampReader = new InputStreamReader(new BufferedInputStream(SVGtrampHandler),"UTF-8");
					
					StringBuilder trampcode=new StringBuilder();
					int bufferSize=16384;
					char[] buffer=new char[bufferSize];
					
					int readBytes;
					while((readBytes=SVGtrampReader.read(buffer,0,bufferSize))!=-1) {
						trampcode.append(buffer,0,readBytes);
					}
					
					// Now we have the content of the trampoline, let's create a CDATA with it!
					CDATASection cdata=svg.createCDATASection(trampcode.toString());
					// Freeing up some resources
					trampcode=null;
					buffer=null;
					
					Element SVGroot=svg.getDocumentElement();
					
					// The trampoline content lives inside a script tag
					Element script=svg.createElementNS(SVGroot.getNamespaceURI(),"script");
					script.setAttribute("type","text/ecmascript");
					script.insertBefore(cdata,null);
					
					// Injecting the script inside the root
					SVGroot.insertBefore(script,SVGroot.getFirstChild());
					
					// Last, setting up the initialization hook
					SVGroot.setAttribute("onload",SVG_JSINIT);
				} else {
					throw new IOException("Unable to find/fetch SVG ECMAscript trampoline stored at "+SVG_TRAMPOLINE);
				}
				
				// At last, writing it...
				TransformerFactory tf=TransformerFactory.newInstance();
				Transformer t=tf.newTransformer();
				t.transform(new DOMSource(svg),new StreamResult(SVGFile));
			}
		}
	}
}
