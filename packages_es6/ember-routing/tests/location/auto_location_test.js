import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import copy from "ember-runtime/copy";
import EmberObject from "ember-runtime/system/object";
import AutoLocation from "ember-routing/location/auto_location";
import EmberLocation from "ember-routing/location/api";

var AutoTestLocation, location, supportsHistory, supportsHashChange,
    getSupportsHistory = AutoLocation._getSupportsHistory,
    getSupportsHashChange = AutoLocation._getSupportsHashChange;

var FakeHistoryLocation = EmberObject.extend({
  implementation: 'history'
});

var FakeHashLocation = EmberObject.extend({
  implementation: 'hash'
});

var FakeNoneLocation = EmberObject.extend({
  implementation: 'none'
});

function createLocation(options) {
  if (!options) { options = {}; }
  location = AutoTestLocation.create(options);
}

module("Ember.AutoLocation", {
  setup: function() {
    supportsHistory = supportsHashChange = null;

    AutoTestLocation = copy(AutoLocation);

    AutoTestLocation._HistoryLocation = FakeHistoryLocation;
    AutoTestLocation._HashLocation = FakeHashLocation;
    AutoTestLocation._NoneLocation = FakeNoneLocation;

    AutoTestLocation._getSupportsHistory = function () {
      if (supportsHistory !== null) {
        return supportsHistory;
      } else {
        return getSupportsHistory.call(this);
      }
    };

    AutoTestLocation._getSupportsHashChange = function () {
      if (supportsHashChange !== null) {
        return supportsHashChange;
      } else {
        return getSupportsHashChange.call(this);
      }
    };

    AutoTestLocation._location = {
      href: 'http://test.com/',
      pathname: '/',
      hash: '',
      search: '',
      replace: function () {
        ok(false, 'location.replace should not be called');
      }
    };

    AutoTestLocation._history = {
      pushState: function () {
        ok(false, 'history.pushState should not be called');
      },
      replaceState: function () {
        ok(false, 'history.replaceState should not be called');
      }
    };
  },

  teardown: function() {
    run(function() {
      if (location) { location.destroy(); }
      AutoTestLocation = null;
    });
  }
});

test("replacePath cannot be used to redirect to a different origin (website)", function() {
  expect(1);

  var expectedURL;

  AutoTestLocation._location = {
    protocol: 'http:',
    hostname: 'emberjs.com',
    port: '1337',

    replace: function (url) {
      equal(url, expectedURL);
    }
  };

  expectedURL = 'http://emberjs.com:1337//google.com';
  AutoTestLocation._replacePath('//google.com');
});

test("AutoLocation.create() should return a HistoryLocation instance when pushStates are supported", function() {
  expect(2);

  supportsHistory = true;

  createLocation();

  equal(get(location, 'implementation'), 'history');
  equal(location instanceof FakeHistoryLocation, true);
});

test("AutoLocation.create() should return a HashLocation instance when pushStates are not supported, but hashchange events are and the URL is already in the HashLocation format", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation._location.hash = '#/testd';

  createLocation();

  equal(get(location, 'implementation'), 'hash');
  equal(location instanceof FakeHashLocation, true);
});

test("AutoLocation.create() should return a NoneLocation instance when neither history nor hashchange is supported.", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = false;

  AutoTestLocation._location.hash = '#/testd';

  createLocation();

  equal(get(location, 'implementation'), 'none');
  equal(location instanceof FakeNoneLocation, true);
});

test("AutoLocation.create() should consider an index path (i.e. '/\') without any location.hash as OK for HashLocation", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation._location = {
    href: 'http://test.com/',
    pathname: '/',
    hash: '',
    search: '',
    replace: function (path) {
      ok(false, 'location.replace should not be called');
    }
  };

  createLocation();

  equal(get(location, 'implementation'), 'hash');
  equal(location instanceof FakeHashLocation, true);
});

test("AutoLocation._getSupportsHistory() should use `history.pushState` existance as proof of support", function() {
  expect(3);

  AutoTestLocation._history.pushState = function () {};
  equal(AutoTestLocation._getSupportsHistory(), true, 'Returns true if `history.pushState` exists');

  delete AutoTestLocation._history.pushState;
  equal(AutoTestLocation._getSupportsHistory(), false, 'Returns false if `history.pushState` does not exist');

  AutoTestLocation._history = undefined;
  equal(AutoTestLocation._getSupportsHistory(), false, 'Returns false if `history` does not exist');
});

test("AutoLocation.create() should transform the URL for hashchange-only browsers viewing a HistoryLocation-formatted path", function() {
  expect(4);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation._location = {
    hash: '',
    hostname: 'test.com',
    href: 'http://test.com/test',
    pathname: '/test',
    protocol: 'http:',
    port: '',
    search: '',

    replace: function (path) {
      equal(path, 'http://test.com/#/test', 'location.replace should be called with normalized HashLocation path');
    }
  };

  createLocation();

  equal(get(location, 'implementation'), 'none', 'NoneLocation should be returned while we attempt to location.replace()');
  equal(location instanceof FakeNoneLocation, true, 'NoneLocation should be returned while we attempt to location.replace()');
  equal(get(location, 'cancelRouterSetup'), true, 'cancelRouterSetup should be set so the router knows.');
});

test("AutoLocation.create() should transform the URL for pushState-supported browsers viewing a HashLocation-formatted url", function() {
  expect(4);

  supportsHistory = true;
  supportsHashChange = true;

  AutoTestLocation._location = {
    hash: '#/test',
    hostname: 'test.com',
    href: 'http://test.com/#/test',
    pathname: '/',
    protocol: 'http:',
    port: '',
    search: '',

    replace: function (path) {
      equal(path, 'http://test.com/test', 'location.replace should be called with normalized HistoryLocation url');
    }
  };

  createLocation();

  equal(get(location, 'implementation'), 'none', 'NoneLocation should be returned while we attempt to location.replace()');
  equal(location instanceof FakeNoneLocation, true, 'NoneLocation should be returned while we attempt to location.replace()');
  equal(get(location, 'cancelRouterSetup'), true, 'cancelRouterSetup should be set so the router knows.');
});

test("AutoLocation._getSupportsHistory() should handle false positive for Android 2.2/2.3, returning false", function() {
  expect(1);

  var fakeNavigator = {
    userAgent: 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
  };

  AutoTestLocation._window.navigator = fakeNavigator;

  equal(AutoTestLocation._getSupportsHistory(), false);
});

test("AutoLocation._getSupportsHashChange() should use `onhashchange` event existance as proof of support", function() {
  expect(2);

  AutoTestLocation._window.onhashchange = null;
  equal(AutoTestLocation._getSupportsHashChange(), true, 'Returns true if `onhashchange` exists');

  AutoTestLocation._window = {
    navigator: window.navigator,
    document: {}
  };

  equal(AutoTestLocation._getSupportsHashChange(), false, 'Returns false if `onhashchange` does not exist');
});

test("AutoLocation._getSupportsHashChange() should handle false positive for IE8 running in IE7 compatibility mode, returning false", function() {
  expect(1);

  AutoTestLocation._window = {
    onhashchange: null,
    document: {
      documentMode: 7
    }
  };

  equal(AutoTestLocation._getSupportsHashChange(), false);
});

test("AutoLocation._getPath() should normalize location.pathname, making sure it always returns a leading slash", function() {
  expect(2);

  AutoTestLocation._location = { pathname: 'test' };
  equal(AutoTestLocation._getPath(), '/test', 'When there is no leading slash, one is added.');

  AutoTestLocation._location = { pathname: '/test' };
  equal(AutoTestLocation._getPath(), '/test', 'When a leading slash is already there, it isn\'t added again');
});

test("AutoLocation._getHash() should be an alias to Ember.Location._getHash, otherwise it needs its own test!", function() {
  expect(1);

  equal(AutoTestLocation._getHash, EmberLocation._getHash);
});

test("AutoLocation._getQuery() should return location.search as-is", function() {
  expect(1);

  AutoTestLocation._location = { search: '?foo=bar' };
  equal(AutoTestLocation._getQuery(), '?foo=bar');
});

test("AutoLocation._getFullPath() should return full pathname including query and hash", function() {
  expect(1);

  AutoTestLocation._location = {
    href: 'http://test.com/about?foo=bar#foo',
    pathname: '/about',
    search: '?foo=bar',
    hash: '#foo'
  };

  equal(AutoTestLocation._getFullPath(), '/about?foo=bar#foo');
});

test("AutoLocation._getHistoryPath() should return a normalized, HistoryLocation-supported path", function() {
  expect(3);

  AutoTestLocation._rootURL = '/app/';

  AutoTestLocation._location = {
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  };
  equal(AutoTestLocation._getHistoryPath(), '/app/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  AutoTestLocation._location = {
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  };
  equal(AutoTestLocation._getHistoryPath(), '/app/about?foo=bar#foo', 'HashLocation formed URLs should be normalized');

  AutoTestLocation._location = {
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  };
  equal(AutoTestLocation._getHistoryPath(), '/app/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});

test("AutoLocation._getHashPath() should return a normalized, HashLocation-supported path", function() {
  expect(3);

  AutoTestLocation._rootURL = '/app/';

  AutoTestLocation._location = {
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  };
  equal(AutoTestLocation._getHashPath(), '/app/#/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  AutoTestLocation._location = {
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  };
  equal(AutoTestLocation._getHashPath(), '/app/#/about?foo=bar#foo', 'HistoryLocation formed URLs should be normalized');

  AutoTestLocation._location = {
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  };

  equal(AutoTestLocation._getHashPath(), '/app/#/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});
