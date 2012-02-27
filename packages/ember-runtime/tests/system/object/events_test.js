module("Object events");

test("a listener can be added to an object", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.create(Ember.Evented);

  obj.on('event!', F);
  obj.fire('event!');

  equal(count, 1, "the event was triggered");

  obj.fire('event!');

  equal(count, 2, "the event was triggered");
});

test("triggering an event can have arguments", function() {
  var self, args;

  var obj = Ember.Object.create(Ember.Evented);

  obj.on('event!', function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.fire('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, obj);
});

test("binding an event can specify a different target", function() {
  var self, args;

  var obj = Ember.Object.create(Ember.Evented);
  var target = {};

  obj.on('event!', target, function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.fire('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, target);
});

