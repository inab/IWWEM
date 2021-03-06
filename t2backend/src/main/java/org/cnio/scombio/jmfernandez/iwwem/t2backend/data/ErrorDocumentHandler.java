/*
	$Id$
	ErrorDocumentHandler.java
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
package org.cnio.scombio.jmfernandez.iwwem.t2backend.data;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import javax.swing.tree.DefaultMutableTreeNode;

import net.sf.taverna.t2.invocation.InvocationContext;
import net.sf.taverna.t2.reference.ErrorDocument;
import net.sf.taverna.t2.reference.ErrorDocumentService;
import net.sf.taverna.t2.reference.IdentifiedList;
import net.sf.taverna.t2.reference.ListService;
import net.sf.taverna.t2.reference.StackTraceElementBean;
import net.sf.taverna.t2.reference.T2Reference;
import net.sf.taverna.t2.reference.T2ReferenceType;

/**
 * Handles Error documents and transforming them into String representations 
 * that can be stored as a file, or within a Baclava document.
 * 
 * @author Stuart Owen
 * @author José María Fernández
 *
 */
public class ErrorDocumentHandler {

	/**
	 * Creates a string representation of the ErrorDocument.
	 */
	public static String buildErrorDocumentString(ErrorDocument errDocument,
			InvocationContext context) {

		String errDocumentString = "";

		String exceptionMessage = errDocument.getExceptionMessage();
		if (exceptionMessage != null && !exceptionMessage.equals("")) {
			DefaultMutableTreeNode exceptionMessageNode = new DefaultMutableTreeNode(
					exceptionMessage);
			errDocumentString += exceptionMessageNode + "\n";
			List<StackTraceElementBean> stackTrace = errDocument
					.getStackTraceStrings();
			if (stackTrace.size() > 0) {
				for (StackTraceElementBean stackTraceElement : stackTrace) {
					errDocumentString += getStackTraceElementString(stackTraceElement)
							+ "\n";
				}
			}
		}

		Set<T2Reference> errorReferences = errDocument.getErrorReferences();
		if (!errorReferences.isEmpty()) {
			errDocumentString += "Set of ErrorDocumentS to follow." + "\n";
		}
		int errorCounter = 1;
		int listCounter = 0;
		for (T2Reference reference : errorReferences) {
			if (reference.getReferenceType().equals(
					T2ReferenceType.ErrorDocument)) {
				ErrorDocumentService errorDocumentService = context
						.getReferenceService().getErrorDocumentService();
				ErrorDocument causeErrorDocument = errorDocumentService
						.getError(reference);
				if (listCounter == 0) {
					errDocumentString += "ErrorDocument " + (errorCounter++)
							+ "\n";
				} else {
					errDocumentString += "ErrorDocument " + listCounter + "."
							+ (errorCounter++) + "\n";
				}
				errDocumentString += buildErrorDocumentString(
						causeErrorDocument, context)
						+ "\n";
			} else if (reference.getReferenceType().equals(
					T2ReferenceType.IdentifiedList)) {
				List<ErrorDocument> errorDocuments = getErrorDocuments(
						reference, context);
				errDocumentString += "ErrorDocument list " + (++listCounter)
						+ "\n";
				for (ErrorDocument causeErrorDocument : errorDocuments) {
					errDocumentString += buildErrorDocumentString(
							causeErrorDocument, context)
							+ "\n";
				}
			}
		}

		return errDocumentString;
	}

	public static void buildErrorDocumentTree(DefaultMutableTreeNode node,
			ErrorDocument errorDocument, InvocationContext context) {
		DefaultMutableTreeNode child = new DefaultMutableTreeNode(errorDocument);
		String exceptionMessage = errorDocument.getExceptionMessage();
		if (exceptionMessage != null && !exceptionMessage.equals("")) {
			DefaultMutableTreeNode exceptionMessageNode = new DefaultMutableTreeNode(
					exceptionMessage);
			child.add(exceptionMessageNode);
			List<StackTraceElementBean> stackTrace = errorDocument
					.getStackTraceStrings();
			if (stackTrace.size() > 0) {
				for (StackTraceElementBean stackTraceElement : stackTrace) {
					exceptionMessageNode.add(new DefaultMutableTreeNode(
							getStackTraceElementString(stackTraceElement)));
				}
			}

		}
		node.add(child);

		Set<T2Reference> errorReferences = errorDocument.getErrorReferences();
		for (T2Reference reference : errorReferences) {
			if (reference.getReferenceType().equals(
					T2ReferenceType.ErrorDocument)) {
				ErrorDocumentService errorDocumentService = context
						.getReferenceService().getErrorDocumentService();
				ErrorDocument causeErrorDocument = errorDocumentService
						.getError(reference);
				if (errorReferences.size() == 1) {
					buildErrorDocumentTree(node, causeErrorDocument, context);
				} else {
					buildErrorDocumentTree(child, causeErrorDocument, context);
				}
			} else if (reference.getReferenceType().equals(
					T2ReferenceType.IdentifiedList)) {
				List<ErrorDocument> errorDocuments = getErrorDocuments(
						reference, context);
				if (errorDocuments.size() == 1) {
					buildErrorDocumentTree(node, errorDocuments.get(0), context);
				} else {
					for (ErrorDocument errorDocument2 : errorDocuments) {
						buildErrorDocumentTree(child, errorDocument2, context);
					}
				}
			}
		}
	}

	private static String getStackTraceElementString(
			StackTraceElementBean stackTraceElement) {
		StringBuilder sb = new StringBuilder();
		sb.append(stackTraceElement.getClassName());
		sb.append('.');
		sb.append(stackTraceElement.getMethodName());
		if (stackTraceElement.getFileName() == null) {
			sb.append("(unknown file)");
		} else {
			sb.append('(');
			sb.append(stackTraceElement.getFileName());
			sb.append(':');
			sb.append(stackTraceElement.getLineNumber());
			sb.append(')');
		}
		return sb.toString();
	}

	public static List<ErrorDocument> getErrorDocuments(T2Reference reference,
			InvocationContext context) {
		List<ErrorDocument> errorDocuments = new ArrayList<ErrorDocument>();
		if (reference.getReferenceType().equals(T2ReferenceType.ErrorDocument)) {
			ErrorDocumentService errorDocumentService = context
					.getReferenceService().getErrorDocumentService();
			errorDocuments.add(errorDocumentService.getError(reference));
		} else if (reference.getReferenceType().equals(
				T2ReferenceType.IdentifiedList)) {
			ListService listService = context.getReferenceService()
					.getListService();
			IdentifiedList<T2Reference> list = listService.getList(reference);
			for (T2Reference listReference : list) {
				errorDocuments
						.addAll(getErrorDocuments(listReference, context));
			}
		}
		return errorDocuments;
	}
}
