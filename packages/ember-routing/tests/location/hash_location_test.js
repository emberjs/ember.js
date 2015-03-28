import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import { guidFor } from "ember-metal/utils";
import run from "ember-metal/run_loop";
import HashLocation from "ember-routing/location/hash_location";

var HashTestLocation, location;

function createLocation(options) {
  if (!options) { options = {}; }
  location = HashTestLocation.create(options);
}

function mockBrowserLocation(path) {
  // This is a neat trick to auto-magically extract the hostname from any
  // url by letting the browser do the work ;)
  var tmp = document.createElement('a');
  tmp.href = path;

  var protocol = (!tmp.protocol || tmp.protocol === ':') ? 'http' : tmp.protocol;
  var pathname = (tmp.pathname.match(/^\//)) ? tmp.pathname : '/' + tmp.pathname;

  return {
    hash: tmp.hash,
    host: tmp.host || 'localhost',
    hostname: tmp.hostname || 'localhost',
    href: tmp.href,
    pathname: pathname,
    port: tmp.port || '',
    protocol: protocol,
    search: tmp.search
  };
}

QUnit.module("Ember.HashLocation", {
  setup: function() {
    HashTestLocation = HashLocation.extend({
      _location: {
        href: 'http://test.com/',
        pathname: '/',
        hash: '',
        search: '',
        replace: function () {
          ok(false, 'location.replace should not be called during testing');
        }
      }
    });
  },

  teardown: function() {
    run(function() {
      if (location) { location.destroy(); }
    });
  }
});

QUnit.test("HashLocation.getURL() returns the current url", function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#/foo/bar')
  });

  equal(location.getURL(), '/foo/bar');
});

QUnit.test("HashLocation.getURL() includes extra hashes", function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#/foo#bar#car')
  });

  equal(location.getURL(), '/foo#bar#car');
});

QUnit.test("HashLocation.getURL() assumes location.hash without #/ prefix is not a route path", function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#foo#bar')
  });

  equal(location.getURL(), '/#foo#bar');
});

QUnit.test("HashLocation.getURL() returns a normal forward slash when there is no location.hash", function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/')
  });

  equal(location.getURL(), '/');
});

QUnit.test("HashLocation.setURL() correctly sets the url", function() {
  expect(2);

  createLocation();

  location.setURL('/bar');

  equal(get(location, 'location.hash'), '/bar');
  equal(get(location, 'lastSetURL'), '/bar');
});

QUnit.test("HashLocation.replaceURL() correctly replaces to the path with a page reload", function() {
  expect(2);

  createLocation({
    _location: {
      replace: function(path) {
        equal(path, '#/foo');
      }
    }
  });

  location.replaceURL('/foo');

  equal(get(location, 'lastSetURL'), '/foo');
});

QUnit.test("HashLocation.onUpdateURL() registers a hashchange callback", function() {
  expect(3);

  var oldJquery = Ember.$;

  Ember.$ = function (element) {
    equal(element, window);
    return {
      on: function(eventName, callback) {
        equal(eventName, 'hashchange.ember-location-' + guid);
        equal(Object.prototype.toString.call(callback), '[object Function]');
      }
    };
  };

  createLocation({
    // Mock so test teardown doesn't fail
    willDestroy: function () {}
  });

  var guid = guidFor(location);

  location.onUpdateURL(function () {});

  // clean up
  Ember.$ = oldJquery;
});

QUnit.test("HashLocation.formatURL() prepends a # to the provided string", function() {
  expect(1);

  createLocation();

  equal(location.formatURL('/foo#bar'), '#/foo#bar');
});

QUnit.test("HashLocation.willDestroy() cleans up hashchange event listener", function() {
  expect(2);

  var oldJquery = Ember.$;

  Ember.$ = function (element) {
    equal(element, window);

    return {
      off: function(eventName) {
        equal(eventName, 'hashchange.ember-location-' + guid);
      }
    };
  };

  createLocation();

  var guid = guidFor(location);

  location.willDestroy();

  // noop so test teardown doesn't call our mocked jQuery again
  location.willDestroy = function() {};

  // clean up
  Ember.$ = oldJquery;
});
