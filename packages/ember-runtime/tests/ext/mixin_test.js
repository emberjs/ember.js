module('system/mixin/binding_test');

test('Defining a property ending in Binding should setup binding when applied', function() {

  var MyMixin = Ember.Mixin.create({
    fooBinding: 'bar.baz'
  });

  var obj = { bar: { baz: 'BIFF' } };

  Ember.run(function() {
    MyMixin.apply(obj);
  });

  ok(Ember.get(obj, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equal(Ember.get(obj, 'foo'), 'BIFF', 'binding should be created and synced');

});

test('Defining a property ending in Binding should apply to prototype children', function() {
  var MyMixin, obj, obj2;

  Ember.run(function() {
    MyMixin = Ember.Mixin.create({
      fooBinding: 'bar.baz'
    });
  });

  obj = { bar: { baz: 'BIFF' } };

  Ember.run(function() {
    MyMixin.apply(obj);
  });


  obj2 = Ember.create(obj);
  Ember.run(function() {
    Ember.set(Ember.get(obj2, 'bar'), 'baz', 'BARG');
  });


  ok(Ember.get(obj2, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equal(Ember.get(obj2, 'foo'), 'BARG', 'binding should be created and synced');

});
