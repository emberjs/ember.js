if (Ember.FEATURES.isEnabled("string-humanize")) {
  module('Ember.String.humanize');

  test("with underscored string", function() {
    deepEqual(Ember.String.humanize('first_name'), 'First name');
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual('first_name'.humanize(), 'First name');
    }
  });

  test("with multiple underscored string", function() {
    deepEqual(Ember.String.humanize('first_and_last_name'), 'First and last name');
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual('first_and_last_name'.humanize(), 'First and last name');
    }
  });

  test("with underscored id string", function() {
    deepEqual(Ember.String.humanize('user_id'), 'User');
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual('user_id'.humanize(), 'User');
    }
  });

  test("with humanized string", function() {
    deepEqual(Ember.String.humanize('First name'), 'First name');
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual('First name'.humanize(), 'First name');
    }
  });
}
