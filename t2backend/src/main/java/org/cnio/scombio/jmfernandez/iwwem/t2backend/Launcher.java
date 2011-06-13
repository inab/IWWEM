/*
	$Id$
	Launcher.java
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

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.net.Authenticator;
import java.net.MalformedURLException;
import java.net.URL;

import net.sf.taverna.raven.appconfig.ApplicationConfig;
import net.sf.taverna.raven.appconfig.ApplicationRuntime;
import net.sf.taverna.raven.appconfig.config.Log4JConfiguration;
import net.sf.taverna.raven.launcher.Launchable;
import net.sf.taverna.raven.launcher.LauncherHttpProxyConfiguration;
import net.sf.taverna.raven.launcher.ProxyAuthenticator;
import net.sf.taverna.raven.plugins.PluginManager;
import net.sf.taverna.raven.prelauncher.BootstrapClassLoader;
// Using a local variant, so it is not needed
//import net.sf.taverna.raven.prelauncher.PreLauncher;
import net.sf.taverna.raven.repository.Repository;
import net.sf.taverna.raven.repository.impl.LocalRepository;
import net.sf.taverna.raven.spi.SpiRegistry;

import org.apache.log4j.Logger;

/**
 * Launcher called by the {@link PreLauncher} after making sure Raven etc. is on
 * the classpath.
 * <p>
 * The Launcher will find the Raven {@link LocalRepository} through
 * {@link ApplicationRuntime#getRavenRepository()}. It then initialises the
 * {@link PluginManager} so that it can use the {@link SpiRegistry} of
 * {@link Launchable}s to find the instance of the class named by
 * {@link ApplicationConfig#APP_MAIN} in the
 * {@link ApplicationConfig#PROPERTIES raven-launcher.properties}. The
 * {@link Launchable#launch(String[])} method is then executed.
 * 
 * Original author: Stian Soiland-Reyes
 * @author José María Fernández
 * 
 */
public class Launcher {

	/**
	 * Call the "real" application
	 * 
	 * @param args
	 */
	public static void main(String[] args) {
		Launcher launcher = new Launcher();
		int status = launcher.launchMain(args);
		if (status != 0) {
			System.exit(status);
		}
	}

	private final ApplicationConfig appConfig;
	private final ApplicationRuntime appRuntime;

	public Launcher() {
		appConfig = ApplicationConfig.getInstance();
		appRuntime = ApplicationRuntime.getInstance();
	}

	/**
	 * Find the instance of the given class name by looking it up in the
	 * {@link SpiRegistry} of {@link Launchable}s.
	 * <p>
	 * The {@link PluginManager} is also initialised.
	 * 
	 * @param className
	 * @return
	 * @throws InstantiationException
	 * @throws IllegalAccessException
	 * @throws ClassNotFoundException
	 */
	public Launchable findMainClass(String className)
			throws InstantiationException, IllegalAccessException,
			ClassNotFoundException {
				
				
		Repository localRepository = appRuntime.getRavenRepository();
		// Loading reposit
		InputStream repos = getClass().getResourceAsStream("/repositories.txt");
		if(repos!=null) {
			try {
				BufferedReader repoLines = new BufferedReader(new InputStreamReader(repos));
				String line=null;
				while((line = repoLines.readLine())!=null) {
					try {
						localRepository.addRemoteRepository(new URL(line));
					} catch(java.net.MalformedURLException mue) {
						// IgnoreIT (but we should log this problem)
						System.err.println("Error while adding repository URL " + line+" . Skipping");
						mue.printStackTrace();
					}
				}
			} catch(IOException ioe) {
				// IgnoreIT (but we should log this problem)
				System.err.println("Error while reading repositories list resource");
				ioe.printStackTrace();
			}
		}
		
		PluginManager.setRepository(localRepository);
		// System.err.println("HEY! Probing "+className);

		// A getInstance() should be enough to initialise
		// the plugins
		@SuppressWarnings("unused")
		PluginManager pluginMan = PluginManager.getInstance();
		
		/*
		SpiRegistry launchableSpi = new SpiRegistry(localRepository,
				Launchable.class.getCanonicalName(), appRuntime
						.getClassLoader());
		for (Class<?> launchableClass : launchableSpi) {
			if (launchableClass.getCanonicalName().equals(className)) {
				Launchable launchable = (Launchable) launchableClass
						.newInstance();
				return launchable;
			}
		}
		*/
		return (className.endsWith("T2IWWEMLauncher"))?new T2IWWEMLauncher():new T2IWWEMParser();
		// throw new ClassNotFoundException("Could not find " + className);
	}

	/**
	 * Launch the main {@link Launchable} method as resolved from
	 * {@link #findMainClass(String)}.
	 * 
	 * @param args
	 *            Arguments to pass to {@link Launchable#launch(String[])}
	 * @return The status code of launching, 0 means success.
	 */
	public int launchMain(String[] args) {
		prepareClassLoaders();
		prepareLogging();
		prepareProxyConfiguration();
		
		String mainClass = appConfig.getMainClass();
		//String mainClass = "org.cnio.scombio.jmfernandez.iwwem.t2backend.T2IWWEMLauncher";
		
		Launchable launchable;
		try {
			launchable = findMainClass(mainClass);
		} catch (ClassNotFoundException e) {
			System.err.println("Could not find class: " + mainClass);
			e.printStackTrace();
			return -1;
		} catch (IllegalAccessException e) {
			System.err
					.println("Could not access main() in class: " + mainClass);
			e.printStackTrace();
			return -2;
		} catch (InstantiationException e) {
			System.err.println("Could not instantiate class: " + mainClass);
			e.printStackTrace();
			return -3;
		}
		try {
			return launchable.launch(args);
		} catch (Exception e) {
			System.err.println("Error while executing main() of " + mainClass);
			e.printStackTrace();
			return -4;
		}
	}

	protected void prepareProxyConfiguration() {
		LauncherHttpProxyConfiguration.getInstance();
		Authenticator.setDefault(new ProxyAuthenticator());
	}

	protected void prepareLogging() {
		Log4JConfiguration.getInstance().prepareLog4J();		
	}

	protected void prepareClassLoaders() {
		PreLauncher preLauncher = PreLauncher.getInstance();
		BootstrapClassLoader launchingClassLoader = preLauncher
				.getLaunchingClassLoader();
		if (launchingClassLoader == null) {
			// Set to a child of the real launching class loader (of us - not
			// PreLauncher) that is an BootstrapClassLoader instance - this
			// is only neccessary if we were not launched through PreLauncher
			launchingClassLoader = new BootstrapClassLoader(appRuntime
					.getClassLoader());
			preLauncher.setLaunchingClassLoader(launchingClassLoader);
		}
		if (Thread.currentThread().getContextClassLoader() == preLauncher
				.getClass().getClassLoader()) {
			// Set context class loader to the launching class loader so that
			// system artifacts can later be injected with
			// preLauncher.addURLToClassPath(url) and picked up from
			// 3rd party libraries
			Thread.currentThread().setContextClassLoader(launchingClassLoader);
		}
		
		// Add conf/ folder to classpath
		try {
			URL url = new URL(appConfig.getStartupRoot(), "conf/");
			launchingClassLoader.addURL(url);
		} catch (Exception e) {
			System.err.println("Could not add conf/ to classpath");
		}
	}

}
