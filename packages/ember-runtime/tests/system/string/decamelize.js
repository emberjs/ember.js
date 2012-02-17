// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.decamelize');

test("does nothing with normal string", function() {
  deepEqual(Ember.String.decamelize('my favorite items'), 'my favorite items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.decamelize(), 'my favorite items');
  }
});

test("does nothing with dasherized string", function() {
  deepEqual(Ember.String.decamelize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.decamelize(), 'css-class-name');
  }
});

test("does nothing with underscored string", function() {
  deepEqual(Ember.String.decamelize('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.decamelize(), 'action_name');
  }
});

test("converts a camelized string into all lower case separated by underscores.", function() {
  deepEqual(Ember.String.decamelize('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.decamelize(), 'inner_html');
  }
});