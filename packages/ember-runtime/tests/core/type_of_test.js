import { typeOf } from 'ember-runtime/utils';
import EmberObject from 'ember-runtime/system/object';

QUnit.module('Ember Type Checking');

QUnit.test('Ember.typeOf', function() {
  var MockedDate = function() { };
  MockedDate.prototype = new Date();

  var mockedDate  = new MockedDate();
  var date        = new Date();
  var error       = new Error('boum');
  var object      = { a: 'b' };
  var a = null;
  var arr = [1,2,3];
  var obj = {};
  var instance = EmberObject.create({ method() {} });

  equal(typeOf(), 'undefined', 'undefined');
  equal(typeOf(null), 'null', 'null');
  equal(typeOf('Cyril'), 'string', 'Cyril');
  equal(typeOf(101), 'number', '101');
  equal(typeOf(true), 'boolean', 'true');
  equal(typeOf([1,2,90]), 'array', '[1,2,90]');
  equal(typeOf(/abc/), 'regexp', '/abc/');
  equal(typeOf(date), 'date', 'new Date()');
  equal(typeOf(mockedDate), 'date', 'mocked date');
  equal(typeOf(error), 'error', 'error');
  equal(typeOf(object), 'object', 'object');
  equal(typeOf(undefined), 'undefined', 'item of type undefined');
  equal(typeOf(a), 'null', 'item of type null');
  equal(typeOf(arr), 'array', 'item of type array');
  equal(typeOf(obj), 'object', 'item of type object');
  equal(typeOf(instance), 'instance', 'item of type instance');
  equal(typeOf(instance.method), 'function', 'item of type function');
  equal(typeOf(EmberObject.extend()), 'class', 'item of type class');
  equal(typeOf(new Error()), 'error', 'item of type error');

  if (typeof Symbol !== 'undefined') {
    equal(typeOf(Symbol('foo')), 'symbol', 'item of type symbol');
  }

  (function(){
    equal(typeOf(arguments), 'arguments', 'item of type arguments');
  }());

  if (typeof Promise !== 'undefined' &&
      Object.prototype.toString.call(new Promise(function() {})) === '[object Promise]') {

    equal(typeOf(new Promise(function() { })), 'promise', 'item of type promise');
  }

  if (typeof Map !== 'undefined' &&
      Object.prototype.toString.call(new Map()) === '[object Map]') {

    equal(typeOf(new Map()), ' map', 'item of type promise');
  }
});
