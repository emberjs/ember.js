import {
  guidFor
} from '..';

QUnit.module('guidFor');

function sameGuid(a, b, message) {
  equal(guidFor(a), guidFor(b), message);
}

function diffGuid(a, b, message) {
  ok(guidFor(a) !== guidFor(b), message);
}

QUnit.test('Object', function() {
  let a = {};
  let b = {};

  sameGuid(a, a, 'same object always yields same guid');
  diffGuid(a, b, 'different objects yield different guids');
});

QUnit.test('strings', function() {
  let a = 'string A';
  let aprime = 'string A';
  let b = 'String B';

  sameGuid(a, a, 'same string always yields same guid');
  sameGuid(a, aprime, 'identical strings always yield the same guid');
  diffGuid(a, b, 'different strings yield different guids');
});

QUnit.test('numbers', function() {
  let a = 23;
  let aprime = 23;
  let b = 34;

  sameGuid(a, a, 'same numbers always yields same guid');
  sameGuid(a, aprime, 'identical numbers always yield the same guid');
  diffGuid(a, b, 'different numbers yield different guids');
});

QUnit.test('numbers', function() {
  let a = true;
  let aprime = true;
  let b = false;

  sameGuid(a, a, 'same booleans always yields same guid');
  sameGuid(a, aprime, 'identical booleans always yield the same guid');
  diffGuid(a, b, 'different boolean yield different guids');
});

QUnit.test('null and undefined', function() {
  let a = null;
  let aprime = null;
  let b;

  sameGuid(a, a, 'null always returns the same guid');
  sameGuid(b, b, 'undefined always returns the same guid');
  sameGuid(a, aprime, 'different nulls return the same guid');
  diffGuid(a, b, 'null and undefined return different guids');
});

QUnit.test('arrays', function() {
  let a = ['a', 'b', 'c'];
  let aprime = ['a', 'b', 'c'];
  let b = ['1', '2', '3'];

  sameGuid(a, a, 'same instance always yields same guid');
  diffGuid(a, aprime, 'identical arrays always yield the same guid');
  diffGuid(a, b, 'different arrays yield different guids');
});
