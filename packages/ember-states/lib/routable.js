require('ember-states/state');

var get = Ember.get, getPath = Ember.getPath;

// The Ember Routable mixin assumes the existance of a simple
// routing shim that supports the following three behaviors:
//
// * .getUrl() - this is called when the page loads
// * .setUrl(newUrl) - this is called from within the state
//   manager when the state changes to a routable state
// * .onUrlChange(callback) - this happens when the user presses
//   the back or forward button

Ember._RouteMatcher = Ember.Object.extend({
  state: null,

  match: function(path) {
    if (path[0] === '/') {
      path = path.substr(1);
    }

    var childStates = getPath(this, 'state.childStates');
    var remaining;

    var state = childStates.find(function(state) {
      var route = get(state, 'route');
      var match = path.substr(0, route.length);

      if (match === route) {
        var nextChar = route[match.length];

        if (nextChar === undefined || nextChar === "/") {
          remaining = path.substr(match.length);
          return true;
        }
      }
    });

    if (state) {
      return {
        state: state,
        remaining: remaining,
        hash: {}
      };
    }
  }
});

Ember.Routable = Ember.Mixin.create({
  init: function() {
    this.on('enter', this, this.enterRoute);

    this._super();
  },

  enterRoute: function(manager) {
    if (get(this, 'isRoutable')) {
      this.updateRoute(manager, get(manager, 'location'));
    }
  },

  isRoutable: Ember.computed(function() {
    return typeof this.updateRoute === "function";
  }).cacheable(),

  routeMatcher: Ember.computed(function() {
    return Ember._RouteMatcher.create({ state: this });
  }).cacheable(),

  routePath: function(manager, path) {
    var matcher = this.get('routeMatcher');
    var match = matcher.match(path);

    Ember.assert("Could not find state for path " + path, !!match || !path);

    if (match) {
      manager.enableLogging = true;
      manager.goToState(get(match.state, 'path'));
      manager.send('routePath', match.remaining);
    }
  }
});

Ember.State.reopen(Ember.Routable);

Ember.RoutableStateManager = Ember.Mixin.create({
  route: function(path) {
    if (path[0] === '/') {
      path = path.substr(1);
    }

    this.send('routePath', path);
  }
});

Ember.StateManager.reopen(Ember.RoutableStateManager);
