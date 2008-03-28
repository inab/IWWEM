#!/usr/bin/perl -W

# $Id$
# enactionlauncher.pl
# from INB Web Workflow Enactor & Manager (IWWE&M)
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
	
# Step Zero, job directory
my($jobid)=undef;
my($jobdir)=undef;
do {
	$jobid = WorkflowCommon::genUUID();
	$jobdir = $WorkflowCommon::JOBDIR . '/' .$jobid;
} while (-d $jobdir);
mkpath($jobdir);

my($wfile)=$jobdir . '/'. $WorkflowCommon::WORKFLOWFILE;
my($efile)=$jobdir . '/joberrlog.txt';
my($workflowId)=undef;
my($wfilefetched)=undef;
my($baclavafound)=undef;
my($inputdir)=$jobdir . '/jobinput';
mkdir($inputdir);
my(@inputdesc)=();
my(@baclavadesc)=();
my($inputcount)=0;
my($retval)=0;
my($dataisland)=undef;
my($dataislandTag)=undef;

my($exampleName)=undef;
my($exampleDesc)=undef;
my(@saveExample)=();

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
	} elsif($param eq 'workflow') {
		$wfilefetched=1;
		my($WORKFLOW)=$query->upload($param);
		
		last if($query->cgi_error());
		
		my($WFH);
		if(open($WFH,'>',$wfile)) {
			unless(defined($WORKFLOW)) {
				$workflowId=$query->param($param);
				
				my($wabspath)=$WorkflowCommon::WORKFLOWDIR . '/' . $workflowId . '/' . $WorkflowCommon::WORKFLOWFILE;
				
				# Is it a 'sure' path?
				if(index($workflowId,'/')==0 || index($workflowId,'../')!=-1 || ! -f $wabspath) {
					$retval = 2;
					last;
				}
				
				unless(open($WORKFLOW,'<',$wabspath)) {
					$retval=1;
					last;
				}
			}
			
			# Copying the file
			my($line);
			while($line=<$WORKFLOW>) {
				print $WFH $line;
			}
			
			# Time to copy dependencies needed by workflow
			if(defined($workflowId)) {
				close($WORKFLOW);
				my($depsdir)=$WorkflowCommon::WORKFLOWDIR . '/' . $workflowId . '/' . $WorkflowCommon::DEPDIR;
				my($jobdepsdir)=$jobdir.'/'.$WorkflowCommon::DEPDIR;
				mkpath($jobdepsdir);
				my($DIR);
				if(opendir($DIR,$depsdir)) {
					my($entry);
					while($entry=readdir($DIR)) {
						my($fentry)=$depsdir.'/'.$entry;
						next  if(index($entry,'.')==0 || !($entry =~ /\.xml$/) || !-f $fentry);
						
						copy($fentry,$jobdepsdir.'/'.$entry);
					}
					closedir($DIR);
				}
			}
			
			close($WFH);
		} else {
			$retval = 3;
			last;
		}
	} elsif($param eq $WorkflowCommon::BACLAVAPARAM) {
		$baclavafound=1;
	} elsif($param eq $WorkflowCommon::PARAMSAVEEX) {
		$exampleName=$query->param($param);
	} elsif($param eq $WorkflowCommon::PARAMSAVEEXDESC) {
		$exampleDesc=$query->param($param);
	} elsif(length($param)>length($WorkflowCommon::PARAMPREFIX) && index($param,$WorkflowCommon::PARAMPREFIX)==0) {
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
				my($example)=$WorkflowCommon::WORKFLOWDIR.'/'.$workflowId.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$exfile.'.xml';
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
	
	my($parser)=XML::LibXML->new();
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
	push(@saveExample,'-saveInputs',$randfile);
}

# We must signal here errors and exit
if($retval!=0 || $query->cgi_error() || !defined($wfilefetched)) {
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
		if(open($WFID,'>',$jobdir.'/WFID')) {
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
	
	# Now it is time to enqueue this query (limited resources)
	my($mutex)=LockNLog::Mutex->new($WorkflowCommon::MAXJOBS,$WorkflowCommon::JOBCHECKDELAY);
	# Now trying to become a true workflow launcher!!!!
	$mutex->mutex(sub {
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
	});
}
