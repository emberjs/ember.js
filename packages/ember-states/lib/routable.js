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

var escapeForRegex = function(text) {
  return text.replace(/[\-\[\]{}()*+?.,\\\^\$|#\s]/g, "\\$&");
};

Ember._RouteMatcher = Ember.Object.extend({
  state: null,

  init: function() {
    var route = get(this, 'route'),
        escaped = escapeForRegex(route),
        identifiers = [],
        count = 1;

    var regex = escaped.replace(/:([a-z_]+)(?=$|\/)/gi, function(match, id) {
      identifiers[count++] = id;
      return "([^/]+)";
    });

    this.identifiers = identifiers;
    this.regex = new RegExp("^/?" + regex);
  },

  match: function(path) {
    var match = path.match(this.regex);

    if (match) {
      var identifiers = this.identifiers,
          hash = {};

      for (var i=1, l=identifiers.length; i<l; i++) {
        hash[identifiers[i]] = match[i];
      }

      return {
        remaining: path.substr(match[0].length),
        hash: hash
      };
    }
  },

  generate: function(hash) {
    var identifiers = this.identifiers, route = this.route, id;
    for (var i=1, l=identifiers.length; i<l; i++) {
      id = identifiers[i];
      route = route.replace(new RegExp(":" + id), hash[id]);
    }
    return route;
  }
});

Ember.Routable = Ember.Mixin.create({
  init: function() {
    this.on('setupContext', this, this.stashContext);

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
      location.setUrl(path);
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

    return path + '/' + matcher.generate(hash);
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

Ember.RoutableStateManager = Ember.Mixin.create({
  route: function(path) {
    if (path[0] === '/') {
      path = path.substr(1);
    }

    this.send('routePath', path);
  }
});

Ember.StateManager.reopen(Ember.RoutableStateManager);
