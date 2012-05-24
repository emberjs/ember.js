require('ember-states/state');
require('ember-states/route_matcher');
require('ember-states/routable');

Ember.Router = Ember.StateManager.extend({
  route: function(path) {
    if (path.charAt(0) === '/') {
      path = path.substr(1);
    }

    this.send('routePath', path);
  }
});
