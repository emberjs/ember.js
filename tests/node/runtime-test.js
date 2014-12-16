var assert = require('assert');
var path = require('path');

var distPath = path.join(__dirname, '../../dist');

describe('ember-runtime.js', function() {
  it('can be required', function() {
    var Ember = require(path.join(distPath, 'ember-runtime'));

    assert(Ember.Object, 'Ember.Object is present');
  });

  it('basic object system functions properly', function() {
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
});
