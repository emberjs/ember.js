module('Ember.String.underscore');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.underscore is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.underscore, 'String.prototype helper disabled');
  });
}

test("with normal string", function() {
  deepEqual(Ember.String.underscore('my favorite items'), 'my_favorite_items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.underscore(), 'my_favorite_items');
  }
});

test("with dasherized string", function() {
  deepEqual(Ember.String.underscore('css-class-name'), 'css_class_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.underscore(), 'css_class_name');
  }
});

test("does nothing with underscored string", function() {
  deepEqual(Ember.String.underscore('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.underscore(), 'action_name');
  }
});

test("with camelcased string", function() {
  deepEqual(Ember.String.underscore('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.underscore(), 'inner_html');
  }
});

