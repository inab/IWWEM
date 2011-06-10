/*
	$Id$
	DataflowAnnotation.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008-2011
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
	
	This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.

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
/*
 * The code in this file is based on Ruby implementation written by
 * Emmanuel Tagarira and David Withers, which was originally hosted at
 * http://github.com/mannie/taverna2-gem/ , which was under LGPL3 licence
 */
package org.cnio.scombio.jmfernandez.iwwem.t2backend.parser;

import java.util.ArrayList;
import java.util.List;

/** 
 * This is the annotation object specific to the dataflow it belongs to.
 * A DataflowAnnotation contains metadata about a given dataflow element.
 */
public class DataflowAnnotation {
	/**
	 * The name used of the dataflow
	 */
	public String name;
	
	/**
	 * A list of titles that have been assigned to the dataflow.
	 */
	public List<String> titles;
	
	/**
	 * A list ot descriptive strings about the dataflow.
	 */
	public List<String> descriptions;
	
	/**
	 * A list of authors of the dataflow
	 */
	public List<String> authors;
	
	public DataflowAnnotation() {
		descriptions = new ArrayList<String>();
		authors = new ArrayList<String>();
		titles = new ArrayList<String>();
	}
}
