#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/AbstractWorkflowList.pm
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

package IWWEM::Taverna1WorkflowKind;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowKind);

use IWWEM::WorkflowCommon;

##############
# Prototypes #
##############
sub new(;$$);

###############
# Constructor #
###############

sub new(;$$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	return bless($self,$class);
}

###########
# Methods #
###########

sub getWorkflowInfo($$$$$) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($wf,$uuid,$listDir,$relwffile,$isSnapshot)=@_;
	
	my($wffile)=undef;
	my($date)=undef;
	my($wfresp,$examplescat,$snapshotscat)=();
	if(defined($relwffile)) {
		$wffile=$listDir.'/'.$relwffile;
		$date=LockNLog::getPrintableDate((stat($wffile))[9]);
		my($wfdir)=$listDir.'/'.$wf;
		$wffile=$listDir.'/'.$relwffile;
		$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
	} else {
		$relwffile=$wffile=$wf;
		$date="";
	}
	#$wfcatmutex->mutex(sub {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		my $doc = $parser->parse_file($wffile);
		
		# Getting description from workflow definition
		my @nodelist = $doc->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'workflowdescription');
		my $wfe = undef;
		if(scalar(@nodelist)>0) {
			$wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
			$outputDoc->setDocumentElement($wfe);
			
			my($desc)=$nodelist[0];

			$wfe->setAttribute('date',$date);
			$wfe->setAttribute('uuid',$uuid);
			
			# Now, the responsible person
			my($responsibleMail)='';
			my($responsibleName)='';
			eval {
				if(defined($isSnapshot)) {
					my $cat = $parser->parse_file($listDir.'/'.$IWWEM::WorkflowCommon::CATALOGFILE);
					my($transwf)=IWWEM::WorkflowCommon::patchXMLString($wf);
					my(@snaps)=$context->findnodes("//sn:snapshot[\@uuid='$transwf']",$cat);
					foreach my $snapNode (@snaps) {
						$responsibleMail=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
						$responsibleName=$snapNode->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
						last;
					}
				} elsif(defined($wfresp)) {
					my $res = $parser->parse_file($wfresp);
					$responsibleMail=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL);
					$responsibleName=$res->documentElement()->getAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME);
				}
			};

			$wfe->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,$responsibleMail);
			$wfe->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);
			$wfe->setAttribute('lsid',$desc->getAttribute('lsid'));
			$wfe->setAttribute('author',$desc->getAttribute('author'));
			$wfe->setAttribute('title',$desc->getAttribute('title'));
			$wfe->setAttribute('path',$relwffile);
			
			my($licenseName)=undef;
			my($licenseURI)=undef;
			
			my($desctext)=$desc->textContent();
			
			# Catching the defined license
			if(defined($desctext) && $desctext =~ /^$IWWEM::WorkflowCommon::LICENSESTART\n[ \t]*([^ \n]+)[ \t]+([^\n]+)[ \t]*\n$IWWEM::WorkflowCommon::LICENSESTOP\n/ms) {
				$licenseURI=$1;
				$licenseName=$2;
				$desctext=substr($desctext,0,index($desctext,"\n$IWWEM::WorkflowCommon::LICENSESTART\n")).substr($desctext,index($desctext,index($desctext,"\n$IWWEM::WorkflowCommon::LICENSESTOP\n")+length($IWWEM::WorkflowCommon::LICENSESTOP)+1));
			}
			
			unless(defined($licenseURI)) {
				$licenseName=$IWWEM::Config::DEFAULT_LICENSE_NAME;
				$licenseURI=$IWWEM::Config::DEFAULT_LICENSE_URI;
			} elsif(!defined($licenseName)) {
				$licenseName='PRIVATE';
			}
			
			$wfe->setAttribute('licenseName',$licenseName);
			$wfe->setAttribute('licenseURI',$licenseURI);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desctext));
			$wfe->appendChild($wdesc);
			
			# Adding links to its graphical representations
			my($gfile,$gmime);
			if(defined($listDir)) {
				while(($gfile,$gmime)=each(%IWWEM::WorkflowCommon::GRAPHREP)) {
					my $rfile = $wf.'/'.$gfile;
					# Only include what has been generated!
					if( -f $listDir.'/'.$rfile) {
						my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
						$gchild->setAttribute('mime',$gmime);
						$gchild->appendChild($outputDoc->createTextNode($rfile));
						$wfe->appendChild($gchild);
					}
				}
			}
			
			# Now, including dependencies
			if(defined($listDir)) {
				my($DEPDIRH);
				my($depreldir)=$wf.'/'.$IWWEM::WorkflowCommon::DEPDIR;
				my($depdir)=$listDir.'/'.$depreldir;
				if(opendir($DEPDIRH,$depdir)) {
					my($entry);
					while($entry=readdir($DEPDIRH)) {
						next  if(index($entry,'.')==0);

						my($fentry)=$depdir.'/'.$entry;
						if(-f $fentry && $fentry =~ /\.xml$/) {
							my($depnode) = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'dependsOn');
							$depnode->setAttribute('sub',$depreldir.'/'.$entry);
							$wfe->appendChild($depnode);
						}
					}

					closedir($DEPDIRH);
				}
			}
			
			# Getting Inputs
			@nodelist = $context->findnodes('/s:scufl/s:source',$doc);
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'input');
				$input->setAttribute('name',$source->getAttribute('name'));
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$source->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$input->appendChild($mtype);
				}
				
				# At last, appending this input
				$wfe->appendChild($input);
			}
			
			# And Outputs
			@nodelist = $context->findnodes('/s:scufl/s:sink',$doc);
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'output');
				$output->setAttribute('name',$sink->getAttribute('name'));
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# MIME types handling
				my(@mimetypes)=$sink->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'mimetype');
				# Taverna default mime type
				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
				foreach my $mime (@mimetypes) {
					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
					$mtype->setAttribute('type',$mime);
					$output->appendChild($mtype);
				}
				
				# At last, appending this output
				$wfe->appendChild($output);
			}
			
			# Now importing the examples catalog
			eval {
				if(defined($examplescat)) {
					my($examples)=$parser->parse_file($examplescat);
					for my $child ($examples->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'example')) {
						$wfe->appendChild($outputDoc->importNode($child));
					}
				}
			};
			if($@) {
				$wfe->appendChild($outputDoc->createComment('Unable to parse examples catalog!'));
			}
			
			# And the snapshots one!
			eval {
				if(defined($snapshotscat)) {
					my($snapshots)=$parser->parse_file($snapshotscat);
					for my $child ($snapshots->documentElement()->getChildrenByTagNameNS($IWWEM::WorkflowCommon::WFD_NS,'snapshot')) {
						$wfe->appendChild($outputDoc->importNode($child));
					}
				}
			};
			if($@) {
				$wfe->appendChild($outputDoc->createComment('Unable to parse snapshots catalog!'));
			}
			
			# At last, appending the new workflow entry
		}
	#});
	
	return $wfe;
}

1;