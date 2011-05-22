// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.String.w');

test("'one two three'.w() => ['one','two','three']", function() {
  same(SC.String.w('one two three'), ['one','two','three']);
  if (SC.EXTEND_PROTOTYPES) {
    same('one two three'.w(), ['one','two','three']);
  }
});

test("'one    two    three'.w() with extra spaces between words => ['one','two','three']", function() {
  same(SC.String.w('one   two  three'), ['one','two','three']);
  if (SC.EXTEND_PROTOTYPES) {
    same('one   two  three'.w(), ['one','two','three']);
  }
});

test("'one two three'.w() with tabs", function() {
  same(SC.String.w('one\ttwo  three'), ['one','two','three']);
  if (SC.EXTEND_PROTOTYPES) {
    same('one\ttwo  three'.w(), ['one','two','three']);
  }
});


