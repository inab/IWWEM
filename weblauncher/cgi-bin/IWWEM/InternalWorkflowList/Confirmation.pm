#!/usr/bin/perl -W

# $Id$
# IWWEM/InternalWorkflowList/Confirmation.pm
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

package IWWEM::InternalWorkflowList::Confirmation;

use CGI;
use Encode;
use File::Copy;
use File::Path;
use FindBin;
use XML::LibXML;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::UniversalWorkflowKind;
use IWWEM::InternalWorkflowList::Constants;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

use vars qw($COMMANDFILE $PENDINGERASEFILE $PENDINGADDFILE);

$PENDINGERASEFILE='eraselist.txt';
$PENDINGADDFILE='addlist.txt';
$COMMANDFILE='.command';

use vars qw($COMMANDADD $COMMANDERASE);

$COMMANDADD='add';
$COMMANDERASE='erase';

sub doConfirm($$$;$);
sub genPendingOperationsDir($);
sub sendResponsibleConfirmedMail($$$$$$$;$$$);
sub sendResponsiblePendingMail($$$$$$$$;$);

# Second, do it!

sub doConfirm($$$;$) {
	my($query,$retval,$code,$reject)=@_;
	my($codedir)=$IWWEM::Config::CONFIRMDIR.'/'.$code;
	my($commandfile)=$codedir.'/'.$COMMANDFILE;
	my($command)=undef;
	if($retval eq '0' && !$query->cgi_error() && defined($code) && index($code,'/')==-1 && -d $codedir && -r $commandfile) {
		my($FH);
		if(open($FH,'<',$commandfile)) {
			$command=<$FH>;
			
			close($FH);
			
			# Command validation
			$command=undef  if($command ne $COMMANDERASE && $command ne $COMMANDADD);
		}
	}
	
	# Skipping non-valid commands
	return ()  unless(defined($command));
	
	my(@done)=();
	
	unless(defined($reject)) {
		my $parser = XML::LibXML->new();
		my $context = XML::LibXML::XPathContext->new();
		$context->registerNs('sn',$IWWEM::WorkflowCommon::WFD_NS);
		
		my($smtp) = IWWEM::WorkflowCommon::createMailer();
		
		
		if($command eq $COMMANDERASE) {
			my($EH);
			if(open($EH,'<',$codedir.'/'.$PENDINGERASEFILE)) {
				my($irelpath)=undef;
				while($irelpath=<$EH>) {
					chomp($irelpath);
					# We are only erasing what it is valid...
					next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
		
					# Checking rules should be inserted here...
					my(@predone)=();
					my($email)=undef;
					my($kind)=undef;
					my($prettyname)=undef;
					if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
						my($wfsnap)=$1;
						my($snapId)=$2;
						$kind='snapshot';
						eval {
							my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
							my($catdoc)=$parser->parse_file($catfile);
							
							my($transsnapId)=IWWEM::WorkflowCommon::patchXMLString($snapId);
							my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
							foreach my $snap (@eraseSnap) {
								$prettyname=$snap->getAttribute('name');
								$email=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
								$snap->parentNode->removeChild($snap);
							}
							$catdoc->toFile($catfile);
						};
						rmtree($IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$snapId);
					} elsif($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
						my($wfexam)=$1;
						my($examId)=$2;
						$kind='example';
						eval {
							my($catfile)=$IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
							my($catdoc)=$parser->parse_file($catfile);
							
							my($transexamId)=IWWEM::WorkflowCommon::patchXMLString($examId);
							my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
							foreach my $exam (@eraseExam) {
								$prettyname=$exam->getAttribute('name');
								$email=$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
								$exam->parentNode->removeChild($exam);
							}
							$catdoc->toFile($catfile);
						};
						unlink($IWWEM::Config::WORKFLOWDIR .'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$examId.'.xml');
					} else {
						# Workflows and enactions
						my($jobdir)=undef;
						
						if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
							$jobdir=$IWWEM::Config::JOBDIR.'/'.$1;
							$kind='enaction';
						} else {
							my($relwfid)=undef;
							if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
								$relwfid=$1;
							} else {
								$relwfid=$irelpath;
							}
							$jobdir=$IWWEM::Config::WORKFLOWDIR.'/'.$relwfid;
							$kind='workflow';
							
							# Let's gather information about what is going to be destroyed
							eval {
								my($excatfile) = $jobdir.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
								my($excatdoc)=$parser->parse_file($excatfile);
								my(@eraseExam)=$context->findnodes("//sn:example",$excatdoc);
								
								foreach my $exam (@eraseExam) {
									push(@predone,[
										'example',
										$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX.$exam->getAttribute('uuid'),
										1,
										$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL),
										$exam->getAttribute('name')
									]);
								}
							};
							eval {
								my($sncatfile) = $jobdir.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
								my($sncatdoc)=$parser->parse_file($sncatfile);
								my(@eraseSnap)=$context->findnodes("//sn:snapshot",$sncatdoc);
								
								foreach my $snap (@eraseSnap) {
									push(@predone,[
										'snapshot',
										$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX.$snap->getAttribute('uuid'),
										1,
										$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL),
										$snap->getAttribute('name')
									]);
								}
							};
							
						}
						
						eval {
							my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
							my($uwk)=IWWEM::UniversalWorkflowKind->new();
							my($wi)=$uwk->getWorkflowInfo($irelpath,$workflowfile,$workflowfile);
							$prettyname=$wi->getAttribute('title');
							
							my($responsiblefile)=$jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
							my($rp)=$parser->parse_file($responsiblefile);
							$email=$rp->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						};
						
						# And last, unlink!
						rmtree($jobdir);
					}
					push(@predone,[
						$kind,
						$irelpath,
						1,
						$email,
						$prettyname
					]);
					
					# Now, we must send an informative e-mail
					if(defined($email)) {
						foreach my $p_done (@predone) {
							my($prett)=$p_done->[4];
							$prett=undef  if(defined($prett) && length($prett)==0);
							sendResponsibleConfirmedMail($smtp,$code,$p_done->[0],$command,$p_done->[1],$p_done->[3],$prett);
						}
						push(@done,@predone);
					} else {
						push(@done,[$kind,$irelpath,undef,$email,$prettyname]);
					}
				}
				close($EH);
			}
		} elsif($command eq $COMMANDADD) {
			my($EH);
			if(open($EH,'<',$codedir.'/'.$PENDINGADDFILE)) {
				my($irelpath)=undef;
				while($irelpath=<$EH>) {
					chomp($irelpath);
					# We are only erasing what it is valid...
					next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
					
					# Checking rules should be inserted here...
					my($email)=undef;
					my($kind)=undef;
					my($prettyname)=undef;
					my($viewerURL)=undef;
					
					if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
						my($wfsnap)=$1;
						my($snapId)=$2;
						$kind='snapshot';
						
						my($workflowdir)=$IWWEM::Config::WORKFLOWDIR.'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR;
						move($codedir.'/'.$snapId,$workflowdir.'/'.$snapId);
						
						my($VIE);
						if(open($VIE,'<',$workflowdir.'/'.$snapId.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
							$viewerURL=<$VIE>;
							close($VIE);
						}
		
						eval {
							my($catfile)=$codedir.'/'.$snapId.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;
							my($catres)=$parser->parse_file($catfile);
							my($snap)=$catres->documentElement();
							$prettyname=$snap->getAttribute('name');
							$email=$snap->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							
							# Adding to the catalog file
							my($newcatfile)=$workflowdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
							# File must exist
							my($newcatres)=$parser->parse_file($newcatfile);
							# Are there old entries?
							my($transsnapId)=IWWEM::WorkflowCommon::patchXMLString($snapId);
							my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$newcatres);
							foreach my $snapNode (@eraseSnap) {
								$snapNode->parentNode->removeChild($snapNode);
							}
							# And now, new entries
							$newcatres->documentElement()->appendChild($newcatres->importNode($snap));
							# Updated results must be saved
							$newcatres->toFile($newcatfile);
							# And tmp catfile must be removed
							unlink($catfile);
						};
					} elsif($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
						my($wfexam)=$1;
						my($examId)=$2;
						$kind='example';
						
						my($workflowdir)=$IWWEM::Config::WORKFLOWDIR.'/'.$wfexam.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR;
						move($codedir.'/'.$examId.'.xml',$workflowdir);
						
						eval {
							my($catfile)=$codedir.'/'.$examId.'_'.$IWWEM::WorkflowCommon::CATALOGFILE;
							my($catres)=$parser->parse_file($catfile);
							my($exam)=$catres->documentElement();
							$prettyname=$exam->getAttribute('name');
							$email=$exam->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							
							# Adding to the catalog file
							my($newcatfile)=$workflowdir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE;
							# File must exist
							my($newcatres)=$parser->parse_file($newcatfile);
							# Are there old entries?
							my($transexamId)=IWWEM::WorkflowCommon::patchXMLString($examId);
							my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$newcatres);
							foreach my $examNode (@eraseExam) {
								$examNode->parentNode->removeChild($examNode);
							}
							# And now, new entries
							$newcatres->documentElement()->appendChild($newcatres->importNode($exam));
							# Updated results must be saved
							$newcatres->toFile($newcatfile);
							# And tmp catfile must be removed
							unlink($catfile);
						};
					} else {
						my($jobdir)=$codedir;
						my($destdir)=undef;
						
						if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX([^:]+)$/) {
							$jobdir.='/'.$1;
							$destdir=$IWWEM::Config::JOBDIR.'/'.$1;
							$kind='enaction';
						} else {
							my($relwfid)=undef;
							if($irelpath =~ /^$IWWEM::InternalWorkflowList::Constants::WORKFLOWPREFIX([^:]+)$/) {
								$relwfid=$1;
							} else {
								$relwfid=$irelpath;
							}
							$jobdir.='/'.$relwfid;
							$destdir=$IWWEM::Config::WORKFLOWDIR.'/'.$relwfid;
							$kind='workflow';
						}
						
						eval {
							my($wfres)=$parser->parse_file($jobdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE);
							
							$email=$wfres->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
							
							my($workflowfile)=$jobdir.'/'.$IWWEM::WorkflowCommon::WORKFLOWFILE;
							my($uwk)=IWWEM::UniversalWorkflowKind->new();
							my($wi)=$uwk->getWorkflowInfo($irelpath,$workflowfile,$workflowfile);
							$prettyname=$wi->getAttribute('title');
						};
						
						if($@) {
							$email=undef;
							print STDERR "JOB $jobdir DEST $destdir WTF????? $@\n";
						} else {
							move($jobdir,$destdir);
							my($VIE);
							if(open($VIE,'<',$destdir.'/'.$IWWEM::WorkflowCommon::VIEWERFILE)) {
								$viewerURL=<$VIE>;
								close($VIE);
							}
						}
					}
					my(@predone)=();
					push(@predone,[
						$kind,
						$irelpath,
						1,
						$email,
						$prettyname
					]);
					
					# Now, we must send an informative e-mail
					if(defined($email)) {
						$prettyname=undef  if(defined($prettyname) && length($prettyname)==0);
						sendResponsibleConfirmedMail($smtp,$code,$kind,$command,$irelpath,$email,$prettyname,$query,($kind eq 'snapshot')?$irelpath:undef,$viewerURL);
						push(@done,@predone);
					} else {
						push(@done,[$kind,$irelpath,undef,$email,$prettyname]);
					}
				}
				close($EH);
			}
		}
	}
	
	# Erasing pending directory
	rmtree($codedir);
	
	return ($command,\@done);
}

# Generates a pending operation directory structure
sub genPendingOperationsDir($) {
	my($oper)=@_;
	
	# Generating a unique identifier
	my($randname);
	my($randfilexml);
	my($randdir);
	do {
		$randname=IWWEM::WorkflowCommon::genUUID();
		$randdir=$IWWEM::Config::CONFIRMDIR.'/'.$randname;
	} while(-d $randdir);

	# Creating workflow directory
	mkpath($randdir);
	my($COM);
	my($FH);
	if(open($COM,'>',$randdir.'/'.$COMMANDFILE)) {
		print $COM $oper;
		close($COM);
		if($oper eq $COMMANDADD) {
			# touch
			open($FH,'>',$randdir.'/'.$PENDINGADDFILE);
		} elsif($oper eq $COMMANDERASE) {
			# touch
			open($FH,'>',$randdir.'/'.$PENDINGERASEFILE);
		}
	}
	
	return ($randname,$randdir,$FH);
}

sub sendResponsiblePendingMail($$$$$$$$;$) {
	my($query,$smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname,$autoUUID)=@_;
	
	# TODO: Add automatic confirmation logic here!
	
	my($autoconfirm)=undef;
	if(defined($autoconfirm)) {
		my(@res)=doConfirm($query,'0',$code);
		return scalar(@res)<2;
	} else {
		$smtp=IWWEM::WorkflowCommon::createMailer()  unless(defined($smtp));
		my($prettyop)=($command eq $COMMANDADD)?'addition':'deletion';
		
		my($baseURI)=IWWEM::WorkflowCommon::getCGIBaseURI($query);
		my($operURL)=$baseURI;
		$operURL =~ s/cgi-bin\/[^\/]+$//;
		$operURL.="cgi-bin/IWWEMconfirm?code=$code";
		
		my($rejURL)=$operURL;
		$rejURL.='&reject=1';
		
		return $smtp->MailMsg({
			from=>"\"$IWWEM::MailConfig::IWWEMmailname\" <$IWWEM::MailConfig::IWWEMmailaddr>",
			to=>"\"IWWE&M user\" <$responsibleMail>",
			subject=>"Confirmation for $prettyop of $kind $irelpath",
			msg=>"Dear IWWE&M user,\r\n    before the $prettyop of $kind $irelpath".
				(defined($prettyname)?(" (known as $prettyname)"):'').
				" you must confirm it by visiting\r\n\r\n$operURL\r\n\r\n    or you must reject it by visiting\r\n\r\n$rejURL\r\n\r\n    The INB Interactive Web Workflow Enactor & Manager system"
		});
	}
}

sub sendResponsibleConfirmedMail($$$$$$$;$$$) {
	my($smtp,$code,$kind,$command,$irelpath,$responsibleMail,$prettyname,$query,$enId,$viewerURI)=@_;
	
	$smtp=IWWEM::WorkflowCommon::createMailer()  unless(defined($smtp));
	my($prettyop)=($command eq $COMMANDADD)?'added':'disposed';
	
	my($operURL)=IWWEM::WorkflowCommon::enactionGUIURI($query,$enId,$viewerURI);
	my($addmesg)='';
	if(defined($enId) && defined($operURL)) {
		$addmesg="You can browse it at\r\n\r\n$operURL\r\n";
	}
	
	return $smtp->MailMsg({
		from=>"\"$IWWEM::MailConfig::IWWEMmailname\" <$IWWEM::MailConfig::IWWEMmailaddr>",
		to=>"\"IWWE&M user\" <$responsibleMail>",
		subject=>"Your $kind $irelpath has just been $prettyop",
		msg=>"Dear IWWE&M user,\r\n    as you have just confirmed petition ".
			$code.", your $kind $irelpath".(defined($prettyname)?(" (known as $prettyname)"):'').
			" has just been $prettyop\r\n$addmesg\r\n    The INB Interactive Web Workflow Enactor & Manager system"
	});
}

1;
