import { get } from 'ember-metal';
import EmberObject from '../../../system/object';

QUnit.module('system/core_object/reopen');

QUnit.test('adds new properties to subclass instance', function(assert) {
  let Subclass = EmberObject.extend();
  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  assert.equal(new Subclass().foo(), 'FOO', 'Adds method');
  assert.equal(get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('reopened properties inherited by subclasses', function(assert) {
  let Subclass = EmberObject.extend();
  let SubSub = Subclass.extend();

  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  assert.equal(new SubSub().foo(), 'FOO', 'Adds method');
  assert.equal(get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('allows reopening already instantiated classes', function(assert) {
  let Subclass = EmberObject.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  assert.equal(Subclass.create().get('trololol'), true, 'reopen works');
});
