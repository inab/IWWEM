#!/usr/bin/perl -W

# $Id$
# IWWEMfs.pl
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

use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::InternalWorkflowList;
use IWWEM::InternalWorkflowList::Constants;
use IWWEM::SelectiveWorkflowList;
use IWWEM::FSConstants;
use IWWEMproxy;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

sub processFSPath($$$$$$$$);

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();
my($retval)='0';
my($dataisland)=undef;
my($dataislandTag)=undef;
my($raw)=1;
my($asMime)=undef;
my($charset)=undef;
my($withName)=undef;
my($autoUUID)=undef;

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
	if($param eq $IWWEM::WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq 'digested') {
		$raw=undef;
	} elsif($param eq 'asMime') {
		$paramval = $asMime = $query->param($param);
	} elsif($param eq 'charset') {
		$paramval = $charset = $query->param($param);
		$paramval = $charset = undef  unless(length($charset)>0);
	} elsif($param eq 'withName') {
		$paramval = $withName = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::AUTOUUID) {
		$paramval = $query->param($param);
		$autoUUID = $paramval  unless($paramval eq '1' || $paramval eq '');
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

# We must signal here errors and exit
if($retval ne '0' || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('IWWEMfs Problems'),
		$query->h2('Request not processed because some parameter was not properly provided'.(($retval ne '0')?" (Errcode=$retval)":'')),
		$query->strong($error);
	exit 0;
}


my($vpath)=$query->path_info();

# Path validation
if(defined($vpath) && length($vpath)>0) {
	my($patherr)=undef;
	my($relpath)=$vpath;
	
	if(substr($relpath,0,1) eq '/') {
		$relpath=substr($relpath,1);
		if(length($relpath)==0) {
			# Whole information listing, as workflows
			my($iwfl)=IWWEM::InternalWorkflowList->new();
			$iwfl->sendWorkflowList(\*STDOUT,$query,$retval,undef,$dataislandTag);
		} else {
			my($kind)=undef;
			foreach my $check (@IWWEM::FSConstants::PATHCHECK) {
				my($virt)=$check->[0];
				if(substr($relpath,0,length($virt)) eq $virt) {
					$kind=$check;
					$relpath=substr($relpath,length($virt));
					last;
				}
			}
			
			if(defined($kind)) {
				# It is from the identifiers namespace!
				if($kind->[0] eq $IWWEM::FSConstants::VIRTIDDIR && length($relpath)>0) {
					my($prepath,$idpath,$postpath)=split('/',$relpath,3);
					unless((defined($prepath) && length($prepath)>0) || !defined($idpath) || length($idpath)==0) {
						if($idpath =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
							$kind=$IWWEM::FSConstants::ENKIND;
							$relpath=$1;
						} else {
							$kind=$IWWEM::FSConstants::WFKIND;
							if($idpath =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
								$relpath=join('/',$1,$IWWEM::WorkflowCommon::SNAPSHOTSDIR,$2);
							} elsif($idpath =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
								$relpath=join('/',$1,$IWWEM::WorkflowCommon::EXAMPLESDIR,$2.'.xml');
							} elsif($idpath =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
								$relpath=$1;
							} else {
								$relpath=$idpath;
							}
						}
						
						$relpath = '/'.$relpath;
						$relpath .= '/' . $postpath  if(defined($postpath));
					}
				}
				
				$patherr=processFSPath($query,$relpath,$kind,$dataislandTag,$raw,$asMime,$charset,$withName);
			} else {
				$patherr="Your path does not follow any of these items: ".IWWEM::InternalWorkflowList::genCheckList(@IWWEM::FSConstants::PATHCHECK);
			}
		}
	} else {
		$patherr="There is no root";
	}
	
	if(defined($patherr)) {
		# Error path!!!!
		$retval="'$vpath' is NOT a valid IWWE&amp;M path!!!<br>Reason: $patherr\n";
		print STDERR $retval;
	}
}

if($retval ne '0' || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '404 Not found'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('IWWEMfs Message'),
		$query->h2('Request not processed because some path component was not properly provided'.(($retval ne '0')?" (Errcode=$retval)":'')),
		$query->strong($error);
	exit 0;
}


exit(0);

sub processFSPath($$$$$$$$) {
	my($query,$relpath,$globalkind,$dataislandTag,$raw,$asMime,$charset,$withName)=@_;
	my($patherr)=undef;
	
	my(@idhist)=();
	my(@kindhist)=($globalkind);
	my($lastkind)=$globalkind;
	my($vpath)=undef;
	
	while(length($relpath)!=0) {
		if(substr($relpath,0,1) ne '/') {
			$patherr='Invalid path: '.$relpath;
			last;
		}
		
		$relpath=substr($relpath,1);
		
		if(defined($lastkind->[2])) {
			my($relsep)=index($relpath,'/');
			my($relid)=($relsep==-1)?$relpath:substr($relpath,0,$relsep);
			$relpath=($relsep!=-1)?substr($relpath,$relsep):'';

			# Let's validate
			my($newkind)=undef;
			foreach my $check (@{$lastkind->[2]}) {
				my($virt)=$check->[0];

				# Matching...
				if((substr($virt,0,1) eq '^' && $relid =~ /$virt$/) || ($virt eq $relid)) {
					if(defined($check->[1]) && $check->[1]==$IWWEM::FSConstants::ISFORBIDDEN) {
						$patherr='Path fragment '.$virt.' is forbidden at this point';
					} else {
						$newkind=$check;
					}
					last;
				}
			}

			if(defined($newkind)) {
				push(@idhist,$relid);
				push(@kindhist,$newkind);
				$lastkind=$newkind;
			} else {
				unless(defined($patherr)) {
					$patherr='Path fragment '.$relid.' does not match any of these items: '.IWWEM::InternalWorkflowList::genCheckList(@{$kindhist[$#kindhist][2]});
				}
				last;
			}
		} else {
			$vpath=$relpath;
			last;
		}
	}
	my($isWSDL)=undef;
	foreach my $keyword ($query->keywords()) {
		$isWSDL=1  if($keyword eq 'wsdl');
	}
	
	if(!defined($patherr)) {
		my($iddepth)=scalar(@idhist);
		my($kinddepth)=scalar(@kindhist);
		my($kindclass)=$lastkind->[1];
		
		if($iddepth==0) {
			# Listing of all workflows or all enactions as workflows.
			my($wfid)=($globalkind->[0] eq $IWWEM::FSConstants::VIRTJOBDIR) ? $IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX : undef;
			my($iwfl)=IWWEM::InternalWorkflowList->new($wfid);
			$iwfl->sendWorkflowList(\*STDOUT,$query,$retval,undef,$dataislandTag);
		} elsif($iddepth==1) {
			# Single workflows/enactions
			unless(defined($isWSDL)) {
				if($globalkind->[0] eq $IWWEM::FSConstants::VIRTJOBDIR) {
					# Description as a status for enactions!
					my(@jobs)=($idhist[0]);
					
					# This object is needed in some cases...
					my($iwfl)=IWWEM::InternalWorkflowList->new(undef,1);
					$iwfl->sendEnactionReport($query,\@jobs,undef,undef,undef,undef,undef,$autoUUID);
				} else {
					# Description as a workflow list for workflows...
					my($swfl)=IWWEM::SelectiveWorkflowList->new($idhist[0]);
					$swfl->sendWorkflowList(\*STDOUT,$query,$retval,undef,$dataislandTag);
					#my($iwfl)=IWWEM::InternalWorkflowList->new($idhist[0]);
					#$iwfl->sendWorkflowList(\*STDOUT,$query,$retval,undef,$dataislandTag);
				}
			} else {
				generateWSDL((($globalkind->[0] eq $IWWEM::FSConstants::VIRTJOBDIR)?$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX:$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX).$idhist[0]);
			}
		} elsif(!defined($kindclass)) {
			my(@headers)=();
			my($swfl)=IWWEM::SelectiveWorkflowList->new($idhist[0]);
			my($path)=$swfl->virt2real($globalkind->[1],@idhist);

			IWWEMproxy::rawAnswer($query,$path,@headers);
		} elsif($iddepth==2) {
			if($kindclass < $IWWEM::FSConstants::ISRAWDIR) {
				IWWEMproxy::processBaclavaQuery($query,$retval,$idhist[0],$asMime,undef,undef,($kindclass == $IWWEM::FSConstants::ISOUTPUT)?'O':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No digested information available from '.join('/',@idhist);
			}
		} elsif($iddepth==3) {
			if($kindclass==$IWWEM::FSConstants::ISIDDIR && $globalkind->[0] eq $IWWEM::FSConstants::VIRTWORKFLOWDIR) {
				my($jobId)=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
				unless(defined($isWSDL)) {
					# Description as a status for snapshots!
					my(@jobs)=($jobId);
					
					# This object is needed in some cases...
					my($iwfl)=IWWEM::InternalWorkflowList->new(undef,1);
					$iwfl->sendEnactionReport($query,\@jobs,undef,undef,undef,undef,undef,$autoUUID);
				} else {
					generateWSDL($jobId);
				}
			} elsif($kindclass==$IWWEM::FSConstants::ISEXAMPLE || ($globalkind->[0] eq $IWWEM::FSConstants::VIRTJOBDIR && $kindclass==$IWWEM::FSConstants::ISIDDIR)) {
				my($jobId)=undef;
				my($step)=undef;
				
				if($kindclass == $IWWEM::FSConstants::ISEXAMPLE) {
					my($exid)=$idhist[2];
					$exid =~ s/\.xml$//;
					$jobId=$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX.$idhist[0].':'.$exid;
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,undef,($kindclass != $IWWEM::FSConstants::ISEXAMPLE)?'B':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} elsif($iddepth==4 || $iddepth==6 || $iddepth==8) {
			if($kindclass < $IWWEM::FSConstants::ISRAWDIR) {
				my($jobId)=undef;
				my($step)=undef;
				my($iteration)=undef;
				
				if($globalkind->[0] eq $IWWEM::FSConstants::VIRTWORKFLOWDIR) {
					$jobId=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
					$step=$idhist[4]  if($iddepth==6);
					$iteration=$idhist[6]  if($iddepth==8);
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
					$iteration=$idhist[4]  if($iddepth==6);
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,($kindclass == $IWWEM::FSConstants::ISOUTPUT)?'O':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} elsif($iddepth==5 || $iddepth==7) {
			if($kindclass==$IWWEM::FSConstants::ISIDDIR) {
				my($jobId)=undef;
				my($step)=undef;
				my($iteration)=undef;
				
				if($globalkind->[0] eq $IWWEM::FSConstants::VIRTWORKFLOWDIR) {
					$jobId=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
					$step=$idhist[4];
					$iteration=$idhist[6]  if($iddepth==7);
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
					$iteration=$idhist[4];
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,($kindclass != $IWWEM::FSConstants::ISINPUT)?'B':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} else {
			$patherr='No valid path from '.join('/',@idhist);
			print STDERR "JOIN PATH ERR ",join('/',@idhist),"\n";
		}
	}
	
	return $patherr;
}

sub generateWSDL($) {
	my($id)=@_;
	
	my($baseListDir,$listDir,$uuidPrefix,$subId,$isSnapshot);
	if(index($id,$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX)==0) {
		$baseListDir=$IWWEM::FSConstants::VIRTJOBDIR;
		$listDir=$IWWEM::Config::JOBDIR;
		$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX;
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
			$subId=$1;
		}
	} elsif($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+)/) {
		$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR . '/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
		$uuidPrefix=$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX . $1 . ':';
		
		$isSnapshot=1;
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$subId=$2;
		}
	} else {
		$baseListDir=$IWWEM::FSConstants::VIRTWORKFLOWDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR;
		$uuidPrefix='';
		
		if($id =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
			$subId=$1;
		} elsif(length($id)>0) {
			$subId=$id;
		}
	}
	
	my($iwfl)=IWWEM::InternalWorkflowList->new($id);
	my($desc)=$iwfl->getWorkflowInfo($subId,$listDir,$uuidPrefix,$isSnapshot);
	
	my $parser = XML::LibXML->new();
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
	
	# TODO Translate to WSDL using an XSLT
}
