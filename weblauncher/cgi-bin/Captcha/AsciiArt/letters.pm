#!/usr/bin/perl -W

use strict;

package Captcha::AsciiArt;

use vars qw(%FONT);


# $Id: ascii_art_captcha_font_letters.inc,v 1.2 2007/09/18 21:13:22 soxofaan Exp $
# Font definition based on figlet font "letters" (http://www.figlet.org/)
# as distributed by pyfiglet (http://sourceforge.net/projects/pyfiglet/)

%FONT=(
  
  'height' => 6,
  'name' => 'letters',
  'comment' => 'Letters by Sriram J. Gollapalli,  July 10, 1994  o__         +----------------------+          __o _.>/)_       | Sriram J. Gollapalli |        _(\\<._(_) \\(_)      +----------------------+       (_)/ (_)                 <sriram@capaccess.org>',
  'a' => [
    '        ',
    '  aa aa ',
    ' aa aaa ',
    'aa  aaa ',
    ' aaa aa ',
    '        ',
  ],
  'b' => [
    'bb      ',
    'bb      ',
    'bbbbbb  ',
    'bb   bb ',
    'bbbbbb  ',
    '        ',
  ],
  'c' => [
    '       ',
    '  cccc ',
    'cc     ',
    'cc     ',
    ' ccccc ',
    '       ',
  ],
  'd' => [
    '     dd ',
    '     dd ',
    ' dddddd ',
    'dd   dd ',
    ' dddddd ',
    '        ',
  ],
  'e' => [
    '       ',
    '  eee  ',
    'ee   e ',
    'eeeee  ',
    ' eeeee ',
    '       ',
  ],
  'f' => [
    ' fff ',
    'ff   ',
    'ffff ',
    'ff   ',
    'ff   ',
    '     ',
  ],
  'g' => [
    '        ',
    ' gggggg ',
    'gg   gg ',
    'ggggggg ',
    '     gg ',
    ' ggggg  ',
  ],
  'h' => [
    'hh      ',
    'hh      ',
    'hhhhhh  ',
    'hh   hh ',
    'hh   hh ',
    '        ',
  ],
  'i' => [
    'iii ',
    '    ',
    'iii ',
    'iii ',
    'iii ',
    '    ',
  ],
  'j' => [
    '  jjj ',
    '      ',
    '  jjj ',
    '  jjj ',
    '  jjj ',
    'jjjj  ',
  ],
  'k' => [
    'kk     ',
    'kk  kk ',
    'kkkkk  ',
    'kk kk  ',
    'kk  kk ',
    '       ',
  ],
  'l' => [
    'lll ',
    'lll ',
    'lll ',
    'lll ',
    'lll ',
    '    ',
  ],
  'm' => [
    '            ',
    'mm mm mmmm  ',
    'mmm  mm  mm ',
    'mmm  mm  mm ',
    'mmm  mm  mm ',
    '            ',
  ],
  'n' => [
    '        ',
    'nn nnn  ',
    'nnn  nn ',
    'nn   nn ',
    'nn   nn ',
    '        ',
  ],
  'o' => [
    '       ',
    ' oooo  ',
    'oo  oo ',
    'oo  oo ',
    ' oooo  ',
    '       ',
  ],
  'p' => [
    '        ',
    'pp pp   ',
    'ppp  pp ',
    'pppppp  ',
    'pp      ',
    'pp      ',
  ],
  'q' => [
    '        ',
    '  qqqqq ',
    'qq   qq ',
    ' qqqqqq ',
    '     qq ',
    '     qq ',
  ],
  'r' => [
    '       ',
    'rr rr  ',
    'rrr  r ',
    'rr     ',
    'rr     ',
    '       ',
  ],
  's' => [
    '      ',
    ' sss  ',
    's     ',
    ' sss  ',
    '    s ',
    ' sss  ',
  ],
  't' => [
    'tt    ',
    'tt    ',
    'tttt  ',
    'tt    ',
    ' tttt ',
    '      ',
  ],
  'u' => [
    '        ',
    'uu   uu ',
    'uu   uu ',
    'uu   uu ',
    ' uuuu u ',
    '        ',
  ],
  'v' => [
    '        ',
    'vv   vv ',
    ' vv vv  ',
    '  vvv   ',
    '   v    ',
    '        ',
  ],
  'w' => [
    '           ',
    'ww      ww ',
    'ww      ww ',
    ' ww ww ww  ',
    '  ww  ww   ',
    '           ',
  ],
  'x' => [
    '       ',
    'xx  xx ',
    '  xx   ',
    '  xx   ',
    'xx  xx ',
    '       ',
  ],
  'y' => [
    '        ',
    'yy   yy ',
    'yy   yy ',
    ' yyyyyy ',
    '     yy ',
    ' yyyyy  ',
  ],
  'z' => [
    '      ',
    'zzzzz ',
    '  zz  ',
    ' zz   ',
    'zzzzz ',
    '      ',
  ],
  'A' => [
    '  AAA   ',
    ' AAAAA  ',
    'AA   AA ',
    'AAAAAAA ',
    'AA   AA ',
    '        ',
  ],
  'B' => [
    'BBBBB   ',
    'BB   B  ',
    'BBBBBB  ',
    'BB   BB ',
    'BBBBBB  ',
    '        ',
  ],
  'C' => [
    ' CCCCC  ',
    'CC    C ',
    'CC      ',
    'CC    C ',
    ' CCCCC  ',
    '        ',
  ],
  'D' => [
    'DDDDD   ',
    'DD  DD  ',
    'DD   DD ',
    'DD   DD ',
    'DDDDDD  ',
    '        ',
  ],
  'E' => [
    'EEEEEEE ',
    'EE      ',
    'EEEEE   ',
    'EE      ',
    'EEEEEEE ',
    '        ',
  ],
  'F' => [
    'FFFFFFF ',
    'FF      ',
    'FFFF    ',
    'FF      ',
    'FF      ',
    '        ',
  ],
  'G' => [
    '  GGGG  ',
    ' GG  GG ',
    'GG      ',
    'GG   GG ',
    ' GGGGGG ',
    '        ',
  ],
  'H' => [
    'HH   HH ',
    'HH   HH ',
    'HHHHHHH ',
    'HH   HH ',
    'HH   HH ',
    '        ',
  ],
  'I' => [
    'IIIII ',
    ' III  ',
    ' III  ',
    ' III  ',
    'IIIII ',
    '      ',
  ],
  'J' => [
    '    JJJ ',
    '    JJJ ',
    '    JJJ ',
    'JJ  JJJ ',
    ' JJJJJ  ',
    '        ',
  ],
  'K' => [
    'KK  KK ',
    'KK KK  ',
    'KKKK   ',
    'KK KK  ',
    'KK  KK ',
    '       ',
  ],
  'L' => [
    'LL      ',
    'LL      ',
    'LL      ',
    'LL      ',
    'LLLLLLL ',
    '        ',
  ],
  'M' => [
    'MM    MM ',
    'MMM  MMM ',
    'MM MM MM ',
    'MM    MM ',
    'MM    MM ',
    '         ',
  ],
  'N' => [
    'NN   NN ',
    'NNN  NN ',
    'NN N NN ',
    'NN  NNN ',
    'NN   NN ',
    '        ',
  ],
  'O' => [
    ' OOOOO  ',
    'OO   OO ',
    'OO   OO ',
    'OO   OO ',
    ' OOOO0  ',
    '        ',
  ],
  'P' => [
    'PPPPPP  ',
    'PP   PP ',
    'PPPPPP  ',
    'PP      ',
    'PP      ',
    '        ',
  ],
  'Q' => [
    ' QQQQQ  ',
    'QQ   QQ ',
    'QQ   QQ ',
    'QQ  QQ  ',
    ' QQQQ Q ',
    '        ',
  ],
  'R' => [
    'RRRRRR  ',
    'RR   RR ',
    'RRRRRR  ',
    'RR  RR  ',
    'RR   RR ',
    '        ',
  ],
  'S' => [
    ' SSSSS  ',
    'SS      ',
    ' SSSSS  ',
    '     SS ',
    ' SSSSS  ',
    '        ',
  ],
  'T' => [
    'TTTTTTT ',
    '  TTT   ',
    '  TTT   ',
    '  TTT   ',
    '  TTT   ',
    '        ',
  ],
  'U' => [
    'UU   UU ',
    'UU   UU ',
    'UU   UU ',
    'UU   UU ',
    ' UUUUU  ',
    '        ',
  ],
  'V' => [
    'VV     VV ',
    'VV     VV ',
    ' VV   VV  ',
    '  VV VV   ',
    '   VVV    ',
    '          ',
  ],
  'W' => [
    'WW      WW ',
    'WW      WW ',
    'WW   W  WW ',
    ' WW WWW WW ',
    '  WW   WW  ',
    '           ',
  ],
  'X' => [
    'XX    XX ',
    ' XX  XX  ',
    '  XXXX   ',
    ' XX  XX  ',
    'XX    XX ',
    '         ',
  ],
  'Y' => [
    'YY   YY ',
    'YY   YY ',
    ' YYYYY  ',
    '  YYY   ',
    '  YYY   ',
    '        ',
  ],
  'Z' => [
    'ZZZZZ ',
    '   ZZ ',
    '  ZZ  ',
    ' ZZ   ',
    'ZZZZZ ',
    '      ',
  ],
  '0' => [
    ' 00000  ',
    '00   00 ',
    '00   00 ',
    '00   00 ',
    ' 00000  ',
    '        ',
  ],
  '1' => [
    ' 1  ',
    '111 ',
    ' 11 ',
    ' 11 ',
    '111 ',
    '    ',
  ],
  '2' => [
    ' 2222   ',
    '222222  ',
    '    222 ',
    ' 2222   ',
    '2222222 ',
    '        ',
  ],
  '3' => [
    '333333  ',
    '   3333 ',
    '  3333  ',
    '    333 ',
    '333333  ',
    '        ',
  ],
  '4' => [
    '    44   ',
    '   444   ',
    ' 44  4   ',
    '44444444 ',
    '   444   ',
    '         ',
  ],
  '5' => [
    '555555  ',
    '55      ',
    '555555  ',
    '   5555 ',
    '555555  ',
    '        ',
  ],
  '6' => [
    '  666   ',
    ' 66     ',
    '666666  ',
    '66   66 ',
    ' 66666  ',
    '        ',
  ],
  '7' => [
    '7777777 ',
    '    777 ',
    '   777  ',
    '  777   ',
    ' 777    ',
    '        ',
  ],
  '8' => [
    ' 88888  ',
    '88   88 ',
    ' 88888  ',
    '88   88 ',
    ' 88888  ',
    '        ',
  ],
  '9' => [
    '        ',
    ' 99999  ',
    '99   99 ',
    ' 999999 ',
    '    99  ',
    '  999   ',
  ],

  
);

1;