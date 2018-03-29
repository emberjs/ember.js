import { get } from 'ember-metal';
import EmberObject from '../../../system/object';

QUnit.module('system/object/reopenClass');

QUnit.test('adds new properties to subclass', function(assert) {
  let Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() {
      return 'FOO';
    },
    bar: 'BAR'
  });

  assert.equal(Subclass.foo(), 'FOO', 'Adds method');
  assert.equal(get(Subclass, 'bar'), 'BAR', 'Adds property');
});

QUnit.test('class properties inherited by subclasses', function(assert) {
  let Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() {
      return 'FOO';
    },
    bar: 'BAR'
  });

  let SubSub = Subclass.extend();

  assert.equal(SubSub.foo(), 'FOO', 'Adds method');
  assert.equal(get(SubSub, 'bar'), 'BAR', 'Adds property');
});
