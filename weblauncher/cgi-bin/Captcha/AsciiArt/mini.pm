#!/usr/bin/perl -W

use strict;

package Captcha::AsciiArt;

use vars qw(%FONT);


# $Id: ascii_art_captcha_font_mini.inc,v 1.2 2007/09/18 21:13:22 soxofaan Exp $
# Font definition based on figlet font "mini" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 4,
  'name' => 'mini',
  'comment' => 'Mini by Glenn Chappell 4/93Includes ISO Latin-1figlet release 2.1 -- 12 Aug 1994Permission is hereby given to modify this font, as long as themodifier\'s name is placed on a comment line.Modified by Paul Burton <solution@earthlink.net> 12/96 to include new parametersupported by FIGlet and FIGWin.  May also be slightly modified for better useof new full-width/kern/smush alternatives, but default output is NOT changed.',
  'a' => [
    '    ',
    ' _. ',
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
    '    ',
    ' _  ',
    '(/_ ',
    '    ',
  ],
  'f' => [
    '  _ ',
    '_|_ ',
    ' |  ',
    '    ',
  ],
  'g' => [
    '    ',
    ' _  ',
    '(_| ',
    ' _| ',
  ],
  'h' => [
    '    ',
    '|_  ',
    '| | ',
    '    ',
  ],
  'i' => [
    '  ',
    'o ',
    '| ',
    '  ',
  ],
  'j' => [
    '   ',
    ' o ',
    ' | ',
    '_| ',
  ],
  'k' => [
    '   ',
    '|  ',
    '|< ',
    '   ',
  ],
  'l' => [
    '  ',
    '| ',
    '| ',
    '  ',
  ],
  'm' => [
    '      ',
    '._ _  ',
    '| | | ',
    '      ',
  ],
  'n' => [
    '    ',
    '._  ',
    '| | ',
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
    '._  ',
    '|_) ',
    '|   ',
  ],
  'q' => [
    '    ',
    ' _. ',
    '(_| ',
    '  | ',
  ],
  'r' => [
    '   ',
    '._ ',
    '|  ',
    '   ',
  ],
  's' => [
    '   ',
    ' _ ',
    '_> ',
    '   ',
  ],
  't' => [
    '    ',
    '_|_ ',
    ' |_ ',
    '    ',
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
    '     ',
    '     ',
    '\\/\\/ ',
    '     ',
  ],
  'x' => [
    '   ',
    '   ',
    '>< ',
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
    ' _  ',
    '|_) ',
    '|_) ',
    '    ',
  ],
  'C' => [
    ' _ ',
    '/  ',
    '\\_ ',
    '   ',
  ],
  'D' => [
    ' _  ',
    '| \\ ',
    '|_/ ',
    '    ',
  ],
  'E' => [
    ' _ ',
    '|_ ',
    '|_ ',
    '   ',
  ],
  'F' => [
    ' _ ',
    '|_ ',
    '|  ',
    '   ',
  ],
  'G' => [
    ' __ ',
    '/__ ',
    '\\_| ',
    '    ',
  ],
  'H' => [
    '    ',
    '|_| ',
    '| | ',
    '    ',
  ],
  'I' => [
    '___ ',
    ' |  ',
    '_|_ ',
    '    ',
  ],
  'J' => [
    '    ',
    '  | ',
    '\\_| ',
    '    ',
  ],
  'K' => [
    '   ',
    '|/ ',
    '|\\ ',
    '   ',
  ],
  'L' => [
    '   ',
    '|  ',
    '|_ ',
    '   ',
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
    ' _  ',
    '/ \\ ',
    '\\_/ ',
    '    ',
  ],
  'P' => [
    ' _  ',
    '|_) ',
    '|   ',
    '    ',
  ],
  'Q' => [
    ' _  ',
    '/ \\ ',
    '\\_X ',
    '    ',
  ],
  'R' => [
    ' _  ',
    '|_) ',
    '| \\ ',
    '    ',
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
    '    ',
    '| | ',
    '|_| ',
    '    ',
  ],
  'V' => [
    '     ',
    '\\  / ',
    ' \\/  ',
    '     ',
  ],
  'W' => [
    '       ',
    '\\    / ',
    ' \\/\\/  ',
    '       ',
  ],
  'X' => [
    '   ',
    '\\/ ',
    '/\\ ',
    '   ',
  ],
  'Y' => [
    '    ',
    '\\_/ ',
    ' |  ',
    '    ',
  ],
  'Z' => [
    '__ ',
    ' / ',
    '/_ ',
    '   ',
  ],
  '0' => [
    ' _  ',
    '/ \\ ',
    '\\_/ ',
    '    ',
  ],
  '1' => [
    '   ',
    '/| ',
    ' | ',
    '   ',
  ],
  '2' => [
    '_  ',
    ' ) ',
    '/_ ',
    '   ',
  ],
  '3' => [
    '_  ',
    '_) ',
    '_) ',
    '   ',
  ],
  '4' => [
    '     ',
    '|_|_ ',
    '  |  ',
    '     ',
  ],
  '5' => [
    ' _  ',
    '|_  ',
    ' _) ',
    '    ',
  ],
  '6' => [
    ' _  ',
    '|_  ',
    '|_) ',
    '    ',
  ],
  '7' => [
    '__ ',
    ' / ',
    '/  ',
    '   ',
  ],
  '8' => [
    ' _  ',
    '(_) ',
    '(_) ',
    '    ',
  ],
  '9' => [
    ' _  ',
    '(_| ',
    '  | ',
    '    ',
  ],

  
);

1;