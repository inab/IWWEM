#!/usr/bin/perl -W

# $Id$
# workflowmanager.pl
# from INB Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use URI;
use XML::LibXML;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($retval)=0;
my($retvalmsg)=undef;
my($dataisland)=undef;
my($dataislandTag)=undef;
my($hasInputWorkflow)=undef;
my($hasInputWorkflowDeps)=undef;
my($doFreezeWorkflowDeps)=undef;

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	# We are skipping all unknown params
	if($param eq $WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq 'eraseWFId') {
		my(@workflowId)=$query->param($param);
		last if($query->cgi_error());
		
		foreach my $wrelpath (@workflowId) {
			# We are only erasing what it is valid...
			next  if(index($wrelpath,'/')==0 || index($wrelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			
			# And last, unlink!
			rmtree($WorkflowCommon::WORKFLOWDIR.'/'.$wrelpath);
		}
	} elsif($param eq 'workflow') {
		$hasInputWorkflow=1;
	} elsif($param eq 'workflowDep') {
		$hasInputWorkflowDeps=1;
	} elsif($param eq 'freezeWorkflowDeps') {
		$doFreezeWorkflowDeps=1;
	}
}

my $parser = XML::LibXML->new();
my $context = XML::LibXML::XPathContext->new();
$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);

# Parsing input workflows
if(defined($hasInputWorkflow)) {
	# Now, time to recognize the content
	my($param)='workflow';
	my @UPHL=$query->upload($param);

	unless($query->cgi_error()) {

		my($isfh)=1;

		if(scalar(@UPHL)==0) {
			@UPHL=$query->param($param);
			$isfh=undef;
		}

		foreach my $UPH (@UPHL) {
			# Generating a unique identifier
			my($randname);
			my($randdir);
			my($randfilexml);
			my($randfilesvg);
			my($randfilepng);
			my($randfilepdf);
			do {
				$randname=WorkflowCommon::genUUID();
				$randdir=$WorkflowCommon::WORKFLOWDIR.'/'.$randname;
			} while(-d $randdir);

			# Creating workflow directory
			mkpath($randdir);
			# Saving the workflow data
			$randfilexml = $randdir . '/' . $WorkflowCommon::WORKFLOWFILE;
			$randfilesvg = $randdir . '/' . $WorkflowCommon::SVGFILE;
			$randfilepng = $randdir . '/' . $WorkflowCommon::PNGFILE;
			$randfilepdf = $randdir . '/' . $WorkflowCommon::PDFFILE;
			
			my($WFmaindoc);
			
			eval {
				# CGI provides fake filehandlers :-(
				# so we have to use the push parser
				$parser->init_push();
				if(defined($isfh)) {
					my($line);
					while($line=<$UPH>) {
						$parser->push($line);
					}
					# Rewind the handler
					seek($UPH,0,0);
				} else {
					$parser->push($UPH);
				}
				$WFmaindoc=$parser->finish_push();
				$WFmaindoc->toFile($randfilexml);
			};
			
			unless($@) {
				# Resolving and saving dependencies
				my($depdir)=$randdir.'/'.$WorkflowCommon::DEPDIR;
				mkpath($depdir);
				my(@unpatchedWF)=($randfilexml);
				my(%WFhash)=($randfilexml=>[$WFmaindoc,$randfilexml,undef,undef]);
				
				my($peta)=undef;
				my($ua)=LWP::UserAgent->new();
				# Getting the base uri for subworkflows
				my($cgibaseuri)=WorkflowCommon::getCGIBaseURI($query);
				$cgibaseuri =~ s/cgi-bin\/[^\/]+$//;
				
				# First pass...
				foreach my $WFuri (@unpatchedWF) {
					my($WFdoc)=$WFhash{$WFuri}[0];
					
					# Really do we have deps? I doubt it...
					my(@internalDeps)=$context->findnodes('//s:processor/s:workflow/s:xscufllocation',$WFdoc);
					if(scalar(@internalDeps)>0) {
						foreach my $dep (@internalDeps) {
							my($uritext)=$dep->textContent();
							if(defined($uritext) && length($uritext)>0) {
								unless(exists($WFhash{$uritext})) {
									my($newWFdoc)=undef;
									my($URI)=URI->new($uritext);
									if($URI->scheme eq 'file') {
										my($file)=$URI->file();
										# Local dependency
										if(defined($hasInputWorkflowDeps)) {
											# Looking for it among submitted deps
											my($relfile)=undef;
											
											# Getting the relative file for guessing
											if($file =~ /[\/\\]([^\/\\]+)$/) {
												$relfile=$1;
											} else {
												$relfile=$file;
											}
											
											# The elements of this array can be something like
											# "filename, referer ..."
											# "full file name"
											# etc...
											# So we can only play with $file and $relfile,
											# which have a known structure.
											my(@depnames) = $query->param('workflowDep');
											my($found)=undef;
											my($pos)=0;
											foreach my $depname (@depnames) {
												if(rindex($depname,$file)!=-1 || rindex($depname,$relfile)!=-1) {
													$found=$pos;
													last;
												}
												
												# Next round
												$pos++;
											}
											
											# I believe it was found
											if(defined($found)) {
												my(@DEPH) = $query->upload('workflowDep');
												last  if($query->cgi_error());
												
												my($FAKEH)=$DEPH[$found];
												eval {
													$parser->init_push();
													my($line);
													while($line=<$FAKEH>) {
														$parser->push($line);
													}
													# Rewind the handler
													seek($FAKEH,0,0);
													$newWFdoc=$parser->finish_push();
												};
											} else {
												$peta="FATAL ERROR: Unresolved local dependency (not found $file)";
												last;
											}
										} else {
											$peta="FATAL ERROR: Unresolved local dependency (not sent $file)";
											last;
										}
									} else {
										# Remote one, let's get it!
										eval {
											$parser->start_push();
											$ua->request(HTTP::Request->new(GET=>$uritext),
													sub {
														my($chunk, $res)=@_;

														$parser->push($chunk);
													}
												);
											$newWFdoc=$parser->finish_push();
										};
									}
									
									# Now it is time to give it a filename
									unless($@) {
										my($reldepname);
										my($newWFname);
										do {
											$reldepname = $WorkflowCommon::DEPDIR.'/'.WorkflowCommon::genUUID().'.xml';
											$newWFname = $randdir .'/'.$reldepname;
										} while(-f $newWFname);

										eval {
											$newWFdoc->toFile($newWFname);
										};

										if($@) {
											# There was a problem in the process
											$peta=$@;
											last;
										}

										# And recording the patched dependency
										my($patchedURI) = $cgibaseuri . $WorkflowCommon::WORKFLOWRELDIR .'/'.$randname .'/'.$reldepname;

										# Saving the subworkflow
										$WFhash{$uritext}=[$newWFdoc,$newWFname,undef,$patchedURI];
										push(@unpatchedWF,$uritext);
									} else {
										# There was a problem in the process
										$peta=$@;
										last;
									}
								}
								
								# Mark it to process and save it later because
								# we must patch dependencies
								$WFhash{$WFuri}[2]=1;
							}
						}
						# There was some problem...
						last  if($query->cgi_error() || defined($peta));
					}
				}
				
				if(defined($peta) || $query->cgi_error()) {
					# TODO error handling
					$retval=1;
					$retvalmsg=$peta  if(defined($peta));
					rmtree($randdir);
					last;
				}
				
				# Second pass, workflow patching.
				foreach my $WFuri (reverse(@unpatchedWF)) {
					my($wfval)=$WFhash{$WFuri};
					
					if(defined($wfval->[2])) {
						my($WFdoc)=$wfval->[0];
						
						# Really do we have deps? I doubt it...
						my(@internalDeps)=$context->findnodes('//s:processor/s:workflow/s:xscufllocation',$WFdoc);
						if(scalar(@internalDeps)>0) {
							foreach my $dep (@internalDeps) {
								my($uritext)=$dep->textContent();
								if(defined($uritext) && length($uritext)>0) {
									if(exists($WFhash{$uritext})) {
										# Cleaning up the content of the dependency
										# and changing its content
										if(defined($doFreezeWorkflowDeps)) {
											my($parent)=$dep->parentNode();
											foreach my $child ($parent->childNodes()) {
												$parent->removeChild($child);
											}
											$parent->appendChild($WFdoc->importNode($WFhash{$uritext}[0]->documentElement));
										} else {
											foreach my $child ($dep->childNodes()) {
												$dep->removeChild($child);
											}
											# So we can add new text node with no problem
											$dep->appendChild($WFdoc->createTextNode($WFhash{$uritext}[3]));
											# And mark it to save it later because
											# there are patched dependencies
											$WFhash{$WFuri}[2]=1;
										}
									} else {
										# FATAL ERROR!!!!!!!!!!!
									}
								}
							}
							# Last step, save all the changed content
							# Some workflows could have been patched,
							# so they should be re-saved
							$WFdoc->toFile($wfval->[1]);
						}
					}
				}
				
				# Now it is time to validate the whole mess!
				my(@command)=($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser',
					'-baseDir',$WorkflowCommon::MAVENDIR,
					'-workflow',$randfilexml,
					'-svggraph',$randfilesvg,
					'-pnggraph',$randfilepng,
					'-pdfgraph',$randfilepdf,
					'-expandSubWorkflows');
				
				# Backing up STDOUT and STDERR
				my($BSTDERR,$BSTDOUT);
				open($BSTDOUT,'>&',\*STDOUT);
				open($BSTDERR,'>&',\*STDERR);

				# Now, setting up the temporal file
				# and the redirections
				my($LOG)=File::Temp->new();
				my($TMPLOG);
				open($TMPLOG,'>',$LOG->filename());
				open(STDOUT,'>&',$TMPLOG);
				open(STDERR,'>&',$TMPLOG);

				# The command
#				my($comm)=$WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser -baseDir '.$WorkflowCommon::MAVENDIR.' -workflow '.$randfilexml.' -svggraph '.$randfilesvg.' -expandSubWorkflows';

				$retval=system(@command);

				# And returning to original handlers
				open(STDOUT,'>&',$BSTDOUT);
				open(STDERR,'>&',$BSTDERR);
				close($TMPLOG);
				close($BSTDOUT);
				close($BSTDERR);
				$TMPLOG=undef;
				$BSTDOUT=undef;
				$BSTDERR=undef;

				# If it failed, it is better erasing the workflow
				# because it is not a valid one!
				if($retval!=0) {
					# But before erasing, it is time to retrieve
					# the error messages from the program
					my($ERRLOG);
					if(open($ERRLOG,'<',$LOG->filename())) {
						my($line);
						$retvalmsg=''  unless(defined($retvalmsg));
						while($line=<$ERRLOG>) {
							$retvalmsg .= $line;
						}
						close($ERRLOG);
					}
					rmtree($randdir);
					last;
				} else {
					# Creating empty catalogs
					mkpath($randdir.'/'.$WorkflowCommon::EXAMPLESDIR);
					my($excatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
					my($exroot)=$excatalog->createElementNS($WorkflowCommon::WFD_NS,'examples');
					$exroot->appendChild($excatalog->createComment( encode('UTF-8',$WorkflowCommon::COMMENTEL) ));
					$excatalog->setDocumentElement($exroot);
					$excatalog->toFile($randdir.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE);

					mkpath($randdir.'/'.$WorkflowCommon::SNAPSHOTSDIR);
					my($snapcatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
					my($snaproot)=$excatalog->createElementNS($WorkflowCommon::WFD_NS,'snapshots');
					$snaproot->appendChild($snapcatalog->createComment( encode('UTF-8',$WorkflowCommon::COMMENTES) ));
					$snapcatalog->setDocumentElement($snaproot);
					$snapcatalog->toFile($randdir.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE);
				}
			} else {
				$retval=2;
				$retvalmsg = ''  unless(defined($retvalmsg));
				$retvalmsg .= 'Error while parsing input workflow: '.$@;
				remtree($randdir);
				last;
			}
		}
	}
}

# We must signal here errors and exit
if($query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because upload was interrupted'),
		$query->strong($error);
	exit 0;
}

# Second step, workflow repository report

my(@dirstack)=('.');
my(@workflowlist)=();

# Looking for workflows
foreach my $dir (@dirstack) {
	my($WFDIR);
	my($fdir)=$WorkflowCommon::WORKFLOWDIR.'/'.$dir;
	if(opendir($WFDIR,$fdir)) {
		my($entry);
		my(@posdirstack)=();
		my($foundworkflowdir)=undef;
		while($entry=readdir($WFDIR)) {
			next if(index($entry,'.')==0);
			
			my($fentry)=$fdir.'/'.$entry;
			my($rentry)=($dir ne '.')?($dir.'/'.$entry):$entry;
			if($entry eq $WorkflowCommon::WORKFLOWFILE) {
				$foundworkflowdir=1;
			} elsif(-d $fentry) {
				push(@posdirstack,$rentry);
			}
		}
		closedir($WFDIR);
		# We are only saving found subdirectories when
		# this is not a workflow directory
		if(defined($foundworkflowdir)) {
			push(@workflowlist,$dir);
		} else {
			push(@dirstack,@posdirstack);
		}
	}
}

my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
my($root)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'workflowlist');
$root->setAttribute('time',LockNLog::getPrintableNow());
$root->setAttribute('relURI',$WorkflowCommon::WORKFLOWRELDIR);
$outputDoc->setDocumentElement($root);

$root->appendChild($outputDoc->createComment( encode('UTF-8',$WorkflowCommon::COMMENTWM) ));

# Attached Error Message (if any)
if($retval!=0) {
	my($message)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'message');
	$message->setAttribute('retval',$retval);
	if(defined($retvalmsg)) {
		$message->appendChild($outputDoc->createCDATASection($retvalmsg));
	}
	$root->appendChild($message);
}

foreach my $wf (@workflowlist) {
	eval {
		my($relwffile)=$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
		my $doc = $parser->parse_file($WorkflowCommon::WORKFLOWDIR.'/'.$relwffile);
		# Getting description from workflow definition
		my @nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
		if(scalar(@nodelist)>0) {
			my $wfe = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'workflow');
			my($desc)=$nodelist[0];
			$wfe->setAttribute('uuid',$wf);
			$wfe->setAttribute('lsid',$desc->getAttribute('lsid'));
			$wfe->setAttribute('author',$desc->getAttribute('author'));
			$wfe->setAttribute('title',$desc->getAttribute('title'));
			my($wffile)=$WorkflowCommon::WORKFLOWDIR.'/'.$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
			$wfe->setAttribute('path',$relwffile);
			my $svg = $wf.'/'.$WorkflowCommon::SVGFILE;
			$wfe->setAttribute('svg',$svg);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desc->textContent()));
			$wfe->appendChild($wdesc);
			
			# Adding links to its graphical representations
			my($gfile,$gmime);
			while(($gfile,$gmime)=each(%WorkflowCommon::GRAPHREP)) {
				my $rfile = $wf.'/'.$gfile;
				# Only include what has been generated!
				if( -f $WorkflowCommon::WORKFLOWDIR.'/'.$rfile) {
					my($gchild)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'graph');
					$gchild->setAttribute('mime',$gmime);
					$gchild->appendChild($outputDoc->createTextNode($rfile));
					$wfe->appendChild($gchild);
				}
			}
			
			# Now, including dependencies
			my($DEPDIRH);
			my($depreldir)=$wf.'/'.$WorkflowCommon::DEPDIR;
			my($depdir)=$WorkflowCommon::WORKFLOWDIR.'/'.$depreldir;
			if(opendir($DEPDIRH,$depdir)) {
				my($entry);
				while($entry=readdir($DEPDIRH)) {
					next  if(index($entry,'.')==0);
					
					my($fentry)=$depdir.'/'.$entry;
					if(-f $fentry && $fentry =~ /\.xml$/) {
						my($depnode) = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'dependsOn');
						$depnode->setAttribute('sub',$depreldir.'/'.$entry);
						$wfe->appendChild($depnode);
					}
				}
				
				closedir($DEPDIRH);
			}
			
			# Getting Inputs
			@nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'source');
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'input');
				$input->setAttribute('name',$source->getAttribute('name'));
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$source->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$input->appendChild($mtype);
				}
				
				# At last, appending this input
				$wfe->appendChild($input);
			}
			
			# And Outputs
			@nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'sink');
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'output');
				$output->setAttribute('name',$sink->getAttribute('name'));
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$sink->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$output->appendChild($mtype);
				}
				
				# At last, appending this output
				$wfe->appendChild($output);
			}
			
			# Now importing the examples catalog
			my($examples)=$parser->parse_file($WorkflowCommon::WORKFLOWDIR.'/'.$wf.'/'.$WorkflowCommon::EXAMPLESDIR . '/' . $WorkflowCommon::CATALOGFILE);
			for my $child ($examples->documentElement()->getChildrenByTagNameNS($WorkflowCommon::WFD_NS,'example')) {
				$wfe->appendChild($outputDoc->importNode($child));
			}
			
			# And the snapshots one!
			my($snapshots)=$parser->parse_file($WorkflowCommon::WORKFLOWDIR.'/'.$wf.'/'.$WorkflowCommon::SNAPSHOTSDIR . '/' . $WorkflowCommon::CATALOGFILE);
			for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($WorkflowCommon::WFD_NS,'snapshot')) {
				$wfe->appendChild($outputDoc->importNode($child));
			}
			
			# At last, appending the new workflow entry
			$root->appendChild($wfe);
		}
	};
	
	if($@) {
		$root->appendChild($outputDoc->createComment("Unable to process $wf due ".$@));
	}
}

print $query->header(-type=>(defined($dataisland)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');

if(defined($dataisland)) {
	print "<html><body><$dataislandTag id='".$WorkflowCommon::PARAMISLAND."'>\n";
}

unless(defined($dataisland) && $dataisland eq '2') {
	$outputDoc->toFH(\*STDOUT);
} else {
	print encode('UTF-8', $outputDoc->createTextNode($root->toString())->toString());
}

if(defined($dataisland)) {
	print "\n</$dataislandTag></body></html>";
}

exit 0;
