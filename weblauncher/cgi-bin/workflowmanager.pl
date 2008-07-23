#!/usr/bin/perl -W

# $Id$
# workflowmanager.pl
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
use LWP::UserAgent;
use URI;
use XML::LibXML;

use lib "$FindBin::Bin";
use WorkflowCommon;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

my($query)=CGI->new();

# Web applications do need this!
$|=1;
	
my($retval)=0;
my($retvalmsg)=undef;
my($dataisland)=undef;
my($dataislandTag)=undef;
my($id)=undef;
my($hasInputWorkflow)=undef;
my($hasInputWorkflowDeps)=undef;
my($doFreezeWorkflowDeps)=undef;

my($responsibleMail)=undef;
my($responsibleName)=undef;

my $parser = XML::LibXML->new();
my $context = XML::LibXML::XPathContext->new();
$context->registerNs('s',$WorkflowCommon::XSCUFL_NS);
$context->registerNs('sn',$WorkflowCommon::WFD_NS);

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
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
	
	my($paramval)=undef;

	# We are skipping all unknown params
	if($param eq $WorkflowCommon::PARAMISLAND) {
		$dataisland=$query->param($param);
		if($dataisland ne '2') {
			$dataisland=1;
			$dataislandTag='xml';
		} else {
			$dataislandTag='div';
		}
	} elsif($param eq 'eraseId') {
		my(@iwwemId)=$query->param($param);
		last if($query->cgi_error());
		
		foreach my $irelpath (@iwwemId) {
			# We are only erasing what it is valid...
			next  if(length($irelpath)==0 || index($irelpath,'/')==0 || index($irelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			my($kind)=undef;
			my($resMail)=undef;
			my($prettyname)=undef;
			if($irelpath =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				my($wfsnap)=$1;
				my($snapId)=$2;
				$kind='snapshot';
				eval {
					my($catfile)=$WorkflowCommon::WORKFLOWDIR .'/'.$wfsnap.'/'.$WorkflowCommon::SNAPSHOTSDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);

					my($transsnapId)=WorkflowCommon::patchXMLString($snapId);
					my(@eraseSnap)=$context->findnodes("//sn:snapshot[\@uuid='$transsnapId']",$catdoc);
					foreach my $snap (@eraseSnap) {
						$prettyname=$snap->getAttribute('name');
						$resMail=$snap->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						last;
					}
				};
			} elsif($irelpath =~ /^$WorkflowCommon::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				my($wfexam)=$1;
				my($examId)=$2;
				$kind='example';
				eval {
					my($catfile)=$WorkflowCommon::WORKFLOWDIR .'/'.$wfexam.'/'.$WorkflowCommon::EXAMPLESDIR.'/'.$WorkflowCommon::CATALOGFILE;
					my($catdoc)=$parser->parse_file($catfile);

					my($transexamId)=WorkflowCommon::patchXMLString($examId);
					my(@eraseExam)=$context->findnodes("//sn:example[\@uuid='$transexamId']",$catdoc);
					foreach my $exam (@eraseExam) {
						$prettyname=$exam->getAttribute('name');
						$resMail=$exam->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						last;
					}
				};
			} else {
				my($jobdir)=undef;
				
				if($irelpath =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
					$jobdir=$WorkflowCommon::JOBDIR.'/'.$1;
					$kind='enaction';
				} else {
					$jobdir=$WorkflowCommon::WORKFLOWDIR.'/'.$irelpath;
					$kind='workflow';
				}
				
				eval {
					my($responsiblefile)=$jobdir.'/'.$WorkflowCommon::RESPONSIBLEFILE;
					my($rp)=$parser->parse_file($responsiblefile);
					$resMail=$rp->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					
					my($workflowfile)=$jobdir.'/'.$WorkflowCommon::WORKFLOWFILE;
					my($wf)=$parser->parse_file($workflowfile);
					
					my @nodelist = $wf->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
					if(scalar(@nodelist)>0) {
						$prettyname=$nodelist[0]->getAttribute('title');
					}
					
				};
			}
			
			if(defined($resMail)) {
				my($penduuid,$penddir,$PH)=WorkflowCommon::genPendingOperationsDir($WorkflowCommon::COMMANDERASE);

				print $PH "$irelpath\n";
				close($PH);
				
				WorkflowCommon::sendResponsiblePendingMail($query,undef,$penduuid,$kind,$WorkflowCommon::COMMANDERASE,$irelpath,$resMail,$prettyname);
			}
		}
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOW) {
		$hasInputWorkflow=1;
	} elsif($param eq $WorkflowCommon::PARAMWORKFLOWDEP) {
		$hasInputWorkflowDeps=1;
	} elsif($param eq $WorkflowCommon::PARAMWFID) {
		$paramval = $id = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLEMAIL) {
		$paramval = $responsibleMail = $query->param($param);
	} elsif($param eq $WorkflowCommon::RESPONSIBLENAME) {
		$paramval = $responsibleName = $query->param($param);
	} elsif($param eq 'freezeWorkflowDeps') {
		$doFreezeWorkflowDeps=1;
	}
	
	# Error checking
	last  if($query->cgi_error());
	
	# Let's check at UTF-8 level!
	if(defined($paramval)) {
		eval {
			# Beware decode!
			decode('UTF-8',$paramval,Encode::FB_CROAK);
		};
		
		if($@) {
			$retval=-1;
			$retvalmsg="Param $param does not contain a valid UTF-8 string!";
			last;
		}
	}
}

# Parsing input workflows
if($retval==0 && !$query->cgi_error() && defined($hasInputWorkflow)) {
	($retval,$retvalmsg)=WorkflowCommon::parseInlineWorkflows($query,$parser,$responsibleMail,$responsibleName,$hasInputWorkflowDeps,$doFreezeWorkflowDeps);
}

# We must signal here errors and exit
if($retval!=0 || $query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because '.(($retval!=0 && defined($retvalmsg))?$retvalmsg:'upload was interrupted')),
		$query->strong($error);
	exit 0;
}

# Second step, workflow repository report

my(@dirstack)=('.');
my(@workflowlist)=();

$id=''  unless(defined($id));
my($baseListDir)=undef;
my($listDir)=undef;
my($subId)=undef;
my($uuidPrefix)=undef;
my($isSnapshot)=undef;
if(index($id,$WorkflowCommon::ENACTIONPREFIX)==0) {
	$baseListDir=$WorkflowCommon::JOBRELDIR;
	$listDir=$WorkflowCommon::JOBDIR;
	$uuidPrefix=$WorkflowCommon::ENACTIONPREFIX;
	
	if($id =~ /^$WorkflowCommon::ENACTIONPREFIX([^:]+)$/) {
		$subId=$1;
	}
} elsif($id =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+)/) {
	$baseListDir=$WorkflowCommon::WORKFLOWRELDIR . '/'.$1.'/'.$WorkflowCommon::SNAPSHOTSDIR;
	$listDir=$WorkflowCommon::WORKFLOWDIR .'/'.$1.'/'.$WorkflowCommon::SNAPSHOTSDIR;
	$uuidPrefix=$WorkflowCommon::SNAPSHOTPREFIX . $1 . ':';
	
	$isSnapshot=1;
	
	if($id =~ /^$WorkflowCommon::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
		$subId=$2;
	}
} else {
	$baseListDir=$WorkflowCommon::WORKFLOWRELDIR;
	$listDir=$WorkflowCommon::WORKFLOWDIR;
	$uuidPrefix='';
	
	$subId=$id  if(length($id)>0);
}

# Looking for workflows
foreach my $dir (@dirstack) {
	my($WFDIR);
	my($fdir)=$listDir.'/'.$dir;
	if(opendir($WFDIR,$fdir)) {
		my($entry);
		my(@posdirstack)=();
		my($foundworkflowdir)=undef;
		while($entry=readdir($WFDIR)) {
			next if(index($entry,'.')==0);
			
			my($fentry)=$fdir.'/'.$entry;
			my($rentry)=($dir ne '.')?($dir.'/'.$entry):$entry;
			if($entry eq $WorkflowCommon::WORKFLOWFILE) {
				$foundworkflowdir=1;
			} elsif(-d $fentry && (!defined($subId) || ($subId eq $entry))) {
				push(@posdirstack,$rentry);
			}
		}
		closedir($WFDIR);
		# We are only saving found subdirectories when
		# this is not a workflow directory
		if(defined($foundworkflowdir)) {
			push(@workflowlist,$dir);
		} else {
			push(@dirstack,@posdirstack);
		}
	}
}

my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
my($root)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'workflowlist');
$root->setAttribute('time',LockNLog::getPrintableNow());
$root->setAttribute('relURI',$baseListDir);
$outputDoc->setDocumentElement($root);

$root->appendChild($outputDoc->createComment( encode('UTF-8',$WorkflowCommon::COMMENTWM) ));

# Attached Error Message (if any)
if($retval!=0) {
	my($message)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'message');
	$message->setAttribute('retval',$retval);
	if(defined($retvalmsg)) {
		$message->appendChild($outputDoc->createCDATASection($retvalmsg));
	}
	$root->appendChild($message);
}

foreach my $wf (@workflowlist) {
	eval {
		my($relwffile)=$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
		my($docfile)=$listDir.'/'.$relwffile;
		my $doc = $parser->parse_file($docfile);
		
		# Getting description from workflow definition
		my @nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'workflowdescription');
		if(scalar(@nodelist)>0) {
			my $wfe = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'workflow');
			my($desc)=$nodelist[0];
			
			$wfe->setAttribute('date',LockNLog::getPrintableDate((stat($docfile))[9]));
			
			$wfe->setAttribute('uuid',$uuidPrefix.$wf);
			
			# Now, the responsible person
			my($responsibleMail)='';
			my($responsibleName)='';
			eval {
				if(defined($isSnapshot)) {
					my $cat = $parser->parse_file($listDir.'/'.$WorkflowCommon::CATALOGFILE);
					my($transwf)=WorkflowCommon::patchXMLString($wf);
					my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transwf']",$cat);
					foreach my $snapNode (@snaps) {
						$responsibleMail=$snapNode->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
						$responsibleName=$snapNode->getAttribute($WorkflowCommon::RESPONSIBLENAME);
						last;
					}
				} else {
					my $res = $parser->parse_file($listDir.'/'.$wf.'/'.$WorkflowCommon::RESPONSIBLEFILE);
					$responsibleMail=$res->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLEMAIL);
					$responsibleName=$res->documentElement()->getAttribute($WorkflowCommon::RESPONSIBLENAME);
				}
			};

			$wfe->setAttribute($WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
			$wfe->setAttribute($WorkflowCommon::RESPONSIBLENAME,$responsibleName);
			$wfe->setAttribute('lsid',$desc->getAttribute('lsid'));
			$wfe->setAttribute('author',$desc->getAttribute('author'));
			$wfe->setAttribute('title',$desc->getAttribute('title'));
			my($wffile)=$listDir.'/'.$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
			$wfe->setAttribute('path',$relwffile);
			my $svg = $wf.'/'.$WorkflowCommon::SVGFILE;
			$wfe->setAttribute('svg',$svg);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desc->textContent()));
			$wfe->appendChild($wdesc);
			
			# Adding links to its graphical representations
			my($gfile,$gmime);
			while(($gfile,$gmime)=each(%WorkflowCommon::GRAPHREP)) {
				my $rfile = $wf.'/'.$gfile;
				# Only include what has been generated!
				if( -f $listDir.'/'.$rfile) {
					my($gchild)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'graph');
					$gchild->setAttribute('mime',$gmime);
					$gchild->appendChild($outputDoc->createTextNode($rfile));
					$wfe->appendChild($gchild);
				}
			}
			
			# Now, including dependencies
			my($DEPDIRH);
			my($depreldir)=$wf.'/'.$WorkflowCommon::DEPDIR;
			my($depdir)=$listDir.'/'.$depreldir;
			if(opendir($DEPDIRH,$depdir)) {
				my($entry);
				while($entry=readdir($DEPDIRH)) {
					next  if(index($entry,'.')==0);
					
					my($fentry)=$depdir.'/'.$entry;
					if(-f $fentry && $fentry =~ /\.xml$/) {
						my($depnode) = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'dependsOn');
						$depnode->setAttribute('sub',$depreldir.'/'.$entry);
						$wfe->appendChild($depnode);
					}
				}
				
				closedir($DEPDIRH);
			}
			
			# Getting Inputs
			@nodelist = $context->findnodes('/s:scufl/s:source',$doc);
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'input');
				$input->setAttribute('name',$source->getAttribute('name'));
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$source->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$input->appendChild($mtype);
				}
				
				# At last, appending this input
				$wfe->appendChild($input);
			}
			
			# And Outputs
			@nodelist = $context->findnodes('/s:scufl/s:sink',$doc);
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'output');
				$output->setAttribute('name',$sink->getAttribute('name'));
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$sink->getElementsByTagNameNS($WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$output->appendChild($mtype);
				}
				
				# At last, appending this output
				$wfe->appendChild($output);
			}
			
			# Now importing the examples catalog
			eval {
				my($examples)=$parser->parse_file($listDir.'/'.$wf.'/'.$WorkflowCommon::EXAMPLESDIR . '/' . $WorkflowCommon::CATALOGFILE);
				for my $child ($examples->documentElement()->getChildrenByTagNameNS($WorkflowCommon::WFD_NS,'example')) {
					$wfe->appendChild($outputDoc->importNode($child));
				}
			};
			
			# And the snapshots one!
			eval {
				my($snapshots)=$parser->parse_file($listDir.'/'.$wf.'/'.$WorkflowCommon::SNAPSHOTSDIR . '/' . $WorkflowCommon::CATALOGFILE);
				for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($WorkflowCommon::WFD_NS,'snapshot')) {
					$wfe->appendChild($outputDoc->importNode($child));
				}
			};
			
			# At last, appending the new workflow entry
			$root->appendChild($wfe);
		}
	};
	
	if($@) {
		$root->appendChild($outputDoc->createComment("Unable to process $wf due ".$@));
	}
}

print $query->header(-type=>(defined($dataisland)?'text/html':'text/xml'),-charset=>'UTF-8',-cache=>'no-cache, no-store',-expires=>'-1');

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
