import {
  guidFor
} from 'ember-metal/utils';

QUnit.module('guidFor');

var sameGuid = function(a, b, message) {
  equal(guidFor(a), guidFor(b), message);
};

var diffGuid = function(a, b, message) {
  ok(guidFor(a) !== guidFor(b), message);
};

var nanGuid = function(obj) {
  var type = typeof obj;
  ok(isNaN(parseInt(guidFor(obj), 0)), 'guids for ' + type + 'don\'t parse to numbers');
};

QUnit.test('Object', function() {
  var a = {};
  var b = {};

  sameGuid(a, a, 'same object always yields same guid');
  diffGuid(a, b, 'different objects yield different guids');
  nanGuid(a);
});

QUnit.test('strings', function() {
  var a = 'string A';
  var aprime = 'string A';
  var b = 'String B';

  sameGuid(a, a, 'same string always yields same guid');
  sameGuid(a, aprime, 'identical strings always yield the same guid');
  diffGuid(a, b, 'different strings yield different guids');
  nanGuid(a);
});

QUnit.test('numbers', function() {
  var a = 23;
  var aprime = 23;
  var b = 34;

  sameGuid(a, a, 'same numbers always yields same guid');
  sameGuid(a, aprime, 'identical numbers always yield the same guid');
  diffGuid(a, b, 'different numbers yield different guids');
  nanGuid(a);
});

QUnit.test('numbers', function() {
  var a = true;
  var aprime = true;
  var b = false;

  sameGuid(a, a, 'same booleans always yields same guid');
  sameGuid(a, aprime, 'identical booleans always yield the same guid');
  diffGuid(a, b, 'different boolean yield different guids');
  nanGuid(a);
  nanGuid(b);
});

QUnit.test('null and undefined', function() {
  var a = null;
  var aprime = null;
  var b;

  sameGuid(a, a, 'null always returns the same guid');
  sameGuid(b, b, 'undefined always returns the same guid');
  sameGuid(a, aprime, 'different nulls return the same guid');
  diffGuid(a, b, 'null and undefined return different guids');
  nanGuid(a);
  nanGuid(b);
});

QUnit.test('arrays', function() {
  var a = ['a', 'b', 'c'];
  var aprime = ['a', 'b', 'c'];
  var b = ['1', '2', '3'];

  sameGuid(a, a, 'same instance always yields same guid');
  diffGuid(a, aprime, 'identical arrays always yield the same guid');
  diffGuid(a, b, 'different arrays yield different guids');
  nanGuid(a);
});
