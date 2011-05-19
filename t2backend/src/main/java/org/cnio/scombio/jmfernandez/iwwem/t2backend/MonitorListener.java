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
package org.cnio.scombio.jmfernandez.iwwem.t2backend;

import net.sf.taverna.t2.lang.observer.Observable;
import net.sf.taverna.t2.lang.observer.Observer;
import net.sf.taverna.t2.monitor.MonitorManager;
import net.sf.taverna.t2.monitor.MonitorableProperty;

public class MonitorListener
	implements Observer<MonitorManager.MonitorMessage>
{
	public void notify(Observable<MonitorManager.MonitorMessage> sender, MonitorManager.MonitorMessage message)
		throws Exception
	{
		System.err.println("NOTTI from "+message.getOwningProcess()+" "+message.getClass().getName());
		if(message instanceof MonitorManager.RegisterNodeMessage) {
			MonitorManager.RegisterNodeMessage mm = (MonitorManager.RegisterNodeMessage)message;
			
			System.err.println("\tHERR "+mm.getWorkflowObject().getClass().getName());
			for(MonitorableProperty<?> prop: mm.getProperties()) {
				System.err.println("\tNAME: "+prop.getName()+" VALUE: "+prop.getValue().getClass().getName()+" DATE: "+prop.getLastModified().toString());
			}
		}
	}
}
