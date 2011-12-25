// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.underscored');

test("with normal string", function() {
  same(Ember.String.underscored('my favorite items'), 'my_favorite_items');
  if (Ember.EXTEND_PROTOTYPES) {
    same('my favorite items'.underscored(), 'my_favorite_items');
  }
});

test("with dasherized string", function() {
  same(Ember.String.underscored('css-class-name'), 'css_class_name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('css-class-name'.underscored(), 'css_class_name');
  }
});

test("does nothing with underscored string", function() {
  same(Ember.String.underscored('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('action_name'.underscored(), 'action_name');
  }
});

test("with camelcased string", function() {
  same(Ember.String.underscored('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    same('innerHTML'.underscored(), 'inner_html');
  }
});

