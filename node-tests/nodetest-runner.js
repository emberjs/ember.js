'use strict';

var glob = require('glob');
var Mocha = require('mocha');

var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec',
});

mocha.files = glob.sync('node-tests/{blueprints,acceptance,unit}/**/*-test.js');

mocha.run(function(failures) {
  process.on('exit', function() {
    process.exit(failures);
  });
});
