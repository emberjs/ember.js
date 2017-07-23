import { ENV } from 'ember-environment';
import { w } from '../../../system/string';

QUnit.module('EmberStringUtils.w');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.w is not available without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.w, 'String.prototype helper disabled');
  });
}

QUnit.test('\'one two three\'.w() => [\'one\',\'two\',\'three\']', function() {
  deepEqual(w('one two three'), ['one', 'two', 'three']);
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('one two three'.w(), ['one', 'two', 'three']);
  }
});

QUnit.test('\'one    two    three\'.w() with extra spaces between words => [\'one\',\'two\',\'three\']', function() {
  deepEqual(w('one   two  three'), ['one', 'two', 'three']);
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('one   two  three'.w(), ['one', 'two', 'three']);
  }
});

QUnit.test('\'one two three\'.w() with tabs', function() {
  deepEqual(w('one\ttwo  three'), ['one', 'two', 'three']);
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('one\ttwo  three'.w(), ['one', 'two', 'three']);
  }
});

QUnit.test('\' one two three \'.w() with leading and trailing whitespace => [\'one\',\'two\', \'three\']', function() {
  deepEqual(w(' one two three '), ['one', 'two', 'three']);
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual(' one two three '.w(), ['one', 'two', 'three']);
  }
});
