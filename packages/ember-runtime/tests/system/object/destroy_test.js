/*globals raises TestObject */
/*globals MyApp:true */

module('ember-runtime/system/object/destroy_test');

test("should schedule objects to be destroyed at the end of the run loop", function() {
  var obj = Ember.Object.create(), meta;

  Ember.run(function() {
    obj.destroy();
    meta = obj[Ember.META_KEY];
    ok(meta, "meta is not destroyed immediately");
    ok(!obj.get('isDestroyed'), "object is not destroyed immediately");
  });

  meta = obj[Ember.META_KEY];
  ok(!meta, "meta is destroyed after run loop finishes");
  ok(obj.get('isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (Ember.platform.hasAccessors) {
    var obj = Ember.Object.createWithMixins({
      foo: "bar",
      fooDidChange: Ember.observer(function() { }, 'foo')
    });

    Ember.run(function() {
      obj.destroy();
    });

    raises(function() {
      Ember.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  } else {
    expect(0);
  }
});

test("observers should not fire after an object has been destroyed", function() {
  var count = 0;
  var obj = Ember.Object.createWithMixins({
    fooDidChange: Ember.observer(function() {
      count++;
    }, 'foo')
  });

  obj.set('foo', 'bar');

  equal(count, 1, "observer was fired once");

  Ember.run(function() {
    Ember.beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    Ember.endPropertyChanges();
  });

  equal(count, 1, "observer was not called after object was destroyed");
});

test("bindings should be synced when are updated in the willDestroy hook", function() {

  var foo = Ember.Object.create({
    value: true
  });

  var bar = Ember.Object.create({
    value: null,
    willDestroy: function() {
      this.set('value', true);
    }
  });

  MyApp = {
    foo: foo,
    bar: bar
  };

  Ember.run(function(){
    Ember.bind(bar, 'value', 'MyApp.foo.value');
  });

  ok(bar.get('value'), 'the initial value has been bound'); 

  Ember.run(function(){
    bar.set('value', false);
  });


  ok(!foo.get('value'), 'foo synced'); 

  Ember.run(function() {
    bar.destroy();
  });

  ok(foo.get('value'), 'foo is synced when the binding is updated in the willDestroy hook'); 
  MyApp = null;
});

