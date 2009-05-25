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

use Carp ();

local $SIG{__WARN__} = \&Carp::cluck;
local $SIG{__DIE__} = \&Carp::confess;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use URI;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::InternalWorkflowList;
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
my($wfparam)=undef;
my($hasInputWorkflowDeps)=undef;
my($doFreezeWorkflowDeps)=undef;

my($responsibleMail)=undef;
my($responsibleName)=undef;

my($licenseURI)=undef;
my($licenseName)=undef;

# This object is needed in some cases...
my($iwfl)=IWWEM::InternalWorkflowList->new(undef,1);

my(@toErase)=();
my($autoUUID)=undef;

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
		@toErase=$query->param($param);
		last if($query->cgi_error());
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOW || $param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWREF) {
		$wfparam=$param;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWFID) {
		$paramval = $id = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::AUTOUUID) {
		$paramval = $query->param($param);
		$autoUUID = $paramval  unless($paramval eq '1' || $paramval eq '');
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

# All the erase job is now done here...
$iwfl->eraseId($query,\@toErase,$autoUUID)  if(scalar(@toErase)>0);

# Parsing workflows query
my($wfl)=IWWEM::SelectiveWorkflowList->new($id);
if($retval==0 && !$query->cgi_error() && defined($wfparam)) {
	($retval,$retvalmsg)=$iwfl->parseInlineWorkflows($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$wfparam,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,undef,$autoUUID);
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
