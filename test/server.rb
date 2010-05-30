#!/usr/local/bin/ruby
require 'webrick'
require 'rubygems'
require 'msgpack'

def webrick(config = {})
    WEBrick::HTTPServer.new(config).instance_eval do |server|
        [:INT, :TERM].each do |signal|
            Signal.trap(signal) { shutdown }
        end
        server.mount_proc("/unpack") do |req, res|
            if req.path =~ %r(/unpack/([a-z0-9]+)) then
                path = $1
                res.content_type = "text/plain; charset=x-user-defined"
                case path
                when "null"
                    res.body = nil.to_msgpack
                when "true"
                    res.body = true.to_msgpack
                when "false"
                    res.body = false.to_msgpack
                when "fixnum"
                    res.body = 100.to_msgpack
                when "fixraw"
                    res.body = "0123456789abc".to_msgpack
                when "fixarray"
                    res.body = [0, true, false].to_msgpack
                when "fixmap"
                    res.body = {0 => "0", 1 => "1"}.to_msgpack
                when "float"
                    res.body = (10.5).to_msgpack
                when "uint8"
                    res.body = 200.to_msgpack
                when "uint16"
                    res.body = 40000.to_msgpack
                when "uint32"
                    res.body = (3*(2**30)).to_msgpack
                when "uint64"
                    res.body = (3*(2**62)).to_msgpack
                when "int8"
                    res.body = (-100).to_msgpack
                when "int16"
                    res.body = (-1000).to_msgpack
                when "int32"
                    res.body = (-1000_000).to_msgpack
                when "int64"
                    res.body = (-1000_000_000_000_000).to_msgpack
                when "raw16"
                    res.body = ("a"*1000).to_msgpack
                when "raw32"
                    res.body = ("a"*100_000).to_msgpack
                when "array16"
                    res.body = ([1]*1000).to_msgpack
                when "array32"
                    res.body = ([1]*100_000).to_msgpack
                when "map16"
                    hash = (0..1000).inject({}) do |h, key|
                        h[key] = key.to_s
                        h
                    end
                    res.body = hash.to_msgpack
                when "map32"
                    hash = (0..1000_000).inject({}) do |h, key|
                        h[key] = key.to_s
                        h
                    end
                    res.body = hash.to_msgpack
                end
            end
        end
        start
    end
end

webrick :DocumentRoot => File.expand_path(File.join(File.dirname(__FILE__), "..")),
    :Port => 5001
