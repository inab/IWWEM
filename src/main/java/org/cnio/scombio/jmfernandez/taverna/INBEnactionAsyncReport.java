package org.cnio.scombio.jmfernandez.taverna;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintStream;
import java.io.PrintWriter;

import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;

import org.embl.ebi.escience.scufl.enactor.WorkflowInstance;

public class INBEnactionAsyncReport
	extends Thread
{
	public final static String SOCKETFILE="socket";
	private WorkflowInstance wi;
	private File statusDir;
	
	public INBEnactionAsyncReport(WorkflowInstance wi,File statusDir) {
		this.wi=wi;
		this.statusDir=statusDir;
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
				} while(true);
			} catch(FileNotFoundException fnfe) {
				// Do nothing!!! (or report it in a log file?)
			} catch(IOException ioe) {
				// Do nothing!!! (or report it in a log file?)
			} finally {
				ss.close();
			}
		} catch(IOException ioe0) {
			// Do nothing!!! (or report it in a log file?)
		}
	}
}