#!/usr/bin/env node

global.QUnit = require('qunitjs');

// Adds test reporting.
var qe = require('qunit-extras');
qe.runInContext(global);

var glob = require('glob');
var root = 'tests/';

var OVERRIDE_FEATURES = process.env.OVERRIDE_FEATURES;
if (OVERRIDE_FEATURES) {
  var features = OVERRIDE_FEATURES.split(',');
  var EmberENV = { FEATURES: { } };
  for (var i = 0; i < features.length; i++) {
    EmberENV.FEATURES[features[i]] = true;
  }

  console.log('setting EmberENV: ', EmberENV);
  global.EmberENV = EmberENV;
}

function addFiles(files) {
  glob.sync(root + files)
    .map(function(name) {
      return "../" + name.substring(0, name.length - 3);
    })
    .forEach(require);
}

addFiles('/**/*-test.js');

QUnit.load();
