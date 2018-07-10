import { get } from 'ember-metal';
import EmberObject from '../../../system/object';

QUnit.module('system/core_object/reopen');

QUnit.test('adds new properties to subclass instance', function() {
  let Subclass = EmberObject.extend();
  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(Subclass.create().foo(), 'FOO', 'Adds method');
  equal(get(Subclass.create(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('reopened properties inherited by subclasses', function() {
  let Subclass = EmberObject.extend();
  let SubSub = Subclass.extend();

  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(SubSub.create().foo(), 'FOO', 'Adds method');
  equal(get(SubSub.create(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('allows reopening already instantiated classes', function() {
  let Subclass = EmberObject.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  equal(Subclass.create().get('trololol'), true, 'reopen works');
});
