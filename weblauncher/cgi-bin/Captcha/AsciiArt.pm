#!/usr/bin/perl -W

use strict;

package Captcha::AsciiArt;

sub get_allowed_characters() {
	my(@allowed_chars) = ();
	
	my($allowed_chars_settings) = variable_get('ascii_art_captcha_allowed_characters',{
		'upper' => 'upper',
		'lower' => 'lower',
		'digit' => 'digit'
	});
	if(exists($allowed_chars_settings->{'upper'})) {
		push(@allowed_chars,'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');
	}
	if(exists($allowed_chars_settings->{'lower'})) {
		push(@allowed_chars,'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z');
	}
	if(exists($allowed_chars_settings->{'digit'})) {
		push(@allowed_chars,'1', '2', '3', '4', '5', '6', '7', '8', '9');
	}

	return \@allowed_chars;
}

# First parameter is the text to translate
# meanwhile the second one is the font
my($MODULE_NAME)="Captcha/AsciiArt";

sub toAsciiArt($;$) {
	my($text,$font)=@_;
	
	# Let's load the font (if it is possible)
	my($path)=$INC{"${MODULE_NAME}.pm"};
	$path =~ s/\.pm$//;
	if(defined($font)) {
		# A security check
		if(index($font,'/')==-1) {
			eval {
				require "${MODULE_NAME}/${font}.pm";
			};
			
			# If not found, then go for default one
			$font=undef  if($@);
		} else {
			$font=undef;
		}
	}

	$font='alphabet'  unless(defined($font));
	require "${MODULE_NAME}/${font}.pm";
	
	# Now the font has been loaded, we can translate the input text
	my($newText)='';
	foreach my $letter (split(//,$text)) {
		$newText.=$letter  if(exists($Captcha::AsciiArt::FONT{$letter}));
	}
	my(@letters)=@Captcha::AsciiArt::FONT{split(//,$newText)};
	
	return [$newText,$Captcha::AsciiArt::FONT{'height'},\@letters];
}

1;