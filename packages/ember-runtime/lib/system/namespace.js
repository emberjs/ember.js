require('ember-runtime/system/object');

/**
@module ember
@submodule ember-runtime
*/

var indexOf = Ember.ArrayPolyfills.indexOf;

/**
  A Namespace is an object usually used to contain other objects or methods
  such as an application or framework.  Create a namespace anytime you want
  to define one of these new containers.

  # Example Usage

      MyFramework = Ember.Namespace.create({
        VERSION: '1.0.0'
      });

  @class Namespace
  @namespace Ember
  @extends Ember.Object
*/
Ember.Namespace = Ember.Object.extend({
  isNamespace: true,

  init: function() {
    Ember.Namespace.NAMESPACES.push(this);
    Ember.Namespace.PROCESSED = false;
  },

  toString: function() {
    Ember.identifyNamespaces();
    return this[Ember.GUID_KEY+'_name'];
  },

  destroy: function() {
    var namespaces = Ember.Namespace.NAMESPACES;
    window[this.toString()] = undefined;
    namespaces.splice(indexOf.call(namespaces, this), 1);
    this._super();
  }
});

Ember.Namespace.NAMESPACES = [Ember];
Ember.Namespace.PROCESSED = false;
