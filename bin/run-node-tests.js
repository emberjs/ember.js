#!/usr/bin/env node

var QUnit = global.QUnit = require('qunitjs');
var path = require('path');
var glob = require('glob');
var qunitTap = require('qunit-tap');
var tap = qunitTap(QUnit, function() { console.log.apply(console, arguments); });

tap.done = function(results) {
  if (results.failed) {
    process.exit(1);
  }
}

glob.sync('./dist/node_modules/@glimmer/node/tests/**/*-test.js').forEach(function(file) {
  require(path.resolve(file));
});

QUnit.load();
