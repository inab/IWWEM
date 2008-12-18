#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/UniversalWorkflowKind.pm
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

package IWWEM::UniversalWorkflowKind;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowKind);

use IWWEM::WorkflowCommon;
use IWWEM::Taverna1WorkflowKind;
use IWWEM::Taverna2WorkflowKind;

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
	
	my($t1)=IWWEM::Taverna1WorkflowKind->new(@_);
	my($t2)=IWWEM::Taverna2WorkflowKind->new(@_);
	$self->{WFKINDSHASH}={
		$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME => $t1,
		$IWWEM::Taverna2WorkflowKind::T2FLOW_MIME => $t2,
	};
	$self->{WFKINDS}=[
		$t1,
		$t2,
	];
	
	return bless($self,$class);
}

###########
# Methods #
###########

sub getWorkflowInfo($$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my $wfe=undef;
	foreach my $kind (@{$self->{WFKINDS}}) {
		$wfe=$kind->getWorkflowInfo(@_);
		last  if(defined($wfe));
	}
	
	return $wfe;
}

#	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
sub patchWorkflow($$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
	my($tavkind)=($WFmaindoc->documentElement() eq 'scufl')?$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME:$IWWEM::Taverna2WorkflowKind::T2FLOW_MIME;
	
	return $self->{WFKINDHASH}{$tavkind}->patchWorkflow(@_);
}

#	my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
sub parseInlineWorkflows($$$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
	# TODO: I cannot guess (yet), so it is fixed :-(
	return $self->{WFKINDHASH}{$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME}->parseInlineWorkflows(@_);
}

1;