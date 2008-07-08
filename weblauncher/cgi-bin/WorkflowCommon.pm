#!/usr/bin/perl -W

# $Id$
# WorkflowCommon.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: Jos� Mar�a Fern�ndez Gonz�lez (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

package WorkflowCommon;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use Mail::Sender;
use POSIX qw(strftime);
use XML::LibXML;

use vars qw($WORKFLOWFILE $SVGFILE $PNGFILE $PDFFILE $WFIDFILE $DEPDIR $EXAMPLESDIR $SNAPSHOTSDIR);

use vars qw($INPUTSFILE $OUTPUTSFILE);

use vars qw($REPORTFILE $STATICSTATUSFILE);

use vars qw($WORKFLOWRELDIR $WORKFLOWDIR $JOBRELDIR $JOBDIR $MAXJOBS $JOBCHECKDELAY $LAUNCHERDIR $MAVENDIR);

use vars qw($CONFIRMRELDIR $CONFIRMDIR $COMMANDFILE $PENDINGERASEFILE $PENDINGADDFILE);

use vars qw($COMMANDADD $COMMANDERASE);

use vars qw($PATTERNSFILE);

use vars qw($BACLAVAPARAM $PARAMWFID $PARAMWORKFLOWDEP $PARAMWORKFLOW $PARAMISLAND);
use vars qw($PARAMPREFIX $SNAPSHOTPREFIX $EXAMPLEPREFIX $ENACTIONPREFIX);
use vars qw($WFD_NS $PAT_NS $XSCUFL_NS $BACLAVA_NS);

use vars qw($PARAMSAVEEX $PARAMSAVEEXDESC $CATALOGFILE $RESPONSIBLEFILE);

use vars qw($COMMENTPRE $COMMENTPOST $COMMENTWM $COMMENTEL $COMMENTES);

use vars qw(%GRAPHREP);

use vars qw($IWWEMmailaddr $RESPONSIBLENAME $RESPONSIBLEMAIL);

use vars qw(%HARDHOST);

$IWWEMmailaddr='jmfernandez@cnio.es';


# Workflow files constants
$RESPONSIBLENAME='responsibleName';
$RESPONSIBLEMAIL='responsibleMail';
$WORKFLOWFILE='workflow.xml';
$SVGFILE='workflow.svg';
$PDFFILE='workflow.pdf';
$PNGFILE='workflow.png';
$WFIDFILE='WFID';

%GRAPHREP=(
	$WorkflowCommon::SVGFILE => 'image/svg+xml',
	$WorkflowCommon::PNGFILE => 'image/png',
	$WorkflowCommon::PDFFILE => 'application/pdf'
);

$DEPDIR='dependencies';
$EXAMPLESDIR='examples';
$SNAPSHOTSDIR='snapshots';

# Base directory for stored workflows
$WORKFLOWRELDIR = 'workflows';
$WORKFLOWDIR = $FindBin::Bin. '/../' . $WORKFLOWRELDIR;
# Base directory for jobs
$JOBRELDIR = 'jobs';
$JOBDIR = $FindBin::Bin . '/../' .$JOBRELDIR;
# Patterns file
$PATTERNSFILE = $FindBin::Bin . '/../EVpatterns.xml';
# Number of concurrent jobs
$MAXJOBS = 10;
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

$PENDINGERASEFILE='eraselist.txt';
$PENDINGADDFILE='addlist.txt';
$CONFIRMRELDIR='.pending';
$CONFIRMDIR=$FindBin::Bin.'/../'.$CONFIRMRELDIR;
$COMMANDFILE='.command';
$COMMANDADD='add';
$COMMANDERASE='erase';

$PARAMWFID='id';
$PARAMWORKFLOW='workflow';
$PARAMWORKFLOWDEP='workflowDep';
$PARAMISLAND='dataIsland';
$PARAMSAVEEX='exampleName';
$PARAMSAVEEXDESC='exampleDesc';
$BACLAVAPARAM='BACLAVA_FILE';
$PARAMPREFIX='PARAM_';
$SNAPSHOTPREFIX='snapshot:';
$EXAMPLEPREFIX='example:';
$ENACTIONPREFIX='enaction:';

$CATALOGFILE='catalog.xml';
$RESPONSIBLEFILE='responsible.xml';
$INPUTSFILE='Inputs.xml';
$OUTPUTSFILE='Outputs.xml';
$REPORTFILE='report.xml';
$STATICSTATUSFILE='staticstatus.xml';

$WFD_NS = 'http://www.cnio.es/scombio/jmfernandez/taverna/inb/frontend';
$PAT_NS = $WFD_NS . '/patterns';
$XSCUFL_NS = 'http://org.embl.ebi.escience/xscufl/0.1alpha';
$BACLAVA_NS = 'http://org.embl.ebi.escience/baclava/0.1alpha';

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

%HARDHOST=(
	'ubio.bioinfo.cnio.es' => '/biotools/IWWEM/cgi-bin',
	'iwwem.bioinfo.cnio.es' => '/cgi-bin',
);

# Method declaration
sub genUUID();
sub patchXMLString($);
sub depatchPath($);

sub getCGIBaseURI($);
sub genPendingOperationsDir($);
sub createResponsibleFile($$;$);
sub createMailer();
sub enactionGUIURI($$);
sub sendResponsibleConfirmedMail($$$$$$$;$$);
sub sendResponsiblePendingMail($$$$$$$$);
sub sendEnactionMail($$$;$);

sub parseInlineWorkflows($$$$$;$$$);
sub patchWorkflow($$$$$$$;$$$);

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
	#my($trans)=WorkflowCommon::patchXMLString($_[0]);
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
	my($virtualrel)=$ENV{'HTTP_VIA'} || $ENV{'HTTP_FORWARDED'} || $ENV{'HTTP_X_FORWARDED_FOR'};
	if(defined($virtualrel)) {
		if($virtualrel =~ /^(?:https?:\/\/[^:\/]+)?(?::[0-9]+)?(\/.*)/) {
			$relpath=$1;
		} elsif(exists($ENV{HTTP_X_FORWARDED_HOST}) && exists($HARDHOST{$ENV{HTTP_X_FORWARDED_HOST}})) {
			$relpath=$HARDHOST{$ENV{HTTP_X_FORWARDED_HOST}}.substr($relpath,rindex($relpath,'/'));
		}
	}
	
        if(($proto eq 'http' && $port eq '80') || ($proto eq 'https' && $port eq '443')) {
		$port='';
	} else {
		$port = ':'.$port;
	}
	return "$proto://$host$port$relpath";
}

# Generates a pending operation directory structure
sub genPendingOperationsDir($) {
	my($oper)=@_;
	
	# Generating a unique identifier
	my($randname);
	my($randfilexml);
	my($randdir);
	do {
		$randname=WorkflowCommon::genUUID();
		$randdir=$WorkflowCommon::CONFIRMDIR.'/'.$randname;
	} while(-d $randdir);

	# Creating workflow directory
	mkpath($randdir);
	my($COM);
	my($FH);
	if(open($COM,'>',$randdir.'/'.$WorkflowCommon::COMMANDFILE)) {
		print $COM $oper;
		close($COM);
		if($oper eq $WorkflowCommon::COMMANDADD) {
			# touch
			open($FH,'>',$randdir.'/'.$WorkflowCommon::PENDINGADDFILE);
		} elsif($oper eq $WorkflowCommon::COMMANDERASE) {
			# touch
			open($FH,'>',$randdir.'/'.$WorkflowCommon::PENDINGERASEFILE);
		}
	}
	
	return ($randname,$randdir,$FH);
}

# Responsible name and mail must be already in UTF-8!
sub createResponsibleFile($$;$) {
	my($basedir,$responsibleMail,$responsibleName)=@_;
	
	$responsibleName=''  unless(defined($responsibleName));
	
	eval {
		my($resdoc)=XML::LibXML::Document->createDocument('1.0','UTF-8');
		my($resroot)=$resdoc->createElementNS($WorkflowCommon::WFD_NS,'responsible');
		$resroot->appendChild($resdoc->createComment( encode('UTF-8',$WorkflowCommon::COMMENTEL) ));
		$resroot->setAttribute($WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
		$resroot->setAttribute($WorkflowCommon::RESPONSIBLENAME,$responsibleName);
		$resdoc->setDocumentElement($resroot);
		$resdoc->toFile($basedir.'/'.$WorkflowCommon::RESPONSIBLEFILE);
	};
	
	return $@;
}

sub createMailer() {
	my($mailserver)='webmail.cnio.es';
	my($base64user)='YmlvZGI=';
	my($base64pass)='Y25pby05OA==';
	
	my($smtp) = Mail::Sender->new({smtp=>$mailserver,
		auth=>'LOGIN',
		auth_encoded=>1,
		authid=>$base64user,
		authpwd=>$base64pass
	#	subject=>'Prueba4',
	#	debug=>\*STDERR
	});
	
	return $smtp;
}

sub enactionGUIURI($$) {
	my($query,$jobId)=@_;
	
	my($operURL)=undef;
	
	if(defined($jobId)) {
		$operURL = WorkflowCommon::getCGIBaseURI($query);
		$operURL =~ s/cgi-bin\/[^\/]+$//;
		$operURL.="enactionviewer.html?jobId=$jobId";
	}
	
	return $operURL;
}

sub sendResponsibleConfirmedMail($$$$$$$;$$) {
	my($smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname,$query,$enId)=@_;
	
	$smtp=WorkflowCommon::createMailer()  unless(defined($smtp));
	my($prettyop)=($command eq $WorkflowCommon::COMMANDADD)?'added':'disposed';
	
	my($operURL)=WorkflowCommon::enactionGUIURI($query,$enId);
	my($addmesg)='';
	if(defined($operURL)) {
		$addmesg="You can browse it at\r\n\r\n$operURL\r\n";
	}
	
	return $smtp->MailMsg({
		from=>"\"INB IWWE&M system\" <$WorkflowCommon::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your $kind $irelpath has just been $prettyop",
		msg=>"Dear IWWE&M user,\r\n    as you have just confirmed petition ".
			$code.", your $kind $irelpath".(defined($prettyname)?(" (known as $prettyname)"):'').
			" has just been $prettyop\r\n$addmesg\r\n    The INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub sendEnactionMail($$$;$) {
	my($query,$jobId,$responsibleMail,$hasFinished)=@_;
	
	my($smtp)=WorkflowCommon::createMailer();
	my($operURL)=WorkflowCommon::enactionGUIURI($query,$jobId);
	my($status)=defined($hasFinished)?'finished':'started';
	my($dataStatus)=defined($hasFinished)?'results':'progress';
	return $smtp->MailMsg({
		from=>"\"INB IWWE&M system\" <$WorkflowCommon::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your enaction $jobId has just $status",
		msg=>"Dear IWWE&M user,\r\n    your enaction $jobId has just $status. You can see the $dataStatus at\r\n\r\n$operURL\r\n\r\nThe INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub sendResponsiblePendingMail($$$$$$$$) {
	my($query,$smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname)=@_;
	
	$smtp=WorkflowCommon::createMailer()  unless(defined($smtp));
	my($prettyop)=($command eq $WorkflowCommon::COMMANDADD)?'addition':'deletion';
	
	my($operURL)=WorkflowCommon::getCGIBaseURI($query);
	$operURL =~ s/cgi-bin\/[^\/]+$//;
	$operURL.="cgi-bin/IWWEMconfirm?code=$code";
	
	return $smtp->MailMsg({
		from=>"\"INB IWWE&M system\" <$WorkflowCommon::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Confirmation for $prettyop of $kind $irelpath",
		msg=>"Dear IWWE&M user,\r\n    before the $prettyop of $kind $irelpath".
			(defined($prettyname)?(" (known as $prettyname)"):'').
			" you must confirm it by visiting\r\n\r\n$operURL\r\n\r\n    The INB Interactive Web Workflow Enactor & Manager system"
	});
}

sub parseInlineWorkflows($$$$$;$$$) {
	my($query,$parser,$responsibleMail,$responsibleName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$basedir,$dontPending)=@_;
	
	unless(defined($responsibleMail) && $responsibleMail =~ /[^\@]+\@[^\@]+\.[^\@]+/) {
		return (10,(defined($responsibleMail)?"$responsibleMail is not a valid e-mail address":'Responsible mail has not been set using '.$WorkflowCommon::RESPONSIBLEMAIL.' CGI parameter'),[]);
	}
	
	my($isCreation)=undef;
	unless(defined($basedir)) {
		$basedir=$WorkflowCommon::WORKFLOWDIR;
		$isCreation=1;
	} else {
		$doFreezeWorkflowDeps=1;
	}
	
	my($retval)=0;
	my($retvalmsg)=undef;
	my(@goodwf)=();
	
	my $context = XML::LibXML::XPathContext->new();
	$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);

	# Now, time to recognize the content
	my($param)=$WorkflowCommon::PARAMWORKFLOW;
	my @UPHL=$query->upload($param);

	unless($query->cgi_error()) {

		my($isfh)=1;

		if(scalar(@UPHL)==0) {
			@UPHL=$query->param($param);
			$isfh=undef;
		}

		foreach my $UPH (@UPHL) {
			# Generating a pending operation
			my($penduuid,$penddir,$PH)=(undef,undef,undef);
			unless(defined($dontPending)) {
				($penduuid,$penddir,$PH)=WorkflowCommon::genPendingOperationsDir($WorkflowCommon::COMMANDADD);
			}
			
			# Generating a unique identifier
			my($randname);
			my($randfilexml);
			my($randdir);
			do {
				$randname=WorkflowCommon::genUUID();
				$randdir=$basedir.'/'.$randname;
			} while(-d $randdir);
			
			# Creating workflow directory so it is reserved
			mkpath($randdir);
			my($realranddir)=$randdir;
			
			# And now, creating the pending workflow directory!
			unless(defined($dontPending)) {
				$randdir=$penddir.'/'.$randname;
				mkpath($randdir);
				# And annotate it
				print $PH "$randname\n";
				close($PH);
			}
			
			# Responsible file creation
			WorkflowCommon::createResponsibleFile($randdir,$responsibleMail,$responsibleName);
			
			# Saving the workflow data
			$randfilexml = $randdir . '/' . $WorkflowCommon::WORKFLOWFILE;
			
			my($WFmaindoc);
			
			eval {
				# CGI provides fake filehandlers :-(
				# so we have to use the push parser
				if(defined($isfh)) {
					my($line);
					while($line=<$UPH>) {
						$parser->parse_chunk($line);
					}
					# Rewind the handler
					seek($UPH,0,0);
				} else {
					$parser->parse_chunk($UPH);
				}
				$WFmaindoc=$parser->parse_chunk('',1);
				$WFmaindoc->toFile($randfilexml);
			};
			
			if($@) {
				$retval=2;
				$retvalmsg = ''  unless(defined($retvalmsg));
				$retvalmsg .= 'Error while parsing input workflow: '.$@;
				rmtree($randdir);
				last;
			}
			
			($retval,$retvalmsg)=patchWorkflow($query,$parser,$context,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps);
			
			# Erasing all...
			if($retval!=0) {
				rmtree($randdir);
				unless(defined($dontPending)) {
					rmtree($realranddir);
				}
				last;
			} elsif(!defined($dontPending)) {
				WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,'workflow',$WorkflowCommon::COMMANDADD,$randname,$responsibleMail,undef);
			}
			
			push(@goodwf,$randname);
		}
	}
	
	return ($retval,$retvalmsg,\@goodwf);
}


sub patchWorkflow($$$$$$$;$$$) {
	my($query,$parser,$context,$randname,$randdir,$isCreation,$WFmaindoc,$hasInputWorkflowDeps,$doFreezeWorkflowDeps,$doSaveDoc)=@_;
	
	my($retval)=0;
	my($retvalmsg)=undef;
	
	unless(defined($context)) {
		$context = XML::LibXML::XPathContext->new();
		$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
	}

	my($randfilexml) = $randdir . '/' . $WorkflowCommon::WORKFLOWFILE;

	# Resolving and saving dependencies
	my($depdir)=$randdir.'/'.$WorkflowCommon::DEPDIR;
	mkpath($depdir);
	my(@unpatchedWF)=($randfilexml);
	my(%WFhash)=($randfilexml=>[$WFmaindoc,$randfilexml,$doSaveDoc,undef]);

	my($peta)=undef;
	my($ua)=LWP::UserAgent->new();
	# Getting the base uri for subworkflows
	my($cgibaseuri)=WorkflowCommon::getCGIBaseURI($query);
	$cgibaseuri =~ s/cgi-bin\/[^\/]+$//;

	# First pass...
	foreach my $WFuri (@unpatchedWF) {
		my($WFdoc)=$WFhash{$WFuri}[0];

		# Really do we have deps? I doubt it...
		my(@internalDeps)=$context->findnodes('//s:processor/s:workflow/s:xscufllocation',$WFdoc);
		if(scalar(@internalDeps)>0) {
			foreach my $dep (@internalDeps) {
				my($uritext)=$dep->textContent();
				if(defined($uritext) && length($uritext)>0) {
					unless(exists($WFhash{$uritext})) {
						my($newWFdoc)=undef;
						my($URI)=URI->new($uritext);
						if($URI->scheme eq 'file') {
							my($file)=$URI->file();
							# Local dependency
							if(defined($hasInputWorkflowDeps)) {
								# Looking for it among submitted deps
								my($relfile)=undef;

								# Getting the relative file for guessing
								if($file =~ /[\/\\]([^\/\\]+)$/) {
									$relfile=$1;
								} else {
									$relfile=$file;
								}

								# The elements of this array can be something like
								# "filename, referer ..."
								# "full file name"
								# etc...
								# So we can only play with $file and $relfile,
								# which have a known structure.
								my(@depnames) = $query->param($WorkflowCommon::PARAMWORKFLOWDEP);
								my($found)=undef;
								my($pos)=0;
								foreach my $depname (@depnames) {
									if(rindex($depname,$file)!=-1 || rindex($depname,$relfile)!=-1) {
										$found=$pos;
										last;
									}

									# Next round
									$pos++;
								}

								# I believe it was found
								if(defined($found)) {
									my(@DEPH) = $query->upload($WorkflowCommon::PARAMWORKFLOWDEP);
									last  if($query->cgi_error());

									my($FAKEH)=$DEPH[$found];
									eval {
										my($line);
										while($line=<$FAKEH>) {
											$parser->parse_chunk($line);
										}
										# Rewind the handler
										seek($FAKEH,0,0);
										$newWFdoc=$parser->parse_chunk('',1);
									};
								} else {
									$peta="FATAL ERROR: Unresolved local dependency (not found $file)";
									last;
								}
							} else {
								$peta="FATAL ERROR: Unresolved local dependency (not sent $file)";
								last;
							}
						} else {
							# Remote one, let's get it!
							eval {
								$ua->request(HTTP::Request->new(GET=>$uritext),
										sub {
											my($chunk, $res)=@_;

											$parser->parse_chunk($chunk);
										}
									);
								$newWFdoc=$parser->parse_chunk('',1);
							};
						}

						# Now it is time to give it a filename
						unless($@) {
							my($reldepname);
							my($newWFname);
							do {
								$reldepname = $WorkflowCommon::DEPDIR.'/'.WorkflowCommon::genUUID().'.xml';
								$newWFname = $randdir .'/'.$reldepname;
							} while(-f $newWFname);

							eval {
								$newWFdoc->toFile($newWFname);
							};

							if($@) {
								# There was a problem in the process
								$peta=$@;
								last;
							}

							# And recording the patched dependency
							my($patchedURI) = $cgibaseuri . $WorkflowCommon::WORKFLOWRELDIR .'/'.$randname .'/'.$reldepname;

							# Saving the subworkflow
							$WFhash{$uritext}=[$newWFdoc,$newWFname,undef,$patchedURI];
							push(@unpatchedWF,$uritext);
						} else {
							# There was a problem in the process
							$peta=$@;
							last;
						}
					}

					# Mark it to process and save it later because
					# we must patch dependencies
					$WFhash{$WFuri}[2]=1;
				}
			}
			# There was some problem...
			last  if($query->cgi_error() || defined($peta));
		}
	}

	if(defined($peta) || $query->cgi_error()) {
		# TODO error handling
		$retval=1;
		$retvalmsg=$peta  if(defined($peta));
	} else {
		# Second pass, workflow patching.
		foreach my $WFuri (reverse(@unpatchedWF)) {
			my($wfval)=$WFhash{$WFuri};

			if(defined($wfval->[2])) {
				my($WFdoc)=$wfval->[0];

				# Really do we have deps? I doubt it...
				my(@internalDeps)=$context->findnodes('//s:processor/s:workflow/s:xscufllocation',$WFdoc);
				if(scalar(@internalDeps)>0) {
					foreach my $dep (@internalDeps) {
						my($uritext)=$dep->textContent();
						if(defined($uritext) && length($uritext)>0) {
							if(exists($WFhash{$uritext})) {
								# Cleaning up the content of the dependency
								# and changing its content
								if(defined($doFreezeWorkflowDeps)) {
									my($parent)=$dep->parentNode();
									foreach my $child ($parent->childNodes()) {
										$parent->removeChild($child);
									}
									$parent->appendChild($WFdoc->importNode($WFhash{$uritext}[0]->documentElement));
								} else {
									foreach my $child ($dep->childNodes()) {
										$dep->removeChild($child);
									}
									# So we can add new text node with no problem
									$dep->appendChild($WFdoc->createTextNode($WFhash{$uritext}[3]));
									# And mark it to save it later because
									# there are patched dependencies
									$WFhash{$WFuri}[2]=1;
								}
							} else {
								# FATAL ERROR!!!!!!!!!!!
							}
						}
					}
				}
				# Last step, save all the changed content
				# Some workflows could have been patched,
				# so they should be re-saved
				$WFdoc->toFile($wfval->[1]);
			}
		}

		# Now it is time to validate the whole mess!
		# Saving the workflow data
		my($randfilesvg) = $randdir . '/' . $WorkflowCommon::SVGFILE;
		my($randfilepng) = $randdir . '/' . $WorkflowCommon::PNGFILE;
		my($randfilepdf) = $randdir . '/' . $WorkflowCommon::PDFFILE;
		my(@command)=($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser',
			'-baseDir',$WorkflowCommon::MAVENDIR,
			'-workflow',$randfilexml,
			'-svggraph',$randfilesvg
		);
		if(defined($isCreation)) {
			push(@command,
				'-pnggraph',$randfilepng,
				'-pdfgraph',$randfilepdf,
				'-expandSubWorkflows'
			);
		}

		# Backing up STDOUT and STDERR
		my($BSTDERR,$BSTDOUT);
		open($BSTDOUT,'>&',\*STDOUT);
		open($BSTDERR,'>&',\*STDERR);

		# Now, setting up the temporal file
		# and the redirections
		my($LOG)=File::Temp->new();
		my($TMPLOG);
		open($TMPLOG,'>',$LOG->filename());
		open(STDOUT,'>&',$TMPLOG);
		open(STDERR,'>&',$TMPLOG);

		# The command
	#	my($comm)=$WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser -baseDir '.$WorkflowCommon::MAVENDIR.' -workflow '.$randfilexml.' -svggraph '.$randfilesvg.' -expandSubWorkflows';

		$retval=system(@command);

		# And returning to original handlers
		open(STDOUT,'>&',$BSTDOUT);
		open(STDERR,'>&',$BSTDERR);
		close($TMPLOG);
		close($BSTDOUT);
		close($BSTDERR);
		$TMPLOG=undef;
		$BSTDOUT=undef;
		$BSTDERR=undef;

		# If it failed, it is better erasing the workflow
		# because it is not a valid one!
		if($retval!=0) {
			# But before erasing, it is time to retrieve
			# the error messages from the program
			my($ERRLOG);
			if(open($ERRLOG,'<',$LOG->filename())) {
				my($line);
				$retvalmsg=''  unless(defined($retvalmsg));
				while($line=<$ERRLOG>) {
					$retvalmsg .= $line;
				}
				close($ERRLOG);
			}
		} elsif(defined($isCreation)) {
			# Creating empty catalogs
			mkpath($randdir.'/'.$WorkflowCommon::EXAMPLESDIR);
			my($excatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
			my($exroot)=$excatalog->createElementNS($WorkflowCommon::WFD_NS,'examples');
			$exroot->appendChild($excatalog->createComment( encode('UTF-8',$WorkflowCommon::COMMENTEL) ));
			$excatalog->setDocumentElement($exroot);
			$excatalog->toFile($randdir.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE);

			mkpath($randdir.'/'.$WorkflowCommon::SNAPSHOTSDIR);
			my($snapcatalog)=XML::LibXML::Document->createDocument('1.0','UTF-8');
			my($snaproot)=$excatalog->createElementNS($WorkflowCommon::WFD_NS,'snapshots');
			$snaproot->appendChild($snapcatalog->createComment( encode('UTF-8',$WorkflowCommon::COMMENTES) ));
			$snapcatalog->setDocumentElement($snaproot);
			$snapcatalog->toFile($randdir.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE);
		}
	}
	
	return ($retval,$retvalmsg);
}

1;
