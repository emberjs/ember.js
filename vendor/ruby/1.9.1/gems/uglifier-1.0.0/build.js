#!/usr/bin/env node

var fs     = require("fs");
var stitch = require("stitch");

var package = stitch.createPackage({
  paths: [__dirname + "/vendor/uglifyjs/lib"]
});

package.compile(function(err, source) {
  if (err) throw err;

 source = "(function(global) {" +
    source + ";\n" +
    "global.UglifyJS = {};\n" +
    "global.UglifyJS.parser = this.require('parse-js');\n" +
    "global.UglifyJS.uglify = this.require('process');\n" +
    "}).call({}, this);\n";

  fs.writeFile(__dirname + "/lib/uglify.js", source, function(err) {
    if (err) throw err;
  });
});
