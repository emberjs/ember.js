// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.camelize');

test("camelize normal string", function() {
  same(Ember.String.camelize('my favorite items'), 'myFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    same('my favorite items'.camelize(), 'myFavoriteItems');
  }
});

test("camelize dasherized string", function() {
  same(Ember.String.camelize('css-class-name'), 'cssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    same('css-class-name'.camelize(), 'cssClassName');
  }
});

test("camelize underscored string", function() {
  same(Ember.String.camelize('action_name'), 'actionName');
  if (Ember.EXTEND_PROTOTYPES) {
    same('action_name'.camelize(), 'actionName');
  }
});

test("does nothing with camelcased string", function() {
  same(Ember.String.camelize('innerHTML'), 'innerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    same('innerHTML'.camelize(), 'innerHTML');
  }
});

