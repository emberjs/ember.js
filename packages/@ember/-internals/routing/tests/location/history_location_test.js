import { run } from '@ember/runloop';
import { set } from '@ember/-internals/metal';
import HistoryLocation from '../../lib/location/history_location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let FakeHistory, HistoryTestLocation, location;

function createLocation(options) {
  if (!options) {
    options = {};
  }
  location = HistoryTestLocation.create(options);
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

moduleFor(
  'HistoryLocation',
  class extends AbstractTestCase {
    constructor() {
      super();

      FakeHistory = {
        state: null,
        _states: [],
        replaceState(state) {
          this.state = state;
          this._states[0] = state;
        },
        pushState(state) {
          this.state = state;
          this._states.unshift(state);
        },
      };

      HistoryTestLocation = HistoryLocation.extend({
        history: FakeHistory,
      });
    }

    teardown() {
      run(() => {
        if (location) {
          location.destroy();
        }
      });
    }

    ['@test HistoryLocation initState does not get fired on init'](assert) {
      assert.expect(1);

      HistoryTestLocation.reopen({
        init() {
          assert.ok(true, 'init was called');
          this._super(...arguments);
        },
        initState() {
          assert.ok(false, 'initState() should not be called automatically');
        },
      });

      createLocation();
    }

    ["@test webkit doesn't fire popstate on page load"](assert) {
      assert.expect(1);

      HistoryTestLocation.reopen({
        initState() {
          this._super(...arguments);
          // these two should be equal to be able
          // to successfully detect webkit initial popstate
          assert.equal(this._previousURL, this.getURL());
        },
      });

      createLocation();
      location.initState();
    }

    ['@test base URL is removed when retrieving the current pathname'](assert) {
      assert.expect(1);

      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'baseURL', '/base/');
        },

        initState() {
          this._super(...arguments);

          assert.equal(this.getURL(), '/foo/bar');
        },
      });

      createLocation();
      location.initState();
    }

    ['@test base URL is preserved when moving around'](assert) {
      assert.expect(2);

      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'baseURL', '/base/');
        },
      });

      createLocation();
      location.initState();
      location.setURL('/one/two');

      assert.equal(location._historyState.path, '/base/one/two');
      assert.ok(location._historyState.uuid);
    }

    ['@test setURL continues to set even with a null state (iframes may set this)'](assert) {
      createLocation();
      location.initState();

      FakeHistory.pushState(null);
      location.setURL('/three/four');

      assert.equal(location._historyState.path, '/three/four');
      assert.ok(location._historyState.uuid);
    }

    ['@test replaceURL continues to set even with a null state (iframes may set this)'](assert) {
      createLocation();
      location.initState();

      FakeHistory.pushState(null);
      location.replaceURL('/three/four');

      assert.equal(location._historyState.path, '/three/four');
      assert.ok(location._historyState.uuid);
    }

    ['@test HistoryLocation.getURL() returns the current url, excluding both rootURL and baseURL'](
      assert
    ) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'rootURL', '/app/');
          set(this, 'baseURL', '/base/');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar');
    }

    ['@test HistoryLocation.getURL() returns the current url, does not remove rootURL if its not at start of url'](
      assert
    ) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);

          set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
          set(this, 'rootURL', '/bar/');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test HistoryLocation.getURL() will not remove the rootURL when only a partial match'](
      assert
    ) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/bars/baz'));
          set(this, 'rootURL', '/bar/');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/bars/baz');
    }

    ['@test HistoryLocation.getURL() returns the current url, does not remove baseURL if its not at start of url'](
      assert
    ) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);

          set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
          set(this, 'baseURL', '/bar/');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test HistoryLocation.getURL() will not remove the baseURL when only a partial match'](
      assert
    ) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/bars/baz'));
          set(this, 'baseURL', '/bar/');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/bars/baz');
    }

    ['@test HistoryLocation.getURL() includes location.search'](assert) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin'));
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar?time=morphin');
    }

    ['@test HistoryLocation.getURL() includes location.hash'](assert) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar#pink-power-ranger'));
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar#pink-power-ranger');
    }

    ['@test HistoryLocation.getURL() includes location.hash and location.search'](assert) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin#pink-power-ranger'));
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar?time=morphin#pink-power-ranger');
    }

    ['@test HistoryLocation.getURL() drops duplicate slashes'](assert) {
      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          let location = mockBrowserLocation('//');
          location.pathname = '//'; // mockBrowserLocation does not allow for `//`, so force it
          set(this, 'location', location);
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/');
    }

    ['@test Existing state is preserved on init'](assert) {
      let existingState = {
        path: '/route/path',
        uuid: 'abcd',
      };

      FakeHistory.state = existingState;

      HistoryTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'location', mockBrowserLocation('/route/path'));
        },
      });

      createLocation();
      location.initState();
      assert.deepEqual(location.getState(), existingState);
    }
  }
);
