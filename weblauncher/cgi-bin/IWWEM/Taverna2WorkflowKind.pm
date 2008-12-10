#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
# IWWEM/Taverna2WorkflowKind.pm
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

package IWWEM::Taverna2WorkflowKind;

use Carp qw(croak);
use base qw(IWWEM::AbstractWorkflowKind);

use IWWEM::WorkflowCommon;

use vars qw($T2FLOW_NS);

$T2FLOW_NS = 'http://taverna.sf.net/2008/xml/t2flow';

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
	
	my($context)=$self->{CONTEXT};
	$context->registerNs('t2',$T2FLOW_NS);
	
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
	my($wfresp,$examplescat,$snapshotscat)=();
	if(defined($relwffile)) {
		$wffile=$listDir.'/'.$relwffile;
		my($wfdir)=$listDir.'/'.$wf;
		$wffile=$listDir.'/'.$relwffile;
		$examplescat = $wfdir .'/'. $IWWEM::WorkflowCommon::EXAMPLESDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$snapshotscat = $wfdir .'/'. $IWWEM::WorkflowCommon::SNAPSHOTSDIR . '/' . $IWWEM::WorkflowCommon::CATALOGFILE;
		$wfresp=$wfdir.'/'.$IWWEM::WorkflowCommon::RESPONSIBLEFILE;
	} else {
		$relwffile=$wffile=$wf;
	}
	#$wfcatmutex->mutex(sub {
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		my($wfe)=undef;
		my $doc = $parser->parse_file($wffile);
		
		# Getting dataflow from workflow definition
		my($t2root)=$doc->documentElement();
		my($dataflow)=$t2root->firstChild();
		while(defined($dataflow) && ($dataflow->localname() ne 'dataflow' || $dataflow->namespaceURI() ne $T2FLOW_NS || $dataflow->getAttribute('role') ne 'top')) {
			$dataflow=$dataflow->nextSibling();
		}
		if(defined($dataflow) && $t2root->namespaceURI() eq $T2FLOW_NS && $t2root->localname() eq 'workflow') {
			$wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
			$outputDoc->setDocumentElement($wfe);
			
			# At this moment, no description :-(
			# We need some specifications!!!!
			my($desctext)='';
			$wfe->setAttribute('uuid',$uuid);
			my(@nodelist) = $context->findnodes('t2:name',$dataflow);
			my($title)=(scalar(@nodelist)>0)?$nodelist[0]->textContent():'';
			$wfe->setAttribute('title',$title);

			my $release = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'release');
			$wfe->appendChild($release);
			

			$release->setAttribute('uuid',$uuid);
			
			$release->setAttribute('lsid',$dataflow->getAttribute('id'));
			$release->setAttribute('author','');
			$release->setAttribute('title',$title);
			$release->setAttribute('path',$relwffile);
			$release->setAttribute('workflowType','Taverna2');
			
			my($licenseName)=undef;
			my($licenseURI)=undef;
			
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
			
			$release->setAttribute('licenseName',$licenseName);
			$release->setAttribute('licenseURI',$licenseURI);
			
			# Getting the workflow description
			my($wdesc)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
			$wdesc->appendChild($outputDoc->createCDATASection($desctext));
			$release->appendChild($wdesc);
			
			# Getting Inputs
			@nodelist = $context->findnodes('t2:inputPorts/t2:port',$dataflow);
			foreach my $source (@nodelist) {
				my $input = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'input');
				my(@portname)=$source->getElementsByTagNameNS($T2FLOW_NS,'name');
				$input->setAttribute('name',(scalar(@portname>0))?$portname[0]->textContent():'');
				
				# Description
				my(@sourcedesc)=$source->getElementsByTagNameNS($T2FLOW_NS,'description');
				if(scalar(@sourcedesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sourcedesc[0]->textContent()));
					$input->appendChild($descnode);
				}
				
				# TODO: MIME types handling
#				my(@mimetypes)=$source->getElementsByTagNameNS($T2FLOW_NS,'mimetype');
#				# Taverna default mime type
#				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
#				foreach my $mime (@mimetypes) {
#					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
#					$mtype->setAttribute('type',$mime);
#					$input->appendChild($mtype);
#				}
				
				# At last, appending this input
				$release->appendChild($input);
			}
			
			# Outputs
			@nodelist = $context->findnodes('t2:outputPorts/t2:port',$dataflow);
			foreach my $sink (@nodelist) {
				my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'output');
				my(@portname)=$sink->getElementsByTagNameNS($T2FLOW_NS,'name');
				$output->setAttribute('name',(scalar(@portname>0))?$portname[0]->textContent():'');
				
				# Description
				my(@sinkdesc)=$sink->getElementsByTagNameNS($T2FLOW_NS,'description');
				if(scalar(@sinkdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($sinkdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# TODO: MIME types handling
#				my(@mimetypes)=$sink->getElementsByTagNameNS($IWWEM::WorkflowCommon::XSCUFL_NS,'mimetype');
#				# Taverna default mime type
#				push(@mimetypes,'text/plain')  if(scalar(@mimetypes)==0);
#				foreach my $mime (@mimetypes) {
#					my $mtype = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'mime');
#					$mtype->setAttribute('type',$mime);
#					$output->appendChild($mtype);
#				}
				
				# At last, appending this output
				$release->appendChild($output);
			}
			
			# And direct steps!
			@nodelist = $context->findnodes('t2:processors/t2:processor',$dataflow);
			foreach my $step (@nodelist) {
				my $output = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'step');
				my(@portname)=$step->getElementsByTagNameNS($T2FLOW_NS,'name');
				$output->setAttribute('name',(scalar(@portname>0))?$portname[0]->textContent():'');
				
				# Description
				my(@stepdesc)=$step->getElementsByTagNameNS($T2FLOW_NS,'description');
				if(scalar(@stepdesc)>0) {
					my($descnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
					$descnode->appendChild($outputDoc->createCDATASection($stepdesc[0]->textContent()));
					$output->appendChild($descnode);
				}
				
				# TODO: Secondary parameters handling
#				my(@secparams) = $context->findnodes('s:biomobywsdl/s:Parameter',$step);
#				if(scalar(@secparams)>0) {
#					$output->setAttribute('kind','moby');
#					foreach my $sec (@secparams) {
#						my($secnode)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'secondaryInput');
#						$secnode->setAttribute('name',$sec->getAttributeNS($IWWEM::WorkflowCommon::XSCUFL_NS,'name'));
#						$secnode->setAttribute('isOptional','true');
#						# TODO: Query BioMOBY in order to know the type, min/max values, description, etc...!
#						$secnode->setAttribute('type','string');
#						$secnode->setAttribute('default',$sec->textContent());
#						$output->appendChild($secnode);
#					}
#				}
			}
		}
	#});
	
	return $wfe;
}

1;