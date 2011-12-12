// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var oldString;

module('Ember.String.loc', {
  setup: function() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@',
      '_Hello %@# %@#': 'Bonjour %@2 %@1'
    };
  },
  
  teardown: function() {
    Ember.STRINGS = oldString;
  }
});

test("'_Hello World'.loc() => 'Bonjour le monde'", function() {
  equals(Ember.String.loc('_Hello World'), 'Bonjour le monde');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('_Hello World'.loc(), 'Bonjour le monde');
  }
});

test("'_Hello %@ %@'.loc('John', 'Doe') => 'Bonjour John Doe'", function() {
  equals(Ember.String.loc('_Hello %@ %@', ['John', 'Doe']), 'Bonjour John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('_Hello %@ %@'.loc('John', 'Doe'), 'Bonjour John Doe');
  }
});

test("'_Hello %@# %@#'.loc('John', 'Doe') => 'Bonjour Doe John'", function() {
  equals(Ember.String.loc('_Hello %@# %@#', ['John', 'Doe']), 'Bonjour Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('_Hello %@# %@#'.loc('John', 'Doe'), 'Bonjour Doe John');
  }
});

test("'_Not In Strings'.loc() => '_Not In Strings'", function() {
  equals(Ember.String.loc('_Not In Strings'), '_Not In Strings');
  if (Ember.EXTEND_PROTOTYPES) {
    equals('_Not In Strings'.loc(), '_Not In Strings');
  }
});


