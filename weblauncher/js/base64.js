/*
	This code is a slightly variant from Base64 class
	from webtoolkit, prepared for slice processing
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
	streamDecode : function (input, end_callback, /* optional */ noUTF8, i, output) {
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
				Base64.streamDecode(input,end_callback,noUTF8,i,output);
			},50);
		} else if(noUTF8) {
			end_callback(output);
		} else {
			// Next chain
			setTimeout(function() {
				Base64.streamUTF8Decode(output,end_callback);
			},100);
		}
	},
	
	// private method for UTF8 stream decoding
	streamUTF8Decode: function (bytetext, end_callback, /* optional */ i, utftext) {
		if(!utftext)  utftext="";
		if(!i)  i = 0;
		
		var blength=bytetext.length;
		for(var ilocal=0 ; ilocal < 8192 && i <blength ; ilocal++) {

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
				Base64.streamUTF8Decode(bytetext,end_callback,i,utftext);
			},100);
		} else {
			end_callback(utftext);
		}
	},
	
	// public method for Base64 stream decoding
	streamBase64UTF8Decode: function (input, end_callback, /* optional */ i, transient, output) {
		if(!i) {
			i=0;
        		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			transient=new Array();
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

			transient.push(chr1);
			//output += String.fromCharCode(chr1);

			if (enc3 != 64) {
				transient.push(chr2);
				//output += String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				transient.push(chr3);
				//output += String.fromCharCode(chr3);
			}
			
			var toRemove=0;
			var tLength=transient.length;
			if(tLength>2047) {
				while(toRemove < tLength) {
					var c=transient[toRemove];
					if(c < 128) {
						output += String.fromCharCode(c);
						toRemove++;
					} else if((c > 191) && (c < 224)) {
						if((toRemove+1)>=tLength)  break;
						output += String.fromCharCode(((c & 31) << 6) | (transient[toRemove+1] & 63));
						toRemove+=2;
					} else if((toRemove+1)>=tLength) {
						break;
					} else {
						output += String.fromCharCode(((c & 15) << 12) | ((transient[toRemove+1] & 63) << 6) | (transient[toRemove+2] & 63));
						toRemove+=3;
					}
				}
				transient.splice(0,toRemove);
			}
		}
		
		if(i<ilength) {
			setTimeout(function() {
				Base64.streamBase64UTF8Decode(input,end_callback,i,transient,output);
			},50);
		} else {
			// Last transient bytes must be converted
			var tLength=transient.length;
			if(tLength>0) {
				var toRemove=0;
				while(toRemove < tLength) {
					var c=transient[toRemove];
					if(c < 128) {
						output += String.fromCharCode(c);
						toRemove++;
					} else if((c > 191) && (c < 224)) {
						if((toRemove+1)>=tLength)  break;
						output += String.fromCharCode(((c & 31) << 6) | (transient[toRemove+1] & 63));
						toRemove+=2;
					} else if((toRemove+1)>=tLength) {
						break;
					} else {
						output += String.fromCharCode(((c & 15) << 12) | ((transient[toRemove+1] & 63) << 6) | (transient[toRemove+2] & 63));
						toRemove+=3;
					}
				}
			}
			end_callback(output);
		}
	}

}
