#!/usr/bin/perl -W

use strict;

package IWWEM::SelectiveWorkflowList;

use base qw(IWWEM::AbstractWorkflowList);
use IWWEM::InternalWorkflowList;
use IWWEM::myExperimentWorkflowList;
use IWWEM::URLWorkflowList;

my(@PARADIGMS)=(
	'IWWEM::InternalWorkflowList',
	'IWWEM::myExperimentWorkflowList',
	'IWWEM::URLWorkflowList'
);

sub new(;$) {
	my($proto)=shift;
	my($class)=ref($proto) || $proto;
	
	my($self)=$proto->SUPER::new(@_);
	
	
	if(exists($self->{id})) {
		my($id)=$self->{id};
		foreach my $paradigm (@PARADIGMS) {
			return $paradigm->new(@_)  if($paradigm->UnderstandsId($id));
		}
	}
	return IWWEM::InternalWorkflowList->new(@_);
}