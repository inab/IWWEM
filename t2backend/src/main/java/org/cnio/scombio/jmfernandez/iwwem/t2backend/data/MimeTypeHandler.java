/*
	$Id$
	MimeTypeHandler.java
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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import net.sf.taverna.t2.invocation.InvocationContext;
import net.sf.taverna.t2.reference.ExternalReferenceSPI;
import net.sf.taverna.t2.reference.ReferenceSet;
import net.sf.taverna.t2.reference.ReferencedDataNature;
import net.sf.taverna.t2.reference.T2Reference;
import net.sf.taverna.t2.reference.T2ReferenceType;

import org.apache.log4j.Logger;

import eu.medsea.mimeutil.MimeType;
import eu.medsea.mimeutil.MimeUtil2;

/**
 * Handles identifying mime-types for a given data stream, or T2Reference
 * 
 * @author Stuart Owen
 * @author José María Fernández
 */
public class MimeTypeHandler {
	
	private static Logger logger = Logger.getLogger(MimeTypeHandler.class);
	
	@SuppressWarnings("unchecked")
	public static List<MimeType> getMimeTypes(InputStream inputStream,InvocationContext context) throws IOException {
		List<MimeType> mimeList = new ArrayList<MimeType>();
		MimeUtil2 mimeUtil = new MimeUtil2();
		mimeUtil
				.registerMimeDetector("eu.medsea.mimeutil.detector.ExtensionMimeDetector");
		mimeUtil
				.registerMimeDetector("eu.medsea.mimeutil.detector.MagicMimeMimeDetector");
		mimeUtil
				.registerMimeDetector("eu.medsea.mimeutil.detector.WindowsRegistryMimeDetector");
		mimeUtil
				.registerMimeDetector("eu.medsea.mimeutil.detector.ExtraMimeTypes");
		
		try {
			byte[] bytes = new byte[2048];
			inputStream.read(bytes);
			Collection mimeTypes2 = mimeUtil.getMimeTypes(bytes);
			mimeList.addAll(mimeTypes2);
		} finally {
			try {
				inputStream.close();
			} catch (IOException e) {
				logger.error(
						"Failed to close stream after determining mimetype", e);
			}
		}
		return mimeList;
	}
	
	public static List<String> determineMimeTypes(T2Reference reference,
			InvocationContext context) throws IOException {
		List<String> mimeTypeList = new ArrayList<String>();

		if (reference.getReferenceType() == T2ReferenceType.ErrorDocument) {
			mimeTypeList.add("text/plain");
		} else {
			ReferenceSet referenceSet = (ReferenceSet) context
			.getReferenceService().resolveIdentifier(reference,
					null, context);
			if (!referenceSet.getExternalReferences().isEmpty()) {
				
				ExternalReferenceSPI externalReference = referenceSet
						.getExternalReferences().iterator().next();

				List<MimeType> mimeTypes = getMimeTypes(
						externalReference.openStream(context), context);

				for (MimeType type : mimeTypes) {
					if (!type.toString().equals("text/plain")
							&& !type.toString().equals(
									"application/octet-stream")) {
						mimeTypeList.add(type.toString());
					}
				}
				if (externalReference.getDataNature() == ReferencedDataNature.TEXT) {
					mimeTypeList.add("text/plain");
				} else {
					mimeTypeList.add("application/octet-stream");
				}
			}

		}

		return mimeTypeList;
	}
		
	public static List<MimeType> getMimeTypes(
			ExternalReferenceSPI externalReference, InvocationContext context) throws IOException {
		
		InputStream inputStream = externalReference.openStream(context);
		return getMimeTypes(inputStream, context);
	}

}
