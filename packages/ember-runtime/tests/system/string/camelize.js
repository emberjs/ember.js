module('Ember.String.camelize');

test("camelize normal string", function() {
  deepEqual(Ember.String.camelize('my favorite items'), 'myFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.camelize(), 'myFavoriteItems');
  }
});

test("camelize dasherized string", function() {
  deepEqual(Ember.String.camelize('css-class-name'), 'cssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.camelize(), 'cssClassName');
  }
});

test("camelize underscored string", function() {
  deepEqual(Ember.String.camelize('action_name'), 'actionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.camelize(), 'actionName');
  }
});

test("does nothing with camelcased string", function() {
  deepEqual(Ember.String.camelize('innerHTML'), 'innerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.camelize(), 'innerHTML');
  }
});

