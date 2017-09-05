import { ENV } from 'ember-environment';
import { w } from '../../../system/string';

QUnit.module('EmberStringUtils.w');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.w is not available without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.w, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function() {
    deepEqual(w(given), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      deepEqual(given.w(), expected);
    }
  });
}

test('one two three',    ['one', 'two', 'three'], `w('one two three') => ['one','two','three']`);
test('one   two  three', ['one', 'two', 'three'], `w('one    two    three') with extra spaces between words => ['one','two','three']`);
test('one\ttwo  three',  ['one', 'two', 'three'], `w('one two three') with tabs`);
