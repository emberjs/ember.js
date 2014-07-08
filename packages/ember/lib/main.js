// ensure that minispade loads the following modules first
require('ember-metal');
require('ember-runtime');
require('ember-handlebars-compiler');
require('ember-handlebars');
require('ember-views');
require('ember-routing');
require('ember-application');
require('ember-extension-support');


// ensure that the global exports have occurred for above
// required packages
requireModule('ember-metal');
requireModule('ember-runtime');
requireModule('ember-handlebars');
requireModule('ember-views');
requireModule('ember-routing');
requireModule('ember-application');
requireModule('ember-extension-support');

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (Ember.__loader.registry['ember-testing']) {
  requireModule('ember-testing');
}

/**
Ember

@module ember
*/

function throwWithMessage(msg) {
  return function() {
    throw new Ember.Error(msg);
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
