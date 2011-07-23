ExecJS
======

ExecJS lets you run JavaScript code from Ruby. It automatically picks
the best runtime available to evaluate your JavaScript program, then
returns the result to you as a Ruby object.

ExecJS supports these runtimes:

* [therubyracer](https://github.com/cowboyd/therubyracer) - Google V8
  embedded within Ruby
* [therubyrhino](https://github.com/cowboyd/therubyrhino) - Mozilla
  Rhino embedded within JRuby
* [Johnson](https://github.com/jbarnette/johnson) - Mozilla
  SpiderMonkey embedded within Ruby
* [Mustang](https://github.com/nu7hatch/mustang) - Mustang V8
  embedded within Ruby
* [Node.js](http://nodejs.org/)
* Apple JavaScriptCore - Included with Mac OS X
* [Mozilla SpiderMonkey](http://www.mozilla.org/js/spidermonkey/)
* [Microsoft Windows Script Host](http://msdn.microsoft.com/en-us/library/9bbdkx3k.aspx) (JScript)

A short example:

    require "execjs"
    ExecJS.eval "'red yellow blue'.split(' ')"
    # => ["red", "yellow", "blue"]

A longer example, demonstrating how to invoke the CoffeeScript compiler:

    require "execjs"
    require "open-uri"
    source = open("http://jashkenas.github.com/coffee-script/extras/coffee-script.js").read

    context = ExecJS.compile(source)
    context.call("CoffeeScript.compile", "square = (x) -> x * x", :bare => true)
    # => "var square;\nsquare = function(x) {\n  return x * x;\n};"

# Installation

    $ gem install execjs

# License

Copyright (c) 2011 Sam Stephenson and Josh Peek.

Released under the MIT license. See `LICENSE` for details.
