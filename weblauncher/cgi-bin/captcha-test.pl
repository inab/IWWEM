#!/usr/bin/perl -W

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
