// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var oldString;

module('SC.String.loc', {
  setup: function() {
    oldString = SC.STRINGS;
    SC.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@',
      '_Hello %@# %@#': 'Bonjour %@2 %@1'
    };
  },
  
  teardown: function() {
    SC.STRINGS = oldString;
  }
});

test("'_Hello World'.loc() => 'Bonjour le monde'", function() {
  equals(SC.String.loc('_Hello World'), 'Bonjour le monde');
  if (SC.EXTEND_PROTOTYPES) {
    equals('_Hello World'.loc(), 'Bonjour le monde');
  }
});

test("'_Hello %@ %@'.loc('John', 'Doe') => 'Bonjour John Doe'", function() {
  equals(SC.String.loc('_Hello %@ %@', ['John', 'Doe']), 'Bonjour John Doe');
  if (SC.EXTEND_PROTOTYPES) {
    equals('_Hello %@ %@'.loc('John', 'Doe'), 'Bonjour John Doe');
  }
});

test("'_Hello %@# %@#'.loc('John', 'Doe') => 'Bonjour Doe John'", function() {
  equals(SC.String.loc('_Hello %@# %@#', ['John', 'Doe']), 'Bonjour Doe John');
  if (SC.EXTEND_PROTOTYPES) {
    equals('_Hello %@# %@#'.loc('John', 'Doe'), 'Bonjour Doe John');
  }
});

test("'_Not In Strings'.loc() => '_Not In Strings'", function() {
  equals(SC.String.loc('_Not In Strings'), '_Not In Strings');
  if (SC.EXTEND_PROTOTYPES) {
    equals('_Not In Strings'.loc(), '_Not In Strings');
  }
});


