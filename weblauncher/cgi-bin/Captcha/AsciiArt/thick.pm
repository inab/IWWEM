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
# Font definition based on figlet font "thick" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 5,
  'name' => 'thick',
  'comment' => 'Thick by Randall Ransom 2/94Figlet release 2.0 -- August 5, 1993Date: 5 Mar 1994Explanation of first line:flf2 - "magic number" for file identificationa    - should always be `a\', for now$    - the "hardblank" -- prints as a blank, but can\'t be smushed5    - height of a character4    - height of a character, not including descenders15   - max line length (excluding comment lines) + a fudge factor0    - default smushmode for this font (like "-m 0" on command line)14   - number of comment lines',
  'a' => [
    '     ',
    '.d88 ',
    '8  8 ',
    '`Y88 ',
    '     ',
  ],
  'b' => [
    '8    ',
    '88b. ',
    '8  8 ',
    '88P\' ',
    '     ',
  ],
  'c' => [
    '     ',
    '.d8b ',
    '8    ',
    '`Y8P ',
    '     ',
  ],
  'd' => [
    '   8 ',
    '.d88 ',
    '8  8 ',
    '`Y88 ',
    '     ',
  ],
  'e' => [
    '      ',
    '.d88b ',
    '8.dP\' ',
    '`Y88P ',
    '      ',
  ],
  'f' => [
    ' d8b ',
    ' 8\'  ',
    'w8ww ',
    ' 8   ',
    '     ',
  ],
  'g' => [
    '     ',
    '.d88 ',
    '8  8 ',
    '`Y88 ',
    'wwdP ',
  ],
  'h' => [
    '8     ',
    '8d8b. ',
    '8P Y8 ',
    '8   8 ',
    '      ',
  ],
  'i' => [
    'w ',
    'w ',
    '8 ',
    '8 ',
    '  ',
  ],
  'j' => [
    '  w ',
    '  w ',
    '  8 ',
    '  8 ',
    'wdP ',
  ],
  'k' => [
    '8    ',
    '8.dP ',
    '88b  ',
    '8 Yb ',
    '     ',
  ],
  'l' => [
    '8 ',
    '8 ',
    '8 ',
    '8 ',
    '  ',
  ],
  'm' => [
    '          ',
    '8d8b.d8b. ',
    '8P Y8P Y8 ',
    '8   8   8 ',
    '          ',
  ],
  'n' => [
    '      ',
    '8d8b. ',
    '8P Y8 ',
    '8   8 ',
    '      ',
  ],
  'o' => [
    '      ',
    '.d8b. ',
    '8\' .8 ',
    '`Y8P\' ',
    '      ',
  ],
  'p' => [
    '     ',
    '88b. ',
    '8  8 ',
    '88P\' ',
    '8    ',
  ],
  'q' => [
    '      ',
    '.d88  ',
    '8  8  ',
    '`Y88  ',
    '   8P ',
  ],
  'r' => [
    '     ',
    '8d8b ',
    '8P   ',
    '8    ',
    '     ',
  ],
  's' => [
    '     ',
    'd88b ',
    '`Yb. ',
    'Y88P ',
    '     ',
  ],
  't' => [
    ' w   ',
    'w8ww ',
    ' 8   ',
    ' Y8P ',
    '     ',
  ],
  'u' => [
    '      ',
    '8   8 ',
    '8b d8 ',
    '`Y8P8 ',
    '      ',
  ],
  'v' => [
    '       ',
    'Yb  dP ',
    ' YbdP  ',
    '  YP   ',
    '       ',
  ],
  'w' => [
    '           ',
    'Yb  db  dP ',
    ' YbdPYbdP  ',
    '  YP  YP   ',
    '           ',
  ],
  'x' => [
    '      ',
    'Yb dP ',
    ' `8.  ',
    'dP Yb ',
    '      ',
  ],
  'y' => [
    '       ',
    'Yb  dP ',
    ' YbdP  ',
    '  dP   ',
    ' dP    ',
  ],
  'z' => [
    '     ',
    '888P ',
    ' dP  ',
    'd888 ',
    '     ',
  ],
  'A' => [
    '   db    ',
    '  dPYb   ',
    ' dPwwYb  ',
    'dP    Yb ',
    '         ',
  ],
  'B' => [
    '888b. ',
    '8wwwP ',
    '8   b ',
    '888P\' ',
    '      ',
  ],
  'C' => [
    '.d88b ',
    '8P    ',
    '8b    ',
    '`Y88P ',
    '      ',
  ],
  'D' => [
    '888b. ',
    '8   8 ',
    '8   8 ',
    '888P\' ',
    '      ',
  ],
  'E' => [
    '8888 ',
    '8www ',
    '8    ',
    '8888 ',
    '     ',
  ],
  'F' => [
    '8888 ',
    '8www ',
    '8    ',
    '8    ',
    '     ',
  ],
  'G' => [
    '.d88b  ',
    '8P www ',
    '8b  d8 ',
    '`Y88P\' ',
    '       ',
  ],
  'H' => [
    '8   8 ',
    '8www8 ',
    '8   8 ',
    '8   8 ',
    '      ',
  ],
  'I' => [
    '888 ',
    ' 8  ',
    ' 8  ',
    '888 ',
    '    ',
  ],
  'J' => [
    ' 8888 ',
    '   8  ',
    'w  8  ',
    '`Yw"  ',
    '      ',
  ],
  'K' => [
    '8  dP ',
    '8wdP  ',
    '88Yb  ',
    '8  Yb ',
    '      ',
  ],
  'L' => [
    '8    ',
    '8    ',
    '8    ',
    '8888 ',
    '     ',
  ],
  'M' => [
    '8b   d8 ',
    '8YbmdP8 ',
    '8  "  8 ',
    '8     8 ',
    '        ',
  ],
  'N' => [
    '8b  8 ',
    '8Ybm8 ',
    '8  "8 ',
    '8   8 ',
    '      ',
  ],
  'O' => [
    '.d88b. ',
    '8P  Y8 ',
    '8b  d8 ',
    '`Y88P\' ',
    '       ',
  ],
  'P' => [
    '888b. ',
    '8  .8 ',
    '8wwP\' ',
    '8     ',
    '      ',
  ],
  'Q' => [
    '.d88b. ',
    '8P  Y8 ',
    '8b wd8 ',
    '`Y88Pw ',
    '       ',
  ],
  'R' => [
    '888b. ',
    '8  .8 ',
    '8wwK\' ',
    '8  Yb ',
    '      ',
  ],
  'S' => [
    '.d88b. ',
    'YPwww. ',
    '    d8 ',
    '`Y88P\' ',
    '       ',
  ],
  'T' => [
    '88888 ',
    '  8   ',
    '  8   ',
    '  8   ',
    '      ',
  ],
  'U' => [
    '8    8 ',
    '8    8 ',
    '8b..d8 ',
    '`Y88P\' ',
    '       ',
  ],
  'V' => [
    'Yb    dP ',
    ' Yb  dP  ',
    '  YbdP   ',
    '   YP    ',
    '         ',
  ],
  'W' => [
    'Yb        dP ',
    ' Yb  db  dP  ',
    '  YbdPYbdP   ',
    '   YP  YP    ',
    '             ',
  ],
  'X' => [
    'Yb  dP ',
    ' YbdP  ',
    ' dPYb  ',
    'dP  Yb ',
    '       ',
  ],
  'Y' => [
    'Yb  dP ',
    ' YbdP  ',
    '  YP   ',
    '  88   ',
    '       ',
  ],
  'Z' => [
    '8888P ',
    '  dP  ',
    ' dP   ',
    'd8888 ',
    '      ',
  ],
  '0' => [
    '.d88b. ',
    '8P  Y8 ',
    '8b  d8 ',
    '`Y88P\' ',
    '       ',
  ],
  '1' => [
    'd8 ',
    ' 8 ',
    ' 8 ',
    ' 8 ',
    '   ',
  ],
  '2' => [
    'd88b ',
    '" dP ',
    ' dP  ',
    'd888 ',
    '     ',
  ],
  '3' => [
    'd88b ',
    ' wwP ',
    '   8 ',
    'Y88P ',
    '     ',
  ],
  '4' => [
    '  d8 ',
    ' dP8 ',
    'dPw8 ',
    '   8 ',
    '     ',
  ],
  '5' => [
    '8888 ',
    '8ww. ',
    '  `8 ',
    'Y88P ',
    '     ',
  ],
  '6' => [
    ' d88b  ',
    '8Pwww. ',
    '8b  d8 ',
    '`Y88P\' ',
    '       ',
  ],
  '7' => [
    '8888P ',
    '  dP  ',
    ' dP   ',
    'dP    ',
    '      ',
  ],
  '8' => [
    '.dPYb. ',
    'YbwwdP ',
    'dP""Yb ',
    '`YbdP\' ',
    '       ',
  ],
  '9' => [
    '.d88b ',
    '8   8 ',
    '`8w88 ',
    '    8 ',
    '      ',
  ],

  
);

1;
