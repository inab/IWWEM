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
# Font definition based on figlet font "slant" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 6,
  'name' => 'slant',
  'comment' => 'Slant by Glenn Chappell 3/93 -- based on StandardIncludes ISO Latin-1figlet release 2.1 -- 12 Aug 1994Permission is hereby given to modify this font, as long as themodifier\'s name is placed on a comment line.Modified by Paul Burton <solution@earthlink.net> 12/96 to include new parametersupported by FIGlet and FIGWin.  May also be slightly modified for better useof new full-width/kern/smush alternatives, but default output is NOT changed.',
  'a' => [
    '        ',
    '  ____ _',
    ' / __ `/',
    '/ /_/ / ',
    '\\__,_/  ',
    '        ',
  ],
  'b' => [
    '    __  ',
    '   / /_ ',
    '  / __ \\',
    ' / /_/ /',
    '/_.___/ ',
    '        ',
  ],
  'c' => [
    '       ',
    '  _____',
    ' / ___/',
    '/ /__  ',
    '\\___/  ',
    '       ',
  ],
  'd' => [
    '       __',
    '  ____/ /',
    ' / __  / ',
    '/ /_/ /  ',
    '\\__,_/   ',
    '         ',
  ],
  'e' => [
    '      ',
    '  ___ ',
    ' / _ \\',
    '/  __/',
    '\\___/ ',
    '      ',
  ],
  'f' => [
    '    ____',
    '   / __/',
    '  / /_  ',
    ' / __/  ',
    '/_/     ',
    '        ',
  ],
  'g' => [
    '         ',
    '   ____ _',
    '  / __ `/',
    ' / /_/ / ',
    ' \\__, /  ',
    '/____/   ',
  ],
  'h' => [
    '    __  ',
    '   / /_ ',
    '  / __ \\',
    ' / / / /',
    '/_/ /_/ ',
    '        ',
  ],
  'i' => [
    '    _ ',
    '   (_)',
    '  / / ',
    ' / /  ',
    '/_/   ',
    '      ',
  ],
  'j' => [
    '       _ ',
    '      (_)',
    '     / / ',
    '    / /  ',
    ' __/ /   ',
    '/___/    ',
  ],
  'k' => [
    '    __  ',
    '   / /__',
    '  / //_/',
    ' / ,<   ',
    '/_/|_|  ',
    '        ',
  ],
  'l' => [
    '    __',
    '   / /',
    '  / / ',
    ' / /  ',
    '/_/   ',
    '      ',
  ],
  'm' => [
    '            ',
    '   ____ ___ ',
    '  / __ `__ \\',
    ' / / / / / /',
    '/_/ /_/ /_/ ',
    '            ',
  ],
  'n' => [
    '        ',
    '   ____ ',
    '  / __ \\',
    ' / / / /',
    '/_/ /_/ ',
    '        ',
  ],
  'o' => [
    '       ',
    '  ____ ',
    ' / __ \\',
    '/ /_/ /',
    '\\____/ ',
    '       ',
  ],
  'p' => [
    '         ',
    '    ____ ',
    '   / __ \\',
    '  / /_/ /',
    ' / .___/ ',
    '/_/      ',
  ],
  'q' => [
    '        ',
    '  ____ _',
    ' / __ `/',
    '/ /_/ / ',
    '\\__, /  ',
    '  /_/   ',
  ],
  'r' => [
    '        ',
    '   _____',
    '  / ___/',
    ' / /    ',
    '/_/     ',
    '        ',
  ],
  's' => [
    '        ',
    '   _____',
    '  / ___/',
    ' (__  ) ',
    '/____/  ',
    '        ',
  ],
  't' => [
    '   __ ',
    '  / /_',
    ' / __/',
    '/ /_  ',
    '\\__/  ',
    '      ',
  ],
  'u' => [
    '        ',
    '  __  __',
    ' / / / /',
    '/ /_/ / ',
    '\\__,_/  ',
    '        ',
  ],
  'v' => [
    '       ',
    ' _   __',
    '| | / /',
    '| |/ / ',
    '|___/  ',
    '       ',
  ],
  'w' => [
    '          ',
    ' _      __',
    '| | /| / /',
    '| |/ |/ / ',
    '|__/|__/  ',
    '          ',
  ],
  'x' => [
    '        ',
    '   _  __',
    '  | |/_/',
    ' _>  <  ',
    '/_/|_|  ',
    '        ',
  ],
  'y' => [
    '         ',
    '   __  __',
    '  / / / /',
    ' / /_/ / ',
    ' \\__, /  ',
    '/____/   ',
  ],
  'z' => [
    '     ',
    ' ____',
    '/_  /',
    ' / /_',
    '/___/',
    '     ',
  ],
  'A' => [
    '    ___ ',
    '   /   |',
    '  / /| |',
    ' / ___ |',
    '/_/  |_|',
    '        ',
  ],
  'B' => [
    '    ____ ',
    '   / __ )',
    '  / __  |',
    ' / /_/ / ',
    '/_____/  ',
    '         ',
  ],
  'C' => [
    '   ______',
    '  / ____/',
    ' / /     ',
    '/ /___   ',
    '\\____/   ',
    '         ',
  ],
  'D' => [
    '    ____ ',
    '   / __ \\',
    '  / / / /',
    ' / /_/ / ',
    '/_____/  ',
    '         ',
  ],
  'E' => [
    '    ______',
    '   / ____/',
    '  / __/   ',
    ' / /___   ',
    '/_____/   ',
    '          ',
  ],
  'F' => [
    '    ______',
    '   / ____/',
    '  / /_    ',
    ' / __/    ',
    '/_/       ',
    '          ',
  ],
  'G' => [
    '   ______',
    '  / ____/',
    ' / / __  ',
    '/ /_/ /  ',
    '\\____/   ',
    '         ',
  ],
  'H' => [
    '    __  __',
    '   / / / /',
    '  / /_/ / ',
    ' / __  /  ',
    '/_/ /_/   ',
    '          ',
  ],
  'I' => [
    '    ____',
    '   /  _/',
    '   / /  ',
    ' _/ /   ',
    '/___/   ',
    '        ',
  ],
  'J' => [
    '       __',
    '      / /',
    ' __  / / ',
    '/ /_/ /  ',
    '\\____/   ',
    '         ',
  ],
  'K' => [
    '    __ __',
    '   / //_/',
    '  / ,<   ',
    ' / /| |  ',
    '/_/ |_|  ',
    '         ',
  ],
  'L' => [
    '    __ ',
    '   / / ',
    '  / /  ',
    ' / /___',
    '/_____/',
    '       ',
  ],
  'M' => [
    '    __  ___',
    '   /  |/  /',
    '  / /|_/ / ',
    ' / /  / /  ',
    '/_/  /_/   ',
    '           ',
  ],
  'N' => [
    '    _   __',
    '   / | / /',
    '  /  |/ / ',
    ' / /|  /  ',
    '/_/ |_/   ',
    '          ',
  ],
  'O' => [
    '   ____ ',
    '  / __ \\',
    ' / / / /',
    '/ /_/ / ',
    '\\____/  ',
    '        ',
  ],
  'P' => [
    '    ____ ',
    '   / __ \\',
    '  / /_/ /',
    ' / ____/ ',
    '/_/      ',
    '         ',
  ],
  'Q' => [
    '   ____ ',
    '  / __ \\',
    ' / / / /',
    '/ /_/ / ',
    '\\___\\_\\ ',
    '        ',
  ],
  'R' => [
    '    ____ ',
    '   / __ \\',
    '  / /_/ /',
    ' / _, _/ ',
    '/_/ |_|  ',
    '         ',
  ],
  'S' => [
    '   _____',
    '  / ___/',
    '  \\__ \\ ',
    ' ___/ / ',
    '/____/  ',
    '        ',
  ],
  'T' => [
    '  ______',
    ' /_  __/',
    '  / /   ',
    ' / /    ',
    '/_/     ',
    '        ',
  ],
  'U' => [
    '   __  __',
    '  / / / /',
    ' / / / / ',
    '/ /_/ /  ',
    '\\____/   ',
    '         ',
  ],
  'V' => [
    ' _    __',
    '| |  / /',
    '| | / / ',
    '| |/ /  ',
    '|___/   ',
    '        ',
  ],
  'W' => [
    ' _       __',
    '| |     / /',
    '| | /| / / ',
    '| |/ |/ /  ',
    '|__/|__/   ',
    '           ',
  ],
  'X' => [
    '   _  __',
    '  | |/ /',
    '  |   / ',
    ' /   |  ',
    '/_/|_|  ',
    '        ',
  ],
  'Y' => [
    '__  __',
    '\\ \\/ /',
    ' \\  / ',
    ' / /  ',
    '/_/   ',
    '      ',
  ],
  'Z' => [
    ' _____',
    '/__  /',
    '  / / ',
    ' / /__',
    '/____/',
    '      ',
  ],
  '0' => [
    '   ____ ',
    '  / __ \\',
    ' / / / /',
    '/ /_/ / ',
    '\\____/  ',
    '        ',
  ],
  '1' => [
    '   ___',
    '  <  /',
    '  / / ',
    ' / /  ',
    '/_/   ',
    '      ',
  ],
  '2' => [
    '   ___ ',
    '  |__ \\',
    '  __/ /',
    ' / __/ ',
    '/____/ ',
    '       ',
  ],
  '3' => [
    '   _____',
    '  |__  /',
    '   /_ < ',
    ' ___/ / ',
    '/____/  ',
    '        ',
  ],
  '4' => [
    '   __ __',
    '  / // /',
    ' / // /_',
    '/__  __/',
    '  /_/   ',
    '        ',
  ],
  '5' => [
    '    ______',
    '   / ____/',
    '  /___ \\  ',
    ' ____/ /  ',
    '/_____/   ',
    '          ',
  ],
  '6' => [
    '   _____',
    '  / ___/',
    ' / __ \\ ',
    '/ /_/ / ',
    '\\____/  ',
    '        ',
  ],
  '7' => [
    ' _____',
    '/__  /',
    '  / / ',
    ' / /  ',
    '/_/   ',
    '      ',
  ],
  '8' => [
    '   ____ ',
    '  ( __ )',
    ' / __  |',
    '/ /_/ / ',
    '\\____/  ',
    '        ',
  ],
  '9' => [
    '   ____ ',
    '  / __ \\',
    ' / /_/ /',
    ' \\__, / ',
    '/____/  ',
    '        ',
  ],

  
);

1;
