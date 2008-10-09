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