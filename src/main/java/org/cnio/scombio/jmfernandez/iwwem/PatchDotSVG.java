/*
	$Id: INBEnactionAsyncReport.java 1475 2008-09-26 21:48:39Z jmfernandez $
	PatchDotSVG.java
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

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import org.apache.batik.bridge.BridgeContext;
import org.apache.batik.bridge.GVTBuilder;
import org.apache.batik.bridge.UserAgentAdapter;
import org.apache.batik.dom.svg.SAXSVGDocumentFactory;
import org.apache.batik.dom.svg.SVGDOMImplementation;
import org.apache.batik.util.XMLResourceDescriptor;
import org.apache.log4j.Logger;
import org.w3c.dom.Attr;
import org.w3c.dom.CDATASection;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.svg.SVGAnimatedLength;
import org.w3c.dom.svg.SVGAnimatedRect;
import org.w3c.dom.svg.SVGDocument;
import org.w3c.dom.svg.SVGLength;
import org.w3c.dom.svg.SVGRect;
import org.w3c.dom.svg.SVGSVGElement;

/**
 * This class is used to patch SVG files generated with
 * Graphviz without re-generating it from the workflow
 * definition (very costly).
 * @author jmfernandez
 *
 */
public class PatchDotSVG {
	private static final String[] JSRES = {
		"SVGmapApp.js",
		"SVGtooltip.js",
		"SVGzoom.js",
		"SVGtrampoline.js",
		"RunEvt.js"
	};
	
	private static final String SVG_JSINIT="RunEvt(evt,1)";
	
	private Logger logger;
	
	public PatchDotSVG(Logger logger) {
		this.logger=logger;
	}
	
	public PatchDotSVG() {
		this(null);
	}
	
	private void doFatalLog(String msg,Throwable thr) {
		
		if(logger!=null) {
			logger.fatal(msg, thr);
			System.exit(1);
		} else {
			System.err.println("FATAL ERROR: "+msg+"\nReason:");
			thr.printStackTrace(System.err);
		}
	}
	
	public void doPatch(SVGDocument svg,File SVGFile)
		throws IOException
	{
		// Now, it is time to patch styles, so Firefox bug
		// about font sizes is avoided.
		XPathFactory xpf=XPathFactory.newInstance();
		XPath xp=xpf.newXPath();
		try {
			NodeList fnode = (NodeList) xp.evaluate("//@style[contains(.,'font-size')]",svg,XPathConstants.NODESET);
			Pattern pat = Pattern.compile("font-size:([0-9]+\\.[0-9]+);");
			int maxnode=fnode.getLength();
			for(int inode=0;inode<maxnode;inode++) {
				Attr att=(Attr)fnode.item(inode);
				String origval=att.getValue();
				Matcher match = pat.matcher(origval);
				String repl = match.replaceAll("font-size:$1px;");
				if(!origval.equals(repl)) {
					att.setValue(repl);
				}
			}
		} catch(XPathExpressionException xpee) {
			// Do Nothing(R)!
		}
		
		// And next patch is needed by automatic SVG zoom code
		// But it cannot be applied until some Batik initialization
		// constrains have been overcome.
		DumbUserAgent dua=new DumbUserAgent();
		GVTBuilder builder = new GVTBuilder();
		BridgeContext ctx = new BridgeContext(dua);
		ctx.setDynamic(true);
		// Needed to build up the internal infrastructure
		// GraphicsNode gn = builder.build(ctx, svg);
		builder.build(ctx, svg);
		
		SVGSVGElement SVGroot = svg.getRootElement();
		
		
		// We have to setup a valid viewBox rect
		// in order to have a resizable SVG
		if(!SVGroot.hasAttribute("viewBox")) {
			// And we will build a viewBox based on other values...
			SVGAnimatedRect sar = SVGroot.getViewBox();
			SVGRect sr = sar.getBaseVal();
			
			float vX=0.0f;
			if(SVGroot.hasAttribute("x")) {
				SVGAnimatedLength aX = SVGroot.getX();
				SVGLength sX = aX.getBaseVal();
				sX.convertToSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX);
				vX=sX.getValueInSpecifiedUnits();
			}
			sr.setX(vX);
			
			float vY=0.0f;
			if(SVGroot.hasAttribute("y")) {
				SVGAnimatedLength aY = SVGroot.getY();
				SVGLength sY = aY.getBaseVal();
				sY.convertToSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX);
				vY=sY.getValueInSpecifiedUnits();
			}
			sr.setY(vY);
			
			float vW=1.0f;
			if(SVGroot.hasAttribute("width")) {
				SVGAnimatedLength aWidth=SVGroot.getWidth();
				SVGLength sWidth=aWidth.getBaseVal();
				sWidth.convertToSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX);
				vW=sWidth.getValueInSpecifiedUnits();
			}
			sr.setWidth(vW);
			
			float vH=1.0f;
			if(SVGroot.hasAttribute("height")) {
				SVGAnimatedLength aHeight=SVGroot.getHeight();
				SVGLength sHeight=aHeight.getBaseVal();
				sHeight.convertToSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX);
				vH=sHeight.getValueInSpecifiedUnits();
			}
			sr.setHeight(vH);
		}
		
		// These attributes take precedence over viewBox
		// on all SVG viewers but Mozilla-based ones.
		// So remove them to avoid misbehaviors
		String[] misattrs={"width","height","x","y"};
		for(String misattr: misattrs) {
			if(SVGroot.hasAttribute(misattr))
				SVGroot.removeAttribute(misattr);
		}
		
		/*
		Pattern sizepat = Pattern.compile("([0-9]+\\.?[0-9]*)[a-z]*");
		Matcher mval;

		mval = sizepat.matcher(SVGroot.getAttribute("width"));
		SVGroot.setAttribute("width",mval.replaceAll("$1px"));
		mval = sizepat.matcher(SVGroot.getAttribute("height"));
		SVGroot.setAttribute("height",mval.replaceAll("$1px"));
		sizepat=null;
		mval=null;
		 */
		
		if(SVGFile!=null) {
			// Adding the ECMAscript trampoline needed to
			// manipulate SVG from outside
			
			// Before any new resource, we must tidy up the
			// previous script declarations
			NodeList oldscripts = svg.getElementsByTagNameNS(SVGroot.getNamespaceURI(),"script");
			int nscr = oldscripts.getLength();
			// Reverse mode is needed because an NPE is
			// fired due the dynamic nature of NodeLists
			for(int iscr=nscr-1 ; iscr>=0 ; iscr--) {
				Element scr = (Element)oldscripts.item(iscr);
				scr.getParentNode().removeChild(scr);
			}
			oldscripts=null;
			
			// First, we need a class loader
			ClassLoader cl = getClass().getClassLoader();
			if (cl == null) {
				cl = ClassLoader.getSystemClassLoader();
			}

			// Then, we can fetch it!
			Node originalFirstChild = SVGroot.getFirstChild();

			int bufferSize=16384;
			char[] buffer=new char[bufferSize];
			for(String svgres:JSRES) {
				StringBuilder trampcode=new StringBuilder();

				InputStream SVGResHandler=cl.getResourceAsStream(svgres);
				if(SVGResHandler==null) {
					throw new IOException("Unable to find/fetch SVG ECMAscript trampoline code stored at "+svgres);
				}
				InputStreamReader SVGResReader = null;
				try {
					SVGResReader = new InputStreamReader(new BufferedInputStream(SVGResHandler),"UTF-8");
				} catch(UnsupportedEncodingException uee) {
					doFatalLog("UNSUPPORTED ENCODING????",uee);
					return;
				}

				int readBytes;
				while((readBytes=SVGResReader.read(buffer,0,bufferSize))!=-1) {
					trampcode.append(buffer,0,readBytes);
				}

				// Now we have the content of the trampoline, let's create a CDATA with it!
				CDATASection cdata=svg.createCDATASection(trampcode.toString());
				// Freeing up some resources

				// The trampoline content lives inside a script tag
				Element script=svg.createElementNS(SVGroot.getNamespaceURI(),"script");
				script.setAttribute("type","text/ecmascript");
				script.insertBefore(cdata,null);

				// Injecting the script inside the root
				SVGroot.insertBefore(script,originalFirstChild);
			}

			buffer=null;
			// Last, setting up the initialization hook
			SVGroot.setAttribute("onload",SVG_JSINIT);

			// At last, writing it...
			TransformerFactory tf=TransformerFactory.newInstance();
			try {
				Transformer t=tf.newTransformer();

				// There are some problems with next sentence and some new Xalan
				// distributions, so the workaround is creating ourselves the
				// FileOutputStream instead of using File straight!
				PrintWriter foe=new PrintWriter(SVGFile,"UTF-8");
				t.transform(new DOMSource(svg),new StreamResult(foe));
				foe.flush();
				foe.close();
			} catch(TransformerConfigurationException tce) {
				doFatalLog("TRANSFORMER CONFIGURATION FAILED????",tce);
				return;
			} catch(TransformerException te) {
				doFatalLog("STRAIGHT TRANSFORMATION FAILED????",te);
				return;
			}
		}
	}
	
    class DumbUserAgent extends UserAgentAdapter {
        boolean failed;

        public void displayError(Exception e) {
            failed = true;
        }
    }

	/**
	 * @param args
	 * The SVG files to patch
	 */
	public static void main(String[] args) {
		PatchDotSVG pds = new PatchDotSVG();
		for(String arg: args) {
			SAXSVGDocumentFactory ssdf = new SAXSVGDocumentFactory(XMLResourceDescriptor.getXMLParserClassName());
			try {
				System.out.println("NOTICE: Processing file "+arg);
				File svgfile=new File(arg);
				FileInputStream fis=new FileInputStream(svgfile);
				BufferedInputStream bis=new BufferedInputStream(fis);
				String svgNS = SVGDOMImplementation.SVG_NAMESPACE_URI;
				try {
					SVGDocument svg = ssdf.createSVGDocument(svgNS, bis);
					
					// First, let's close the input files
					bis.close();
					fis.close();
					bis=null;
					fis=null;
					
					// Patching is being done
					// and let's save by the way!
					pds.doPatch(svg,svgfile);
					
					System.out.println("NOTICE: Patched file "+arg+" has been saved");
				} catch(IOException ioe) {
					System.err.println("ERROR: File "+arg+" is not a valid SVG file. Reason: "+ioe.getMessage());
				} finally {
					if(bis!=null) {
						try {
							bis.close();
							fis.close();
						} catch(IOException ioe) {
							System.err.println("FATAL ERROR: File "+arg+" could not be properly closed. Reason: "+ioe.getMessage());
						}
					}
				}
			} catch(FileNotFoundException fnfe) {
				System.err.println("ERROR: Unable to open file "+arg+". Skipping...");
			}
		}
	}

}
