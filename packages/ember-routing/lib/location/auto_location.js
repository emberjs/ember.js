/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
var supportsHistory = !!(window.history && history.pushState);
var supportsHashChange = (function () {
  if ('onhashchange' in window === false) {
    return false;
  }

  // IE8 Compatibility Mode provides false positive
  return (document.documentMode === undefined || document.documentMode > 7);
});

/**
  Ember.AutoLocation will select the best location option based off browser
  support with the priority order: history, hash, none.

  @class AutoLocation
  @namespace Ember
  @static
*/
Ember.AutoLocation = {
  create: function () {
    var implementationClass;

    if (supportsHistory) {
      implementationClass = Ember.HistoryLocation;
    } else if (supportsHashChange) {
      implementationClass = Ember.HashLocation;
    } else {
      implementationClass = Ember.NoneLocation;
    }

    return implementationClass.create.apply(implementationClass, arguments);
  }
};

Ember.Location.registerImplementation('auto', Ember.AutoLocation);
