import View from 'ember-views/views/view';
import _MetamorphView, { _Metamorph } from 'ember-views/compat/metamorph_view';

QUnit.module('ember-views: _Metamorph [DEPRECATED]');

QUnit.test('Instantiating _MetamorphView triggers deprecation', function() {
  expectDeprecation(function() {
    View.extend(_Metamorph).create();
  }, /Using Ember\._Metamorph is deprecated./);
});

QUnit.test('Instantiating _MetamorphView triggers deprecation', function() {
  expectDeprecation(function() {
    _MetamorphView.create();
  }, /Using Ember\._MetamorphView is deprecated./);
});
