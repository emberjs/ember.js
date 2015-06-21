import {get} from 'ember-metal/property_get';
import EmberObject from 'ember-runtime/system/object';

QUnit.module('system/object/reopenClass');

QUnit.test('adds new properties to subclass', function() {

  var Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(Subclass.foo(), 'FOO', 'Adds method');
  equal(get(Subclass, 'bar'), 'BAR', 'Adds property');
});

QUnit.test('class properties inherited by subclasses', function() {

  var Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  var SubSub = Subclass.extend();

  equal(SubSub.foo(), 'FOO', 'Adds method');
  equal(get(SubSub, 'bar'), 'BAR', 'Adds property');
});

