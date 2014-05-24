#!/usr/bin/env node

var RSVP = require('rsvp');
var spawn = require('child_process').spawn;
var chalk = require('chalk');

run('phantomjs', ['bower_components/qunit-phantom-runner/runner.js', './dist/test/index.html']);

function run(command, args) {
  return new RSVP.Promise(function(resolve, reject) {

    console.log('Running: ' + command + ' ' + args.join(' '));

    var child = spawn(command, args);
    var result = {output: [], errors: [], code: null};

    child.stdout.on('data', function (data) {
      var string = data.toString();
      var lines = string.split('\n');

      lines.forEach(function(line) {
        if (line.indexOf('0 failed.') > -1) {
          console.log(chalk.green(line));
        } else {
          console.log(line);
        }
      });
      result.output.push(string);
    });

    child.stderr.on('data', function (data) {
      var string = data.toString();
      result.errors.push(string);
      console.error(chalk.red(string));
    });

    child.on('close', function (code) {
      result.code = code;

      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });
}
