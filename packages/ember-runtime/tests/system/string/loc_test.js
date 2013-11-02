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

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.loc is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.loc, 'String.prototype helper disabled');
  });
}

test("'_Hello World'.loc() => 'Bonjour le monde'", function() {
  equal(Ember.String.loc('_Hello World'), 'Bonjour le monde');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello World'.loc(), 'Bonjour le monde');
  }
});

test("'_Hello %@ %@'.loc('John', 'Doe') => 'Bonjour John Doe'", function() {
  equal(Ember.String.loc('_Hello %@ %@', ['John', 'Doe']), 'Bonjour John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@ %@'.loc('John', 'Doe'), 'Bonjour John Doe');
  }
});

test("'_Hello %@# %@#'.loc('John', 'Doe') => 'Bonjour Doe John'", function() {
  equal(Ember.String.loc('_Hello %@# %@#', ['John', 'Doe']), 'Bonjour Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@# %@#'.loc('John', 'Doe'), 'Bonjour Doe John');
  }
});

test("'_Not In Strings'.loc() => '_Not In Strings'", function() {
  equal(Ember.String.loc('_Not In Strings'), '_Not In Strings');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Not In Strings'.loc(), '_Not In Strings');
  }
});


