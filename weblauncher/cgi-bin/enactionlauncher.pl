#!/usr/bin/perl -W

# $Id$
# enactionlauncher.pl
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
use POSIX qw(setsid);
use XML::LibXML;

# And now, my own libraries!
use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;
use LockNLog::Mutex;

my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($hasInputWorkflow)=undef;
my($hasInputWorkflowDeps)=undef;
my($workflowId)=undef;
my($wabspath)=undef;
my($originalInput)=undef;
my($reusePrevInput)=undef;
my($onlySaveAsExample)=undef;
my($wfilefetched)=undef;
my($baclavafound)=undef;

my(@inputdesc)=();
my(@baclavadesc)=();
my($inputcount)=0;
my($retval)=0;
my($retvalmsg)=undef;
my($dataisland)=undef;
my($dataislandTag)=undef;

my($exampleName)=undef;
my($exampleDesc)=undef;
my(@saveExample)=();

my(@parseParam)=();

# First step, parameter and workflow storage (if any!)
PARAMPROC:
foreach my $param ($query->param()) {
	# We are skipping all unknown params
	if($param eq $WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOW) {
		$hasInputWorkflow=1;
		$wfilefetched=1;
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $WorkflowCommon::PARAMWFID) {
		my($id)=$query->param($param);
		
		if($id =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$workflowId=$1;
			my($wabsbasepath)=$WorkflowCommon::WORKFLOWDIR . '/' . $workflowId . '/' . $WorkflowCommon::SNAPSHOTSDIR . '/' . $2 . '/';
			$wabspath=$wabsbasepath . $WorkflowCommon::WORKFLOWFILE;
			
			$originalInput=$wabsbasepath . $WorkflowCommon::INPUTSFILE;
		} elsif($id =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
			my($ENHAND);
			my($wabsbasepath)=$WorkflowCommon::JOBDIR . '/' . $1 . '/';
			if(open($ENHAND,'<',$wabsbasepath . $WorkflowCommon::WFIDFILE)) {
				$workflowId=<$ENHAND>;
				close($ENHAND);
			} else {
				$retval=2;
				last;
			}
			$wabspath=$wabsbasepath . $WorkflowCommon::WORKFLOWFILE;
			
			$originalInput=$wabsbasepath . $WorkflowCommon::INPUTSFILE;
		} else {
			$workflowId=$id;
			$wabspath=$WorkflowCommon::WORKFLOWDIR . '/' . $workflowId . '/' . $WorkflowCommon::WORKFLOWFILE;
		}
		
		# Is it a 'sure' path?
		if(index($id,'/')!=-1 || ! -f $wabspath) {
			$retval = 2;
			last;
		}
		$wfilefetched=1;
		# Deps should be done later...
	} elsif($param eq $WorkflowCommon::BACLAVAPARAM) {
		$baclavafound=1;
	} elsif($param eq 'reusePrevInput') {
		$reusePrevInput=1;
	} elsif($param eq 'onlySaveAsExample') {
		$onlySaveAsExample=1;
	} elsif($param eq $WorkflowCommon::PARAMSAVEEX) {
		$exampleName=$query->param($param);
	} elsif($param eq $WorkflowCommon::PARAMSAVEEXDESC) {
		$exampleDesc=$query->param($param);
	} elsif(length($param)>length($WorkflowCommon::PARAMPREFIX) && index($param,$WorkflowCommon::PARAMPREFIX)==0) {
		push(@parseParam,$param);
	}
}

my($parser)=XML::LibXML->new();

# Step Zero, job directory
my($jobid)=undef;
my($jobdir)=undef;

if(defined($hasInputWorkflow)) {
	$workflowId=undef;
	
	my($p_res)=undef;
	($retval,$retvalmsg,$p_res)=WorkflowCommon::parseInlineWorkflows($query,$parser,$hasInputWorkflowDeps,undef,$WorkflowCommon::JOBDIR);
	$retval=$p_res->[0];
	$retvalmsg=$p_res->[1];
	
	$jobid=$p_res->[0]  if(scalar(@{$p_res})>0);
	$jobdir = $WorkflowCommon::JOBDIR . '/' .$jobid;
} else {
	do {
		$jobid = WorkflowCommon::genUUID();
		$jobdir = $WorkflowCommon::JOBDIR . '/' .$jobid;
	} while (-d $jobdir);
	mkpath($jobdir);
}

my($wfile)=$jobdir . '/'. $WorkflowCommon::WORKFLOWFILE;
my($efile)=$jobdir . '/joberrlog.txt';
my($inputdir)=$jobdir . '/jobinput';
mkdir($inputdir);

foreach my $param (@parseParam) {
	# Single param handling
	my $paramName = substr($param,length($WorkflowCommon::PARAMPREFIX));
	my $paramPath = $inputdir . '/' . $inputcount;

	my(@PFH)=$query->upload($param);

	last  if($query->cgi_error());

	my($isfh)=1;

	if(scalar(@PFH)==0) {
		@PFH=$query->param($param);
		$isfh=undef;
	}

	my($many)=undef;

	my($fcount)=0;
	my($destfile);
	if(scalar(@PFH)>1) {
		$many = 1;
		mkdir($paramPath);
		$destfile=$paramPath . '/' . $fcount;
	} else {
		$destfile=$paramPath;
	}

	foreach my $PH (@PFH) {
		my($PARH);
		if(open($PARH,'>',$destfile)) {
			if(defined($isfh)) {
				my($line);
				# We hope the file will be in UTF-8
				while($line=<$PH>) {
					print $PARH $line;
				}
			} else {
				print $PARH encode('UTF-8',$PH);
			}
			close($PARH);
		} else {
			$retval = 4;
			last PARAMPROC;
		}
		$fcount++;
		$destfile=$paramPath . '/' . $fcount;
	}

	push(@inputdesc,(defined($many)?'-inputArrayDir':'-inputFile'),$paramName,$paramPath);

	$inputcount++;
}

if(defined($workflowId)) {
	# Copying and patching input workflow
	my($WFmaindoc)=$parser->parse_file($wabspath);
	
	($retval,$retvalmsg)=WorkflowCommon::patchWorkflow($query,$parser,undef,$jobid,$jobdir,undef,$WFmaindoc,$hasInputWorkflowDeps,1,1);
}

if(defined($baclavafound)) {
	my($param)=$WorkflowCommon::BACLAVAPARAM;
	# Whole baclava files handling
	my $paramPath = $inputdir . '/' . $inputcount . '-baclava';
	mkdir($paramPath);

	my(@BFH)=$query->upload($param);

	last  if($query->cgi_error());

	my($isfh)=1;

	my($fcount)=0;
	if(scalar(@BFH)==0) {
		# We are going to use examples!
		if(defined($workflowId)) {
			@BFH=$query->param($param);

			foreach my $exfile (@BFH) {
				my($baclavaname)=$paramPath.'/'.$fcount.'.xml';
				
				my($origWFID)=undef;
				my($exId)=undef;
				
				if($exfile =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
					$origWFID=$1;
					$exId=$2;
				} else {
					$origWFID=$workflowId;
					$exId=$exfile;
				}
				
				my($example)=$WorkflowCommon::WORKFLOWDIR.'/'.$origWFID.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$exId.'.xml';
				next  if(index($exfile,'/')==0 || index($exfile,'../')!=-1 || ! -f $example );
				if(copy($example,$baclavaname)) {
					push(@baclavadesc,'-inputDoc',$baclavaname);
				} else {
					$retval = 4;
					last;
				}
				$fcount++;
			}
		}
	} else {
		foreach my $BH (@BFH) {
			my($baclavaname)=$paramPath.'/'.$fcount.'.xml';
			my($BACH);
			if(open($BACH,'>',$baclavaname)) {
				my($line);
				while($line=<$BH>) {
					print $BACH $line;
				}
				close($BACH);
				push(@baclavadesc,'-inputDoc',$baclavaname);
			} else {
				$retval = 4;
				last;
			}
			$fcount++;
		}
	}
	
	$inputcount++;
} elsif(defined($originalInput) && defined($reusePrevInput)) {
	my $paramPath = $inputdir . '/' . $inputcount . '-baclava';
	my($baclavaname)=$paramPath.'/'.'original.xml';
	if(copy($originalInput,$baclavaname)) {
		$inputcount++;
	} else {
		$retval=4;
	}
}

# This example node will be used to notify
# the creation of the example file
my($example)=undef;
# Saving as an example
if(defined($exampleName) && defined($workflowId)) {
	my($randname);
	my($relrandfile);
	my($randfile);
	do {
		$randname=WorkflowCommon::genUUID();
		$relrandfile=$workflowId.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$randname.'.xml';
		$randfile=$WorkflowCommon::WORKFLOWDIR.'/'.$relrandfile;
	} while(-f $randfile);
	
	my($catalogfile)=$WorkflowCommon::WORKFLOWDIR.'/'.$workflowId.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE;
	my($catalog)=$parser->parse_file($catalogfile);
	my($example)=$catalog->createElementNS($WorkflowCommon::WFD_NS,'example');
	$example->setAttribute('uuid',$randname);
	$example->setAttribute('name',encode('UTF-8',$exampleName));
	$example->setAttribute('path',$relrandfile);
	$example->setAttribute('date',LockNLog::getPrintableNow());
	if(defined($exampleDesc) && length($exampleDesc) > 0) {
		$example->appendChild($catalog->createCDATASection(encode('UTF-8',$exampleDesc)));
	}
	
	# Save example name and description
	$catalog->documentElement()->appendChild($example);
	$catalog->toFile($catalogfile);
	
	# Last
	push(@saveExample,(defined($onlySaveAsExample)?'-onlySaveInputs':'-saveInputs'),$randfile);
}

# We must signal here errors and exit
if($retval!=0 || $query->cgi_error() || !defined($wfilefetched)) {
	print STDERR "RETVAL  $retval  RETVALMSG $retvalmsg  ".$query->cgi_error()."\n";
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because '.(($retval!=0)?'there was an internal input/output error':(($query->cgi_error())?'uploaded contents were malformed':'no workflow was uploaded'))),
		$query->strong($error);
	
	rmtree($jobdir);
	exit 0;
}

# Second step, workflow launching

my($cpid)=fork();
unless(defined($cpid)) {
	# Fork failed!
	my($error) = '500 Internal Server Error';
	print $query->header(-status=>$error),
		$query->start_html('Fatal Problems'),
		$query->h2('Request not processed because it was not possible to spawn a workflow launcher'),
		$query->strong($error);
	
	rmtree($jobdir);
	exit 0;
} elsif($cpid!=0) {
	# I'm the parent, and I have a child!!!!
	my($CPID);
	if(open($CPID,'>',$jobdir.'/PPID')) {
		print $CPID $cpid;
		close($CPID);
	}
	
	if(defined($workflowId)) {
		my($WFID);
		if(open($WFID,'>',$jobdir.'/'.$WorkflowCommon::WFIDFILE)) {
			print $WFID $workflowId;
			close($WFID);
		}
	}
	
	# Now, reporting...
	print $query->header(-type=>(defined($dataisland)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');
	my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionlaunched');
	$root->setAttribute('time',LockNLog::getPrintableNow());
	$root->setAttribute('jobId',$jobid);
	$root->appendChild($outputDoc->createComment( encode('UTF-8',$WorkflowCommon::COMMENTEL) ));
	$outputDoc->setDocumentElement($root);
	
	if(defined($example)) {
		$root->appendChild($outputDoc->importNode($example));
	}
	
	if(defined($dataisland)) {
		print "<html><body><$dataislandTag id='".$WorkflowCommon::PARAMISLAND."'>\n";
	}
	
	unless(defined($dataisland) && $dataisland eq '2') {
		$outputDoc->toFH(\*STDOUT);
	} else {
		print encode('UTF-8', $outputDoc->createTextNode($root->toString())->toString());
	}
	
	if(defined($dataisland)) {
		print "\n</$dataislandTag></body></html>";
	}

	exit 0;
} else {
	# I'm the child daemon, so cutting communication lines!
	chdir('/');
	open(STDIN,'<','/dev/null');
	open(STDERR,'>',$efile);
	open(STDOUT,'>&=',\*STDERR);
	setsid();
	
	# Now trying to become a true workflow launcher!!!!
	
	my($submethod)=sub {
		my($eraseRes)=@_;
		my($runpid)=fork();
		unless(defined($runpid)) {
			my($FATAL);
			open($FATAL,'>',$jobdir . '/FATAL');
			close($FATAL);
			print STDERR "FATAL ERROR-0: Failed to become a workflow launcher!";
		} elsif($runpid!=0) {
			# I'm the son which holds the run slot
			waitpid($runpid,0);

			# Now, the slot can freed properly
			rmtree($jobdir)  if(defined($eraseRes));
		} else {
			# I'm the grandson, which can be killed
			setsid();
			my($RUNPID);
			if(open($RUNPID,'>',$jobdir.'/PID')) {
				print $RUNPID $$;
				close($RUNPID);
			}

			{
				exec($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowlauncher',
					'-baseDir',$WorkflowCommon::MAVENDIR,
					'-workflow',$wfile,
#					'-expandSubWorkflows',
					'-statusDir',$jobdir,
					@baclavadesc,
					@inputdesc,
					@saveExample
				);
			};
			my($FATAL);
			open($FATAL,'>',$jobdir . '/FATAL');
			close($FATAL);
			print STDERR "FATAL ERROR-1: Failed to become a workflow launcher!\n$!";
		}
	};
	if(defined($onlySaveAsExample))  {
		eval $submethod->(1);
	} else {
		# Now it is time to enqueue this query (limited resources)
		my($mutex)=LockNLog::Mutex->new($WorkflowCommon::MAXJOBS,$WorkflowCommon::JOBCHECKDELAY);
		$mutex->mutex($submethod);
	}
}
