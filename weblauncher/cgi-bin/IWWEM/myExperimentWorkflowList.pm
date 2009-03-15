#!/usr/bin/perl -W

# $Id$
# IWWEM/myExperimentWorkflowList.pm
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

package IWWEM::myExperimentWorkflowList;

use Carp qw(croak);
use Date::Parse;
use Encode;
use base qw(IWWEM::AbstractWorkflowList XML::SAX::Base);

use IWWEM::WorkflowCommon;
use IWWEM::UniversalWorkflowKind;
use IWWEM::myExperimentWorkflowList::Constants;

use vars qw($MYEXP_DOMAIN $MYEXP_BASE_URL $MYEXP_BASE_URI $MYEXP_LIST_URL $MYEXP_WF_URL);

$MYEXP_DOMAIN='http://www.myexperiment.org/';
$MYEXP_BASE_URL=$MYEXP_DOMAIN.'workflow';
$MYEXP_BASE_URI=$MYEXP_DOMAIN.'workflows/';
$MYEXP_LIST_URL=$MYEXP_DOMAIN.'workflows.xml';
$MYEXP_WF_URL=$MYEXP_DOMAIN.'workflow.xml?id=';

use vars qw(%LICHASH);
##############
# Prototypes #
##############
sub new(;$);

###############
# Constructor #
###############

# Constructor must do the tasks done by gatherWorkflowList in the past
sub new(;$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	my($parser)=$self->{PARSER};
	my($licdoc)=undef;
	eval {
		$licdoc=$parser->parse_file($IWWEM::WorkflowCommon::LICENSESFILE);
		my($context)=$self->{CONTEXT};
		$context->registerNs('lic',$IWWEM::WorkflowCommon::LIC_NS);
	};
	$self->{LICDOC}=$licdoc  if(defined($licdoc));
	
	# Now, it is time to gather WF information!
	my($id)=undef;
	if(exists($self->{id})) {
		$id=$self->{id};
		$id=substr($id,length($IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX))  if(index($id,$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX)==0);
		$id=undef  if(length($id)==0);
		# Last, resave the id!
		$self->{id}=$id;
	}
	
	$self->{baseListDir}=$MYEXP_BASE_URL;
	
	if(defined($id)) {
		$self->{WORKFLOWLIST}=[$id];
	} else {
		$self->{WORKFLOWLIST}=[];
		$self->{WORKFLOWHASH}={};
		my($parser)=XML::LibXML->new(Handler=>$self);
		my($ua)=LWP::UserAgent->new();
		eval {
			my($pusher)=sub {
				my($chunk,$res)=@_;
				
				$parser->push($chunk);
			};
			
			my($page)=1;
			until(exists($self->{GOTLIST})) {
				$self->{GOTLIST}=1;
				$parser->_start_push(1);
				$parser->init_push();
				my($res)=$ua->request(HTTP::Request->new(GET=>$MYEXP_LIST_URL.'?num=100&page='.$page),$pusher);
				$parser->finish_push();
				$page++;
			}
		};
		
		# Validation
		if($@) {
			croak("There was a problem while fetching from $MYEXP_LIST_URL: $@");
		}
	}
	
	$self->{GATHERED}=[];
	
	return bless($self,$class);
}

# Static methods
sub UnderstandsId($) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return index($_[0],$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX)==0;
}

sub Prefix() {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return $IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX;
}

sub getDomainClass() {
	return 'myExperiment';
}

# Dynamic methods
sub getWorkflowURI($) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser)=$self->{PARSER};
	my($id)=@_;
	
	# It is required a full description
	my($wfuri)=undef;
	eval {
		my($wfid)=undef;
		if(index($id,$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX)==0) {
			$wfid=substr($id,length($IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX));
		} else {
			$wfid=$id;
		}
		my($expdoc)=$parser->parse_file($MYEXP_WF_URL.$wfid);
		my($exproot)=$expdoc->documentElement();
		
		my($child)=undef;
		
		for($child=$exproot->firstChild();defined($child) && $child->nextSibling();$child=$child->nextSibling()) {
			if($child->nodeType()==XML::LibXML::XML_ELEMENT_NODE) {
				my($lname)=$child->localname();
				if($lname eq 'content-uri') {
					$wfuri=$child->textContent();
				}
			}
		}
	};
	if($@) {
		print STDERR "PANIC!!!! $@\n";
	}
		
	return $wfuri;
}

sub getWorkflowInfo($@) {
	my($self)=shift;
	
	croak("This is an instance method!")  unless(ref($self));
	
	my($parser,$context)=($self->{PARSER},$self->{CONTEXT});
	my($wf,$listDir,$uuidPrefix,$isSnapshot)=@_;
	
	my($wfe)=undef;
	my($wfid)=undef;
	if(ref($wf)) {
		$wfid=$wf->[0];
		my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
		$wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
		$outputDoc->setDocumentElement($wfe);
		
		# It is required a brief reference
		$wfe->setAttribute('uuid',$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX.$wf->[0]);
		$wfe->setAttribute('title',$wf->[1]);
		my $releaseRef = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'releaseRef');
		$releaseRef->setAttribute('uuid',$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX.$wf->[0]);
		$releaseRef->setAttribute('title',$wf->[1]);
		$wfe->appendChild($releaseRef);
	} else {
		if(index($wf,$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX)==0) {
			$wfid=substr($wf,length($IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX));
		} else {
			$wfid=$wf;
		}
		
		# It is required a full description
		eval {
			my($expdoc)=$parser->parse_file($MYEXP_WF_URL.$wfid);
			my($exproot)=$expdoc->documentElement();
			
			# Not found!
			return  if($exproot->localname eq 'error');
			
			my($child)=undef;
			my($title)='';
			my($description)='';
			my($responsibleName)='';
			my($date)='';
			my(@mimes)=();
			my($license)='';
			my($wfuri)=undef;
			my($wfKind)='UNIVERSAL';
			my($version)=$exproot->getAttribute('version');
			
			for($child=$exproot->firstChild();$child->nextSibling();$child=$child->nextSibling()) {
				if($child->nodeType()==XML::LibXML::XML_ELEMENT_NODE) {
					my($lname)=$child->localname();
					if($lname eq 'title') {
						$title=$child->textContent();
					} elsif($lname eq 'description') {
						$description=$child->textContent();
					} elsif($lname eq 'uploader') {
						$responsibleName=$child->textContent();
					} elsif($lname eq 'created-at') {
						$date=LockNLog::getPrintableDate(str2time($child->textContent()));
					} elsif($lname eq 'preview') {
						my($prelink)=$child->textContent();
						my($premime)=($prelink =~ /\.jpg$/)?'image/jpeg':(($prelink =~ /\.png$/)?'image/png':(($prelink =~ /\.gif$/)?'image/gif':'image/*'));
						push(@mimes,[$prelink,$premime]);
					} elsif($lname eq 'svg') {
						push(@mimes,[$child->textContent(),'image/svg+xml']);
					} elsif($lname eq 'license-type') {
						$license=$child->textContent();
					} elsif($lname eq 'content-uri') {
						$wfuri=$child->textContent();
					} elsif($lname eq 'content-type') {
						$wfKind=$child->textContent();
					} elsif($lname eq 'tags') {
						# TODO: myExperiment tags parsing
					}
				}
			}
		
			my($uuid)=$IWWEM::myExperimentWorkflowList::Constants::MYEXP_PREFIX.$wfid;
			if(exists($self->{WFH}{$wfKind})) {
				eval {
					# $wfe = $self->{WFH}{$wfKind}->getWorkflowInfo($wfuri,$uuid,undef,undef,undef);
					$wfe = $self->{WFH}{$wfKind}->getWorkflowInfo($uuid,$wfuri,$wfuri);
				};
				if($@) {
					print STDERR "MINIPANIC!!!! $@\n";
				}
			}
			unless(defined($wfe)) {
				my($outputDoc)=XML::LibXML::Document->new('1.0','UTF-8');
				$wfe = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'workflow');
				$outputDoc->setDocumentElement($wfe);

				# At this moment, no description :-(
				# We need some specifications!!!!
				$wfe->setAttribute('uuid',$uuid);
				$wfe->setAttribute('title',$title);
				
				my $release = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'release');
				$wfe->appendChild($release);
				

				$release->setAttribute('uuid',$uuid);

				$release->setAttribute('lsid','');
				# As we don't know how to parse this workflow kind,
				# we have to assume that the uploader is the author :-(
				$release->setAttribute('author',$responsibleName);
				$release->setAttribute('title',$title);
				$release->setAttribute('path',$wfuri);
				$release->setAttribute('workflowType',$wfKind);
				
				# Getting the workflow description
				my($wdesc)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'description');
				$wdesc->appendChild($outputDoc->createCDATASection($description));
				$release->appendChild($wdesc);
				
				# As we know nothing about this workflow kind
			}
				
			my($outputDoc)=$wfe->ownerDocument();
			my($release)=$wfe->firstChild();
			$release->setAttribute('version',$version);
			while(defined($release) && ($release->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $release->localname() ne 'release')) {
				$release=$release->nextSibling();
			}

			$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLEMAIL,'');
			$release->setAttribute($IWWEM::WorkflowCommon::RESPONSIBLENAME,$responsibleName);

			# The date
			$release->setAttribute('date',$date);

			# Licenses
			my($licenseName)=$license;
			my($licenseURI)='';
			if(exists($self->{LICDOC})) {
				my(@lics)=$context->findnodes("//lic:license[lic:alias='$license']",$self->{LICDOC});
				if(scalar(@lics)>0) {
					$licenseName=$lics[0]->getAttribute('name');
					$licenseURI=$lics[0]->getAttribute('abbrevURI') || $lics[0]->getAttribute('uri');
				}
			}
			$release->setAttribute('licenseName',$licenseName);
			$release->setAttribute('licenseURI',$licenseURI);


			# Adding links to its graphical representations
			my($refnode)=$release->firstChild();
			while(defined($refnode) && ($refnode->nodeType()!=XML::LibXML::XML_ELEMENT_NODE || $refnode->localname() ne 'description')) {
				$refnode=$refnode->nextSibling();
			}

			foreach my $mime (@mimes) {
				my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
				my($mtext)=$mime->[1];
				$gchild->setAttribute('mime',$mtext);
				if(exists($IWWEM::WorkflowCommon::GRAPHREPINV{$mtext})) {
					my($str)=encode('UTF-8',$uuid);
					
					$str =~ s/([^A-Za-z0-9])/sprintf("%%%02X", ord($1))/seg;
					$gchild->setAttribute('altURI',$IWWEM::FSConstants::VIRTIDDIR.'/'.$str.'/'.$IWWEM::WorkflowCommon::GRAPHREPINV{$mtext});
				}
				$gchild->appendChild($outputDoc->createTextNode($mime->[0]));
				$release->insertAfter($gchild,$refnode);
				$refnode=$gchild;
			}
		};
		
		if($@) {
			print STDERR "PANIC!!!! $@\n";
		}

	}
	
	return $wfe;
	
}

########################
# SAX instance methods #
########################
sub start_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};

	if($elname eq 'workflow') {
		delete($self->{GOTLIST})  if(exists($self->{GOTLIST}));
		my($wfres)=$elem->{Attributes}{'{}resource'}{Value};
		$wfres=substr($wfres,length($MYEXP_BASE_URI))  if(index($wfres,$MYEXP_BASE_URI)==0);
		my(@wf)=($wfres,undef);
		$self->{getdesc}=\@wf;
		push(@{$self->{WORKFLOWLIST}},\@wf);
	}
}

sub characters {
	my($self,$chars)=@_;
	
	if(exists($self->{getdesc})) {
		$self->{desc} = ''  unless(exists($self->{desc}));
		$self->{desc} .= $chars->{Data};
	}
}

sub end_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};
	
	if($elname eq 'workflow') {
		$self->{getdesc}[1]=$self->{desc};
		$self->{WORKFLOWHASH}{$self->{getdesc}[0]}=$self->{desc};
		delete($self->{desc});
		delete($self->{getdesc});
	}
}

1;
