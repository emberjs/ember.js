function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

var originalFlag, originalWarn, warnings;

module("Backported Ember.Evented#trigger", {
  setup: function() {
    originalFlag = Ember.ENV.EVENTED_FIRE;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.EVENTED_FIRE = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

test("trigger works", function() {
  var obj = Ember.Object.createWithMixins(Ember.Evented),
      fooCalledWith;

  obj.on('foo', function() {
    fooCalledWith = [].slice.call(arguments);
  });

  obj.trigger('foo', 'bar', 'baz');

  deepEqual(fooCalledWith, ['bar', 'baz']);
});

test("fire warns on 1.0 level", function() {
  Ember.ENV.EVENTED_FIRE = '1.0';
  var obj = Ember.Object.createWithMixins(Ember.Evented);
  obj.fire('foo');
  equal(warnings.length, 1);
  matches(warnings[0], "Ember.Evented#fire() has been deprecated in favor of trigger() for compatibility with jQuery. It will be removed in 1.0. Please update your code to call trigger() instead.");
});