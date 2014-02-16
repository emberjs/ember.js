module('Ember.String.decamelize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.decamelize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.decamelize, 'String.prototype helper disabled');
  });
}

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

test("decamelizes strings with numbers", function() {
  deepEqual(Ember.String.decamelize('size160Url'), 'size160_url');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('size160Url'.decamelize(), 'size160_url');
  }
});
