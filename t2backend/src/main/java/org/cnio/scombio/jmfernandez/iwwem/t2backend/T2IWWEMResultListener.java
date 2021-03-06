/*
	$Id$
	T2IWWEMResultListener.java
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

import java.util.HashMap;
import java.util.Map;

import org.cnio.scombio.jmfernandez.iwwem.t2backend.data.SaveResultsHandler;
import net.sf.taverna.t2.facade.ResultListener;
import net.sf.taverna.t2.invocation.WorkflowDataToken;

import org.apache.log4j.Logger;

/**
 * A ResultListener that is using for collecting and storing results when running
 * workflows from the commandline.
 * 
 * Original author: Stuart Owen
 * @author José María Fernández
 */
public class T2IWWEMResultListener
	implements ResultListener
{
	
	private static final Logger logger = Logger.getLogger(T2IWWEMResultListener.class);
	
	private Map<String, WorkflowDataToken> outputMap = new HashMap<String, WorkflowDataToken>();	
	private Map<String,WorkflowDataToken> finalTokens = new HashMap<String, WorkflowDataToken>();	
	private final SaveResultsHandler saveResultsHandler;
	private final int numberOfOutputs;
	private final boolean saveIndividualResults;
	private final boolean saveOutputDocument;

	public T2IWWEMResultListener(int numberOfOutputs,SaveResultsHandler saveResultsHandler,boolean saveIndividualResults,boolean saveOutputDocument)
	{
		this.numberOfOutputs = numberOfOutputs;
		this.saveResultsHandler = saveResultsHandler;
		this.saveIndividualResults = saveIndividualResults;
		this.saveOutputDocument = saveOutputDocument;						
	}

	public Map<String, WorkflowDataToken> getOutputMap()
	{
		return outputMap;
	}

	public boolean isComplete()
	{
		return finalTokens.size() == numberOfOutputs;
	}

	public void resultTokenProduced(WorkflowDataToken token, String portName)
	{
		if (saveIndividualResults) {
			saveResultsHandler.tokenReceived(token, portName);
		}
		
		if (token.isFinal()) {
			finalTokens.put(portName, token);		
			if (isComplete() && saveOutputDocument) {
				try {
					saveResultsHandler.saveOutputDocument(finalTokens);
				} catch (Exception e) {
					logger.error("An error occurred saving the final results to -outputdoc",e);
				}
			}
		}
	}

}
