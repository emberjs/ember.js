require('ember-application');

/**
Ember

@module ember
*/

function throwWithMessage(msg) {
  return function() {
    throw new Error(msg);
  };
}

function generateRemovedClass(className) {
  var msg = " has been moved into a plugin: https://github.com/emberjs/ember-states";

  return {
    extend: throwWithMessage(className + msg),
    create: throwWithMessage(className + msg)
  };
}

Ember.StateManager = generateRemovedClass("Ember.StateManager");
Ember.State = generateRemovedClass("Ember.State");