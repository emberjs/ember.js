import EmberObject from '@glimmer/object';

function get(obj: any, key: string) {
  return obj[key];
}

QUnit.module('GlimmerObject.reopenClass');

QUnit.test('adds new properties to subclass', assert => {
  let Subclass: any = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  assert.equal(Subclass.foo(), 'FOO', 'Adds method');
  assert.equal(get(Subclass, 'bar'), 'BAR', 'Adds property');
});

QUnit.test('class properties inherited by subclasses', assert => {
  let Subclass = EmberObject.extend();
  Subclass.reopenClass({
    foo() { return 'FOO'; },
    bar: 'BAR'
  });

  let SubSub = Subclass.extend();

  assert.equal(SubSub['foo'](), 'FOO', 'Adds method');
  assert.equal(get(SubSub, 'bar'), 'BAR', 'Adds property');
});
