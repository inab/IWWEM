#!/usr/bin/ruby

spec = Gem::Specification.new do |s| 
  s.name = "taverna-scufl"
  s.version = "0.7.1"
  s.date = "2009-09-16"
  s.summary = "Support for interacting with the Taverna workflow system (Scufl)."
  s.description = "This a gem developed by myGrid for the purpose of interacting with Taverna 1 workflows.  An example use would be the image genaration for the model representing Taverna 1 workflows as used in myExperiment."

  s.authors = ["David Withers", "Emmanuel Tagarira"]
  s.email = "david.withers@manchester.ac.uk"
  s.homepage = "http://www.mygrid.org.uk/"
  
  s.files = ["test/fixtures", "test/fixtures/animal.xml", "test/fixtures/colouranimal.xml", "test/tc_client.rb", "test/ts_taverna.rb", "lib/baclava", "lib/baclava/reader.rb", "lib/baclava/writer.rb", "lib/document", "lib/document/data.rb", "lib/document/report.rb", "lib/enactor", "lib/enactor/client.rb", "lib/scufl", "lib/scufl/dot.rb", "lib/scufl/model.rb", "lib/scufl/parser.rb", "README.rdoc", "LICENCE", "ChangeLog.rdoc"]
  s.extra_rdoc_files = ["README.rdoc", "LICENCE", "ChangeLog.rdoc"]
  s.test_files = ["test/ts_taverna.rb"]
  s.has_rdoc = true
  
  s.rdoc_options = ["-N", "--tab-width=2", "--main=README.rdoc", "--exclude='scufl.gemspec|test'"]
  
  s.autorequire = "baclava, client, document, scufl"
  s.require_paths = ["lib"]
  s.platform = Gem::Platform::RUBY 

  s.add_dependency("rdoc", ">=2.4.3")
  s.add_dependency("darkfish-rdoc", ">=1.1.5")
  s.required_ruby_version = Gem::Requirement.new(">=1.0.1")
  s.rubygems_version = "1.3.5"
  
  s.specification_version = 1 if s.respond_to? :specification_version=
  s.required_rubygems_version = nil if s.respond_to? :required_rubygems_version=
  s.cert_chain = nil  
end
