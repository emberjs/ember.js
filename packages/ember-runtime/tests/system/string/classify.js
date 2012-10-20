module('Ember.String.classify');

test("classify normal string", function() {
  deepEqual(Ember.String.classify('my favorite items'), 'MyFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.classify(), 'MyFavoriteItems');
  }
});

test("classify dasherized string", function() {
  deepEqual(Ember.String.classify('css-class-name'), 'CssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.classify(), 'CssClassName');
  }
});

test("classify underscored string", function() {
  deepEqual(Ember.String.classify('action_name'), 'ActionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.classify(), 'ActionName');
  }
});

test("does nothing with classified string", function() {
  deepEqual(Ember.String.classify('InnerHTML'), 'InnerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('InnerHTML'.classify(), 'InnerHTML');
  }
});
