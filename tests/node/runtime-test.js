/*globals __dirname*/

var path = require('path');
var QUnit = require('qunitjs');

var distPath = path.join(__dirname, '../../dist');

QUnit.module('ember-runtime.js');

test('can be required', function(assert) {
  var Ember = require(path.join(distPath, 'ember-runtime'));

  assert.ok(Ember.Object, 'Ember.Object is present');
});

test('basic object system functions properly', function(assert) {
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

  assert.equal(person.get('name'), 'Max Jackson');

  person.set('firstName', 'James');

  assert.equal(person.get('name'), 'James Jackson');
});
