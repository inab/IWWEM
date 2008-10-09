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
# Font definition based on figlet font "small" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 5,
  'name' => 'small',
  'comment' => 'Small by Glenn Chappell 4/93 -- based on StandardIncludes ISO Latin-1figlet release 2.1 -- 12 Aug 1994Permission is hereby given to modify this font, as long as themodifier\'s name is placed on a comment line.Modified by Paul Burton <solution@earthlink.net> 12/96 to include new parametersupported by FIGlet and FIGWin.  May also be slightly modified for better useof new full-width/kern/smush alternatives, but default output is NOT changed.',
  'a' => [
    '      ',
    ' __ _ ',
    '/ _` |',
    '\\__,_|',
    '      ',
  ],
  'b' => [
    ' _    ',
    '| |__ ',
    '| \'_ \\',
    '|_.__/',
    '      ',
  ],
  'c' => [
    '    ',
    ' __ ',
    '/ _|',
    '\\__|',
    '    ',
  ],
  'd' => [
    '    _ ',
    ' __| |',
    '/ _` |',
    '\\__,_|',
    '      ',
  ],
  'e' => [
    '     ',
    ' ___ ',
    '/ -_)',
    '\\___|',
    '     ',
  ],
  'f' => [
    '  __ ',
    ' / _|',
    '|  _|',
    '|_|  ',
    '     ',
  ],
  'g' => [
    '      ',
    ' __ _ ',
    '/ _` |',
    '\\__, |',
    '|___/ ',
  ],
  'h' => [
    ' _    ',
    '| |_  ',
    '| \' \\ ',
    '|_||_|',
    '      ',
  ],
  'i' => [
    ' _ ',
    '(_)',
    '| |',
    '|_|',
    '   ',
  ],
  'j' => [
    '   _ ',
    '  (_)',
    '  | |',
    ' _/ |',
    '|__/ ',
  ],
  'k' => [
    ' _   ',
    '| |__',
    '| / /',
    '|_\\_\\',
    '     ',
  ],
  'l' => [
    ' _ ',
    '| |',
    '| |',
    '|_|',
    '   ',
  ],
  'm' => [
    '       ',
    ' _ __  ',
    '| \'  \\ ',
    '|_|_|_|',
    '       ',
  ],
  'n' => [
    '      ',
    ' _ _  ',
    '| \' \\ ',
    '|_||_|',
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
    '      ',
    ' _ __ ',
    '| \'_ \\',
    '| .__/',
    '|_|   ',
  ],
  'q' => [
    '      ',
    ' __ _ ',
    '/ _` |',
    '\\__, |',
    '   |_|',
  ],
  'r' => [
    '     ',
    ' _ _ ',
    '| \'_|',
    '|_|  ',
    '     ',
  ],
  's' => [
    '    ',
    ' ___',
    '(_-<',
    '/__/',
    '    ',
  ],
  't' => [
    ' _   ',
    '| |_ ',
    '|  _|',
    ' \\__|',
    '     ',
  ],
  'u' => [
    '      ',
    ' _  _ ',
    '| || |',
    ' \\_,_|',
    '      ',
  ],
  'v' => [
    '     ',
    '__ __',
    '\\ V /',
    ' \\_/ ',
    '     ',
  ],
  'w' => [
    '        ',
    '__ __ __',
    '\\ V  V /',
    ' \\_/\\_/ ',
    '        ',
  ],
  'x' => [
    '     ',
    '__ __',
    '\\ \\ /',
    '/_\\_\\',
    '     ',
  ],
  'y' => [
    '      ',
    ' _  _ ',
    '| || |',
    ' \\_, |',
    ' |__/ ',
  ],
  'z' => [
    '    ',
    ' ___',
    '|_ /',
    '/__|',
    '    ',
  ],
  'A' => [
    '   _   ',
    '  /_\\  ',
    ' / _ \\ ',
    '/_/ \\_\\',
    '       ',
  ],
  'B' => [
    ' ___ ',
    '| _ )',
    '| _ \\',
    '|___/',
    '     ',
  ],
  'C' => [
    '  ___ ',
    ' / __|',
    '| (__ ',
    ' \\___|',
    '      ',
  ],
  'D' => [
    ' ___  ',
    '|   \\ ',
    '| |) |',
    '|___/ ',
    '      ',
  ],
  'E' => [
    ' ___ ',
    '| __|',
    '| _| ',
    '|___|',
    '     ',
  ],
  'F' => [
    ' ___ ',
    '| __|',
    '| _| ',
    '|_|  ',
    '     ',
  ],
  'G' => [
    '  ___ ',
    ' / __|',
    '| (_ |',
    ' \\___|',
    '      ',
  ],
  'H' => [
    ' _  _ ',
    '| || |',
    '| __ |',
    '|_||_|',
    '      ',
  ],
  'I' => [
    ' ___ ',
    '|_ _|',
    ' | | ',
    '|___|',
    '     ',
  ],
  'J' => [
    '    _ ',
    ' _ | |',
    '| || |',
    ' \\__/ ',
    '      ',
  ],
  'K' => [
    ' _  __',
    '| |/ /',
    '| \' < ',
    '|_|\\_\\',
    '      ',
  ],
  'L' => [
    ' _    ',
    '| |   ',
    '| |__ ',
    '|____|',
    '      ',
  ],
  'M' => [
    ' __  __ ',
    '|  \\/  |',
    '| |\\/| |',
    '|_|  |_|',
    '        ',
  ],
  'N' => [
    ' _  _ ',
    '| \\| |',
    '| .` |',
    '|_|\\_|',
    '      ',
  ],
  'O' => [
    '  ___  ',
    ' / _ \\ ',
    '| (_) |',
    ' \\___/ ',
    '       ',
  ],
  'P' => [
    ' ___ ',
    '| _ \\',
    '|  _/',
    '|_|  ',
    '     ',
  ],
  'Q' => [
    '  ___  ',
    ' / _ \\ ',
    '| (_) |',
    ' \\__\\_\\',
    '       ',
  ],
  'R' => [
    ' ___ ',
    '| _ \\',
    '|   /',
    '|_|_\\',
    '     ',
  ],
  'S' => [
    ' ___ ',
    '/ __|',
    '\\__ \\',
    '|___/',
    '     ',
  ],
  'T' => [
    ' _____ ',
    '|_   _|',
    '  | |  ',
    '  |_|  ',
    '       ',
  ],
  'U' => [
    ' _   _ ',
    '| | | |',
    '| |_| |',
    ' \\___/ ',
    '       ',
  ],
  'V' => [
    '__   __',
    '\\ \\ / /',
    ' \\ V / ',
    '  \\_/  ',
    '       ',
  ],
  'W' => [
    '__      __',
    '\\ \\    / /',
    ' \\ \\/\\/ / ',
    '  \\_/\\_/  ',
    '          ',
  ],
  'X' => [
    '__  __',
    '\\ \\/ /',
    ' >  < ',
    '/_/\\_\\',
    '      ',
  ],
  'Y' => [
    '__   __',
    '\\ \\ / /',
    ' \\ V / ',
    '  |_|  ',
    '       ',
  ],
  'Z' => [
    ' ____',
    '|_  /',
    ' / / ',
    '/___|',
    '     ',
  ],
  '0' => [
    '  __  ',
    ' /  \\ ',
    '| () |',
    ' \\__/ ',
    '      ',
  ],
  '1' => [
    ' _ ',
    '/ |',
    '| |',
    '|_|',
    '   ',
  ],
  '2' => [
    ' ___ ',
    '|_  )',
    ' / / ',
    '/___|',
    '     ',
  ],
  '3' => [
    ' ____',
    '|__ /',
    ' |_ \\',
    '|___/',
    '     ',
  ],
  '4' => [
    ' _ _  ',
    '| | | ',
    '|_  _|',
    '  |_| ',
    '      ',
  ],
  '5' => [
    ' ___ ',
    '| __|',
    '|__ \\',
    '|___/',
    '     ',
  ],
  '6' => [
    '  __ ',
    ' / / ',
    '/ _ \\',
    '\\___/',
    '     ',
  ],
  '7' => [
    ' ____ ',
    '|__  |',
    '  / / ',
    ' /_/  ',
    '      ',
  ],
  '8' => [
    ' ___ ',
    '( _ )',
    '/ _ \\',
    '\\___/',
    '     ',
  ],
  '9' => [
    ' ___ ',
    '/ _ \\',
    '\\_, /',
    ' /_/ ',
    '     ',
  ],

  
);

1;
