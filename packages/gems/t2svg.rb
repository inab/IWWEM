#!/usr/bin/env ruby

Dir[File.dirname(__FILE__) + '/taverna2-gem/lib/t2flow/*.rb'].each do |file| 
#  require File.basename(file, File.extname(file))
   require file
end

if ARGV.length > 0
	ARGV.each do |file|
		puts "Processing file " + file
		foo = File.new(file, "r")
		bar = T2Flow::Parser.new.parse(foo)
		out_file = File.new(file+".dot", "w+")
		T2Flow::Dot.new.write_dot(out_file, bar)
		`dot -Tsvg -o#{file + ".svg"} #{out_file.path}`
	end
else
	puts "This program needs at least an input file!"
end