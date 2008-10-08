#!/usr/bin/perl -W

# $Id: WorkflowCommon.pm 1461 2008-09-22 15:26:39Z jmfernandez $
# IWWEM/Config.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

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

use vars qw($WORKFLOWRELDIR);
$WORKFLOWRELDIR = 'workflows';

use vars qw($WORKFLOWDIR);
$WORKFLOWDIR = $FindBin::Bin. '/'.$STORAGERELDIR.'/' . $WORKFLOWRELDIR;

# Base directory for jobs
use vars qw($JOBRELDIR);
$JOBRELDIR = 'jobs';

use vars qw($JOBDIR);
$JOBDIR = $FindBin::Bin . '/'.$STORAGERELDIR.'/' .$JOBRELDIR;

# Base directory for user confirmations
use vars qw($CONFIRMRELDIR);
$CONFIRMRELDIR='.pending';

use vars qw($CONFIRMDIR);
$CONFIRMDIR=$FindBin::Bin.'/'.$STORAGERELDIR.'/'.$CONFIRMRELDIR;

# Maven directory used by raven instance inside
# workflowparser and workflowlauncher
use vars qw($MAVENDIR);
$MAVENDIR = $FindBin::Bin.'/inb-maven';

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
