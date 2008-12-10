#!/usr/bin/perl -W

# $Id: IWWEMproxy.pl 1278 2008-04-09 13:09:38Z jmfernandez $
# IWWEMconfirm.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
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
# Original IWWE&M concept, design and coding done by José María Fernández González, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

use CGI;
use Encode;
use File::Copy;
use File::Path;
use FindBin;
use XML::LibXML;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::Taverna1WorkflowKind;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();
my($code)=undef;
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
		$paramval = $code = $query->param('code');
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

# Second, do it!

my($codedir)=$IWWEM::Config::CONFIRMDIR.'/'.$code;
my($commandfile)=$codedir.'/'.$IWWEM::WorkflowCommon::COMMANDFILE;
my($command)=undef;
if($retval eq '0' && !$query->cgi_error() && defined($code) && index($code,'/')==-1 && -d $codedir && -r $commandfile) {
	my($FH);
	if(open($FH,'<',$commandfile)) {
		$command=<$FH>;
		
		close($FH);
		
		# Command validation
		$command=undef  if($command ne $IWWEM::WorkflowCommon::COMMANDERASE && $command ne $IWWEM::WorkflowCommon::COMMANDADD);
	}
}

# Skipping non-valid commands
unless(defined($command)) {
	my $error = $query->cgi_error;
	$error = '404 Not Found'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('IWWEMconfirm Problems'),
		$query->h2('Request not processed because "code" parameter was not properly provided'),
		$query->strong($error);
	
	exit 0;
}

my $parser = XML::LibXML->new();
my $context = XML::LibXML::XPathContext->new();
$context->registerNs('s',$IWWEM::Taverna1WorkflowKind::XSCUFL_NS);
$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);

my($smtp) = IWWEM::WorkflowCommon::createMailer();

my(@done)=();

if($command eq $IWWEM::WorkflowCommon::COMMANDERASE) {
	my($EH);
	if(open($EH,'<',$codedir.'/'.$IWWEM::WorkflowCommon::PENDINGERASEFILE)) {
		my($irelpath)=undef;
		while($irelpath=<$EH>) {
			chomp($irelpath);
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);

			# Checking rules should be inserted here...
			my(@predone)=();
			my($email)=undef;
			my($kind)=undef;
			my($prettyname)=undef;
			if($irelpath =~ /^$IWWEM::WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				eval {
					my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);
					
					my($transsnapId)=IWWEM::WorkflowCommon::patchXMLString($snapId);
					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
					foreach my $snap (@eraseSnap) {
						$prettyname=$snap->getAttribute('name');
						$email=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						$snap->parentNode->removeChild($snap);
					}
					$catdoc->toFile($catfile);
				};
				rmtree($IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$snapId);
			} elsif($irelpath =~ /^$IWWEM::WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				eval {
					my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);
					
					my($transexamId)=IWWEM::WorkflowCommon::patchXMLString($examId);
					my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
					foreach my $exam (@eraseExam) {
						$prettyname=$exam->getAttribute('name');
						$email=$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						$exam->parentNode->removeChild($exam);
					}
					$catdoc->toFile($catfile);
				};
				unlink($IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$examId.'.xml');
			} else {
				# Workflows and enactions
				my($jobdir)=undef;
				
				if($irelpath =~ /^$IWWEM::WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir=$IWWEM::Config::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir=$IWWEM::Config::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
					
					# Let's gather information about what is going to be destroyed
					eval {
						my($excatfile) = $jobdir.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
						my($excatdoc)=$parser->parse_file($excatfile);
						my(@eraseExam)=$context->findnodes("//sn:example",$excatdoc);
						
						foreach my $exam (@eraseExam) {
							push(@predone,[
								'example',
								$IWWEM::WorkflowCommon::EXAMPLEPREFIX.$exam->getAttribute('uuid'),
								1,
								$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL),
								$exam->getAttribute('name')
							]);
						}
					};
					eval {
						my($sncatfile) = $jobdir.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
						my($sncatdoc)=$parser->parse_file($sncatfile);
						my(@eraseSnap)=$context->findnodes("//sn:snapshot",$sncatdoc);
						
						foreach my $snap (@eraseSnap) {
							push(@predone,[
								'snapshot',
								$IWWEM::WorkflowCommon::SNAPSHOTPREFIX.$snap->getAttribute('uuid'),
								1,
								$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL),
								$snap->getAttribute('name')
							]);
						}
					};
					
				}
				
				eval {
					my($responsiblefile)=$jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
					my($rp)=$parser->parse_file($responsiblefile);
					$email=$rp->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					
					my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
					my($wf)=$parser->parse_file($workflowfile);
					
					my @nodelist = $wf->getElementsByTagNameNS($IWWEM::Taverna1WorkflowKind::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
					
				};
				
				# And last, unlink!
				rmtree($jobdir);
			}
			push(@predone,[
				$kind,
				$irelpath,
				1,
				$email,
				$prettyname
			]);
			
			# Now, we must send an informative e-mail
			if(defined($email)) {
				foreach my $p_done (@predone) {
					my($prett)=$p_done->[4];
					$prett=undef  if(defined($prett) && length($prett)==0);
					IWWEM::WorkflowCommon::sendResponsibleConfirmedMail($smtp,$code,$p_done->[0],$command,$p_done->[1],$p_done->[3],$prett);
				}
				push(@done,@predone);
			} else {
				push(@done,[$kind,$irelpath,undef,$email,$prettyname]);
			}
		}
		close($EH);
	}
} elsif($command eq $IWWEM::WorkflowCommon::COMMANDADD) {
	my($EH);
	if(open($EH,'<',$codedir.'/'.$IWWEM::WorkflowCommon::PENDINGADDFILE)) {
		my($irelpath)=undef;
		while($irelpath=<$EH>) {
			chomp($irelpath);
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			my($email)=undef;
			my($kind)=undef;
			my($prettyname)=undef;
			my($viewerURL)=IWWEM::WorkflowCommon::enactionGUIURI($query);
			
			if($irelpath =~ /^$IWWEM::WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				
				my($workflowdir)=$IWWEM::Config::WORKFLOWDIR.'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
				move($codedir.'/'.$snapId,$workflowdir.'/'.$snapId);
				
				my($VIE);
				if(open($VIE,'<',$workflowdir.'/'.$snapId.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
					$viewerURL=<$VIE>;
					close($VIE);
				}

				eval {
					my($catfile)=$codedir.'/'.$snapId.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;
					my($catres)=$parser->parse_file($catfile);
					my($snap)=$catres->documentElement();
					$prettyname=$snap->getAttribute('name');
					$email=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					
					# Adding to the catalog file
					my($newcatfile)=$workflowdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
					# File must exist
					my($newcatres)=$parser->parse_file($newcatfile);
					# Are there old entries?
					my($transsnapId)=IWWEM::WorkflowCommon::patchXMLString($snapId);
					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$newcatres);
					foreach my $snapNode (@eraseSnap) {
						$snapNode->parentNode->removeChild($snapNode);
					}
					# And now, new entries
					$newcatres->documentElement()->appendChild($newcatres->importNode($snap));
					# Updated results must be saved
					$newcatres->toFile($newcatfile);
					# And tmp catfile must be removed
					unlink($catfile);
				};
			} elsif($irelpath =~ /^$IWWEM::WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				
				my($workflowdir)=$IWWEM::Config::WORKFLOWDIR.'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR;
				move($codedir.'/'.$examId.'.xml',$workflowdir);
				
				eval {
					my($catfile)=$codedir.'/'.$examId.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;
					my($catres)=$parser->parse_file($catfile);
					my($exam)=$catres->documentElement();
					$prettyname=$exam->getAttribute('name');
					$email=$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					
					# Adding to the catalog file
					my($newcatfile)=$workflowdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
					# File must exist
					my($newcatres)=$parser->parse_file($newcatfile);
					# Are there old entries?
					my($transexamId)=IWWEM::WorkflowCommon::patchXMLString($examId);
					my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$newcatres);
					foreach my $examNode (@eraseExam) {
						$examNode->parentNode->removeChild($examNode);
					}
					# And now, new entries
					$newcatres->documentElement()->appendChild($newcatres->importNode($exam));
					# Updated results must be saved
					$newcatres->toFile($newcatfile);
					# And tmp catfile must be removed
					unlink($catfile);
				};
			} else {
				my($jobdir)=$codedir;
				my($destdir)=undef;
				
				if($irelpath =~ /^$IWWEM::WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir.='/'.$1;
					$destdir=$IWWEM::Config::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir.='/'.$irelpath;
					$destdir=$IWWEM::Config::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($wfres)=$parser->parse_file($jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE);
					
					$email=$wfres->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					
					my($wf)=$parser->parse_file($jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE);
					my @nodelist = $wf->getElementsByTagNameNS($IWWEM::Taverna1WorkflowKind::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
				};
				
				if($@) {
					$email=undef;
					print STDERR "JOB $jobdir DEST $destdir WTF????? $@\n";
				} else {
					move($jobdir,$destdir);
					my($VIE);
					if(open($VIE,'<',$destdir.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
						$viewerURL=<$VIE>;
						close($VIE);
					}
				}
			}
			my(@predone)=();
			push(@predone,[
				$kind,
				$irelpath,
				1,
				$email,
				$prettyname
			]);
			
			# Now, we must send an informative e-mail
			if(defined($email)) {
				$prettyname=undef  if(defined($prettyname) && length($prettyname)==0);
				IWWEM::WorkflowCommon::sendResponsibleConfirmedMail($smtp,$code,$kind,$command,$irelpath,$email,$prettyname,$query,($kind eq 'snapshot')?$irelpath:undef,$viewerURL);
				push(@done,@predone);
			} else {
				push(@done,[$kind,$irelpath,undef,$email,$prettyname]);
			}
		}
		close($EH);
	}
}

# Erasing pending directory
rmtree($codedir);

# And composing something...
print $query->header(-type=>'text/html',-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');

my($tabledone)='<table border="1" align="center">';
foreach my $doel (@done) {
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
<a href="$operURL">IWWE&amp;M</a> v0.6.4 IWWEMconfirm operations report</h1></div>
$tabledone
	</body>
</html>
EOF
