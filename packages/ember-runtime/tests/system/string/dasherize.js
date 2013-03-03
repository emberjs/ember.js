module('Ember.String.dasherize');

test("dasherize normal string", function() {
  deepEqual(Ember.String.dasherize('my favorite items'), 'my-favorite-items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.dasherize(), 'my-favorite-items');
  }
});

test("does nothing with dasherized string", function() {
  deepEqual(Ember.String.dasherize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.dasherize(), 'css-class-name');
  }
});

test("dasherize underscored string", function() {
  deepEqual(Ember.String.dasherize('action_name'), 'action-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.dasherize(), 'action-name');
  }
});

test("dasherize camelcased string", function() {
  deepEqual(Ember.String.dasherize('innerHTML'), 'inner-html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.dasherize(), 'inner-html');
  }
});

test("dasherize string that is the property name of Object.prototype", function() {
  deepEqual(Ember.String.dasherize('toString'), 'to-string');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('toString'.dasherize(), 'to-string');
  }
});

test("after call with the same passed value take object from cache", function() {
  var res = Ember.String.dasherize('innerHTML');

  var callCount = 0;
  var decamelize = Ember.String.decamelize;

  try {
    Ember.String.decamelize = function() {
      callCount++;
    };
    Ember.String.dasherize('innerHTML');
  } finally {
    Ember.String.decamelize = decamelize;
  }

  equal(callCount, 0, "decamelize is not called again");
});
