#!/usr/bin/perl -W

# $Id$
# enactionstatus.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use Date::Parse;
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
sub appendResults($$$;$);
sub processStep($$$;$);
sub getFreshEnactionReport($$);
sub getStoredEnactionReport($$);
sub parseEnactionReport($$;$);

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

sub processStep($$$;$) {
	my($basedir,$outputDoc,$es,$enactionReport)=@_;
	
	my($inputsfile)=$basedir . '/' . $WorkflowCommon::INPUTSFILE;
	my($outputsfile)=$basedir . '/' . $WorkflowCommon::OUTPUTSFILE;
	my($resultsdir)=$basedir . '/Results';
	appendInputs($inputsfile,$outputDoc,$es);
	appendOutputs($outputsfile,$outputDoc,$es);
	return appendResults($resultsdir,$outputDoc,$es,$enactionReport);
}

sub appendResults($$$;$) {
	my($resultsdir,$outputDoc,$parent,$enactionReport)=@_;
	
	my($failedSth)=undef;
	
	if(-d $resultsdir) {
		my($RDIR);
		my($context)=undef;

		if(defined($enactionReport)) {
			my($context)=XML::LibXML::XPathContext->new();
			foreach my $erentry ($context->findnodes(".//processor",$enactionReport)) {
				my($entry)=$erentry->getAttribute('name');
				
				my($step)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'step');
				$step->setAttribute('name',$entry);
				
				my($state)=undef;
				my($includeSubs)=1;
				
				# Additional info, provided by the report
				my($sched)=undef;
				my($run)=undef;
				my($runnumber)=undef;
				my($runmax)=undef;
				my($stop)=undef;
				my(@errreport)=();

				foreach my $child ($erentry->childNodes) {
					if($child->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
						my($name)=$child->localName();
						if($name eq 'ProcessScheduled') {
							$sched=LockNLog::getPrintableDate(str2time($child->getAttribute('TimeStamp')));
						} elsif($name eq 'Invoking') {
							$run=LockNLog::getPrintableDate(str2time($child->getAttribute('TimeStamp')));
						} elsif($name eq 'InvokingWithIteration') {
							$run=LockNLog::getPrintableDate(str2time($child->getAttribute('TimeStamp')));
							$runnumber=$child->getAttribute('IterationNumber');
							$runmax=$child->getAttribute('IterationTotal');
						} elsif($name eq 'ProcessComplete') {
							$stop=LockNLog::getPrintableDate(str2time($child->getAttribute('TimeStamp')));
							$state='finished';
						} elsif($name eq 'ServiceFailure') {
							$stop=LockNLog::getPrintableDate(str2time($child->getAttribute('TimeStamp')));
							$state='error';
							$failedSth=1;
						} elsif($name eq 'ServiceError') {
							push(@errreport,[$child->getAttribute('Message'),$child->textContent()]);
						}
					}
				}
				unless(defined($state)) {
					if(defined($run)) {
						$state='running';
					} else {
						$state='queued';
						$includeSubs=undef;
					}
				}

				$step->setAttribute('state',$state);
				
				# Adding the extra info
				my($extra)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'extraStepInfo');
				$extra->setAttribute('sched',$sched)  if(defined($sched));
				$extra->setAttribute('start',$run)  if(defined($run));
				$extra->setAttribute('stop',$stop)  if(defined($stop));
				$extra->setAttribute('iterNumber',$runnumber)  if(defined($runnumber));
				$extra->setAttribute('iterMax',$runmax)  if(defined($runmax));
				foreach my $errmsg (@errreport) {
					my($err)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'stepError');
					$err->setAttribute('header',$errmsg->[0]);
					$err->appendChild($outputDoc->createCDATASection($errmsg->[1]));
					$extra->appendChild($err);
				}

				$step->appendChild($extra);
				
				if(defined($includeSubs)) {
					my($jobdir)=$resultsdir .'/'. $entry;
					appendInputs($jobdir . '/' . $WorkflowCommon::INPUTSFILE,$outputDoc,$step);
					appendOutputs($jobdir . '/' . $WorkflowCommon::OUTPUTSFILE,$outputDoc,$step);
					
					my($iteratedir)=$jobdir . '/Iterations';
					if(-d $iteratedir) {
						my($iternode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'iterations');
						$step->appendChild($iternode);
						my($subFailed)=appendResults($iteratedir,$outputDoc,$iternode);
						$failedSth=1  if(defined($subFailed));
					}
				}
				
				$parent->appendChild($step);
			}
		} elsif(opendir($RDIR,$resultsdir)) {
			my($entry);
			my($context)=undef;
			
			while($entry=readdir($RDIR)) {
				# No hidden element, please!
				my($jobdir)=$resultsdir .'/'. $entry;
				next  if($entry eq '.' || $entry eq '..' || ! -d $jobdir);
				
				my($step)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'step');
				$step->setAttribute('name',$entry);
				my($state)=undef;
				my($includeSubs)=1;
				
				if( -f $jobdir . '/FINISH') {
					$state = 'finished';
				} elsif( -f $jobdir . '/FAILED.txt') {
					$state = 'error';
					$failedSth=1;
				} elsif( -f $jobdir . '/START') {
					$state = 'running';
				} else {
					# So it could be queued
					$state = 'queued';
					$includeSubs=undef;
				}
				
				$step->setAttribute('state',$state);
				
				if(defined($includeSubs)) {
					appendInputs($jobdir . '/' . $WorkflowCommon::INPUTSFILE,$outputDoc,$step);
					appendOutputs($jobdir . '/' . $WorkflowCommon::OUTPUTSFILE,$outputDoc,$step);
					
					my($iteratedir)=$jobdir . '/Iterations';
					if(-d $iteratedir) {
						my($iternode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'iterations');
						$step->appendChild($iternode);
						my($subFailed)=appendResults($iteratedir,$outputDoc,$iternode);
						$failedSth=1  if(defined($subFailed));
					}
				}
				
				$parent->appendChild($step);
			}
			closedir($RDIR);
		}
	}
	
	return $failedSth;
}

sub getFreshEnactionReport($$) {
	my($outputDoc,$portfile)=@_;
	
	my($buffer)=undef;
	eval {
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

		$buffer='';
		while ($line = <$SOCKET>) {
			$buffer.=$line;
		}
		close($SOCKET) or die "CLOSE SOCKET ERROR: $!"; 
	};
	
	my($enactionReportError)=($@)?$@:undef;
	
	return parseEnactionReport($outputDoc,$buffer,$enactionReportError);
}

sub getStoredEnactionReport($$) {
	my($outputDoc,$dir)=@_;
	
	my($ER);
	my($rep)='';
	
	if(open($ER,'<',$dir.'/report.xml')) {
		my($line)=undef;
		while($line=<$ER>) {
			$rep .= $line;
		}
		close($ER);
	}
	
	return parseEnactionReport($outputDoc,$rep);
}

sub parseEnactionReport($$;$) {
	my($outputDoc,$enactionReport,$enactionReportError)=@_;
	
	my($er)=undef;
	my($parser)=XML::LibXML->new();
	my($repnode)=undef;
	
	if(!defined($enactionReportError) && defined($enactionReport)) {
		eval {
			my($er)=$parser->parse_string(decode('UTF-8', $enactionReport));
			$repnode=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionReport');
			$repnode->appendChild($outputDoc->importNode($er->documentElement));
		};

		if($@) {
			$enactionReportError=$@
		}
	}
	
	unless(defined($repnode) || defined($enactionReportError)) {
		$enactionReportError='Undefined error, please contact IWWE&M developer';
	}
	
	if(defined($enactionReportError)) {
		$repnode=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'enactionReportError');
		$enactionReportError .= "\n\nOffending content:\n\n$enactionReport"  if(defined($enactionReport));
		$repnode->appendChild($outputDoc->createCDATASection($enactionReportError));
	}
	
	return $repnode;
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
		# For completion, we handle qualified job Ids
		$jobId =~ s/^$WorkflowCommon::ENACTIONPREFIX//;
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
				if(open($WFID,'<',$jobdir.'/'.$WorkflowCommon::WFIDFILE)) {
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
							# First in unqualified form
							$snapnode->setAttribute('name',encode('UTF-8',$snapshotName));
							$snapnode->setAttribute('uuid',$uuid);
							$snapnode->setAttribute('date',LockNLog::getPrintableNow());
							if(defined($snapshotDesc) && length($snapshotDesc)>0) {
								$snapnode->appendChild($catdoc->createCDATASection(encode('UTF-8',$snapshotDesc)));
							}

							$catdoc->documentElement->appendChild($snapnode);

							# Last step, update catalog!
							$catdoc->toFile($catfile);

							# And let's add it to the report
							# in qualified form
							$snapnode->setAttribute('uuid',$WorkflowCommon::SNAPSHOTPREFIX.$workflowId.':'.$uuid);
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
			if(defined($wfsnap)) {
				$state = 'frozen';
			} elsif(-f $jobdir . '/FATAL' || ! -f $ppidfile) {
				$state='dead';
			} elsif(!defined($wfsnap) && open($PPID,'<',$ppidfile)) {
				my($ppid)=<$PPID>;
				close($PPID);
				
				my($pidfile)=$jobdir . '/PID';
				my($PID);
				unless(-f $pidfile) {
					# So it could be queued
					$enactionReport=getStoredEnactionReport($outputDoc,$jobdir);
					$state = 'queued';
					$includeSubs=undef;
				} elsif(open($PID,'<',$pidfile)) {
					my($pid)=<$PID>;
					close($PID);
					
					# Now we have a pid, we can check for the enaction job
					if( -f $jobdir . '/FINISH') {
						$state = 'finished';
						$enactionReport=getStoredEnactionReport($outputDoc,$jobdir);
					} elsif( -f $jobdir . '/FAILED.txt') {
						$state = 'error';
						$enactionReport=getStoredEnactionReport($outputDoc,$jobdir);
					} elsif(kill(0,$pid) > 0) {
						# It could be still running...
						unless(defined($dispose)) {
							if( -f $jobdir . '/START') {
								# So, let's fetch the state
								$enactionReport=getFreshEnactionReport($outputDoc,$jobdir . '/socket');
								
								$state = 'running';
							} else {
								# So it could be queued
								#$state = 'unknown';
								$state = 'queued';
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
						$enactionReport=getStoredEnactionReport($outputDoc,$jobdir);
					}
				} else {
					$state = 'fatal';
					$includeSubs=undef;
				}
				
				if($state ne 'fatal' && defined($enactionReport) && $enactionReport->localname eq 'enactionReportError') {
					$state='fatal';
				}
			} else {
				$state = 'fatal';
				$includeSubs=undef;
			}
			
			if(defined($enactionReport)) {
				$es->appendChild($enactionReport);
			}
			
			# Now including subinformation...
			if(defined($includeSubs)) {
				my($failedSth)=processStep($jobdir,$outputDoc,$es,(defined($enactionReport) && $enactionReport->localname eq 'enactionReport')?$enactionReport:undef);
				$state='dubious'  if($state eq 'finished' && defined($failedSth));
			}
		}
	}

	$state='unknown'  unless(defined($state));

	$es->setAttribute('state',$state);
	$root->appendChild($es);
}

print $query->header(-type=>'text/xml',-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');

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
