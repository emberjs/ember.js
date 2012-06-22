require('ember-routing/route_matcher');
require('ember-routing/routable');
require('ember-application/system/location');

var get = Ember.get, getPath = Ember.getPath, set = Ember.set;

/**
  @class

  `Ember.Router` is a state manager used for routing.

  A special `Router` property name is recognized on applications:

      var app = Ember.Application.create({
        Router: Ember.Router.extend(...)
      });
      app.initialize();

  Here, `app.initialize` will instantiate the `app.Router` and assign the
  instance to the `app.stateManager` property.

  @extends Ember.StateManager
*/
Ember.Router = Ember.StateManager.extend(
/** @scope Ember.Router.prototype */ {

  /**
    @property {String}
    @default 'root'
  */
  initialState: 'root',

  /**
    The `Ember.Location` implementation to be used to manage the application
    URL state. The following values are supported:

    * 'hash': Uses URL fragment identifiers (like #/blog/1) for routing.
    * 'none': Does not read or set the browser URL, but still allows for
      routing to happen. Useful for testing.

    @type String
    @default 'hash'
  */
  location: 'hash',

  /**
    On router, transitionEvent should be called connectOutlets

    @property {String}
    @default 'connectOutlets'
  */
  transitionEvent: 'connectOutlets',

  route: function(path) {
    set(this, 'isRouting', true);

    try {
      path = path.replace(/^(?=[^\/])/, "/");

      this.send('navigateAway');
      this.send('unroutePath', path);

      var currentURL = get(this, 'currentState').absoluteRoute(this);
      var rest = path.substr(currentURL.length);

      this.send('routePath', rest);
    } finally {
      set(this, 'isRouting', false);
    }

    get(this, 'currentState').updateRoute(this, get(this, 'location'));
  },

  urlFor: function(path, hash) {
    var currentState = get(this, 'currentState') || this,
        state = this.findStateByPath(currentState, path);

    Ember.assert("To get a URL for a state, it must have a `route` property.", !!get(state, 'routeMatcher'));

    var location = get(this, 'location'),
        absoluteRoute = state.absoluteRoute(this, hash);

    return location.formatURL(absoluteRoute);
  },

  urlForEvent: function(eventName, context) {
    var currentState = get(this, 'currentState');
    var targetStateName = currentState.lookupEventTransition(eventName);

    Ember.assert(Ember.String.fmt("You must specify a target state for event '%@' in order to link to it in the current state '%@'.", [eventName, get(currentState, 'path')]), !!targetStateName);

    var targetState = this.findStateByPath(currentState, targetStateName);

    Ember.assert("Your target state name " + targetStateName + " for event " + eventName + " did not resolve to a state", !!targetState);

    var hash = this.serializeRecursively(targetState, context);

    return this.urlFor(targetStateName, hash);
  },

  /** @private */
  serializeRecursively: function(state, hash) {
    hash = state.serialize(this, hash);
    var parentState = state.get("parentState");
    if (parentState && parentState instanceof Ember.Route) {
      return this.serializeRecursively(parentState, hash);
    } else {
      return hash;
    }
  },

  /** @private */
  init: function() {
    this._super();

    var location = get(this, 'location');
    if ('string' === typeof location) {
      set(this, 'location', Ember.Location.create({ implementation: location }));
    }
  },

  /** @private */
  willDestroy: function() {
    get(this, 'location').destroy();
  }
});
