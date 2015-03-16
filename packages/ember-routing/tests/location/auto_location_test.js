import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import merge from "ember-metal/merge";
import AutoLocation from "ember-routing/location/auto_location";
import {
  getHistoryPath,
  getHashPath
} from "ember-routing/location/auto_location";
import HistoryLocation from "ember-routing/location/history_location";
import HashLocation from "ember-routing/location/hash_location";
import NoneLocation from "ember-routing/location/none_location";
import Registry from "container/registry";


function mockBrowserLocation(overrides) {
  return merge({
    href: 'http://test.com/',
    pathname: '/',
    hash: '',
    search: '',
    replace() {
      ok(false, 'location.replace should not be called during testing');
    }
  }, overrides);
}

function mockBrowserHistory(overrides) {
  return merge({
    pushState() {
      ok(false, 'history.pushState should not be called during testing');
    },
    replaceState() {
      ok(false, 'history.replaceState should not be called during testing');
    }
  }, overrides);
}

function createLocation(location, history) {
  var registry = new Registry();

  registry.register('location:history', HistoryLocation);
  registry.register('location:hash', HashLocation);
  registry.register('location:none', NoneLocation);

  return AutoLocation.create({
    container: registry.container(),
    location: location,
    history: history,
    global: {}
  });
}

var location;

QUnit.module("Ember.AutoLocation", {
  teardown() {
    if (location) {
      run(location, 'destroy');
    }
  }
});

QUnit.test("AutoLocation should return concrete implementation's value for `getURL`", function() {
  expect(1);

  var browserLocation = mockBrowserLocation();
  var browserHistory = mockBrowserHistory();

  location = createLocation(browserLocation, browserHistory);
  location.detect();

  var concreteImplementation = get(location, 'concreteImplementation');

  concreteImplementation.getURL = function() {
    return '/lincoln/park';
  };

  equal(location.getURL(), '/lincoln/park');
});

QUnit.test("AutoLocation should use a HistoryLocation instance when pushStates is supported", function() {
  expect(1);

  var browserLocation = mockBrowserLocation();
  var browserHistory = mockBrowserHistory();

  location = createLocation(browserLocation, browserHistory);
  location.detect();

  ok(get(location, 'concreteImplementation') instanceof HistoryLocation);
});

QUnit.test("AutoLocation should use a HashLocation instance when pushStates are not supported, but hashchange events are and the URL is already in the HashLocation format", function() {
  expect(1);

  var browserLocation = mockBrowserLocation({
    hash: '#/testd'
  });

  location = createLocation(browserLocation);
  location.global = {
    onhashchange() { }
  };

  location.detect();
  ok(get(location, 'concreteImplementation') instanceof HashLocation);
});

QUnit.test("AutoLocation should use a NoneLocation instance when neither history nor hashchange are supported.", function() {
  expect(1);

  location = createLocation(mockBrowserLocation());
  location.detect();

  ok(get(location, 'concreteImplementation') instanceof NoneLocation);
});

QUnit.test("AutoLocation should use an index path (i.e. '/') without any location.hash as OK for HashLocation", function() {
  expect(1);

  var browserLocation = mockBrowserLocation({
    href: 'http://test.com/',
    pathname: '/',
    hash: '',
    search: '',
    replace(path) {
      ok(false, 'location.replace should not be called');
    }
  });

  location = createLocation(browserLocation);
  location.global = {
    onhashchange() { }
  };

  location.detect();

  ok(get(location, 'concreteImplementation') instanceof HashLocation, "uses a HashLocation");
});

QUnit.test("AutoLocation should transform the URL for hashchange-only browsers viewing a HistoryLocation-formatted path", function() {
  expect(3);

  var browserLocation = mockBrowserLocation({
    hash: '',
    hostname: 'test.com',
    href: 'http://test.com/test',
    pathname: '/test',
    protocol: 'http:',
    port: '',
    search: '',

    replace(path) {
      equal(path, 'http://test.com/#/test', 'location.replace should be called with normalized HashLocation path');
    }
  });

  var location = createLocation(browserLocation);
  location.global = {
    onhashchange() { }
  };

  location.detect();

  ok(get(location, 'concreteImplementation') instanceof NoneLocation, 'NoneLocation should be used while we attempt to location.replace()');
  equal(get(location, 'cancelRouterSetup'), true, 'cancelRouterSetup should be set so the router knows.');
});

QUnit.test("AutoLocation should replace the URL for pushState-supported browsers viewing a HashLocation-formatted url", function() {
  expect(2);

  var browserLocation = mockBrowserLocation({
    hash: '#/test',
    hostname: 'test.com',
    href: 'http://test.com/#/test',
    pathname: '/',
    protocol: 'http:',
    port: '',
    search: ''
  });

  var browserHistory = mockBrowserHistory({
    replaceState(state, title, path) {
      equal(path, '/test', 'history.replaceState should be called with normalized HistoryLocation url');
    }
  });

  var location = createLocation(browserLocation, browserHistory);
  location.detect();

  ok(get(location, 'concreteImplementation'), HistoryLocation);
});

QUnit.test("AutoLocation requires any rootURL given to end in a trailing forward slash", function() {
  expect(3);
  var browserLocation = mockBrowserLocation();
  var expectedMsg = /rootURL must end with a trailing forward slash e.g. "\/app\/"/;

  location = createLocation(browserLocation);
  location.rootURL = 'app';

  expectAssertion(function() {
    location.detect();
  }, expectedMsg);

  location.rootURL = '/app';
  expectAssertion(function() {
    location.detect();
  }, expectedMsg);

  // Note the trailing whitespace
  location.rootURL = '/app/ ';
  expectAssertion(function() {
    location.detect();
  }, expectedMsg);
});

QUnit.test("getHistoryPath() should return a normalized, HistoryLocation-supported path", function() {
  expect(3);

  var browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  });

  equal(getHistoryPath('/app/', browserLocation), '/app/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  });
  equal(getHistoryPath('/app/', browserLocation), '/app/about?foo=bar#foo', 'HashLocation formed URLs should be normalized');

  browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  });
  equal(getHistoryPath('/app', browserLocation), '/app/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});

QUnit.test("getHashPath() should return a normalized, HashLocation-supported path", function() {
  expect(3);

  var browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  });
  equal(getHashPath('/app/', browserLocation), '/app/#/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  });
  equal(getHashPath('/app/', browserLocation), '/app/#/about?foo=bar#foo', 'HistoryLocation formed URLs should be normalized');

  browserLocation = mockBrowserLocation({
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  });

  equal(getHashPath('/app/', browserLocation), '/app/#/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});
