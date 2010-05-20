MessagePack = {};
MessagePack.unpack = function(data){
    var unpacker = new MessagePack.Decoder(data);
    return unpacker.unpack();
};

MessagePack.CharSet = 0;

MessagePack.load_url = function(url, fn){
    var req = new XMLHttpRequest();
    req.open('GET', url, !!fn);
    if(req.overrideMimeType){
        req.overrideMimeType('text/plain; charset=x-user-defined');
    }
    req.send(null);
    var msgpack_unpack = function(){
        try {
            if(req.status != 200 && req.status != 0)
                return null;
            if(MessagePack.hasVBS){
                data = req.responseBody;
            }else{
                data = req.responseText;
            }
            return MessagePack.unpack(data)
        } finally {
            if (fn)
                req.onreadystatehange = null;
            req = null;
        }
    }
    if(fn){
        req.onreadystatehange = function(){
            if( req.readyState != 4)
                return;
            fn(MessagePack.unpack(msgpack_unpack()));
        }
    }else{
        return msgpack_unpack();
    }
    return null;
}

MessagePack.Decoder = function(data, charSet){
    this.index = 0;
    this.data = data;
    if(MessagePack.hasVBS){
        this.length = msgpack_getLength(data);
    }else{
        this.length = data.length;
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
            'Function msgpack_getByte(data, pos)\r\n' +
            '  msgpack_getByte = AscB(MidB(data, pos + 1, 1))\r\n'+
            'End Function\r\n' +
            'Function msgpack_substr(data, pos, len)\r\n' +
            '  msgpack_substr = MidB(data, pos + 1, len)\r\n'+
            'End Function\r\n' +
            'Function msgpack_getLength(data) \r\n' +
            '  msgpack_getLength = LenB(data)\r\n' +
            'End Function\r\n' +
            '\r\n', 'VBScript');
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
        var byte = this.getc();
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
            return String.prototype.fromCharCode.apply(String, bytes);
        }else if(this.charSet == -1){
            return bytes;
        }
        else{
        // assume UTF-8 string
            var i = 0, str = "";
            while(i < bytes.length){
                var c = bytes[i];
                if( c < 128){
                    str += String.fromCharCode(c);
                    i++;
                }
                else if((c ^ 0xc0) < 32){
                    var code = (c ^ 0xc0) << 6 | (bytes[i + 1] & 63);
                    str += String.fromCharCode(code);
                    i += 2;
                }
                else {
                    var code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
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

    if(MessagePack.hasVBS){
        p.read = function(length){
            var j = this.index;
            if(j + length <= this.length){
                var byte_array = new Array(length);
                for(var i = 0; i < length; ++i){
                    byte_array[i] = msgpack_getByte(this.data, j + i);
                }
                return byte_array;
            }else{
                throw "MessagePackFailure: index is out of range";
            }
        }

        p.getc = function(){
            var j = this.index;
            if(j < this.length){
                return msgpack_getByte(this.data, j);
            }else{
                throw "MessagePackFailure: index is out of range";
            }
        }
    }else{
        p.read = function(length){
            var j = this.index;
            if(j + length <= this.length){
                var bytes = [];
                for(var i = 0; i < length; ++i){
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
}
