// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.Application');

test('Ember.Application should be a subclass of Ember.Namespace', function() {

  ok(Ember.Namespace.detect(Ember.Application), 'Ember.Application subclass of Ember.Namespace');
  
});
