// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.w');

test("'one two three'.w() => ['one','two','three']", function() {
  same(Ember.String.w('one two three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    same('one two three'.w(), ['one','two','three']);
  }
});

test("'one    two    three'.w() with extra spaces between words => ['one','two','three']", function() {
  same(Ember.String.w('one   two  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    same('one   two  three'.w(), ['one','two','three']);
  }
});

test("'one two three'.w() with tabs", function() {
  same(Ember.String.w('one\ttwo  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    same('one\ttwo  three'.w(), ['one','two','three']);
  }
});


