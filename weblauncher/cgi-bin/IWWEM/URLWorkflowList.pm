#!/usr/bin/perl -W

# $Id$
# IWWEM/URLWorkflowList.pm
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

package IWWEM::URLWorkflowList;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowList);

use IWWEM::WorkflowCommon;
use LWP::UserAgent;


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
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	$id=$self->{id}  if(exists($self->{id}));
	my(@workflowlist)=undef;
	
	$id=''  unless(defined($id));
	my($listDir)=undef;
	my($subId)=undef;
	my($uuidPrefix)='';
	my($isSnapshot)=undef;
	if(index($id,'http://')==0 || index($id,'ftp://')==0 || index($id,'https://')) {
		$subId=$id;
		@workflowlist=($id);
	}
	
	$self->{WORKFLOWLIST}=\@workflowlist;
	$self->{GATHERED}=[$listDir,$uuidPrefix,$isSnapshot];
	
	return bless($self,$class);
}

# Static methods
sub UnderstandsId($) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return index($_[0],'http://')==0 || index($_[0],'https://')==0 || index($_[0],'ftp://')==0;
}

sub Prefix() {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return undef;
}

sub getDomainClass() {
	return 'URL';
}

# Dynamic methods
sub getWorkflowURI($) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($id)=@_;
	
	return $id;
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
		
		
		# With this variable it is possible to switch among different 
		# representations
		my($wfKind)='UNIVERSAL';
		#my($wfcatmutex)=LockNLog::SimpleMutex->new($wfdir.'/'.$IWWEM::WorkflowCommon::LOCKFILE,$regen);
			my($uuid)=$wf;
			$retnode = $self->{WFH}{$wfKind}->getWorkflowInfo($uuid,$wf,$wf);
			
			my($outputDoc)=$retnode->ownerDocument();
			my($release)=$retnode->firstChild();
			while(defined($release) && ($release->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $release->localname() ne 'release')) {
				$release=$release->nextSibling();
			}
			
			# Now, the responsible person
			my($responsibleMail)='';
			my($responsibleName)='';

			$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
			$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
			
			# The date
			my($ua) = LWP::UserAgent->new;
			$ua->agent("IWWEM/0.7 ");
			my($req)=HTTP::Request->new(HEAD => $wf);
			my($resp)=$ua->request($req);
			if($resp->is_success()) {
				$release->setAttribute('date',LockNLog::getPrintableDate($resp->last_modified()));
			} else {
				$release->appendChild($outputDoc->createComment($resp->status_line()));
			}
	};
	
	if($@ || !defined($retnode)) {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		$retnode=$outputDoc->createComment("Unable to process $wf due ".$@);
	}
	
	return $retnode;
	
}

1;
