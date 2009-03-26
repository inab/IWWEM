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

use vars qw($INPUTSFILE $OUTPUTSFILE);

use vars qw($REPORTFILE $STATICSTATUSFILE);

use vars qw($LAUNCHERDIR);

use vars qw($PATTERNSFILE);

use vars qw($BACLAVAPARAM $PARAMWFID $PARAMWORKFLOWDEP $PARAMWORKFLOWREF $PARAMWORKFLOW $PARAMISLAND $PARAMALTVIEWERURI);
use vars qw($PARAMPREFIX $ENCODINGPREFIX $MIMEPREFIX);

use vars qw($PARAMSAVEEX $PARAMSAVEEXDESC $CATALOGFILE $RESPONSIBLEFILE $LOCKFILE);

use vars qw($RESPONSIBLENAME $RESPONSIBLEMAIL $AUTOUUID);

# Workflow files constants
$RESPONSIBLENAME='responsibleName';
$RESPONSIBLEMAIL='responsibleMail';
$AUTOUUID='autoUUID';

use vars qw($LICENSENAME $LICENSEURI);

$LICENSENAME='licenseName';
$LICENSEURI='licenseURI';

use vars qw($WORKFLOWFILE $SVGFILE $PNGFILE $JPEGFILE $GIFFILE $PDFFILE $WFIDFILE $VIEWERFILE);
$WORKFLOWFILE='workflow.xml';
$SVGFILE='workflow.svg';
$PDFFILE='workflow.pdf';
$PNGFILE='workflow.png';
$JPEGFILE='workflow.jpg';
$GIFFILE='workflow.gif';
$WFIDFILE='WFID';
$VIEWERFILE='viewerURI.url';

use vars qw(%GRAPHREP %GRAPHREPINV);

%GRAPHREP=(
	$IWWEM::WorkflowCommon::SVGFILE => 'image/svg+xml',
	$IWWEM::WorkflowCommon::PNGFILE => 'image/png',
	$IWWEM::WorkflowCommon::PDFFILE => 'application/pdf',
	$IWWEM::WorkflowCommon::JPEGFILE => 'image/jpeg',
	$IWWEM::WorkflowCommon::GIFFILE => 'image/gif'
);

%GRAPHREPINV=reverse(%GRAPHREP);

use vars qw($DEPDIR $EXAMPLESDIR $SNAPSHOTSDIR $ITERATIONSDIR);

$DEPDIR='dependencies';
$EXAMPLESDIR='examples';
$SNAPSHOTSDIR='snapshots';
$ITERATIONSDIR='Iterations';

use vars qw($ETCRELDIR $ETCDIR);

$ETCRELDIR = 'etc';
$ETCDIR = $FindBin::Bin . '/../' .$ETCRELDIR;

use vars qw($LICENSESRELDIR $LICENSESDIR $LICENSESFILE);
$LICENSESRELDIR='licenses';
$LICENSESDIR=$FindBin::Bin . '/../' .$LICENSESRELDIR;
$LICENSESFILE=$LICENSESDIR.'/licenses.xml';

use vars qw($RESULTSDIR);

$RESULTSDIR = 'Results';

# Patterns file
$PATTERNSFILE = $ETCDIR . '/' . 'EVpatterns.xml';

# Launcher directory
$LAUNCHERDIR = $FindBin::Bin.'/Backends/t1backend';

$PARAMWFID='id';
$PARAMWORKFLOW='workflow';
$PARAMWORKFLOWDEP='workflowDep';
$PARAMWORKFLOWREF='workflowRef';
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

use vars qw($BASE_IWWEM_NS $WFD_NS $LIC_NS $PAT_NS);

$BASE_IWWEM_NS='http://www.cnio.es/scombio/jmfernandez/inb/IWWEM/';
$WFD_NS = $BASE_IWWEM_NS.'frontend';
$LIC_NS = $BASE_IWWEM_NS.'licenses';
$PAT_NS = $WFD_NS . '/patterns';

use vars qw($BACLAVA_NS);

$BACLAVA_NS = 'http://org.embl.ebi.escience/baclava/0.1alpha';

use vars qw($COMMENTPRE $COMMENTPOST $COMMENTWM $COMMENTEL $COMMENTES);

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

use vars qw($LICENSESTART $LICENSESTOP);

$LICENSESTART=('-' x 30)."LICENSE URI START".('-' x 30);
$LICENSESTOP= ('-' x 30)."LICENSE URI  STOP".('-' x 30);

use vars qw($AUTOUUID);

$AUTOUUID='autoUUID';

use vars qw($JOBIDPAT);
$JOBIDPAT='@JOBID@';

# Method declaration
sub genUUID();
sub patchXMLString($);
sub depatchPath($);

sub getCGIBaseURI($);
sub createResponsibleFile($$;$);
sub createMailer();
sub enactionGUIURI($;$$);
sub sendEnactionMail($$$;$$);

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

# Responsible name and mail must be already in UTF-8!
sub createResponsibleFile($$;$) {
	my($basedir,$responsibleMail,$responsibleName)=@_;
	
	$responsibleName=''  unless(defined($responsibleName));
	my($autoUUID)=genUUID();
	
	eval {
		my($resdoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
		my($resroot)=$resdoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'responsible');
		$resroot->appendChild($resdoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTEL) ));
		$resroot->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
		$resroot->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
		$resroot->setAttribute($IWWEM::WorkflowCommon::AUTOUUID,$autoUUID);
		$resdoc->setDocumentElement($resroot);
		$resdoc->toFile($basedir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE);
	};
	
	return ($@,$autoUUID);
}

sub createMailer() {
	my($blockpar)={
		smtp=>$IWWEM::MailConfig::SMTPSERVER,
		auth=>'LOGIN',
		auth_encoded=>$IWWEM::MailConfig::SMTP_ENCODED_CREDS,
		authid=>$IWWEM::MailConfig::SMTPUSER,
		authpwd=>$IWWEM::MailConfig::SMTPPASS
	#	subject=>'Prueba4',
	#	debug=>\*STDERR
	};

	my($smtp) = Mail::Sender->new($blockpar);
	
	return $smtp;
}

sub enactionGUIURI($;$$) {
	my($query,$jobId,$viewerURI)=@_;
	
	my($operURL)=undef;
	
	if(defined($query)) {
		if(defined($viewerURI)) {
			$operURL=$viewerURI;
		} else {
			$operURL = IWWEM::WorkflowCommon::getCGIBaseURI($query);
			$operURL =~ s/cgi-bin\/[^\/]+$//;
			$operURL.="enactionviewer.html";
			$operURL.="?jobId=$JOBIDPAT"  if(defined($jobId));
		}

		if(defined($jobId)) {
			$operURL =~ s/$JOBIDPAT/$jobId/g;
		}
	}
	
	return $operURL;
}

sub sendEnactionMail($$$;$$) {
	my($query,$jobId,$responsibleMail,$operURL,$hasFinished)=@_;
	
	my($smtp)=IWWEM::WorkflowCommon::createMailer();
	$operURL=IWWEM::WorkflowCommon::enactionGUIURI($query,$jobId)  unless(defined($operURL));
	my($status)=defined($hasFinished)?'finished':'started';
	my($dataStatus)=defined($hasFinished)?'results':'progress';
	return $smtp->MailMsg({
		from=>"\"$IWWEM::MailConfig::IWWEMmailname\" <$IWWEM::MailConfig::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your enaction $jobId has just $status",
		msg=>"Dear IWWE&M user,\r\n    your enaction $jobId has just $status. You can see the $dataStatus at\r\n\r\n$operURL\r\n\r\nThe INB Interactive Web Workflow Enactor & Manager system"
	});
}

1;
