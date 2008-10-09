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
# Font definition based on figlet font "pebbles" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 10,
  'name' => 'pebbles',
  'comment' => 'Pebbles, figletized by Empath <hades@u.washington.edu> 7/94completed by Ryan Youck (youck@cs.uregina.ca) 8/94~From: flee@cse.psu.edu (Felix Lee)Here\'s an ascii font I\'ve been working on.  I started with the idea ofusing bubbles (. o O) to build a font, using the motif .oOo. toexpress a curve.  When I sketched out the lowercase letters, it endedup looking more like pebbles than bubbles, so I renamed it.',
  'a' => [
    '       ',
    '       ',
    '       ',
    '       ',
    '.oOoO\' ',
    'O   o  ',
    'o   O  ',
    '`OoO\'o ',
    '       ',
    '       ',
  ],
  'b' => [
    ' o    ',
    'O     ',
    'O     ',
    'o     ',
    'OoOo. ',
    'O   o ',
    'o   O ',
    '`OoO\' ',
    '      ',
    '      ',
  ],
  'c' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOo  ',
    'O     ',
    'o     ',
    '`OoO\' ',
    '      ',
    '      ',
  ],
  'd' => [
    '     o ',
    '    O  ',
    '    o  ',
    '    o  ',
    '.oOoO  ',
    'o   O  ',
    'O   o  ',
    '`OoO\'o ',
    '       ',
    '       ',
  ],
  'e' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOo. ',
    'OooO\' ',
    'O     ',
    '`OoO\' ',
    '      ',
    '      ',
  ],
  'f' => [
    '.oOo ',
    'O    ',
    'o    ',
    'OoO  ',
    'o    ',
    'O    ',
    'o    ',
    'O\'   ',
    '     ',
    '     ',
  ],
  'g' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOoO ',
    'o   O ',
    'O   o ',
    '`OoOo ',
    '    O ',
    ' OoO\' ',
  ],
  'h' => [
    ' o    ',
    'O     ',
    'o     ',
    'O     ',
    'OoOo. ',
    'o   o ',
    'o   O ',
    'O   o ',
    '      ',
    '      ',
  ],
  'i' => [
    '   ',
    'o  ',
    '   ',
    '   ',
    'O  ',
    'o  ',
    'O  ',
    'o\' ',
    '   ',
    '   ',
  ],
  'j' => [
    '    ',
    '  O ',
    '    ',
    '    ',
    ' \'o ',
    '  O ',
    '  o ',
    '  O ',
    '  o ',
    'oO\' ',
  ],
  'k' => [
    'o     ',
    'O     ',
    'o     ',
    'o     ',
    'O  o  ',
    'OoO   ',
    'o  O  ',
    'O   o ',
    '      ',
    '      ',
  ],
  'l' => [
    ' o ',
    'O  ',
    'o  ',
    'O  ',
    'o  ',
    'O  ',
    'o  ',
    'Oo ',
    '   ',
    '   ',
  ],
  'm' => [
    '         ',
    '         ',
    '         ',
    '         ',
    '`oOOoOO. ',
    ' O  o  o ',
    ' o  O  O ',
    ' O  o  o ',
    '         ',
    '         ',
  ],
  'n' => [
    '       ',
    '       ',
    '       ',
    '       ',
    '\'OoOo. ',
    ' o   O ',
    ' O   o ',
    ' o   O ',
    '       ',
    '       ',
  ],
  'o' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOo. ',
    'O   o ',
    'o   O ',
    '`OoO\' ',
    '      ',
    '      ',
  ],
  'p' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOo. ',
    'O   o ',
    'o   O ',
    'oOoO\' ',
    'O     ',
    'o\'    ',
  ],
  'q' => [
    '       ',
    '       ',
    '       ',
    '       ',
    '.oOoO\' ',
    'O   o  ',
    'o   O  ',
    '`OoOo  ',
    '    O  ',
    '    `o ',
  ],
  'r' => [
    '       ',
    '       ',
    '       ',
    '       ',
    '`OoOo. ',
    ' o     ',
    ' O     ',
    ' o     ',
    '       ',
    '       ',
  ],
  's' => [
    '      ',
    '      ',
    '      ',
    '      ',
    '.oOo  ',
    '`Ooo. ',
    '    O ',
    '`OoO\' ',
    '      ',
    '      ',
  ],
  't' => [
    '      ',
    '      ',
    '  O   ',
    ' oOo  ',
    '  o   ',
    '  O   ',
    '  o   ',
    '  `oO ',
    '      ',
    '      ',
  ],
  'u' => [
    '       ',
    '       ',
    '       ',
    '       ',
    'O   o  ',
    'o   O  ',
    'O   o  ',
    '`OoO\'o ',
    '       ',
    '       ',
  ],
  'v' => [
    '       ',
    '       ',
    '       ',
    '       ',
    '`o   O ',
    ' O   o ',
    ' o  O  ',
    ' `o\'   ',
    '       ',
    '       ',
  ],
  'w' => [
    '         ',
    '         ',
    '         ',
    '         ',
    '\'o     O ',
    ' O  o  o ',
    ' o  O  O ',
    ' `Oo\'oO\' ',
    '         ',
    '         ',
  ],
  'x' => [
    '      ',
    '      ',
    '      ',
    '      ',
    'o   O ',
    ' OoO  ',
    ' o o  ',
    'O   O ',
    '      ',
    '      ',
  ],
  'y' => [
    '      ',
    '      ',
    '      ',
    '      ',
    'O   o ',
    'o   O ',
    'O   o ',
    '`OoOO ',
    '    o ',
    ' OoO\' ',
  ],
  'z' => [
    '     ',
    '     ',
    '     ',
    '     ',
    'ooOO ',
    '  o  ',
    ' O   ',
    'OooO ',
    '     ',
    '     ',
  ],
  'A' => [
    '   Oo    ',
    '  o  O   ',
    ' O    o  ',
    'oOooOoOo ',
    'o      O ',
    'O      o ',
    'o      O ',
    'O.     O ',
    '         ',
    '         ',
  ],
  'B' => [
    'o.oOOOo.  ',
    ' o     o  ',
    ' O     O  ',
    ' oOooOO.  ',
    ' o     `O ',
    ' O      o ',
    ' o     .O ',
    ' `OooOO\'  ',
    '          ',
    '          ',
  ],
  'C' => [
    ' .oOOOo.  ',
    '.O     o  ',
    'o         ',
    'o         ',
    'o         ',
    'O         ',
    '`o     .o ',
    ' `OoooO\'  ',
    '          ',
    '          ',
  ],
  'D' => [
    'o.OOOo.   ',
    ' O    `o  ',
    ' o      O ',
    ' O      o ',
    ' o      O ',
    ' O      o ',
    ' o    .O\' ',
    ' OooOO\'   ',
    '          ',
    '          ',
  ],
  'E' => [
    'o.OOoOoo ',
    ' O       ',
    ' o       ',
    ' ooOO    ',
    ' O       ',
    ' o       ',
    ' O       ',
    'ooOooOoO ',
    '         ',
    '         ',
  ],
  'F' => [
    'OOooOoO ',
    'o       ',
    'O       ',
    'oOooO   ',
    'O       ',
    'o       ',
    'o       ',
    'O\'      ',
    '        ',
    '        ',
  ],
  'G' => [
    ' .oOOOo.  ',
    '.O     o  ',
    'o         ',
    'O         ',
    'O   .oOOo ',
    'o.      O ',
    ' O.    oO ',
    '  `OooO\'  ',
    '          ',
    '          ',
  ],
  'H' => [
    'o      O ',
    'O      o ',
    'o      O ',
    'OoOooOOo ',
    'o      O ',
    'O      o ',
    'o      o ',
    'o      O ',
    '         ',
    '         ',
  ],
  'I' => [
    'ooOoOOo ',
    '   O    ',
    '   o    ',
    '   O    ',
    '   o    ',
    '   O    ',
    '   O    ',
    'ooOOoOo ',
    '        ',
    '        ',
  ],
  'J' => [
    '  OooOoo ',
    '      O  ',
    '      o  ',
    '      O  ',
    '      o  ',
    '      O  ',
    'O     o  ',
    '`OooOO\'  ',
    '         ',
    '         ',
  ],
  'K' => [
    '`o    O  ',
    ' o   O   ',
    ' O  O    ',
    ' oOo     ',
    ' o  o    ',
    ' O   O   ',
    ' o    o  ',
    ' O     O ',
    '         ',
    '         ',
  ],
  'L' => [
    ' o      ',
    'O       ',
    'o       ',
    'o       ',
    'O       ',
    'O       ',
    'o     . ',
    'OOoOooO ',
    '        ',
    '        ',
  ],
  'M' => [
    'Oo      oO ',
    'O O    o o ',
    'o  o  O  O ',
    'O   Oo   O ',
    'O        o ',
    'o        O ',
    'o        O ',
    'O        o ',
    '           ',
    '           ',
  ],
  'N' => [
    'o.     O ',
    'Oo     o ',
    'O O    O ',
    'O  o   o ',
    'O   o  O ',
    'o    O O ',
    'o     Oo ',
    'O     `o ',
    '         ',
    '         ',
  ],
  'O' => [
    ' .oOOOo.  ',
    '.O     o. ',
    'O       o ',
    'o       O ',
    'O       o ',
    'o       O ',
    '`o     O\' ',
    ' `OoooO\'  ',
    '          ',
    '          ',
  ],
  'P' => [
    'OooOOo.  ',
    'O     `O ',
    'o      O ',
    'O     .o ',
    'oOooOO\'  ',
    'o        ',
    'O        ',
    'o\'       ',
    '         ',
    '         ',
  ],
  'Q' => [
    ' .oOOOo.   ',
    '.O     o.  ',
    'o       O  ',
    'O       o  ',
    'o       O  ',
    'O    Oo o  ',
    '`o     O\'  ',
    ' `OoooO Oo ',
    '           ',
    '           ',
  ],
  'R' => [
    '`OooOOo.  ',
    ' o     `o ',
    ' O      O ',
    ' o     .O ',
    ' OOooOO\'  ',
    ' o    o   ',
    ' O     O  ',
    ' O      o ',
    '          ',
    '          ',
  ],
  'S' => [
    '.oOOOo.  ',
    'o     o  ',
    'O.       ',
    ' `OOoo.  ',
    '      `O ',
    '       o ',
    'O.    .O ',
    ' `oooO\'  ',
    '         ',
    '         ',
  ],
  'T' => [
    'oOoOOoOOo ',
    '    o     ',
    '    o     ',
    '    O     ',
    '    o     ',
    '    O     ',
    '    O     ',
    '    o\'    ',
    '          ',
    '          ',
  ],
  'U' => [
    'O       o ',
    'o       O ',
    'O       o ',
    'o       o ',
    'o       O ',
    'O       O ',
    '`o     Oo ',
    ' `OoooO\'O ',
    '          ',
    '          ',
  ],
  'V' => [
    'o      \'O ',
    'O       o ',
    'o       O ',
    'o       o ',
    'O      O\' ',
    '`o    o   ',
    ' `o  O    ',
    '  `o\'     ',
    '          ',
    '          ',
  ],
  'W' => [
    'o          `O ',
    'O           o ',
    'o           O ',
    'O           O ',
    'o     o     o ',
    'O     O     O ',
    '`o   O o   O\' ',
    ' `OoO\' `OoO\'  ',
    '              ',
    '              ',
  ],
  'X' => [
    'o      O ',
    ' O    o  ',
    '  o  O   ',
    '   oO    ',
    '   Oo    ',
    '  o  o   ',
    ' O    O  ',
    'O      o ',
    '         ',
    '         ',
  ],
  'Y' => [
    'o       O ',
    'O       o ',
    '`o     O\' ',
    '  O   o   ',
    '   `O\'    ',
    '    o     ',
    '    O     ',
    '    O     ',
    '          ',
    '          ',
  ],
  'Z' => [
    'OoooOOoO ',
    '      o  ',
    '     O   ',
    '    o    ',
    '   O     ',
    '  o      ',
    ' O       ',
    'OOooOooO ',
    '         ',
    '         ',
  ],
  '0' => [
    '       ',
    '.oOOo. ',
    'O    o ',
    'o    O ',
    'o    o ',
    'O    O ',
    'o    O ',
    '`OooO\' ',
    '       ',
    '       ',
  ],
  '1' => [
    '      ',
    ' oO   ',
    '  O   ',
    '  o   ',
    '  O   ',
    '  o   ',
    '  O   ',
    'OooOO ',
    '      ',
    '      ',
  ],
  '2' => [
    '       ',
    '.oOOo. ',
    '     O ',
    '     o ',
    '    O\' ',
    '   O   ',
    ' .O    ',
    'oOoOoO ',
    '       ',
    '       ',
  ],
  '3' => [
    '       ',
    '.oOOo. ',
    '     O ',
    '     o ',
    '  .oO  ',
    '     o ',
    '     O ',
    '`OooO\' ',
    '       ',
    '       ',
  ],
  '4' => [
    '       ',
    'o   O  ',
    'O   o  ',
    'o   o  ',
    'OooOOo ',
    '    O  ',
    '    o  ',
    '    O  ',
    '       ',
    '       ',
  ],
  '5' => [
    '       ',
    'OooOOo ',
    'o      ',
    'O      ',
    'ooOOo. ',
    '     O ',
    '     o ',
    '`OooO\' ',
    '       ',
    '       ',
  ],
  '6' => [
    '       ',
    '.oOOo. ',
    'O      ',
    'o      ',
    'OoOOo. ',
    'O    O ',
    'O    o ',
    '`OooO\' ',
    '       ',
    '       ',
  ],
  '7' => [
    '       ',
    'OooOoO ',
    '     o ',
    '     O ',
    '    O  ',
    '   O   ',
    '  o    ',
    ' O     ',
    '       ',
    '       ',
  ],
  '8' => [
    '       ',
    '.oOOo. ',
    'O    o ',
    'o    O ',
    '`oOOo\' ',
    'O    o ',
    'o    O ',
    '`OooO\' ',
    '       ',
    '       ',
  ],
  '9' => [
    '       ',
    '.oOOo. ',
    'O    o ',
    'o    O ',
    '`OooOo ',
    '     O ',
    '     o ',
    '`OooO\' ',
    '       ',
    '       ',
  ],

  
);

1;
