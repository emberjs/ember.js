var get = Ember.get, getPath = Ember.getPath;

// The Ember Routable mixin assumes the existance of a simple
// routing shim that supports the following three behaviors:
//
// * .getURL() - this is called when the page loads
// * .setURL(newURL) - this is called from within the state
//   manager when the state changes to a routable state
// * .onURLChange(callback) - this happens when the user presses
//   the back or forward button

Ember.Routable = Ember.Mixin.create({
  init: function() {
    this.on('setupControllers', this, this.stashContext);

    this._super();
  },

  stashContext: function(manager, context) {
    var meta = get(manager, 'stateMeta'),
        serialized = this.serialize(manager, context);

    meta.set(this, serialized);

    if (get(this, 'isRoutable')) {
      this.updateRoute(manager, get(manager, 'location'));
    }
  },

  updateRoute: function(manager, location) {
    if (location && get(this, 'isLeaf')) {
      var path = this.absoluteRoute(manager);
      location.setURL(path);
    }
  },

  absoluteRoute: function(manager) {
    var parentState = get(this, 'parentState');
    var path = '';

    if (get(parentState, 'isRoutable')) {
      path = parentState.absoluteRoute(manager);
    }

    var matcher = get(this, 'routeMatcher'),
        hash = get(manager, 'stateMeta').get(this);

    var generated = matcher.generate(hash);

    if (generated !== "") {
      return path + '/' + matcher.generate(hash);
    } else {
      return path;
    }
  },

  isRoutable: Ember.computed(function() {
    return typeof this.route === "string";
  }).cacheable(),

  routeMatcher: Ember.computed(function() {
    return Ember._RouteMatcher.create({ route: get(this, 'route') });
  }).cacheable(),

  deserialize: function(manager, context) {
    return context;
  },

  serialize: function(manager, context) {
    return context;
  },

  routePath: function(manager, path) {
    if (get(this, 'isLeaf')) { return; }

    var childStates = get(this, 'childStates'), match;

    childStates = childStates.sort(function(a, b) {
      return getPath(b, 'route.length') - getPath(a, 'route.length');
    });

    var state = childStates.find(function(state) {
      var matcher = get(state, 'routeMatcher');
      if (match = matcher.match(path)) { return true; }
    });

    Ember.assert("Could not find state for path " + path, !!state);

    var object = state.deserialize(manager, match.hash) || {};
    manager.transitionTo(get(state, 'path'), object);
    manager.send('routePath', match.remaining);
  }
});

Ember.State.reopen(Ember.Routable);
