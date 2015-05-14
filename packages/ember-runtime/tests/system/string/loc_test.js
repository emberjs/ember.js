import Ember from "ember-metal/core";
import {loc} from "ember-runtime/system/string";

var oldString;

QUnit.module('EmberStringUtils.loc', {
  setup() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@': 'Bonjour %@',
      '_Hello %@ %@': 'Bonjour %@ %@',
      '_Hello %@# %@#': 'Bonjour %@2 %@1'
    };
  },

  teardown() {
    Ember.STRINGS = oldString;
  }
});

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test("String.prototype.loc is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.loc, 'String.prototype helper disabled');
  });
}

QUnit.test("'_Hello World'.loc() => 'Bonjour le monde'", function() {
  equal(loc('_Hello World'), 'Bonjour le monde');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello World'.loc(), 'Bonjour le monde');
  }
});

QUnit.test("'_Hello %@ %@'.loc('John', 'Doe') => 'Bonjour John Doe'", function() {
  equal(loc('_Hello %@ %@', ['John', 'Doe']), 'Bonjour John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@ %@'.loc('John', 'Doe'), 'Bonjour John Doe');
  }
});

QUnit.test("'_Hello %@# %@#'.loc('John', 'Doe') => 'Bonjour Doe John'", function() {
  equal(loc('_Hello %@# %@#', ['John', 'Doe']), 'Bonjour Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Hello %@# %@#'.loc('John', 'Doe'), 'Bonjour Doe John');
  }
});

QUnit.test("'_Not In Strings'.loc() => '_Not In Strings'", function() {
  equal(loc('_Not In Strings'), '_Not In Strings');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('_Not In Strings'.loc(), '_Not In Strings');
  }
});

QUnit.test("works with argument form", function() {
  equal(loc('_Hello %@', 'John'), 'Bonjour John');
  equal(loc('_Hello %@ %@', ['John'], 'Doe'), 'Bonjour [John] Doe');
});
