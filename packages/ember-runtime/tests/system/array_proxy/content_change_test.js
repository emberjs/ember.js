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

test("`arrangedContent` should be setup when `content` is set in `init` after `this._super()`.", function() {
  var proxy = Ember.ArrayProxy.extend({
    init: function() {
      this._super();
      this.set('content', Ember.A());
    }
  }).create();

  ok(proxy.get('arrangedContent'), 'Arranged content should be set');
});
