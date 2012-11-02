module('system/object/reopenClass');

test('adds new properties to subclass', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  equal(Subclass.foo(), 'FOO', 'Adds method');
  equal(Ember.get(Subclass, 'bar'), 'BAR', 'Adds property');
});

test('class properties inherited by subclasses', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopenClass({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  var SubSub = Subclass.extend();

  equal(SubSub.foo(), 'FOO', 'Adds method');
  equal(Ember.get(SubSub, 'bar'), 'BAR', 'Adds property');
});

