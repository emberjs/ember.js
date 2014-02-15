module("Ember Type Checking");

test("Ember.typeOf", function() {
  var MockedDate = function() { };
  MockedDate.prototype = new Date();

  var mockedDate  = new MockedDate(),
      date        = new Date(),
      error       = new Error('boum'),
      object      = {a: 'b'};

  equal( Ember.typeOf(),            'undefined',  "undefined");
  equal( Ember.typeOf(null),        'null',       "null");
  equal( Ember.typeOf('Cyril'),     'string',     "Cyril");
  equal( Ember.typeOf(101),         'number',     "101");
  equal( Ember.typeOf(true),        'boolean',    "true");
  equal( Ember.typeOf([1,2,90]),    'array',      "[1,2,90]");
  equal( Ember.typeOf(/abc/),       'regexp',     "/abc/");
  equal( Ember.typeOf(date),        'date',       "new Date()");
  equal( Ember.typeOf(mockedDate),  'date',       "mocked date");
  equal( Ember.typeOf(error),       'error',      "error");
  equal( Ember.typeOf(object),      'object',     "object");

  if(Ember.Object) {
    var klass       = Ember.Object.extend(),
        instance    = Ember.Object.create();

    equal( Ember.typeOf(klass),     'class',      "class");
    equal( Ember.typeOf(instance),  'instance',   "instance");
  }
});
