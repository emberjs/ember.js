import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import HistoryLocation from "ember-routing/location/history_location";

var FakeHistory, HistoryTestLocation, location,
    rootURL = window.location.pathname;

function createLocation(options){
  if(!options) { options = {}; }
  location = HistoryTestLocation.create(options);
}

module("Ember.HistoryLocation", {
  setup: function() {
    FakeHistory = {
      state: null,
      _states: [],
      replaceState: function(state, title, url){
        this.state = state;
        this._states[0] = state;
      },
      pushState: function(state, title, url){
        this.state = state;
        this._states.unshift(state);
      }
    };

    HistoryTestLocation = HistoryLocation.extend({
      history: FakeHistory
    });
  },

  teardown: function() {
    run(function() {
      if (location) { location.destroy(); }
    });
  }
});

test("HistoryLocation initState does not get fired on init", function() {
  expect(1);

  HistoryTestLocation.reopen({
    init: function(){
      ok(true, 'init was called');
      this._super();
    },
    initState: function() {
      ok(false, 'initState() should not be called automatically');
    }
  });

  createLocation();
});

test("webkit doesn't fire popstate on page load", function() {
  expect(1);

  HistoryTestLocation.reopen({
    initState: function() {
      this._super();
      // these two should be equal to be able
      // to successfully detect webkit initial popstate
      equal(this._previousURL, this.getURL());
    }
  });

  createLocation();
  location.initState();
});

test("base URL is removed when retrieving the current pathname", function() {
    expect(1);

    HistoryTestLocation.reopen({
        init: function() {
            this._super();

            set(this, 'location', { pathname: '/base/foo/bar' });
            set(this, 'baseURL', '/base/');
        },

        initState: function() {
            this._super();

            equal(this.getURL(), '/foo/bar');
        }
    });

    createLocation();
    location.initState();
});

test("base URL is preserved when moving around", function() {
    expect(1);

    HistoryTestLocation.reopen({
        init: function() {
            this._super();

            set(this, 'location', { pathname: '/base/foo/bar' });
            set(this, 'baseURL', '/base/');
        }
    });

    createLocation();
    location.initState();
    location.setURL('/one/two');

    equal(FakeHistory.state.path, '/base/one/two');
});

test("setURL continues to set even with a null state (iframes may set this)", function() {
    expect(1);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.setURL('/three/four');

    equal(FakeHistory.state && FakeHistory.state.path, '/three/four');
});

test("replaceURL continues to set even with a null state (iframes may set this)", function() {
    expect(1);

    createLocation();
    location.initState();

    FakeHistory.pushState(null);
    location.replaceURL('/three/four');

    equal(FakeHistory.state && FakeHistory.state.path, '/three/four');
});

test("HistoryLocation.getURL() returns the current url, excluding both rootURL and baseURL", function() {
    expect(1);

    HistoryTestLocation.reopen({
        init: function() {
            this._super();

            set(this, 'location', { pathname: '/base/foo/bar' });
            set(this, 'rootURL', '/app/');
            set(this, 'baseURL', '/base/');
        }
    });

    createLocation();

    equal(location.getURL(), '/foo/bar');
});
