import { get, run } from 'ember-metal';
import HashLocation from '../../location/hash_location';

let HashTestLocation, location;

function createLocation(options) {
  if (!options) { options = {}; }
  location = HashTestLocation.create(options);
}

function mockBrowserLocation(path) {
  // This is a neat trick to auto-magically extract the hostname from any
  // url by letting the browser do the work ;)
  let tmp = document.createElement('a');
  tmp.href = path;

  let protocol = (!tmp.protocol || tmp.protocol === ':') ? 'http' : tmp.protocol;
  let pathname = (tmp.pathname.match(/^\//)) ? tmp.pathname : '/' + tmp.pathname;

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

function triggerHashchange() {
  var event = document.createEvent('HTMLEvents');
  event.initEvent('hashchange', true, false);
  window.dispatchEvent(event);
}

QUnit.module('Ember.HashLocation', {
  setup() {
    HashTestLocation = HashLocation.extend({
      _location: {
        href: 'http://test.com/',
        pathname: '/',
        hash: '',
        search: '',
        replace() {
          ok(false, 'location.replace should not be called during testing');
        }
      }
    });
  },

  teardown() {
    run(function() {
      if (location) { location.destroy(); }
    });
  }
});

QUnit.test('HashLocation.getURL() returns the current url', function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#/foo/bar')
  });

  equal(location.getURL(), '/foo/bar');
});

QUnit.test('HashLocation.getURL() includes extra hashes', function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#/foo#bar#car')
  });

  equal(location.getURL(), '/foo#bar#car');
});

QUnit.test('HashLocation.getURL() assumes location.hash without #/ prefix is not a route path', function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#foo#bar')
  });

  equal(location.getURL(), '/#foo#bar');
});

QUnit.test('HashLocation.getURL() returns a normal forward slash when there is no location.hash', function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/')
  });

  equal(location.getURL(), '/');
});

QUnit.test('HashLocation.setURL() correctly sets the url', function() {
  expect(2);

  createLocation();

  location.setURL('/bar');

  equal(get(location, 'location.hash'), '/bar');
  equal(get(location, 'lastSetURL'), '/bar');
});

QUnit.test('HashLocation.replaceURL() correctly replaces to the path with a page reload', function() {
  expect(2);

  createLocation({
    _location: {
      replace(path) {
        equal(path, '#/foo');
      }
    }
  });

  location.replaceURL('/foo');

  equal(get(location, 'lastSetURL'), '/foo');
});

QUnit.test('HashLocation.onUpdateURL callback executes as expected', function() {
  expect(1);

  createLocation({
    _location: mockBrowserLocation('/#/foo/bar')
  });

  let callback = function (param) {
    equal(param, '/foo/bar', 'path is passed as param');
  };

  location.onUpdateURL(callback);

  triggerHashchange();
});

QUnit.test('HashLocation.onUpdateURL doesn\'t execute callback if lastSetURL === path', function() {
  expect(0);

  createLocation({
    _location: {
      href: '/#/foo/bar'
    },
    lastSetURL: '/foo/bar'
  });

  let callback = function (param) {
    ok(false, 'callback should not be called');
  };

  location.onUpdateURL(callback);

  triggerHashchange();
});

QUnit.test('HashLocation.formatURL() prepends a # to the provided string', function() {
  expect(1);

  createLocation();

  equal(location.formatURL('/foo#bar'), '#/foo#bar');
});

QUnit.test('HashLocation.willDestroy() cleans up hashchange event listener', function() {
  expect(1);

  createLocation();

  let callback = function (param) {
    ok(true, 'should invoke callback once');
  };

  location.onUpdateURL(callback);

  triggerHashchange();

  run(location, 'destroy');
  location = null;

  triggerHashchange();
});
