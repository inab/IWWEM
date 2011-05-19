/*
	$Id: T2IWWEMLauncher.java 319 2011-05-12 16:20:45Z jmfernandez $
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

import net.sf.taverna.t2.lang.observer.Observable;
import net.sf.taverna.t2.lang.observer.Observer;
import net.sf.taverna.t2.workflowmodel.ProcessorFinishedEvent;
import net.sf.taverna.t2.workflowmodel.impl.ProcessorImpl;
import net.sf.taverna.t2.workflowmodel.Processor;

public class IWWEMProcessorFinishedObserver
	implements Observer<ProcessorFinishedEvent>
{

	private Processor workflowItem;
	private final String expectedProcessId;
	
	public IWWEMProcessorFinishedObserver(Processor workflowItem, String expectedProcessId) {
		this.workflowItem = workflowItem;
		this.expectedProcessId = expectedProcessId;
	}
	
	public void notify(Observable<ProcessorFinishedEvent> sender, ProcessorFinishedEvent message)
		throws Exception
	{
		System.err.println("NOTI from "+((ProcessorImpl)message.getProcessor()).getLocalName());
		if (! message.getOwningProcess().equals(expectedProcessId)) {
			return;
		}
		/*
		synchronized(WorkflowInstanceFacadeImpl.this) {
			processorsToComplete--;
		}
		
		// De-register the processor node from the monitor as it has finished
		monitorManager.deregisterNode(message.getOwningProcess());
		
		// De-register this observer from the processor
		message.getProcessor().removeObserver(this);
		
		// All processors have finished => the workflow run has finished
		checkWorkflowFinished();
		*/
	}
}
