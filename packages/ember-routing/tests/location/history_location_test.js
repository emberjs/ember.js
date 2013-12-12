var FakeHistory, HistoryTestLocation, location,
    get = Ember.get,
    set = Ember.set,
    rootURL = window.location.pathname;

function createLocation(options){
  if(!options) { options = {}; }
  location = HistoryTestLocation.create(options);
}

module("History Location", {
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

    HistoryTestLocation = Ember.HistoryLocation.extend({
      history: FakeHistory
    });
  },

  teardown: function() {
    Ember.run(function() {
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
