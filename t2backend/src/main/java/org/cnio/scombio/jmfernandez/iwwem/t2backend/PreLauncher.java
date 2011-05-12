/*
	$Id$
	PreLauncher.java
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

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import net.sf.taverna.raven.prelauncher.BootstrapClassLoader;
import net.sf.taverna.raven.prelauncher.ClassLocation;

public class PreLauncher {

	private static final String LAUNCHER_CLASS = "org.cnio.scombio.jmfernandez.iwwem.t2backend.Launcher";
	private static final String LAUNCHER_MAIN = "main";
	private static final PreLauncher instance = new PreLauncher();
	private BootstrapClassLoader launchingClassLoader;

	public class JarFilenameFilter implements FilenameFilter {
		public boolean accept(File dir, String name) {
			return name.toLowerCase().endsWith(".jar");
		}
	}

	public static void main(String[] args) {
		PreLauncher launcher = getInstance();
		int result = launcher.launchArgs(args);
		if (result != 0) {
			System.exit(result);
		}
	}

	public static PreLauncher getInstance() {
		return instance;
	}

	public int launchArgs(String[] args) {
		List<URL> classPath;
		try {
			classPath = buildClassPath();
		} catch (IOException e) {
			System.err.println("Could not build classpath");
			e.printStackTrace();
			return -1;
		}

		String method = LAUNCHER_CLASS + "." + LAUNCHER_MAIN + "(String[])";
		try {
			runLauncher(classPath, args);
		} catch (IllegalArgumentException e) {
			System.err.println("Invalid arguments for method " + method);
			e.printStackTrace();
			return -2;
		} catch (ClassNotFoundException e) {
			System.err.println("Could not find class " + LAUNCHER_CLASS);
			e.printStackTrace();
			return -3;
		} catch (IllegalAccessException e) {
			System.err.println("Could not access method " + method);
			e.printStackTrace();
			return -4;
		} catch (InvocationTargetException e) {
			System.err.println("Exception from method " + method);
			e.getCause().printStackTrace();
			return -5;
		} catch (SecurityException e) {
			System.err.println("Not allowed by VM to access method " + method);
			e.printStackTrace();
			return -6;
		} catch (NoSuchMethodException e) {
			System.err.println("Could not find method " + method);
			e.printStackTrace();
			return -7;
		}
		return 0;
	}

	private void runLauncher(List<URL> classPath, String[] args)
			throws ClassNotFoundException, IllegalArgumentException,
			IllegalAccessException, InvocationTargetException,
			SecurityException, NoSuchMethodException {
		if (getLaunchingClassLoader() == null) {
			BootstrapClassLoader bootstrapLoader = new BootstrapClassLoader(
					getClass().getClassLoader());
			setLaunchingClassLoader(bootstrapLoader);
		}

		for (URL url : classPath) {
			addURLToClassPath(url);
		}
		Class<?> launcherClass = getLaunchingClassLoader().loadClass(
				LAUNCHER_CLASS);
		Method launcherMain = launcherClass.getMethod(LAUNCHER_MAIN,
				String[].class);
		launcherMain.invoke((Object) null, (Object) args);
	}

	public void addURLToClassPath(URL url) {
		BootstrapClassLoader classLoader = getLaunchingClassLoader();
		if (classLoader == null) {
			System.err.println("No launching class loader, "
					+ "could not add to classpath: " + url);
			return;
		}
		classLoader.addURL(url);
	}

	protected List<URL> buildClassPath() throws IOException {
		List<URL> classPath = new ArrayList<URL>();
		File libDir = ClassLocation.getClassLocationDir(getClass());

		// The directory itself, when run from .class files
		classPath.add(libDir.toURI().toURL());

		File[] jarFiles = libDir.listFiles(new JarFilenameFilter());
		if (jarFiles == null) {
			System.err.println("Can't list files of " + libDir);
		} else {
			for (File jarFile : jarFiles) {
				jarFile.toURL();
				classPath.add(jarFile.toURI().toURL());
			}
		}
		return classPath;
	}

	public BootstrapClassLoader getLaunchingClassLoader() {
		if (launchingClassLoader != null) {
			return launchingClassLoader;
		}
		ClassLoader systemClassLoader = ClassLoader.getSystemClassLoader();
		if (systemClassLoader instanceof BootstrapClassLoader) {
			launchingClassLoader = (BootstrapClassLoader) systemClassLoader;
		} else {
			ClassLoader myClassLoader = getClass().getClassLoader();
			if (myClassLoader instanceof BootstrapClassLoader) {
				launchingClassLoader = (BootstrapClassLoader) myClassLoader;
			}
		}
		return launchingClassLoader;
	}

	public void setLaunchingClassLoader(BootstrapClassLoader classLoader) {
		this.launchingClassLoader = classLoader;
	}
}
