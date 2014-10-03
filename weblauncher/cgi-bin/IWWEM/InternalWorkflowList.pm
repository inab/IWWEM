#!/usr/bin/perl -W

# $Id$
# IWWEM/InternalWorkflowList.pm
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

package IWWEM::InternalWorkflowList;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowList);

use Date::Parse;
use Encode;
use FindBin;
use XML::LibXML;
use File::Path;
use Socket;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::FSConstants;
use IWWEM::InternalWorkflowList::Confirmation;
use IWWEM::InternalWorkflowList::Constants;
use IWWEM::WorkflowCommon;
use IWWEM::UniversalWorkflowKind;

use IWWEM::Config;

use lib "$FindBin::Bin/LockNLog";
use lib "$FindBin::Bin/../LockNLog";
use LockNLog;


##############
# Prototypes #
##############
sub new(;$$);
sub genCheckList(\@);
sub sendEnactionReport($\@;$$$$$$);

###############
# Constructor #
###############

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	$id=$self->{id}  if(exists($self->{id}));
	my(@dirstack)=('.');
	my(@workflowlist)=();
	
	# If second parameter is not defined, then gather the list!
	if(scalar(@_)<2 || !defined($_[1])) {
		
		$id=''  unless(defined($id));
		my($baseListDir)=undef;
		my($listDir)=undef;
		my($subId)=undef;
		my($uuidPrefix)=undef;
		my($isSnapshot)=undef;
		if(index($id,'http://')==0 || index($id,'ftp://')==0) {
			$subId=$id;
			@dirstack=();
		} elsif(index($id,$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX)==0) {
			$baseListDir=$IWWEM::FSConstants::VIRTJOBDIR;
			$listDir=$IWWEM::Config::JOBDIR;
			$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX;
			
			if($id =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
				$subId=$1;
			}
		} elsif($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+)/) {
			$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR . '/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
			$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
			$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX . $1 . ':';
			
			$isSnapshot=1;
			
			if($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				$subId=$2;
			}
		} else {
			$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR;
			$listDir=$IWWEM::Config::WORKFLOWDIR;
			$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX;
			
			if($id =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
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
		
		$self->{WORKFLOWLIST}=\@workflowlist;
		$self->{baseListDir}=$baseListDir;
		$self->{GATHERED}=[$listDir,$uuidPrefix,$isSnapshot];
			
	}
	
	return bless($self,$class);
}

# Static methods
sub UnderstandsId($) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	my($id)=shift;
	
	return !defined($id) || index($id,$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX)==0 || index($id,$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX)==0 || index($id,$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX)==0 || (index($id,'/')==-1 && index($id,':')==-1 );
}

sub Prefix() {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return $IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX;
}

sub getDomainClass() {
	return 'IWWEM';
}

# Dynamic methods
sub virt2real($@) {
	my($self)=shift;
	croak("This is an instance method!")  unless(ref($self));
	
	my($global)=shift;
	my(@idhist)=@_;
	return join('/',$global,@idhist);
}

sub getWorkflowURI($) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($id)=@_;
	
	my($baseListDir,$listDir,$uuidPrefix,$subId,$isSnapshot);
	if(index($id,$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX)==0) {
		$baseListDir=$IWWEM::FSConstants::VIRTJOBDIR;
		$listDir=$IWWEM::Config::JOBDIR;
		$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX;
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
			$subId=$1;
		}
	} elsif($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+)/) {
		$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR . '/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX . $1 . ':';
		
		$isSnapshot=1;
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$subId=$2;
		}
	} else {
		$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR;
		$uuidPrefix='';
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
			$subId=$1;
		} elsif(length($id)>0) {
			$subId=$id;
		}
	}
	my($relwffile)=$subId.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
	my($wffile)=$listDir.'/'.$relwffile;
	
	return $wffile;
}

sub resolveWorkflowId($) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($id)=@_;
	my($workflowId)=undef;
	my($originalInput)=undef;
	my($retval)=0;
	
	my($wabspath)=undef;
	if($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
		$workflowId=$1;
		my($wabsbasepath)=$IWWEM::Config::WORKFLOWDIR . '/' . $workflowId . '/' . $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $2 . '/';
		$wabspath=$wabsbasepath . $IWWEM::WorkflowCommon::WORKFLOWFILE;
		
		$originalInput=$wabsbasepath . $IWWEM::WorkflowCommon::INPUTSFILE;
	} elsif($id =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
		my($ENHAND);
		my($wabsbasepath)=$IWWEM::Config::JOBDIR . '/' . $1 . '/';
		if(open($ENHAND,'<',$wabsbasepath . $IWWEM::WorkflowCommon::WFIDFILE)) {
			$workflowId=<$ENHAND>;
			close($ENHAND);
		} else {
			$retval=2;
			last;
		}
		$wabspath=$wabsbasepath . $IWWEM::WorkflowCommon::WORKFLOWFILE;
		
		$originalInput=$wabsbasepath . $IWWEM::WorkflowCommon::INPUTSFILE;
	} else {
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
			$workflowId=$1;
		} else {
			$workflowId=$id;
		}
		$wabspath=$IWWEM::Config::WORKFLOWDIR . '/' . $workflowId . '/' . $IWWEM::WorkflowCommon::WORKFLOWFILE;
	}
	
	# Is it a 'sure' path?
	if(index($id,'/')!=-1 || ! -f $wabspath) {
		$retval = 2;
	}
	
	return ($workflowId,$originalInput,$retval);
}

#	my($wf,$listDir,$uuidPrefix,$isSnapshot)=@_;
sub getWorkflowInfo($@) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($wf,$listDir,$uuidPrefix,$isSnapshot)=@_;
	
	my($retnode)=undef;
	eval {
		my($relwffile)=undef;
		my($wfdir)=undef;
		
		my($wffile)=undef;
		
		my($wfcat)=undef;
		my($examplescat) = undef;
		my($snapshotscat) = undef;
		my($wfresp)=undef;
		
		my($regen)=1;
		$relwffile=$wf.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
		$wfdir=$listDir.'/'.$wf;
		$wffile=$listDir.'/'.$relwffile;
		$wfcat=$wfdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
		$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
		
		# my(@stat_selffile)=stat($FindBin::Bin .'/IWWEM/InternalWorkflowList.pm');
		my(@stat_selffile)=stat(__FILE__);
		my(@stat_selffile2)=();
		@stat_selffile2=stat($FindBin::Bin .'/IWWEM/Taverna1WorkflowKind.pm');
		@stat_selffile=@stat_selffile2  if($stat_selffile2[9]>$stat_selffile[9]);
		@stat_selffile2=stat($FindBin::Bin .'/IWWEM/Taverna2WorkflowKind.pm');
		@stat_selffile=@stat_selffile2  if($stat_selffile2[9]>$stat_selffile[9]);
		
		my(@stat_wfcat)=stat($wfcat);
		if(scalar(@stat_wfcat)>0 && $stat_wfcat[9]>$stat_selffile[9]) {
			my(@stat_wffile)=stat($wffile);

			if(scalar(@stat_wffile)==0 || $stat_wfcat[9]>$stat_wffile[9]) {
				my(@stat_examplescat)=stat($examplescat);

				if(scalar(@stat_examplescat)>0 && $stat_wfcat[9]>$stat_examplescat[9]) {
					my(@stat_snapshotscat)=stat($snapshotscat);

					if(scalar(@stat_snapshotscat)>0 && $stat_wfcat[9]>$stat_snapshotscat[9]) {
						my(@stat_wfresp)=stat($wfresp);
						
						if(scalar(@stat_wfresp)>0 && $stat_wfcat[9]>$stat_wfresp[9]) {
							# Catalog is outdated related to snapshots
							$regen=undef;
						}
					}
				}
			}
		}
		
		# With this variable it is possible to switch among different 
		# representations
		my($wfKind)='UNIVERSAL';
		#my($wfcatmutex)=LockNLog::SimpleMutex->new($wfdir.'/'.$IWWEM::WorkflowCommon::LOCKFILE,$regen);
		if(defined($regen)) {
			my($uuid)=$uuidPrefix.$wf;
			
			$retnode = $self->{WFH}{$wfKind}->getWorkflowInfo($uuid,$wffile,$relwffile);
			
			if(defined($retnode) && defined($wfcat)) {
				my($outputDoc)=$retnode->ownerDocument();
				my($release)=$retnode->firstChild();
				while(defined($release) && ($release->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $release->localname() ne 'release')) {
					$release=$release->nextSibling();
				}
				
				# Now, the responsible(s) person/people
				my($responsibleMail)='';
				my($responsibleName)='';
				my(@resarr)=();
				eval {
					my($res)=undef;
					if(defined($isSnapshot)) {
						my $cat = $parser->parse_file($listDir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);
						my($transwf)=IWWEM::WorkflowCommon::patchXMLString($wf);
						my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transwf']",$cat);
						$res=$snaps[0]  if(scalar(@snaps)>0);
					} elsif(defined($wfresp)) {
						$res = $parser->parse_file($wfresp)->documentElement();
					}
					if(defined($res)) {
						my($respnode)=$res->firstChild();
						my($first)=1;
						while(defined($respnode)) {
							if($respnode->nodeType()==XML::LibXML::XML_ELEMENT_NODE && $respnode->localname() eq 'responsible') {
								push(@resarr,$respnode);
								if(defined($first)) {
									$responsibleMail=$respnode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
									$responsibleName=$respnode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
									$first=undef;
								}
							}
							$respnode=$respnode->nextSibling();
						}
						
						unless(scalar(@resarr)>0) {
							$responsibleMail=$res->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							$responsibleName=$res->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
						}
					}
				};
				
				if(scalar(@resarr)>0) {
					# New Storage format
					my($refnode)=$release->firstChild();
					foreach my $res (@resarr) {
						$release->insertBefore($outputDoc->importNode($res),$refnode);
					}
				} else {
					# Old Storage format
					my($res)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'responsible');
					$res->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
					$res->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
					$release->insertBefore($res,$release->firstChild());
				}
				# To keep some backward compatibility
				$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
				$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
				
				# The date
				$release->setAttribute('date',LockNLog::getPrintableDate((stat($wffile))[9]));
				
				# Adding links to its graphical representations
				my($refnode)=$release->firstChild();
				while(defined($refnode) && ($refnode->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $refnode->localname() ne 'description')) {
					$refnode=$refnode->nextSibling();
				}
				
				my($gfile,$gmime);
				while(($gfile,$gmime)=each(%IWWEM::WorkflowCommon::GRAPHREP)) {
					my $rfile = $wf.'/'.$gfile;
					# Only include what has been generated!
					if( -f $listDir.'/'.$rfile) {
						my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
						$gchild->setAttribute('mime',$gmime);
						$gchild->appendChild($outputDoc->createTextNode($rfile));
						$release->insertAfter($gchild,$refnode);
						$refnode=$gchild;
					}
				}
	
				# Now, including dependencies
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
							$release->insertAfter($depnode,$refnode);
							$refnode=$depnode;
						}
					}

					closedir($DEPDIRH);
				}
				
				# Now importing the examples catalog
				eval {
					if(defined($examplescat)) {
						my($examples)=$parser->parse_file($examplescat);
						for my $child ($examples->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'example')) {
							# This sentence is for security
							$child->removeAttribute($IWWEM::WorkflowCommon::AUTOUUID);
							$release->appendChild($outputDoc->importNode($child));
						}
					}
				};
				if($@) {
					$release->appendChild($outputDoc->createComment('Unable to parse examples catalog!'));
				}
				
				# And the snapshots one!
				eval {
					if(defined($snapshotscat)) {
						my($snapshots)=$parser->parse_file($snapshotscat);
						for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'snapshot')) {
							$release->appendChild($outputDoc->importNode($child));
						}
					}
				};
				if($@) {
					$release->appendChild($outputDoc->createComment('Unable to parse snapshots catalog!'));
				}
			
				$outputDoc->toFile($wfcat);
			}
			
		} else {
			#$wfcatmutex->mutex(sub {
				$retnode=$parser->parse_file($wfcat)->documentElement();
			#});
		}
	};
	
	if($@ || !defined($retnode)) {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		$retnode=$outputDoc->createComment("Unable to process $wf due ".$@);
	}
	
	return $retnode;
	
}

#		my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$param,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$autoUUID)=@_;
sub parseInlineWorkflows($$$$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$param,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$autoUUID)=@_;
	
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
	my @UPHL=();
	@UPHL=$query->upload($param)  if($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOW);

	unless($query->cgi_error()) {

		my($isfh)=1;

		if(scalar(@UPHL)==0) {
			@UPHL=$query->param($param);
			$isfh=undef;
		}

		foreach my $UPH (@UPHL) {
			# Generating a pending operation
			my($penduuid,$penddir,$PH)=(undef,undef,undef);
			unless(defined($autoUUID) && ($autoUUID eq '' || $autoUUID eq '1')) {
				($penduuid,$penddir,$PH)=IWWEM::InternalWorkflowList::Confirmation::genPendingOperationsDir($IWWEM::InternalWorkflowList::Confirmation::COMMANDADD);
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
			unless(defined($autoUUID) && ($autoUUID eq '' || $autoUUID eq '1')) {
				$randdir=$penddir.'/'.$randname;
				mkpath($randdir);
				# And annotate it
				print $PH "$randname\n";
				close($PH);
			}
			
			# Responsible file creation
			my($err,$wfAutoUUID)=IWWEM::WorkflowCommon::createResponsibleFile($randdir,$responsibleMail,$responsibleName);
			
			# Saving the workflow data
			$randfilexml = $randdir . '/' . $IWWEM::WorkflowCommon::WORKFLOWFILE;
			
			my($WFmaindoc);
			
			eval {
				if($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOW) {
					# CGI provides fake filehandlers :-(
					# so we have to use the push parser
					my($RXML);
					if(open($RXML,'>',$randfilexml)) {
						if(defined($isfh)) {
							my($line);
							while(read($UPH,$line,65536)) {
								print $RXML $line;
							}
							# Rewind the handler
							seek($UPH,0,0);
						} else {
							print $RXML $UPH;
						}
						close($RXML);
						$WFmaindoc=$parser->parse_file($randfilexml);
					}
				} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWREF || $param eq $IWWEM::WorkflowCommon::PARAMWFID) {
					my($swl)=IWWEM::SelectiveWorkflowList->new($UPH,1);
					my($wfuri)=$swl->getWorkflowURI($UPH);
					$WFmaindoc=$parser->parse_file($wfuri);
					$WFmaindoc->toFile($randfilexml);
				}
			};
			
			if($@ || !defined($WFmaindoc)) {
				$retval=2;
				$retvalmsg = ''  unless(defined($retvalmsg));
				$retvalmsg .= 'Error while parsing input workflow: '.$@;
				rmtree($randdir);
				last;
			}
			
			my($doSaveDoc)=$self->{WFH}{UNIVERSAL}->patchEmbeddedLicence($WFmaindoc,$licenseURI,$licenseName);
			
			($retval,$retvalmsg)=$self->patchWorkflow($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc);
			
			# Erasing all...
			if($retval!=0) {
				rmtree($randdir);
				unless(defined($autoUUID) && ($autoUUID eq '' || $autoUUID eq '1')) {
					rmtree($realranddir);
				}
				last;
			} elsif(!defined($autoUUID) || ($autoUUID ne '' && $autoUUID ne '1')) {
				IWWEM::InternalWorkflowList::Confirmation::sendResponsiblePendingMail($query,undef,$penduuid,'workflow',$IWWEM::InternalWorkflowList::Confirmation::COMMANDADD,$randname,$responsibleMail,undef,$autoUUID);
			}
			
			push(@goodwf,$randname);
		}
	}
	
	return ($retval,$retvalmsg,\@goodwf);
}

sub launchJob() {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($wfile,$jobdir,$p_baclava,$inputFileMap,$saveInputsFile)=@_;
}

# Static package method
sub genCheckList(\@) {
	my($p_IAR)=@_;
	my($retval)=undef;
	foreach my $token (@{$p_IAR}) {
		if(defined($retval)) {
			$retval .= ', '.$token->[0];
		} else {
			$retval=$token->[0];
		}
	}
	return $retval;
}

#	my($query,$p_iwwemId,$autoUUID)=@_;
sub eraseId($\@;$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($query,$p_iwwemId,$autoUUID)=@_;
	
	foreach my $irelpath (@{$p_iwwemId}) {
		# We are only erasing what it is valid...
		next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
		
		# Checking rules should be inserted here...
		my($kind)=undef;
		my($resMail)=undef;
		my($prettyname)=undef;
		if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			my($wfsnap)=$1;
			my($snapId)=$2;
			$kind='snapshot';
			eval {
				my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
				my($catdoc)=$parser->parse_file($catfile);

				my($transsnapId)=IWWEM::WorkflowCommon::patchXMLString($snapId);
				my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
				foreach my $snap (@eraseSnap) {
					$prettyname=$snap->getAttribute('name');
					$resMail=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					last;
				}
			};
		} elsif($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
			my($wfexam)=$1;
			my($examId)=$2;
			$kind='example';
			eval {
				my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
				my($catdoc)=$parser->parse_file($catfile);

				my($transexamId)=IWWEM::WorkflowCommon::patchXMLString($examId);
				my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
				foreach my $exam (@eraseExam) {
					$prettyname=$exam->getAttribute('name');
					$resMail=$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					last;
				}
			};
		} else {
			my($jobdir)=undef;
			
			if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
				$jobdir=$IWWEM::Config::JOBDIR.'/'.$1;
				$kind='enaction';
			} else {
				my($relwfid)=undef;
				if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
					$relwfid=$1;
				} else {
					$relwfid=$irelpath;
				}
				$jobdir=$IWWEM::Config::WORKFLOWDIR.'/'.$relwfid;
				$kind='workflow';
			}
			
			eval {
				my($responsiblefile)=$jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
				my($rp)=$parser->parse_file($responsiblefile);
				$resMail=$rp->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
				
				my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
				my($uwk)=IWWEM::UniversalWorkflowKind->new();
				my($wi)=$uwk->getWorkflowInfo($irelpath,$workflowfile,$workflowfile);
				$prettyname=$wi->getAttribute('title');
			};
		}
		
		if(defined($resMail)) {
			my($penduuid,$penddir,$PH)=IWWEM::InternalWorkflowList::Confirmation::genPendingOperationsDir($IWWEM::InternalWorkflowList::Confirmation::COMMANDERASE);

			print $PH "$irelpath\n";
			close($PH);
			
			IWWEM::InternalWorkflowList::Confirmation::sendResponsiblePendingMail($query,undef,$penduuid,$kind,$IWWEM::InternalWorkflowList::Confirmation::COMMANDERASE,$irelpath,$resMail,$prettyname,$autoUUID);
		}
	}
}

#	my($query,$p_jobIdList,$snapshotName,$snapshotDesc,$responsibleMail,$responsibleName,$dispose,$autoUUID)=@_;
sub sendEnactionReport($\@;$$$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});

	my($query,$p_jobIdList,$snapshotName,$snapshotDesc,$responsibleMail,$responsibleName,$dispose,$autoUUID)=@_;
	
	my($outputDoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'enactionreport');
	$outputDoc->setDocumentElement($root);
	
	$root->appendChild($outputDoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTES) ));
	
	# Disposal execution
	foreach my $jobId (@{$p_jobIdList}) {
		my($es)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'enactionstatus');
		$es->setAttribute('jobId',$jobId);
		$es->setAttribute('time',LockNLog::getPrintableNow());
		$es->setAttribute('relURI',$IWWEM::FSConstants::VIRTJOBDIR);
	
		# Time to know the overall status of this enaction
		my($state)=undef;
		my($jobdir)=undef;
		my($wfsnap)=undef;
		my($origJobId)=undef;
		
		if(index($jobId,$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX)==0) {
			$origJobId=$jobId;
			if(index($jobId,'/')==-1 && $jobId =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				$wfsnap=$1;
				$jobId=$2;
				$jobdir=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$jobId;
				# It is an snapshot, so the relative URI changes
				$es->setAttribute('relURI',$IWWEM::FSConstants::VIRTWORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR);
			}
		} else {
			# For completion, we handle qualified job Ids
			$jobId =~ s/^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX//;
			$jobdir=$IWWEM::Config::JOBDIR . '/' .$jobId;
			$origJobId=$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX.$jobId;
		}
	
		# Is it a valid job id?
		my($termstat)=undef;
		my($doGen)=1;
		if(index($jobId,'/')==-1 && defined($jobdir) && -d $jobdir && -r $jobdir) {
			# Disposal execution
			if(defined($dispose) && $dispose eq '1') {
	
				my($pidfile)=$jobdir . '/PID';
				my($PID);
				if(!defined($wfsnap) && ! -f ($jobdir . '/FATAL') && -f $pidfile && open($PID,'<',$pidfile)) {
					my($killpid)=<$PID>;
					close($PID);
	
					# Now we have a pid, we can check for the enaction job
					if(! -f ($jobdir . '/FINISH') && ! -f ($jobdir . '/FAILED.txt') && kill(0,$killpid)) {
						if(kill(TERM => -$killpid)) {
							sleep(1);
							# You must die!!!!!!!!!!
							kill(KILL => -$killpid)  if(kill(0,$killpid));
						}
					}
				}
				$state = 'disposed';
				
	
				my($kind)=undef;
				my($resMail)=undef;
				my($prettyname)=undef;
				if(defined($wfsnap)) {
					$kind='snapshot';
					eval {
						my($catfile)=$jobdir.'/../'.$IWWEM::WorkflowCommon::CATALOGFILE;
						my($catdoc)=$parser->parse_file($catfile);
						
						my($transjobId)=IWWEM::WorkflowCommon::patchXMLString($jobId);
						my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transjobId']",$catdoc);
						foreach my $snap (@eraseSnap) {
							$prettyname=$snap->getAttribute('name');
							$resMail=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							last;
						}
					};
				} else {
					$kind='enaction';
					
					eval {
						my($responsiblefile)=$jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
						my($rp)=$parser->parse_file($responsiblefile)->documentElement();
						if($rp->localname() eq 'responsibles') {
							$rp=$rp->firstChild();
							while(defined($rp) && ($rp->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $rp->localname() ne 'responsible')) {
								$rp=$rp->nextSibling();
							}
						}
						
						$resMail=defined($rp)?$rp->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL):'';
						
						my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
						my($uwk)=IWWEM::UniversalWorkflowKind->new();
						my($wi)=$uwk->getWorkflowInfo($origJobId,$workflowfile,$workflowfile);
						$prettyname=$wi->getAttribute('title');
					};
				}
				
				# Sending e-mail to confirm the pass
				if(defined($resMail)) {
					my($penduuid,$penddir,$PH)=IWWEM::InternalWorkflowList::Confirmation::genPendingOperationsDir($IWWEM::InternalWorkflowList::Confirmation::COMMANDERASE);
	
					print $PH "$origJobId\n";
					close($PH);
					
					IWWEM::InternalWorkflowList::Confirmation::sendResponsiblePendingMail($query,undef,$penduuid,$kind,$IWWEM::InternalWorkflowList::Confirmation::COMMANDERASE,$origJobId,$resMail,$prettyname,$autoUUID);
				}
			} else {
				# Getting static info
				my($staticfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::STATICSTATUSFILE;
				my(@stat_staticfile)=stat($staticfile);
				# my(@stat_selffile)=stat($FindBin::Bin .'/IWWEM/InternalWorkflowList.pm');
				my(@stat_selffile)=stat(__FILE__);
				if(scalar(@stat_staticfile)>0 && $stat_staticfile[9]>$stat_selffile[9]) {
					eval {
						my($staticdoc)=$parser->parse_file($staticfile);
						$es=$outputDoc->importNode($staticdoc->documentElement());
						$doGen=undef;
					};
				}
				
				if(defined($doGen)) {
					my($ppidfile)=$jobdir . '/PPID';
					my($includeSubs)=1;
					my($PPID);
					my($enactionReport)=undef;
					if(defined($wfsnap)) {
						$state = 'frozen';
						$termstat=1;
						$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
					} elsif(-f $jobdir . '/FATAL' || ! -f $ppidfile) {
						$state='dead';
						$termstat=1;
						$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
					} elsif(!defined($wfsnap) && open($PPID,'<',$ppidfile)) {
						my($ppid)=<$PPID>;
						close($PPID);
	
						my($pidfile)=$jobdir . '/PID';
						my($PID);
						unless(-f $pidfile) {
							# So it could be queued
							$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
							$state = 'queued';
							$includeSubs=undef;
						} elsif(open($PID,'<',$pidfile)) {
							my($pid)=<$PID>;
							close($PID);
	
							# Now we have a pid, we can check for the enaction job
							if( -f $jobdir . '/FINISH') {
								$state = 'finished';
								$termstat=1;
								$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
							} elsif( -f $jobdir . '/FAILED.txt') {
								$state = 'error';
								$termstat=1;
								$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
							} elsif(kill(0,$pid) > 0) {
								# It could be still running...
								unless(defined($dispose)) {
									if( -f $jobdir . '/START') {
										# So, let's fetch the state
										$enactionReport=_getFreshEnactionReport($outputDoc,$jobdir . '/socket');
	
										$state = 'running';
									} else {
										# So it could be queued
										#$state = 'unknown';
										$state = 'queued';
										$includeSubs=undef;
									}
								} else {
									$state = 'killed';
									$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
									$enactionReport=_getFreshEnactionReport($outputDoc,$jobdir . '/socket')  unless(defined($enactionReport));
									if(defined($enactionReport) && $enactionReport->localname eq 'enactionReport') {
										my($erDoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
										$erDoc->setDocumentElement($erDoc->importNode($enactionReport->firstChild()));
										$erDoc->toFile($jobdir.'/'.$IWWEM::WorkflowCommon::REPORTFILE);
									}
									$termstat=1;
									if(kill(TERM => -$pid)) {
										sleep(1);
										# You must die!!!!!!!!!!
										kill(KILL => -$pid)  if(kill(0,$pid));
									}
								}
							} else {
								$state = 'dead';
								$termstat=1;
								$enactionReport=_getStoredEnactionReport($outputDoc,$jobdir);
							}
						} else {
							$state = 'fatal';
							$includeSubs=undef;
						}
	
						if($state ne 'fatal' && defined($enactionReport) && $enactionReport->localname() eq 'enactionReportError') {
							$state='fatal';
						}
					} else {
						$state = 'fatal';
						$includeSubs=undef;
					}
					
					if(defined($enactionReport)) {
						$es->appendChild($enactionReport);
					}
					
					# Now including subinformation...
					if(defined($includeSubs)) {
						my($estamp)=undef;
						my($failedSth)=_processStep($jobdir,$outputDoc,$es,(defined($enactionReport) && $enactionReport->localname eq 'enactionReport')?$enactionReport:undef,\$estamp);
						$state='dubious'  if($state eq 'finished' && defined($failedSth));
						
						$es->setAttribute('time',LockNLog::getPrintableDate($estamp))  if(defined($estamp));
					}
				}
				# Status report
				
				# Disallowed snapshots over snapshots!
				if(defined($snapshotName) && defined($responsibleMail) && !defined($wfsnap)) {
					my($workflowId)=undef;
					# Trying to get the workflowId
					my($WFID);
					if(open($WFID,'<',$jobdir.'/'.$IWWEM::WorkflowCommon::WFIDFILE)) {
						$workflowId=<$WFID>;
						close($WFID);
					}
					
					# So, let's take a snapshot!
					if(defined($workflowId) && index($workflowId,'/')==-1) {
						# First, read the catalog
						my($snapbasedir)=$IWWEM::Config::WORKFLOWDIR .'/'.$workflowId.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
						eval {
							my($uuid);
							my($snapdir);
							do {
								$uuid=IWWEM::WorkflowCommon::genUUID();
								$snapdir=$snapbasedir.'/'.$uuid;
							} while(-d $snapdir);
							mkpath($snapdir);
	
							# Generating a pending operation
							my($penduuid,$penddir,$PH)=IWWEM::InternalWorkflowList::Confirmation::genPendingOperationsDir($IWWEM::InternalWorkflowList::Confirmation::COMMANDADD);
							my($fullsnapuuid)=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX."$workflowId:$uuid";
							print $PH "$fullsnapuuid\n";
							close($PH);
							
							# Now, the new files
							my($pendsnapdir)=$penddir.'/'.$uuid;
							my($pendcatalogfile)=$penddir.'/'.$uuid.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;
							
							# Partial catalog
							my($catdoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
	
							# Last but one, register snapshot
							my($snapnode)=$catdoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'snapshot');
							# First in unqualified form
							$snapnode->setAttribute('name',$snapshotName);
							$snapnode->setAttribute('uuid',$uuid);
							$snapnode->setAttribute('date',LockNLog::getPrintableNow());
							$snapnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
							$snapnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
							
							# New style
							my($respnode)=$catdoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'responsible');
							$respnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
							$respnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
							$snapnode->appendChild($respnode);
							
							my($snapAutoUUID)=IWWEM::WorkflowCommon::genUUID();
							$snapnode->setAttribute($IWWEM::WorkflowCommon::AUTOUUID,$snapAutoUUID);
							if(defined($snapshotDesc) && length($snapshotDesc)>0) {
								# New style
								my($docnode)=$catdoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'documentation');
								$docnode->appendChild($catdoc->createCDATASection($snapshotDesc));
								$snapnode->appendChild($docnode);
							}
							
							$catdoc->setDocumentElement($snapnode);
							$catdoc->toFile($pendcatalogfile);
							
							if(system("cp","-dpr",$jobdir,$pendsnapdir)==0) {
								# Taking last snapshot info!
								my($erDoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
								my($enactionReport)=_getStoredEnactionReport($erDoc,$jobdir);
								$enactionReport=_getFreshEnactionReport($erDoc,$jobdir . '/socket')  unless(defined($enactionReport));
								if(defined($enactionReport) && $enactionReport->localname eq 'enactionReport') {
									$erDoc->setDocumentElement($enactionReport->firstChild);
									$erDoc->toFile($pendsnapdir.'/'.$IWWEM::WorkflowCommon::REPORTFILE);
								}
								# Static info is erased, so it is regenerated
								unlink($pendsnapdir.'/'.$IWWEM::WorkflowCommon::STATICSTATUSFILE);
	
								
								IWWEM::InternalWorkflowList::Confirmation::sendResponsiblePendingMail($query,undef,$penduuid,'snapshot',$IWWEM::InternalWorkflowList::Confirmation::COMMANDADD,$fullsnapuuid,$responsibleMail,$snapshotName,$autoUUID);
								# And let's add it to the report
								# in qualified form
								$snapnode->setAttribute('uuid',$fullsnapuuid);
								$es->insertBefore($outputDoc->importNode($snapnode),$es->firstChild());
							} else {
								rmtree($snapdir);
								rmtree($penddir);
							}
						};
	
						# TODO: report, checks...
						#unless($@) {
						#}
					}
				}
				
			}
		}
		
		# Do we have to generate information?
		if(defined($doGen)) {
			$state='unknown'  unless(defined($state));
	
			$es->setAttribute('state',$state);
	
			# The title
			eval {
				my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
				my($uwk)=IWWEM::UniversalWorkflowKind->new();
				my($wi)=$uwk->getWorkflowInfo($origJobId,$workflowfile,$workflowfile);
				my($prettyname)=$wi->getAttribute('title');
				if(defined($prettyname) && length($prettyname)>0) {
					$es->setAttribute('title',$prettyname);
				}
			};
	
			# Now, the responsible person
			my($responsibleMail)='';
			my($responsibleName)='';
			eval {
				if(defined($wfsnap)) {
					my $cat = $parser->parse_file($jobdir.'/../'.$IWWEM::WorkflowCommon::CATALOGFILE);
					my($transjobId)=IWWEM::WorkflowCommon::patchXMLString($jobId);
					my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transjobId']",$cat);
					foreach my $snapNode (@snaps) {
						$responsibleMail=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						$responsibleName=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
						last;
					}
				} else {
					my $res = $parser->parse_file($jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE);
					$responsibleMail=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					$responsibleName=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
				}
			};
			$es->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
			$es->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
		}
		
		# Do we have to save the report as an static one?
		if(defined($termstat)) {
			eval {
				my($staticDoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
				$staticDoc->setDocumentElement($staticDoc->importNode($es));
				$staticDoc->toFile($jobdir.'/'.$IWWEM::WorkflowCommon::STATICSTATUSFILE);
			};
		}
		# Last, attach
		$root->appendChild($es);
	}
	
	print $query->header(-type=>'text/xml',-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');
	
	$outputDoc->toFH(\*STDOUT);
}

###########################
# ENACTION STATUS PARSING #
###########################

# Methods prototypes
sub _appendInputs($$$);
sub _appendOutputs($$$);
sub _appendIO($$$$);
sub _appendResults($$$;$$);
sub _processStep($$$;$$);
sub _getFreshEnactionReport($$);
sub _getStoredEnactionReport($$);
sub _parseEnactionReport($$;$);

# Methods declarations
sub _appendInputs($$$) {
	_appendIO($_[0],$_[1],$_[2],'input');
}

sub _appendOutputs($$$) {
	_appendIO($_[0],$_[1],$_[2],'output');
}

sub _appendIO($$$$) {
	my($iofile,$outputDoc,$parent,$iotagname)=@_;
	
	if(-f $iofile && -s $iofile) {
		my($handler)=EnactionStatusSAX->new($outputDoc,$parent,$iotagname);
		my($parser)=XML::LibXML->new(Handler=>$handler);
		eval {
			$parser->parse_file($iofile);
		};
		if($@) {
			print STDERR "PARTIAL ERROR with $iofile: $@";
		}
	}
}

sub _processStep($$$;$$) {
	my($basedir,$outputDoc,$es,$enactionReport,$p_stamp)=@_;
	
	my($inputsfile)=$basedir . '/' . $IWWEM::WorkflowCommon::INPUTSFILE;
	my($outputsfile)=$basedir . '/' . $IWWEM::WorkflowCommon::OUTPUTSFILE;
	my($resultsdir)=$basedir . '/Results';
	_appendInputs($inputsfile,$outputDoc,$es);
	_appendOutputs($outputsfile,$outputDoc,$es);
	return _appendResults($resultsdir,$outputDoc,$es,$enactionReport,$p_stamp);
}

sub _appendResults($$$;$$) {
	my($resultsdir,$outputDoc,$parent,$enactionReport,$p_stamp)=@_;
	
	my($failedSth)=undef;
	
	if(-d $resultsdir) {
		my($RDIR);
		my($context)=undef;

		if(defined($enactionReport)) {
			my($context)=XML::LibXML::XPathContext->new();
			foreach my $erentry ($context->findnodes(".//processor",$enactionReport)) {
				my($entry)=$erentry->getAttribute('name');
				
				my($step)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'step');
				$step->setAttribute('name',$entry);
				
				my($state)=undef;
				my($includeSubs)=1;
				
				# Additional info, provided by the report
				my($sched)=undef;
				my($run)=undef;
				my($runnumber)=undef;
				my($runmax)=undef;
				my($stop)=undef;
				my(@errreport)=();

				foreach my $child ($erentry->childNodes) {
					if($child->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
						my($name)=$child->localName();
						my($val)=undef;
						if($name eq 'ProcessScheduled') {
							$val=str2time($child->getAttribute('TimeStamp'));
							$sched=LockNLog::getPrintableDate($val);
						} elsif($name eq 'Invoking') {
							$val=str2time($child->getAttribute('TimeStamp'));
							$run=LockNLog::getPrintableDate($val);
						} elsif($name eq 'InvokingWithIteration') {
							$val=str2time($child->getAttribute('TimeStamp'));
							$run=LockNLog::getPrintableDate($val);
							$runnumber=$child->getAttribute('IterationNumber');
							$runmax=$child->getAttribute('IterationTotal');
						} elsif($name eq 'ProcessComplete') {
							$val=str2time($child->getAttribute('TimeStamp'));
							$stop=LockNLog::getPrintableDate($val);
							$state='finished';
						} elsif($name eq 'ServiceFailure') {
							$val=str2time($child->getAttribute('TimeStamp'));
							$stop=LockNLog::getPrintableDate($val);
							$state='error';
							$failedSth=1;
						} elsif($name eq 'ServiceError') {
							push(@errreport,[$child->getAttribute('Message'),$child->textContent()]);
						}
						${$p_stamp}=$val  unless(!defined($val) || (defined(${$p_stamp}) && ${$p_stamp}>=$val));
					}
				}
				unless(defined($state)) {
					if(defined($run)) {
						$state='running';
					} else {
						$state='queued';
						$includeSubs=undef;
					}
				}

				$step->setAttribute('state',$state);
				
				# Adding the extra info
				my($extra)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'extraStepInfo');
				$extra->setAttribute('sched',$sched)  if(defined($sched));
				$extra->setAttribute('start',$run)  if(defined($run));
				$extra->setAttribute('stop',$stop)  if(defined($stop));
				$extra->setAttribute('iterNumber',$runnumber)  if(defined($runnumber));
				$extra->setAttribute('iterMax',$runmax)  if(defined($runmax));
				foreach my $errmsg (@errreport) {
					my($err)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'stepError');
					$err->setAttribute('header',$errmsg->[0]);
					$err->appendChild($outputDoc->createCDATASection($errmsg->[1]));
					$extra->appendChild($err);
				}

				$step->appendChild($extra);
				
				if(defined($includeSubs)) {
					my($jobdir)=$resultsdir .'/'. $entry;
					_appendInputs($jobdir . '/' . $IWWEM::WorkflowCommon::INPUTSFILE,$outputDoc,$step);
					_appendOutputs($jobdir . '/' . $IWWEM::WorkflowCommon::OUTPUTSFILE,$outputDoc,$step);
					
					my($iteratedir)=$jobdir . '/'. $IWWEM::WorkflowCommon::ITERATIONSDIR;
					if(-d $iteratedir) {
						my($iternode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'iterations');
						$step->appendChild($iternode);
						my($subFailed)=_appendResults($iteratedir,$outputDoc,$iternode);
						$failedSth=1  if(defined($subFailed));
					}
				}
				
				$parent->appendChild($step);
			}
		} elsif(opendir($RDIR,$resultsdir)) {
			my($entry);
			my($context)=undef;
			
			while($entry=readdir($RDIR)) {
				# No hidden element, please!
				my($jobdir)=$resultsdir .'/'. $entry;
				next  if($entry eq '.' || $entry eq '..' || ! -d $jobdir);
				
				my($step)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'step');
				$step->setAttribute('name',$entry);
				my($state)=undef;
				my($includeSubs)=1;
				
				if( -f $jobdir . '/FINISH') {
					$state = 'finished';
				} elsif( -f $jobdir . '/FAILED.txt') {
					$state = 'error';
					$failedSth=1;
				} elsif( -f $jobdir . '/START') {
					$state = 'running';
				} else {
					# So it could be queued
					$state = 'queued';
					$includeSubs=undef;
				}
				
				$step->setAttribute('state',$state);
				
				if(defined($includeSubs)) {
					_appendInputs($jobdir . '/' . $IWWEM::WorkflowCommon::INPUTSFILE,$outputDoc,$step);
					_appendOutputs($jobdir . '/' . $IWWEM::WorkflowCommon::OUTPUTSFILE,$outputDoc,$step);
					
					my($iteratedir)=$jobdir . '/Iterations';
					if(-d $iteratedir) {
						my($iternode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'iterations');
						$step->appendChild($iternode);
						my($subFailed)=_appendResults($iteratedir,$outputDoc,$iternode);
						$failedSth=1  if(defined($subFailed));
					}
				}
				
				$parent->appendChild($step);
			}
			closedir($RDIR);
		}
	}
	
	return $failedSth;
}

sub _getFreshEnactionReport($$) {
	my($outputDoc,$portfile)=@_;
	
	my($buffer)=undef;
	eval {
		my($PORTFILE);
		die "FATAL ERROR: Unable to read portfile $ARGV[0]\n"  unless(open($PORTFILE,'<',$portfile));

		my($line)=undef;
		while($line=<$PORTFILE>) {
			last;
		}
		die "ERROR: Unable to read $portfile contents!\n"  unless(defined($line));
		close($PORTFILE);
		chomp($line);

		my($host,$port)=split(/:/,$line,2);
		die "ERROR: Line '$line' from $portfile is invalid!\n"
		unless(defined($port) && int($port) eq $port && $port > 0);

		my($proto)= (getprotobyname('tcp'))[2];

		# get the port address
		my($iaddr) = inet_aton($host);
		my($paddr) = pack_sockaddr_in($port, $iaddr);
		# create the socket, connect to the port
		my($SOCKET);
		socket($SOCKET, PF_INET, SOCK_STREAM, $proto) or die "SOCKET ERROR: $!";
		connect($SOCKET, $paddr) or die "CONNECT SOCKET ERROR: $!";

		$buffer='';
		while ($line = <$SOCKET>) {
			$buffer.=$line;
		}
		close($SOCKET) or die "CLOSE SOCKET ERROR: $!"; 
	};
	
	my($enactionReportError)=($@)?$@:undef;
	
	return _parseEnactionReport($outputDoc,$buffer,$enactionReportError);
}

sub _getStoredEnactionReport($$) {
	my($outputDoc,$dir)=@_;
	
	my($ER);
	my($rep)='';
	
	if(open($ER,'<',$dir.'/'.$IWWEM::WorkflowCommon::REPORTFILE)) {
		my($line)=undef;
		while($line=<$ER>) {
			$rep .= $line;
		}
		close($ER);
		return _parseEnactionReport($outputDoc,$rep,undef);
	} else {
		return undef;
	}
}

sub _parseEnactionReport($$;$) {
	my($outputDoc,$enactionReport,$enactionReportError)=@_;
	
	my($er)=undef;
	my($parser)=XML::LibXML->new();
	my($repnode)=undef;
	
	if(!defined($enactionReportError) && defined($enactionReport)) {
		eval {
			# Beware decode!
			my($crap)=$enactionReport;
			my($er)=$parser->parse_string(decode('UTF-8', $crap));
			$repnode=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'enactionReport');
			$repnode->appendChild($outputDoc->importNode($er->documentElement));
		};

		if($@) {
			$enactionReportError=$@
		}
	}
	
	unless(defined($repnode) || defined($enactionReportError)) {
		$enactionReportError='Undefined error, please contact IWWE&M developer';
	}
	
	if(defined($enactionReportError)) {
		$repnode=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'enactionReportError');
		$enactionReportError .= "\n\nOffending content:\n\n$enactionReport"  if(defined($enactionReport));
		$repnode->appendChild($outputDoc->createCDATASection($enactionReportError));
	}
	
	return $repnode;
}



package EnactionStatusSAX;

use strict;
use XML::SAX::Base;
use XML::SAX::Exception;
use lib "$FindBin::Bin";
use IWWEM::WorkflowCommon;

use base qw(XML::SAX::Base);

###############
# Constructor #
###############
sub new($$$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	my($outputDoc,$parent,$iotagname)=@_;
	
	my($self)=$proto->SUPER::new();
	
	$self->{outputDoc}=$outputDoc;
	$self->{parent}=$parent;
	$self->{iotagname}=$iotagname;
	
	return bless($self,$class);
}

########################
# SAX instance methods #
########################
sub start_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};

	if($elem->{NamespaceURI} eq $IWWEM::WorkflowCommon::BACLAVA_NS && $elname eq 'dataThing') {
		my($ionode)=$self->{outputDoc}->createElementNS($IWWEM::WorkflowCommon::WFD_NS,$self->{iotagname});
		$ionode->setAttribute('name',$elem->{Attributes}{'{}key'}{Value});
		$self->{parent}->appendChild($ionode);
	}
}

1;
