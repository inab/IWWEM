#!/usr/bin/perl -W

# $Id$
# IWWEM/myExperimentWorkflowList/Constants.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: JosÈ MarÌa Fern·ndez Gonz·lez (C) 2007-2008
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
# Original IWWE&M concept, design and coding done by Jos√© Mar√≠a Fern√°ndez Gonz√°lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package IWWEM::myExperimentWorkflowList::Constants;

use FindBin;
use lib "$FindBin::Bin";

use vars qw($MYEXP_PREFIX);

$MYEXP_PREFIX='myExperiment:';

1;
