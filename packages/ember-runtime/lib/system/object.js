// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/mixins/observable');
require('ember-runtime/system/core_object');
require('ember-runtime/system/set');

Ember.CoreObject.subclasses = new Ember.Set();
Ember.Object = Ember.CoreObject.extend(Ember.Observable);



