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

/**
  This was exported to ember-states plugin for v 1.0.0 release. See: https://github.com/emberjs/ember-states
  
  @class StateManager
  @namespace Ember
*/

Ember.State = generateRemovedClass("Ember.State");

/**
  This was exported to ember-states plugin for v 1.0.0 release. See: https://github.com/emberjs/ember-states
  
  @class State
  @namespace Ember
*/
