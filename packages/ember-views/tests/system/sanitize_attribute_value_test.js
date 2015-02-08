import sanitizeAttributeValue from "ember-views/system/sanitize_attribute_value";
import { SafeString } from "ember-htmlbars/utils/string";
import DOMHelper from "dom-helper";

QUnit.module('ember-views: sanitizeAttributeValue(null, "href")');

var goodProtocols = ['https', 'http', 'ftp', 'tel', 'file'];
var dom = new DOMHelper();

for (var i = 0, l = goodProtocols.length; i < l; i++) {
  buildProtocolTest(goodProtocols[i]);
}

function buildProtocolTest(protocol) {
  QUnit.test('allows ' + protocol + ' protocol when element is not provided', function() {
    expect(1);

    var expected = protocol + '://foo.com';
    var actual = sanitizeAttributeValue(dom, null, 'href', expected);

    equal(actual, expected, 'protocol not escaped');
  });
}

QUnit.test('blocks javascript: protocol', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(dom, null, 'href', expected);

  equal(actual, 'unsafe:' + expected, 'protocol escaped');
});

QUnit.test('blocks blacklisted protocols', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(dom, null, 'href', expected);

  equal(actual, 'unsafe:' + expected, 'protocol escaped');
});

QUnit.test('does not block SafeStrings', function() {
  /* jshint scripturl:true */

  expect(1);

  var expected = 'javascript:alert("foo")';
  var actual = sanitizeAttributeValue(dom, null, 'href', new SafeString(expected));

  equal(actual, expected, 'protocol unescaped');
});
