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

use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;

use lib "$FindBin::Bin";
use IWWEM::Config;
use WorkflowCommon;
use workflowmanager;
use enactionstatus;
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
	if($param eq $WorkflowCommon::PARAMISLAND) {
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
			my($p_workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot)=workflowmanager::gatherWorkflowList();
			workflowmanager::sendWorkflowList($query,$retval,undef,@{$p_workflowlist},$baseListDir,$listDir,$uuidPrefix,$isSnapshot,$dataislandTag);
		} else {
			my($kind)=undef;
			foreach my $check (@WorkflowCommon::PATHCHECK) {
				my($virt)=$check->[0];
				if(substr($relpath,0,length($virt)) eq $virt) {
					$kind=$check;
					$relpath=substr($relpath,length($virt));
					last;
				}
			}
			
			if(defined($kind)) {
				# It is from the identifiers namespace!
				if($kind->[0] eq $WorkflowCommon::VIRTIDDIR && length($relpath)>0) {
					my($prepath,$idpath,$postpath)=split('/',$relpath,3);
					unless((defined($prepath) && length($prepath)>0) || !defined($idpath) || length($idpath)==0) {
						if($idpath =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
							$kind=$WorkflowCommon::ENKIND;
							$relpath=$1;
						} else {
							$kind=$WorkflowCommon::WFKIND;
							if($idpath =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
								$relpath=join('/',$1,$WorkflowCommon::SNAPSHOTSDIR,$2);
							} elsif($idpath =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
								$relpath=join('/',$1,$WorkflowCommon::EXAMPLESDIR,$2.'.xml');
							} elsif($idpath =~ /^$WorkflowCommon::WORKFLOWPREFIX([^:]+)$/) {
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
				$patherr="Your path does not follow any of these items: ".WorkflowCommon::genCheckList(@WorkflowCommon::PATHCHECK);
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
					if(defined($check->[1]) && $check->[1]==$WorkflowCommon::ISFORBIDDEN) {
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
					$patherr='Path fragment '.$relid.' does not match any of these items: '.WorkflowCommon::genCheckList(@{$kindhist[$#kindhist][2]});
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
			my($wfid)=($globalkind->[0] eq $WorkflowCommon::VIRTJOBDIR) ? $WorkflowCommon::ENACTIONPREFIX : undef;
			my($p_workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot)=workflowmanager::gatherWorkflowList($wfid);
			workflowmanager::sendWorkflowList($query,$retval,undef,@{$p_workflowlist},$baseListDir,$listDir,$uuidPrefix,$isSnapshot,$dataislandTag);
		} elsif($iddepth==1) {
			# Single workflows/enactions
			unless(defined($isWSDL)) {
				if($globalkind->[0] eq $WorkflowCommon::VIRTJOBDIR) {
					# Description as a status for enactions!
					my(@jobs)=($idhist[0]);
					enactionstatus::sendEnactionReport($query,@jobs);
				} else {
					# Description as a workflow list for workflows...
					my($p_workflowlist,$baseListDir,$listDir,$uuidPrefix,$isSnapshot)=workflowmanager::gatherWorkflowList($idhist[0]);
					workflowmanager::sendWorkflowList($query,$retval,undef,@{$p_workflowlist},$baseListDir,$listDir,$uuidPrefix,$isSnapshot,$dataislandTag);
				}
			} else {
				generateWSDL((($globalkind->[0] eq $WorkflowCommon::VIRTJOBDIR)?$WorkflowCommon::ENACTIONPREFIX:$WorkflowCommon::WORKFLOWPREFIX).$idhist[0]);
			}
		} elsif(!defined($kindclass)) {
				my(@headers)=();
				IWWEMproxy::rawAnswer($query,join('/',$globalkind->[1],@idhist),@headers);
		} elsif($iddepth==2) {
			if($kindclass < $WorkflowCommon::ISRAWDIR) {
				IWWEMproxy::processBaclavaQuery($query,$retval,$idhist[0],$asMime,undef,undef,($kindclass == $WorkflowCommon::ISOUTPUT)?'O':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No digested information available from '.join('/',@idhist);
			}
		} elsif($iddepth==3) {
			if($kindclass==$WorkflowCommon::ISIDDIR && $globalkind->[0] eq $WorkflowCommon::VIRTWORKFLOWDIR) {
				my($jobId)=$WorkflowCommon::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
				unless(defined($isWSDL)) {
					# Description as a status for snapshots!
					my(@jobs)=($jobId);
					enactionstatus::sendEnactionReport($query,@jobs);
				} else {
					generateWSDL($jobId);
				}
			} elsif($kindclass==$WorkflowCommon::ISEXAMPLE || ($globalkind->[0] eq $WorkflowCommon::VIRTJOBDIR && $kindclass==$WorkflowCommon::ISIDDIR)) {
				my($jobId)=undef;
				my($step)=undef;
				
				if($kindclass == $WorkflowCommon::ISEXAMPLE) {
					my($exid)=$idhist[2];
					$exid =~ s/\.xml$//;
					$jobId=$WorkflowCommon::EXAMPLEPREFIX.$idhist[0].':'.$exid;
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,undef,($kindclass != $WorkflowCommon::ISEXAMPLE)?'B':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} elsif($iddepth==4 || $iddepth==6 || $iddepth==8) {
			if($kindclass < $WorkflowCommon::ISRAWDIR) {
				my($jobId)=undef;
				my($step)=undef;
				my($iteration)=undef;
				
				if($globalkind->[0] eq $WorkflowCommon::VIRTWORKFLOWDIR) {
					$jobId=$WorkflowCommon::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
					$step=$idhist[4]  if($iddepth==6);
					$iteration=$idhist[6]  if($iddepth==8);
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
					$iteration=$idhist[4]  if($iddepth==6);
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,($kindclass == $WorkflowCommon::ISOUTPUT)?'O':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} elsif($iddepth==5 || $iddepth==7) {
			if($kindclass==$WorkflowCommon::ISIDDIR) {
				my($jobId)=undef;
				my($step)=undef;
				my($iteration)=undef;
				
				if($globalkind->[0] eq $WorkflowCommon::VIRTWORKFLOWDIR) {
					$jobId=$WorkflowCommon::SNAPSHOTPREFIX.$idhist[0].':'.$idhist[2];
					$step=$idhist[4];
					$iteration=$idhist[6]  if($iddepth==7);
				} else {
					$jobId=$idhist[0];
					$step=$idhist[2];
					$iteration=$idhist[4];
				}
				IWWEMproxy::processBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,($kindclass != $WorkflowCommon::ISINPUT)?'B':'I',$vpath,undef,$withName,$charset,$raw);
			} else {
				$patherr='No valid path from '.join('/',@idhist);
			}
		} else {
			$patherr='No valid path from '.join('/',@idhist);
			print STDERR "JOIN ",join('/',@idhist),"\n";
		}
	}
	
	return $patherr;
}

sub generateWSDL($) {
	my($id)=@_;
	
	my($baseListDir,$listDir,$uuidPrefix,$subId,$isSnapshot);
	if(index($id,$WorkflowCommon::ENACTIONPREFIX)==0) {
		$baseListDir=$WorkflowCommon::VIRTJOBDIR;
		$listDir=$IWWEM::Config::JOBDIR;
		$uuidPrefix=$WorkflowCommon::ENACTIONPREFIX;
		
		if($id =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
			$subId=$1;
		}
	} elsif($id =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+)/) {
		$baseListDir=$WorkflowCommon::VIRTWORKFLOWDIR . '/'.$1.'/'.$WorkflowCommon::SNAPSHOTSDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR .'/'.$1.'/'.$WorkflowCommon::SNAPSHOTSDIR;
		$uuidPrefix=$WorkflowCommon::SNAPSHOTPREFIX . $1 . ':';
		
		$isSnapshot=1;
		
		if($id =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$subId=$2;
		}
	} else {
		$baseListDir=$WorkflowCommon::VIRTWORKFLOWDIR;
		$listDir=$IWWEM::Config::WORKFLOWDIR;
		$uuidPrefix='';
		
		if($id =~ /^$WorkflowCommon::WORKFLOWPREFIX([^:]+)$/) {
			$subId=$1;
		} elsif(length($id)>0) {
			$subId=$id;
		}
	}
	my $parser = XML::LibXML->new();
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
	$context->registerNs('sn',$WorkflowCommon::WFD_NS);
	
	my($desc)=workflowmanager::getWorkflowInfo($parser,$context,$listDir,$subId,$uuidPrefix,$isSnapshot);
	
	# TODO Translate to WSDL using an XSLT
}
