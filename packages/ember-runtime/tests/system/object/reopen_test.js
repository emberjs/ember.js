import { get } from 'ember-metal';
import EmberObject from '../../../system/object';

QUnit.module('system/core_object/reopen');

QUnit.test('adds new properties to subclass instance', function() {
  let Subclass = EmberObject.extend();
  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(new Subclass().foo(), 'FOO', 'Adds method');
  equal(get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('reopened properties inherited by subclasses', function() {
  let Subclass = EmberObject.extend();
  let SubSub = Subclass.extend();

  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(new SubSub().foo(), 'FOO', 'Adds method');
  equal(get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('allows reopening already instantiated classes', function() {
  let Subclass = EmberObject.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  equal(Subclass.create().get('trololol'), true, 'reopen works');
});

test('reopen adds properties to classes of already created instances', function() {
  var klass = Ember.Object.extend();

  var object = klass.create();

  klass.reopen({
    added: true
  });

  // works fine if you uncomment this line
  //var somethingElse = klass.create();

  equal(object.get('added'), true, "reopen works");
});
