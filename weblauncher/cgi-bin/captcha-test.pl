#!/usr/bin/perl -W

use strict;
use Captcha::Phrase;
use Captcha::AsciiArt;
use Captcha::common;

my($word)=Captcha::Phrase::generate_nonsense_word(mt_rand(3,7));

my($jarl)=Captcha::AsciiArt::toAsciiArt($word,'big');
print $jarl->[0]," ",$jarl->[1],"\n";

foreach my $line (0..($jarl->[1]-1)) {
	foreach my $Aletter (@{$jarl->[2]}) {
		print $Aletter->[$line]," ";
	}
	print "\n"
}
