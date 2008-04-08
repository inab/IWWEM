/*
	$Id$
	base64.js
	from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
	Author: José María Fernández González (C) 2007-2008
	Institutions:
	*	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
	*	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
	
	This code is a slightly variant from Base64 class
	from webtoolkit, prepared for sliced processing
*/
/**
*
* Base64 encode / decode
* http://www.webtoolkit.info/
*
**/

var Base64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input, /* optional */ noUTF8) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
	
	if(!noUTF8) {
	        input = Base64._utf8_encode(input);
	}

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode : function (input, /* optional */ noUTF8) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
	
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }
	
	if(!noUTF8) {
	        output = Base64._utf8_decode(output);
	}

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    },
    
	// public method for Base64 stream decoding
	streamFromBase64ToByte: function (input, end_callback, /* optional */ noUTF8, i, output) {
		if(!i) {
			i=0;
        		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			if(!output)  output="";
		}
		
		var _keyStr = this._keyStr;
		var ilength = input.length;
		
		for(var ilocal=0 ; ilocal<4096 && i<ilength ; ilocal++) {
			var enc1 = _keyStr.indexOf(input.charAt(i++));
			var enc2 = _keyStr.indexOf(input.charAt(i++));
			var enc3 = _keyStr.indexOf(input.charAt(i++));
			var enc4 = _keyStr.indexOf(input.charAt(i++));

			var chr1 = (enc1 << 2) | (enc2 >> 4);
			var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			var chr3 = ((enc3 & 3) << 6) | enc4;

			output += String.fromCharCode(chr1);

			if (enc3 != 64) {
				output += String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output += String.fromCharCode(chr3);
			}
		}
		
		if(i<ilength) {
			setTimeout(function() {
				Base64.streamFromBase64ToByte(input,end_callback,noUTF8,i,output);
			},50);
		} else if(noUTF8) {
			end_callback(output);
		} else {
			// Next chain
			setTimeout(function() {
				Base64.streamFromByteToUTF8(output,end_callback);
			},100);
		}
	},
	
	// private method for UTF8 stream decoding
	streamFromByteToUTF8: function (bytetext, end_callback, /* optional */ i, utftext) {
		if(!utftext)  utftext="";
		if(!i)  i = 0;
		
		var blength=bytetext.length;
		for(var ilocal=0 ; ilocal < 8192 && i < blength ; ilocal++) {

			var c = bytetext.charCodeAt(i);

			if (c < 128) {
				utftext += String.fromCharCode(c);
				i++;
			} else if((c > 191) && (c < 224)) {
				var c2 = bytetext.charCodeAt(i+1);
				utftext += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				var c2 = bytetext.charCodeAt(i+1);
				var c3 = bytetext.charCodeAt(i+2);
				utftext += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		
		if(i<blength) {
			setTimeout(function() {
				Base64.streamFromByteToUTF8(bytetext,end_callback,i,utftext);
			},100);
		} else {
			end_callback(utftext);
		}
	},
	
	// public method for Base64 stream decoding
	streamFromBase64ToUTF8: function (input, end_callback, /* optional */ i, transientArr, output) {
		if(!i) {
			i=0;
        		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			transientArr=new Array();
			if(!output)  output="";
		}
		var _keyStr = this._keyStr;
		var ilength = input.length;
		
		for(var ilocal=0 ; ilocal<4096 && i<ilength ; ilocal++) {
			var enc1 = _keyStr.indexOf(input.charAt(i++));
			var enc2 = _keyStr.indexOf(input.charAt(i++));
			var enc3 = _keyStr.indexOf(input.charAt(i++));
			var enc4 = _keyStr.indexOf(input.charAt(i++));

			var chr1 = (enc1 << 2) | (enc2 >> 4);
			var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			var chr3 = ((enc3 & 3) << 6) | enc4;

			transientArr.push(chr1);
			//output += String.fromCharCode(chr1);

			if (enc3 != 64) {
				transientArr.push(chr2);
				//output += String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				transientArr.push(chr3);
				//output += String.fromCharCode(chr3);
			}
			
			var toRemove=0;
			var tLength=transientArr.length;
			if(tLength>2047) {
				while(toRemove < tLength) {
					var c=transientArr[toRemove];
					if(c < 128) {
						output += String.fromCharCode(c);
						toRemove++;
					} else if((c > 191) && (c < 224)) {
						if((toRemove+1)>=tLength)  break;
						output += String.fromCharCode(((c & 31) << 6) | (transientArr[toRemove+1] & 63));
						toRemove+=2;
					} else if((toRemove+1)>=tLength) {
						break;
					} else {
						output += String.fromCharCode(((c & 15) << 12) | ((transientArr[toRemove+1] & 63) << 6) | (transientArr[toRemove+2] & 63));
						toRemove+=3;
					}
				}
				transientArr.splice(0,toRemove);
			}
		}
		
		if(i<ilength) {
			setTimeout(function() {
				Base64.streamFromBase64ToUTF8(input,end_callback,i,transientArr,output);
			},50);
		} else {
			// Last transient bytes must be converted
			var tLength=transientArr.length;
			if(tLength>0) {
				var toRemove=0;
				while(toRemove < tLength) {
					var c=transientArr[toRemove];
					if(c < 128) {
						output += String.fromCharCode(c);
						toRemove++;
					} else if((c > 191) && (c < 224)) {
						// An exception should be fired, instead a break
						if((toRemove+1)>=tLength)  break;
						output += String.fromCharCode(((c & 31) << 6) | (transientArr[toRemove+1] & 63));
						toRemove+=2;
					} else if((toRemove+1)>=tLength) {
						// An exception should be fired, instead a break
						break;
					} else {
						output += String.fromCharCode(((c & 15) << 12) | ((transientArr[toRemove+1] & 63) << 6) | (transientArr[toRemove+2] & 63));
						toRemove+=3;
					}
				}
			}
			end_callback(output);
		}
	},

	// public method for encoding
	streamFromUTF8ToByteToBase64 : function (input, end_callback) {
		Base64.streamFromUTF8ToByte(input, function(bytetext) {
			Base64.streamFromByteToBase64(bytetext,end_callback);
		});
	},
	
	// private method for UTF-8 stream encoding
	streamFromUTF8ToByte: function (utftext, end_callback, /* optional */ n, bytetext) {
		if(!bytetext) {
			bytetext="";
			utftext = utftext.replace(/\r\n/g,"\n");
		}
		if(!n)  n = 0;
		
		var nlength = n + 8192;
		var ulength = utftext.length;
		if(nlength > ulength)  nlength=ulength;
		for (; n < nlength ; n++) {
			var c = utftext.charCodeAt(n);

			if (c < 128) {
				bytetext += String.fromCharCode(c);
			} else if((c > 127) && (c < 2048)) {
				bytetext += String.fromCharCode((c >> 6) | 192 , (c & 63) | 128);
			} else {
				bytetext += String.fromCharCode((c >> 12) | 224 , ((c >> 6) & 63) | 128 , (c & 63) | 128);
			}
		}
		
		if(n<ulength) {
			setTimeout(function() {
				Base64.streamFromUTF8ToByte(utftext,end_callback,n,bytetext);
			},100);
		} else {
			end_callback(bytetext);
		}
	},

	streamFromByteToBase64 : function (input, end_callback, /* optional */ i , output) {
		if(!i) {
			i=0;
			if(!output)  output="";
		}
		
		var _keyStr = this._keyStr;
		var ilength = input.length;
		
		for(var ilocal=0; ilocal<4096 && i<ilength ; ilocal++) {
			var chr1 = input.charCodeAt(i++);
			var chr2 = input.charCodeAt(i++);
			var chr3 = input.charCodeAt(i++);

			var enc1 = chr1 >> 2;
			var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			var enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output += _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
		}
		
		if(i<ilength) {
			setTimeout(function() {
				Base64.streamFromByte64ToBase64(input,end_callback,i,output);
			},50);
		} else {
			// Next chain
			end_callback(output);
		}
	},
	
	streamFromUTF8ToBase64: function (utftext, end_callback, /* optional */ n, transientArr, base64text) {
		if(!n) {
			n = 0;
			utftext = utftext.replace(/\r\n/g,"\n");
			transientArr=new Array();
			if(!base64text)  base64text="";
		}
		
		var _keyStr = this._keyStr;
		var nlength = n + 8192;
		var ulength = utftext.length;
		if(nlength > ulength)  nlength=ulength;
		for (; n < nlength ; n++) {
			var c = utftext.charCodeAt(n);

			if (c < 128) {
				transientArr.push(c);
				//bytetext += String.fromCharCode(c);
			} else if((c > 127) && (c < 2048)) {
				transientArr.push((c >> 6) | 192 , (c & 63) | 128);
				//bytetext += String.fromCharCode((c >> 6) | 192 , (c & 63) | 128);
			} else {
				transientArr.push((c >> 12) | 224 , ((c >> 6) & 63) | 128 , (c & 63) | 128);
				//bytetext += String.fromCharCode((c >> 12) | 224 , ((c >> 6) & 63) | 128 , (c & 63) | 128);
			}
			
			var tLength=transientArr.length;
			if(tLength>2047) {
				// Max work, with a times 3 value
				tLength -= (tLength % 3);
				var toRemove=0;
				while(toRemove < tLength) {
					var chr1 = transientArr[toRemove++];
					var chr2 = transientArr[toRemove++];
					var chr3 = transientArr[toRemove++];

					var enc1 = chr1 >> 2;
					var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					var enc4 = chr3 & 63;
					
					/* This won't happen here
					
					if (isNaN(chr2)) {
						enc3 = enc4 = 64;
					} else if (isNaN(chr3)) {
						enc4 = 64;
					}
					
					*/

					base64text += _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);

				}
				transientArr.splice(0,toRemove);
			}
		}
		
		if(n<ulength) {
			setTimeout(function() {
				Base64.streamFromUTF8ToByte(utftext,end_callback,n,bytetext);
			},50);
		} else {
			var tLength=transientArr.length;
			if(tLength>0) {
				// Max work, with a times 3 value
				var restLength=(tLength % 3);
				if(restLength>0) {
					for(var irest=3-restLength;irest >0;irest--) {
						transientArr.push(NaN);
					}
					tLength -= restLength;
				}
				var toRemove=0;
				while(toRemove < tLength) {
					var chr1 = transientArr[toRemove++];
					var chr2 = transientArr[toRemove++];
					var chr3 = transientArr[toRemove++];

					var enc1 = chr1 >> 2;
					var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					var enc4 = chr3 & 63;

					base64text += _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
				}
				if(restLength>0) {
					var chr1 = transientArr[toRemove++];
					var chr2 = transientArr[toRemove++];
					var chr3 = transientArr[toRemove++];

					var enc1 = chr1 >> 2;
					var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					var enc4 = chr3 & 63;
					
					if (isNaN(chr2)) {
						enc3 = enc4 = 64;
					} else if (isNaN(chr3)) {
						enc4 = 64;
					}

					base64text += _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
				}
			}
			end_callback(bytetext);
		}
	}

}
