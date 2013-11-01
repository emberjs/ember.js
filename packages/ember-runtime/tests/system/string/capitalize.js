// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.capitalize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.capitalize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.capitalize, 'String.prototype helper disabled');
  });
}

test("capitalize normal string", function() {
  deepEqual(Ember.String.capitalize('my favorite items'), 'My favorite items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.capitalize(), 'My favorite items');
  }
});

test("capitalize dasherized string", function() {
  deepEqual(Ember.String.capitalize('css-class-name'), 'Css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.capitalize(), 'Css-class-name');
  }
});

test("capitalize underscored string", function() {
  deepEqual(Ember.String.capitalize('action_name'), 'Action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.capitalize(), 'Action_name');
  }
});

test("capitalize camelcased string", function() {
  deepEqual(Ember.String.capitalize('innerHTML'), 'InnerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.capitalize(), 'InnerHTML');
  }
});

test("does nothing with capitalized string", function() {
  deepEqual(Ember.String.capitalize('Capitalized string'), 'Capitalized string');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('Capitalized string'.capitalize(), 'Capitalized string');
  }
});

