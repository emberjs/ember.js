// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/onerror_test');

test('With Ember.onerror undefined, errors in Ember.run are thrown', function () {
  var thrown = new Error('Boom!'),
      caught;

  try {
    Ember.run(function() { throw thrown; });
  } catch (error) {
    caught = error;
  }

  deepEqual(caught, thrown);
});

test('With Ember.onerror set, errors in Ember.run are caught', function () {
  var thrown = new Error('Boom!'),
      caught;

  Ember.onerror = function(error) { caught = error; };

  Ember.run(function() { throw thrown; });

  deepEqual(caught, thrown);

  Ember.onerror = undefined;
});
