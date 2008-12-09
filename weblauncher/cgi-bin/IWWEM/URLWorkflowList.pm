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

package IWWEM::URLWorkflowList;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowList);

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
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	$id=$self->{id}  if(exists($self->{id}));
	my(@workflowlist)=undef;
	
	$id=''  unless(defined($id));
	my($baseListDir)=undef;
	my($listDir)=undef;
	my($subId)=undef;
	my($uuidPrefix)=undef;
	my($isSnapshot)=undef;
	if(index($id,'http://')==0 || index($id,'ftp://')==0 || index($id,'https://')) {
		$subId=$id;
		@workflowlist=($id);
	}
	
	$self->{GATHERED}=[\@workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot];
	
	return bless($self,$class);
}

1;