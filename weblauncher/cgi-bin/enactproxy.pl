#!/usr/bin/perl -W

use strict;

#use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();

my($jobId)=undef;
my($asMime)=undef;
my($step)=undef;
my($iteration)=undef;
my($IOMode)=undef;
my($IOPath)=undef;
my($bundle64)=undef;
my($withName)=undef;

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	if($param eq 'jobId') {
		$jobId=$query->param($param);
	} elsif($param eq 'asMime') {
		$asMime=$query->param($param);
	} elsif($param eq 'step') {
		$step=$query->param($param);
	} elsif($param eq 'iteration') {
		$iteration=$query->param($param);
	} elsif($param eq 'IOMode') {
		$IOMode=$query->param($param);
	} elsif($param eq 'IOPath') {
		$IOPath=$query->param($param);
	} elsif($param eq 'bundle64') {
		$bundle64=$query->param($param);
	} elsif($param eq 'withName') {
		$withName=$query->param($param);
		$withName=undef   if($withName eq '');
	}
	
	# Error checking
	last  if($query->cgi_error());
}

# Second, parameter parsing
my($retval)=0;
my($bacio)=undef;
my(@path)=();
my($facet)=undef;
if(defined($asMime) && defined($jobId)) {
	# Time to know the overall status of this enaction
	my($jobdir)=undef;
	my($wfsnap)=undef;
	
	if(index($jobId,$WorkflowCommon::SNAPSHOTPREFIX)==0) {
		if(index($jobId,'/')==-1 && $jobId =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$wfsnap=$1;
			$jobId=$2;
			$jobdir=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$jobId;
		}
	} else {
		$jobdir=$WorkflowCommon::JOBDIR . '/' .$jobId;
	}
	
	# Is it a valid job id?
	if(index($jobId,'/')==-1 && defined($jobdir) && -d $jobdir && -r $jobdir) {
		if($asMime =~ /^[^ \/\n\t]+\/[^ \/\n\t]+/) {
			if(defined($bundle64)) {
				$retval=-1  unless(!defined($withName) || index($withName,'/')==-1);
			} else {
				my($targfile)=undef;
				if($IOMode eq 'I') {
					$targfile='Inputs.xml';
				} elsif($IOMode eq 'O') {
					$targfile='Outputs.xml';
				}
				
				if(defined($targfile)) {
					# The pseudo XPath IOPath
					if(defined($IOPath)) {
						@path=split(/\//,$IOPath);
					}
					if(scalar(@path)>0) {
						$withName=join('_',@path)  if(defined($withName));
						$facet=shift(@path);
						
						# Now, the physical path
						my($stepdir)=$jobdir;
						if(defined($step) && length($step)>0 && $step ne $jobId) {
							$stepdir .= '/Results/'.$step;
						} else {
							$step='';
							# Forcing iteration forgery avoidance
							$iteration=undef;
						}

						if(index($step,'/')==-1 && -d $stepdir && -r $stepdir) {
							my($iterdir)=$stepdir;
							if(defined($iteration) && length($iteration)>0) {
								$iterdir .= '/Iterations/'.$step;
							} else {
								$iteration='';
							}

							if(defined($iteration) && index($iteration,'/')==-1 && -d $iterdir && -r $iterdir) {
								my($bacfile)=$iterdir . '/' . $targfile;

								# We are going to parse!
								my($parser)=XML::LibXML->new();
								#$context->registerNs('s',$WorkflowCommon::SCUFL_NS);

								eval {
									$bacio=$parser->parse_file($bacfile);
								};

								if($@) {
									$retval="8, $@";
								}
							} else {
								$retval=7;
							}
						} else {
							$retval=6;
						}
					} else {
						$retval=5;
					}
				} else {
					$retval=4;
				}
			}
		} else {
			$retval=3;
		}
	} else {
		$retval=2;
	}
} else {
	$retval=1;
}

# We must signal here errors and exit
if($retval ne '0' || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('EnactProxy Problems'),
		$query->h2('Request not processed because some parameter was not properly provided'.(($retval ne '0')?" (Errcode=$retval)":'')),
		$query->strong($error);
	exit 0;
}

my($retmesg)=undef;

# Now it is time to work!
unless(defined($bundle64)) {
	eval {
		my($context)=XML::LibXML::XPathContext->new();
		$context->registerNs('b',$WorkflowCommon::BACLAVA_NS);

		my($xpathfetch)="/b:dataThingMap/b:dataThing[\@key='$facet']/b:myGridDataDocument/";

		my($pathlength)=scalar(@path);
		if($pathlength>0) {
			$xpathfetch .= 'b:partialOrder/b:itemList/';
			$pathlength--;
			for(my $pathidx=0; $pathidx<$pathlength; $pathidx++) {
				$xpathfetch .= "b:partialOrder[\@index='$path[$pathidx]']/b:itemList/";
			}
			$xpathfetch .= "b:dataElement[\@index='$path[$pathlength]']";
		} else {
			$xpathfetch .= 'b:dataElement';
		}

		# Last step
		$xpathfetch .= '/b:dataElementData';
		my(@datanodes)=$context->findnodes($xpathfetch,$bacio);

		if(scalar(@datanodes)!=0) {
			$bundle64=$datanodes[0]->textContent();
		} else {
			$retmesg="XPath $xpathfetch not found";
		}
	};
	
	if($@) {
		if(defined($retmesg)) {
			$retmesg .= "\n".$@;
		} else {
			$retmesg=$@;
		}
	}
}

# We must signal here late errors
if(defined($retmesg)) {
	print $query->header(-status=> '404 Not Found'),
		$query->start_html('EnactProxy Problems'),
		$query->h2('Request not processed because '.$retmesg);
	exit 0;
}

# And now, decoding
my($dec)=decode_base64($bundle64);
my(@headerPars)=(-type=>$asMime);

# Guessing the extension
if(defined($withName)) {
	my($grepline)='grep \'^'.$asMime.'[[:space:]\]\+\w\+\' /etc/mime.types';
	my($ext)=($asMime eq 'text/xml')?'xml':`$grepline`;
	chomp($ext);
	if(defined($ext) && length($ext)>0) {
		$ext =~ s/^[^ \t]+[ \t]+//;
		$ext =~ s/[ \t]+.+$//;
		$withName .= ".$ext"  if(length($ext)>0);
	}
	push(@headerPars, -attachment=>$withName);
}

print $query->header(@headerPars);

print $dec;