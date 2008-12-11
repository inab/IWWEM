#!/usr/bin/perl -W

# $Id$
# workflowmanager.pl
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
use IWWEM::InternalWorkflowList;
use IWWEM::Taverna1WorkflowKind;
use IWWEM::SelectiveWorkflowList;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;
use LockNLog::SimpleMutex;

my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($retval)=0;
my($retvalmsg)=undef;
my($dataisland)=undef;
my($dataislandTag)=undef;
my($id)=undef;
my($hasInputWorkflow)=undef;
my($hasInputWorkflowDeps)=undef;
my($doFreezeWorkflowDeps)=undef;

my($responsibleMail)=undef;
my($responsibleName)=undef;

my($licenseURI)=undef;
my($licenseName)=undef;

my $parser = XML::LibXML->new();
my $context = XML::LibXML::XPathContext->new();
$context->registerNs('s',$IWWEM::Taverna1WorkflowKind::XSCUFL_NS);
$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	# Let's check at UTF-8 level!
	my($tmpparamname)=$param;
	eval {
		# Beware decode in croak mode!
		decode('UTF-8',$tmpparamname,Encode::FB_CROAK);
	};
	
	if($@) {
		$retval=-1;
		$retvalmsg="Param name $param is not a valid UTF-8 string!";
		last;
	}
	
	my($paramval)=undef;

	# We are skipping all unknown params
	if($param eq $IWWEM::WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq 'eraseId') {
		my(@iwwemId)=$query->param($param);
		last if($query->cgi_error());
		
		foreach my $irelpath (@iwwemId) {
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			my($kind)=undef;
			my($resMail)=undef;
			my($prettyname)=undef;
			if($irelpath =~ /^$IWWEM::InternalWorkflowList::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
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
			} elsif($irelpath =~ /^$IWWEM::InternalWorkflowList::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
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
				
				if($irelpath =~ /^$IWWEM::InternalWorkflowList::ENACTIONPREFIX([^:]+)$/) {
					$jobdir=$IWWEM::Config::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir=$IWWEM::Config::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($responsiblefile)=$jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
					my($rp)=$parser->parse_file($responsiblefile);
					$resMail=$rp->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					
					my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
					my($wf)=$parser->parse_file($workflowfile);
					
					my @nodelist = $wf->getElementsByTagNameNS($IWWEM::Taverna1WorkflowKind::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
					
				};
			}
			
			if(defined($resMail)) {
				my($penduuid,$penddir,$PH)=IWWEM::WorkflowCommon::genPendingOperationsDir($IWWEM::WorkflowCommon::COMMANDERASE);

				print $PH "$irelpath\n";
				close($PH);
				
				IWWEM::WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,$kind,$IWWEM::WorkflowCommon::COMMANDERASE,$irelpath,$resMail,$prettyname);
			}
		}
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOW) {
		$hasInputWorkflow=1;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWFID) {
		$paramval = $id = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::LICENSEURI) {
		$paramval = $licenseURI = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::LICENSENAME) {
		$paramval = $licenseName = $query->param($param);
	} elsif($param eq 'freezeWorkflowDeps') {
		$doFreezeWorkflowDeps=1;
	}
	
	# Error checking
	last  if($query->cgi_error());
	
	# Let's check at UTF-8 level!
	if(defined($paramval)) {
		eval {
			# Beware decode!
			decode('UTF-8',$paramval,Encode::FB_CROAK);
		};
		
		if($@) {
			$retval=-1;
			$retvalmsg="Param $param does not contain a valid UTF-8 string!";
			last;
		}
	}
}

# Parsing input workflows

my($wfl)=IWWEM::SelectiveWorkflowList->new($id);
if($retval==0 && !$query->cgi_error() && defined($hasInputWorkflow)) {
	($retval,$retvalmsg)=$wfl->parseInlineWorkflows($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps);
}

# We must signal here errors and exit
if($retval==-1 || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because '.(($retval!=0 && defined($retvalmsg))?$retvalmsg:'upload was interrupted')),
		$query->strong($error);
	exit 0;
}

# Second step, workflow repository report
$wfl->sendWorkflowList(\*STDOUT,$query,$retval,$retvalmsg,$dataislandTag);

exit 0;
