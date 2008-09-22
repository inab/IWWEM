#!/usr/bin/perl -W

# $Id$
# IWWEMproxy.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;

use lib "$FindBin::Bin";
use WorkflowCommon;
use IWWEMproxy;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();
my($retval)='0';

my($jobId)=undef;
my($asMime)=undef;
my($step)=undef;
my($iteration)=undef;
my($IOMode)=undef;
my($IOPath)=undef;
my($bundle64)=undef;
my($withName)=undef;
my($charset)=undef;
my($raw)=undef;

# First step, parameter storage (if any!)
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
	if($param eq 'jobId') {
		$paramval = $jobId = $query->param($param);
	} elsif($param eq 'asMime') {
		$paramval = $asMime = $query->param($param);
	} elsif($param eq 'step') {
		$paramval = $step = $query->param($param);
	} elsif($param eq 'iteration') {
		$paramval = $iteration = $query->param($param);
	} elsif($param eq 'IOMode') {
		$paramval = $IOMode = $query->param($param);
	} elsif($param eq 'IOPath') {
		$paramval = $IOPath = $query->param($param);
		$paramval = $IOPath = undef  unless(length($IOPath)>0);
	} elsif($param eq 'charset') {
		$paramval = $charset = $query->param($param);
		$paramval = $charset = undef  unless(length($charset)>0);
	} elsif($param eq 'bundle64') {
		$paramval = $bundle64 = $query->param($param);
	} elsif($param eq 'withName') {
		$paramval = $withName = $query->param($param);
	} elsif($param eq 'raw') {
		$raw=1;
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

# Second, parameter parsing
IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName,$charset,$raw);

exit 0;
