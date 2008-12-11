#!/usr/bin/perl -W

# $Id: Config.pm 256 2008-10-09 17:11:44Z jmfernandez $
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
use base qw(IWWEM::AbstractWorkflowList XML::SAX::Base);

use IWWEM::WorkflowCommon;
use IWWEM::UniversalWorkflowKind;

use vars qw($MYEXP_PREFIX $MYEXP_DOMAIN $MYEXP_BASE_URL $MYEXP_BASE_URI $MYEXP_LIST_URL $MYEXP_WF_URL);

$MYEXP_PREFIX='myExperiment:';
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
		$id=substr($id,length($MYEXP_PREFIX))  if(index($id,$MYEXP_PREFIX)==0);
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

# Static method
sub UnderstandsId($) {
	# Very special case for multiple inheritance handling
	# This is the seed
	my($self)=shift;
	my($class)=ref($self) || $self;
	
	return index($_[0],$MYEXP_PREFIX)==0;
}

sub getDomainClass() {
	return 'myExperiment';
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
		$wfe->setAttribute('uuid',$MYEXP_PREFIX.$wf->[0]);
		$wfe->setAttribute('title',$wf->[1]);
		my $releaseRef = $outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'releaseRef');
		$releaseRef->setAttribute('uuid',$MYEXP_PREFIX.$wf->[0]);
		$releaseRef->setAttribute('title',$wf->[1]);
		$wfe->appendChild($releaseRef);
	} else {
		$wfid=$wf;
		# It is required a full description
		eval {
			my($expdoc)=$parser->parse_file($MYEXP_WF_URL.$wf);
			my($exproot)=$expdoc->documentElement();
			
			my($child)=undef;
			my($title)='';
			my($responsibleName)='';
			my($date)='';
			my(@mimes)=();
			my($license)='';
			my($wfuri)=undef;
			for($child=$exproot->firstChild();$child->nextSibling();$child=$child->nextSibling()) {
				my($lname)=$child->localname();
				if($lname eq 'title') {
					$title=$child->textContent();
				} elsif($lname eq 'uploader') {
					$responsibleName=$child->textContent();
				} elsif($lname eq 'created-at') {
					$date=LockNLog::getPrintableDate(str2time($child->textContent()));
				} elsif($lname eq 'preview') {
					push(@mimes,[$child->textContent(),'image/png']);
				} elsif($lname eq 'svg') {
					push(@mimes,[$child->textContent(),'image/svg+xml']);
				} elsif($lname eq 'license-type') {
					$license=$child->textContent();
				} elsif($lname eq 'content-uri') {
					$wfuri=$child->textContent();
				} elsif($lname eq 'tags') {
					# TODO: myExperiment tags parsing
				}
			}
			
			my($wfKind)='UNIVERSAL';
			
			my($uuid)=$MYEXP_PREFIX.$wf;
			$wfe = $self->{$wfKind}->getWorkflowInfo($wfuri,$uuid,undef,undef,undef);
			
			if(defined($wfe)) {
				my($outputDoc)=$wfe->ownerDocument();
				my($release)=$wfe->firstChild();
				while(defined($release) && $release->localname() ne 'release') {
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
				while(defined($refnode) && $refnode->localname() ne 'description') {
					$refnode=$refnode->nextSibling();
				}
				
				foreach my $mime (@mimes) {
						my($gchild)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'graph');
						$gchild->setAttribute('mime',$mime->[1]);
						$gchild->appendChild($outputDoc->createTextNode($mime->[0]));
						$release->insertAfter($gchild,$refnode);
						$refnode=$gchild;
				}
			}
		};

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