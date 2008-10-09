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
# Font definition based on figlet font "larry3d" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 9,
  'name' => 'larry3d',
  'comment' => 'larry3d.flf by Larry Gelberg (larryg@avs.com)(stolen liberally from Juan Car\'s puffy.flf)tweaked by Glenn Chappell <ggc@uiuc.edu>Version 1.2 2/24/94',
  'a' => [
    '          ',
    '          ',
    '   __     ',
    ' /\'__`\\   ',
    '/\\ \\L\\.\\_ ',
    '\\ \\__/.\\_\\',
    ' \\/__/\\/_/',
    '          ',
    '          ',
  ],
  'b' => [
    ' __        ',
    '/\\ \\       ',
    '\\ \\ \\____  ',
    ' \\ \\ \'__`\\ ',
    '  \\ \\ \\L\\ \\',
    '   \\ \\_,__/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'c' => [
    '        ',
    '        ',
    '  ___   ',
    ' /\'___\\ ',
    '/\\ \\__/ ',
    '\\ \\____\\',
    ' \\/____/',
    '        ',
    '        ',
  ],
  'd' => [
    '  __     ',
    ' /\\ \\    ',
    ' \\_\\ \\   ',
    ' /\'_` \\  ',
    '/\\ \\L\\ \\ ',
    '\\ \\___,_\\',
    ' \\/__,_ /',
    '         ',
    '         ',
  ],
  'e' => [
    '        ',
    '        ',
    '   __   ',
    ' /\'__`\\ ',
    '/\\  __/ ',
    '\\ \\____\\',
    ' \\/____/',
    '        ',
    '        ',
  ],
  'f' => [
    '   ___  ',
    ' /\'___\\ ',
    '/\\ \\__/ ',
    '\\ \\ ,__\\',
    ' \\ \\ \\_/',
    '  \\ \\_\\ ',
    '   \\/_/ ',
    '        ',
    '        ',
  ],
  'g' => [
    '          ',
    '          ',
    '   __     ',
    ' /\'_ `\\   ',
    '/\\ \\L\\ \\  ',
    '\\ \\____ \\ ',
    ' \\/___L\\ \\',
    '   /\\____/',
    '   \\_/__/ ',
  ],
  'h' => [
    ' __         ',
    '/\\ \\        ',
    '\\ \\ \\___    ',
    ' \\ \\  _ `\\  ',
    '  \\ \\ \\ \\ \\ ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'i' => [
    '       ',
    ' __    ',
    '/\\_\\   ',
    '\\/\\ \\  ',
    ' \\ \\ \\ ',
    '  \\ \\_\\',
    '   \\/_/',
    '       ',
    '       ',
  ],
  'j' => [
    '        ',
    ' __     ',
    '/\\_\\    ',
    '\\/\\ \\   ',
    ' \\ \\ \\  ',
    ' _\\ \\ \\ ',
    '/\\ \\_\\ \\',
    '\\ \\____/',
    ' \\/___/ ',
  ],
  'k' => [
    ' __         ',
    '/\\ \\        ',
    '\\ \\ \\/\'\\    ',
    ' \\ \\ , <    ',
    '  \\ \\ \\\\`\\  ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'l' => [
    ' ___      ',
    '/\\_ \\     ',
    '\\//\\ \\    ',
    '  \\ \\ \\   ',
    '   \\_\\ \\_ ',
    '   /\\____\\',
    '   \\/____/',
    '          ',
    '          ',
  ],
  'm' => [
    '             ',
    '             ',
    '  ___ ___    ',
    '/\' __` __`\\  ',
    '/\\ \\/\\ \\/\\ \\ ',
    '\\ \\_\\ \\_\\ \\_\\',
    ' \\/_/\\/_/\\/_/',
    '             ',
    '             ',
  ],
  'n' => [
    '         ',
    '         ',
    '  ___    ',
    '/\' _ `\\  ',
    '/\\ \\/\\ \\ ',
    '\\ \\_\\ \\_\\',
    ' \\/_/\\/_/',
    '         ',
    '         ',
  ],
  'o' => [
    '        ',
    '        ',
    '  ___   ',
    ' / __`\\ ',
    '/\\ \\L\\ \\',
    '\\ \\____/',
    ' \\/___/ ',
    '        ',
    '        ',
  ],
  'p' => [
    '         ',
    '         ',
    ' _____   ',
    '/\\ \'__`\\ ',
    '\\ \\ \\L\\ \\',
    ' \\ \\ ,__/',
    '  \\ \\ \\/ ',
    '   \\ \\_\\ ',
    '    \\/_/ ',
  ],
  'q' => [
    '           ',
    '           ',
    '   __      ',
    ' /\'__`\\    ',
    '/\\ \\L\\ \\   ',
    '\\ \\___, \\  ',
    ' \\/___/\\ \\ ',
    '      \\ \\_\\',
    '       \\/_/',
  ],
  'r' => [
    '       ',
    '       ',
    ' _ __  ',
    '/\\`\'__\\',
    '\\ \\ \\/ ',
    ' \\ \\_\\ ',
    '  \\/_/ ',
    '       ',
    '       ',
  ],
  's' => [
    '        ',
    '        ',
    '  ____  ',
    ' /\',__\\ ',
    '/\\__, `\\',
    '\\/\\____/',
    ' \\/___/ ',
    '        ',
    '        ',
  ],
  't' => [
    ' __      ',
    '/\\ \\__   ',
    '\\ \\ ,_\\  ',
    ' \\ \\ \\/  ',
    '  \\ \\ \\_ ',
    '   \\ \\__\\',
    '    \\/__/',
    '         ',
    '         ',
  ],
  'u' => [
    '         ',
    '         ',
    ' __  __  ',
    '/\\ \\/\\ \\ ',
    '\\ \\ \\_\\ \\',
    ' \\ \\____/',
    '  \\/___/ ',
    '         ',
    '         ',
  ],
  'v' => [
    '         ',
    '         ',
    ' __  __  ',
    '/\\ \\/\\ \\ ',
    '\\ \\ \\_/ |',
    ' \\ \\___/ ',
    '  \\/__/  ',
    '         ',
    '         ',
  ],
  'w' => [
    '             ',
    '             ',
    ' __  __  __  ',
    '/\\ \\/\\ \\/\\ \\ ',
    '\\ \\ \\_/ \\_/ \\',
    ' \\ \\___x___/\'',
    '  \\/__//__/  ',
    '             ',
    '             ',
  ],
  'x' => [
    '        ',
    '        ',
    ' __  _  ',
    '/\\ \\/\'\\ ',
    '\\/>  </ ',
    ' /\\_/\\_\\',
    ' \\//\\/_/',
    '        ',
    '        ',
  ],
  'y' => [
    '           ',
    '           ',
    ' __  __    ',
    '/\\ \\/\\ \\   ',
    '\\ \\ \\_\\ \\  ',
    ' \\/`____ \\ ',
    '  `/___/> \\',
    '     /\\___/',
    '     \\/__/ ',
  ],
  'z' => [
    '         ',
    '         ',
    ' ____    ',
    '/\\_ ,`\\  ',
    '\\/_/  /_ ',
    '  /\\____\\',
    '  \\/____/',
    '         ',
    '         ',
  ],
  'A' => [
    ' ______     ',
    '/\\  _  \\    ',
    '\\ \\ \\L\\ \\   ',
    ' \\ \\  __ \\  ',
    '  \\ \\ \\/\\ \\ ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'B' => [
    ' ____      ',
    '/\\  _`\\    ',
    '\\ \\ \\L\\ \\  ',
    ' \\ \\  _ <\' ',
    '  \\ \\ \\L\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'C' => [
    ' ____      ',
    '/\\  _`\\    ',
    '\\ \\ \\/\\_\\  ',
    ' \\ \\ \\/_/_ ',
    '  \\ \\ \\L\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'D' => [
    ' ____      ',
    '/\\  _`\\    ',
    '\\ \\ \\/\\ \\  ',
    ' \\ \\ \\ \\ \\ ',
    '  \\ \\ \\_\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'E' => [
    ' ____      ',
    '/\\  _`\\    ',
    '\\ \\ \\L\\_\\  ',
    ' \\ \\  _\\L  ',
    '  \\ \\ \\L\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'F' => [
    ' ____    ',
    '/\\  _`\\  ',
    '\\ \\ \\L\\_\\',
    ' \\ \\  _\\/',
    '  \\ \\ \\/ ',
    '   \\ \\_\\ ',
    '    \\/_/ ',
    '         ',
    '         ',
  ],
  'G' => [
    ' ____      ',
    '/\\  _`\\    ',
    '\\ \\ \\L\\_\\  ',
    ' \\ \\ \\L_L  ',
    '  \\ \\ \\/, \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'H' => [
    ' __  __     ',
    '/\\ \\/\\ \\    ',
    '\\ \\ \\_\\ \\   ',
    ' \\ \\  _  \\  ',
    '  \\ \\ \\ \\ \\ ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'I' => [
    ' ______     ',
    '/\\__  _\\    ',
    '\\/_/\\ \\/    ',
    '   \\ \\ \\    ',
    '    \\_\\ \\__ ',
    '    /\\_____\\',
    '    \\/_____/',
    '            ',
    '            ',
  ],
  'J' => [
    ' _____    ',
    '/\\___ \\   ',
    '\\/__/\\ \\  ',
    '   _\\ \\ \\ ',
    '  /\\ \\_\\ \\',
    '  \\ \\____/',
    '   \\/___/ ',
    '          ',
    '          ',
  ],
  'K' => [
    ' __  __     ',
    '/\\ \\/\\ \\    ',
    '\\ \\ \\/\'/\'   ',
    ' \\ \\ , <    ',
    '  \\ \\ \\\\`\\  ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'L' => [
    ' __        ',
    '/\\ \\       ',
    '\\ \\ \\      ',
    ' \\ \\ \\  __ ',
    '  \\ \\ \\L\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  'M' => [
    '            ',
    ' /\'\\_/`\\    ',
    '/\\      \\   ',
    '\\ \\ \\__\\ \\  ',
    ' \\ \\ \\_/\\ \\ ',
    '  \\ \\_\\\\ \\_\\',
    '   \\/_/ \\/_/',
    '            ',
    '            ',
  ],
  'N' => [
    ' __  __     ',
    '/\\ \\/\\ \\    ',
    '\\ \\ `\\\\ \\   ',
    ' \\ \\ , ` \\  ',
    '  \\ \\ \\`\\ \\ ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/_/',
    '            ',
    '            ',
  ],
  'O' => [
    ' _____      ',
    '/\\  __`\\    ',
    '\\ \\ \\/\\ \\   ',
    ' \\ \\ \\ \\ \\  ',
    '  \\ \\ \\_\\ \\ ',
    '   \\ \\_____\\',
    '    \\/_____/',
    '            ',
    '            ',
  ],
  'P' => [
    ' ____    ',
    '/\\  _`\\  ',
    '\\ \\ \\L\\ \\',
    ' \\ \\ ,__/',
    '  \\ \\ \\/ ',
    '   \\ \\_\\ ',
    '    \\/_/ ',
    '         ',
    '         ',
  ],
  'Q' => [
    ' _____      ',
    '/\\  __`\\    ',
    '\\ \\ \\/\\ \\   ',
    ' \\ \\ \\ \\ \\  ',
    '  \\ \\ \\\\\'\\\\ ',
    '   \\ \\___\\_\\',
    '    \\/__//_/',
    '            ',
    '            ',
  ],
  'R' => [
    ' ____       ',
    '/\\  _`\\     ',
    '\\ \\ \\L\\ \\   ',
    ' \\ \\ ,  /   ',
    '  \\ \\ \\\\ \\  ',
    '   \\ \\_\\ \\_\\',
    '    \\/_/\\/ /',
    '            ',
    '            ',
  ],
  'S' => [
    ' ____       ',
    '/\\  _`\\     ',
    '\\ \\,\\L\\_\\   ',
    ' \\/_\\__ \\   ',
    '   /\\ \\L\\ \\ ',
    '   \\ `\\____\\',
    '    \\/_____/',
    '            ',
    '            ',
  ],
  'T' => [
    ' ______   ',
    '/\\__  _\\  ',
    '\\/_/\\ \\/  ',
    '   \\ \\ \\  ',
    '    \\ \\ \\ ',
    '     \\ \\_\\',
    '      \\/_/',
    '          ',
    '          ',
  ],
  'U' => [
    ' __  __     ',
    '/\\ \\/\\ \\    ',
    '\\ \\ \\ \\ \\   ',
    ' \\ \\ \\ \\ \\  ',
    '  \\ \\ \\_\\ \\ ',
    '   \\ \\_____\\',
    '    \\/_____/',
    '            ',
    '            ',
  ],
  'V' => [
    ' __  __    ',
    '/\\ \\/\\ \\   ',
    '\\ \\ \\ \\ \\  ',
    ' \\ \\ \\ \\ \\ ',
    '  \\ \\ \\_/ \\',
    '   \\ `\\___/',
    '    `\\/__/ ',
    '           ',
    '           ',
  ],
  'W' => [
    ' __      __    ',
    '/\\ \\  __/\\ \\   ',
    '\\ \\ \\/\\ \\ \\ \\  ',
    ' \\ \\ \\ \\ \\ \\ \\ ',
    '  \\ \\ \\_/ \\_\\ \\',
    '   \\ `\\___x___/',
    '    \'\\/__//__/ ',
    '               ',
    '               ',
  ],
  'X' => [
    ' __   __     ',
    '/\\ \\ /\\ \\    ',
    '\\ `\\`\\/\'/\'   ',
    ' `\\/ > <     ',
    '    \\/\'/\\`\\  ',
    '    /\\_\\\\ \\_\\',
    '    \\/_/ \\/_/',
    '             ',
    '             ',
  ],
  'Y' => [
    ' __    __ ',
    '/\\ \\  /\\ \\',
    '\\ `\\`\\\\/\'/',
    ' `\\ `\\ /\' ',
    '   `\\ \\ \\ ',
    '     \\ \\_\\',
    '      \\/_/',
    '          ',
    '          ',
  ],
  'Z' => [
    ' ________     ',
    '/\\_____  \\    ',
    '\\/____//\'/\'   ',
    '     //\'/\'    ',
    '    //\'/\'___  ',
    '    /\\_______\\',
    '    \\/_______/',
    '              ',
    '              ',
  ],
  '0' => [
    '   __     ',
    ' /\'__`\\   ',
    '/\\ \\/\\ \\  ',
    '\\ \\ \\ \\ \\ ',
    ' \\ \\ \\_\\ \\',
    '  \\ \\____/',
    '   \\/___/ ',
    '          ',
    '          ',
  ],
  '1' => [
    '   _     ',
    ' /\' \\    ',
    '/\\_, \\   ',
    '\\/_/\\ \\  ',
    '   \\ \\ \\ ',
    '    \\ \\_\\',
    '     \\/_/',
    '         ',
    '         ',
  ],
  '2' => [
    '   ___     ',
    ' /\'___`\\   ',
    '/\\_\\ /\\ \\  ',
    '\\/_/// /__ ',
    '   // /_\\ \\',
    '  /\\______/',
    '  \\/_____/ ',
    '           ',
    '           ',
  ],
  '3' => [
    '   __     ',
    ' /\'__`\\   ',
    '/\\_\\L\\ \\  ',
    '\\/_/_\\_<_ ',
    '  /\\ \\L\\ \\',
    '  \\ \\____/',
    '   \\/___/ ',
    '          ',
    '          ',
  ],
  '4' => [
    ' __ __      ',
    '/\\ \\\\ \\     ',
    '\\ \\ \\\\ \\    ',
    ' \\ \\ \\\\ \\_  ',
    '  \\ \\__ ,__\\',
    '   \\/_/\\_\\_/',
    '      \\/_/  ',
    '            ',
    '            ',
  ],
  '5' => [
    ' ______    ',
    '/\\  ___\\   ',
    '\\ \\ \\__/   ',
    ' \\ \\___``\\ ',
    '  \\/\\ \\L\\ \\',
    '   \\ \\____/',
    '    \\/___/ ',
    '           ',
    '           ',
  ],
  '6' => [
    '  ____    ',
    ' /\'___\\   ',
    '/\\ \\__/   ',
    '\\ \\  _``\\ ',
    ' \\ \\ \\L\\ \\',
    '  \\ \\____/',
    '   \\/___/ ',
    '          ',
    '          ',
  ],
  '7' => [
    ' ________ ',
    '/\\_____  \\',
    '\\/___//\'/\'',
    '    /\' /\' ',
    '  /\' /\'   ',
    ' /\\_/     ',
    ' \\//      ',
    '          ',
    '          ',
  ],
  '8' => [
    '   __     ',
    ' /\'_ `\\   ',
    '/\\ \\L\\ \\  ',
    '\\/_> _ <_ ',
    '  /\\ \\L\\ \\',
    '  \\ \\____/',
    '   \\/___/ ',
    '          ',
    '          ',
  ],
  '9' => [
    '   __      ',
    ' /\'_ `\\    ',
    '/\\ \\L\\ \\   ',
    '\\ \\___, \\  ',
    ' \\/__,/\\ \\ ',
    '      \\ \\_\\',
    '       \\/_/',
    '           ',
    '           ',
  ],

  
);

1;
