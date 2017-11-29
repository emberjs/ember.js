#!/usr/bin/env node

var RSVP  = require('rsvp');
var spawn = require('child_process').spawn;

function run(command, _args) {
  var args = _args || [];

  return new RSVP.Promise(function(resolve, reject) {
    console.log('Running: ' + command + ' ' + args.join(' '));

    var child = spawn(command, args);

    child.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    child.stderr.on('data', function(data) {
      console.error(data.toString());
    });

    child.on('error', function(err) {
      child.kill();
      reject(err);
    });

    child.on('exit', function(code) {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}


RSVP.resolve()
  .then(function() {
    return run('./node_modules/.bin/testem', ['launchers']);
  })
  .then(function() {
    return run('./node_modules/.bin/testem', ['ci', '--file', 'testem.travis-browsers.js', '--port', '7000']);
  })
  .catch(function(error) {
    console.error(error.stack);
    process.exit(1);
  })
  .finally(function() {
    process.exit(0);
  });
