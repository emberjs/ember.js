// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.decamelize');

test("does nothing with normal string", function() {
  same(Ember.String.decamelize('my favorite items'), 'my favorite items');
  if (Ember.EXTEND_PROTOTYPES) {
    same('my favorite items'.decamelize(), 'my favorite items');
  }
});

test("does nothing with dasherized string", function() {
  same(Ember.String.decamelize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('css-class-name'.decamelize(), 'css-class-name');
  }
});

test("does nothing with underscored string", function() {
  same(Ember.String.decamelize('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    same('action_name'.decamelize(), 'action_name');
  }
});

test("converts a camelized string into all lower case separated by underscores.", function() {
  same(Ember.String.decamelize('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    same('innerHTML'.decamelize(), 'inner_html');
  }
});