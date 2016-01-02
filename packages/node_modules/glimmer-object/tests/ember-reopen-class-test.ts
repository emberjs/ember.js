import EmberObject from 'glimmer-object';

function get(obj, key) {
  return obj[key];
}

QUnit.module('GlimmerObject.reopenClass');

QUnit.test('adds new properties to subclass', function() {
  let Subclass: any = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(Subclass.foo(), 'FOO', 'Adds method');
  equal(get(Subclass, 'bar'), 'BAR', 'Adds property');
});

QUnit.test('class properties inherited by subclasses', function() {
  let Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  let SubSub = Subclass.extend();

  equal(SubSub['foo'](), 'FOO', 'Adds method');
  equal(get(SubSub, 'bar'), 'BAR', 'Adds property');
});
