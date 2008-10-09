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
# Font definition based on figlet font "smslant" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 5,
  'name' => 'smslant',
  'comment' => 'SmSlant by Glenn Chappell 6/93 - based on Small & SlantIncludes ISO Latin-1figlet release 2.1 -- 12 Aug 1994Permission is hereby given to modify this font, as long as themodifier\'s name is placed on a comment line.Modified by Paul Burton <solution@earthlink.net> 12/96 to include new parametersupported by FIGlet and FIGWin.  May also be slightly modified for better useof new full-width/kern/smush alternatives, but default output is NOT changed.',
  'a' => [
    '      ',
    ' ___ _',
    '/ _ `/',
    '\\_,_/ ',
    '      ',
  ],
  'b' => [
    '   __ ',
    '  / / ',
    ' / _ \\',
    '/_.__/',
    '      ',
  ],
  'c' => [
    '     ',
    ' ____',
    '/ __/',
    '\\__/ ',
    '     ',
  ],
  'd' => [
    '     __',
    ' ___/ /',
    '/ _  / ',
    '\\_,_/  ',
    '       ',
  ],
  'e' => [
    '     ',
    ' ___ ',
    '/ -_)',
    '\\__/ ',
    '     ',
  ],
  'f' => [
    '   ___',
    '  / _/',
    ' / _/ ',
    '/_/   ',
    '      ',
  ],
  'g' => [
    '       ',
    '  ___ _',
    ' / _ `/',
    ' \\_, / ',
    '/___/  ',
  ],
  'h' => [
    '   __ ',
    '  / / ',
    ' / _ \\',
    '/_//_/',
    '      ',
  ],
  'i' => [
    '   _ ',
    '  (_)',
    ' / / ',
    '/_/  ',
    '     ',
  ],
  'j' => [
    '      _ ',
    '     (_)',
    '    / / ',
    ' __/ /  ',
    '|___/   ',
  ],
  'k' => [
    '   __  ',
    '  / /__',
    ' /  \'_/',
    '/_/\\_\\ ',
    '       ',
  ],
  'l' => [
    '   __',
    '  / /',
    ' / / ',
    '/_/  ',
    '     ',
  ],
  'm' => [
    '       ',
    '  __ _ ',
    ' /  \' \\',
    '/_/_/_/',
    '       ',
  ],
  'n' => [
    '      ',
    '  ___ ',
    ' / _ \\',
    '/_//_/',
    '      ',
  ],
  'o' => [
    '     ',
    ' ___ ',
    '/ _ \\',
    '\\___/',
    '     ',
  ],
  'p' => [
    '       ',
    '   ___ ',
    '  / _ \\',
    ' / .__/',
    '/_/    ',
  ],
  'q' => [
    '      ',
    ' ___ _',
    '/ _ `/',
    '\\_, / ',
    ' /_/  ',
  ],
  'r' => [
    '      ',
    '  ____',
    ' / __/',
    '/_/   ',
    '      ',
  ],
  's' => [
    '     ',
    '  ___',
    ' (_-<',
    '/___/',
    '     ',
  ],
  't' => [
    '  __ ',
    ' / /_',
    '/ __/',
    '\\__/ ',
    '     ',
  ],
  'u' => [
    '      ',
    ' __ __',
    '/ // /',
    '\\_,_/ ',
    '      ',
  ],
  'v' => [
    '      ',
    ' _  __',
    '| |/ /',
    '|___/ ',
    '      ',
  ],
  'w' => [
    '        ',
    ' _    __',
    '| |/|/ /',
    '|__,__/ ',
    '        ',
  ],
  'x' => [
    '      ',
    ' __ __',
    ' \\ \\ /',
    '/_\\_\\ ',
    '      ',
  ],
  'y' => [
    '       ',
    '  __ __',
    ' / // /',
    ' \\_, / ',
    '/___/  ',
  ],
  'z' => [
    '    ',
    ' ___',
    '/_ /',
    '/__/',
    '    ',
  ],
  'A' => [
    '   ___ ',
    '  / _ |',
    ' / __ |',
    '/_/ |_|',
    '       ',
  ],
  'B' => [
    '   ___ ',
    '  / _ )',
    ' / _  |',
    '/____/ ',
    '       ',
  ],
  'C' => [
    '  _____',
    ' / ___/',
    '/ /__  ',
    '\\___/  ',
    '       ',
  ],
  'D' => [
    '   ___ ',
    '  / _ \\',
    ' / // /',
    '/____/ ',
    '       ',
  ],
  'E' => [
    '   ____',
    '  / __/',
    ' / _/  ',
    '/___/  ',
    '       ',
  ],
  'F' => [
    '   ____',
    '  / __/',
    ' / _/  ',
    '/_/    ',
    '       ',
  ],
  'G' => [
    '  _____',
    ' / ___/',
    '/ (_ / ',
    '\\___/  ',
    '       ',
  ],
  'H' => [
    '   __ __',
    '  / // /',
    ' / _  / ',
    '/_//_/  ',
    '        ',
  ],
  'I' => [
    '   ____',
    '  /  _/',
    ' _/ /  ',
    '/___/  ',
    '       ',
  ],
  'J' => [
    '     __',
    ' __ / /',
    '/ // / ',
    '\\___/  ',
    '       ',
  ],
  'K' => [
    '   __ __',
    '  / //_/',
    ' / ,<   ',
    '/_/|_|  ',
    '        ',
  ],
  'L' => [
    '   __ ',
    '  / / ',
    ' / /__',
    '/____/',
    '      ',
  ],
  'M' => [
    '   __  ___',
    '  /  |/  /',
    ' / /|_/ / ',
    '/_/  /_/  ',
    '          ',
  ],
  'N' => [
    '   _  __',
    '  / |/ /',
    ' /    / ',
    '/_/|_/  ',
    '        ',
  ],
  'O' => [
    '  ____ ',
    ' / __ \\',
    '/ /_/ /',
    '\\____/ ',
    '       ',
  ],
  'P' => [
    '   ___ ',
    '  / _ \\',
    ' / ___/',
    '/_/    ',
    '       ',
  ],
  'Q' => [
    '  ____ ',
    ' / __ \\',
    '/ /_/ /',
    '\\___\\_\\',
    '       ',
  ],
  'R' => [
    '   ___ ',
    '  / _ \\',
    ' / , _/',
    '/_/|_| ',
    '       ',
  ],
  'S' => [
    '   ____',
    '  / __/',
    ' _\\ \\  ',
    '/___/  ',
    '       ',
  ],
  'T' => [
    ' ______',
    '/_  __/',
    ' / /   ',
    '/_/    ',
    '       ',
  ],
  'U' => [
    '  __  __',
    ' / / / /',
    '/ /_/ / ',
    '\\____/  ',
    '        ',
  ],
  'V' => [
    ' _   __',
    '| | / /',
    '| |/ / ',
    '|___/  ',
    '       ',
  ],
  'W' => [
    ' _      __',
    '| | /| / /',
    '| |/ |/ / ',
    '|__/|__/  ',
    '          ',
  ],
  'X' => [
    '   _  __',
    '  | |/_/',
    ' _>  <  ',
    '/_/|_|  ',
    '        ',
  ],
  'Y' => [
    '__  __',
    '\\ \\/ /',
    ' \\  / ',
    ' /_/  ',
    '      ',
  ],
  'Z' => [
    ' ____',
    '/_  /',
    ' / /_',
    '/___/',
    '     ',
  ],
  '0' => [
    '  ___ ',
    ' / _ \\',
    '/ // /',
    '\\___/ ',
    '      ',
  ],
  '1' => [
    '  ___',
    ' <  /',
    ' / / ',
    '/_/  ',
    '     ',
  ],
  '2' => [
    '   ___ ',
    '  |_  |',
    ' / __/ ',
    '/____/ ',
    '       ',
  ],
  '3' => [
    '   ____',
    '  |_  /',
    ' _/_ < ',
    '/____/ ',
    '       ',
  ],
  '4' => [
    '  ____',
    ' / / /',
    '/_  _/',
    ' /_/  ',
    '      ',
  ],
  '5' => [
    '   ____',
    '  / __/',
    ' /__ \\ ',
    '/____/ ',
    '       ',
  ],
  '6' => [
    '  ____',
    ' / __/',
    '/ _ \\ ',
    '\\___/ ',
    '      ',
  ],
  '7' => [
    ' ____',
    '/_  /',
    ' / / ',
    '/_/  ',
    '     ',
  ],
  '8' => [
    '  ___ ',
    ' ( _ )',
    '/ _  |',
    '\\___/ ',
    '      ',
  ],
  '9' => [
    '  ___ ',
    ' / _ \\',
    ' \\_, /',
    '/___/ ',
    '      ',
  ],

  
);

1;
