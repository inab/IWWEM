#!/usr/bin/perl -W

# $Id$
# IWWEM/SelectiveWorkflowList.pm
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

package IWWEM::SelectiveWorkflowList;

use base qw(IWWEM::AbstractWorkflowList);
use IWWEM::InternalWorkflowList;
use IWWEM::myExperimentWorkflowList;
use IWWEM::URLWorkflowList;

my(@PARADIGMS)=(
	'IWWEM::InternalWorkflowList',
	'IWWEM::myExperimentWorkflowList',
	'IWWEM::URLWorkflowList'
);

sub new(;$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	
	if(exists($self->{id})) {
		my($id)=$self->{id};
		foreach my $paradigm (@PARADIGMS) {
			if($paradigm->UnderstandsId($id)) {
				return $paradigm->new(@_);
			}
		}
	}
	
	# When unknown, use the internal workflow listing facility
	return IWWEM::InternalWorkflowList->new(@_);
}
