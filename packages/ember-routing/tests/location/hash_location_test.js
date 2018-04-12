import { run } from '@ember/runloop';
import { get } from 'ember-metal';
import HashLocation from '../../lib/location/hash_location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let location;

function createLocation(options, assert) {
  let HashTestLocation = HashLocation.extend({
    _location: {
      href: 'http://test.com/',
      pathname: '/',
      hash: '',
      search: '',
      replace() {
        assert.ok(false, 'location.replace should not be called during testing');
      },
    },
  });

  if (!options) {
    options = {};
  }
  location = HashTestLocation.create(options);
}

function mockBrowserLocation(path) {
  // This is a neat trick to auto-magically extract the hostname from any
  // url by letting the browser do the work ;)
  let tmp = document.createElement('a');
  tmp.href = path;

  let protocol = !tmp.protocol || tmp.protocol === ':' ? 'http' : tmp.protocol;
  let pathname = tmp.pathname.match(/^\//) ? tmp.pathname : '/' + tmp.pathname;

  return {
    hash: tmp.hash,
    host: tmp.host || 'localhost',
    hostname: tmp.hostname || 'localhost',
    href: tmp.href,
    pathname: pathname,
    port: tmp.port || '',
    protocol: protocol,
    search: tmp.search,
  };
}

function triggerHashchange() {
  var event = document.createEvent('HTMLEvents');
  event.initEvent('hashchange', true, false);
  window.dispatchEvent(event);
}

moduleFor(
  'HashLocation',
  class extends AbstractTestCase {
    teardown() {
      run(function() {
        if (location) {
          location.destroy();
        }
      });
    }

    ['@test HashLocation.getURL() returns the current url'](assert) {
      createLocation(
        {
          _location: mockBrowserLocation('/#/foo/bar'),
        },
        assert
      );

      assert.equal(location.getURL(), '/foo/bar');
    }

    ['@test HashLocation.getURL() includes extra hashes'](assert) {
      createLocation(
        {
          _location: mockBrowserLocation('/#/foo#bar#car'),
        },
        assert
      );

      assert.equal(location.getURL(), '/foo#bar#car');
    }

    ['@test HashLocation.getURL() assumes location.hash without #/ prefix is not a route path'](
      assert
    ) {
      createLocation(
        {
          _location: mockBrowserLocation('/#foo#bar'),
        },
        assert
      );

      assert.equal(location.getURL(), '/#foo#bar');
    }

    ['@test HashLocation.getURL() returns a normal forward slash when there is no location.hash'](
      assert
    ) {
      createLocation(
        {
          _location: mockBrowserLocation('/'),
        },
        assert
      );

      assert.equal(location.getURL(), '/');
    }

    ['@test HashLocation.setURL() correctly sets the url'](assert) {
      createLocation({}, assert);

      location.setURL('/bar');

      assert.equal(get(location, 'location.hash'), '/bar');
      assert.equal(get(location, 'lastSetURL'), '/bar');
    }

    ['@test HashLocation.replaceURL() correctly replaces to the path with a page reload'](assert) {
      assert.expect(2);

      createLocation(
        {
          _location: {
            replace(path) {
              assert.equal(path, '#/foo');
            },
          },
        },
        assert
      );

      location.replaceURL('/foo');

      assert.equal(get(location, 'lastSetURL'), '/foo');
    }

    ['@test HashLocation.onUpdateURL callback executes as expected'](assert) {
      assert.expect(1);

      createLocation(
        {
          _location: mockBrowserLocation('/#/foo/bar'),
        },
        assert
      );

      let callback = function(param) {
        assert.equal(param, '/foo/bar', 'path is passed as param');
      };

      location.onUpdateURL(callback);

      triggerHashchange();
    }

    ["@test HashLocation.onUpdateURL doesn't execute callback if lastSetURL === path"](assert) {
      assert.expect(0);

      createLocation(
        {
          _location: {
            href: '/#/foo/bar',
          },
          lastSetURL: '/foo/bar',
        },
        assert
      );

      let callback = function() {
        assert.ok(false, 'callback should not be called');
      };

      location.onUpdateURL(callback);

      triggerHashchange();
    }

    ['@test HashLocation.formatURL() prepends a # to the provided string'](assert) {
      createLocation({}, assert);

      assert.equal(location.formatURL('/foo#bar'), '#/foo#bar');
    }

    ['@test HashLocation.willDestroy() cleans up hashchange event listener'](assert) {
      assert.expect(1);

      createLocation({}, assert);

      let callback = function() {
        assert.ok(true, 'should invoke callback once');
      };

      location.onUpdateURL(callback);

      triggerHashchange();

      run(location, 'destroy');
      location = null;

      triggerHashchange();
    }
  }
);
