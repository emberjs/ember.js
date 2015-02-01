import merge from "ember-metal/merge";
import {
  replacePath,
  getPath,
  getQuery,
  getFullPath
} from "ember-routing/location/util";
import {
  supportsHistory,
  supportsHashChange
} from "ember-routing/location/util";

function mockBrowserLocation(overrides) {
  return merge({
    href: 'http://test.com/',
    pathname: '/',
    hash: '',
    search: '',
    replace: function () {
      ok(false, 'location.replace should not be called during testing');
    }
  }, overrides);
}

QUnit.module("Location Utilities");

test("replacePath cannot be used to redirect to a different origin", function() {
  expect(1);

  var expectedURL;

  var location = {
    protocol: 'http:',
    hostname: 'emberjs.com',
    port: '1337',

    replace: function (url) {
      equal(url, expectedURL);
    }
  };

  expectedURL = 'http://emberjs.com:1337//google.com';
  replacePath(location, '//google.com');
});

test("getPath() should normalize location.pathname, making sure it always returns a leading slash", function() {
  expect(2);

  var location = mockBrowserLocation({ pathname: 'test' });
  equal(getPath(location), '/test', 'When there is no leading slash, one is added.');

  location = mockBrowserLocation({ pathname: '/test' });
  equal(getPath(location), '/test', 'When a leading slash is already there, it isn\'t added again');
});

test("getQuery() should return location.search as-is", function() {
  expect(1);

  var location = mockBrowserLocation({ search: '?foo=bar' });
  equal(getQuery(location), '?foo=bar');
});

test("getFullPath() should return full pathname including query and hash", function() {
  expect(1);

  var location = mockBrowserLocation({
    href: 'http://test.com/about?foo=bar#foo',
    pathname: '/about',
    search: '?foo=bar',
    hash: '#foo'
  });

  equal(getFullPath(location), '/about?foo=bar#foo');
});

test("Feature-Detecting onhashchange", function() {
  equal(supportsHashChange(undefined, { onhashchange: function() {} }), true, "When not in IE, use onhashchange existence as evidence of the feature");
  equal(supportsHashChange(undefined, { }), false, "When not in IE, use onhashchange absence as evidence of the feature absence");
  equal(supportsHashChange(7, { onhashchange: function() {} }), false, "When in IE7 compatibility mode, never report existence of the feature");
  equal(supportsHashChange(8, { onhashchange: function() {} }), true, "When in IE8+, use onhashchange existence as evidence of the feature");
});

test("Feature-detecting the history API", function() {
  equal(supportsHistory("", { pushState: true }), true, "returns true if not Android Gingerbread and history.pushState exists");
  equal(supportsHistory("", {}), false, "returns false if history.pushState doesn't exist");
  equal(supportsHistory("", undefined), false, "returns false if history doesn't exist");
  equal(supportsHistory("Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1", { pushState: true }),
                        false, "returns false if Android Gingerbread stock browser claiming to support pushState");
});

