import { normalizeProperty } from 'dom-helper/prop';

QUnit.module('dom-helper prop');

test('returns `undefined` for special element properties that are non-compliant in certain browsers', function() {
  expect(3);

  var badPairs = [
    { tagName: 'BUTTON', key: 'type' },
    { tagName: 'INPUT', key: 'type' },
    { tagName: 'INPUT', key: 'list' }
  ];

  badPairs.forEach(function(pair) {
    var element = {
      tagName: pair.tagName
    };

    Object.defineProperty(element, pair.key, {
      set: function() {
        throw new Error('I am a bad browser!');
      }
    });

    var actual = normalizeProperty(element, pair.key);
    equal(actual, undefined);
  });
});
