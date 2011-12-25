// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.dasherize');

test("dasherize normal string", function() {
  same(Ember.String.dasherize('my favorite items'), 'my-favorite-items');
  if (Ember.EXTEND_PROTOTYPES) {
    same('my favorite items'.dasherize(), 'my-favorite-items');
  }
});

test("does nothing with dasherized string", function() {
  same(Ember.String.dasherize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('css-class-name'.dasherize(), 'css-class-name');
  }
});

test("dasherize underscored string", function() {
  same(Ember.String.dasherize('action_name'), 'action-name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('action_name'.dasherize(), 'action-name');
  }
});

test("dasherize camelcased string", function() {
  same(Ember.String.dasherize('innerHTML'), 'inner-html');
  if (Ember.EXTEND_PROTOTYPES) {
    same('innerHTML'.dasherize(), 'inner-html');
  }
});

test("after call with the same passed value take object from cashe", function() {
  var res = Ember.String.dasherize('innerHTML');
  var decamelize = Ember.String.decamelize
  Ember.String.decamelize = function() {
    throw "Ember.String.decamelize has been called."
  }
  Ember.String.dasherize('innerHTML');
  Ember.String.decamelize = decamelize;
});
