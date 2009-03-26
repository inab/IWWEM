/*
	$Id$
	INBEnactionAsyncReport.java
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2008
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
package org.cnio.scombio.jmfernandez.iwwem;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintStream;
import java.io.PrintWriter;

import java.net.ServerSocket;
import java.net.Socket;

import org.embl.ebi.escience.scufl.enactor.WorkflowInstance;

public class INBEnactionAsyncReport
	extends Thread
{
	public final static String SOCKETFILE="socket";
	private WorkflowInstance wi;
	private File statusDir;
	private ServerSocket ss;
	
	public INBEnactionAsyncReport(WorkflowInstance wi,File statusDir) {
		this.wi=wi;
		this.statusDir=statusDir;
		this.ss=null;
	}
	
	public void run() {
		// First, possible creation of status directory
		statusDir.mkdirs();
		
		try {
			String hostIP="127.0.0.1";
			
			// Second, creation of the server socket
			ServerSocket ss=new ServerSocket(0);
			try {
				int hostPort=ss.getLocalPort();

				// Third, creation of file with the IP and port
				PrintWriter pw=new PrintWriter(new File(statusDir,SOCKETFILE));
				pw.print(hostIP+":"+hostPort);
				pw.flush();
				pw.close();

				// Fourth, main loop!
				Socket s;
				do {
					// Fifth, new connection
					s=ss.accept();
					try {
						// Sixth, printing the report through the socket
						PrintStream ps = new PrintStream(s.getOutputStream(),true,"UTF-8");
						String report;
						synchronized (wi) {
							report=wi.getProgressReportXMLString();
						}
						ps.print(report);
						ps.flush();
						ps.close();
					} catch(IOException ioe2) {
						// Do nothing!
					} finally {
						try {
							s.close();
						} catch(IOException ioe3) {
							// Do nothing! (or report it in a log file?)
						}
					}
				} while(!ss.isClosed());
			} catch(FileNotFoundException fnfe) {
				// Do nothing!!! (or report it in a log file?)
			} catch(IOException ioe) {
				// Do nothing!!! (or report it in a log file?)
			} finally {
				ss.close();
				ss=null;
			}
		} catch(IOException ioe0) {
			// Do nothing!!! (or report it in a log file?)
		}
	}
	
	public void tryStop() {
		try {
			if(ss!=null) {
				ss.close();
			}
		} catch(IOException ioe) {
			// Do nothing!!! (or report it in a log file?)
		}
		// Stopping the thread
		if(isAlive()) {
			try {
				join(1500);
			} catch(InterruptedException ie) {
				// Do nothing!!! (or report it in a log file?)
			}
		}
	}
}
