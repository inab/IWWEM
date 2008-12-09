#!/usr/bin/perl -W

# $Id$
# workflowmanager.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
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
# Original IWWE&M concept, design and coding done by JosÃ© MarÃ­a FernÃ¡ndez GonzÃ¡lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package workflowmanager;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use URI;
use XML::LibXML;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;
use LockNLog::SimpleMutex;

# Method prototypes
sub getWorkflowInfo($$$$$$);
sub sendWorkflowList($$$\@$$$$;$);
sub gatherWorkflowList(;$);

sub parseInlineWorkflows($$$$$$$;$$$);
sub patchWorkflow($$$$$$$;$$$);

# Method declarations
sub getWorkflowInfo($$$$$$) {
	my($parser,$context,$listDir,$wf,$uuidPrefix,$isSnapshot)=@_;
	
	my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
	
	my($retnode)=undef;
	eval {
		my($relwffile)=$wf.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
		my($wfdir)=undef;
		
		my($wffile)=undef;
		
		my($wfcat)=undef;
		my($examplescat) = undef;
		my($snapshotscat) = undef;
		my($wfresp)=undef;
		
		my($regen)=1;
		unless(index($wf,'http://')==0 || index($wf,'ftp://')==0) {
			$wfdir=$listDir.'/'.$wf;
			$wffile=$listDir.'/'.$relwffile;
			$wfcat=$wfdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
			$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
			$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
			$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
			
			my(@stat_selffile)=stat($FindBin::Bin .'/workflowmanager.pm');
			my(@stat_wfcat)=stat($wfcat);
			if(scalar(@stat_wfcat)>0 && $stat_wfcat[9]>$stat_selffile[9]) {
				my(@stat_wffile)=stat($wffile);

				if(scalar(@stat_wffile)==0 || $stat_wfcat[9]>$stat_wffile[9]) {
					my(@stat_examplescat)=stat($examplescat);

					if(scalar(@stat_examplescat)>0 && $stat_wfcat[9]>$stat_examplescat[9]) {
						my(@stat_snapshotscat)=stat($snapshotscat);

						if(scalar(@stat_snapshotscat)>0 && $stat_wfcat[9]>$stat_snapshotscat[9]) {
							my(@stat_wfresp)=stat($wfresp);

							if(scalar(@stat_wfresp)>0 || $stat_wfcat[9]>$stat_wfresp[9]) {
								# Catalog is outdated related to snapshots
								$regen=undef;
							}
						}
					}
				}
			}
		} else {
			$wffile=$wf;
		}
		
		#my($wfcatmutex)=LockNLog::SimpleMutex->new($wfdir.'/'.$IWWEM::WorkflowCommon::LOCKFILE,$regen);
		if(defined($regen)) {
			#$wfcatmutex->mutex(sub {
				my $doc = $parser->parse_file($wffile);
				
				# Getting description from workflow definition
				my @nodelist = $doc->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'workflowdescription');
				if(scalar(@nodelist)>0) {
					my $wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
					$outputDoc->setDocumentElement($wfe);
					
					my($desc)=$nodelist[0];
					
					$wfe->setAttribute('date',LockNLog::getPrintableDate((stat($wffile))[9]));
					
					$wfe->setAttribute('uuid',$uuidPrefix.$wf);
					
					# Now, the responsible person
					my($responsibleMail)='';
					my($responsibleName)='';
					eval {
						if(defined($isSnapshot)) {
							my $cat = $parser->parse_file($listDir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);
							my($transwf)=IWWEM::WorkflowCommon::patchXMLString($wf);
							my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transwf']",$cat);
							foreach my $snapNode (@snaps) {
								$responsibleMail=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
								$responsibleName=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
								last;
							}
						} elsif(defined($wfresp)) {
							my $res = $parser->parse_file($wfresp);
							$responsibleMail=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							$responsibleName=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
						}
					};
		
					$wfe->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
					$wfe->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
					$wfe->setAttribute('lsid',$desc->getAttribute('lsid'));
					$wfe->setAttribute('author',$desc->getAttribute('author'));
					$wfe->setAttribute('title',$desc->getAttribute('title'));
					$wfe->setAttribute('path',$relwffile);
					my $svg = $wf.'/'.$IWWEM::WorkflowCommon::SVGFILE;
					$wfe->setAttribute('svg',$svg);
					
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
					
					$wfe->setAttribute('licenseName',$licenseName);
					$wfe->setAttribute('licenseURI',$licenseURI);
					
					# Getting the workflow description
					my($wdesc)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$wdesc->appendChild($outputDoc->createCDATASection($desctext));
					$wfe->appendChild($wdesc);
					
					# Adding links to its graphical representations
					my($gfile,$gmime);
					if(defined($listDir)) {
						while(($gfile,$gmime)=each(%IWWEM::WorkflowCommon::GRAPHREP)) {
							my $rfile = $wf.'/'.$gfile;
							# Only include what has been generated!
							if( -f $listDir.'/'.$rfile) {
								my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
								$gchild->setAttribute('mime',$gmime);
								$gchild->appendChild($outputDoc->createTextNode($rfile));
								$wfe->appendChild($gchild);
							}
						}
					}
					
					# Now, including dependencies
					if(defined($listDir)) {
						my($DEPDIRH);
						my($depreldir)=$wf.'/'.$IWWEM::WorkflowCommon::DEPDIR;
						my($depdir)=$listDir.'/'.$depreldir;
						if(opendir($DEPDIRH,$depdir)) {
							my($entry);
							while($entry=readdir($DEPDIRH)) {
								next  if(index($entry,'.')==0);

								my($fentry)=$depdir.'/'.$entry;
								if(-f $fentry && $fentry =~ /\.xml$/) {
									my($depnode) = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'dependsOn');
									$depnode->setAttribute('sub',$depreldir.'/'.$entry);
									$wfe->appendChild($depnode);
								}
							}

							closedir($DEPDIRH);
						}
					}
					
					# Getting Inputs
					@nodelist = $context->findnodes('/s:scufl/s:source',$doc);
					foreach my $source (@nodelist) {
						my $input = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'input');
						$input->setAttribute('name',$source->getAttribute('name'));
						
						# Description
						my(@sourcedesc)=$source->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'description');
						if(scalar(@sourcedesc)>0) {
							my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
							$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
							$input->appendChild($descnode);
						}
						
						# MIME types handling
						my(@mimetypes)=$source->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'mimetype');
						# Taverna default mime type
						push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
						foreach my $mime (@mimetypes) {
							my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
							$mtype->setAttribute('type',$mime);
							$input->appendChild($mtype);
						}
						
						# At last, appending this input
						$wfe->appendChild($input);
					}
					
					# And Outputs
					@nodelist = $context->findnodes('/s:scufl/s:sink',$doc);
					foreach my $sink (@nodelist) {
						my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'output');
						$output->setAttribute('name',$sink->getAttribute('name'));
						
						# Description
						my(@sinkdesc)=$sink->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'description');
						if(scalar(@sinkdesc)>0) {
							my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
							$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
							$output->appendChild($descnode);
						}
						
						# MIME types handling
						my(@mimetypes)=$sink->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'mimetype');
						# Taverna default mime type
						push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
						foreach my $mime (@mimetypes) {
							my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
							$mtype->setAttribute('type',$mime);
							$output->appendChild($mtype);
						}
						
						# At last, appending this output
						$wfe->appendChild($output);
					}
					
					# Now importing the examples catalog
					eval {
						if(defined($examplescat)) {
							my($examples)=$parser->parse_file($examplescat);
							for my $child ($examples->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'example')) {
								$wfe->appendChild($outputDoc->importNode($child));
							}
						}
					};
					if($@) {
						$wfe->appendChild($outputDoc->createComment('Unable to parse examples catalog!'));
					}
					
					# And the snapshots one!
					eval {
						if(defined($snapshotscat)) {
							my($snapshots)=$parser->parse_file($snapshotscat);
							for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'snapshot')) {
								$wfe->appendChild($outputDoc->importNode($child));
							}
						}
					};
					if($@) {
						$wfe->appendChild($outputDoc->createComment('Unable to parse snapshots catalog!'));
					}
					
					$outputDoc->toFile($wfcat)  if(defined($wfcat));
					
					# At last, appending the new workflow entry
					$retnode=$wfe;
				}
			#});
		} else {
			#$wfcatmutex->mutex(sub {
				$retnode=$parser->parse_file($wfcat)->documentElement();
			#});
		}
	};
	
	if($@ || !defined($retnode)) {
		$retnode=$outputDoc->createComment("Unable to process $wf due ".$@);
	}
	
	return $retnode;
}

sub gatherWorkflowList(;$) {
	my($id)=@_;
	my(@dirstack)=('.');
	my(@workflowlist)=();
	
	$id=''  unless(defined($id));
	my($baseListDir)=undef;
	my($listDir)=undef;
	my($subId)=undef;
	my($uuidPrefix)=undef;
	my($isSnapshot)=undef;
	if(index($id,'http://')==0 || index($id,'ftp://')==0) {
		$subId=$id;
		@dirstack=();
	} elsif(index($id,$IWWEM::WorkflowCommon::ENACTIONPREFIX)==0) {
		$baseListDir=$IWWEM::WorkflowCommon::VIRTJOBDIR;
		$listDir=$IWWEM::Config::JOBDIR;
		$uuidPrefix=$IWWEM::WorkflowCommon::ENACTIONPREFIX;
		
		if($id =~ /^$IWWEM::WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
			$subId=$1;
		}
	} elsif($id =~ /^$IWWEM::WorkflowCommon::SNAPSHOTPREFIX([^:]+)/) {
		$baseListDir=$IWWEM::WorkflowCommon::VIRTWORKFLOWDIR . '/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$uuidPrefix=$IWWEM::WorkflowCommon::SNAPSHOTPREFIX . $1 . ':';
		
		$isSnapshot=1;
		
		if($id =~ /^$IWWEM::WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$subId=$2;
		}
	} else {
		$baseListDir=$IWWEM::WorkflowCommon::VIRTWORKFLOWDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR;
		$uuidPrefix=$IWWEM::WorkflowCommon::WORKFLOWPREFIX;
		
		if($id =~ /^$IWWEM::WorkflowCommon::WORKFLOWPREFIX([^:]+)$/) {
			$subId=$1;
		} elsif(length($id)>0) {
			$subId=$id;
		}
	}
	
	# Looking for workflows
	foreach my $dir (@dirstack) {
		my($WFDIR);
		my($fdir)=$listDir.'/'.$dir;
		if(opendir($WFDIR,$fdir)) {
			my($entry);
			my(@posdirstack)=();
			my($foundworkflowdir)=undef;
			while($entry=readdir($WFDIR)) {
				next if(index($entry,'.')==0);
				
				my($fentry)=$fdir.'/'.$entry;
				my($rentry)=($dir ne '.')?($dir.'/'.$entry):$entry;
				if($entry eq $IWWEM::WorkflowCommon::WORKFLOWFILE) {
					$foundworkflowdir=1;
				} elsif(-d $fentry && (!defined($subId) || ($subId eq $entry))) {
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
	
	return (\@workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot);
}

sub sendWorkflowList($$$\@$$$$;$) {
	my($query,$retval,$retvalmsg,$p_workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot,$dataislandTag)=@_;
		
	my $parser = XML::LibXML->new();
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('s',$IWWEM::WorkflowCommon::XSCUFL_NS);
	$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
	
	my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflowlist');
	$outputDoc->setDocumentElement($root);
	
	$root->appendChild($outputDoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTWM) ));
	
	my($domain)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'domain');
	$domain->setAttribute('class','IWWEM');
	$domain->setAttribute('time',LockNLog::getPrintableNow());
	$domain->setAttribute('relURI',$baseListDir);
	$root->appendChild($domain);
	
	# Attached Error Message (if any)
	if($retval!=0) {
		my($message)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'message');
		$message->setAttribute('retval',$retval);
		if(defined($retvalmsg)) {
			$message->appendChild($outputDoc->createCDATASection($retvalmsg));
		}
		$domain->appendChild($message);
	}
	
	foreach my $wf (@{$p_workflowlist}) {
		$domain->appendChild($outputDoc->importNode(getWorkflowInfo($parser,$context,$listDir,$wf,$uuidPrefix,$isSnapshot)));
	}
	
	print $query->header(-type=>(defined($dataislandTag)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');
	
	if(defined($dataislandTag)) {
		print "<html><body><$dataislandTag id='".$IWWEM::WorkflowCommon::PARAMISLAND."'>\n";
	}
	
	unless(defined($dataislandTag) && $dataislandTag eq 'div') {
		$outputDoc->toFH(\*STDOUT);
	} else {
		print $outputDoc->createTextNode($root->toString())->toString();
	}
	
	if(defined($dataislandTag)) {
		print "\n</$dataislandTag></body></html>";
	}
	
}

sub parseInlineWorkflows($$$$$$$;$$$) {
	my($query,$parser,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
	
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
	
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('s',$IWWEM::WorkflowCommon::XSCUFL_NS);

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
			my @desclist = $WFmaindoc->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'workflowdescription');
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
			
			
			($retval,$retvalmsg)=patchWorkflow($query,$parser,$context,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc);
			
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

sub patchWorkflow($$$$$$$;$$$) {
	my($query,$parser,$context,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
	
	my($retval)=0;
	my($retvalmsg)=undef;
	
	unless(defined($context)) {
		$context = XML::LibXML::XPathContext->new();
		$context->registerNs('s',$IWWEM::WorkflowCommon::XSCUFL_NS);
	}

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
		}
	}
	
	return ($retval,$retvalmsg);
}

1;
