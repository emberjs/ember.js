module("Object events");

test("a listener can be added to an object", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.on('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 2, "the event was triggered");
});

test("a listener can be added and removed automatically the first time it is triggered", function() {
  var count = 0;
  var F = function() { count++; };

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.one('event!', F);
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});

test("triggering an event can have arguments", function() {
  var self, args;

  var obj = Ember.Object.createWithMixins(Ember.Evented);

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

  var obj = Ember.Object.createWithMixins(Ember.Evented);

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

  var obj = Ember.Object.createWithMixins(Ember.Evented);
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

  var obj = Ember.Object.createWithMixins(Ember.Evented);

  obj.one('event!', target, 'fn');
  obj.trigger('event!');

  equal(count, 1, "the event was triggered");

  obj.trigger('event!');

  equal(count, 1, "the event was not triggered again");
});

test("a listener registered with one can be removed with off", function() {
  var obj = Ember.Object.createWithMixins(Ember.Evented, {
    F: function() {}
  });
  var F = function() {};

  obj.one('event!', F);
  obj.one('event!', obj, 'F');

  equal(obj.has('event!'), true, 'has events');

  obj.off('event!', F);
  obj.off('event!', obj, 'F');

  equal(obj.has('event!'), false, 'has no more events');
});

test("adding and removing listeners should be chainable", function() {
  var obj = Ember.Object.createWithMixins(Ember.Evented);
  var F = function() {};

  var ret = obj.on('event!', F);
  equal(ret, obj, '#on returns self');

  ret = obj.off('event!', F);
  equal(ret, obj, '#off returns self');

  ret = obj.one('event!', F);
  equal(ret, obj, '#one returns self');
});