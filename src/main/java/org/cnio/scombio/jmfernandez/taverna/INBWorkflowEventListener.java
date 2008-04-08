/*
	$Id$
	INBWorkflowEventListener.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
*/
package org.cnio.scombio.jmfernandez.taverna;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;

import java.util.HashMap;
import java.util.Map;

import org.apache.log4j.Logger;
import org.apache.log4j.Level;

import org.embl.ebi.escience.baclava.DataThing;

import org.embl.ebi.escience.scufl.Processor;
import org.embl.ebi.escience.scufl.ScuflModel;

import org.embl.ebi.escience.scufl.enactor.WorkflowInstance;
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
	
	public final static String EXT=".xml";
	
	public final static String RESULTS="Results";
	public final static String INPUTS="Inputs";
	public final static String OUTPUTS="Outputs";
	public final static String ITERATIONS="Iterations";
	
	private final static String START="START";
	private final static String ITERATE="ITERATE";
	private final static String FAILED="FAILED.txt";
	private final static String FINISH="FINISH";
	private final static String ENCODING="UTF-8";
	
	protected static void SaveDataThings(String name, Map<String,DataThing> thing, File baseDir)
		throws IOException
	{
		File dataFile=new File(baseDir,name+EXT);
		WorkflowLauncher.saveOutputDoc(thing, dataFile);
		/* We could avoid this waste!
			
			File dataDir=new File(baseDir,name);
			dataDir.mkdirs();
			WorkflowLauncher.saveOutputs(thing, dataDir);
		*/
	}
	
	protected File statusDir;
	protected File resultsDir;
	protected WorkflowInstance currentWI;
	protected ClassLoader lcl;
	
	protected HashMap<String,Integer> iterState;
	protected HashMap<WorkflowInstance,WorkflowInstance> wInheritance;
	
	protected INBEnactionAsyncReport t;
	
	public INBWorkflowEventListener(File statusDir,ClassLoader lcl)
	{	this(statusDir,lcl,false);
	}
	
	public INBWorkflowEventListener(File statusDir,ClassLoader lcl,boolean debugMode)
	{
		if(debugMode) {
			logger.setLevel(Level.DEBUG);
		}
		this.statusDir=statusDir;
		this.resultsDir=new File(statusDir,RESULTS);
		this.iterState=new HashMap<String,Integer>();
		this.wInheritance=new HashMap<WorkflowInstance,WorkflowInstance>();
		this.lcl=lcl;
		currentWI=null;
		t=null;
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
		logger.info("Workflow "+ e.getModel().getDescription().getTitle()+ " (LSID "+e.getDefinitionLSID()+") has been created");
		
		// This is the place where the reporting thread should be created!
		// and we must take into account embedded workflows!
		WorkflowInstance thisWI=e.getWorkflowInstance();
		if(currentWI==null) {
			currentWI=thisWI;
			t=new INBEnactionAsyncReport(thisWI,statusDir);

			// The thread can die when the program has finished,
			// so it has been marked as a server one
			t.setDaemon(true);
			// Let's start it...
			t.start();
			
			try {
				SaveDataThings(INPUTS,e.getInputs(),statusDir);
			} catch(IOException ioe) {
				logger.error("Unable to save workflow inputs",ioe);
			}
			
			try {
				File start=new File(statusDir,START);
				start.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal workflow creation",ioe);
			}
		}
	}


	/**
		Called when a workflow instance fails for some reason
	*/
	public void workflowFailed(WorkflowFailureEvent e) {
		logger.info("Workflow failed: "+ e.toString());
		
		if(e.getWorkflowInstance()==currentWI) {
			try {
				File failed=new File(statusDir,FAILED);
				failed.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal workflow failure",ioe);
			}
		}
	}
	
	/**
		Called when a previously scheduled workflow completes successfuly.
		This is called after results are available, so storage plugins
		may rely on the getResults method on the workflow instance
		references within the event being valid.
	*/
	public void workflowCompleted(WorkflowCompletionEvent e) {
		logger.info("Workflow completed: "+ e.toString());
		
		if(e.getWorkflowInstance()==currentWI) {
			try {
				File finished=new File(statusDir,FINISH);
				finished.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal workflow completion",ioe);
			}
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
		
		logger.info("Nested workflow "+procName+" failed due "+message);
		
		if(e.getWorkflowInstance()==currentWI) {
			File thisProcess=new File(resultsDir,procName);
			thisProcess.mkdirs();

			try {
				File start=new File(thisProcess,START);
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
			try {
				File failed=new File(thisProcess,FAILED);
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
	}

	/**
		Called when a nested workflow instance is created and about to be
		invoked by the enactor instance. Where a nested workflow exists
		within an iteration, this will be called for each iteration. The
		event carries details of the workflow instance created.
	*/
	public void nestedWorkflowCreated(NestedWorkflowCreationEvent e) {
		WorkflowInstance nested=e.getNestedWorkflowInstance();
		logger.debug("Workflow "+ nested.getID()+" has been created");
		
		/*
		System.err.println(nested.getWorkflowModel());
		try {
			Class WFCLASS = lcl.loadClass("org.embl.ebi.escience.scuflworkers.workflow.WorkflowProcessor");
			for(Processor p:e.getWorkflowInstance().getWorkflowModel().getProcessors()) {
				ScuflModel scf=(ScuflModel)WFCLASS.getDeclaredMethod("getInternalModel",new Class[0]).invoke(p,new Object[0]);
				ScuflModel ppp=p.getModel();
				System.err.println(scf.hashCode());
				System.err.println(ppp.hashCode());
				//if(WFCLASS.isInstance(p) && scf==nested.getWorkflowModel())
				if(WFCLASS.isInstance(p))
					System.err.println("\t"+p.getName());
			}
		} catch(Exception ex) {
			ex.printStackTrace();
		}
		wInheritance.put(nested,e.getWorkflowInstance());
		*/
		/*
		String procName=e.getProcessor().getName();
		logger.info("Nested workflow "+procName+(e.isIterating()?"(I)":"(N)")+" has been completed");
		
		File thisProcess=new File(resultsDir,procName);
		thisProcess.mkdirs();
		
		try {
			File start=new File(thisProcess,START);
			start.createNewFile();
		} catch(IOException ioe) {
			logger.error("Unable signal nested workflow "+procName+" initialization",ioe);
		}
		
		try {
			SaveDataThings(INPUTS,e.getInputs(),thisProcess);
		} catch(IOException ioe) {
			logger.error("Unable to save nested workflow "+procName+" inputs",ioe);
		}
		*/
	}

	/**
		Called when a nested workflow instance has completed its
		invocation successfully. The event carries with it details of
		the workflow instance invoked.
	*/
	public void nestedWorkflowCompleted(NestedWorkflowCompletionEvent e) {
		String procName=e.getProcessor().getName();
		logger.info("Nested workflow "+procName+(e.isIterating()?"(I)":"(N)")+" has been completed");
		
		if(e.getWorkflowInstance()==currentWI) {
			File thisProcess=new File(resultsDir,procName);
			thisProcess.mkdirs();

			try {
				File start=new File(thisProcess,START);
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

			try {
				File finish=new File(thisProcess,FINISH);
				finish.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal nested workflow "+procName+" completion",ioe);
			}
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
		logger.info("Process "+procName+(e.isIterating()?"(I)":"(N)")+" has been completed");
		
		if(e.getWorkflowInstance()==currentWI) {
			File thisProcess=new File(resultsDir,procName);
			thisProcess.mkdirs();

			// Global start
			try {
				File start=new File(thisProcess,START);
				start.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal process "+procName+" initialization",ioe);
			}

			String iterStepString=null;
			if(e.isIterating()) {
				File originalProcess=thisProcess;
				thisProcess=new File(originalProcess,ITERATIONS);
				int iterStep;
				if(iterState.containsKey(procName)) {
					iterStep=iterState.get(procName);
				} else {
					iterStep=0;
					/*
					try {
						File iterate=new File(originalProcess,ITERATE);
						iterate.createNewFile();
					} catch(IOException ioe) {
						logger.error("Unable signal process "+procName+" iteration flag",ioe);
					}
					*/
				}
				originalProcess=null;

				// Saving step and incrementing
				iterStepString=Integer.toString(iterStep);
				iterStep++;
				iterState.put(procName,iterStep);

				// Trailing zeros
				int ilength=iterStepString.length();
				for(int i=4;i>ilength;i--) {
					iterStepString="0"+iterStepString;
				}

				thisProcess=new File(thisProcess,iterStepString);
				thisProcess.mkdirs();


				// Iteration start
				try {
					File start=new File(thisProcess,START);
					start.createNewFile();
				} catch(IOException ioe) {
					logger.error("Unable signal process "+procName+" initialization (step "+iterStepString+")",ioe);
				}
			}

			try {
				SaveDataThings(INPUTS,e.getInputMap(),thisProcess);
			} catch(IOException ioe) {
				logger.error("Unable to save process "+procName+" inputs"+((iterStepString!=null)?" (step "+iterStepString+")":""),ioe);
			}

			try {
				SaveDataThings(OUTPUTS,e.getOutputMap(),thisProcess);
			} catch(IOException ioe) {
				logger.error("Unable to save process "+procName+" outputs"+((iterStepString!=null)?" (step "+iterStepString+")":""),ioe);
			}

			try {
				File finish=new File(thisProcess,FINISH);
				finish.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal process "+procName+" completion"+((iterStepString!=null)?" (step "+iterStepString+")":""),ioe);
			}
		}
	}
	
	/**
		Called when the iteration stage of the processor is completed the
		event carries details of the LSIDs of the component results which
		are now integrated into the result of the process
	*/
	public void processCompletedWithIteration(IterationCompletionEvent e) {
		String procName=e.getProcessor().getName();
		logger.info("Iterating Process "+procName+" has been completed");
		
		if(e.getWorkflowInstance()==currentWI) {
			File thisProcess=new File(resultsDir,e.getProcessor().getName());
			thisProcess.mkdirs();

			try {
				File start=new File(thisProcess,START);
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

			try {
				File finish=new File(thisProcess,FINISH);
				finish.createNewFile();
			} catch(IOException ioe) {
				logger.error("Unable signal iterated process "+procName+" completion",ioe);
			}
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
		
		logger.info("Process "+procName+" failed due "+message);
		
		if(e.getWorkflowInstance()==currentWI) {
			File thisProcess=new File(resultsDir,procName);
			thisProcess.mkdirs();

			try {
				File start=new File(thisProcess,START);
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
			try {
				File failed=new File(thisProcess,FAILED);
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
	}
	
	/**
		Called when a user changes intemediate data (output).
	*/
	public void dataChanged(UserChangedDataEvent e) {
		logger.info("Data changed: "+e.getOldDataThingID()+" => "+e.getDataThing().getSyntacticType());
	}

	/**
		Called when a data item is wrapped up inside a default collection
		prior to being passed to a service expecting a higher cardinality
		version of the same input type
	*/
	public void collectionConstructed(CollectionConstructionEvent e) {
		logger.info("Collection was constructed (wrapped LSID "+e.getOriginalLSID()+")");
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
		logger.info("Workflow "+ e.getWorkflowInstance().getID()+ " is going to be destroyed");
		
		// Cleaning up!
		if(e.getWorkflowInstance()==currentWI) {
			currentWI=null;
			t.tryStop();
			t=null;
		}
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
		logger.info("Workflow "+ e.getWorkflowInstanceID()+ " has been destroyed");
	}

}
