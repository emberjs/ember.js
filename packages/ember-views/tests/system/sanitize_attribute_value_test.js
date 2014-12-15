import sanitizeAttributeValue from "ember-views/system/sanitize_attribute_value";
import { SafeString } from "ember-htmlbars/utils/string";

QUnit.module('ember-views: sanitizeAttributeValue(null, "href")');

var goodProtocols = [ 'https', 'http', 'ftp', 'tel', 'file'];

for (var i = 0, l = goodProtocols.length; i < l; i++) {
  buildProtocolTest(goodProtocols[i]);
}

function buildProtocolTest(protocol) {
  test('allows ' + protocol + ' protocol when element is not provided', function() {
    expect(1);

    var expected = protocol + '://foo.com';
    var actual = sanitizeAttributeValue(null, 'href', expected);

    equal(actual, expected, 'protocol not escaped');
  });
}

test('blocks javascript: protocol', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(null, 'href', expected);

  equal(actual, 'unsafe:' + expected, 'protocol escaped');
});

test('blocks blacklisted protocols', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(null, 'href', expected);

  equal(actual, 'unsafe:' + expected, 'protocol escaped');
});

test('does not block SafeStrings', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(null, 'href', new SafeString(expected));

  equal(actual, expected, 'protocol unescaped');
});
