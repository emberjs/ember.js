import EmberObject from 'glimmer-object';

function get(obj, key) {
  return obj[key];
}

QUnit.module('GlimmerObject.reopen');

QUnit.test('adds new properties to subclass instance', function() {
  let Subclass = EmberObject.extend();
  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(new Subclass()['foo'](), 'FOO', 'Adds method');
  equal(get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

QUnit.test('reopened properties inherited by subclasses', function() {
  let Subclass = EmberObject.extend();
  let SubSub = Subclass.extend();

  Subclass.reopen({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(new SubSub()['foo'](), 'FOO', 'Adds method');
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
