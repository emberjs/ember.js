/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/*
  This file implements the `location` API used by Ember's router.

  That API is:

  getURL: returns the current URL
  setURL(path): sets the current URL
  replaceURL(path): replace the current URL (optional)
  onUpdateURL(callback): triggers the callback when the URL changes
  formatURL(url): formats `url` to be placed into `href` attribute

  Calling setURL or replaceURL will not trigger onUpdateURL callbacks.

  TODO: This should perhaps be moved so that it's visible in the doc output.
*/

/**
  Ember.Location returns an instance of the correct implementation of
  the `location` API.

  You can pass it a `implementation` ('auto', hash', 'history', 'none') to force a
  particular implementation.

  @class Location
  @namespace Ember
  @static
*/
Ember.Location = {
  create: function(options) {
    var implementation = options && options.implementation;
    Ember.assert("Ember.Location.create: you must specify a 'implementation' option", !!implementation);

    var implementationClass = this.implementations[implementation];
    Ember.assert("Ember.Location.create: " + implementation + " is not a valid implementation", !!implementationClass);

    return implementationClass.create.apply(implementationClass, arguments);
  },

  registerImplementation: function(name, implementation) {
    this.implementations[name] = implementation;
  },

  implementations: {}
};
