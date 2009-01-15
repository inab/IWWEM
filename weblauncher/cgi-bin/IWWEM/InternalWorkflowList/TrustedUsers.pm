#!/usr/bin/perl -W

# $Id$
# IWWEM/InternalWorkflowList/TrustedUsers.pm
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

package IWWEM::InternalWorkflowList::TrustedUsers;

use Carp qw(croak);
use Fcntl qw(:flock SEEK_END O_RDWR O_CREAT);
use FindBin;
use XML::LibXML;
use lib "$FindBin::Bin";

use IWWEM::Config;
use IWWEM::WorkflowCommon;

use vars qw($TRUSTEDUSERSFILE);

$TRUSTEDUSERSFILE=$IWWEM::Config::STORAGEDIR.'/trustedUsers.xml';

my($TRUST)=undef;

my($TRUSTEDUSERS_EL)='trustedUsers';
my($TRUSTEDUSER_EL)='trustedUser';

##############
# Prototypes #
##############
sub new();

###############
# Constructor #
###############
sub new() {
	# Only one instance!
	unless(defined($TRUST)) {
		# Very special case for multiple inheritance handling
		# This is the seed
		my($self)=shift;
		my($class)=ref($self) || $self;
		
		$self={}  unless(ref($self));
		
		# Now, it is time to gather users information!
		my $parser = XML::LibXML->new();
		my $context = XML::LibXML::XPathContext->new();
		$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
		
		# Parsing can fail, but we don't want to filter the
		# failure, because it should be handled upstream
		my($udoc)=undef;
		if(-e $TRUSTEDUSERSFILE) {
			flock($TRUSTEDUSERSFILE,LOCK_SH);
			$udoc = $parser->parse_file($TRUSTEDUSERSFILE);
		} else {
			$udoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
			my($root)=$udoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,$TRUSTEDUSERS_EL);
			$udoc->setDocumentElement($root);
			
			$root->appendChild($udoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTWM) ));
			
			$udoc->toFile($TRUSTEDUSERSFILE);
			flock($TRUSTEDUSERSFILE,LOCK_SH);
		}
		$self->{TRUSTDB} = $udoc;
		
		# This is set to avoid unnecessary object creations
		$self->{PARSER}=$parser;
		$self->{CONTEXT}=$context;
		$TRUST=bless($self,$class);
	}
	
	return $TRUST; 
}

#	my($responsibleEmail,$autoUUID)=@_;
sub validate($$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($responsibleEmail,$autoUUID)=@_;
}


1;