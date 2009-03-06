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

package IWWEM::AbstractWorkflowList;

use Carp qw(croak);

use IWWEM::WorkflowCommon;
use IWWEM::Taverna1WorkflowKind;
use IWWEM::Taverna2WorkflowKind;
use Encode;

use vars qw($V2RBASE %V2R);

$V2RBASE = '/iwwem:workflow/iwwem:release[1]';
%V2R=(
	$IWWEM::WorkflowCommon::WORKFLOWFILE => '@path',
	$IWWEM::WorkflowCommon::SVGFILE => 'iwwem:graph[@mime="image/svg+xml"]',
	$IWWEM::WorkflowCommon::PNGFILE => 'iwwem:graph[@mime="image/png"]',
	$IWWEM::WorkflowCommon::PDFFILE => 'iwwem:graph[@mime="application/pdf"]',
	$IWWEM::WorkflowCommon::GIFFILE => 'iwwem:graph[@mime="image/gif"]',
	$IWWEM::WorkflowCommon::JPEGFILE => 'iwwem:graph[@mime="image/jpeg"]',
);

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
	$context->registerNs('iwwem',$IWWEM::WorkflowCommon::WFD_NS);

	$self->{PARSER}=$parser;
	$self->{CONTEXT}=$context;
	$self->{WORKFLOWLIST}=[];
	$self->{baseListDir}="";
	
	foreach my $KIND (('IWWEM::UniversalWorkflowKind','IWWEM::Taverna1WorkflowKind','IWWEM::Taverna2WorkflowKind')) {
		my($t)=$KIND->new($self->{PARSER},$self->{CONTEXT});
		foreach my $MIME ($KIND->getMIMEList()) {
			$self->{WFH}{$MIME}=$t;
		}
	}
	# $self->{WFH}{UNIVERSAL}=IWWEM::UniversalWorkflowKind->new($self->{PARSER},$self->{CONTEXT});
	# $self->{WFH}{$IWWEM::Taverna1WorkflowKind::XSCUFL_MIME}=IWWEM::Taverna1WorkflowKind->new($self->{PARSER},$self->{CONTEXT});
	# $self->{WFH}{$IWWEM::Taverna2WorkflowKind::T2FLOW_MIME}=IWWEM::Taverna2WorkflowKind->new($self->{PARSER},$self->{CONTEXT});
	
	return bless($self,$class);
}

# Static method
sub UnderstandsId($) {
	croak("Unimplemented method");
}

sub Prefix() {
	croak("Unimplemented method");
}

###########
# Methods #
###########

sub getWorkflowInfo($@) {
	croak("Unimplemented method");
}

sub getWorkflowURI($) {
	croak("Unimplemented method");
}

sub getDomainClass() {
	croak("Unimplemented method");
}

sub virt2real($@) {
	my($self)=shift;
	croak("This is an instance method!")  unless(ref($self));
	
	my($global)=shift;
	my(@idhist)=@_;
	
	if(scalar(@idhist)>=2 && exists($V2R{$idhist[1]})) {
		my($wflDesc)=$self->getWorkflowInfo($idhist[0],@{$self->{GATHERED}});

		my $context = $self->{CONTEXT};
		print STDERR "carajo\n"  unless(defined($wflDesc));
		my(@rels)=$context->findnodes($V2RBASE.'/'.$V2R{$idhist[1]},$wflDesc);
		return $rels[0]->textContent;
	} else {
		return undef;
	}
}

#	my($OUTPUT,$query,$retval,$retvalmsg,$dataislandTag,$autoUUID)=@_;
sub sendWorkflowList($$$$;$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($OUTPUT,$query,$retval,$retvalmsg,$dataislandTag,$autoUUID)=@_;
	
	my($p_workflowlist,$baseListDir)=($self->{WORKFLOWLIST},$self->{baseListDir});
		
	my $parser = $self->{PARSER};
	my $context = $self->{CONTEXT};
	
	my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflowlist');
	$outputDoc->setDocumentElement($root);
	
	$root->appendChild($outputDoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTWM) ));
	
	my($domain)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'domain');
	$domain->setAttribute('class',$self->getDomainClass());
	$domain->setAttribute('time',LockNLog::getPrintableNow());
	$domain->setAttribute('relURI',$baseListDir);
	$root->appendChild($domain);
	
	# Attached Error Message (if any)
	if($retval!=0 || defined($autoUUID)) {
		my($message)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'message');
		$message->setAttribute('retval',$retval);
		$message->setAttribute('autoUUID',$autoUUID);
		if(defined($retvalmsg)) {
			$message->appendChild($outputDoc->createCDATASection($retvalmsg));
		}
		$domain->appendChild($message);
	}
	
	foreach my $wf (@{$p_workflowlist}) {
		my($winfo)=$self->getWorkflowInfo($wf,@{$self->{GATHERED}});
		$domain->appendChild($outputDoc->importNode($winfo))  if(defined($winfo));
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

#		my($query,$responsibleMail,$responsibleName,$licenseURI,$licenseName,$param,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$autoUUID)=@_;
sub parseInlineWorkflows($$$$$$$;$$$) {
	croak("Unimplemented method");
}

#	my($query,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
sub patchWorkflow($$$$$;$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	return $self->{WFH}{UNIVERSAL}->patchWorkflow(@_);
}

sub launchJob($$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	return $self->{WFH}{UNIVERSAL}->launchJob(@_);
}

sub resolveWorkflowId($) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($id)=@_;
	
	return ($id,undef,0);
}
			
#	my($query,$p_iwwemId,$autoUUID)=@_;
sub eraseId($\@;$) {
	croak("Unimplemented method");
}

#	my($query,$p_jobIdList,$snapshotName,$snapshotDesc,$responsibleMail,$responsibleName,$dispose,$autoUUID)=@_;
sub sendEnactionReport($\@;$$$$$$) {
	croak("Unimplemented method");
}

1;
