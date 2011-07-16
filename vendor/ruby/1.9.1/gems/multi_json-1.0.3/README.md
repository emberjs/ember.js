MultiJSON
=========

Lots of Ruby libraries utilize JSON parsing in some form, and everyone has
their favorite JSON library. In order to best support multiple JSON parsers and
libraries, <tt>multi_json</tt> is a general-purpose swappable JSON backend
library. You use it like so:

    require 'multi_json'

    MultiJson.engine = :yajl
    MultiJson.decode('{"abc":"def"}') # decoded using Yajl

    MultiJson.engine = :json_gem
    MultiJson.engine = MultiJson::Engines::JsonGem # equivalent to previous line
    MultiJson.encode({:abc => 'def'}) # encoded using the JSON gem

The <tt>engine</tt> setter takes either a symbol or a class (to allow for
custom JSON parsers) that responds to both <tt>.decode</tt> and
<tt>.encode</tt> at the class level.

MultiJSON tries to have intelligent defaulting. That is, if you have any of the
supported engines already loaded, it will utilize them before attempting to
load any. When loading, libraries are ordered by speed. First Yajl-Ruby, then
the JSON gem, then JSON pure. If no JSON library is available, MultiJSON falls
back to a bundled version of [OkJson](https://github.com/kr/okjson).

Continuous Integration
----------------------
[![Build Status](http://travis-ci.org/intridea/multi_json.png)](http://travis-ci.org/intridea/multi_json)

Contributing
------------
In the spirit of [free software](http://www.fsf.org/licensing/essays/free-sw.html), **everyone** is encouraged to help improve this project.

Here are some ways *you* can contribute:

* by using alpha, beta, and prerelease versions
* by reporting bugs
* by suggesting new features
* by writing or editing documentation
* by writing specifications
* by writing code (**no patch is too small**: fix typos, add comments, clean up inconsistent whitespace)
* by refactoring code
* by closing [issues](https://github.com/intridea/multi_json/issues)
* by reviewing patches

Submitting an Issue
-------------------
We use the [GitHub issue tracker](https://github.com/intridea/multi_json/issues) to track bugs and
features. Before submitting a bug report or feature request, check to make sure it hasn't already
been submitted. You can indicate support for an existing issuse by voting it up. When submitting a
bug report, please include a [Gist](https://gist.github.com/) that includes a stack trace and any
details that may be necessary to reproduce the bug, including your gem version, Ruby version, and
operating system. Ideally, a bug report should include a pull request with failing specs.

Submitting a Pull Request
-------------------------
1. Fork the project.
2. Create a topic branch.
3. Implement your feature or bug fix.
4. Add specs for your feature or bug fix.
5. Run <tt>bundle exec rake spec</tt>. If your changes are not 100% covered, go back to step 4.
6. Commit and push your changes.
7. Submit a pull request. Please do not include changes to the gemspec, version, or history file. (If you want to create your own version for some reason, please do so in a separate commit.)

Copyright
---------
Copyright (c) 2010 Michael Bleigh, Josh Kalderimis, Erik Michaels-Ober, and Intridea, Inc.
See [LICENSE](https://github.com/intridea/multi_json/blob/master/LICENSE.md) for details.
