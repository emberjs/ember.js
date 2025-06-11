import { run } from '@ember/runloop';
import { set } from '@ember/object';
import HistoryLocation from '@ember/routing/history-location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let FakeHistory, HistoryTestLocation, location;

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

      HistoryTestLocation = class extends HistoryLocation {
        history = FakeHistory;
      };
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

      class TestLocation extends HistoryTestLocation {
        init() {
          assert.ok(true, 'init was called');
          super.init(...arguments);
        }

        initState() {
          assert.ok(false, 'initState() should not be called automatically');
        }
      }

      location = TestLocation.create();
    }

    ["@test webkit doesn't fire popstate on page load"](assert) {
      assert.expect(1);

      class TestLocation extends HistoryTestLocation {
        initState() {
          super.initState(...arguments);
          // these two should be equal to be able
          // to successfully detect webkit initial popstate
          assert.equal(this._previousURL, this.getURL());
        }
      }

      location = TestLocation.create();
      location.initState();
    }

    ['@test <base> with href sets `baseURL`'](assert) {
      assert.expect(1);

      let base = document.createElement('base');
      base.setAttribute('href', '/foo/');

      document.head.appendChild(base);

      try {
        location = HistoryTestLocation.create();
        location.initState();

        assert.strictEqual(location.get('baseURL'), '/foo/');
      } finally {
        document.head.removeChild(base);
      }
    }

    ['@test <base> without href is ignored'](assert) {
      assert.expect(1);

      let base = document.createElement('base');
      base.setAttribute('target', '_parent');

      document.head.appendChild(base);

      try {
        location = HistoryTestLocation.create();
        location.initState();

        assert.strictEqual(location.get('baseURL'), '');
      } finally {
        document.head.removeChild(base);
      }
    }

    ['@test base URL is removed when retrieving the current pathname'](assert) {
      assert.expect(1);

      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'baseURL', '/base/');
        }

        initState() {
          super.initState(...arguments);

          assert.equal(this.getURL(), '/foo/bar');
        }
      }

      location = TestLocation.create();
      location.initState();
    }

    ['@test base URL is preserved when moving around'](assert) {
      assert.expect(2);

      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'baseURL', '/base/');
        }
      }

      location = TestLocation.create();
      location.initState();
      location.setURL('/one/two');

      assert.equal(location.history.state.path, '/base/one/two');
      assert.ok(location.history.state.uuid);
    }

    ['@test setURL continues to set even with a null state (iframes may set this)'](assert) {
      location = HistoryTestLocation.create();
      location.initState();

      FakeHistory.pushState(null);
      location.setURL('/three/four');

      assert.equal(location.history.state.path, '/three/four');
      assert.ok(location.history.state.uuid);
    }

    ['@test replaceURL continues to set even with a null state (iframes may set this)'](assert) {
      location = HistoryTestLocation.create();
      location.initState();

      FakeHistory.pushState(null);
      location.replaceURL('/three/four');

      assert.equal(location.history.state.path, '/three/four');
      assert.ok(location.history.state.uuid);
    }

    ['@test HistoryLocation.getURL() returns the current url, excluding both rootURL and baseURL'](
      assert
    ) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);

          set(this, 'location', mockBrowserLocation('/base/foo/bar'));
          set(this, 'rootURL', '/app/');
          set(this, 'baseURL', '/base/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar');
    }

    ['@test HistoryLocation.getURL() returns the current url, does not remove rootURL if its not at start of url'](
      assert
    ) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);

          set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
          set(this, 'rootURL', '/bar/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test HistoryLocation.getURL() will not remove the rootURL when only a partial match'](
      assert
    ) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/bars/baz'));
          set(this, 'rootURL', '/bar/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/bars/baz');
    }

    ['@test HistoryLocation.getURL() returns the current url, does not remove baseURL if its not at start of url'](
      assert
    ) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);

          set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
          set(this, 'baseURL', '/bar/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test HistoryLocation.getURL() will not remove the baseURL when only a partial match'](
      assert
    ) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/bars/baz'));
          set(this, 'baseURL', '/bar/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/bars/baz');
    }

    ['@test HistoryLocation.getURL() includes location.search'](assert) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin'));
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar?time=morphin');
    }

    ['@test HistoryLocation.getURL() includes location.hash'](assert) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar#pink-power-ranger'));
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar#pink-power-ranger');
    }

    ['@test HistoryLocation.getURL() includes location.hash and location.search'](assert) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin#pink-power-ranger'));
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar?time=morphin#pink-power-ranger');
    }

    ['@test HistoryLocation.getURL() drops duplicate slashes'](assert) {
      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          let location = mockBrowserLocation('//admin//profile//');
          location.pathname = '//admin//profile//'; // mockBrowserLocation does not allow for `//`, so force it
          set(this, 'location', location);
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/admin/profile/');
    }

    ['@test Existing state is preserved on init'](assert) {
      let existingState = {
        path: '/route/path',
        uuid: 'abcd',
      };

      FakeHistory.state = existingState;

      class TestLocation extends HistoryTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'location', mockBrowserLocation('/route/path'));
        }
      }

      location = TestLocation.create();
      location.initState();
      assert.deepEqual(location.history.state, existingState);
    }
  }
);
