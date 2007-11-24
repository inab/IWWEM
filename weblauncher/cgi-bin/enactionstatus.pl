#!/usr/bin/perl -W

use strict;

use Encode;
use FindBin;
use CGI;
use XML::LibXML;
use File::Path;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

sub appendInputs($$$);
sub appendOutputs($$$);
sub appendIO($$$$);
sub appendResults($$$);

sub appendInputs($$$) {
	appendIO($_[0],$_[1],$_[2],'input');
}

sub appendOutputs($$$) {
	appendIO($_[0],$_[1],$_[2],'output');
}

sub appendIO($$$$) {
	my($iodir,$outputDoc,$parent,$iotagname)=@_;
	
	if(-d $iodir) {
		my($IODIR);
		if(opendir($IODIR,$iodir)) {
			my($entry);
			while($entry=readdir($IODIR)) {
				# No hidden element, please!
				next  if($entry eq '.' || $entry eq '..');

				my($ionode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,$iotagname);
				$ionode->setAttribute('name',$entry);
				$parent->appendChild($ionode);
			}
			closedir($IODIR);
		}
	}
}

sub processStep($$$) {
	my($basedir,$outputDoc,$es)=@_;
	
	my($inputsdir)=$basedir . '/Inputs';
	my($outputsdir)=$basedir . '/Outputs';
	my($resultsdir)=$basedir . '/Results';
	appendInputs($inputsdir,$outputDoc,$es);
	appendOutputs($outputsdir,$outputDoc,$es);
	appendResults($resultsdir,$outputDoc,$es);
}

sub appendResults($$$) {
	my($resultsdir,$outputDoc,$parent)=@_;
	
	if(-d $resultsdir) {
		my($RDIR);
		if(opendir($RDIR,$resultsdir)) {
			my($entry);
			while($entry=readdir($RDIR)) {
				# No hidden element, please!
				my($jobdir)=$resultsdir .'/'. $entry;
				next  if($entry eq '.' || $entry eq '..' || ! -d $jobdir);
				
				my($step)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'step');
				$step->setAttribute('name',$entry);
				
				# Now we have a pid, we can check for the enaction job
				my($state)=undef;
				my($includeSubs)=1;
				if( -f $jobdir . '/FINISH') {
					$state = 'finished';
				} elsif( -f $jobdir . '/FAILED.txt') {
					$state = 'error';
				} elsif( -f $jobdir . '/START') {
						$state = 'running';
				} else {
					# So it could be queued
					$state = 'queued';
					$includeSubs=undef;
				}
				
				$step->setAttribute('state',$state);
				
				if(defined($includeSubs)) {
					appendInputs($jobdir . '/Inputs',$outputDoc,$step);
					appendOutputs($jobdir . '/Outputs',$outputDoc,$step);
					
					my($iteratedir)=$jobdir . '/Iterations';
					if(-d $iteratedir) {
						my($iternode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'iterations');
						$step->appendChild($iternode);
						appendResults($iteratedir,$outputDoc,$iternode);
					}
				}
				
				$parent->appendChild($step);
			}
			closedir($RDIR);
		}
	}
}


my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($retval)=0;

my(@jobIdList)=();

my($dispose)=undef;

my($snapshotName)=undef;
my($snapshotDesc)=undef;

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	if($param eq 'jobId') {
		@jobIdList=$query->param($param);
		last  if($query->cgi_error());
	} elsif($param eq 'dispose') {
		$dispose=1;
	} elsif($param eq 'snapshotName') {
		$snapshotName=$query->param($param);
		last  if($query->cgi_error());
	} elsif($param eq 'snapshotDesc') {
		$snapshotDesc=$query->param($param);
		last  if($query->cgi_error());
	}
}

# We must signal here errors and exit
if($retval!=0 || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because no jobId was properly provided'),
		$query->strong($error);
	exit 0;
}

my($outputDoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
my($root)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionreport');
$outputDoc->setDocumentElement($root);

$root->appendChild($outputDoc->createComment( encode('UTF-8',$WorkflowCommon::COMMENTES) ));

# Disposal execution
foreach my $jobId (@jobIdList) {
	my($es)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionstatus');
	$es->setAttribute('jobId',$jobId);
	$es->setAttribute('time',LockNLog::getPrintableNow());
	$es->setAttribute('relURI',$WorkflowCommon::JOBRELDIR);

	# Time to know the overall status of this enaction
	my($state)=undef;
	my($jobdir)=undef;
	my($wfsnap)=undef;

	if(index($jobId,$WorkflowCommon::SNAPSHOTPREFIX)==0) {
		if(index($jobId,'/')==-1 && $jobId =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
			$wfsnap=$1;
			$jobId=$2;
			$jobdir=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$jobId;
			# It is an snapshot, so the relative URI changes
			$es->setAttribute('relURI',$WorkflowCommon::WORKFLOWRELDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR);
		}
	} else {
		$jobdir=$WorkflowCommon::JOBDIR . '/' .$jobId;
	}

	# Is it a valid job id?
	if(index($jobId,'/')==-1 && defined($jobdir) && -d $jobdir && -r $jobdir) {
		# Disposal execution
		if(defined($dispose)) {
			#
			my($pidfile)=$jobdir . '/PID';
			my($PID);
			if(!defined($wfsnap) && ! -f ($jobdir . '/FATAL') && -f $pidfile && open($PID,'<',$pidfile)) {
				my($killpid)=<$PID>;
				close($PID);

				# Now we have a pid, we can check for the enaction job
				if(! -f ($jobdir . '/FINISH') && ! -f ($jobdir . '/FAILED.txt') && kill(0,$killpid)) {
					if(kill(TERM => -$killpid)) {
						sleep(1);
						# You must die!!!!!!!!!!
						kill(KILL => -$killpid)  if(kill(0,$killpid));
					}
				}
			}
			$state = 'disposed';

			# Catalog must be maintained
			if(defined($wfsnap)) {
				my($parser)=XML::LibXML->new();
				my($context)=XML::LibXML::XPathContext->new();
				$context->registerNs('sn',$WorkflowCommon::WFD_NS);
				eval {
					my($catfile)=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);

					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$jobId']",$catdoc);
					foreach my $snap (@eraseSnap) {
						$snap->parentNode->removeChild($snap);
					}
					$catdoc->toFile($catfile);
				};

			}

			# The job should have passed out, time to erase the working directory!
			rmtree($jobdir);
		} else {
			# Status report
			# Disallowed snapshots over snapshots!
			if(defined($snapshotName) && !defined($wfsnap)) {
				my($workflowId)=undef;
				# Trying to get the workflowId
				my($WFID);
				if(open($WFID,'<',$jobdir.'/WFID')) {
					$workflowId=<$WFID>;
					close($WFID);
				}

				# So, let's take a snapshot!
				if(defined($workflowId) && index($workflowId,'/')==-1) {
					# First, read the catalog
					my($snapbasedir)=$WorkflowCommon::WORKFLOWDIR .'/'.$workflowId.'/'.$WorkflowCommon::SNAPSHOTSDIR;
					my($catfile)=$snapbasedir.'/'.$WorkflowCommon::CATALOGFILE;
					my($parser)=XML::LibXML->new();
					eval {
						# Read catalog
						my($catdoc)=$parser->parse_file($catfile);

						# Creating uuid
						my($uuid)=undef;
						my($snapdir)=undef;
						do {
							$uuid=WorkflowCommon::genUUID();
							$snapdir=$snapbasedir.'/'.$uuid;
						} while(-d $snapdir);

						# Taking snapshot!
						if(system("cp","-dpr",$jobdir,$snapdir)==0) {
							# Last but one, register snapshot
							my($snapnode)=$catdoc->createElementNS($WorkflowCommon::WFD_NS,'snapshot');
							$snapnode->setAttribute('name',encode('UTF-8',$snapshotName));
							$snapnode->setAttribute('uuid',$WorkflowCommon::SNAPSHOTPREFIX.$workflowId.':'.$uuid);
							$snapnode->setAttribute('date',LockNLog::getPrintableNow());
							if(defined($snapshotDesc) && length($snapshotDesc)>0) {
								$snapnode->appendChild($catdoc->createCDATASection(encode('UTF-8',$snapshotDesc)));
							}

							$catdoc->documentElement->appendChild($snapnode);

							# Last step, update catalog!
							$catdoc->toFile($catfile);

							# And let's add it to the report
							$es->appendNode($outputDoc->importNode($snapnode));
						}
					};

					# TODO: report, checks...
					#unless($@) {
					#}
				}
			}

			my($pidfile)=$jobdir . '/PID';
			my($includeSubs)=1;
			my($PID);
			if(-f $jobdir . '/FATAL' || ! -f $pidfile) {
				$state='dead';
			} elsif(!defined($wfsnap) && open($PID,'<',$pidfile)) {
				my($pid)=<$PID>;
				close($PID);

				# Now we have a pid, we can check for the enaction job
				if( -f $jobdir . '/FINISH') {
					$state = 'finished';
				} elsif( -f $jobdir . '/FAILED.txt') {
					$state = 'error';
				} elsif(kill(0,$pid) > 0) {
					# It could be still running...
					if( -f $jobdir . '/START') {
						$state = 'running';
					} else {
						# So it could be queued
						$state = 'queued';
						$includeSubs=undef;
					}
				} else {
					$state = 'dead';
				}
			} elsif(defined($wfsnap)) {
				$state = 'frozen';
			} else {
				$state = 'fatal';
				$includeSubs=undef;
			}

			# Now including subinformation...
			if(defined($includeSubs)) {
				processStep($jobdir,$outputDoc,$es);
			}
		}
	}

	$state='unknown'  unless(defined($state));

	$es->setAttribute('state',$state);
	$root->appendChild($es);
}

print $query->header(-type=>'text/xml',-charset=>'UTF-8',-cache=>'no-cache, no-store');

$outputDoc->toFH(\*STDOUT);

exit 0;
