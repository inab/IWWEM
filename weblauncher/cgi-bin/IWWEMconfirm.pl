#!/usr/bin/perl -W

# $Id: IWWEMproxy.pl 1278 2008-04-09 13:09:38Z jmfernandez $
# IWWEMconfirm.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use CGI;
use Encode;
use File::Copy;
use File::Path;
use FindBin;
use XML::LibXML;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Web applications do need this!
$|=1;
	
my($query)=CGI->new();
my($code)=undef;

# First step, getting code
foreach my $param ($query->param()) {
	if($param eq 'code') {
		$code=$query->param('code');
	}
}

# Second, do it!

my($codedir)=$WorkflowCommon::CONFIRMDIR.'/'.$code;
my($commandfile)=$codedir.'/'.$WorkflowCommon::COMMANDFILE;
my($command)=undef;
if(defined($code) && index($code,'/')==-1 && -d $codedir && -r $commandfile) {
	my($FH);
	if(open($FH,'<',$commandfile)) {
		$command=<$FH>;
		
		close($FH);
		
		# Command validation
		$command=undef  if($command ne $WorkflowCommon::COMMANDERASE && $command ne $WorkflowCommon::COMMANDADD);
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
$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
$context->registerNs('sn',$WorkflowCommon::WFD_NS);

my($smtp) = WorkflowCommon::createMailer();

my(@done)=();

if($command eq $WorkflowCommon::COMMANDERASE) {
	my($EH);
	if(open($EH,'<',$codedir.'/'.$WorkflowCommon::PENDINGERASEFILE)) {
		my($irelpath)=undef;
		while($irelpath=<$EH>) {
			chomp($irelpath);
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);

			# Checking rules should be inserted here...
			my($email)=undef;
			my($kind)=undef;
			my($prettyname)=undef;
			if($irelpath =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				eval {
					my($catfile)=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);
					
					my($transsnapId)=WorkflowCommon::patchXMLString($snapId);
					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
					foreach my $snap (@eraseSnap) {
						$prettyname=$snap->getAttribute('name');
						$email=$snap->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						$snap->parentNode->removeChild($snap);
					}
					$catdoc->toFile($catfile);
				};
				rmtree($WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$snapId);
			} elsif($irelpath =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				eval {
					my($catfile)=$WorkflowCommon::WORKFLOWDIR .'/'.$wfexam.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);
					
					my($transexamId)=WorkflowCommon::patchXMLString($examId);
					my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
					foreach my $exam (@eraseExam) {
						$prettyname=$exam->getAttribute('name');
						$email=$exam->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						$exam->parentNode->removeChild($exam);
					}
					$catdoc->toFile($catfile);
				};
				unlink($WorkflowCommon::WORKFLOWDIR .'/'.$wfexam.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$examId.'.xml');
			} else {
				my($jobdir)=undef;
				
				if($irelpath =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir=$WorkflowCommon::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir=$WorkflowCommon::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($responsiblefile)=$jobdir.'/'.$WorkflowCommon::RESPONSIBLEFILE;
					my($rp)=$parser->parse_file($responsiblefile);
					$email=$rp->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					my($workflowfile)=$jobdir.'/'.$WorkflowCommon::WORKFLOWFILE;
					my($wf)=$parser->parse_file($workflowfile);
					
					my @nodelist = $wf->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
					
				};
				
				# And last, unlink!
				rmtree($jobdir);
			}
			
			# Now, we must send an informative e-mail
			if(defined($email)) {
				$prettyname=undef  if(defined($prettyname) && length($prettyname)==0);
				WorkflowCommon::sendResponsibleConfirmedMail($smtp,$code,$kind,$command,$irelpath,$email,$prettyname);
				push(@done,[$kind,$irelpath,1]);
			} else {
				push(@done,[$kind,$irelpath,undef]);
			}
		}
		close($EH);
	}
} elsif($command eq $WorkflowCommon::COMMANDADD) {
	my($EH);
	if(open($EH,'<',$codedir.'/'.$WorkflowCommon::PENDINGADDFILE)) {
		my($irelpath)=undef;
		while($irelpath=<$EH>) {
			chomp($irelpath);
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			my($email)=undef;
			my($kind)=undef;
			my($prettyname)=undef;
			
			if($irelpath =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				
				my($workflowdir)=$WorkflowCommon::WORKFLOWDIR.'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR;
				move($codedir.'/'.$snapId,$workflowdir.'/'.$snapId);
				
				eval {
					my($catfile)=$codedir.'/'.$snapId.'_'.$WorkflowCommon::CATALOGFILE;
					my($catres)=$parser->parse_file($catfile);
					my($snap)=$catres->documentElement();
					$prettyname=$snap->getAttribute('name');
					$email=$snap->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					# Adding to the catalog file
					my($newcatfile)=$workflowdir.'/'.$WorkflowCommon::CATALOGFILE;
					# File must exist
					my($newcatres)=$parser->parse_file($newcatfile);
					# Are there old entries?
					my($transsnapId)=WorkflowCommon::patchXMLString($snapId);
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
			} elsif($irelpath =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				
				my($workflowdir)=$WorkflowCommon::WORKFLOWDIR.'/'.$wfexam.'/'.$WorkflowCommon::EXAMPLESDIR;
				move($codedir.'/'.$examId.'.xml',$workflowdir);
				
				eval {
					my($catfile)=$codedir.'/'.$examId.'_'.$WorkflowCommon::CATALOGFILE;
					my($catres)=$parser->parse_file($catfile);
					my($exam)=$catres->documentElement();
					$prettyname=$exam->getAttribute('name');
					$email=$exam->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					# Adding to the catalog file
					my($newcatfile)=$workflowdir.'/'.$WorkflowCommon::CATALOGFILE;
					# File must exist
					my($newcatres)=$parser->parse_file($newcatfile);
					# Are there old entries?
					my($transexamId)=WorkflowCommon::patchXMLString($examId);
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
				
				if($irelpath =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir.='/'.$1;
					$destdir=$WorkflowCommon::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir.='/'.$irelpath;
					$destdir=$WorkflowCommon::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($wfres)=$parser->parse_file($jobdir.'/'.$WorkflowCommon::RESPONSIBLEFILE);
					
					$email=$wfres->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					my($wf)=$parser->parse_file($jobdir.'/'.$WorkflowCommon::WORKFLOWFILE);
					my @nodelist = $wf->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
				};
				
				if($@) {
					$email=undef;
					print STDERR "JOB $jobdir DEST $destdir WTF????? $@\n";
				} else {
					move($jobdir,$destdir);
				}
			}
			
			
			# Now, we must send an informative e-mail
			if(defined($email)) {
				$prettyname=undef  if(defined($prettyname) && length($prettyname)==0);
				WorkflowCommon::sendResponsibleConfirmedMail($smtp,$code,$kind,$command,$irelpath,$email,$prettyname,$query,($kind eq 'snapshot')?$irelpath:undef);
				push(@done,[$kind,$irelpath,1]);
			} else {
				push(@done,[$kind,$irelpath,undef]);
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
	$tabledone .="<tr><td>$doel->[0]</td><td>$doel->[1]</td><td><b>".((defined($doel->[2]))?'':'not ')."$command</b></td></tr>";
}
$tabledone .='</table>';

my($operURL)=WorkflowCommon::getCGIBaseURI($query);
$operURL =~ s/cgi-bin\/[^\/]+$//;

print <<EOF;
<html>
	<head><title>IWWE&amp;M IWWEMconfirm operations report</title></head>
	<body>
<div align="center"><h1 style="font-size:32px;"><a href="http://www.inab.org/"><img src="../style/logo-inb-small.png" style="vertical-align:middle" alt="INB" title="INB" border="0"></a>
<a href="$operURL">IWWE&amp;M</a> v0.6.2 IWWEMconfirm operations report</h1></div>
$tabledone
	</body>
</html>
EOF
