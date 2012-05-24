require('ember-states/state');
require('ember-states/route_matcher');
require('ember-states/routable');

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

  route: function(path) {
    if (path.charAt(0) === '/') {
      path = path.substr(1);
    }

    this.send('routePath', path);
  }
});
