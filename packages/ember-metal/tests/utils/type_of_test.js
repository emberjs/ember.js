import { typeOf } from 'ember-metal/utils';

QUnit.module("Ember Type Checking");

QUnit.test("Ember.typeOf", function() {
  var MockedDate = function() { };
  MockedDate.prototype = new Date();

  var mockedDate  = new MockedDate();
  var date        = new Date();
  var error       = new Error('boum');
  var object      = { a: 'b' };

  equal(typeOf(), 'undefined', "undefined");
  equal(typeOf(null), 'null', "null");
  equal(typeOf('Cyril'), 'string', "Cyril");
  equal(typeOf(101), 'number', "101");
  equal(typeOf(true), 'boolean', "true");
  equal(typeOf([1,2,90]), 'array', "[1,2,90]");
  equal(typeOf(/abc/), 'regexp', "/abc/");
  equal(typeOf(date), 'date', "new Date()");
  equal(typeOf(mockedDate), 'date', "mocked date");
  equal(typeOf(error), 'error', "error");
  equal(typeOf(object), 'object', "object");

  if (Ember.Object) {
    var klass       = Ember.Object.extend();
    var instance    = Ember.Object.create();

    equal(typeOf(klass), 'class', "class");
    equal(typeOf(instance), 'instance', "instance");
  }
});
