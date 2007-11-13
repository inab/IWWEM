#!/usr/bin/perl -W

use strict;

package WorkflowCommon;

use FindBin;

use POSIX qw(strftime);

use vars qw($WORKFLOWFILE $SVGFILE $DEPDIR $EXAMPLESDIR $SNAPSHOTSDIR);

use vars qw($WORKFLOWRELDIR $WORKFLOWDIR $JOBRELDIR $JOBDIR $MAXJOBS $JOBCHECKDELAY $LAUNCHERDIR $MAVENDIR);

use vars qw($BACLAVAPARAM $PARAMPARAM $PARAMPREFIX $WFD_NS $SCUFL_NS);

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
# the delay (in seconds) between checks
$JOBCHECKDELAY = 30;
# Launcher directory
$LAUNCHERDIR = $FindBin::Bin.'/INBWorkflowLauncher';
# Maven directory used by raven instance inside
# workflowparser and workflowlauncher
$MAVENDIR = $FindBin::Bin.'/inb-maven';

$PARAMPARAM='BACLAVA_FILE';
$PARAMPREFIX='PARAM_';
$WFD_NS = 'http://www.cnio.es/scombio/jmfernandez/taverna/inb/frontend';
$SCUFL_NS = 'http://org.embl.ebi.escience/xscufl/0.1alpha';

# Method declaration
sub genUUID();

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

1;
