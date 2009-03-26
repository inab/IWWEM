#!/usr/bin/perl -W

# $Id$
# IWWEM/Config.pm
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

package IWWEM::Config;

use FindBin;

# This package contains the configuration bits
# of IWWE&M

# Default license name, assigned when no license is detected
use vars qw($DEFAULT_LICENSE_NAME);
$DEFAULT_LICENSE_NAME='CC Attribution-ShareAlike 3.0';

# Default license URI, assigned when no license is detected
use vars qw($DEFAULT_LICENSE_URI);
$DEFAULT_LICENSE_URI='http://creativecommons.org/licenses/by-sa/3.0/legalcode';

# Relative Storage dir, the parent of workflow and job directories
my($STORAGERELDIR)='Storage';

# Absolute storage dir
use vars qw($STORAGEDIR);

$STORAGEDIR = $FindBin::Bin. '/'.$STORAGERELDIR;

use vars qw($WORKFLOWRELDIR);
$WORKFLOWRELDIR = 'workflows';

use vars qw($WORKFLOWDIR);
$WORKFLOWDIR = $STORAGEDIR.'/' . $WORKFLOWRELDIR;

# Base directory for jobs
use vars qw($JOBRELDIR);
$JOBRELDIR = 'jobs';

use vars qw($JOBDIR);
$JOBDIR = $STORAGEDIR.'/' .$JOBRELDIR;

# Base directory for user confirmations
use vars qw($CONFIRMRELDIR);
$CONFIRMRELDIR='.pending';

use vars qw($CONFIRMDIR);
$CONFIRMDIR = $STORAGEDIR.'/'.$CONFIRMRELDIR;

# Maven directory used by raven instance inside
# workflowparser and workflowlauncher
use vars qw($MAVENDIR);
$MAVENDIR = $FindBin::Bin.'/Backends/t1backend-maven';

# Number of concurrent jobs
use vars qw($MAXJOBS);
$MAXJOBS = 10;

# When a pending job is waiting for a slot,
# the delay (in seconds) between checks.
# It is not higher because it is
# restricted from LockNLog side.
use vars qw($JOBCHECKDELAY);
$JOBCHECKDELAY = 1;

# When IWWE&M is living behind some layers of proxies it is not able
# to guess the full URI of the CGI, so this hash helps in those cases,
# based on the host name which received the query.
use vars qw(%HARDHOST);
%HARDHOST=(
	'ubio.bioinfo.cnio.es' => '/biotools/IWWEM/cgi-bin',
	'iwwem.bioinfo.cnio.es' => '/cgi-bin',
);

1;
