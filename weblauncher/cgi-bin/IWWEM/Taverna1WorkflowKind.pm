#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/Taverna1WorkflowKind.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
#
# This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.
# 
# IWWE&M is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# IWWE&M is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with IWWE&M.  If not, see <http://www.gnu.org/licenses/agpl.txt>.
# 
# Original IWWE&M concept, design and coding done by José María Fernández González, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package IWWEM::Taverna1WorkflowKind;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowKind);

use IWWEM::WorkflowCommon;

use vars qw($XSCUFL_NS $XSCUFL_MIME);

$XSCUFL_NS = 'http://org.embl.ebi.escience/xscufl/0.1alpha';
$XSCUFL_MIME = 'application/vnd.taverna.scufl+xml';
##############
# Prototypes #
##############
sub new(;$$);

###############
# Constructor #
###############

sub new(;$$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);

	my($context)=$self->{CONTEXT};
	$context->registerNs('s',$XSCUFL_NS);
	
	return bless($self,$class);
}

###########
# Methods #
###########

sub getWorkflowInfo($$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($wf,$uuid,$listDir,$relwffile,$isSnapshot)=@_;
	
	my($wffile)=undef;
	my($wfresp,$examplescat,$snapshotscat)=();
	if(defined($relwffile)) {
		$wffile=$listDir.'/'.$relwffile;
		my($wfdir)=$listDir.'/'.$wf;
		$wffile=$listDir.'/'.$relwffile;
		$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
	} else {
		$relwffile=$wffile=$wf;
	}
	#$wfcatmutex->mutex(sub {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		my $doc = $parser->parse_file($wffile);
		
		# Getting description from workflow definition
		my @nodelist = $doc->getElementsByTagNameNS($XSCUFL_NS,'workflowdescription');
		my $wfe = undef;
		if(scalar(@nodelist)>0) {
			$wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
			$outputDoc->setDocumentElement($wfe);
			
			my($desc)=$nodelist[0];
			$wfe->setAttribute('uuid',$uuid);
			$wfe->setAttribute('title',$desc->getAttribute('title'));

			my $release = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'release');
			$wfe->appendChild($release);
			

			$release->setAttribute('uuid',$uuid);
			
			$release->setAttribute('lsid',$desc->getAttribute('lsid'));
			$release->setAttribute('author',$desc->getAttribute('author'));
			$release->setAttribute('title',$desc->getAttribute('title'));
			$release->setAttribute('path',$relwffile);
			$release->setAttribute('workflowType',$XSCUFL_MIME);
			
			my($licenseName)=undef;
			my($licenseURI)=undef;
			
			my($desctext)=$desc->textContent();
			
			# Catching the defined license
			if(defined($desctext) && $desctext =~ /^$IWWEM::WorkflowCommon::LICENSESTART\n[ \t]*([^ \n]+)[ \t]+([^\n]+)[ \t]*\n$IWWEM::WorkflowCommon::LICENSESTOP\n/ms) {
				$licenseURI=$1;
				$licenseName=$2;
				$desctext=substr($desctext,0,index($desctext,"\n$IWWEM::WorkflowCommon::LICENSESTART\n")).substr($desctext,index($desctext,index($desctext,"\n$IWWEM::WorkflowCommon::LICENSESTOP\n")+length($IWWEM::WorkflowCommon::LICENSESTOP)+1));
			}
			
			unless(defined($licenseURI)) {
				$licenseName=$IWWEM::Config::DEFAULT_LICENSE_NAME;
				$licenseURI=$IWWEM::Config::DEFAULT_LICENSE_URI;
			} elsif(!defined($licenseName)) {
				$licenseName='PRIVATE';
			}
			
			$release->setAttribute('licenseName',$licenseName);
			$release->setAttribute('licenseURI',$licenseURI);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desctext));
			$release->appendChild($wdesc);
			
			# Getting Inputs
			@nodelist = $context->findnodes('/s:scufl/s:source',$doc);
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'input');
				$input->setAttribute('name',$source->getAttribute('name'));
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($XSCUFL_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$context->findnodes('.//s:mimeType',$source);
				if(scalar(@mimetypes)==0) {
					push(@mimetypes,'text/plain');
				} else {
					foreach my $mime (@mimetypes) {
						$mime=$mime->textContent();
					}
				}				
				#my(@mimetypes)=$source->getElementsByTagNameNS($XSCUFL_NS,'mimetype');
				# Taverna default mime type
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$input->appendChild($mtype);
				}
				
				# At last, appending this input
				$release->appendChild($input);
			}
			
			# Outputs
			@nodelist = $context->findnodes('/s:scufl/s:sink',$doc);
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'output');
				$output->setAttribute('name',$sink->getAttribute('name'));
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($XSCUFL_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$context->findnodes('.//s:mimeType',$sink);
				if(scalar(@mimetypes)==0) {
					push(@mimetypes,'text/plain');
				} else {
					foreach my $mime (@mimetypes) {
						$mime=$mime->textContent();
					}
				}				
				#$sink->getElementsByTagNameNS($XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$output->appendChild($mtype);
				}
				
				# At last, appending this output
				$release->appendChild($output);
			}
			
			# And direct steps!
			@nodelist = $context->findnodes('/s:scufl/s:processor',$doc);
			foreach my $step (@nodelist) {
				my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'step');
				$output->setAttribute('name',$step->getAttribute('name'));
				
				# Description
				my(@stepdesc)=$step->getElementsByTagNameNS($XSCUFL_NS,'description');
				if(scalar(@stepdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($stepdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# Secondary parameters handling
				my(@secparams) = $context->findnodes('s:biomobywsdl/s:Parameter',$step);
				if(scalar(@secparams)>0) {
					$output->setAttribute('kind','moby');
					foreach my $sec (@secparams) {
						my($secnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'secondaryInput');
						$secnode->setAttribute('name',$sec->getAttributeNS($XSCUFL_NS,'name'));
						$secnode->setAttribute('isOptional','true');
						# TODO: Query BioMOBY in order to know the type, min/max values, description, etc...!
						$secnode->setAttribute('type','string');
						$secnode->setAttribute('default',$sec->textContent());
						$output->appendChild($secnode);
					}
				}
				$release->appendChild($output);
			}
		}
	#});
	
	return $wfe;
}

#	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
sub patchWorkflow($$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});

	my($retval)=0;
	my($retvalmsg)=undef;
	
	my($randfilexml) = $randdir . '/' . $IWWEM::WorkflowCommon::WORKFLOWFILE;

	# Resolving and saving dependencies
	my($depdir)=$randdir.'/'.$IWWEM::WorkflowCommon::DEPDIR;
	mkpath($depdir);
	my(@unpatchedWF)=($randfilexml);
	my(%WFhash)=($randfilexml=>[$WFmaindoc,$randfilexml,$doSaveDoc,undef]);

	my($peta)=undef;
	my($ua)=LWP::UserAgent->new();
	# Getting the base uri for subworkflows
	my($cgibaseuri)=IWWEM::WorkflowCommon::getCGIBaseURI($query);
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
								my(@depnames) = $query->param($IWWEM::WorkflowCommon::PARAMWORKFLOWDEP);
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
									my(@DEPH) = $query->upload($IWWEM::WorkflowCommon::PARAMWORKFLOWDEP);
									last  if($query->cgi_error());

									my($FAKEH)=$DEPH[$found];
									eval {
										my($line);
										while($line=<$FAKEH>) {
											$parser->parse_chunk($line);
										}
										# Rewind the handler
										seek($FAKEH,0,0);
										$newWFdoc=$parser->parse_chunk('',1);
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
								$ua->request(HTTP::Request->new(GET=>$uritext),
										sub {
											my($chunk, $res)=@_;

											$parser->parse_chunk($chunk);
										}
									);
								$newWFdoc=$parser->parse_chunk('',1);
							};
						}

						# Now it is time to give it a filename
						unless($@) {
							my($reldepname);
							my($newWFname);
							do {
								$reldepname = $IWWEM::WorkflowCommon::DEPDIR.'/'.IWWEM::WorkflowCommon::genUUID().'.xml';
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
							my($patchedURI) = $cgibaseuri . $IWWEM::Config::WORKFLOWRELDIR .'/'.$randname .'/'.$reldepname;

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
	} else {
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
				}
				# Last step, save all the changed content
				# Some workflows could have been patched,
				# so they should be re-saved
				$WFdoc->toFile($wfval->[1]);
			}
		}

		# Now it is time to validate the whole mess!
		# Saving the workflow data
		my($randfilesvg) = $randdir . '/' . $IWWEM::WorkflowCommon::SVGFILE;
		my($randfilepng) = $randdir . '/' . $IWWEM::WorkflowCommon::PNGFILE;
		my($randfilepdf) = $randdir . '/' . $IWWEM::WorkflowCommon::PDFFILE;
		my(@command)=($IWWEM::WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser',
			'-baseDir',$IWWEM::Config::MAVENDIR,
			'-workflow',$randfilexml,
			'-svggraph',$randfilesvg
		);
		if(defined($isCreation)) {
			push(@command,
				'-pnggraph',$randfilepng,
				'-pdfgraph',$randfilepdf,
				'-expandSubWorkflows'
			);
		}

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
	#	my($comm)=$IWWEM::WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser -baseDir '.$IWWEM::Config::MAVENDIR.' -workflow '.$randfilexml.' -svggraph '.$randfilesvg.' -expandSubWorkflows';

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
		} elsif(defined($isCreation)) {
			# Creating empty catalogs
			mkpath($randdir.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR);
			my($excatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
			my($exroot)=$excatalog->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'examples');
			$exroot->appendChild($excatalog->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTEL) ));
			$excatalog->setDocumentElement($exroot);
			$excatalog->toFile($randdir.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);

			mkpath($randdir.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR);
			my($snapcatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
			my($snaproot)=$excatalog->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'snapshots');
			$snaproot->appendChild($snapcatalog->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTES) ));
			$snapcatalog->setDocumentElement($snaproot);
			$snapcatalog->toFile($randdir.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);
			
			my($altViewerURI)=undef;
			if($query->param($IWWEM::WorkflowCommon::PARAMALTVIEWERURI)) {
				$altViewerURI = $query->param($IWWEM::WorkflowCommon::PARAMALTVIEWERURI);
			}
			
			if(defined($altViewerURI)) {
				my($VIE);
				if(open($VIE,'>',$randdir.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
					print $VIE $altViewerURI;
					close($VIE);
				}
			}
		}
	}
	
	return ($retval,$retvalmsg);
}

#		my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
sub parseInlineWorkflows($$$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});

	unless(defined($responsibleMail) && $responsibleMail =~ /[^\@]+\@[^\@]+\.[^\@]+/) {
		return (10,(defined($responsibleMail)?"$responsibleMail is not a valid e-mail address":'Responsible mail has not been set using '.$IWWEM::WorkflowCommon::RESPONSIBLEMAIL.' CGI parameter'),[]);
	}

	unless(defined($licenseURI) && length($licenseURI)>0) {
		$licenseName=$IWWEM::Config::DEFAULT_LICENSE_NAME;
		$licenseURI=$IWWEM::Config::DEFAULT_LICENSE_URI;
	} elsif(!defined($licenseName) || $licenseName eq '') {
		$licenseName='PRIVATE';
	}
	
	my($isCreation)=undef;
	unless(defined($basedir)) {
		$basedir=$IWWEM::Config::WORKFLOWDIR;
		$isCreation=1;
	} else {
		$doFreezeWorkflowDeps=1;
	}
	
	my($retval)=0;
	my($retvalmsg)=undef;
	my(@goodwf)=();
	
	# Now, time to recognize the content
	my($param)=$IWWEM::WorkflowCommon::PARAMWORKFLOW;
	my @UPHL=$query->upload($param);

	unless($query->cgi_error()) {

		my($isfh)=1;

		if(scalar(@UPHL)==0) {
			@UPHL=$query->param($param);
			$isfh=undef;
		}

		foreach my $UPH (@UPHL) {
			# Generating a pending operation
			my($penduuid,$penddir,$PH)=(undef,undef,undef);
			unless(defined($dontPending)) {
				($penduuid,$penddir,$PH)=IWWEM::WorkflowCommon::genPendingOperationsDir($IWWEM::WorkflowCommon::COMMANDADD);
			}
			
			# Generating a unique identifier
			my($randname);
			my($randfilexml);
			my($randdir);
			do {
				$randname=IWWEM::WorkflowCommon::genUUID();
				$randdir=$basedir.'/'.$randname;
			} while(-d $randdir);
			
			# Creating workflow directory so it is reserved
			mkpath($randdir);
			my($realranddir)=$randdir;
			
			# And now, creating the pending workflow directory!
			unless(defined($dontPending)) {
				$randdir=$penddir.'/'.$randname;
				mkpath($randdir);
				# And annotate it
				print $PH "$randname\n";
				close($PH);
			}
			
			# Responsible file creation
			IWWEM::WorkflowCommon::createResponsibleFile($randdir,$responsibleMail,$responsibleName);
			
			# Saving the workflow data
			$randfilexml = $randdir . '/' . $IWWEM::WorkflowCommon::WORKFLOWFILE;
			
			my($WFmaindoc);
			
			eval {
				# CGI provides fake filehandlers :-(
				# so we have to use the push parser
				if(defined($isfh)) {
					my($line);
					while($line=<$UPH>) {
						$parser->parse_chunk($line);
					}
					# Rewind the handler
					seek($UPH,0,0);
				} else {
					$parser->parse_chunk($UPH);
				}
				$WFmaindoc=$parser->parse_chunk('',1);
				$WFmaindoc->toFile($randfilexml);
			};
			
			if($@) {
				$retval=2;
				$retvalmsg = ''  unless(defined($retvalmsg));
				$retvalmsg .= 'Error while parsing input workflow: '.$@;
				rmtree($randdir);
				last;
			}
			
			my($doSaveDoc)=undef;
			my @desclist = $WFmaindoc->getElementsByTagNameNS($XSCUFL_NS,'workflowdescription');
			if(scalar(@desclist)>0) {
				my($desc)=$desclist[0];
				my($desctext)=$desc->textContent();

				# Catching the defined license
				unless(defined($desctext) && $desctext =~ /^$IWWEM::WorkflowCommon::LICENSESTART\n[ \t]*([^ \n]+)[ \t]+([^\n]+)[ \t]*\n$IWWEM::WorkflowCommon::LICENSESTOP$/ms) {
					# Stamping the license
					if(defined($desctext)) {
						chomp($desctext);
					} else {
						$desctext='';
					}
					$desctext .= "\n$IWWEM::WorkflowCommon::LICENSESTART\n$licenseURI $licenseName\n$IWWEM::WorkflowCommon::LICENSESTOP\n";
					while($desc->lastChild) {
						$desc->removeChild($desc->lastChild);
					}
					$desc->appendChild($WFmaindoc->createCDATASection($desctext));
					$doSaveDoc=1;
				}
			}
			
			
			($retval,$retvalmsg)=$self->patchWorkflow($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc);
			
			# Erasing all...
			if($retval!=0) {
				rmtree($randdir);
				unless(defined($dontPending)) {
					rmtree($realranddir);
				}
				last;
			} elsif(!defined($dontPending)) {
				IWWEM::WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,'workflow',$IWWEM::WorkflowCommon::COMMANDADD,$randname,$responsibleMail,undef);
			}
			
			push(@goodwf,$randname);
		}
	}
	
	return ($retval,$retvalmsg,\@goodwf);
}

#	my($wfile,$jobdir,$p_baclava,$inputFileMap,$saveInputsFile)=@_;
sub launchJob($$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($wfile,$jobdir,$p_baclava,$inputFileMap,$saveInputsFile)=@_;
}

1;