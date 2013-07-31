function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

var originalFlag, originalWarn, warnings;

module("Backported Ember.Object.create / createWithMixins", {
  setup: function() {
    originalFlag = Ember.ENV.CREATE_WITH_MIXINS;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.CREATE_WITH_MIXINS = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

test("createWithMixins exists", function() {
  ok(Ember.Object.createWithMixins);
});

test("createWithMixins instantiates objects", function() {
  var obj = Ember.Object.createWithMixins({ foo: 'bar' });
  ok(obj);
  equal(obj.get('foo'), 'bar');
});

test('createWithMixins works on subclasses', function() {
  var Klass = Ember.Object.extend({
    foo: 'bar'
  });
  var obj = Klass.createWithMixins({ foo: 'baz' });
  equal(obj.get('foo'), 'baz');
});

test("createWithMixins doesn't warn with warnings on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = 'warn';

  Ember.Object.createWithMixins(Ember.Mixin.create());
  equal(warnings.length, 0);
});

test("passing a mixin with warnings off", function() {
  Ember.ENV.CREATE_WITH_MIXINS = null;
  Ember.Object.create(Ember.Mixin.create());
  equal(warnings.length, 0);
});

test("passing a mixin with warnings on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = 'warn';

  Ember.Object.create(Ember.Mixin.create());
  equal(warnings.length, 1);
  matches(warnings[0], "Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.");
});

test("passing a mixin with errors on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = '1.0';
  raises(function() {
    Ember.Object.create(Ember.Mixin.create());
  }, /Ember\.Object\.create no longer supports mixing in other definitions, use createWithMixins instead\./);
});

test("passing computed properties with warnings off", function() {
  Ember.ENV.CREATE_WITH_MIXINS = null;

  Ember.Object.create({
    aProp: Ember.computed(function() { return 'three'; })
  });
  equal(warnings.length, 0);
});

test("passing computed properties with warnings on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = 'warn';

  Ember.Object.create({
    aProp: Ember.computed(function() { return 'three'; })
  });
  equal(warnings.length, 1);
  matches(warnings[0], "Ember.Object.create no longer supports defining computed properties.");
});

test("passing a computed property with errors on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = '1.0';
  raises(function() {
    Ember.Object.create({
      aProp: Ember.computed(function() { return 'three'; })
    });
  }, /Ember\.Object\.create no longer supports defining computed properties\./);
});

test("passing methods that use _super with warnings off", function() {
  Ember.ENV.CREATE_WITH_MIXINS = null;

  Ember.Object.create({
    aProp: function() { return this._super(); }
  });
  equal(warnings.length, 0);
});

test("passing methods that use _super with warnings on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = 'warn';

  Ember.Object.create({
    aProp: function() { return this._super(); }
  });
  equal(warnings.length, 1);
  matches(warnings[0], "Ember.Object.create no longer supports defining methods that call _super.");
});

test("passing methods that *don't* use _super with warnings on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = 'warn';

  Ember.Object.create({
    aProp: function() { return this._notSuper(); }
  });
  equal(warnings.length, 0);
});

test("passing methods that use _super with errors on", function() {
  Ember.ENV.CREATE_WITH_MIXINS = '1.0';

  raises(function() {
    Ember.Object.create({
      aProp: function() { return this._super(); }
    });
  }, /Ember\.Object\.create no longer supports defining methods that call _super\./);
});

