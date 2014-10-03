#!/usr/bin/perl -W

# $Id$
# enactionlauncher.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
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
# Original IWWE&M concept, design and coding done by JosÃ© MarÃ­a FernÃ¡ndez GonzÃ¡lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

use Carp ();

local $SIG{__WARN__} = \&Carp::cluck;
local $SIG{__DIE__} = \&Carp::confess;

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
use IWWEM::Config;
use IWWEM::InternalWorkflowList::Constants;
use IWWEM::InternalWorkflowList::Confirmation;
use IWWEM::WorkflowCommon;
use IWWEM::InternalWorkflowList;
use IWWEM::SelectiveWorkflowList;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;
use LockNLog::Mutex;

my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($wfparam)=undef;
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
my($autoUUID)=undef;

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
my($altViewerURI)=undef;

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
	if($param eq $IWWEM::WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOW || $param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWREF || $param eq $IWWEM::WorkflowCommon::PARAMWFID) {
		$wfparam=$param;
		$wfilefetched=1;
		if($param ne $IWWEM::WorkflowCommon::PARAMWORKFLOW) {
			my($id)=$query->param($param);
			
			my($swl)=IWWEM::SelectiveWorkflowList->new($id,1);
			$wabspath=$swl->getWorkflowURI($id);
			if(defined($wabspath)) {
				($workflowId,$originalInput,$retval)=$swl->resolveWorkflowId($id);
			}
			
			$wfilefetched=1;
			# Deps should be done later...
		}
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMALTVIEWERURI) {
		$paramval = $altViewerURI = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::BACLAVAPARAM) {
		$baclavafound=1;
	} elsif($param eq 'reusePrevInput') {
		$reusePrevInput=1;
	} elsif($param eq 'onlySaveAsExample') {
		$onlySaveAsExample=1;
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMSAVEEX) {
		$paramval = $exampleName = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::PARAMSAVEEXDESC) {
		$paramval = $exampleDesc = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif($param eq $IWWEM::WorkflowCommon::AUTOUUID) {
		$paramval = $query->param($param);
		$autoUUID = $paramval  unless($paramval eq '1' || $paramval eq '');
	} elsif(length($param)>length($IWWEM::WorkflowCommon::PARAMPREFIX) && index($param,$IWWEM::WorkflowCommon::PARAMPREFIX)==0) {
		push(@parseParam,$param);
	} elsif(length($param)>length($IWWEM::WorkflowCommon::ENCODINGPREFIX) && index($param,$IWWEM::WorkflowCommon::ENCODINGPREFIX)==0) {
		my $paramName = substr($param,length($IWWEM::WorkflowCommon::ENCODINGPREFIX));
		$paramval = $query->param($param);
		$encodingHash{$paramName} = decode('UTF-8',$paramval);
	} elsif(length($param)>length($IWWEM::WorkflowCommon::MIMEPREFIX) && index($param,$IWWEM::WorkflowCommon::MIMEPREFIX)==0) {
		my $paramName = substr($param,length($IWWEM::WorkflowCommon::MIMEPREFIX));
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
my($enAutoUUID,$enerr)=();

$responsibleName=''  unless(defined($responsibleName));

my($iwfl)=IWWEM::InternalWorkflowList->new(undef,1);
my($callURI)=undef;
if($retval==0 && !$query->cgi_error()) {
	if(defined($wfparam) && $wfparam eq $IWWEM::WorkflowCommon::PARAMWORKFLOW) {
		my($p_res)=undef;
		($retval,$retvalmsg,$p_res)=$iwfl->parseInlineWorkflows($query,$responsibleMail,$responsibleName,undef,undef,$wfparam,$hasInputWorkflowDeps,undef,$IWWEM::Config::JOBDIR,1);
		
		if($retval==0 && scalar(@{$p_res})>0) {
			$jobid=$p_res->[0];
			$jobdir = $IWWEM::Config::JOBDIR . '/' .$jobid;
		}
	} else {
		do {
			$jobid = IWWEM::WorkflowCommon::genUUID();
			$jobdir = $IWWEM::Config::JOBDIR . '/' .$jobid;
		} while (-d $jobdir);
		mkpath($jobdir);
		($enerr,$enAutoUUID)=IWWEM::WorkflowCommon::createResponsibleFile($jobdir,$responsibleMail,$responsibleName);
	}
	$callURI=IWWEM::WorkflowCommon::enactionGUIURI($query,$jobid,$altViewerURI);
	my($VIE);
	if(open($VIE,'>',$jobdir.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
		print $VIE $callURI;
		close($VIE);
	}
}

my($wfile)=$jobdir . '/'. $IWWEM::WorkflowCommon::WORKFLOWFILE;
my($efile)=$jobdir . '/joberrlog.txt';
my($inputdir)=$jobdir . '/jobinput';
mkdir($inputdir);

if($retval==0 && !$query->cgi_error()) {
	foreach my $param (@parseParam) {
		# Single param handling
		my $paramName = substr($param,length($IWWEM::WorkflowCommon::PARAMPREFIX));
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
	# As network resources are supported by parse_file, nice!
	my($WFmaindoc)=$parser->parse_file($wabspath);
	
	($retval,$retvalmsg)=$iwfl->patchWorkflow($query,$jobid,$jobdir,undef,$WFmaindoc,$hasInputWorkflowDeps,1,1);
}

if($retval==0 && !$query->cgi_error() && defined($baclavafound)) {
	my($param)=$IWWEM::WorkflowCommon::BACLAVAPARAM;
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
				
				if($exfile =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
					$origWFID=$1;
					$exId=$2;
				} else {
					$origWFID=$workflowId;
					$exId=$exfile;
				}
				
				my($example)=$IWWEM::Config::WORKFLOWDIR.'/'.$origWFID.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$exId.'.xml';
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
		$exampleuuid=IWWEM::WorkflowCommon::genUUID();
		$relrandfile=$workflowId.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$exampleuuid.'.xml';
		$randfile=$IWWEM::Config::WORKFLOWDIR.'/'.$relrandfile;
	} while(-f $randfile);
	
	my($EXH);
	close($EXH)  if(open($EXH,'>',$randfile));
	
	# Generating a pending operation
	my($PH);
	($penduuid,$penddir,$PH)=IWWEM::InternalWorkflowList::Confirmation::genPendingOperationsDir($IWWEM::InternalWorkflowList::Confirmation::COMMANDADD);
	$fullexampleuuid=$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX."$workflowId:$exampleuuid";
	print $PH "$fullexampleuuid\n";
	close($PH);
	
	# Now, the new files
	my($pendrandfile)=$penddir.'/'.$exampleuuid.'.xml';
	my($pendcatalogfile)=$penddir.'/'.$exampleuuid.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;

	close($EXH)  if(open($EXH,'>',$pendrandfile));
	
	my($catalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
	$example=$catalog->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'example');
	$example->setAttribute('uuid',$exampleuuid);
	$example->setAttribute('name',$exampleName);
	$example->setAttribute('path',$relrandfile);
	$example->setAttribute('date',LockNLog::getPrintableNow());
	$example->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
	$example->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
	
	# New style
	my($respnode)=$catalog->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'responsible');
	$respnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
	$respnode->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
	$example->appendChild($respnode);
	
	my($exAutoUUID)=IWWEM::WorkflowCommon::genUUID();
	$example->setAttribute($IWWEM::WorkflowCommon::AUTOUUID,$exAutoUUID);
	
	# New style
	if(defined($exampleDesc) && length($exampleDesc) > 0) {
		my($descnode)=$catalog->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
		$descnode->appendChild($catalog->createCDATASection($exampleDesc));
		$example->appendChild($descnode);
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
	system($IWWEM::WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowlauncher',
		'-baseDir',$IWWEM::Config::MAVENDIR,
		'-workflow',$wfile,
	#	'-expandSubWorkflows',
		'-statusDir',$jobdir,
		@baclavadesc,
		@inputdesc,
		@saveExample
	);
	IWWEM::InternalWorkflowList::Confirmation::sendResponsiblePendingMail($query,undef,$penduuid,'example',$IWWEM::InternalWorkflowList::Confirmation::COMMANDADD,$fullexampleuuid,$responsibleMail,$exampleName,$autoUUID);
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
		if(open($WFID,'>',$jobdir.'/'.$IWWEM::WorkflowCommon::WFIDFILE)) {
			print $WFID $workflowId;
			close($WFID);
		}
	}
	
	# Now, reporting...
	print $query->header(-type=>(defined($dataisland)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');
	my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
	my($root)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'enactionlaunched');
	$root->setAttribute('time',LockNLog::getPrintableNow());
	$root->setAttribute('jobId',$jobid);
	$root->setAttribute($IWWEM::WorkflowCommon::AUTOUUID,$enAutoUUID);
	$root->appendChild($outputDoc->createComment( encode('UTF-8',$IWWEM::WorkflowCommon::COMMENTEL) ));
	$outputDoc->setDocumentElement($root);
	
	if(defined($example)) {
		$root->appendChild($outputDoc->importNode($example));
	}
	
	if(defined($dataisland)) {
		print "<html><body><$dataislandTag id='".$IWWEM::WorkflowCommon::PARAMISLAND."'>\n";
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
				IWWEM::WorkflowCommon::sendEnactionMail($query,$jobid,$responsibleMail,$callURI,1);
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
					IWWEM::WorkflowCommon::sendEnactionMail($query,$jobid,$responsibleMail,$callURI);
					
					exec($IWWEM::WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowlauncher',
						'-baseDir',$IWWEM::Config::MAVENDIR,
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
		my($mutex)=LockNLog::Mutex->new($IWWEM::Config::MAXJOBS,$IWWEM::Config::JOBCHECKDELAY);
		$mutex->mutex($submethod);
	}
}
