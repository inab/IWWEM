#!/usr/bin/perl -W

use strict;

use CGI;
use Encode;
use File::Path;
use File::Temp;
use FindBin;
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

# First step, parameter storage (if any!)
foreach my $param ($query->param()) {
	# We are skipping all unknown params
	if($param eq $WorkflowCommon::PARAMISLAND) {
		$dataisland=1;
	} elsif($param eq 'eraseWFId') {
		my(@workflowId)=$query->param($param);
		last if($query->cgi_error());
		
		foreach my $wrelpath (@workflowId) {
			# We are only erasing what it is valid...
			next  if(index($wrelpath,'/')==0 || index($wrelpath,'../')!=-1);
			
			# Checking rules should be inserted here...
			
			# And last, unlink!
			rmtree($WorkflowCommon::WORKFLOWDIR.'/'.$wrelpath);
		}
	} elsif($param eq 'workflow') {
		# Now, time to recognize the content
		my @UPHL=$query->upload($param);
		
		last if($query->cgi_error());
		
		my($isfh)=1;
		
		if(scalar(@UPHL)==0) {
			@UPHL=$query->param($param);
			$isfh=undef;
		}
		
		foreach my $UPH (@UPHL) {
			# Generating a unique identifier
			my($randname);
			my($randdir);
			my($randfilexml);
			my($randfilesvg);
#			my($randfilepng);
#			my($randfilepdf);
			do {
				$randname=WorkflowCommon::genUUID();
				$randdir=$WorkflowCommon::WORKFLOWDIR.'/'.$randname;
			} while(-d $randdir);
			
			# Creating workflow directory
			mkpath($randdir);
			# Saving the workflow data
			$randfilexml = $randdir . '/' . $WorkflowCommon::WORKFLOWFILE;
			$randfilesvg = $randdir . '/' . $WorkflowCommon::SVGFILE;
			my($WFH);
			if(open($WFH,'>',$randfilexml)) {
				if(defined($isfh)) {
					# It is a file
					my($line);
					while($line=<$UPH>) {
						print $WFH $line;
					}
				} else {
					# It is a text field
					print $WFH $UPH;
				}
				close($WFH);
				
				# Now it is time to validate it!
				my(@command)=($WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser',
					'-baseDir',$WorkflowCommon::MAVENDIR,
					'-workflow',$randfilexml,
					'-svggraph',$randfilesvg,
#					'-pnggraph',$randfilepng,
#					'-pdfgraph',$randfilepdf,
					'-expandSubWorkflows');
				
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
#				my($comm)=$WorkflowCommon::LAUNCHERDIR.'/bin/inbworkflowparser -baseDir '.$WorkflowCommon::MAVENDIR.' -workflow '.$randfilexml.' -svggraph '.$randfilesvg.' -expandSubWorkflows';
#				$retval=system($comm.' > /tmp/naruto 2>&1');
				
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
						$retvalmsg='';
						while($line=<$ERRLOG>) {
							$retvalmsg .= $line;
						}
						close($ERRLOG);
					}
					rmtree($randdir);
					last;
				} else {
					mkpath($randdir.'/'.$WorkflowCommon::DEPDIR);
					mkpath($randdir.'/'.$WorkflowCommon::EXAMPLESDIR);
					mkpath($randdir.'/'.$WorkflowCommon::SNAPSHOTSDIR);
				}
			}
		}
	}
}

# We must signal here errors and exit
if($query->cgi_error()) {
	my $error = $query->cgi_error;
	$error = '500 Internal Server Error'  unless(defined($error));
	print $query->header(-status=>$error),
		$query->start_html('Problems'),
		$query->h2('Request not processed because upload was interrupted'),
		$query->strong($error);
	exit 0;
}

# Second step, workflow repository report

my(@dirstack)=('.');
my(@workflowlist)=();

# Looking for workflows
foreach my $dir (@dirstack) {
	my($WFDIR);
	my($fdir)=$WorkflowCommon::WORKFLOWDIR.'/'.$dir;
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
			} elsif(-d $fentry) {
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
$root->setAttribute('relURI',$WorkflowCommon::WORKFLOWRELDIR);
$outputDoc->setDocumentElement($root);
my($comment)=<<COMMENTEOF;
	This content was generated by workflowmanager, an
	application of the network workflow enactor from INB.
	The workflow enactor itself is based on Taverna core,
	and uses it.
	
	Author: José María Fernández González (C) 2007
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
COMMENTEOF

$root->appendChild($outputDoc->createComment( encode('UTF-8',$comment) ));

# Attached Error Message (if any)
if($retval!=0) {
	my($message)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'message');
	$message->setAttribute('retval',$retval);
	if(defined($retvalmsg)) {
		$message->appendChild($outputDoc->createCDATASection($retvalmsg));
	}
	$root->appendChild($message);
}

my $parser = XML::LibXML->new();

foreach my $wf (@workflowlist) {
	eval {
		my($relwffile)=$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
		my $doc = $parser->parse_file($WorkflowCommon::WORKFLOWDIR.'/'.$relwffile);
		# Getting description from workflow definition
		my @nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'workflowdescription');
		if(scalar(@nodelist)>0) {
			my $wfe = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'workflow');
			my($desc)=$nodelist[0];
			$wfe->setAttribute('uuid',$wf);
			$wfe->setAttribute('lsid',$desc->getAttribute('lsid'));
			$wfe->setAttribute('author',$desc->getAttribute('author'));
			$wfe->setAttribute('title',$desc->getAttribute('title'));
			my($wffile)=$WorkflowCommon::WORKFLOWDIR.'/'.$wf.'/'.$WorkflowCommon::WORKFLOWFILE;
			$wfe->setAttribute('path',$relwffile);
			my $svg = $wf.'/'.$WorkflowCommon::SVGFILE;
			$wfe->setAttribute('svg',$svg);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desc->textContent()));
			$wfe->appendChild($wdesc);
			
			# Getting Inputs
			@nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'source');
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'input');
				$input->setAttribute('name',$source->getAttribute('name'));
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$source->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'mimetype');
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
			@nodelist = $doc->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'sink');
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($WorkflowCommon::WFD_NS,'output');
				$output->setAttribute('name',$sink->getAttribute('name'));
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$sink->getElementsByTagNameNS($WorkflowCommon::SCUFL_NS,'mimetype');
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
			
			# At last, appending the new workflow entry
			$root->appendChild($wfe);
		}
	};
	
	if($@) {
		$root->appendChild($outputDoc->createComment("Unable to process $wf due ".$@));
	}
}

print $query->header(-type=>(defined($dataisland)?'text/html':'text/xml'),-charset=>'UTF-8');

if(defined($dataisland)) {
	print "<html><body><xml id='".$WidgetCommon::PARAMISLAND."'>\n";
}
$outputDoc->toFH(\*STDOUT);
if(defined($dataisland)) {
	print "\n</xml></body></html>";
}

exit 0;
