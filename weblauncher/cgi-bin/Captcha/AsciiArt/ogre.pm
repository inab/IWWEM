#!/usr/bin/perl -W

use strict;

package Captcha::AsciiArt;

use vars qw(%FONT);


# $Id: ascii_art_captcha_font_ogre.inc,v 1.2 2007/09/18 21:13:22 soxofaan Exp $
# Font definition based on figlet font "ogre" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 6,
  'name' => 'ogre',
  'comment' => 'Standard by Glenn Chappell & Ian Chai 3/93 -- based on .sig of Frank SheeranFiglet release 2.0 -- August 5, 1993Explanation of first line:flf2 - "magic number" for file identificationa    - should always be `a\', for now$    - the "hardblank" -- prints as a blank, but can\'t be smushed6    - height of a character5    - height of a character, not including descenders20   - max line length (excluding comment lines) + a fudge factor15   - default smushmode for this font (like "-m 15" on command line)13   - number of comment lines',
  'a' => [
    '       ',
    '  __ _ ',
    ' / _` |',
    '| (_| |',
    ' \\__,_|',
    '       ',
  ],
  'b' => [
    ' _     ',
    '| |__  ',
    '| \'_ \\ ',
    '| |_) |',
    '|_.__/ ',
    '       ',
  ],
  'c' => [
    '      ',
    '  ___ ',
    ' / __|',
    '| (__ ',
    ' \\___|',
    '      ',
  ],
  'd' => [
    '     _ ',
    '  __| |',
    ' / _` |',
    '| (_| |',
    ' \\__,_|',
    '       ',
  ],
  'e' => [
    '      ',
    '  ___ ',
    ' / _ \\',
    '|  __/',
    ' \\___|',
    '      ',
  ],
  'f' => [
    '  __ ',
    ' / _|',
    '| |_ ',
    '|  _|',
    '|_|  ',
    '     ',
  ],
  'g' => [
    '       ',
    '  __ _ ',
    ' / _` |',
    '| (_| |',
    ' \\__, |',
    ' |___/ ',
  ],
  'h' => [
    ' _     ',
    '| |__  ',
    '| \'_ \\ ',
    '| | | |',
    '|_| |_|',
    '       ',
  ],
  'i' => [
    ' _ ',
    '(_)',
    '| |',
    '| |',
    '|_|',
    '   ',
  ],
  'j' => [
    '   _ ',
    '  (_)',
    '  | |',
    '  | |',
    ' _/ |',
    '|__/ ',
  ],
  'k' => [
    ' _    ',
    '| | __',
    '| |/ /',
    '|   < ',
    '|_|\\_\\',
    '      ',
  ],
  'l' => [
    ' _ ',
    '| |',
    '| |',
    '| |',
    '|_|',
    '   ',
  ],
  'm' => [
    '           ',
    ' _ __ ___  ',
    '| \'_ ` _ \\ ',
    '| | | | | |',
    '|_| |_| |_|',
    '           ',
  ],
  'n' => [
    '       ',
    ' _ __  ',
    '| \'_ \\ ',
    '| | | |',
    '|_| |_|',
    '       ',
  ],
  'o' => [
    '       ',
    '  ___  ',
    ' / _ \\ ',
    '| (_) |',
    ' \\___/ ',
    '       ',
  ],
  'p' => [
    '       ',
    ' _ __  ',
    '| \'_ \\ ',
    '| |_) |',
    '| .__/ ',
    '|_|    ',
  ],
  'q' => [
    '       ',
    '  __ _ ',
    ' / _` |',
    '| (_| |',
    ' \\__, |',
    '    |_|',
  ],
  'r' => [
    '      ',
    ' _ __ ',
    '| \'__|',
    '| |   ',
    '|_|   ',
    '      ',
  ],
  's' => [
    '     ',
    ' ___ ',
    '/ __|',
    '\\__ \\',
    '|___/',
    '     ',
  ],
  't' => [
    ' _   ',
    '| |_ ',
    '| __|',
    '| |_ ',
    ' \\__|',
    '     ',
  ],
  'u' => [
    '       ',
    ' _   _ ',
    '| | | |',
    '| |_| |',
    ' \\__,_|',
    '       ',
  ],
  'v' => [
    '       ',
    '__   __',
    '\\ \\ / /',
    ' \\ V / ',
    '  \\_/  ',
    '       ',
  ],
  'w' => [
    '          ',
    '__      __',
    '\\ \\ /\\ / /',
    ' \\ V  V / ',
    '  \\_/\\_/  ',
    '          ',
  ],
  'x' => [
    '      ',
    '__  __',
    '\\ \\/ /',
    ' >  < ',
    '/_/\\_\\',
    '      ',
  ],
  'y' => [
    '       ',
    ' _   _ ',
    '| | | |',
    '| |_| |',
    ' \\__, |',
    ' |___/ ',
  ],
  'z' => [
    '     ',
    ' ____',
    '|_  /',
    ' / / ',
    '/___|',
    '     ',
  ],
  'A' => [
    '   _   ',
    '  /_\\  ',
    ' //_\\\\ ',
    '/  _  \\',
    '\\_/ \\_/',
    '       ',
  ],
  'B' => [
    '   ___ ',
    '  / __\\',
    ' /__\\//',
    '/ \\/  \\',
    '\\_____/',
    '       ',
  ],
  'C' => [
    '   ___ ',
    '  / __\\',
    ' / /   ',
    '/ /___ ',
    '\\____/ ',
    '       ',
  ],
  'D' => [
    '    ___ ',
    '   /   \\',
    '  / /\\ /',
    ' / /_// ',
    '/___,\'  ',
    '        ',
  ],
  'E' => [
    '   __ ',
    '  /__\\',
    ' /_\\  ',
    '//__  ',
    '\\__/  ',
    '      ',
  ],
  'F' => [
    '   ___ ',
    '  / __\\',
    ' / _\\  ',
    '/ /    ',
    '\\/     ',
    '       ',
  ],
  'G' => [
    '   ___ ',
    '  / _ \\',
    ' / /_\\/',
    '/ /_\\\\ ',
    '\\____/ ',
    '       ',
  ],
  'H' => [
    '        ',
    '  /\\  /\\',
    ' / /_/ /',
    '/ __  / ',
    '\\/ /_/  ',
    '        ',
  ],
  'I' => [
    '  _____ ',
    '  \\_   \\',
    '   / /\\/',
    '/\\/ /_  ',
    '\\____/  ',
    '        ',
  ],
  'J' => [
    '  __  ',
    '  \\ \\ ',
    '   \\ \\',
    '/\\_/ /',
    '\\___/ ',
    '      ',
  ],
  'K' => [
    '       ',
    '  /\\ /\\',
    ' / //_/',
    '/ __ \\ ',
    '\\/  \\/ ',
    '       ',
  ],
  'L' => [
    '   __  ',
    '  / /  ',
    ' / /   ',
    '/ /___ ',
    '\\____/ ',
    '       ',
  ],
  'M' => [
    '        ',
    '  /\\/\\  ',
    ' /    \\ ',
    '/ /\\/\\ \\',
    '\\/    \\/',
    '        ',
  ],
  'N' => [
    '     __ ',
    '  /\\ \\ \\',
    ' /  \\/ /',
    '/ /\\  / ',
    '\\_\\ \\/  ',
    '        ',
  ],
  'O' => [
    '   ___ ',
    '  /___\\',
    ' //  //',
    '/ \\_// ',
    '\\___/  ',
    '       ',
  ],
  'P' => [
    '   ___ ',
    '  / _ \\',
    ' / /_)/',
    '/ ___/ ',
    '\\/     ',
    '       ',
  ],
  'Q' => [
    '   ____ ',
    '  /___ \\',
    ' //  / /',
    '/ \\_/ / ',
    '\\___,_\\ ',
    '        ',
  ],
  'R' => [
    '   __  ',
    '  /__\\ ',
    ' / \\// ',
    '/ _  \\ ',
    '\\/ \\_/ ',
    '       ',
  ],
  'S' => [
    ' __    ',
    '/ _\\   ',
    '\\ \\    ',
    '_\\ \\   ',
    '\\__/   ',
    '       ',
  ],
  'T' => [
    ' _____ ',
    '/__   \\',
    '  / /\\/',
    ' / /   ',
    ' \\/    ',
    '       ',
  ],
  'U' => [
    '       ',
    ' /\\ /\\ ',
    '/ / \\ \\',
    '\\ \\_/ /',
    ' \\___/ ',
    '       ',
  ],
  'V' => [
    '        ',
    '/\\   /\\ ',
    '\\ \\ / / ',
    ' \\ V /  ',
    '  \\_/   ',
    '        ',
  ],
  'W' => [
    ' __    __ ',
    '/ / /\\ \\ \\',
    '\\ \\/  \\/ /',
    ' \\  /\\  / ',
    '  \\/  \\/  ',
    '          ',
  ],
  'X' => [
    '__  __',
    '\\ \\/ /',
    ' \\  / ',
    ' /  \\ ',
    '/_/\\_\\',
    '      ',
  ],
  'Y' => [
    '     ',
    '/\\_/\\',
    '\\_ _/',
    ' / \\ ',
    ' \\_/ ',
    '     ',
  ],
  'Z' => [
    ' _____',
    '/ _  /',
    '\\// / ',
    ' / //\\',
    '/____/',
    '      ',
  ],
  '0' => [
    '  ___  ',
    ' / _ \\ ',
    '| | | |',
    '| |_| |',
    ' \\___/ ',
    '       ',
  ],
  '1' => [
    ' _ ',
    '/ |',
    '| |',
    '| |',
    '|_|',
    '   ',
  ],
  '2' => [
    ' ____  ',
    '|___ \\ ',
    '  __) |',
    ' / __/ ',
    '|_____|',
    '       ',
  ],
  '3' => [
    ' _____ ',
    '|___ / ',
    '  |_ \\ ',
    ' ___) |',
    '|____/ ',
    '       ',
  ],
  '4' => [
    ' _  _   ',
    '| || |  ',
    '| || |_ ',
    '|__   _|',
    '   |_|  ',
    '        ',
  ],
  '5' => [
    ' ____  ',
    '| ___| ',
    '|___ \\ ',
    ' ___) |',
    '|____/ ',
    '       ',
  ],
  '6' => [
    '  __   ',
    ' / /_  ',
    '| \'_ \\ ',
    '| (_) |',
    ' \\___/ ',
    '       ',
  ],
  '7' => [
    ' _____ ',
    '|___  |',
    '   / / ',
    '  / /  ',
    ' /_/   ',
    '       ',
  ],
  '8' => [
    '  ___  ',
    ' ( _ ) ',
    ' / _ \\ ',
    '| (_) |',
    ' \\___/ ',
    '       ',
  ],
  '9' => [
    '  ___  ',
    ' / _ \\ ',
    '| (_) |',
    ' \\__, |',
    '   /_/ ',
    '       ',
  ],

  
);

1;