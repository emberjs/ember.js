// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.String.fmt');

test("'Hello %@ %@'.fmt('John', 'Doe') => 'Hello John Doe'", function() {
  equals(Ember.String.fmt('Hello %@ %@', ['John', 'Doe']), 'Hello John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('Hello %@ %@'.fmt('John', 'Doe'), 'Hello John Doe');
  }
});

test("'Hello %@2 %@1'.fmt('John', 'Doe') => 'Hello Doe John'", function() {
  equals(Ember.String.fmt('Hello %@2 %@1', ['John', 'Doe']), 'Hello Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('Hello %@2 %@1'.fmt('John', 'Doe'), 'Hello Doe John');
  }
});


