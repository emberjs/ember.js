// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.String.fmt');

test("'Hello %@ %@'.fmt('John', 'Doe') => 'Hello John Doe'", function() {
  equals(SC.String.fmt('Hello %@ %@', ['John', 'Doe']), 'Hello John Doe');
  if (SC.EXTEND_PROTOTYPES) {
    equals('Hello %@ %@'.fmt('John', 'Doe'), 'Hello John Doe');
  }
});

test("'Hello %@2 %@1'.fmt('John', 'Doe') => 'Hello Doe John'", function() {
  equals(SC.String.fmt('Hello %@2 %@1', ['John', 'Doe']), 'Hello Doe John');
  if (SC.EXTEND_PROTOTYPES) {
    equals('Hello %@2 %@1'.fmt('John', 'Doe'), 'Hello Doe John');
  }
});


