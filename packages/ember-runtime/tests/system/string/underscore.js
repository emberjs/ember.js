// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.underscore');

test("with normal string", function() {
  same(Ember.String.underscore('my favorite items'), 'my_favorite_items');
  if (Ember.EXTEND_PROTOTYPES) {
    same('my favorite items'.underscore(), 'my_favorite_items');
  }
});

test("with dasherized string", function() {
  same(Ember.String.underscore('css-class-name'), 'css_class_name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('css-class-name'.underscore(), 'css_class_name');
  }
});

test("does nothing with underscored string", function() {
  same(Ember.String.underscore('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('action_name'.underscore(), 'action_name');
  }
});

test("with camelcased string", function() {
  same(Ember.String.underscore('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    same('innerHTML'.underscore(), 'inner_html');
  }
});

