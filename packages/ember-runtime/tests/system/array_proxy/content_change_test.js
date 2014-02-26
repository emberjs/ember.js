module("Ember.ArrayProxy - content change");

test("should update length for null content", function() {
  var proxy = Ember.ArrayProxy.create({
        content: Ember.A([1,2,3])
      });

  equal(proxy.get('length'), 3, "precond - length is 3");

  proxy.set('content', null);

  equal(proxy.get('length'), 0, "length updates");
});

test("The `arrangedContentWillChange` method is invoked before `content` is changed.", function() {
  var callCount = 0,
      expectedLength;

  var proxy = Ember.ArrayProxy.extend({
    content: Ember.A([1, 2, 3]),

    arrangedContentWillChange: function() {
      equal(this.get('arrangedContent.length'), expectedLength, "hook should be invoked before array has changed");
      callCount++;
    }
  }).create();

  proxy.pushObject(4);
  equal(callCount, 0, "pushing content onto the array doesn't trigger it");

  proxy.get('content').pushObject(5);
  equal(callCount, 0, "pushing content onto the content array doesn't trigger it");

  expectedLength = 5;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, "replacing the content array triggers the hook");
});

test("The `arrangedContentDidChange` method is invoked after `content` is changed.", function() {
  var callCount = 0,
      expectedLength;

  var proxy = Ember.ArrayProxy.extend({
    content: Ember.A([1, 2, 3]),

    arrangedContentDidChange: function() {
      equal(this.get('arrangedContent.length'), expectedLength, "hook should be invoked after array has changed");
      callCount++;
    }
  }).create();

  equal(callCount, 0, "hook is not called after creating the object");

  proxy.pushObject(4);
  equal(callCount, 0, "pushing content onto the array doesn't trigger it");

  proxy.get('content').pushObject(5);
  equal(callCount, 0, "pushing content onto the content array doesn't trigger it");

  expectedLength = 2;
  proxy.set('content', Ember.A(['a', 'b']));
  equal(callCount, 1, "replacing the content array triggers the hook");
});


test("The ArrayProxy doesn't explode when assigned a destroyed object", function() {
  var arrayController = Ember.ArrayController.create();
  var proxy = Ember.ArrayProxy.create();

  Ember.run(function() {
    arrayController.destroy();
  });

  Ember.set(proxy, 'content', arrayController);

  ok(true, "No exception was raised");
});
