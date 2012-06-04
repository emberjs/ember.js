require('ember-states/state');
require('ember-states/route_matcher');
require('ember-states/routable');

var get = Ember.get, getPath = Ember.getPath;

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

  initialState: 'root',

  /**
    On router, transitionEvent should be called connectOutlets

    @property {String}
  */
  transitionEvent: 'connectOutlets',

  route: function(path) {
    path = path.replace(/^(?=[^\/])/, "/");

    this.send('unroutePath', path);

    var currentURL = get(this, 'currentState').absoluteRoute(this);
    var rest = path.substr(currentURL.length);

    this.send('routePath', rest);
  },

  urlFor: function(path, hash) {
    var currentState = get(this, 'currentState') || this,
        state = this.findStateByPath(currentState, path);

    Ember.assert("To get a URL for a state, it must have a `route` property.", !!get(state, 'routeMatcher'));

    var location = get(this, 'location'),
        url = state.absoluteRoute(this, hash);

    if (location) {
      url = location.formatURL(url);
    }

    return url;
  },

  urlForEvent: function(eventName, context) {
    var currentState = get(this, 'currentState');
    var targetStateName = currentState.eventTransitions[eventName];

    Ember.assert(Ember.String.fmt("You must specify a target state for event '%@' in order to link to it in the current state '%@'.", [eventName, get(currentState, 'path')]), !!targetStateName);

    var targetState = this.findStateByPath(currentState, targetStateName);

    Ember.assert("Your target state name " + targetStateName + " for event " + eventName + " did not resolve to a state", !!targetState);
    var hash = targetState.serialize(this, context);

    return this.urlFor(targetStateName, hash);
  }
});
