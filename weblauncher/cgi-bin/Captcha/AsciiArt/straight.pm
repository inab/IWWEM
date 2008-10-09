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
# Font definition based on figlet font "straight" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 4,
  'name' => 'straight',
  'comment' => 'straight.flf\t\tVersion 2by:  Bas Meijer   meijer@info.win.tue.nl   bas@damek.kth.sefixed by: Ryan Youck  youck@cs.uregina.caDisclaimer: most capitals have been designed by someone else',
  'a' => [
    '    ',
    ' _  ',
    '(_| ',
    '    ',
  ],
  'b' => [
    '    ',
    '|_  ',
    '|_) ',
    '    ',
  ],
  'c' => [
    '   ',
    ' _ ',
    '(_ ',
    '   ',
  ],
  'd' => [
    '    ',
    ' _| ',
    '(_| ',
    '    ',
  ],
  'e' => [
    '   ',
    ' _ ',
    '(- ',
    '   ',
  ],
  'f' => [
    ' _ ',
    '(_ ',
    '|  ',
    '   ',
  ],
  'g' => [
    '    ',
    ' _  ',
    '(_) ',
    '_/  ',
  ],
  'h' => [
    '    ',
    '|_  ',
    '| ) ',
    '    ',
  ],
  'i' => [
    '  ',
    '. ',
    '| ',
    '  ',
  ],
  'j' => [
    '  ',
    '. ',
    '| ',
    '/ ',
  ],
  'k' => [
    '   ',
    '|  ',
    '|( ',
    '   ',
  ],
  'l' => [
    '  ',
    '| ',
    '| ',
    '  ',
  ],
  'm' => [
    '    ',
    ' _  ',
    '||| ',
    '    ',
  ],
  'n' => [
    '    ',
    ' _  ',
    '| ) ',
    '    ',
  ],
  'o' => [
    '    ',
    ' _  ',
    '(_) ',
    '    ',
  ],
  'p' => [
    '    ',
    ' _  ',
    '|_) ',
    '|   ',
  ],
  'q' => [
    '    ',
    ' _  ',
    '(_| ',
    '  | ',
  ],
  'r' => [
    '   ',
    ' _ ',
    '|  ',
    '   ',
  ],
  's' => [
    '   ',
    ' _ ',
    '_) ',
    '   ',
  ],
  't' => [
    '   ',
    '|_ ',
    '|_ ',
    '   ',
  ],
  'u' => [
    '    ',
    '    ',
    '|_| ',
    '    ',
  ],
  'v' => [
    '   ',
    '   ',
    '\\/ ',
    '   ',
  ],
  'w' => [
    '    ',
    '    ',
    '\\)/ ',
    '    ',
  ],
  'x' => [
    '   ',
    '   ',
    ')( ',
    '   ',
  ],
  'y' => [
    '   ',
    '   ',
    '\\/ ',
    '/  ',
  ],
  'z' => [
    '   ',
    '_  ',
    '/_ ',
    '   ',
  ],
  'A' => [
    '     ',
    ' /\\  ',
    '/--\\ ',
    '     ',
  ],
  'B' => [
    ' __  ',
    '|__) ',
    '|__) ',
    '     ',
  ],
  'C' => [
    ' __ ',
    '/   ',
    '\\__ ',
    '    ',
  ],
  'D' => [
    ' __  ',
    '|  \\ ',
    '|__/ ',
    '     ',
  ],
  'E' => [
    ' __ ',
    '|_  ',
    '|__ ',
    '    ',
  ],
  'F' => [
    ' __ ',
    '|_  ',
    '|   ',
    '    ',
  ],
  'G' => [
    ' __  ',
    '/ _  ',
    '\\__) ',
    '     ',
  ],
  'H' => [
    '     ',
    '|__| ',
    '|  | ',
    '     ',
  ],
  'I' => [
    '  ',
    '| ',
    '| ',
    '  ',
  ],
  'J' => [
    '    ',
    '  | ',
    '__) ',
    '    ',
  ],
  'K' => [
    '    ',
    '|_/ ',
    '| \\ ',
    '    ',
  ],
  'L' => [
    '    ',
    '|   ',
    '|__ ',
    '    ',
  ],
  'M' => [
    '     ',
    '|\\/| ',
    '|  | ',
    '     ',
  ],
  'N' => [
    '     ',
    '|\\ | ',
    '| \\| ',
    '     ',
  ],
  'O' => [
    ' __  ',
    '/  \\ ',
    '\\__/ ',
    '     ',
  ],
  'P' => [
    ' __  ',
    '|__) ',
    '|    ',
    '     ',
  ],
  'Q' => [
    ' __  ',
    '/  \\ ',
    '\\_\\/ ',
    '     ',
  ],
  'R' => [
    ' __  ',
    '|__) ',
    '| \\  ',
    '     ',
  ],
  'S' => [
    ' __ ',
    '(_  ',
    '__) ',
    '    ',
  ],
  'T' => [
    '___ ',
    ' |  ',
    ' |  ',
    '    ',
  ],
  'U' => [
    '     ',
    '/  \\ ',
    '\\__/ ',
    '     ',
  ],
  'V' => [
    '     ',
    '\\  / ',
    ' \\/  ',
    '     ',
  ],
  'W' => [
    '     ',
    '|  | ',
    '|/\\| ',
    '     ',
  ],
  'X' => [
    '    ',
    '\\_/ ',
    '/ \\ ',
    '    ',
  ],
  'Y' => [
    '    ',
    '\\_/ ',
    ' |  ',
    '    ',
  ],
  'Z' => [
    '___ ',
    ' _/ ',
    '/__ ',
    '    ',
  ],
  '0' => [
    '  __  ',
    ' /  \\ ',
    ' \\__/ ',
    '      ',
  ],
  '1' => [
    '    ',
    ' /| ',
    '  | ',
    '    ',
  ],
  '2' => [
    ' __  ',
    '  _) ',
    ' /__ ',
    '     ',
  ],
  '3' => [
    ' __  ',
    '  _) ',
    ' __) ',
    '     ',
  ],
  '4' => [
    '      ',
    ' |__| ',
    '    | ',
    '      ',
  ],
  '5' => [
    '  __ ',
    ' |_  ',
    ' __) ',
    '     ',
  ],
  '6' => [
    '  __  ',
    ' /__  ',
    ' \\__) ',
    '      ',
  ],
  '7' => [
    ' ___ ',
    '   / ',
    '  /  ',
    '     ',
  ],
  '8' => [
    '  __  ',
    ' (__) ',
    ' (__) ',
    '      ',
  ],
  '9' => [
    '  __  ',
    ' (__\\ ',
    '  __/ ',
    '      ',
  ],

  
);

1;
