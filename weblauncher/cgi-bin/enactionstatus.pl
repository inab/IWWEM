#!/usr/bin/perl -W

# $Id$
# enactionstatus.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use Date::Parse;
use Encode;
use FindBin;
use CGI;
use XML::LibXML;
use File::Path;
use Socket;

use lib "$FindBin::Bin";
use WorkflowCommon;
use enactionstatus;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();

my($retval)='0';

my(@jobIdList)=();

my($dispose)=undef;

my($snapshotName)=undef;
my($snapshotDesc)=undef;
my($responsibleMail)=undef;
my($responsibleName)=undef;

# First step, parameter storage (if any!)
PARAMPARSE:
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
	
	my(@paramvalarr)=();
	
	if($param eq 'jobId') {
		@paramvalarr = @jobIdList = $query->param($param);
	} elsif($param eq 'dispose') {
		$dispose=$query->param($param);
		$dispose=($dispose ne '1')?0:1;
	} elsif($param eq 'snapshotName') {
		$snapshotName = $query->param($param);
		@paramvalarr = ( $snapshotName );
	} elsif($param eq 'snapshotDesc') {
		$snapshotDesc = $query->param($param);
		@paramvalarr = ( $snapshotDesc );
	} elsif($param eq $WorkflowCommon::RESPONSIBLEMAIL) {
		$responsibleMail = $query->param($param);
		@paramvalarr = ( $responsibleMail );
	} elsif($param eq $WorkflowCommon::RESPONSIBLENAME) {
		$responsibleName = $query->param($param);
		@paramvalarr = ( $responsibleName );
	}
	last  if($query->cgi_error());
	
	# Let's check at UTF-8 level!
	foreach my $paramval (@paramvalarr) {
		eval {
			# Beware decode!
			decode('UTF-8',$paramval,Encode::FB_CROAK);
		};
		
		if($@) {
			$retval="Param $param does not contain a valid UTF-8 string!";
			last PARAMPARSE;
		}
	}
}

# We must signal here errors and exit
if($retval ne '0' || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because some parameter was not properly provided: '.$retval),
		$query->strong($error);
	exit 0;
}

enactionstatus::sendEnactionReport($query,@jobIdList,$snapshotName,$snapshotDesc,$responsibleMail,$responsibleName,$dispose);

exit 0;
