/*
	$Id$
	T2IWWEMInvocationContext.java
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import net.sf.taverna.t2.invocation.InvocationContext;
import net.sf.taverna.t2.provenance.reporter.ProvenanceReporter;
import net.sf.taverna.t2.reference.ReferenceService;
/**
 * An InvocationContext used by the command line tool.
 * 
 * @author Stuart Owen
 * @author José María Fernández
 *
 */
public class T2IWWEMInvocationContext implements InvocationContext {

	private final ReferenceService referenceService;

	private final ProvenanceReporter provenanceReporter;

	private List<Object> entities = Collections
			.synchronizedList(new ArrayList<Object>());

	public T2IWWEMInvocationContext(ReferenceService referenceService,
			ProvenanceReporter provenanceReporter) {
		this.referenceService = referenceService;
		this.provenanceReporter = provenanceReporter;
	}

	public void addEntity(Object entity) {
		entities.add(entity);
	}

	public <T extends Object> List<T> getEntities(Class<T> entityType) {
		List<T> entitiesOfType = new ArrayList<T>();
		synchronized (entities) {
			for (Object entity : entities) {
				if (entityType.isInstance(entity)) {
					entitiesOfType.add(entityType.cast(entity));
				}
			}
		}
		return entitiesOfType;
	}

	public ProvenanceReporter getProvenanceReporter() {
		return provenanceReporter;
	}

	public ReferenceService getReferenceService() {
		return referenceService;
	}

	public void removeEntity(Object entity) {
		entities.remove(entity);
	}
}