#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/InternalWorkflowList.pm
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

package IWWEM::InternalWorkflowList;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowList);

use IWWEM::WorkflowCommon;
use IWWEM::Taverna1WorkflowKind;

##############
# Prototypes #
##############
sub new(;$);

###############
# Constructor #
###############

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	$self->{TAVERNA1}=IWWEM::Taverna1WorkflowKind->new($self->{PARSER},$self->{CONTEXT});
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	$id=$self->{id}  if(exists($self->{id}));
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
	
	$self->{WORKFLOWLIST}=\@workflowlist;
	$self->{baseListDir}=$baseListDir;
	$self->{GATHERED}=[$listDir,$uuidPrefix,$isSnapshot];
	
	return bless($self,$class);
}

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
		unless(index($wf,'http://')==0 || index($wf,'ftp://')==0) {
			$relwffile=$wf.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
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
		
		# With this variable it is possible to swtich among different 
		# representations
		my($wfKind)='TAVERNA1';
		#my($wfcatmutex)=LockNLog::SimpleMutex->new($wfdir.'/'.$IWWEM::WorkflowCommon::LOCKFILE,$regen);
		if(defined($regen)) {
			my($uuid)=$uuidPrefix.$wf;
			$retnode = $self->{$wfKind}->($wf,$uuid,$listDir,$relwffile,$isSnapshot);
			
			if(defined($retnode) && defined($wfcat)) {
				my($outputDoc)=$retnode->ownerDocument();  
			
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

1;