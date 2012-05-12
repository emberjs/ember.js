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

    var regex = escaped.replace(/:([a-z]+)(?=$|\/)/gi, function(match, id) {
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

  updateRoute: function(manager, location) {
    if (location && get(this, 'isLeaf')) {
      var path = get(this, 'absoluteRoute');
      location.setUrl(path);
    }
  },

  absoluteRoute: Ember.computed(function() {
    var parentState = get(this, 'parentState');
    var path = '';

    if (get(parentState, 'isRoutable')) {
      path = get(parentState, 'absoluteRoute');
    }

    return path + '/' + get(this, 'route');
  }).cacheable(),

  isRoutable: Ember.computed(function() {
    return typeof this.route === "string";
  }).cacheable(),

  routeMatcher: Ember.computed(function() {
    return Ember._RouteMatcher.create({ route: get(this, 'route') });
  }).cacheable(),

  routePath: function(manager, path) {
    if (get(this, 'isLeaf')) { return; }

    var childStates = get(this, 'childStates'), match;

    var state = childStates.find(function(state) {
      var matcher = get(state, 'routeMatcher');
      if (match = matcher.match(path)) { return true; }
    });

    Ember.assert("Could not find state for path " + path, !!state);

    manager.goToState(get(state, 'path'));
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
