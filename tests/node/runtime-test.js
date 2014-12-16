/*globals __dirname*/

var path = require('path');

var module = QUnit.module;
var ok = QUnit.ok;
var equal = QUnit.equal;

var distPath = path.join(__dirname, '../../dist');

module('ember-runtime.js');

test('can be required', function() {
  var Ember = require(path.join(distPath, 'ember-runtime'));

  ok(Ember.Object, 'Ember.Object is present');
});

test('basic object system functions properly', function() {
  var Ember = require(path.join(distPath, 'ember-runtime'));

  var Person = Ember.Object.extend({
    name: Ember.computed('firstName', 'lastName', function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    })
  });

  var person = Person.create({
    firstName: 'Max',
    lastName: 'Jackson'
  });

  equal(person.get('name'), 'Max Jackson');

  person.set('firstName', 'James');

  equal(person.get('name'), 'James Jackson');
});
