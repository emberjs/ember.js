import EmberObject from 'htmlbars-object';

function get(obj, key) {
  return obj[key];
}

QUnit.module('HTMLBarsObject.reopenClass');

QUnit.test('adds new properties to subclass', function() {
  var Subclass: any = EmberObject.extend();
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
