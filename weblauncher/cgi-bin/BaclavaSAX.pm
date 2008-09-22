#!/usr/bin/perl -W

# $Id$
# BaclavaSAX.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)

use strict;

package BaclavaSAX;

use strict;

use FindBin;
use lib "$FindBin::Bin";
use WorkflowCommon;

use XML::SAX::Base;
use XML::SAX::Exception;
use base qw(XML::SAX::Base);

sub new($$$) {
	my($class)=shift;
	my($baseelem)=shift;
	my($outputDoc)=shift;
	my($root)=shift;
	
	my($self)=$class->SUPER::new();
	
	$self->{baseelem}=$baseelem;
	$self->{outputDoc}=$outputDoc;
	$self->{root}=$root;
	
	return bless($self,$class);
}

sub start_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};
	
	if($elname eq 'partialOrder' || $elname eq 'dataElement') {
		my($current)=$self->{outputDoc}->createElementNS($WorkflowCommon::WFD_NS,($elname eq 'partialOrder')?'branch':'leaf');
		if(exists($elem->{Attributes}{'{}index'})) {
			$current->setAttribute('index',$elem->{Attributes}{'{}index'}{Value});
		}
		my($parent);
		$self->{parent}=$parent=$self->{current};
		$parent->appendChild($current);
		$self->{current}=$current;
	} elsif($elname eq 'dataThing') {
		my($ionode);
		$self->{current}=$self->{ionode}=$ionode=$self->{outputDoc}->createElementNS($WorkflowCommon::WFD_NS,$self->{baseelem});
		$ionode->setAttribute('name',$elem->{Attributes}{'{}key'}{Value});
		$self->{p_mimes}=[];
		$self->{root}->appendChild($ionode);
	} elsif($elname eq 'mimeType') {
		$self->{inMime}=1;
	}
}

sub characters {
	my($self,$chars)=@_;
	
	if(exists($self->{inMime})) {
		if(exists($self->{toMime})) {
			$self->{toMime}.=$chars->{Data};
		} else {
			$self->{toMime}=$chars->{Data};
		}
	}
}

sub end_element {
	my($self,$elem)=@_;
	
	my($elname)=$elem->{LocalName};
	
	if($elname eq 'partialOrder' || $elname eq 'dataElement') {
		# Backtracking
		$self->{current}=$self->{parent};
		$self->{parent}=$self->{current}->parentNode;
	} elsif($elname eq 'dataThing') {
		my($ionode)=$self->{ionode};
		delete($self->{ionode});
		my($p_mimes)=$self->{p_mimes};
		delete($self->{p_mimes});
		
		my($outputDoc)=$self->{outputDoc};
		push(@{$p_mimes},'text/plain')  if(scalar(@{$p_mimes})==0);
		foreach my $mime (@{$p_mimes}) {
			my($mimeNode)=$outputDoc->createElementNS($WorkflowCommon::WFD_NS,'mime');
			$mimeNode->appendChild($outputDoc->createTextNode($mime));
			$ionode->appendChild($mimeNode);
		}
		
		delete($self->{parent});
		delete($self->{current});
	} elsif(exists($self->{inMime}) && $elname eq 'mimeType') {
		delete($self->{inMime});
		if(exists($self->{toMime})) {
			push(@{$self->{p_mimes}},$self->{toMime});
			delete($self->{toMime});
		}
	}
}

1;