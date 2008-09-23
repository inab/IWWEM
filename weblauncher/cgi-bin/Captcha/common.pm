#!/usr/bin/perl -W

use strict;

# Method prototypes
sub mt_rand($$);
sub array_rand(\@;$);
sub array_unique(\@);
sub variable_get($\%);

# Method bodies
sub mt_rand($$) {
	my($min,$max)=@_;
	
	return int(rand($max - $min) + $min + 0.5);
}

sub array_rand(\@;$) {
	my($p_words,$num)=@_;
	
	$num=1  unless(defined($num));
	my(@result)=();
	
	my($maxword)=scalar(@{$p_words})-1;
	foreach my $i (0..($num-1)) {
		push(@result,mt_rand(0,$maxword));
	}
	
	return \@result;
}

sub array_unique(\@) {
	my($p_words)=@_;
	
	my(@result)=();
	my($prev)=undef;
	# Filtering duplicates
	foreach my $word (sort(@{$p_words})) {
		if(!defined($prev) || (defined($word) && $prev ne $word)) {
			$prev=$word;
			push(@result,$prev);
		}
	}
	
	return \@result;
}

sub variable_get($\%) {
	# Blindly return second parameter
	return $_[1];
}

1;