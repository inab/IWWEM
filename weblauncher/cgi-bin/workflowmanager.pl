#!/usr/bin/perl -W

# $Id$
# workflowmanager.pl
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
use WorkflowCommon;
use workflowmanager; 

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
$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
$context->registerNs('sn',$WorkflowCommon::WFD_NS);

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
	if($param eq $WorkflowCommon::PARAMISLAND) {
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
			if($irelpath =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				eval {
					my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);

					my($transsnapId)=WorkflowCommon::patchXMLString($snapId);
					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
					foreach my $snap (@eraseSnap) {
						$prettyname=$snap->getAttribute('name');
						$resMail=$snap->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						last;
					}
				};
			} elsif($irelpath =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				eval {
					my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);

					my($transexamId)=WorkflowCommon::patchXMLString($examId);
					my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
					foreach my $exam (@eraseExam) {
						$prettyname=$exam->getAttribute('name');
						$resMail=$exam->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						last;
					}
				};
			} else {
				my($jobdir)=undef;
				
				if($irelpath =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir=$IWWEM::Config::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir=$IWWEM::Config::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($responsiblefile)=$jobdir.'/'.$WorkflowCommon::RESPONSIBLEFILE;
					my($rp)=$parser->parse_file($responsiblefile);
					$resMail=$rp->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					my($workflowfile)=$jobdir.'/'.$WorkflowCommon::WORKFLOWFILE;
					my($wf)=$parser->parse_file($workflowfile);
					
					my @nodelist = $wf->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
					
				};
			}
			
			if(defined($resMail)) {
				my($penduuid,$penddir,$PH)=WorkflowCommon::genPendingOperationsDir($WorkflowCommon::COMMANDERASE);

				print $PH "$irelpath\n";
				close($PH);
				
				WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,$kind,$WorkflowCommon::COMMANDERASE,$irelpath,$resMail,$prettyname);
			}
		}
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOW) {
		$hasInputWorkflow=1;
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $WorkflowCommon::PARAMWFID) {
		$paramval = $id = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif($param eq $WorkflowCommon::LICENSEURI) {
		$paramval = $licenseURI = $query->param($param);
	} elsif($param eq $WorkflowCommon::LICENSENAME) {
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
if($retval==0 && !$query->cgi_error() && defined($hasInputWorkflow)) {
	($retval,$retvalmsg)=workflowmanager::parseInlineWorkflows($query,$parser,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps);
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
my($p_workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot)=workflowmanager::gatherWorkflowList($id);

workflowmanager::sendWorkflowList($query,$retval,$retvalmsg,@{$p_workflowlist},$baseListDir,$listDir,$uuidPrefix,$isSnapshot,$dataislandTag);

exit 0;
