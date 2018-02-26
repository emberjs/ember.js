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
    return run('./node_modules/.bin/ember', [ 'sauce:connect' ]);
  })
  .then(function() {
    // Calling testem directly here instead of `ember test` so that
    // we do not have to do a double build (by the time this is run
    // we have already ran `ember build`).
    return run('./node_modules/.bin/testem', [ 'ci', '-f', 'testem.dist.json', '--port', '7000' ]);
  })
  .finally(function() {
    return run('./node_modules/.bin/ember', [ 'sauce:disconnect' ]);
  })
  .catch(function(error) {
    console.log('error');
    console.log(error);
    process.exit(1);
  }).then(function() {
    console.log('success');
    process.exit(0);
  });
