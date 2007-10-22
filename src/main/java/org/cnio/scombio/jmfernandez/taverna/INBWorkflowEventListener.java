package org.cnio.scombio.jmfernandez.taverna;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;

import java.util.Map;

import org.apache.log4j.Logger;
import org.apache.log4j.Level;

import org.embl.ebi.escience.baclava.DataThing;

import org.embl.ebi.escience.scufl.enactor.WorkflowEventListener;
import org.embl.ebi.escience.scufl.enactor.event.CollectionConstructionEvent;
import org.embl.ebi.escience.scufl.enactor.event.UserChangedDataEvent;
import org.embl.ebi.escience.scufl.enactor.event.NestedWorkflowCompletionEvent;
import org.embl.ebi.escience.scufl.enactor.event.NestedWorkflowCreationEvent;
import org.embl.ebi.escience.scufl.enactor.event.NestedWorkflowFailureEvent;
import org.embl.ebi.escience.scufl.enactor.event.ProcessCompletionEvent;
import org.embl.ebi.escience.scufl.enactor.event.IterationCompletionEvent;
import org.embl.ebi.escience.scufl.enactor.event.ProcessFailureEvent;
import org.embl.ebi.escience.scufl.enactor.event.WorkflowCompletionEvent;
import org.embl.ebi.escience.scufl.enactor.event.WorkflowCreationEvent;
import org.embl.ebi.escience.scufl.enactor.event.WorkflowDestroyedEvent;
import org.embl.ebi.escience.scufl.enactor.event.WorkflowFailureEvent;
import org.embl.ebi.escience.scufl.enactor.event.WorkflowToBeDestroyedEvent;

import org.embl.ebi.escience.scufl.tools.WorkflowLauncher;

/*
import org.embl.ebi.escience.scufl.ScuflModelEventListener;
import org.embl.ebi.escience.scufl.ScuflModelEvent;
*/

public class INBWorkflowEventListener
	implements WorkflowEventListener/*,ScuflModelEventListener*/
{
	private static Logger logger =
		Logger.getLogger(INBWorkflowEventListener.class);
	
	private final static String EXT=".xml";
	
	private final static String RESULTS="Results";
	private final static String INPUTS="Inputs";
	private final static String OUTPUTS="Outputs";
	
	private final static String START="START";
	private final static String FAILED="FAILED.txt";
	private final static String FINISH="FINISH";
	private final static String ENCODING="UTF-8";
	
	protected static void SaveDataThings(String name, Map<String,DataThing> thing, File baseDir)
		throws IOException
	{
		File dataFile=new File(baseDir,name+EXT);
		File dataDir=new File(baseDir,name);
		WorkflowLauncher.saveOutputDoc(thing, dataFile);
		WorkflowLauncher.saveOutputs(thing, dataDir);
	}
	
	protected File statusDir;
	protected File resultsDir;

	public INBWorkflowEventListener(File statusDir)
	{
		this.statusDir=statusDir;
		this.resultsDir=new File(statusDir,RESULTS);
	}
	
	/**
		Signifies a change in the model that might be of interest to a view.
		No aditional description from Tom Oinn
	*/
	/*
	public void receiveModelEvent(ScuflModelEvent event) {
		logger.debug("Event type: "+event.getEventType());
		logger.debug("Message: "+event.getMessage());
		logger.debug("Source: "+event.getSource().getClass().getName()+"\n");
	}
	*/
	
	/**
		Called when a workflow instance has been submitted along with
		associated input data to an enactor instance. Methods on the
		WorkflowCreationEvent allow access to the underlying workflow
		instance, the user context and the enactor.
	*/
	public void workflowCreated(WorkflowCreationEvent e) {
		logger.debug("Workflow "+ e.getModel().getDescription().getTitle()+ " (LSID "+e.getDefinitionLSID()+") has been created");
		
		try {
			SaveDataThings(INPUTS,e.getInputs(),statusDir);
		} catch(IOException ioe) {
			logger.error("Unable to save workflow inputs",ioe);
		}
		
		File start=new File(statusDir,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal workflow creation",ioe);
		}
	}


	/**
		Called when a workflow instance fails for some reason
	*/
	public void workflowFailed(WorkflowFailureEvent e) {
		logger.debug("Workflow failed: "+ e.toString());
		
		File failed=new File(statusDir,FAILED);
		try {
			failed.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal workflow failure",ioe);
		}
	}
	
	/**
		Called when a previously scheduled workflow completes successfuly.
		This is called after results are available, so storage plugins
		may rely on the getResults method on the workflow instance
		references within the event being valid.
	*/
	public void workflowCompleted(WorkflowCompletionEvent e) {
		logger.debug("Workflow completed: "+ e.toString());
		
		File failed=new File(statusDir,FINISH);
		try {
			failed.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal workflow completion",ioe);
		}
	}
	
	/**
		Called when a nested workflow fails. The event contains an
		reference to the failed workflow instance.
	*/
	public void nestedWorkflowFailed(NestedWorkflowFailureEvent e) {
		Exception ex=e.getCause();
		String message=ex.getMessage();
		if(message==null)  message="(null)";
		
		String procName=e.getProcessor().getName();
		
		logger.debug("Nested workflow "+procName+" failed due "+message);
		
		File thisProcess=new File(resultsDir,procName);
		thisProcess.mkdirs();
		
		File start=new File(thisProcess,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal nested workflow "+procName+" failure",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getInputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save nested workflow "+procName+" inputs",ioe);
		}
		
		// Now, saving the causes
		File failed=new File(thisProcess,FAILED);
		try {
			PrintWriter pw = new PrintWriter(failed,ENCODING);
			pw.println("Cause: "+message+"\n");
			ex.printStackTrace(pw);
			pw.close();
		} catch(UnsupportedEncodingException uee) {
			logger.fatal("FATAL ENCODING ERROR",uee);
		} catch(FileNotFoundException fnfe) {
			logger.error("Unable to save nested workflow "+procName+" failure messages",fnfe);
		}
	}

	/**
		Called when a nested workflow instance is created and about to be
		invoked by the enactor instance. Where a nested workflow exists
		within an iteration, this will be called for each iteration. The
		event carries details of the workflow instance created.
	*/
	public void nestedWorkflowCreated(NestedWorkflowCreationEvent e) {
		logger.debug("Workflow "+ e.getNestedWorkflowInstance().getID()+" has been created");
	}

	/**
		Called when a nested workflow instance has completed its
		invocation successfully. The event carries with it details of
		the workflow instance invoked.
	*/
	public void nestedWorkflowCompleted(NestedWorkflowCompletionEvent e) {
		String procName=e.getProcessor().getName();
		logger.debug("Nested workflow "+procName+(e.isIterating()?"(I)":"(N)")+" has been completed");
		
		File thisProcess=new File(resultsDir,procName);
		thisProcess.mkdirs();
		
		File start=new File(thisProcess,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal nested workflow "+procName+" initialization",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getInputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save nested workflow "+procName+" inputs",ioe);
		}
		
		try {
			SaveDataThings(OUTPUTS,e.getOutputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save nested workflow "+procName+" outputs",ioe);
		}
		
		File finish=new File(thisProcess,FINISH);
		try {
			finish.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal nested workflow "+procName+" completion",ioe);
		}
	}
	
	/**
		Called when an individual processor within a workflow completes
		its invocation successfuly. For cases where iteration is involved
		this is called once for each invocation of the processor task
		within the iteration.
	*/
	public void processCompleted(ProcessCompletionEvent e) {
		String procName=e.getProcessor().getName();
		logger.debug("Process "+procName+(e.isIterating()?"(I)":"(N)")+" has been completed");
		
		File thisProcess=new File(resultsDir,procName);
		thisProcess.mkdirs();
		
		File start=new File(thisProcess,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal process "+procName+" initialization",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getInputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save process "+procName+" inputs",ioe);
		}
		
		try {
			SaveDataThings(OUTPUTS,e.getOutputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save process "+procName+" outputs",ioe);
		}
		
		File finish=new File(thisProcess,FINISH);
		try {
			finish.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal process "+procName+" completion",ioe);
		}
	}
	
	/**
		Called when the iteration stage of the processor is completed the
		event carries details of the LSIDs of the component results which
		are now integrated into the result of the process
	*/
	public void processCompletedWithIteration(IterationCompletionEvent e) {
		String procName=e.getProcessor().getName();
		logger.debug("Iterating Process "+procName+" has been completed");
		
		File thisProcess=new File(resultsDir,e.getProcessor().getName());
		thisProcess.mkdirs();
		
		File start=new File(thisProcess,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal iterated process "+procName+" initialization",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getOverallInputs(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save iterated process "+procName+" inputs",ioe);
		}
		
		try {
			SaveDataThings(OUTPUTS,e.getOverallOutputs(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save iterated process "+procName+" outputs",ioe);
		}
		
		File finish=new File(thisProcess,FINISH);
		try {
			finish.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal iterated process "+procName+" completion",ioe);
		}
	}
	
	/**
		Called when a process fails - typically this will be followed by
		a WorkflowFailed event.
	*/
	public void processFailed(ProcessFailureEvent e) {
		Exception ex=e.getCause();
		String message=ex.getMessage();
		if(message==null)  message="(null)";
		
		String procName=e.getProcessor().getName();
		
		logger.debug("Process "+procName+" failed due "+message);
		
		File thisProcess=new File(resultsDir,procName);
		thisProcess.mkdirs();
		
		File start=new File(thisProcess,START);
		try {
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal process "+procName+" failure",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getInputMap(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save process "+procName+" inputs",ioe);
		}
		
		// Now, saving the causes
		File failed=new File(thisProcess,FAILED);
		try {
			PrintWriter pw = new PrintWriter(failed,ENCODING);
			pw.println("Cause: "+message+"\n");
			ex.printStackTrace(pw);
			pw.close();
		} catch(UnsupportedEncodingException uee) {
			logger.fatal("FATAL ENCODING ERROR",uee);
		} catch(FileNotFoundException fnfe) {
			logger.error("Unable to save process "+procName+" failure messages",fnfe);
		}
	}
	
	/**
		Called when a user changes intemediate data (output).
	*/
	public void dataChanged(UserChangedDataEvent e) {
		logger.debug("Data changed: "+e.getOldDataThingID()+" => "+e.getDataThing().getSyntacticType());
	}

	/**
		Called when a data item is wrapped up inside a default collection
		prior to being passed to a service expecting a higher cardinality
		version of the same input type
	*/
	public void collectionConstructed(CollectionConstructionEvent e) {
		logger.debug("Collection was constructed (wrapped LSID "+e.getOriginalLSID()+")");
	}

	/**
		Called right before workflowInstance.destroy() is to be called.
		(Usually this has been triggered by the user clicking a "Close"
		button in the result window)

		This is your last chance to access the workflow instance before
		it becomes unusable. workflowDestroyed(WorkflowDestroyedEvent)
		will be called after destroy() has been invoked, but at that point
		it will be too late to access the instance.

		Note: This is the last chance to access workflowInstance before it
		is destroyed. If you have your own references to the instance or
		any of the data of workflowInstance (such as the input map), this
		is the time to remove such references.
	*/
	public void workflowToBeDestroyed(WorkflowToBeDestroyedEvent e) {
		logger.debug("Workflow "+ e.getWorkflowInstance().getID()+ " is going to be destroyed");
	}

	/**
		This event is sent after workflowInstance.destroy() has been called.

		This is the last message you receive about this workflow instance,
		which by now should not be accessed anymore.

		event.getWorkflowInstance() on this event will therefore always
		return null, but you can access what would have been the result of
		workflowInstance.getID() by calling event.getWorkflowInstanceID().

		If you would like to access the instance before it has been destroyed,
		do so from workflowToBeDestroyed(WorkflowToBeDestroyedEvent)
	*/
	public void workflowDestroyed(WorkflowDestroyedEvent e) {
		logger.debug("Workflow "+ e.getWorkflowInstanceID()+ " has been destroyed");
	}

}
