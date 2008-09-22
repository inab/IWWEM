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
use IO::Handle;
use POSIX qw(setsid);
use XML::LibXML;

# And now, my own libraries!
use lib "$FindBin::Bin";
use WorkflowCommon;
use workflowmanager;

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

my($responsibleMail)=undef;
my($responsibleName)=undef;

my(@inputdesc)=();
my(@inputMap)=();
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
my(%encodingHash)=();
my(%mimeHash)=();

# First step, parameter and workflow storage (if any!)
PARAMPROC:
foreach my $param ($query->param()) {
	my($paramval)=undef;

	# Let's check at UTF-8 level!
	my($tmpparamname)=$param;
	eval {
		# Beware decode in croak mode!
		decode('UTF-8',$tmpparamname,Encode::FB_CROAK);
	};
	
	if($@) {
		$retval=-1;
		$retvalmsg="Param name $param is not a valid UTF-8 string!";
		last;
	}
	
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
		$paramval = $exampleName = $query->param($param);
	} elsif($param eq $WorkflowCommon::PARAMSAVEEXDESC) {
		$paramval = $exampleDesc = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif(length($param)>length($WorkflowCommon::PARAMPREFIX) && index($param,$WorkflowCommon::PARAMPREFIX)==0) {
		push(@parseParam,$param);
	} elsif(length($param)>length($WorkflowCommon::ENCODINGPREFIX) && index($param,$WorkflowCommon::ENCODINGPREFIX)==0) {
		my $paramName = substr($param,length($WorkflowCommon::ENCODINGPREFIX));
		$paramval = $query->param($param);
		$encodingHash{$paramName} = decode('UTF-8',$paramval);
	} elsif(length($param)>length($WorkflowCommon::MIMEPREFIX) && index($param,$WorkflowCommon::MIMEPREFIX)==0) {
		my $paramName = substr($param,length($WorkflowCommon::MIMEPREFIX));
		$paramval = $query->param($param);
		$paramval =~ s/^[ \t]+//;
		$paramval =~ s/[ \t]+$//;
		my(@splitparams)=split(/ *, */,$paramval);
		if(exists($mimeHash{$paramName})) {
			push(@{$mimeHash{$paramName}},@splitparams);
		} else {
			$mimeHash{$paramName}=\@splitparams;
		}
	}
	
	# Error checking
	last  if($query->cgi_error());
	
	# Let's check at UTF-8 level!
	if(defined($paramval)) {
		eval {
			# Beware decode in croak mode!
			decode('UTF-8',$paramval,Encode::FB_CROAK);
		};
		
		if($@) {
			$retval=-1;
			$retvalmsg="Param $param does not contain a valid UTF-8 string!";
			last;
		}
	}
}

my($parser)=XML::LibXML->new();

# Step Zero, job directory
my($jobid)=undef;
my($jobdir)=undef;

$responsibleName=''  unless(defined($responsibleName));

if($retval==0 && !$query->cgi_error()) {
	if(defined($hasInputWorkflow)) {
		$workflowId=undef;

		my($p_res)=undef;
		($retval,$retvalmsg,$p_res)=workflowmanager::parseInlineWorkflows($query,$parser,$responsibleMail,$responsibleName,$hasInputWorkflowDeps,undef,$WorkflowCommon::JOBDIR,1);

		$jobid=$p_res->[0]  if(scalar(@{$p_res})>0);
		$jobdir = $WorkflowCommon::JOBDIR . '/' .$jobid;
	} else {
		do {
			$jobid = WorkflowCommon::genUUID();
			$jobdir = $WorkflowCommon::JOBDIR . '/' .$jobid;
		} while (-d $jobdir);
		mkpath($jobdir);
		WorkflowCommon::createResponsibleFile($jobdir,$responsibleMail,$responsibleName);
	}
}

my($wfile)=$jobdir . '/'. $WorkflowCommon::WORKFLOWFILE;
my($efile)=$jobdir . '/joberrlog.txt';
my($inputdir)=$jobdir . '/jobinput';
mkdir($inputdir);

if($retval==0 && !$query->cgi_error()) {
	foreach my $param (@parseParam) {
		# Single param handling
		my $paramName = substr($param,length($WorkflowCommon::PARAMPREFIX));
		my $paramPath = $inputdir . '/' . $inputcount;
		my $encoding = undef;

		my(@PFH)=$query->upload($param);

		last  if($query->cgi_error());

		my($isfh)=1;
		my(@mime)=();
		
		# Getting obtained mime types
		if(exists($mimeHash{$paramName})) {
			push(@mime,@{$mimeHash{$paramName}});
		}
		
		if(scalar(@PFH)==0) {
			@PFH=$query->param($param);
			$isfh=undef;
		} else {
			if(exists($encodingHash{$paramName})) {
				$encoding = $encodingHash{$paramName};
			}
			
			# Now, the ones associated by the browser
			foreach my $pfile ($query->param($param)) {
				my($uinfo)=$query->uploadInfo($pfile);
				if(exists($uinfo->{'Content-Type'})) {
					my($ctype)=$uinfo->{'Content-Type'};
					# Removing the possible tail to the content type
					$ctype =~ s/[ \t]*;.*$//;
					$ctype =~ s/^[  \t]+//;
					
					# And pushing the obtained mime!
					push(@mime,$ctype)  if(length($ctype)>0);
				}
			}
		}
		
		# Setting default encoding (if needed)
		$encoding = 'UTF-8'  unless(defined($encoding) && length($encoding)>0);
		
		# Removing duplicate mime/types
		if(scalar(@mime)>1) {
			my(%dup);
			@dup{@mime}=();
			@mime=keys(%dup);
		}
		
		# The tuple
		my(@inputFiles)=($paramName,$encoding,join(",",@mime));
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
					my($block);
					# We hope the file will be in UTF-8
					while(read($PH,$block,4096)) {
						print $PARH $block;
					}
				} else {
					# Content should be already in UTF-8!
					eval {
						# Beware decode!
						my($crap)=$PH;
						decode('UTF-8',$crap,Encode::FB_CROAK);
					};
					if($@) {
						$retval = 4;
						$retvalmsg="Param $param does not contain a valid UTF-8 string!";
						last PARAMPROC;
					}
					
					print $PARH ($PH);
				}
				close($PARH);
				
				push(@inputFiles,$destfile);
			} else {
				$retval = 4;
				last PARAMPROC;
			}
			$fcount++;
			$destfile=$paramPath . '/' . $fcount;
		}
		
		push(@inputMap,\@inputFiles);
		#push(@inputdesc,(defined($many)?'-inputArrayDir':'-inputFile'),$paramName,$paramPath);

		$inputcount++;
	}
}

if($retval==0 && !$query->cgi_error() && defined($workflowId)) {
	# Copying and patching input workflow
	my($WFmaindoc)=$parser->parse_file($wabspath);
	
	($retval,$retvalmsg)=workflowmanager::patchWorkflow($query,$parser,undef,$jobid,$jobdir,undef,$WFmaindoc,$hasInputWorkflowDeps,1,1);
}

if($retval==0 && !$query->cgi_error() && defined($baclavafound)) {
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
} elsif($retval==0 && !$query->cgi_error() && defined($originalInput) && defined($reusePrevInput)) {
	# Re-enaction
	my $paramPath = $inputdir . '/' . $inputcount . '-baclava';
	mkpath($paramPath);
	my($baclavaname)=$paramPath.'/'.'original.xml';
	if(copy($originalInput,$baclavaname)) {
		$inputcount++;
		push(@baclavadesc,'-inputDoc',$baclavaname);
	} else {
		$retval=4;
	}
}

# This example node will be used to notify
# the creation of the example file
my($example)=undef;
my($fullexampleuuid)=undef;
my($penddir)=undef;
my($penduuid)=undef;
# Saving as an example
if($retval==0 && !$query->cgi_error() && defined($exampleName) && defined($workflowId) && defined($responsibleMail)) {
	my($exampleuuid);
	my($relrandfile);
	my($randfile);
	do {
		$exampleuuid=WorkflowCommon::genUUID();
		$relrandfile=$workflowId.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$exampleuuid.'.xml';
		$randfile=$WorkflowCommon::WORKFLOWDIR.'/'.$relrandfile;
	} while(-f $randfile);
	
	my($EXH);
	close($EXH)  if(open($EXH,'>',$randfile));
	
	# Generating a pending operation
	my($PH);
	($penduuid,$penddir,$PH)=WorkflowCommon::genPendingOperationsDir($WorkflowCommon::COMMANDADD);
	$fullexampleuuid=$WorkflowCommon::EXAMPLEPREFIX."$workflowId:$exampleuuid";
	print $PH "$fullexampleuuid\n";
	close($PH);
	
	# Now, the new files
	my($pendrandfile)=$penddir.'/'.$exampleuuid.'.xml';
	my($pendcatalogfile)=$penddir.'/'.$exampleuuid.'_'.$WorkflowCommon::CATALOGFILE;

	close($EXH)  if(open($EXH,'>',$pendrandfile));
	
	my($catalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
	$example=$catalog->createElementNS($WorkflowCommon::WFD_NS,'example');
	$example->setAttribute('uuid',$exampleuuid);
	$example->setAttribute('name',$exampleName);
	$example->setAttribute('path',$relrandfile);
	$example->setAttribute('date',LockNLog::getPrintableNow());
	$example->setAttribute($WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
	$example->setAttribute($WorkflowCommon::RESPONSIBLENAME,$responsibleName);
	if(defined($exampleDesc) && length($exampleDesc) > 0) {
		$example->appendChild($catalog->createCDATASection($exampleDesc));
	}
	
	# Save example name and description
	$catalog->setDocumentElement($example);
	$catalog->toFile($pendcatalogfile);
	
	# Last
	# push(@saveExample,(defined($onlySaveAsExample)?'-onlySaveInputs':'-saveInputs'),$pendrandfile);
	push(@saveExample,'-onlySaveInputs',$pendrandfile);
}

# Let's generate the input map
if($retval==0 && !$query->cgi_error() && scalar(@inputMap)>0) {
	my($inputFileMap)=$inputdir . '/' .'inputmap.txt';
	my($IMAP);
	if(open($IMAP,'>',$inputFileMap)) {
		foreach my $p_inputMap (@inputMap) {
			print $IMAP join("\t",@{$p_inputMap}),"\n";
		}
		close($IMAP);
		push(@inputdesc,'-inputMap',$inputFileMap);
	} else {
		$retval=5;
		$retvalmsg="Error while saving input maps file";
	}
}

# We must signal here errors and exit
if($retval!=0 || $query->cgi_error() || !defined($wfilefetched)) {
	$retvalmsg=''  unless(defined($retvalmsg));
	print STDERR "RETVAL  $retval  RETVALMSG $retvalmsg  ".$query->cgi_error()."\n";
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because '.(($retval!=0)?'there was an internal input/output error':(($query->cgi_error())?'uploaded contents were malformed':'no workflow was uploaded'))),
		$query->strong($error);
	
	if(defined($retvalmsg) && $retvalmsg ne '') {
		print $query->strong($retvalmsg);
	}
	
	rmtree($jobdir)  if(defined($jobdir));
	rmtree($penddir)  if(defined($penddir));
	exit 0;
}

# Just now, is the moment to send the e-mail
# related to examples
if(defined($penduuid)) {
	system($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowlauncher',
		'-baseDir',$WorkflowCommon::MAVENDIR,
		'-workflow',$wfile,
	#	'-expandSubWorkflows',
		'-statusDir',$jobdir,
		@baclavadesc,
		@inputdesc,
		@saveExample
	);
	WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,'example',$WorkflowCommon::COMMANDADD,$fullexampleuuid,$responsibleMail,$exampleName);
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
	rmtree($penddir)  if(defined($penddir));
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
		print $outputDoc->createTextNode($root->toString())->toString();
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
			if(defined($eraseRes)) {
				rmtree($jobdir);
			} else {
				# Mail is sent here, just after running!
				WorkflowCommon::sendEnactionMail($query,$jobid,$responsibleMail,1);
			}
		} else {
			# I'm the grandson, which can be killed
			setsid();
			
			{
				unless(defined($onlySaveAsExample)) {
					my($RUNPID);
					if(open($RUNPID,'>',$jobdir.'/PID')) {
						print $RUNPID $$;
						close($RUNPID);
					}
					
					# Mail is sent here, just before running!
					WorkflowCommon::sendEnactionMail($query,$jobid,$responsibleMail);
					
					exec($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowlauncher',
						'-baseDir',$WorkflowCommon::MAVENDIR,
						'-workflow',$wfile,
	#					'-expandSubWorkflows',
						'-statusDir',$jobdir,
						@baclavadesc,
						@inputdesc
					);
				} else {
					exit(0);
				}
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
