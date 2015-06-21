import Ember from 'ember-metal/core';
import {w} from 'ember-runtime/system/string';

QUnit.module('EmberStringUtils.w');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.w is not available without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.w, 'String.prototype helper disabled');
  });
}

QUnit.test('\'one two three\'.w() => [\'one\',\'two\',\'three\']', function() {
  deepEqual(w('one two three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one two three'.w(), ['one','two','three']);
  }
});

QUnit.test('\'one    two    three\'.w() with extra spaces between words => [\'one\',\'two\',\'three\']', function() {
  deepEqual(w('one   two  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one   two  three'.w(), ['one','two','three']);
  }
});

QUnit.test('\'one two three\'.w() with tabs', function() {
  deepEqual(w('one\ttwo  three'), ['one','two','three']);
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('one\ttwo  three'.w(), ['one','two','three']);
  }
});


