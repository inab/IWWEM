#!/usr/bin/perl -W

# $Id$
# IWWEM/WorkflowCommon.pm
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

package IWWEM::WorkflowCommon;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use Mail::Sender;
use POSIX qw(strftime);
use XML::LibXML;

use lib "$FindBin::Bin";
use lib "$FindBin::Bin/..";
use IWWEM::Config;
use IWWEM::MailConfig;

use vars qw($WORKFLOWFILE $SVGFILE $PNGFILE $PDFFILE $WFIDFILE $VIEWERFILE $DEPDIR $EXAMPLESDIR $SNAPSHOTSDIR);

use vars qw($INPUTSFILE $OUTPUTSFILE);

use vars qw($REPORTFILE $STATICSTATUSFILE);

use vars qw($LAUNCHERDIR);

use vars qw($RESULTSDIR $ETCRELDIR $ETCDIR);

use vars qw($COMMANDFILE $PENDINGERASEFILE $PENDINGADDFILE);

use vars qw($ITERATIONSDIR);

use vars qw($COMMANDADD $COMMANDERASE);

use vars qw($PATTERNSFILE);

use vars qw($BACLAVAPARAM $PARAMWFID $PARAMWORKFLOWDEP $PARAMWORKFLOW $PARAMISLAND $PARAMALTVIEWERURI);
use vars qw($PARAMPREFIX $ENCODINGPREFIX $MIMEPREFIX);
use vars qw($WFD_NS $PAT_NS $BACLAVA_NS);

use vars qw($PARAMSAVEEX $PARAMSAVEEXDESC $CATALOGFILE $RESPONSIBLEFILE $LOCKFILE);

use vars qw($COMMENTPRE $COMMENTPOST $COMMENTWM $COMMENTEL $COMMENTES);

use vars qw($LICENSESTART $LICENSESTOP);

use vars qw(%GRAPHREP);

use vars qw($RESPONSIBLENAME $RESPONSIBLEMAIL);

use vars qw($LICENSENAME $LICENSEURI);

# Workflow files constants
$RESPONSIBLENAME='responsibleName';
$RESPONSIBLEMAIL='responsibleMail';
$LICENSENAME='licenseName';
$LICENSEURI='licenseURI';

$WORKFLOWFILE='workflow.xml';
$SVGFILE='workflow.svg';
$PDFFILE='workflow.pdf';
$PNGFILE='workflow.png';
$WFIDFILE='WFID';
$VIEWERFILE='viewerURI.url';

%GRAPHREP=(
	$IWWEM::WorkflowCommon::SVGFILE => 'image/svg+xml',
	$IWWEM::WorkflowCommon::PNGFILE => 'image/png',
	$IWWEM::WorkflowCommon::PDFFILE => 'application/pdf'
);

$DEPDIR='dependencies';
$EXAMPLESDIR='examples';
$SNAPSHOTSDIR='snapshots';
$ITERATIONSDIR='Iterations';

$ETCRELDIR = 'etc';
$ETCDIR = $FindBin::Bin . '/../' .$ETCRELDIR;

use vars qw($LICENSESRELDIR $LICENSESDIR $LICENSESFILE);
$LICENSESRELDIR='licenses';
$LICENSESDIR=$FindBin::Bin . '/../' .$LICENSESRELDIR;
$LICENSESFILE=$LICENSESDIR.'/licenses.xml';

$RESULTSDIR = 'Results';

# Patterns file
$PATTERNSFILE = $ETCDIR . '/' . 'EVpatterns.xml';

# Launcher directory
$LAUNCHERDIR = $FindBin::Bin.'/INBWorkflowLauncher';

$PENDINGERASEFILE='eraselist.txt';
$PENDINGADDFILE='addlist.txt';
$COMMANDFILE='.command';
$COMMANDADD='add';
$COMMANDERASE='erase';

$PARAMWFID='id';
$PARAMWORKFLOW='workflow';
$PARAMWORKFLOWDEP='workflowDep';
$PARAMISLAND='dataIsland';
$PARAMALTVIEWERURI='altViewerURI';
$PARAMSAVEEX='exampleName';
$PARAMSAVEEXDESC='exampleDesc';
$BACLAVAPARAM='BACLAVA_FILE';
$PARAMPREFIX='PARAM_';
$ENCODINGPREFIX='ENCODING_';
$MIMEPREFIX='MIME_';

$CATALOGFILE='catalog.xml';
$RESPONSIBLEFILE='responsible.xml';
$INPUTSFILE='Inputs.xml';
$OUTPUTSFILE='Outputs.xml';
$REPORTFILE='report.xml';
$STATICSTATUSFILE='staticstatus.xml';
$LOCKFILE='.lockfile';

use vars qw($BASE_IWWEM_NS $LIC_NS);

$BASE_IWWEM_NS='http://www.cnio.es/scombio/jmfernandez/inb/IWWEM/';
$WFD_NS = $BASE_IWWEM_NS.'frontend';
$LIC_NS = $BASE_IWWEM_NS.'licenses';
$PAT_NS = $WFD_NS . '/patterns';
$BACLAVA_NS = 'http://org.embl.ebi.escience/baclava/0.1alpha';

$COMMENTPRE = '	This content was generated by ';
$COMMENTPOST =<<COMMENTEOF;
, an
	application of IWWE\&M, INB Interactive Web Workflow Enactor \& Manager
	The workflow enactor itself is based on Taverna core, and
	uses it.
	
	Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
COMMENTEOF

$COMMENTWM=$COMMENTPRE.'workflowmanager'.$COMMENTPOST;
$COMMENTEL=$COMMENTPRE.'enactionlauncher'.$COMMENTPOST;
$COMMENTES=$COMMENTPRE.'enactionstatus'.$COMMENTPOST;

$LICENSESTART=('-' x 30)."LICENSE URI START".('-' x 30);
$LICENSESTOP= ('-' x 30)."LICENSE URI  STOP".('-' x 30);

# Method declaration
sub genUUID();
sub patchXMLString($);
sub depatchPath($);

sub getCGIBaseURI($);
sub genPendingOperationsDir($);
sub createResponsibleFile($$;$);
sub createMailer();
sub enactionGUIURI($;$$);
sub sendResponsibleConfirmedMail($$$$$$$;$$$);
sub sendResponsiblePendingMail($$$$$$$$);
sub sendEnactionMail($$$;$);

sub genCheckList(\@);

# Method bodies
sub genUUID() {
	my($randname)=undef;
	my($RANDH);
	if(open($RANDH,'-|','uuidgen')) {
		$randname=<$RANDH>;
		chomp($randname);
		close($RANDH);
	}
	unless(defined($randname) && length($randname)>0) {
		my(@rarr)=();
		foreach my $step (1..8) {
			push(@rarr,sprintf('%04x',rand(65536)));
		}
		$randname="$rarr[0]$rarr[1]-$rarr[2]-$rarr[3]-$rarr[4]-$rarr[5]$rarr[6]$rarr[7]";
	}
	
	return $randname;
}

sub patchXMLString($) {
	my($trans)=@_;
	
	$trans =~ s/\&/\&amp;/g;
	$trans =~ s/'/\&apos;/g;
	$trans =~ s/"/\&quot;/g;
	$trans =~ s/</\&lt;/g;
	$trans =~ s/>/\&gt;/g;
	
	return $trans;
}

sub depatchPath($) {
	#my($trans)=IWWEM::WorkflowCommon::patchXMLString($_[0]);
	my($trans)=$_[0];
	
	# Deconstructing some work
	$trans =~ s/\&#35;/#/g;
	$trans =~ s/\&#x0*23;/#/g;
	$trans =~ s/\&#47;/\//g;
	$trans =~ s/\&#x0*2[fF];/\//g;
	$trans =~ s/\&amp;/\&/g;
	#$trans =~ s/\&#38;/\&/g;
	#$trans =~ s/\&#x0*26;/\&/g;
	
	return $trans;
}

sub getCGIBaseURI($) {
	my($query)=@_;
	
	my($proto)=($query->https())?'https':'http';
	my($host)=$query->virtual_host();
	my($port)=$query->virtual_port();
	my($relpath)=$query->script_name();
	my($virtualrel)=undef;
	
	$host =~ s/[, ]+.*$//;
	if(exists($ENV{'HTTP_X_FORWARDED_HOST'})) {
		$virtualrel=(split(/[ ,]+/,$ENV{'HTTP_X_FORWARDED_HOST'},2))[0];
	} elsif(exists($ENV{'HTTP_VIA'})) {
		$virtualrel=$ENV{'HTTP_VIA'};
		$virtualrel =~ tr/\n/ /;
		$virtualrel =~ s/^[ \t]+//;
		my(@virparts)=split(/[ \t\n]+/,$virtualrel,3);
		$virtualrel= $virparts[(scalar(@virparts)>1)?1:0];
	#} elsif(exists($ENV{'HTTP_X_FORWARDED_FOR'})) {
	#	
	#} elsif(exists($ENV{'HTTP_FORWARDED'})) {
	#	$virtualrel=$ENV{'HTTP_FORWARDED'};
	}
	
	#foreach my $key ('HTTP_VIA','HTTP_FORWARDED','HTTP_X_FORWARDED_FOR','HTTP_X_FORWARDED_HOST') {
	#	print STDERR "$key IS ",$ENV{$key},"\n"  if(exists($ENV{$key}));
	#}
	
        if(($proto eq 'http' && $port eq '80') || ($proto eq 'https' && $port eq '443')) {
		$port='';
	} else {
		$port = ':'.$port;
	}
	
	if(defined($virtualrel)) {
		# print STDERR "VIRTUALREL IS $virtualrel\n";
		if($virtualrel =~ /^(?:https?:\/\/[^:\/]+)?(?::[0-9]+)?(\/.*)/) {
			$relpath=$1;
		} elsif(exists($IWWEM::Config::HARDHOST{$virtualrel})) {
			$relpath=$IWWEM::Config::HARDHOST{$virtualrel}.substr($relpath,rindex($relpath,'/'));
		}
	}
	
	# print STDERR "GIVEN URL IS '$proto://$host$port$relpath'\n";
	
	return "$proto://$host$port$relpath";
}

# Generates a pending operation directory structure
sub genPendingOperationsDir($) {
	my($oper)=@_;
	
	# Generating a unique identifier
	my($randname);
	my($randfilexml);
	my($randdir);
	do {
		$randname=IWWEM::WorkflowCommon::genUUID();
		$randdir=$IWWEM::Config::CONFIRMDIR.'/'.$randname;
	} while(-d $randdir);

	# Creating workflow directory
	mkpath($randdir);
	my($COM);
	my($FH);
	if(open($COM,'>',$randdir.'/'.$IWWEM::WorkflowCommon::COMMANDFILE)) {
		print $COM $oper;
		close($COM);
		if($oper eq $IWWEM::WorkflowCommon::COMMANDADD) {
			# touch
			open($FH,'>',$randdir.'/'.$IWWEM::WorkflowCommon::PENDINGADDFILE);
		} elsif($oper eq $IWWEM::WorkflowCommon::COMMANDERASE) {
			# touch
			open($FH,'>',$randdir.'/'.$IWWEM::WorkflowCommon::PENDINGERASEFILE);
		}
	}
	
	return ($randname,$randdir,$FH);
}

# Responsible name and mail must be already in UTF-8!
sub createResponsibleFile($$;$) {
	my($basedir,$responsibleMail,$responsibleName)=@_;
	
	$responsibleName=''  unless(defined($responsibleName));
	
	eval {
		my($resdoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
		my($resroot)=$resdoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'responsible');
		$resroot->appendChild($resdoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTEL) ));
		$resroot->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
		$resroot->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
		$resdoc->setDocumentElement($resroot);
		$resdoc->toFile($basedir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE);
	};
	
	return $@;
}

sub createMailer() {
	my($smtp) = Mail::Sender->new({smtp=>$IWWEM::MailConfig::SMTPSERVER,
		auth=>'LOGIN',
		auth_encoded=>$IWWEM::MailConfig::SMTP_ENCODED_CREDS,
		authid=>$IWWEM::MailConfig::SMTPUSER,
		authpwd=>$IWWEM::MailConfig::SMTPPASS
	#	subject=>'Prueba4',
	#	debug=>\*STDERR
	});
	
	return $smtp;
}

sub enactionGUIURI($;$$) {
	my($query,$jobId,$viewerURI)=@_;
	
	my($operURL)=undef;
	
	if(defined($jobId)) {
		if(defined($viewerURI)) {
			$operURL=$viewerURI;
		} else {
			$operURL = IWWEM::WorkflowCommon::getCGIBaseURI($query);
			$operURL =~ s/cgi-bin\/[^\/]+$//;
			$operURL.="enactionviewer.html";
		}
		$operURL.="?jobId=$jobId"  if(defined($jobId));
	}
	
	return $operURL;
}

sub sendResponsibleConfirmedMail($$$$$$$;$$$) {
	my($smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname,$query,$enId,$viewerURI)=@_;
	
	$smtp=IWWEM::WorkflowCommon::createMailer()  unless(defined($smtp));
	my($prettyop)=($command eq $IWWEM::WorkflowCommon::COMMANDADD)?'added':'disposed';
	
	my($operURL)=IWWEM::WorkflowCommon::enactionGUIURI($query,$enId,$viewerURI);
	my($addmesg)='';
	if(defined($operURL)) {
		$addmesg="You can browse it at\r\n\r\n$operURL\r\n";
	}
	
	return $smtp->MailMsg({
		from=>"\"$IWWEM::Common::IWWEMmailname\" <$IWWEM::Common::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your $kind $irelpath has just been $prettyop",
		msg=>"Dear IWWE&M user,\r\n    as you have just confirmed petition ".
			$code.", your $kind $irelpath".(defined($prettyname)?(" (known as $prettyname)"):'').
			" has just been $prettyop\r\n$addmesg\r\n    The INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub sendEnactionMail($$$;$) {
	my($query,$jobId,$responsibleMail,$hasFinished)=@_;
	
	my($smtp)=IWWEM::WorkflowCommon::createMailer();
	my($operURL)=IWWEM::WorkflowCommon::enactionGUIURI($query,$jobId);
	my($status)=defined($hasFinished)?'finished':'started';
	my($dataStatus)=defined($hasFinished)?'results':'progress';
	return $smtp->MailMsg({
		from=>"\"$IWWEM::Common::IWWEMmailname\" <$IWWEM::Common::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your enaction $jobId has just $status",
		msg=>"Dear IWWE&M user,\r\n    your enaction $jobId has just $status. You can see the $dataStatus at\r\n\r\n$operURL\r\n\r\nThe INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub sendResponsiblePendingMail($$$$$$$$) {
	my($query,$smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname)=@_;
	
	$smtp=IWWEM::WorkflowCommon::createMailer()  unless(defined($smtp));
	my($prettyop)=($command eq $IWWEM::WorkflowCommon::COMMANDADD)?'addition':'deletion';
	
	my($operURL)=IWWEM::WorkflowCommon::getCGIBaseURI($query);
	$operURL =~ s/cgi-bin\/[^\/]+$//;
	$operURL.="cgi-bin/IWWEMconfirm?code=$code";
	
	return $smtp->MailMsg({
		from=>"\"$IWWEM::Common::IWWEMmailname\" <$IWWEM::Common::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Confirmation for $prettyop of $kind $irelpath",
		msg=>"Dear IWWE&M user,\r\n    before the $prettyop of $kind $irelpath".
			(defined($prettyname)?(" (known as $prettyname)"):'').
			" you must confirm it by visiting\r\n\r\n$operURL\r\n\r\n    The INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub genCheckList(\@) {
	my($p_IAR)=@_;
	my($retval)=undef;
	foreach my $token (@{$p_IAR}) {
		if(defined($retval)) {
			$retval .= ', '.$token->[0];
		} else {
			$retval=$token->[0];
		}
	}
	return $retval;
}

1;
