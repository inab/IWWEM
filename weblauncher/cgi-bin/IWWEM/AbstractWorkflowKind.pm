#!/usr/bin/perl -W

# $Id$
# IWWEM/AbstractWorkflowList.pm
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

package IWWEM::AbstractWorkflowKind;

use Carp qw(croak);

use IWWEM::WorkflowCommon;

##############
# Prototypes #
##############
sub new(;$$);

##################
# Static methods #
##################

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$$) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	$self={}  unless(ref($self));
	
	# Now, it is time to gather WF information!
	# But, as this is an "abstract" class, almost nothing is done :-(
	
	my $parser = (scalar(@_)>0)?shift:XML::LibXML->new();
	my $context = (scalar(@_)>0)?shift:XML::LibXML::XPathContext->new();
	$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
	
	$self->{PARSER}=$parser;
	$self->{CONTEXT}=$context;
	
	return bless($self,$class);
}

sub getMIMEList() {
	croak("Unimplemented static method");
}

sub getRootNS() {
	croak("Unimplemented static method");
}

###########
# Methods #
###########

#	my($uuid,$wffile,$relwffile)=@_;
sub getWorkflowInfo($$$) {
	croak("Unimplemented method");
}

#	my($WFmaindoc)=@_;
sub canPatch($) {
	croak("Unimplemented method");
}

#	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
sub patchWorkflow($$$$$;$$$) {
	croak("Unimplemented method");
}

#	#	my($WFmaindoc,$licenseURI,$licenseName)=@_;
sub patchEmbeddedLicence($$$) {
	croak("Unimplemented method");
}

my($wfile,$jobdir,$p_baclava,$inputFileMap,$saveInputsFile)=@_;
sub launchJob($$$$$) {
	croak("Unimplemented method");
}
	
1;
