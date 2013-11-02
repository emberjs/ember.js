module('Ember.String.w');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.w is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.w, 'String.prototype helper disabled');
  });
}

test("'one two three'.w() => ['one','two','three']", function() {
  deepEqual(Ember.String.w('one two three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one two three'.w(), ['one','two','three']);
  }
});

test("'one    two    three'.w() with extra spaces between words => ['one','two','three']", function() {
  deepEqual(Ember.String.w('one   two  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one   two  three'.w(), ['one','two','three']);
  }
});

test("'one two three'.w() with tabs", function() {
  deepEqual(Ember.String.w('one\ttwo  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one\ttwo  three'.w(), ['one','two','three']);
  }
});


