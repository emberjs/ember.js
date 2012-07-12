module("Object events");

test("a listener can be added to an object", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.create(Ember.Evented);

  obj.on('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 2, "the event was triggered");
});

test("a listener can be added and removed automatically the first time it is triggerd", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.create(Ember.Evented);

  obj.one('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});

test("triggering an event can have arguments", function() {
  var self, args;

  var obj = Ember.Object.create(Ember.Evented);

  obj.on('event!', function() {
    args = [].slice.call(arguments);
    self = this;
  });

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, obj);
});

test("a listener can be added and removed automatically and have arguments", function() {
  var self, args, count = 0;

  var obj = Ember.Object.create(Ember.Evented);

  obj.one('event!', function() {
    args = [].slice.call(arguments);
    self = this;
    count++;
  });

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, obj);
  equal(count, 1, "the event is triggered once");

  obj.trigger('event!', "baz", "bat");

  deepEqual(args, [ "foo", "bar" ]);
  equal(count, 1, "the event was not triggered again");
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

  obj.trigger('event!', "foo", "bar");

  deepEqual(args, [ "foo", "bar" ]);
  equal(self, target);
});

test("a listener registered with one can take method as string and can be added with different target", function() {
  var count = 0;
  var target = {};
  target.fn = function() { count++; };

  var obj = Ember.Object.create(Ember.Evented);

  obj.one('event!', target, 'fn');
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});
