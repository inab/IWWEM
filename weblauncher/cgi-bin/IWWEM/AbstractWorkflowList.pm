#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/AbstractWorkflowList.pm
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

package IWWEM::AbstractWorkflowList;

use Carp qw(croak);

use IWWEM::WorkflowCommon;

##############
# Prototypes #
##############
sub new(;$);

###############
# Constructor #
###############

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	$self={}  unless(ref($self));
	
	# Now, it is time to gather WF information!
	# But, as this is an "abstract" class, almost nothing is done :-(
	$self->{id}=shift  if(scalar(@_)>0);
	$self->{GATHERED}=undef;
	
	my $parser = XML::LibXML->new();
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('s',$IWWEM::WorkflowCommon::XSCUFL_NS);
	$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
	
	$self->{PARSER}=$parser;
	$self->{CONTEXT}=$context;
	$self->{WORKFLOWLIST}=[];
	$self->{baseListDir}="";
	
	return bless($self,$class);
}

###########
# Methods #
###########

sub getWorkflowInfo($) {
	croak("Unimplemented method");
}

sub sendWorkflowList($$$$;$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($OUTPUT,$query,$retval,$retvalmsg,$dataislandTag)=@_;
	
	my($p_workflowlist,$baseListDir)=($self->{WORKFLOWLIST},$self->{baseListDir});
		
	my $parser = $self->{PARSER};
	my $context = $self->{CONTEXT};
	
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
		$domain->appendChild($outputDoc->importNode($self->getWorkflowInfo($wf,@{$self->{GATHERED}})));
	}
	
	print $OUTPUT $query->header(-type=>(defined($dataislandTag)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');
	
	if(defined($dataislandTag)) {
		print $OUTPUT "<html><body><$dataislandTag id='".$IWWEM::WorkflowCommon::PARAMISLAND."'>\n";
	}
	
	unless(defined($dataislandTag) && $dataislandTag eq 'div') {
		$outputDoc->toFH($OUTPUT);
	} else {
		print $OUTPUT $outputDoc->createTextNode($root->toString())->toString();
	}
	
	if(defined($dataislandTag)) {
		print "\n</$dataislandTag></body></html>";
	}
}

1;