#!/usr/bin/perl -W

use strict;

package Captcha::AsciiArt;

use vars qw(%FONT);


# $Id: ascii_art_captcha_font_straight.inc,v 1.2 2007/09/18 21:13:22 soxofaan Exp $
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
