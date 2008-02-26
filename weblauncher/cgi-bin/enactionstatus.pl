#!/usr/bin/perl -W

use strict;

use Encode;
use FindBin;
use CGI;
use XML::LibXML;
use File::Path;
use Socket;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Methods prototypes
sub appendInputs($$$);
sub appendOutputs($$$);
sub appendIO($$$$);
sub appendResults($$$);
sub processStep($$$);
sub getFreshEnactionReport($);
sub getStoredEnactionReport($);

# Methods declarations
sub appendInputs($$$) {
	appendIO($_[0],$_[1],$_[2],'input');
}

sub appendOutputs($$$) {
	appendIO($_[0],$_[1],$_[2],'output');
}

sub appendIO($$$$) {
	my($iofile,$outputDoc,$parent,$iotagname)=@_;
	
	if(-f $iofile) {
		my($handler)=EnactionStatusSAX->new($outputDoc,$parent,$iotagname);
		my($parser)=XML::LibXML->new(Handler=>$handler);
		eval {
			$parser->parse_file($iofile);
		};
		if($@) {
			print STDERR "PARTIAL ERROR with $iofile: $@";
		}
	}
}

sub processStep($$$) {
	my($basedir,$outputDoc,$es)=@_;
	
	my($inputsfile)=$basedir . '/Inputs.xml';
	my($outputsfile)=$basedir . '/Outputs.xml';
	my($resultsdir)=$basedir . '/Results';
	appendInputs($inputsfile,$outputDoc,$es);
	appendOutputs($outputsfile,$outputDoc,$es);
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
					appendInputs($jobdir . '/Inputs.xml',$outputDoc,$step);
					appendOutputs($jobdir . '/Outputs.xml',$outputDoc,$step);
					
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

sub getFreshEnactionReport($) {
	my($portfile)=@_;
	
	my($PORTFILE);
	die "FATAL ERROR: Unable to read portfile $ARGV[0]\n"  unless(open($PORTFILE,'<',$portfile));

	my($line)=undef;
	while($line=<$PORTFILE>) {
		last;
	}
	die "ERROR: Unable to read $portfile contents!\n"  unless(defined($line));
	close($PORTFILE);
	chomp($line);

	my($host,$port)=split(/:/,$line,2);
	die "ERROR: Line '$line' from $portfile is invalid!\n"
	unless(defined($port) && int($port) eq $port && $port > 0);

	my($proto)= (getprotobyname('tcp'))[2];

	# get the port address
	my($iaddr) = inet_aton($host);
	my($paddr) = pack_sockaddr_in($port, $iaddr);
	# create the socket, connect to the port
	my($SOCKET);
	socket($SOCKET, PF_INET, SOCK_STREAM, $proto) or die "SOCKET ERROR: $!";
	connect($SOCKET, $paddr) or die "CONNECT SOCKET ERROR: $!";

	while ($line = <$SOCKET>) {
		print $line;
	}
	close($SOCKET) or die "CLOSE SOCKET ERROR: $!"; 
	
	return $line;
}

sub getStoredEnactionReport($) {
	my($dir)=@_;
	
	my($ER);
	my($rep)='';
	
	if(open($ER,'<',$dir.'/report.xml')) {
		my($line)=undef;
		while($line=<$ER>) {
			$rep .= $line;
		}
		close($ER);
	}
	
	return $rep;
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
	} elsif($param eq 'dispose') {
		$dispose=$query->param($param);
		$dispose=($dispose ne '1')?0:1;
	} elsif($param eq 'snapshotName') {
		$snapshotName=$query->param($param);
	} elsif($param eq 'snapshotDesc') {
		$snapshotDesc=$query->param($param);
	}
	last  if($query->cgi_error());
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
		if(defined($dispose) && $dispose eq '1') {
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
							$es->appendChild($outputDoc->importNode($snapnode));
						}
					};

					# TODO: report, checks...
					#unless($@) {
					#}
				}
			}

			my($ppidfile)=$jobdir . '/PPID';
			my($includeSubs)=1;
			my($PPID);
			my($enactionReport)=undef;
			my($enactionReportError)=undef;
			if(-f $jobdir . '/FATAL' || ! -f $ppidfile) {
				$state='dead';
			} elsif(!defined($wfsnap) && open($PPID,'<',$ppidfile)) {
				my($ppid)=<$PPID>;
				close($PPID);
				
				my($pidfile)=$jobdir . '/PID';
				my($PID);
				unless(-f $pidfile) {
					# So it could be queued
					$enactionReport=getStoredEnactionReport($jobdir);
					$state = 'queued';
					$includeSubs=undef;
				} elsif(open($PID,'<',$pidfile)) {
					my($pid)=<$PID>;
					close($PID);
					
					# Now we have a pid, we can check for the enaction job
					if( -f $jobdir . '/FINISH') {
						$state = 'finished';
						$enactionReport=getStoredEnactionReport($jobdir);
					} elsif( -f $jobdir . '/FAILED.txt') {
						$state = 'error';
						$enactionReport=getStoredEnactionReport($jobdir);
					} elsif(kill(0,$pid) > 0) {
						# It could be still running...
						unless(defined($dispose)) {
							if( -f $jobdir . '/START') {
								# So, let's fetch the state
								eval {
									$enactionReport=getFreshEnactionReport($jobdir . '/socket');
								};
								
								$enactionReportError=$@  if($@);
								
								$state = 'running';
							} else {
								# So it could be queued
								$state = 'unknown';
								$includeSubs=undef;
							}
						} else {
							$state = 'killed';
							if(kill(TERM => -$pid)) {
								sleep(1);
								# You must die!!!!!!!!!!
								kill(KILL => -$pid)  if(kill(0,$pid));
							}
						}
					} else {
						$state = 'dead';
						$enactionReport=getStoredEnactionReport($jobdir);
					}
				} else {
					$state = 'fatal';
					$includeSubs=undef;
				}
			} elsif(defined($wfsnap)) {
				$state = 'frozen';
			} else {
				$state = 'fatal';
				$includeSubs=undef;
			}
			
			if(defined($enactionReport) && $enactionReport ne '') {
				eval {
					my($parser)=XML::LibXML->new();

					my($repnode)=$parser->parse_string(decode('UTF-8', $enactionReport));
					# And let's add it to the report
					my($er)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionReport');
					$er->appendChild($outputDoc->importNode($repnode));
					$es->appendChild($er);
				};

				$enactionReportError=$@  if($@);
			}
			
			if(defined($enactionReportError) && $enactionReportError ne '') {
				my($er)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionReportError');
				$er->appendChild($outputDoc->createCDATASection($enactionReportError));
				$es->appendChild($er);
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


package EnactionStatusSAX;

use strict;
use XML::SAX::Base;
use XML::SAX::Exception;
use lib "$FindBin::Bin";
use WorkflowCommon;

use base qw(XML::SAX::Base);

###############
# Constructor #
###############
sub new($$$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	my($outputDoc,$parent,$iotagname)=@_;
	
	my($self)=$proto->SUPER::new();
	
	$self->{outputDoc}=$outputDoc;
	$self->{parent}=$parent;
	$self->{iotagname}=$iotagname;
	
	return bless($self,$class);
}

########################
# SAX instance methods #
########################
sub start_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};

	if($elem->{NamespaceURI} eq $WorkflowCommon::BACLAVA_NS && $elname eq 'dataThing') {
		my($ionode)=$self->{outputDoc}->createElementNS($WorkflowCommon::WFD_NS,$self->{iotagname});
		$ionode->setAttribute('name',$elem->{Attributes}{'{}key'}{Value});
		$self->{parent}->appendChild($ionode);
	}
}

1;
