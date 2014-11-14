import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

var options;
QUnit.module('ember-htmlbars: sanitize-for-helper', {
  setup: function() {
    options = {};
  },

  teardown: function() {
    ok(options.types, 'types is present');
    ok(options.hash, 'hash is present');
    ok(options.hashTypes, 'hashTypes is present');
  }
});

test('will not override `types` if present', function() {
  expect(4);

  var types = [];
  options.types = types;

  sanitizeOptionsForHelper(options);

  equal(options.types, types, 'types is not changed when present');
});

test('will add `types` if not present', function() {
  expect(4);

  sanitizeOptionsForHelper(options);

  deepEqual(options.types, [], 'types is added when not present');
});

test('will not override `hash` if present', function() {
  expect(4);

  var hash = {};
  options.hash = hash;

  sanitizeOptionsForHelper(options);

  equal(options.hash, hash, 'hash is not changed when present');
});

test('will add `hash` if not present', function() {
  expect(4);

  sanitizeOptionsForHelper(options);

  deepEqual(options.hash, {}, 'hash is added when not present');
});

test('will not override `hashTypes` if present', function() {
  expect(4);

  var hashTypes = {};
  options.hashTypes = hashTypes;

  sanitizeOptionsForHelper(options);

  equal(options.hashTypes, hashTypes, 'hashTypes is not changed when present');
});

test('will add `hashTypes` if not present', function() {
  expect(4);

  sanitizeOptionsForHelper(options);

  deepEqual(options.hashTypes, {}, 'hashTypes is added when not present');
});
