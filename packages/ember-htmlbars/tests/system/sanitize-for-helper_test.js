import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

var options;
QUnit.module('ember-htmlbars: sanitize-for-helper', {
  setup: function() {
    options = {};
  },

  teardown: function() {
    ok(options.paramTypes, 'paramTypes is present');
    ok(options.hashTypes, 'hashTypes is present');
  }
});

test('will not override `paramTypes` if present', function() {
  expect(3);

  var paramTypes = [];
  options.paramTypes = paramTypes;

  sanitizeOptionsForHelper(options);

  equal(options.paramTypes, paramTypes, 'paramTypes is not changed when present');
});

test('will add `paramTypes` if not present', function() {
  expect(3);

  sanitizeOptionsForHelper(options);

  deepEqual(options.paramTypes, [], 'paramTypes is added when not present');
});

test('will not override `hashTypes` if present', function() {
  expect(3);

  var hashTypes = {};
  options.hashTypes = hashTypes;

  sanitizeOptionsForHelper(options);

  equal(options.hashTypes, hashTypes, 'hashTypes is not changed when present');
});

test('will add `hashTypes` if not present', function() {
  expect(3);

  sanitizeOptionsForHelper(options);

  deepEqual(options.hashTypes, {}, 'hashTypes is added when not present');
});
