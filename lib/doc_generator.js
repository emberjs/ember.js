'use strict';

var calculateVersion = require('../lib/calculate-version');
var exec             = require('child_process').exec;
var fs               = require('fs');

function DocGenerator(options) {
  options = options || {};
  this.exec = options.exec || require('child_process').exec;
}

DocGenerator.prototype.generate = function() {
  var command = 'cd docs && ' + fs.realpathSync('./node_modules/.bin/yuidoc') +
                ' -p -q --project-version ' + calculateVersion();

  console.log('Executing command: ' + command);
  this.exec(command, function(error, stdout, stderr){
    if (error !== null) {
      console.log('Error: ' + error);
    }
  });
};

module.exports = DocGenerator;
