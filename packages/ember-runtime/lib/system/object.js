// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/mixins/observable');
require('ember-runtime/system/core_object');
require('ember-runtime/system/set');

/**
  @class

  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @extends Ember.CoreObject
  @extends Ember.Observable
*/
Ember.Object = Ember.CoreObject.extend(Ember.Observable);
