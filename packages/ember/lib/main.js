require('ember-application');

/**
Ember

@module ember
*/

var defineProperty = Ember.platform.defineProperty;

if (defineProperty && !defineProperty.isSimulated) {
  defineProperty(Ember, 'StateManager', {
    get: function() {
      // Throwing rather than using Ember.assert to avoid this being stripped from builds
      throw new Error("Ember.StateManager has been moved into a plugin: https://github.com/emberjs/ember-states");
    }
  });

  defineProperty(Ember, 'State', {
    get: function() {
      // Throwing rather than using Ember.assert to avoid this being stripped from builds
      throw new Error("Ember.State has been moved into a plugin: https://github.com/emberjs/ember-states");
    }
  });
}