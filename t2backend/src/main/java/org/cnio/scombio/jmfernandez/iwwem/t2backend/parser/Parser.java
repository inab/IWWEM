/*
	$Id$
	Parser.java
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

import java.io.File;
import java.io.InputStream;
import java.io.IOException;

import java.util.ArrayList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.FactoryConfigurationError;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import org.xml.sax.SAXException;

/**
 * Returns the model for the given t2flow_file.
 * The method accepts objects of classes File, StringIO and String only.
 * ===Usage
 *   foo = ... # stuff to initialize foo here
 *   bar = T2Flow::Parser.new.parse(foo)
 */
public class Parser {
	/**
	 * Returns the model for the given t2flow_file.
	 * The method accepts objects of classes File, StringIO and String only.
	 * ===Usage
	 *   foo = ... # stuff to initialize foo here
	 *   bar = T2Flow::Parser.new.parse(foo)
	 */
	public Model parse(File t2flow)
		throws ParserException
	{
		try {
			DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
			Document document = db.parse(t2flow);
			
			Element root = document.getDocumentElement();
			
			String version = root.getAttribute("version");
			return create_model(root, version);
		} catch(ParserConfigurationException pce) {
			throw new ParserException(pce);
		} catch(FactoryConfigurationError fce) {
			throw new ParserException(fce);
		} catch(IOException ioe) {
			throw new ParserException("I/O error parsing file",ioe);
		} catch(SAXException se) {
			throw new ParserException("Error parsing file",se);
		}
	}
	
	/**
	 * Returns the model for the given t2flow_file.
	 * The method accepts objects of classes File, StringIO and String only.
	 * ===Usage
	 *   foo = ... # stuff to initialize foo here
	 *   bar = T2Flow::Parser.new.parse(foo)
	 */
	public Model parse(InputStream t2flow)
		throws ParserException
	{
		try {
			DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
			Document document = db.parse(t2flow);
			
			Element root = document.getDocumentElement();
			
			String version = root.getAttribute("version");
			return create_model(root, version);
		} catch(ParserConfigurationException pce) {
			throw new ParserException(pce);
		} catch(FactoryConfigurationError fce) {
			throw new ParserException(fce);
		} catch(IOException ioe) {
			throw new ParserException("I/O error parsing file",ioe);
		} catch(SAXException se) {
			throw new ParserException("Error parsing file",se);
		}
	}
	
	protected Model create_model(Element element, String version)
		throws ParserException
	{
		Model model = new Model();
		
		NodeList local_depends = element.getElementsByTagName("localDependencies");
		if(local_depends.getLength()>0) {
			
			for(int i=0, maxi=local_depends.getLength(); i<maxi; i++) {
				Node dependency = local_depends.item(i);
				
				NodeList deps = dependency.getChildNodes();
				for(int j=0, maxj=deps.getLength(); j<maxj; j++) {
					Node dep = deps.item(j);
					if(dep.getNodeType()!=Node.ELEMENT_NODE)
						continue;
					model.dependencies.add(dep.getTextContent());
				}
			}
			// TODO: create a unique list from model.dependencies
		}
		
		NodeList dataflows = element.getChildNodes();
		for(int di = 0, maxdi = dataflows.getLength(); di<maxdi; di++) {
			Node dataflow = dataflows.item(di);
			if(dataflow.getNodeType()!=Node.ELEMENT_NODE)
				continue;
			Dataflow dataflow_obj = new Dataflow();
			dataflow_obj.dataflow_id = ((Element)dataflow).getAttribute("id");
			
			NodeList elts = dataflow.getChildNodes();
			for(int ei=0, maxei=elts.getLength(); ei<maxei; ei++) {
				Node elt = elts.item(ei);
				if(elt.getNodeType()!=Node.ELEMENT_NODE)
					continue;
				
				String eltLocalName = elt.getLocalName();
				if(eltLocalName==null)
					eltLocalName=((Element)elt).getTagName();
				
				if("name".equals(eltLocalName)) {
					dataflow_obj.annotations.name=elt.getTextContent();
				} else if("inputPorts".equals(eltLocalName)) {
					NodeList ports = elt.getChildNodes();
					for(int pi=0,maxpi=ports.getLength(); pi < maxpi ; pi++) {
						Node port = ports.item(pi);
						if(port.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_source(dataflow_obj,port);
					}
				} else if("outputPorts".equals(eltLocalName)) {
					NodeList ports = elt.getChildNodes();
					for(int pi=0,maxpi=ports.getLength(); pi < maxpi ; pi++) {
						Node port = ports.item(pi);
						if(port.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_sink(dataflow_obj,port);
					}
				} else if("processors".equals(eltLocalName)) {
					NodeList procs = elt.getChildNodes();
					for(int pi=0,maxpi=procs.getLength(); pi < maxpi ; pi++) {
						Node proc = procs.item(pi);
						if(proc.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_processor(dataflow_obj,proc);
					}
				} else if("datalinks".equals(eltLocalName)) {
					NodeList links = elt.getChildNodes();
					for(int pi=0,maxpi=links.getLength(); pi < maxpi ; pi++) {
						Node link = links.item(pi);
						if(link.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_link(dataflow_obj,link);
					}
				} else if("conditions".equals(eltLocalName)) {
					NodeList coords = elt.getChildNodes();
					for(int pi=0,maxpi=coords.getLength(); pi < maxpi ; pi++) {
						Node coord = coords.item(pi);
						if(coord.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_coordination(dataflow_obj,coord);
					}
				} else if("annotations".equals(eltLocalName)) {
					NodeList anns = elt.getChildNodes();
					for(int pi=0,maxpi=anns.getLength(); pi < maxpi ; pi++) {
						Node ann = anns.item(pi);
						if(ann.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						add_annotation(dataflow_obj,ann);
					}
				}
				
			}
			model.dataflows.add(dataflow_obj);
		}
		
		for(Processor proc: model.processors()) {
			if("workflow".equals(proc.type)) {
				Dataflow df = model.dataflow(proc.dataflow_id);
				df.annotations.name = new String(proc.name);
			}
		}
		
		return model;
	}
	
	public void add_source(Dataflow dataflow, Node port) {
		Source source = new Source();
		
		NodeList elts = port.getChildNodes();
		for(int ei=0, maxei=elts.getLength(); ei<maxei; ei++) {
			Node elt = elts.item(ei);
			if(elt.getNodeType()!=Node.ELEMENT_NODE)
				continue;
			
			String eltLocalName = elt.getLocalName();
			if(eltLocalName==null)
				eltLocalName=((Element)elt).getTagName();
			
			if("name".equals(eltLocalName)) {
				source.name = elt.getTextContent();
			} else if("annotations".equals(eltLocalName)) {
				NodeList anns = elt.getChildNodes();
				for(int ai=0,maxai=anns.getLength(); ai<maxai; ai++) {
					Node ann = anns.item(ai);
					if(ann.getNodeType()!=Node.ELEMENT_NODE)
						continue;
					
					NodeList content_nodes = ((Element)ann).getElementsByTagName("annotationBean");
					if(content_nodes.getLength()>0) {
						Node content_node = content_nodes.item(0);
						String content = null;
						Node first = content_node.getFirstChild();
						if(first!=null) {
							Node next = first.getNextSibling();
							if(next!=null) {
								content = next.getTextContent();
							}
						}
						
						String classVal = ((Element)content_node).getAttribute("class").toLowerCase();
						
						if(classVal.contains("freetextdescription")) {
							source.descriptions.add(content);
						} else if(classVal.contains("examplevalue")) {
							source.example_values.add(content);
						}
					}
				}
			}
		}
		
		dataflow.sources.add(source);
	}
	
	public void add_sink(Dataflow dataflow, Node port) {
		Sink sink = new Sink();
		
		NodeList elts = port.getChildNodes();
		for(int ei=0, maxei=elts.getLength(); ei<maxei; ei++) {
			Node elt = elts.item(ei);
			if(elt.getNodeType()!=Node.ELEMENT_NODE)
				continue;
			
			String eltLocalName = elt.getLocalName();
			if(eltLocalName==null)
				eltLocalName=((Element)elt).getTagName();
			
			if("name".equals(eltLocalName)) {
				sink.name = elt.getTextContent();
			} else if("annotations".equals(eltLocalName)) {
				NodeList anns = elt.getChildNodes();
				for(int ai=0,maxai=anns.getLength(); ai<maxai; ai++) {
					Node ann = anns.item(ai);
					if(ann.getNodeType()!=Node.ELEMENT_NODE)
						continue;
					
					NodeList content_nodes = ((Element)ann).getElementsByTagName("annotationBean");
					if(content_nodes.getLength()>0) {
						Node content_node = content_nodes.item(0);
						String content = null;
						Node first = content_node.getFirstChild();
						if(first!=null) {
							Node next = first.getNextSibling();
							if(next!=null) {
								content = next.getTextContent();
							}
						}
						
						String classVal = ((Element)content_node).getAttribute("class").toLowerCase();
						
						if(classVal.contains("freetextdescription")) {
							sink.descriptions.add(content);
						} else if(classVal.contains("examplevalue")) {
							sink.example_values.add(content);
						}
					}
				}
			}
		}
		
		dataflow.sinks.add(sink);
	}
	
	public void add_processor(Dataflow dataflow,Node element) {
		Processor processor = new Processor();
		
		ArrayList<String> temp_inputs = new ArrayList<String>();
		ArrayList<String> temp_outputs = new ArrayList<String>();
		
		NodeList elts = element.getChildNodes();
		for(int ei=0,maxei=elts.getLength(); ei<maxei; ei++) {
			Node elt = elts.item(ei);
			if(elt.getNodeType()!=Node.ELEMENT_NODE)
				continue;
			
			String eltLocalName = elt.getLocalName();
			if(eltLocalName==null)
				eltLocalName=((Element)elt).getTagName();
			String eltLocalNameLC = eltLocalName.toLowerCase();
			
			if("name".equals(eltLocalName)) {
				processor.name = elt.getTextContent();
			} else if(eltLocalNameLC.contains("inputports")) {
				NodeList ports = elt.getChildNodes();
				for(int pi=0, maxpi=ports.getLength(); pi<maxpi; pi++) {
					Node port = ports.item(pi);
					if(port.getNodeType()!=Node.ELEMENT_NODE)
						continue;
					
					NodeList xs = port.getChildNodes();
					for(int xi=0,maxxi=xs.getLength(); xi<maxxi; xi++) {
						Node x = xs.item(xi);
						if(x.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						String xLocalName = x.getLocalName();
						if(xLocalName==null)
							xLocalName=((Element)x).getTagName();
						if("name".equals(xLocalName))
							temp_inputs.add(x.getTextContent());
					}
				}
			} else if(eltLocalNameLC.contains("outputports")) {
				NodeList ports = elt.getChildNodes();
				for(int pi=0, maxpi=ports.getLength(); pi<maxpi; pi++) {
					Node port = ports.item(pi);
					if(port.getNodeType()!=Node.ELEMENT_NODE)
						continue;
					
					NodeList xs = port.getChildNodes();
					for(int xi=0,maxxi=xs.getLength(); xi<maxxi; xi++) {
						Node x = xs.item(xi);
						if(x.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						String xLocalName = x.getLocalName();
						if(xLocalName==null)
							xLocalName=((Element)x).getTagName();
						if("name".equals(xLocalName))
							temp_outputs.add(x.getTextContent());
					}
				}
			} else if("activities".equals(eltLocalName)) {
				Node activity=elt.getFirstChild();
				if(activity!=null) {
					NodeList nodes = activity.getChildNodes();
					for(int ni=0,maxni=nodes.getLength(); ni<maxni; ni++) {
						Node node = nodes.item(ni);
						if(node.getNodeType()!=Node.ELEMENT_NODE)
							continue;
						
						String nodeLocalName = node.getLocalName();
						if(nodeLocalName==null)
							nodeLocalName=((Element)node).getTagName();
						if("configBean".equals(nodeLocalName)) {
							Node activity_node = node.getFirstChild();
							
							if(activity_node!=null) {
								String encoding = ((Element)node).getAttribute("encoding");
								if("dataflow".equals(encoding)) {
									processor.dataflow_id = ((Element)node).getAttribute("ref");
									processor.type = "workflow";
								} else {
									String activity_nodeLocalName = activity_node.getLocalName();
									if(activity_nodeLocalName==null)
										activity_nodeLocalName=((Element)activity_node).getTagName();
									String activity_nodeLocalNameLC = activity_nodeLocalName.toLowerCase();
									
									if(activity_nodeLocalNameLC.contains("martquery")) {
										processor.type = "biomart";
									} else {
										String[] spl = activity_nodeLocalName.split("\\.");
										if(spl.length>=2) {
											processor.type = spl[spl.length-2];
										}
										
										NodeList value_nodes = activity_node.getChildNodes();
										for(int vi=0,maxvi=value_nodes.getLength(); vi<maxvi; vi++) {
											Node value_node = value_nodes.item(vi);
											if(value_node.getNodeType()!=Node.ELEMENT_NODE)
												continue;
											
											String value_nodeLocalName = value_node.getLocalName();
											if(value_nodeLocalName==null)
												value_nodeLocalName=((Element)value_node).getTagName();
											String value_nodeLocalNameLC = value_nodeLocalName.toLowerCase();
											
											if("wsdl".equals(value_nodeLocalName)) {
												processor.wsdl = value_node.getTextContent();
											} else if("operation".equals(value_nodeLocalName)) {
												processor.wsdl_operation = value_node.getTextContent();
											} else if(value_nodeLocalNameLC.contains("endpoint")) {
									                          processor.endpoint = value_node.getTextContent();
											} else if(value_nodeLocalNameLC.contains("servicename")) {
												processor.biomoby_service_name = value_node.getTextContent();
											} else if(value_nodeLocalNameLC.contains("authorityname")) {
												processor.biomoby_authority_name = value_node.getTextContent();
											} else if("category".equals(value_nodeLocalName)) {
												processor.biomoby_category = value_node.getTextContent();
											} else if("script".equals(value_nodeLocalName)) {
												processor.script = value_node.getTextContent();
											} else if("inputs".equals(value_nodeLocalName)) {
												NodeList inputs = value_node.getChildNodes();
												for(int ii=0,maxii=inputs.getLength(); ii<maxii; ii++) {
													Node input = inputs.item(ii);
													if(input.getNodeType()!=Node.ELEMENT_NODE)
														continue;
													
													NodeList xs = input.getChildNodes();
													for(int xi=0,maxxi=xs.getLength(); xi<maxxi; xi++) {
														Node x = xs.item(xi);
														if(x.getNodeType()!=Node.ELEMENT_NODE)
															continue;
														String xLocalName = x.getLocalName();
														if(xLocalName==null)
															xLocalName=((Element)x).getTagName();
														
														if("name".equals(xLocalName)) {
															processor.inputs.add(x.getTextContent());
														}
													}
												}
											} else if("outputs".equals(value_nodeLocalName)) {
												NodeList outputs = value_node.getChildNodes();
												for(int oi=0,maxoi=outputs.getLength(); oi<maxoi; oi++) {
													Node output = outputs.item(oi);
													if(output.getNodeType()!=Node.ELEMENT_NODE)
														continue;
													
													NodeList xs = output.getChildNodes();
													for(int xi=0,maxxi=xs.getLength(); xi<maxxi; xi++) {
														Node x = xs.item(xi);
														if(x.getNodeType()!=Node.ELEMENT_NODE)
															continue;
														String xLocalName = x.getLocalName();
														if(xLocalName==null)
															xLocalName=((Element)x).getTagName();
														
														if("name".equals(xLocalName)) {
															processor.outputs.add(x.getTextContent());
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		
		if(processor.inputs.size()==0)
			processor.inputs.addAll(temp_inputs);
		
		if(processor.outputs.size()==0)
			processor.outputs.addAll(temp_outputs);
		
		dataflow.processors.add(processor);
	}
	
	public void add_link(Dataflow dataflow, Node link) {
		Datalink datalink = new Datalink();
		
		NodeList sink_sources = link.getChildNodes();
		for(int si=0,maxsi=sink_sources.getLength(); si<maxsi; si++) {
			Node sink_source = sink_sources.item(si);
			if(sink_source.getNodeType()!=Node.ELEMENT_NODE)
				continue;
			
			String sink_sourceLocalName = sink_source.getLocalName();
			if(sink_sourceLocalName==null)
				sink_sourceLocalName=((Element)sink_source).getTagName();
			
			if("sink".equals(sink_sourceLocalName)) {
				Node first = sink_source.getFirstChild();
				if(first!=null) {
					datalink.sink = first.getTextContent();
					if("processor".equals(((Element)sink_source).getAttribute("type"))) {
						Node last = sink_source.getLastChild();
						if(last!=null) {
							datalink.sink_port = last.getTextContent();
							datalink.sink += ":" + datalink.sink_port;
						}
					} else {
						datalink.sink_port = null;
					}
				}
			} else if("source".equals(sink_sourceLocalName)) {
				Node first = sink_source.getFirstChild();
				if(first!=null) {
					datalink.source = first.getTextContent();
					if("processor".equals(((Element)sink_source).getAttribute("type"))) {
						Node last = sink_source.getLastChild();
						if(last!=null) {
							datalink.source_port = last.getTextContent();
							datalink.source += ":" + datalink.source_port;
						}
					} else {
						datalink.source_port = null;
					}
				}
			}
		}
		
		dataflow.datalinks.add(datalink);
	}
	
	public void add_coordination(Dataflow dataflow, Node condition) {
		Coordination coordination = new Coordination();
		
		coordination.control = ((Element)condition).getAttribute("control");
		coordination.target = ((Element)condition).getAttribute("target");
		
		dataflow.coordinations.add(coordination);
	}
	
	public void add_annotation(Dataflow dataflow, Node annotation) {
		NodeList annotationBeans = ((Element)annotation).getElementsByTagName("annotationBean");
		if(annotationBeans.getLength() >0) {
			Node content_node = annotationBeans.item(0);
			
			Node contentChild = content_node.getFirstChild();
			if(contentChild!=null) {
				Node contentChildNext = contentChild.getNextSibling();
				
				if(contentChildNext!=null) {
					String content = contentChildNext.getTextContent();
					
					String classVal = ((Element)content_node).getAttribute("class");
					String classValLC = classVal.toLowerCase();
					
					if(classValLC.contains("freetextdescription")) {
						dataflow.annotations.descriptions.add(content);
					} else if(classValLC.contains("descriptivetitle")) {
						dataflow.annotations.titles.add(content);
					} else if(classValLC.contains("author")) {
						dataflow.annotations.authors.add(content);
					}
				}
			}
		}
	}
}
