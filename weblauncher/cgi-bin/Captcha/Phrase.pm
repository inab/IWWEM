#!/usr/bin/perl -W

# $Id$
# This code is based on work from CAPTCHA Pack
# from Drupal
# http://drupal.org/project/captcha_pack
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
# Original IWWE&M concept, design and coding done by José María Fernández González, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

use Captcha::common;
use Captcha::Text;

package Captcha::Phrase;

my($CONSONANTS) = 'bcdfghjklmnpqrstvwxyz';
my($VOWELS) = 'aeiou';

# Method prototypes
sub generate_nonsense_word($);
sub generate_words($;$);
sub ordinal($);

sub available_word_challenges();
sub enabled_word_challenges();

sub word_question_word_index(\@);
sub word_question_alphabetical_misplaced(\@);
sub word_question_double_occurence(\@);

# Method bodies

# function for generating a random nonsense word of a given number of characters
sub generate_nonsense_word($) {
	my($characters)=@_;
	
	my($vowel_max) = length($VOWELS) - 1;
	my($consonant_max) = length($CONSONANTS) - 1;
	my($word) = '';
	my($o) = (int(rand(1)+0.5)==1)?1:undef; # randomly start with vowel or consonant
	foreach my $i (0..($characters-1)) {
		if(defined($o)) {
			$o=undef;
			$word .= substr($CONSONANTS,int(rand($consonant_max)+0.5),1);
		} else {
			$o=1;
			$word .= substr($VOWELS,int(rand($vowel_max)+0.5),1);
	    }
	}
	return $word;
}

# function for generating an array of words
sub generate_words($;$) {
	my($num,$usePool)=@_;
	my(@words) = ();
	my($p_words)=\@words;
	
	if (defined($usePool)) {
		# use user defined words
		my($p_uwords) = Captcha::Text::word_pool_get_content('phrase_captcha_userdefined_word_pool', undef, '', 1);
		if($num>=1) {
			my($p_keys) = array_rand(@{$p_uwords}, $num);
			$p_words = [@{$p_uwords}[@{$p_keys}]];
		}
	} else {
		# generate nonsense words
		foreach my $w (0..($num-1)) {
			push(@words, generate_nonsense_word(mt_rand(3, 7)));
		}
	}
	
	return $p_words;
}

my(@ORDINALS)=(
	'zeroth',
	'first',
	'second',
	'third',
	'fourth',
	'fifth',
	'sixth',
	'seventh',
	'eighth',
	'ninth',
	'tenth',
	'eleventh',
	'twelf',
	'thirdteenth',
	'fourteenth',
	'fifteenth',
	'sixteenth',
	'seventeenth',
	'eighteenth',
	'nineteenth',
	'twentieth',
);

# function that returns a textual represention of an ordinal
sub ordinal($) {
	my($n)=@_;
	$n=1  unless(defined($n));
	$n=int($n);
	$n=0  if($n<0);
	
	return ($n <= $#ORDINALS)?$ORDINALS[$n]:"${n}th";
}

my(%CHALLENGES)=();

sub available_word_challenges() {
	return \%CHALLENGES;
}

sub enabled_word_challenges() {
	# TODO
	my(@aval)=values(%{available_word_challenges()});
	return \@aval;
}

sub word_question_word_index(\@) {
	my($p_words)=@_;
	
	my($key)=array_rand(@{$p_words},1)->[0];
	my($answer)=$p_words->[$key];
	my($description)=undef;
	if(mt_rand(0, 1)) {
		$description = 'What is the '.ordinal($key+1).' word in the CAPTCHA phrase above?';
	} else {
		my($n) = scalar(@{$p_words}) - $key;
		if($n == 1) {
			$description = 'What is the last word in the CAPTCHA phrase above?';
		} else {
			$description = 'What is the '.ordinal($n).' last word in the CAPTCHA phrase above?';
		}
	}
	
	return [$p_words,$description,$answer];
}

sub word_question_alphabetical_misplaced(\@) {
	my($p_words)=@_;
	
	# sort the words
	my(@words)= sort(@{$p_words});
	@words=reverse(@words)  unless(mt_rand(0, 1)); 
	# pick a word and its new destination
	# new destination has to be at least 2 places from the original place,
	# otherwise it could lead to something like swapping two neighbours,
	# in which case there is no unique answer.
	my($from, $to) = (0,0);
	while (abs($from - $to) < 2) {
		$from = array_rand(@words, 1)->[0];
		$to = array_rand(@words, 1)->[0];
	}
	# get the word
	my($answer) = $words[$from];
	# move the word from $from to $to
	splice(@words,$from,1);
	# Resetting position
	if($from<$to) {
		$to--;
	}
	splice(@words,$to,0,$answer);
	# build the description
	my($description) = 'Which word does not follow the alphabetical order in the CAPTCHA phrase above?';
	
	return [\@words, $description, $answer];
}

sub word_question_double_occurence(\@) {
	my($p_words)=@_;
	
	# assure single occurence of each word
	$p_words = array_unique($p_words);
	# pick a word
	my($key) = array_rand($p_words, 1);
	my($answer) = $p_words->[$key];
	# replace another word with it
	my($pos);
	while (($pos = array_rand($p_words, 1)->[0]) == $key) {
		# NOP aka NOOP aka pass
	}
	splice(@{$p_words}, $pos, 0, $answer);
	my($description) = 'Which word occurs two times in the CAPTCHA phrase above?';
	return [$p_words, $description, $answer];
}
1;
