#!/usr/bin/perl -W

use strict;

package WorkflowCommon;

use CGI;
use FindBin;
use POSIX qw(strftime);

use vars qw($WORKFLOWFILE $SVGFILE $DEPDIR $EXAMPLESDIR $SNAPSHOTSDIR);

use vars qw($WORKFLOWRELDIR $WORKFLOWDIR $JOBRELDIR $JOBDIR $MAXJOBS $JOBCHECKDELAY $LAUNCHERDIR $MAVENDIR);

use vars qw($BACLAVAPARAM $PARAMISLAND $PARAMPREFIX $SNAPSHOTPREFIX $WFD_NS $SCUFL_NS);

use vars qw($PARAMSAVEEX $PARAMSAVEEXDESC $CATALOGFILE);

use vars qw($COMMENTPRE $COMMENTPOST $COMMENTWM $COMMENTEL $COMMENTES);

# Workflow files constants
$WORKFLOWFILE='workflow.xml';
$SVGFILE='workflow.svg';
$DEPDIR='dependencies';
$EXAMPLESDIR='examples';
$SNAPSHOTSDIR='snapshots';

# Base directory for stored workflows
$WORKFLOWRELDIR = 'workflows';
$WORKFLOWDIR = $FindBin::Bin. '/../' . $WORKFLOWRELDIR;
# Base directory for jobs
$JOBRELDIR = 'jobs';
$JOBDIR = $FindBin::Bin . '/../' .$JOBRELDIR;
# Number of concurrent jobs
$MAXJOBS = 2;
# When a pending job is waiting for a slot,
# the delay (in seconds) between checks.
# It is not higher because it is
# restricted from LockNLog side.
$JOBCHECKDELAY = 1;
# Launcher directory
$LAUNCHERDIR = $FindBin::Bin.'/INBWorkflowLauncher';
# Maven directory used by raven instance inside
# workflowparser and workflowlauncher
$MAVENDIR = $FindBin::Bin.'/inb-maven';

$PARAMISLAND='dataIsland';
$PARAMSAVEEX='exampleName';
$PARAMSAVEEXDESC='exampleDesc';
$BACLAVAPARAM='BACLAVA_FILE';
$PARAMPREFIX='PARAM_';
$SNAPSHOTPREFIX='snapshot:';

$CATALOGFILE='catalog.xml';

$WFD_NS = 'http://www.cnio.es/scombio/jmfernandez/taverna/inb/frontend';
$SCUFL_NS = 'http://org.embl.ebi.escience/xscufl/0.1alpha';

$COMMENTPRE = '	This content was generated by ';
$COMMENTPOST =<<COMMENTEOF;
, an
	application of IWWE\&M, INB Web Workflow Enactor \& Manager
	The workflow enactor itself is based on Taverna core, and
	uses it.
	
	Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
COMMENTEOF

$COMMENTWM=$COMMENTPRE.'workflowmanager'.$COMMENTPOST;
$COMMENTEL=$COMMENTPRE.'enactionlauncher'.$COMMENTPOST;
$COMMENTES=$COMMENTPRE.'enactionstatus'.$COMMENTPOST;

# Method declaration
sub genUUID();
sub getCGIBaseURI($);

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

sub getCGIBaseURI($) {
	my($query)=@_;
	
	my($proto)=($query->https())?'https':'http';
	my($host)=$query->virtual_host();
	my($port)=$query->virtual_port();
	my($relpath)=$query->script_name();
	my($virtualrel)=$ENV{'HTTP_VIA'} || $ENV{'HTTP_FORWARDED'} || $ENV{'HTTP_X_FORWARDED_FOR'};
	if(defined($virtualrel) && $virtualrel =~ /^(?:https?:\/\/[^:\/]+)?(?::[0-9]+)?(\/.*)/) {
		$relpath=$1;
	}
	
	return "$proto://$host:$port$relpath";
}

1;
