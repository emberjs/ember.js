var RSVP = require('rsvp');

module.exports = function runInSequence(tasks) {
  var length = tasks.length;
  var current = RSVP.Promise.resolve();
  var results = new Array(length);

  for (var i = 0; i < length; ++i) {
    current = results[i] = current.then(tasks[i]);
  }

  return RSVP.Promise.all(results);
};
