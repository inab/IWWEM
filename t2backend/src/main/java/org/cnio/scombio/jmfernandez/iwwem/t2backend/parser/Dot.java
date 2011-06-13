/*
	$Id$
	Dot.java
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
import java.io.PrintStream;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * This class enables you to write the script will will be used by dot
 * (which is part of GraphViz[http://www.graphviz.org/Download.php])
 * to generate the image showing the structure of a given model.
 * To get started quickly, you could try:
 *   out_file = File.new("path/to/file/you/want/the/dot/script/to/be/written", "w+")
 *   workflow = File.new("path/to/workflow/file", "r").read
 *   model = T2Flow::Parser.new.parse(workflow)
 *   T2Flow::Dot.new.write_dot(out_file, model)
 *   `dot -Tpng -o"path/to/the/output/image" #{out_file.path}`
 */
public class Dot {
	public final static Map<String,String> processor_colours = new HashMap<String,String>();
	
	static {
		processor_colours.put("apiconsumer" , "palegreen");
		processor_colours.put("beanshell" , "burlywood2");
		processor_colours.put("biomart" , "lightcyan2");
		processor_colours.put("local" , "mediumorchid2");
		processor_colours.put("localworker" , "mediumorchid2");
		processor_colours.put("biomoby" , "darkgoldenrod1");
		processor_colours.put("biomobywsdl" , "darkgoldenrod1");
		processor_colours.put("biomobyobject" , "gold");
		processor_colours.put("biomobyparser" , "white");
		processor_colours.put("inferno" , "violetred1");
		processor_colours.put("notification" , "mediumorchid2");
		processor_colours.put("rdfgenerator" , "purple");
		processor_colours.put("rserv" , "lightgoldenrodyellow");
		processor_colours.put("seqhound" , "#836fff");
		processor_colours.put("soaplabwsdl" , "lightgoldenrodyellow");
		processor_colours.put("stringconstant" , "lightsteelblue");
		processor_colours.put("talisman" , "plum2");
		processor_colours.put("bsf" , "burlywood2");
		processor_colours.put("abstractprocessor" , "lightgoldenrodyellow");
		processor_colours.put("rshell" , "lightgoldenrodyellow");
		processor_colours.put("arbitrarywsdl" , "darkolivegreen3");
		processor_colours.put("workflow" , "crimson");
	};
	
	public final static String[] fill_colours={"white","aliceblue","antiquewhite","beige"};
	public final static String ranksep = "0.5";
	public final static String nodesep = "0.05";
	
	public Dot() {
		this("none");
	}
	
	protected String port_style;
	protected Model t2flow_model;
	
	/**
	 * Creates a new dot object for interaction.
	 */
	public Dot(String port_style) {
		this.port_style = port_style;	// 'all', 'bound' or 'none'
	}
	
	public void write_dot(PrintStream stream,Model model) {
		t2flow_model = model;
		stream.println("digraph t2flow_graph {");
		stream.println(" graph [");
		stream.println("  style=\"\"");
		stream.println("  labeljust=\"left\"");
		stream.println("  clusterrank=\"local\"");
		stream.println("  ranksep=\""+ranksep+"\"");
		stream.println("  nodesep=\""+nodesep+"\"");
		stream.println(" ]");
		stream.println();
		stream.println(" node [");
		stream.println("  fontname=\"Helvetica\",");
		stream.println("  fontsize=\"10\",");
		stream.println("  fontcolor=\"black\", ");
		stream.println("  shape=\"box\",");
		stream.println("  height=\"0\",");
		stream.println("  width=\"0\",");
		stream.println("  color=\"black\",");
		stream.println("  fillcolor=\"lightgoldenrodyellow\",");
		stream.println("  style=\"filled\"");
		stream.println(" ];");
		stream.println();
		stream.println(" edge [");
		stream.println("  fontname=\"Helvetica\",");
		stream.println("  fontsize=\"8\",");
		stream.println("  fontcolor=\"black\",");
		stream.println("  color=\"black\"");
		stream.println(" ];");
		write_dataflow(stream, model.main());
		stream.println('}');

		stream.flush();
	}
	
	protected void write_dataflow(PrintStream stream,Dataflow dataflow) {
		write_dataflow(stream,dataflow,"","",0);
	}

	protected void write_dataflow(PrintStream stream,Dataflow dataflow,String prefix, String name, int depth) {
		if(!"".equals(name)) {
			stream.println("subgraph cluster_"+prefix+name+" {");
			stream.println(" label=\""+name+"\"");
			stream.println(" fontname=\"Helvetica\"");
			stream.println(" fontsize=\"10\"");
			stream.println(" fontcolor=\"black\"");
			stream.println(" clusterrank=\"local\"");
			stream.println(" fillcolor=\""+fill_colours[depth % fill_colours.length]+"\"");
			stream.println(" style=\"filled\"");
		}
		
		for(Processor processor: dataflow.processors) {
			write_processor(stream, processor, prefix, depth);
		}
		
		write_source_cluster(stream, dataflow.sources, prefix);
		write_sink_cluster(stream, dataflow.sinks, prefix);
		
		for(Datalink link: dataflow.datalinks) {
			write_link(stream, link, dataflow, prefix);
		}
		
		for(Coordination coordination: dataflow.coordinations) {
			write_coordination(stream, coordination, dataflow, prefix);
		}
		
		if(!"".equals(name)) {
			stream.println('}');
		}
	}
	
	protected void write_processor(PrintStream stream, Processor processor, String prefix, int depth) {
		// nested workflows
		if("workflow".equals(processor.type)) {
			Dataflow dataflow = t2flow_model.dataflow(processor.dataflow_id);
			write_dataflow(stream, dataflow, prefix + dataflow.annotations.name, dataflow.annotations.name, depth + 1);
		} else {
			String label = null;
			String shape = null;
			if("none".equals(port_style)) {
				shape = "box";
				label = processor.name;
			} else {
				shape = "record";
				label = "{{";
				if(processor.inputs.size()>0) {
					boolean first = true;
					for(String input: processor.inputs) {
						if(first) {
							first=false;
						} else {
							label += "|";
						}
						label += "<i"+input+">"+input;
					}
					// label += processor.inputs.join('|')
				}
				label += "}|"+processor.name+"|{";
				if(processor.outputs.size()>0) {
					boolean first = true;
					for(String output: processor.outputs) {
						if(first) {
							first = false;
						} else {
							label += "|";
						}
						label += "<o"+output+">"+output;
					}
					// label += processor.outputs.join('|')
				}
				label += "}}";
			}
			stream.println(" \""+prefix+processor.name+"\" [");
			stream.println("  fillcolor=\""+get_colour(processor.type)+"\",");
			stream.println("  shape=\""+shape+"\",");
			stream.println("  style=\"filled\",");
			stream.println("  height=\"0\",");
			stream.println("  width=\"0\",");
			stream.println("  label=\""+label+"\"");
			stream.println(" ];");
		}
	}
	
	protected void write_source_cluster(PrintStream stream, List<Source> sources, String prefix) {
		if(sources.size() > 0) {
			stream.println(" subgraph cluster_"+prefix+"sources {");
			stream.println("  style=\"dotted\"");
			stream.println("  label=\"Workflow Inputs\"");
			stream.println("  fontname=\"Helvetica\"");
			stream.println("  fontsize=\"10\"");
			stream.println("  fontcolor=\"black\"");
			stream.println("  rank=\"same\"");
			stream.println(" \""+prefix+"WORKFLOWINTERNALSOURCECONTROL\" [");
			stream.println("  shape=\"triangle\",");
			stream.println("  width=\"0.2\",");
			stream.println("  height=\"0.2\",");
			stream.println("  fillcolor=\"brown1\"");
			stream.println("  label=\"\"");
			stream.println(" ]");
			for(Source source: sources) {
				write_source(stream, source, prefix);
			}
			stream.println(" }");
		}
	}
    
	protected void write_source(PrintStream stream, Source source, String prefix) {
		stream.println(" \""+prefix+"WORKFLOWINTERNALSOURCE_"+source.name+"\" [");
		stream.println("   shape=\""+ ("none".equals(port_style) ? "box" : "invhouse") +"\",");
		stream.println("   label=\""+source.name+"\"");
		stream.println("   width=\"0\",");
		stream.println("   height=\"0\",");
		stream.println("   fillcolor=\"#8ed6f0\"");
		stream.println(" ]");
	}
    
	protected void write_sink_cluster(PrintStream stream, List<Sink> sinks, String prefix) {
		if(sinks.size() > 0) {
			stream.println(" subgraph cluster_"+prefix+"sinks {");
			stream.println("  style=\"dotted\"");
			stream.println("  label=\"Workflow Outputs\"");
			stream.println("  fontname=\"Helvetica\"");
			stream.println("  fontsize=\"10\"");
			stream.println("  fontcolor=\"black\"");
			stream.println("  rank=\"same\"");
			stream.println(" \""+prefix+"WORKFLOWINTERNALSINKCONTROL\" [");
			stream.println("  shape=\"invtriangle\",");
			stream.println("  width=\"0.2\",");
			stream.println("  height=\"0.2\",");
			stream.println("  fillcolor=\"chartreuse3\"");
			stream.println("  label=\"\"");
			stream.println(" ]");
			for(Sink sink: sinks) {
				write_sink(stream, sink, prefix);
			}
			stream.println(" }");
		}
	}
    
	protected void write_sink(PrintStream stream, Sink sink, String prefix) {
		stream.println(" \""+prefix+"WORKFLOWINTERNALSINK_"+sink.name+"\" [");
		stream.println("   shape=\""+("none".equals(port_style) ? "box" : "house")+"\",");
		stream.println("   label=\""+sink.name+"\"");
		stream.println("   width=\"0\",");
		stream.println("   height=\"0\",");
		stream.println("   fillcolor=\"#8ed6f0\"");
		stream.println(" ]");
	}
	
	protected void write_link(PrintStream stream, Datalink link, Dataflow dataflow, String prefix) {
		boolean empty = true;
		for(Source s: dataflow.sources) {
			if(link.source.equals(s.name)) {
				stream.print(" \""+prefix+"WORKFLOWINTERNALSOURCE_"+link.source+"\"");
				empty = false;
				break;
			}
		}
		if(empty) {
			String[] spSource = link.source.split(":");
			String spName = spSource[0];
			for(Processor processor: dataflow.processors) {
				if(spName.equals(processor.name)) {
					if("workflow".equals(processor.type)) {
						Dataflow df = t2flow_model.dataflow(processor.dataflow_id);
						stream.print(" \""+prefix+df.annotations.name+"WORKFLOWINTERNALSINK_"+spSource[1]+"\"");
					} else {
						if("none".equals(port_style) || link.source_port == null) {
							stream.print(" \""+prefix+processor.name+"\"");
						} else {
							// stream.print(" \""+prefix+processor.name+"\":\"o"+link.source_port+"\"");
							stream.print(" \""+prefix+processor.name+"\":\""+link.source_port+"\"");
						}
					}
					break;
				}
			}
		}
		
		stream.print(" -> ");
		
		empty=true;
		for(Sink s: dataflow.sinks) {
			if(link.sink.equals(s.name)) {
				stream.print("\""+prefix+"WORKFLOWINTERNALSINK_"+link.sink+"\"");
				empty = false;
				break;
			}
		}
		if(empty) {
			String[] spSink = link.sink.split(":");
			String spName = spSink[0];
			for(Processor processor: dataflow.processors) {
				if(spName.equals(processor.name)) {
					if("workflow".equals(processor.name)) {
						Dataflow df = t2flow_model.dataflow(processor.dataflow_id);
						stream.print("\""+prefix+df.annotations.name+"WORKFLOWINTERNALSOURCE_"+spSink[1]+"\"");
					} else {
						if("none".equals(port_style) || link.sink_port == null) {
							stream.print("\""+prefix+processor.name+"\"");
						} else {
							// stream.print("\""+prefix+processor.name+"\":\"i"+link.sink_port+"\"");
							stream.print("\""+prefix+processor.name+"\":\""+link.sink_port+"\"");
						}
					}
					break;
				}
			}
		}
		stream.println(" [");
		stream.println(" ];");
	}

	protected void write_coordination(PrintStream stream, Coordination coordination, Dataflow dataflow, String prefix) {
		stream.print(" \""+prefix+coordination.control); 
		
		Processor processor=null;
		for(Processor p: dataflow.processors) {
			if(coordination.control.equals(p.name)) {
				processor=p;
				break;
			}
		}
		// processor = dataflow.processors.select{|p| p.name == coordination.control}[0]

		if("workflow".equals(processor.type))
			stream.print("WORKFLOWINTERNALSINKCONTROL");
		stream.print("\"->\"");
		stream.print(prefix+coordination.target);
		
		processor = null;
		for(Processor p: dataflow.processors) {
			if(coordination.target.equals(p.name)) {
				processor=p;
				break;
			}
		}
		// processor = dataflow.processors.select{|p| p.name == coordination.target}[0]
		
		if("workflow".equals(processor.type))
			stream.print("WORKFLOWINTERNALSOURCECONTROL");
		stream.print("\"");
		stream.println(" [");
		stream.println("  color=\"gray\",");
		stream.println("  arrowhead=\"odot\",");
		stream.println("  arrowtail=\"none\"");
		stream.println(" ];");
	}
    
	protected String get_colour(String processor_name) {
		if(processor_colours.containsKey(processor_name)) {
			// puts "WARN: Recognized color: #{colour} #{processor_name}"
			return processor_colours.get(processor_name);
		} else {
			// puts "WARN: Unrecognized color: #{colour} #{processor_name}"
			return "white";
		}
	}
    
	/**
	 * Returns true if the given name is a processor; false otherwise
	 */
	public static boolean is_processor(String processor_name) {
		return processor_colours.containsKey(processor_name);
	}
	
	
	public final static void main(String[] args)
		throws Throwable
	{
		if(args.length>0) {
			for(String file: args) {
				System.out.println("Processing file "+file);
				File foo = new File(file);
				Parser t2parser = new Parser();
				Model bar = t2parser.parse(foo);
				File out_file = new File(file+".dot");
				Dot dotgen = new Dot("all");
				PrintStream out_file_stream = new PrintStream(out_file);
				dotgen.write_dot(out_file_stream,bar);
				out_file_stream.close();
			}
		} else {
			System.err.println("This program needs at least an input file!");
		}
	}
}
