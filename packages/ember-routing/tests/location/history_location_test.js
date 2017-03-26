import {
  set,
  run
} from 'ember-metal';
import HistoryLocation from '../../location/history_location';
import { EMBER_UNIQUE_LOCATION_HISTORY_STATE } from 'ember/features';

let FakeHistory, HistoryTestLocation, location;

function createLocation(options) {
  if (!options) { options = {}; }
  location = HistoryTestLocation.create(options);
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

QUnit.module('Ember.HistoryLocation', {
  setup() {
    FakeHistory = {
      state: null,
      _states: [],
      replaceState(state, title, url) {
        this.state = state;
        this._states[0] = state;
      },
      pushState(state, title, url) {
        this.state = state;
        this._states.unshift(state);
      }
    };

    HistoryTestLocation = HistoryLocation.extend({
      history: FakeHistory
    });
  },

  teardown() {
    run(() => {
      if (location) { location.destroy(); }
    });
  }
});

QUnit.test('HistoryLocation initState does not get fired on init', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      ok(true, 'init was called');
      this._super(...arguments);
    },
    initState() {
      ok(false, 'initState() should not be called automatically');
    }
  });

  createLocation();
});

QUnit.test('webkit doesn\'t fire popstate on page load', function() {
  expect(1);

  HistoryTestLocation.reopen({
    initState() {
      this._super(...arguments);
      // these two should be equal to be able
      // to successfully detect webkit initial popstate
      equal(this._previousURL, this.getURL());
    }
  });

  createLocation();
  location.initState();
});

QUnit.test('base URL is removed when retrieving the current pathname', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);

      set(this, 'location', mockBrowserLocation('/base/foo/bar'));
      set(this, 'baseURL', '/base/');
    },

    initState() {
      this._super(...arguments);

      equal(this.getURL(), '/foo/bar');
    }
  });

  createLocation();
  location.initState();
});

if (EMBER_UNIQUE_LOCATION_HISTORY_STATE) {
  QUnit.test('base URL is preserved when moving around', function() {
    expect(2);

    HistoryTestLocation.reopen({
      init() {
        this._super(...arguments);

        set(this, 'location', mockBrowserLocation('/base/foo/bar'));
        set(this, 'baseURL', '/base/');
      }
    });

    createLocation();
    location.initState();
    location.setURL('/one/two');

    equal(location._historyState.path, '/base/one/two');
    ok(location._historyState.uuid);
  });

  QUnit.test('setURL continues to set even with a null state (iframes may set this)', function() {
    expect(2);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.setURL('/three/four');

    equal(location._historyState.path, '/three/four');
    ok(location._historyState.uuid);
  });

  QUnit.test('replaceURL continues to set even with a null state (iframes may set this)', function() {
    expect(2);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.replaceURL('/three/four');

    equal(location._historyState.path, '/three/four');
    ok(location._historyState.uuid);
  });
} else {
  QUnit.test('base URL is preserved when moving around', function() {
    expect(1);

    HistoryTestLocation.reopen({
      init() {
        this._super(...arguments);

        set(this, 'location', mockBrowserLocation('/base/foo/bar'));
        set(this, 'baseURL', '/base/');
      }
    });

    createLocation();
    location.initState();
    location.setURL('/one/two');

    equal(location._historyState.path, '/base/one/two');
  });

  QUnit.test('setURL continues to set even with a null state (iframes may set this)', function() {
    expect(1);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.setURL('/three/four');

    equal(location._historyState.path, '/three/four');
  });

  QUnit.test('replaceURL continues to set even with a null state (iframes may set this)', function() {
    expect(1);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.replaceURL('/three/four');

    equal(location._historyState.path, '/three/four');
  });
}

QUnit.test('HistoryLocation.getURL() returns the current url, excluding both rootURL and baseURL', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);

      set(this, 'location', mockBrowserLocation('/base/foo/bar'));
      set(this, 'rootURL', '/app/');
      set(this, 'baseURL', '/base/');
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar');
});

QUnit.test('HistoryLocation.getURL() returns the current url, does not remove rootURL if its not at start of url', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);

      set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
      set(this, 'rootURL', '/bar/');
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar/baz');
});

QUnit.test('HistoryLocation.getURL() will not remove the rootURL when only a partial match', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'location', mockBrowserLocation('/bars/baz'));
      set(this, 'rootURL', '/bar/');
    }
  });

  createLocation();

  equal(location.getURL(), '/bars/baz');
});

QUnit.test('HistoryLocation.getURL() returns the current url, does not remove baseURL if its not at start of url', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);

      set(this, 'location', mockBrowserLocation('/foo/bar/baz'));
      set(this, 'baseURL', '/bar/');
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar/baz');
});

QUnit.test('HistoryLocation.getURL() will not remove the baseURL when only a partial match', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'location', mockBrowserLocation('/bars/baz'));
      set(this, 'baseURL', '/bar/');
    }
  });

  createLocation();

  equal(location.getURL(), '/bars/baz');
});

QUnit.test('HistoryLocation.getURL() includes location.search', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin'));
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar?time=morphin');
});

QUnit.test('HistoryLocation.getURL() includes location.hash', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'location', mockBrowserLocation('/foo/bar#pink-power-ranger'));
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar#pink-power-ranger');
});

QUnit.test('HistoryLocation.getURL() includes location.hash and location.search', function() {
  expect(1);

  HistoryTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'location', mockBrowserLocation('/foo/bar?time=morphin#pink-power-ranger'));
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar?time=morphin#pink-power-ranger');
});
