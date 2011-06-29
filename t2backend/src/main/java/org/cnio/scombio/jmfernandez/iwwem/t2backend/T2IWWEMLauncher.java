/*
	$Id$
	T2IWWEMLauncher.java
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
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import javax.naming.NamingException;

import net.sf.taverna.platform.spring.RavenAwareClassPathXmlApplicationContext;
import net.sf.taverna.raven.launcher.Launchable;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.DatabaseConfigurationHandler;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.InputsHandler;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.SaveResultsHandler;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.DatabaseConfigurationException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.InvalidOptionException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.OpenDataflowException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.exceptions.ReadInputException;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.options.T2IWWEMLauncherOptions;
import org.cnio.scombio.jmfernandez.iwwem.t2backend.options.T2IWWEMParserOptions;
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

/*
import net.sf.taverna.t2.utility.TypedTreeModel;
import net.sf.taverna.t2.monitor.MonitorNode;
*/

import java.util.List;
import net.sf.taverna.t2.lang.observer.Observable;
import net.sf.taverna.t2.lang.observer.Observer;
import net.sf.taverna.t2.workflowmodel.Processor;
import net.sf.taverna.t2.workflowmodel.impl.ProcessorImpl;
import net.sf.taverna.t2.workflowmodel.ProcessorFinishedEvent;
import net.sf.taverna.t2.monitor.MonitorManager;
import net.sf.taverna.t2.workflowmodel.ProcessorOutputPort;
import net.sf.taverna.t2.workflowmodel.EventHandlingInputPort;

import java.io.FileOutputStream;
import org.jdom.Element;
import org.jdom.output.XMLOutputter;                                                                             
import net.sf.taverna.t2.workflowmodel.serialization.xml.XMLSerializer;
import net.sf.taverna.t2.workflowmodel.serialization.xml.XMLSerializerRegistry;

import org.apache.log4j.Logger;
import org.springframework.context.ApplicationContext;

/**
 * A utility class that wraps the process of executing a workflow, allowing
 * workflows to be easily executed independently of the GUI.
 * 
 * Original author: Stuart Owen
 * @author José María Fernández
 */

public class T2IWWEMLauncher
	extends T2IWWEMParser
	implements Launchable
{

	private static Logger logger = Logger.getLogger(T2IWWEMLauncher.class);

	/**
	 * Main method, purely for development and debugging purposes. Full
	 * execution of workflows will not work through this method.
	 * 
	 * @param args
	 * @throws Exception
	 */
	public static void main(String[] args) {
		new T2IWWEMLauncher().launch(args);
	}
	
	protected T2IWWEMParserOptions parseOptions(String[] args)
		throws InvalidOptionException
	{
		return new T2IWWEMLauncherOptions(args);
	}
	
	public Dataflow setupAndExecute(String[] args,T2IWWEMLauncherOptions options)
		throws InvalidOptionException, EditException, DeserializationException,
			InvalidDataflowException, TokenOrderException, ReadInputException,
			OpenDataflowException, DatabaseConfigurationException
	{
		Dataflow dataflow = null;
		if (!options.askedForHelp()) {
			dataflow = super.setupAndExecute(args, options);
			if(!options.getStartDatabaseOnly() && dataflow!=null) {
				InvocationContext context = createInvocationContext();

				WorkflowInstanceFacade facade = compileFacade(dataflow, context);
				InputsHandler inputsHandler = new InputsHandler();
				Map<String, DataflowInputPort> portMap = new HashMap<String, DataflowInputPort>();

				for (DataflowInputPort port : dataflow.getInputPorts()) {
					portMap.put(port.getName(), port);
				}
				inputsHandler.checkProvidedInputs(portMap, options);
				Map<String, WorkflowDataToken> inputs = inputsHandler.registerInputs(portMap, options, context);

				T2IWWEMResultListener resultListener = addResultListener(facade, context, dataflow, options);
				
				List<? extends Processor> processorList = dataflow.getProcessors();
				for(Processor processor: processorList) {
					Observer<ProcessorFinishedEvent> p_obs = new IWWEMProcessorFinishedObserver(processor,"");
					((ProcessorImpl)processor).addObserver(p_obs);
				}
				// MonitorManager.getInstance().addObserver(new MonitorListener());
				
				executeWorkflow(facade, inputs, resultListener);
			}
		} else {
			options.displayHelp();
		}

		return dataflow;
	}

	protected void executeWorkflow(
			WorkflowInstanceFacade facade,
			Map<String, WorkflowDataToken> inputs,
			T2IWWEMResultListener resultListener
		) throws TokenOrderException
	{
		facade.fire();
		for (String inputName : inputs.keySet()) {
			WorkflowDataToken token = inputs.get(inputName);
			facade.pushData(token, inputName);
		}
		
		// facade.getStateModel() not implemented.........
		// So no easy monitoring through TypedTreeModel<MonitorNode>
		/*
		TypedTreeModel<MonitorNode> ttm = facade.getStateModel();
		if(ttm!=null) {
			int nchildren = ttm.getChildCount(ttm.getRoot());
			System.err.println("resultListener has "+nchildren+" children");
			
		} else {
			System.err.println("Bad luck :-(");
		}
		*/
		
		while (!resultListener.isComplete()) {
			try {
				Thread.sleep(100);
			} catch (InterruptedException e) {
				logger.warn(
					"Thread Interuption Exception whilst waiting for dataflow completion",
					e
				);
			}
		}
	}

	private InvocationContext createInvocationContext()
	{
		ReferenceService referenceService = createReferenceServiceBean();
		ProvenanceConnector connector = null;
		DataManagementConfiguration dbConfig = DataManagementConfiguration.getInstance();
		if (dbConfig.isProvenanceEnabled()) {
			String connectorType = dbConfig.getConnectorType();

			for (ProvenanceConnectorFactory factory : ProvenanceConnectorFactoryRegistry.getInstance().getInstances()) {
				if (connectorType.equalsIgnoreCase(factory.getConnectorType())) {
					connector = factory.getProvenanceConnector();
				}
			}
			if (connector != null) {
				connector.init();
			} else {
				error("Unable to initialise the provenance - the ProvenanceConnector cannot be found.");
			}
		}
		InvocationContext context = new T2IWWEMInvocationContext(referenceService, connector);
		return context;
	}

	private File determineOutputDir(T2IWWEMLauncherOptions options, String dataflowName)
	{
		File result = null;
		if (options.getOutputDirectory() != null) {
			result = new File(options.getOutputDirectory());
			if (result.exists()) {
				error("The specified output directory '" + options.getOutputDirectory() + "' already exists");
			}
		} else if (options.getOutputDocument() == null) {
			result = new File(dataflowName + "_output");
			int x = 1;
			while (result.exists()) {
				result = new File(dataflowName + "_output_" + x);
				x++;
			}
		}
		if (result != null) {
			System.out.println(
				"Outputs will be saved to the directory: " + result.getAbsolutePath()
			);
		}
		return result;
	}

	protected void error(String msg)
	{
		System.err.println(msg);
		System.exit(-1);
	}

	private T2IWWEMResultListener addResultListener(
			WorkflowInstanceFacade facade,
			InvocationContext context,
			Dataflow dataflow,
			T2IWWEMLauncherOptions options
		)
	{
		File outputDir = null;
		File baclavaDoc = null;

		if (options.saveResultsToDirectory()) {
			outputDir = determineOutputDir(options, dataflow.getLocalName());
		}
		if (options.getOutputDocument() != null) {
			baclavaDoc = new File(options.getOutputDocument());
		}

		Map<String, Integer> outputPortNamesAndDepth = new HashMap<String, Integer>();
		for (DataflowOutputPort port : dataflow.getOutputPorts()) {
			outputPortNamesAndDepth.put(port.getName(), port.getDepth());
		}
		SaveResultsHandler resultsHandler = new SaveResultsHandler(
			outputPortNamesAndDepth,
			outputDir,
			baclavaDoc
		);
		T2IWWEMResultListener listener = new T2IWWEMResultListener(
			outputPortNamesAndDepth.size(),
			resultsHandler,
			outputDir != null,
			baclavaDoc != null
		);
		facade.addResultListener(listener);
		return listener;
	}

	protected ReferenceService createReferenceServiceBean()
	{
		ApplicationContext appContext = new RavenAwareClassPathXmlApplicationContext(
			DataManagementConfiguration.getInstance().getDatabaseContext()
		);
		return (ReferenceService) appContext.getBean("t2reference.service.referenceService");
	}

	protected WorkflowInstanceFacade compileFacade(Dataflow dataflow, InvocationContext context)
		throws InvalidDataflowException
	{
		Edits edits = EditsRegistry.getEdits();
		
		// With this code we add fake outputs, so we can "listen" on intermediate workflow results
		for(Processor p: dataflow.getProcessors()) {
			for(ProcessorOutputPort pop: p.getOutputPorts()) {
				String newOut = "__"+p.getLocalName()+"_"+pop.getName();
				//DataflowOutputPort dfop = edits.createDataflowOutputPort(newOut,dataflow);
				//EventHandlingInputPort ehip = dfop.getInternalInputPort();
				try {
					edits.getCreateDataflowOutputPortEdit(dataflow,newOut).doEdit();
					List<? extends DataflowOutputPort> outL = dataflow.getOutputPorts();
					edits.getConnectProcessorOutputEdit(p,pop.getName(),outL.get(outL.size()-1).getInternalInputPort()).doEdit();
				} catch(net.sf.taverna.t2.workflowmodel.EditException ee) {
					System.err.println("JORL "+ee.getMessage());
				}
			}
		}
		
		/*
		try {
			XMLSerializer serializer = XMLSerializerRegistry.getInstance().getSerializer();
			Element el = serializer.serializeDataflow(dataflow);
			new XMLOutputter().output(el,new FileOutputStream("/tmp/work.t2flow"));
		} catch(Exception e) {
			System.err.println("UHOH "+e.getMessage());
		}
		*/

		return edits.createWorkflowInstanceFacade(dataflow, context, "");
	}

}
