MessagePack = {};
MessagePack.unpack = function(data){
    var unpacker = new MessagePack.Decoder(data);
    return unpacker.unpack();
};

MessagePack.CharSet = 0;

MessagePack.Decoder = function(data, charSet){
    this.index = 0;
    if(MessagePack.hasVBS){
        if(typeof(data) == "unknown"){
            this.length = msgpack_getLength(data);
            this.byte_array_to_string(data);
        }else{
            this.length = msgpack_getLength(data);
            this.data = data;
        }
    }else{
        this.length = data.length;
        this.data   = data;
    }
    charSet = charSet || MessagePack.CharSet || 0;
    if(charSet == 'utf-8'){
        charSet = 0;
    }
    else if(charSet == 'unicode'){
        charSet = 1;
    }
    else if(charSet == 'raw'){
        charSet = -1;
    }
    else{
        charSet = 0;
    }
}


if(typeof execScript != 'undefined'){
    execScript(
            'Dim g_msgpack_binary_data\n' +
            'Sub msgpack_set_binary_data(binary)\n' +
            '    g_msgpack_binary_data = binary\n' +
            'End Sub\n' +
            'Function msgpack_getByte(pos)\n' +
            '  msgpack_getByte = AscB(MidB(g_msgpack_binary_data, pos + 1, 1))\n'+
            'End Function\n',"VBScript");
    execScript(
            'Function msgpack_substr(pos, len)\n' +
            '  Dim array()\n'+
            '  ReDim array(len)\n'+
            '  For i = 1 To len\n'+
            '    array(i-1) = AscB(MidB(g_msgpack_binary_data, pos + i, 1))\n'+
            '  Next\n'+
            '  msgpack_substr = array\n'+
            'End Function\n' +
            'Function msgpack_getLength(data)\n' +
            '  msgpack_getLength = LenB(data)\n' +
            'End Function\n' +
            '\n', 'VBScript');
}

MessagePack.hasVBS = 'msgpack_getByte' in this;

with({p: MessagePack.Decoder.prototype}){
    p.unpack = function(){
        var type = this.unpack_uint8();
        if(type < 0x80){
            var positive_fixnum = type;
            return positive_fixnum;
        }else if((type ^ 0xe0) < 0x20){
            var negative_fixnum = (type ^ 0xe0) - 0x20;
            return negative_fixnum;
        }
        var size;
        if((size = type ^ 0xa0) <= 0x1f){
            return this.unpack_raw(size);
        }else if((size = type ^ 0x90) <= 0x0f){
            return this.unpack_array(size);
        }else if((size = type ^ 0x80) <= 0x0f){
            return this.unpack_map(size);
        }

        switch(type){
            case 0xc0:
                return null;
            case 0xc1:
                return undefined;
            case 0xc2:
                return false;
            case 0xc3:
                return true;
            case 0xca:
                return this.unpack_float();
            case 0xcb:
                return this.unpack_double();
            case 0xcc:
                return this.unpack_uint8();
            case 0xcd:
                return this.unpack_uint16();
            case 0xce:
                return this.unpack_uint32();
            case 0xcf:
                return this.unpack_uint64();
            case 0xd0:
                return this.unpack_int8();
            case 0xd1:
                return this.unpack_int16();
            case 0xd2:
                return this.unpack_int32();
            case 0xd3:
                return this.unpack_int64();
            case 0xd4:
                return undefined;
            case 0xd5:
                return undefined;
            case 0xd6:
                return undefined;
            case 0xd7:
                return undefined;
            case 0xd8:
                return undefined;
            case 0xd9:
                return undefined;
            case 0xda:
                size = this.unpack_uint16();
                return this.unpack_raw(size);
            case 0xdb:
                size = this.unpack_uint32;
                return this.unpack_raw(size);
            case 0xdc:
                size = this.unpack_uint16();
                return this.unpack_array(size);
            case 0xdd:
                size = this.unpack_uint32();
                return this.unpack_array(size);
            case 0xde:
                size = this.unpack_uint16();
                return this.unpack_map(size);
            case 0xdf:
                size = this.unpack_uint32();
                return this.unpack_map(size);
        }
    }

    p.unpack_uint8 = function(){
        var byte = this.getc() & 0xff;
        this.index++;
        return byte;
    };

    p.unpack_uint16 = function(){
        var bytes = this.read(2);
        var uint16 = 
            (bytes[0] << 8) + bytes[1];
        this.index += 2;
        return uint16;
    }

    p.unpack_uint32 = function(){
        var bytes = this.read(4);
        var uint32 = 
            bytes[0] * Math.pow(2, 24) +
            bytes[1] * Math.pow(2, 16) +
            bytes[2] * Math.pow(2, 8) +
            bytes[3]
        this.index += 4;
        return uint32;
    }

    p.unpack_uint64 = function(){
        var bytes = this.read(8);
        var uint64 = 
            bytes[0] * Math.pow(2, 56) +
            bytes[1] * Math.pow(2, 48) +
            bytes[2] * Math.pow(2, 40) +
            bytes[3] * Math.pow(2, 32) +
            bytes[4] * Math.pow(2, 24) +
            bytes[5] * Math.pow(2, 16) +
            bytes[6] * Math.pow(2, 8 ) +
            bytes[7]
        this.index += 8;
        return uint64;
    }


    p.unpack_int8 = function(){
        var uint8 = this.unpack_uint8();
        return (uint8 < 0x80 ) ? uint8 : uint8 - (1 << 8);
    };

    p.unpack_int16 = function(){
        var uint16 = this.unpack_uint16();
        return (uint16 < 0x8000 ) ? uint16 : uint16 - (1 << 16);
    }

    p.unpack_int32 = function(){
        var uint32 = this.unpack_uint32();
        return (uint32 < Math.pow(2, 31) ) ? uint32 :
            uint32 - Math.pow(2, 32);
    }

    p.unpack_int64 = function(){
        var uint64 = this.unpack_uint64();
        return (uint64 < Math.pow(2, 63) ) ? uint64 :
            uint64 - Math.pow(2, 64);
    }

    p.unpack_raw = function(size){
        if( this.length < this.index + size){
            throw "MessagePackFailure: index is out of range"
                + " " + this.index + " " + size + " " + this.length;
        }
        var bytes = this.read(size);
        this.index += size;
        if(this.charSet == 1){
            return String.fromCharCode.apply(String, bytes);
        }else if(this.charSet == -1){
            return bytes;
        }
        else{
        // assume UTF-8 string
            var i = 0, str = "", c, code;
            while(i < size){
                c = bytes[i];
                if( c < 128){
                    str += String.fromCharCode(c);
                    i++;
                }
                else if((c ^ 0xc0) < 32){
                    code = ((c ^ 0xc0) << 6) | (bytes[i+1] & 63);
                    str += String.fromCharCode(code);
                    i += 2;
                }
                else {
                    code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
                        (bytes[i+2] & 63);
                    str += String.fromCharCode(code);
                    i += 3;
                }
            }
            return str;
        }
    }

    p.unpack_array = function(size){
        var objects = new Array(size);
        for(var i = 0; i < size ; i++){
            objects[i] = this.unpack();
        }
        return objects;
    }

    p.unpack_map = function(size){
        var map = {};
        for(var i = 0; i < size ; i++){
            var key  = this.unpack();
            var value = this.unpack();
            map[key] = value;
        }
        return map;
    }

    p.unpack_float = function(){
        var uint32 = this.unpack_uint32();
        var sign = uint32 >> 31;
        var exp  = ((uint32 >> 23) & 0xff) - 127;
        var fraction = ( uint32 & 0x7fffff ) | 0x800000;
        return (sign == 0 ? 1 : -1) *
            fraction * Math.pow(2, exp - 23);
    }

    p.unpack_double = function(){
        var h32 = this.unpack_uint32();
        var l32 = this.unpack_uint32();
        var sign = h32 >> 31;
        var exp  = ((h32 >> 20) & 0x7ff) - 1023;
        var hfrac = ( h32 & 0xfffff ) | 0x100000;
        var frac = hfrac * Math.pow(2, exp - 20) +
            l32   * Math.pow(2, exp - 52);
        return (sign == 0 ? 1 : -1) * frac;
    }

    p.byte_array_to_string = function(data){
        var binary_to_js_array_hex = function(binary){
            var xmldom = new ActiveXObject("Microsoft.XMLDOM");
            var bin = xmldom.createElement("bin");
            bin.nodeTypedValue = data;
            bin.dataType = "bin.hex";

            var text = bin.text;
            var size = text.length;
            return function (start, length){
                var i = 0, chunk = 4, bytes = []
                    chunk2 = chunk*2, hex, int32;
                for(; i + 3 < length; i+=4){
                    hex = text.substr(2*(i + start), chunk2);
                    int32 = parseInt(hex, 16);

                    bytes[i    ] = (int32 > 24) & 0xff;
                    bytes[i + 1] = (int32 > 16) & 0xff;
                    bytes[i + 2] = (int32 >  8) & 0xff;
                    bytes[i + 3] =  int32       & 0xff;
                }
                for(i -= 3; i < length; i++){
                    hex = this.data.substr(2*(i+start), 2);
                    bytes[i] = parseInt(hex, 16);
                }
                return bytes;
            }
        }

        var binary_to_js_array_base64 = function(binary){
            var chr2index = {};
            var text;
            (function(){
               var xmldom = new ActiveXObject("Microsoft.XMLDOM");
               var bin = xmldom.createElement("bin");
               bin.dataType = "bin.base64";
               bin.nodeTypedValue = binary;

               text = bin.text.replace(/[^A-Za-z0-9\+\/\=]/g, "");

               var b64map =
               "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
               for(var i = 0, length = b64map.length;  i < length ; i++){
                   chr2index[b64map.charAt(i)] = i;
               }
            })();
            var chr2, chr3, prev_i = 0;
            return function(start, length){
                var bytes, last_pos = Math.floor(3 * prev_i / 4);
                switch(last_pos - start){
                    case 2:
                        bytes = [chr2, chr3];
                        break;
                    case 1:
                        bytes = [chr3];
                        break;
                    default:
                        bytes = [];
                }
                var j = bytes.length;
                if(length <= j){
                    bytes.length = length;
                    return bytes;
                }
                var i = prev_i, enc1, enc2, enc3, enc4,
                    last = 4*Math.ceil((start + length) / 3);
                while(i < last){
                    enc1 = chr2index[text.charAt(i++)];
                    enc2 = chr2index[text.charAt(i++)];
                    enc3 = chr2index[text.charAt(i++)];
                    enc4 = chr2index[text.charAt(i++)];

                    bytes[j++] = (enc1 << 2) | (enc2 >> 4);
                    bytes[j++] = ((enc2 & 0x0f) << 4) | (enc3 >> 2);
                    bytes[j++] = ((enc3 & 0x03) << 6) | enc4;
                }
                prev_i = i;
                chr2 = bytes[j-2];
                chr3 = bytes[j-1];
                bytes.length = length;
                return bytes;
            }
        }

        var binary_to_js_array_vbs = function(data){
            msgpack_set_binary_data(data);
            return function(position, length){
                return msgpack_substr(position, length).toArray();
            }
        };

        //var bytes_substr = binary_to_js_array_hex(data);
        var bytes_substr = binary_to_js_array_base64(data);
        //var bytes_substr = binary_to_js_array_vbs(data);

        this.read = function(length){
            var j = this.index, i = 0;
            if( j + length <= this.length){
                return bytes_substr( j, length);
            }else{
                throw "MessagePackFailure: index is out of range";
            }
        }

        this.getc = function(){
            var j = this.index;
            if(j < this.length){
                return bytes_substr( j, 1)[0];
            }else{
                throw "MessagePackFailure: index is out of range";
            }
        }
    }

    p.read = function(length){
        var j = this.index;
        if(j + length <= this.length){
            var bytes = new Array(length);
            for(var i = length - 1; i >= 0; --i){
                bytes[i] = this.data.charCodeAt(j+i);
            }
            return bytes;
        }else{
            throw "MessagePackFailure: index is out of range";
        }
    }
    p.getc = function(){
        var j = this.index;
        if(j < this.length){
            return this.data.charCodeAt(j);
        }else{
            throw "MessagePackFailure: index is out of range";
        }
    }
}
