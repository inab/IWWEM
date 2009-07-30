#!/usr/bin/perl -W

# $Id$
# IWWEMconfirm.pl
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

use Carp ();

local $SIG{__WARN__} = \&Carp::cluck;
local $SIG{__DIE__} = \&Carp::confess;

use CGI;
use Encode;
use File::Copy;
use File::Path;
use FindBin;
use XML::LibXML;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::InternalWorkflowList::Confirmation;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();
my($code)=undef;
my($reject)=undef;
my($retval)='0';

# First step, getting code
foreach my $param ($query->param()) {
	# Let's check at UTF-8 level!
	my($tmpparamname)=$param;
	eval {
		# Beware decode in croak mode!
		decode('UTF-8',$tmpparamname,Encode::FB_CROAK);
	};
	
	if($@) {
		$retval="Param name $param is not a valid UTF-8 string!";
		last;
	}
	
	my($paramval)=undef;
	if($param eq 'code') {
		$paramval = $code = $query->param($param);
	} elsif($param eq 'reject') {
		$paramval = $reject = $query->param($param);
	}
	
	# Error checking
	last  if($query->cgi_error());
	
	# Let's check at UTF-8 level!
	if(defined($paramval)) {
		eval {
			# Beware decode!
			decode('UTF-8',$paramval,Encode::FB_CROAK);
		};
		
		if($@) {
			$retval="Param $param does not contain a valid UTF-8 string!";
			last;
		}
	}
}

# Skipping non-valid commands
my($command,$p_done)=IWWEM::InternalWorkflowList::Confirmation::doConfirm($query,$retval,$code,$reject);
unless(defined($command)) {
	my $error = $query->cgi_error;
	$error = defined($error)?$error:(($retval ne '0')?$retval:'404 Not Found');
	print $query->header(-status=>$error),
		$query->start_html('IWWEMconfirm Problems'),
		$query->h2('Request not processed because "code" parameter was not properly provided'),
		$query->strong($error);
	
	exit 0;
}

my($version)=IWWEM::WorkflowCommon::getIWWEMVersion();

# And composing something...
print $query->header(-type=>'text/html',-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');

my($tabledone)='<table border="1" align="center">';
foreach my $doel (@{$p_done}) {
	my($prett)=$doel->[4];
	$prett="<i>(empty)</i>"  unless(defined($prett) && length($prett)>0);
	$tabledone .="<tr><td>$doel->[0]</td><td>$doel->[1]</td><td><b>".((defined($doel->[2]))?'':'not ')."$command</b></td><td>$doel->[3]</td><td>$prett</td></tr>";
}
$tabledone .='</table>';

my($operURL)=IWWEM::WorkflowCommon::getCGIBaseURI($query);
$operURL =~ s/cgi-bin\/[^\/]+$//;

print <<EOF;
<html>
	<head><title>IWWE&amp;M IWWEMconfirm operations report</title></head>
	<body>
<div align="center"><h1 style="font-size:32px;"><a href="http://www.inab.org/"><img src="../style/logo-inb-small.png" style="vertical-align:middle" alt="INB" title="INB" border="0"></a>
<a href="$operURL">IWWE&amp;M</a> v$version IWWEMconfirm operations report</h1></div>
$tabledone
	</body>
</html>
EOF
