import { isArray } from '../../utils';
import { A as emberA } from '../../system/native_array';
import ArrayProxy from '../../system/array_proxy';
import { environment } from 'ember-environment';

QUnit.module('Ember Type Checking');

const global = this;

QUnit.test('Ember.isArray', function() {
  let numarray      = [1, 2, 3];
  let number        = 23;
  let strarray      = ['Hello', 'Hi'];
  let string        = 'Hello';
  let object        = {};
  let length        = { length: 12 };
  let fn            = function() {};
  let arrayProxy = ArrayProxy.create({ content: emberA() });

  equal(isArray(numarray), true, '[1,2,3]');
  equal(isArray(number), false, '23');
  equal(isArray(strarray), true, '["Hello", "Hi"]');
  equal(isArray(string), false, '"Hello"');
  equal(isArray(object), false, '{}');
  equal(isArray(length), false, '{ length: 12 }');
  equal(isArray(global), false, 'global');
  equal(isArray(fn), false, 'function() {}');
  equal(isArray(arrayProxy), true, '[]');
});

if (environment.window && typeof environment.window.FileList === 'function') {
  QUnit.test('Ember.isArray(fileList)', function() {
    let fileListElement = document.createElement('input');
    fileListElement.type = 'file';
    let fileList = fileListElement.files;
    equal(isArray(fileList), false, 'fileList');
  });
}
