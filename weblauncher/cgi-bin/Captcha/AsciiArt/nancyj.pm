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

package Captcha::AsciiArt;

use vars qw(%FONT);


# $Id$
# Font definition based on figlet font "nancyj" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 8,
  'name' => 'nancyj',
  'comment' => '\t\t\t\t   nancyj.flf\t  named after the login of a woman who  asked me to make her a\t  sig. this is the font that came out of it.  this is my first\t\t  attempt at a figlet font, so leave me alone.\t\t\t       vampyr@acs.bu.edu',
  'a' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '`88888P8 ',
    '         ',
    '         ',
  ],
  'b' => [
    'dP       ',
    '88       ',
    '88d888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '88Y8888\' ',
    '         ',
    '         ',
  ],
  'c' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88\'  `"" ',
    '88.  ... ',
    '`88888P\' ',
    '         ',
    '         ',
  ],
  'd' => [
    '      dP ',
    '      88 ',
    '.d888b88 ',
    '88\'  `88 ',
    '88.  .88 ',
    '`88888P8 ',
    '         ',
    '         ',
  ],
  'e' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88ooood8 ',
    '88.  ... ',
    '`88888P\' ',
    '         ',
    '         ',
  ],
  'f' => [
    '.8888b ',
    '88   " ',
    '88aaa  ',
    '88     ',
    '88     ',
    'dP     ',
    '       ',
    '       ',
  ],
  'g' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '`8888P88 ',
    '     .88 ',
    ' d8888P  ',
  ],
  'h' => [
    'dP       ',
    '88       ',
    '88d888b. ',
    '88\'  `88 ',
    '88    88 ',
    'dP    dP ',
    '         ',
    '         ',
  ],
  'i' => [
    'oo ',
    '   ',
    'dP ',
    '88 ',
    '88 ',
    'dP ',
    '   ',
    '   ',
  ],
  'j' => [
    'oo ',
    '   ',
    'dP ',
    '88 ',
    '88 ',
    '88 ',
    '88 ',
    'dP ',
  ],
  'k' => [
    'dP       ',
    '88       ',
    '88  .dP  ',
    '88888"   ',
    '88  `8b. ',
    'dP   `YP ',
    '         ',
    '         ',
  ],
  'l' => [
    'dP ',
    '88 ',
    '88 ',
    '88 ',
    '88 ',
    'dP ',
    '   ',
    '   ',
  ],
  'm' => [
    '           ',
    '           ',
    '88d8b.d8b. ',
    '88\'`88\'`88 ',
    '88  88  88 ',
    'dP  dP  dP ',
    '           ',
    '           ',
  ],
  'n' => [
    '         ',
    '         ',
    '88d888b. ',
    '88\'  `88 ',
    '88    88 ',
    'dP    dP ',
    '         ',
    '         ',
  ],
  'o' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '`88888P\' ',
    '         ',
    '         ',
  ],
  'p' => [
    '         ',
    '         ',
    '88d888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '88Y888P\' ',
    '88       ',
    'dP       ',
  ],
  'q' => [
    '         ',
    '         ',
    '.d8888b. ',
    '88\'  `88 ',
    '88.  .88 ',
    '`8888P88 ',
    '      88 ',
    '      dP ',
  ],
  'r' => [
    '         ',
    '         ',
    '88d888b. ',
    '88\'  `88 ',
    '88       ',
    'dP       ',
    '         ',
    '         ',
  ],
  's' => [
    '         ',
    '         ',
    '.d8888b. ',
    'Y8ooooo. ',
    '      88 ',
    '`88888P\' ',
    '         ',
    '         ',
  ],
  't' => [
    '  dP   ',
    '  88   ',
    'd8888P ',
    '  88   ',
    '  88   ',
    '  dP   ',
    '       ',
    '       ',
  ],
  'u' => [
    '         ',
    '         ',
    'dP    dP ',
    '88    88 ',
    '88.  .88 ',
    '`88888P\' ',
    '         ',
    '         ',
  ],
  'v' => [
    '         ',
    '         ',
    'dP   .dP ',
    '88   d8\' ',
    '88 .88\'  ',
    '8888P\'   ',
    '         ',
    '         ',
  ],
  'w' => [
    '           ',
    '           ',
    'dP  dP  dP ',
    '88  88  88 ',
    '88.88b.88\' ',
    '8888P Y8P  ',
    '           ',
    '           ',
  ],
  'x' => [
    '         ',
    '         ',
    'dP.  .dP ',
    ' `8bd8\'  ',
    ' .d88b.  ',
    'dP\'  `dP ',
    '         ',
    '         ',
  ],
  'y' => [
    '         ',
    '         ',
    'dP    dP ',
    '88    88 ',
    '88.  .88 ',
    '`8888P88 ',
    '     .88 ',
    ' d8888P  ',
  ],
  'z' => [
    '         ',
    '         ',
    'd888888b ',
    '   .d8P\' ',
    ' .Y8P    ',
    'd888888P ',
    '         ',
    '         ',
  ],
  'A' => [
    ' .d888888  ',
    'd8\'    88  ',
    '88aaaaa88a ',
    '88     88  ',
    '88     88  ',
    '88     88  ',
    '           ',
    '           ',
  ],
  'B' => [
    ' 888888ba  ',
    ' 88    `8b ',
    'a88aaaa8P\' ',
    ' 88   `8b. ',
    ' 88    .88 ',
    ' 88888888P ',
    '           ',
    '           ',
  ],
  'C' => [
    ' a88888b. ',
    'd8\'   `88 ',
    '88        ',
    '88        ',
    'Y8.   .88 ',
    ' Y88888P\' ',
    '          ',
    '          ',
  ],
  'D' => [
    '888888ba  ',
    '88    `8b ',
    '88     88 ',
    '88     88 ',
    '88    .8P ',
    '8888888P  ',
    '          ',
    '          ',
  ],
  'E' => [
    ' 88888888b ',
    ' 88        ',
    'a88aaaa    ',
    ' 88        ',
    ' 88        ',
    ' 88888888P ',
    '           ',
    '           ',
  ],
  'F' => [
    ' 88888888b ',
    ' 88        ',
    'a88aaaa    ',
    ' 88        ',
    ' 88        ',
    ' dP        ',
    '           ',
    '           ',
  ],
  'G' => [
    ' .88888.  ',
    'd8\'   `88 ',
    '88        ',
    '88   YP88 ',
    'Y8.   .88 ',
    ' `88888\'  ',
    '          ',
    '          ',
  ],
  'H' => [
    'dP     dP  ',
    '88     88  ',
    '88aaaaa88a ',
    '88     88  ',
    '88     88  ',
    'dP     dP  ',
    '           ',
    '           ',
  ],
  'I' => [
    'dP ',
    '88 ',
    '88 ',
    '88 ',
    '88 ',
    'dP ',
    '   ',
    '   ',
  ],
  'J' => [
    '       dP ',
    '       88 ',
    '       88 ',
    '       88 ',
    '88.  .d8P ',
    ' `Y8888\'  ',
    '          ',
    '          ',
  ],
  'K' => [
    'dP     dP ',
    '88   .d8\' ',
    '88aaa8P\'  ',
    '88   `8b. ',
    '88     88 ',
    'dP     dP ',
    '          ',
    '          ',
  ],
  'L' => [
    'dP        ',
    '88        ',
    '88        ',
    '88        ',
    '88        ',
    '88888888P ',
    '          ',
    '          ',
  ],
  'M' => [
    '8888ba.88ba  ',
    '88  `8b  `8b ',
    '88   88   88 ',
    '88   88   88 ',
    '88   88   88 ',
    'dP   dP   dP ',
    '             ',
    '             ',
  ],
  'N' => [
    '888888ba  ',
    '88    `8b ',
    '88     88 ',
    '88     88 ',
    '88     88 ',
    'dP     dP ',
    '          ',
    '          ',
  ],
  'O' => [
    ' .88888.  ',
    'd8\'   `8b ',
    '88     88 ',
    '88     88 ',
    'Y8.   .8P ',
    ' `8888P\'  ',
    '          ',
    '          ',
  ],
  'P' => [
    ' 888888ba  ',
    ' 88    `8b ',
    'a88aaaa8P\' ',
    ' 88        ',
    ' 88        ',
    ' dP        ',
    '           ',
    '           ',
  ],
  'Q' => [
    ' .88888.   ',
    'd8\'   `8b  ',
    '88     88  ',
    '88  db 88  ',
    'Y8.  Y88P  ',
    ' `8888PY8b ',
    '           ',
    '           ',
  ],
  'R' => [
    ' 888888ba  ',
    ' 88    `8b ',
    'a88aaaa8P\' ',
    ' 88   `8b. ',
    ' 88     88 ',
    ' dP     dP ',
    '           ',
    '           ',
  ],
  'S' => [
    '.d88888b  ',
    '88.    "\' ',
    '`Y88888b. ',
    '      `8b ',
    'd8\'   .8P ',
    ' Y88888P  ',
    '          ',
    '          ',
  ],
  'T' => [
    'd888888P ',
    '   88    ',
    '   88    ',
    '   88    ',
    '   88    ',
    '   dP    ',
    '         ',
    '         ',
  ],
  'U' => [
    'dP     dP ',
    '88     88 ',
    '88     88 ',
    '88     88 ',
    'Y8.   .8P ',
    '`Y88888P\' ',
    '          ',
    '          ',
  ],
  'V' => [
    'dP     dP ',
    '88     88 ',
    '88    .8P ',
    '88    d8\' ',
    '88  .d8P  ',
    '888888\'   ',
    '          ',
    '          ',
  ],
  'W' => [
    'dP   dP   dP ',
    '88   88   88 ',
    '88  .8P  .8P ',
    '88  d8\'  d8\' ',
    '88.d8P8.d8P  ',
    '8888\' Y88\'   ',
    '             ',
    '             ',
  ],
  'X' => [
    'dP    dP ',
    'Y8.  .8P ',
    ' Y8aa8P  ',
    'd8\'  `8b ',
    '88    88 ',
    'dP    dP ',
    '         ',
    '         ',
  ],
  'Y' => [
    'dP    dP ',
    'Y8.  .8P ',
    ' Y8aa8P  ',
    '   88    ',
    '   88    ',
    '   dP    ',
    '         ',
    '         ',
  ],
  'Z' => [
    'd8888888P ',
    '     .d8\' ',
    '   .d8\'   ',
    ' .d8\'     ',
    'd8\'       ',
    'Y8888888P ',
    '          ',
    '          ',
  ],
  '0' => [
    ' a8888a  ',
    'd8\' ..8b ',
    '88 .P 88 ',
    '88 d\' 88 ',
    'Y8\'\' .8P ',
    ' Y8888P  ',
    '         ',
    '         ',
  ],
  '1' => [
    'd88  ',
    ' 88  ',
    ' 88  ',
    ' 88  ',
    ' 88  ',
    'd88P ',
    '     ',
    '     ',
  ],
  '2' => [
    'd8888b. ',
    '    `88 ',
    '.aaadP\' ',
    '88\'     ',
    '88.     ',
    'Y88888P ',
    '        ',
    '        ',
  ],
  '3' => [
    'd8888b. ',
    '    `88 ',
    ' aaad8\' ',
    '    `88 ',
    '    .88 ',
    'd88888P ',
    '        ',
    '        ',
  ],
  '4' => [
    'dP   dP ',
    '88   88 ',
    '88aaa88 ',
    '     88 ',
    '     88 ',
    '     dP ',
    '        ',
    '        ',
  ],
  '5' => [
    '888888P ',
    '88\'     ',
    '88baaa. ',
    '    `88 ',
    '     88 ',
    'd88888P ',
    '        ',
    '        ',
  ],
  '6' => [
    '.d8888P ',
    '88\'     ',
    '88baaa. ',
    '88` `88 ',
    '8b. .d8 ',
    '`Y888P\' ',
    '        ',
    '        ',
  ],
  '7' => [
    'd88888P ',
    '    d8\' ',
    '   d8\'  ',
    '  d8\'   ',
    ' d8\'    ',
    'd8\'     ',
    '        ',
    '        ',
  ],
  '8' => [
    '.d888b. ',
    'Y8\' `8P ',
    'd8bad8b ',
    '88` `88 ',
    '8b. .88 ',
    'Y88888P ',
    '        ',
    '        ',
  ],
  '9' => [
    '.d888b. ',
    'Y8\' `88 ',
    '`8bad88 ',
    '    `88 ',
    'd.  .88 ',
    '`8888P  ',
    '        ',
    '        ',
  ],

  
);

1;
