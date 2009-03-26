/*
	$Id$
	INBWorkflowParserWrapper.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
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

package org.cnio.scombio.jmfernandez.iwwem;

/* This code is based on the example from Taverna source repository (see comments below) */

import java.awt.Dimension;
import java.awt.geom.Rectangle2D;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
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

//import net.hanjava.svg.EmfWriterGraphics;
import net.sf.taverna.raven.repository.Artifact;
import net.sf.taverna.raven.repository.BasicArtifact;
import net.sf.taverna.raven.repository.Repository;
import net.sf.taverna.raven.repository.impl.LocalRepository;

import org.apache.batik.bridge.BridgeContext;
import org.apache.batik.bridge.GVTBuilder;
import org.apache.batik.bridge.UserAgentAdapter;
import org.apache.batik.gvt.GraphicsNode;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.batik.transcoder.image.ImageTranscoder;
import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;

import org.apache.fop.svg.PDFTranscoder;

import org.apache.log4j.Logger;
import org.apache.log4j.Level;
import org.apache.log4j.PropertyConfigurator;
import org.cnio.scombio.jmfernandez.iwwem.PatchDotSVG.DumbUserAgent;

import org.embl.ebi.escience.scufl.Processor;
import org.embl.ebi.escience.scufl.ScuflException;
import org.embl.ebi.escience.scufl.ScuflModel;
import org.embl.ebi.escience.scufl.parser.XScuflFormatException;
import org.embl.ebi.escience.scufl.parser.XScuflParser;
import org.embl.ebi.escience.scufl.view.DotView;

import org.embl.ebi.escience.scuflui.ScuflSVGDiagram;
import org.embl.ebi.escience.utils.TavernaSPIRegistry;
import org.w3c.dom.svg.SVGDocument;


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
 * application as SPI plugin points, ie. artifacts that are <strong>nFailureot</strong>
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
 * runtime argument <em>-baseDir</em> if provided.
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
 *        -baseDir &lt;path to local repository download dir&gt;]
 *        -workflow &lt;path to workflow scufl file&gt;.
 * </pre>
 *
 * Original author: Stuart Owen
 * Original author: Stian Soiland
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
	public static final String TAVERNA_BASE_VERSION = "1.7.2.0";
	public static final String TAVERNA_MINOR_VERSION = "1.7-SNAPSHOT";
	private static final String SCRIPT_NAME="inbworkflowparser";

	private static final String[][] ParamDescs={
		{"-h","0","Shows this help"},
		{"-help","0","Shows this help"},
		{"--help","0","Shows this help"},
		{"-debug","0","Turns on debugging"},
		{"-workflow","1","Workflow to be processed/run"},
		{"-offline","0","Workflow processing will be done in Taverna offline mode"},
		{"-svggraph","1","File where to save workflow graph in SVG format"},
		{"-dotgraph","1","File where to save workflow graph in DOT format"},
		{"-pnggraph","1","File where to save workflow graph in PNG format"},
		{"-pdfgraph","1","File where to save workflow graph in PDF format"},
//		{"-emfgraph","1","File where to save workflow graph in EMF format"},
		{"-expandSubWorkflows","0","Sub-Workflows are expanded when workflow graph is generated"},
		{"-collapseSubWorkflows","0","Sub-Workflows are collapsed when workflow graph is generated"},
		{"-topDownOrientation","0","Workflow graph layout must be top-down"},
		{"-leftRightOrientation","0","Workflow graph layout must be left-right"},
		{"-baseDir","1","Maven repository dirname"},
		{"-onlyUpdateBaseDir","0","Only update Maven repository"},
	};

	private static final String TAVERNA_GROUP_ID="uk.org.mygrid.taverna";
	private static final String TAVERNA_PROCESSORS_GROUP_ID = TAVERNA_GROUP_ID + ".processors";
	private static final String TAVERNA_BACLAVA_GROUP_ID = TAVERNA_GROUP_ID + ".baclava";
	private static final String TAVERNA_SCUFL_GROUP_ID = TAVERNA_GROUP_ID + ".scufl";
	private static final String TAVERNA_SCUFL_UI_COMPONENTS_GROUP_ID = TAVERNA_SCUFL_GROUP_ID + ".scufl-ui-componets";
	private static final String TAVERNA_RAVEN_GROUP_ID = TAVERNA_GROUP_ID + ".raven";

	private static final String[][] SystemArtifactList={
		{TAVERNA_RAVEN_GROUP_ID,"raven",TAVERNA_MINOR_VERSION},
		{TAVERNA_GROUP_ID,"taverna-core",TAVERNA_BASE_VERSION},
		{TAVERNA_RAVEN_GROUP_ID,"raven-log4j",TAVERNA_MINOR_VERSION},
		{TAVERNA_GROUP_ID,"taverna-bootstrap",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-model",TAVERNA_BASE_VERSION},
		{TAVERNA_BACLAVA_GROUP_ID,"baclava-core",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_UI_COMPONENTS_GROUP_ID,"svg-diagram",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-ui",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-ui-api",TAVERNA_BASE_VERSION},
		{TAVERNA_SCUFL_GROUP_ID,"scufl-tools",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-enactor",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-update-manager",TAVERNA_BASE_VERSION},
//		{TAVERNA_GROUP_ID,"taverna-tools",TAVERNA_BASE_VERSION},
//		{TAVERNA_BACLAVA_GROUP_ID,"baclava-tools",TAVERNA_BASE_VERSION},
//		{TAVERNA_SCUFL_GROUP_ID,"scufl-core",TAVERNA_BASE_VERSION},
//		{TAVERNA_SCUFL_GROUP_ID,"scufl-workflow",TAVERNA_BASE_VERSION},
		{"jaxen","jaxen","1.0-FCS"},
		{"saxpath","saxpath","1.0-FCS"},
		{"dom4j","dom4j","1.6"},
		{"org.apache.xmlgraphics","batik-transcoder","1.7"},
		{"org.apache.xmlgraphics","batik-codec","1.7"},
		{"org.apache.xmlgraphics","batik-swing","1.7"},
//		{"org.freehep","freehep-graphicsio-emf","2.1.1"},
		{"xerces","xercesImpl","2.6.2"},
		{"xalan","xalan","2.5.2"},
		{"log4j","log4j","1.2.12"},
	};
	/*
	private static final String[][] ExternalArtifactList={
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-biomart-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-localworkers",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-stringconstant-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-notification-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-beanshell-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-soaplab-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-wsdl-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-apiconsumer-processor",TAVERNA_BASE_VERSION},
		{"biomoby.org","taverna-biomoby",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-contrib",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-java-processor",TAVERNA_BASE_VERSION},
	};
	 */

	private static final String[][] ExternalArtifactList={
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-biomart-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-localworkers",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-stringconstant-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-notification-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-beanshell-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-soaplab-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-wsdl-processor",TAVERNA_BASE_VERSION},
		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-apiconsumer-processor",TAVERNA_BASE_VERSION},
		{"org.biomoby","taverna-biomoby",TAVERNA_BASE_VERSION},
		{TAVERNA_GROUP_ID,"taverna-contrib",TAVERNA_BASE_VERSION},
//		{TAVERNA_PROCESSORS_GROUP_ID,"taverna-java-processor",TAVERNA_BASE_VERSION},
	};

	private static final String[] RepositoryLocationList={
		"http://www.mygrid.org.uk/maven/repository/",
		"http://moby.ucalgary.ca/moby_maven/",
//		"http://mobycentral.icapture.ubc.ca/maven/",
		"http://repo1.maven.org/maven2/",
		"http://mirrors.sunsite.dk/maven2/",
		"http://www.ibiblio.org/maven2/",
		"http://www.mygrid.org.uk/maven/snapshot-repository/",
//		"http://download.java.net/maven/2"
	};

	private static HashMap<String,Integer> OptionHash=new HashMap<String,Integer>();

	private static ArrayList<String[][]> OptionArray=new ArrayList<String[][]>();

	private static Logger logger;

	private static File OriginalDir;

	// Filling the parameters hash!
	static {
		// Living the headless way!
		System.setProperty("java.awt.headless", "true");

		// Setting up Taverna HOME from appassembler script info
		System.setProperty("taverna.home", System.getProperty("basedir"));

		// Now, setting up originaldir from envvars
		Map<String,String> envvars = System.getenv();

		// Unix world!
		if(envvars.containsKey("OLDPWD")) {
			OriginalDir=new File(envvars.get("OLDPWD"));
		} else {
			OriginalDir=null;
		}

		// Some checks should be put here for these system properties...
		File log4j=new File(new File(System.getProperty("basedir"),"conf"),"log4j.properties");
		PropertyConfigurator.configure(log4j.getAbsolutePath());
		logger = Logger.getLogger(INBWorkflowParserWrapper.class);

		// Now, hash filling
		FillHashMap(ParamDescs);
	};

	protected File workflowFile;

	File baseDir;

	File dotFile;

	protected File SVGFile;

	protected File PNGFile;

	protected File PDFFile;

//	protected File EMFFile;

	boolean alignmentParam=false;
	boolean expandWorkflowParam=false;
	boolean onlyMavenUpdate=false;
	boolean isOfflineMode=false;

	protected boolean debugMode=false;

	protected ClassLoader lcl=null;

	public static void main(String[] args) {
		try {
			new INBWorkflowParserWrapper().run(args);
		} catch (Throwable t) {
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
		if(!f.isAbsolute()) {
			if(OriginalDir!=null) {
				f=new File(OriginalDir,filename);
			}
			f=f.getCanonicalFile();
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
		processArgs(args);

		logger.debug("Param processing has finished. Starting repository initialization");
		//TavernaSPIRegistry.setRepository(((LocalArtifactClassLoader)getClass().getClassLoader()).getRepository());

		Repository repository = initialiseRepository();
		logger.debug("Repository initialization has finished. Starting TavernaSPI");
		TavernaSPIRegistry.setRepository(repository);
		//PluginManager.setRepository(repository);
		//PluginManager.getInstance();

		logger.debug("TavernaSPI has finished.");

		ScuflModel model = null;
		if(!onlyMavenUpdate) {
			logger.debug("Starting Workflow Handling.");

			model = new ScuflModel();
			// First, mark it as offline
			if(isOfflineMode)
				model.setOffline(true);
			
			try {
				InputStream workflowInputStream = new FileInputStream(workflowFile);
				XScuflParser.populate(workflowInputStream, model, null);
//				} catch (IOException e) {
//				logger.error("Could not read workflow " + workflowFile.getAbsolutePath(),e);
//				System.exit(6);
			} catch (XScuflFormatException e) {
				logger.error("Could not parse workflow " + workflowFile.getAbsolutePath(),e);
				System.exit(15);
			} catch (ScuflException e) {
				logger.error("Could not load workflow " + workflowFile.getAbsolutePath(),e);
				System.exit(7);
			}

			// Now it is time to generate workflow SVG (if it is possible!)
			generateWorkflowGraph(model);
		}

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
	 * defined by <code>-baseDir</code> if required.
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
		Repository repository = LocalRepository.getRepository(base, myLoader, systemArtifacts);
		for (Artifact artifact : externalArtifacts) {
			logger.debug("Adding external artifact "+artifact.getArtifactId());
			repository.addArtifact(artifact);
		}

		for (URL location : repositoryLocations) {
			logger.debug("Adding external location "+location.toString());
			repository.addRemoteRepository(location);
		}

		repository.update();
		try {
			lcl=repository.getLoader(new BasicArtifact(TAVERNA_SCUFL_GROUP_ID,"scufl-workflow",TAVERNA_BASE_VERSION),null);
		} catch(Exception ex) {
			ex.printStackTrace();
		}
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
	 * This is defined by the argument <code>-baseDir</code>. If this is not
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
			logger.warn("No -baseDir defined, so using default location of: "
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

	protected void setDebugMode() {
		debugMode=true;
		logger.setLevel(Level.DEBUG);
	}

	protected void processParam(String param, ArrayList<String> values)
		throws Exception
	{
		if(param.equals("-debug")) {
			setDebugMode();
		} else if(param.equals("--help") || param.equals("-help") || param.equals("-h")) {
			showHelp(0);
			//throw new Exception("");
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
//		} else if (param.equals("-emfgraph")) {
//			EMFFile = NewFile(values.get(0));
		} else if (param.equals("-topDownOrientation")) {
			alignmentParam=false;
		} else if (param.equals("-leftRightOrientation")) {
			alignmentParam=true;
		} else if (param.equals("-expandSubWorkflows")) {
			expandWorkflowParam=true;
		} else if (param.equals("-collapseSubWorkflows")) {
			expandWorkflowParam=false;
		} else if (param.equals("-onlyUpdateBaseDir")) {
			onlyMavenUpdate=true;
		} else if (param.equals("-offline")) {
			isOfflineMode=true;
		} else {
			logger.warn("Argument "+param+" has not been processed because this parsing code is incomplete!");
		}
	}

	/**
		Post-processing, like additional checks or
		post-loading modifications.
	 */
	protected void checkSetParams()
		throws Exception
	{
		if (workflowFile == null && !onlyMavenUpdate) {
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
		throws FileNotFoundException,IOException
	{
		if(dotFile!=null || SVGFile!=null || PNGFile!=null || PDFFile!=null /*|| EMFFile!=null*/) {
			DotView dotView=new DotView(model);
			// Here the different graph drawing parameters
			dotView.setPortDisplay(DotView.BOUND);
			dotView.setAlignment(alignmentParam);
			dotView.setExpandWorkflow(expandWorkflowParam);

			// And here, getting the dot
			String dotContent=dotView.getDot();
			// Freeing resources
			dotView=null;

			// At last, saving!!!
			if(dotFile!=null) {
				//PrintStream ps=new PrintStream(new BufferedOutputStream(new FileOutputStream(dotFile)));
				PrintStream ps=new PrintStream(dotFile,"UTF-8");

				ps.print(dotContent);

				ps.close();

			}

			if(SVGFile!=null || PNGFile!=null || PDFFile!=null /*|| EMFFile!=null*/) {
				// Translating to SVG!!!!!
				SVGDocument svg=ScuflSVGDiagram.getSVG(dotContent);

				PatchDotSVG pds = new PatchDotSVG();
				pds.doPatch(svg,SVGFile);

				if(PDFFile!=null) {
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
						System.exit(1);
					} finally {
						// Flush and close the stream.
						foe.flush();
						foe.close();
					}
				}

				if(PNGFile!=null) {
					// Create a PNG transcoder
					PNGTranscoder pngt = new PNGTranscoder();

					// Set the transcoding hints.
					// Transparent background must be white pixels
					// and we are using a reduced color palette
					pngt.addTranscodingHint(ImageTranscoder.KEY_FORCE_TRANSPARENT_WHITE,new Boolean(true));
					pngt.addTranscodingHint(PNGTranscoder.KEY_INDEXED,	new Integer(8));

					TranscoderInput input = new TranscoderInput(svg);

					// Create the transcoder output.
					FileOutputStream foe = new FileOutputStream(PNGFile);
					TranscoderOutput output = new TranscoderOutput(foe);

					// Save the image.
					try {
						pngt.transcode(input, output);
					} catch(TranscoderException te) {
						logger.fatal("Transcoding to PNG failed",te);
						System.exit(1);
					} finally {
						// Flush and close the stream.
						foe.flush();
						foe.close();
					}
				}
				
				/*
				if(EMFFile!=null) {
					// These lines are from net.hanjava.svg.SVG2EMF class
					// created by behumble@hanjava.net
					
					// And next patch is needed by automatic SVG zoom code
					// But it cannot be applied until some Batik initialization
					// constrains have been overcome.
					UserAgentAdapter dua=pds.new DumbUserAgent();
					GVTBuilder builder = new GVTBuilder();
					BridgeContext ctx = new BridgeContext(dua);
					ctx.setDynamic(true);
					// Needed to build up the internal infrastructure
					// GraphicsNode gn = builder.build(ctx, svg);
					GraphicsNode rootNode = builder.build(ctx, svg);
					ctx.dispose();

					// x,y can be non-(0,0)
					Rectangle2D bounds = rootNode.getBounds();
					int w = (int)(bounds.getX() + bounds.getWidth());
					int h = (int)(bounds.getY() + bounds.getHeight());

					// write to EmfWriter
					FileOutputStream emfStream = new FileOutputStream(EMFFile);
					//EmfWriterGraphics eg2d = new EmfWriterGraphics(emfStream, new Dimension(w, h));
					org.freehep.graphicsio.emf.EMFGraphics2D eg2d = new EmfWriterGraphics(emfStream, new Dimension(w, h));
					eg2d.setDeviceIndependent(true);
					eg2d.startExport();
					rootNode.paint(eg2d);
					eg2d.dispose();
					eg2d.endExport();
					emfStream.close();
				}
				*/
			}
		}
	}
	
}
