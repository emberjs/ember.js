var trackable;

module("Ember.Trackable", {
  setup: function() {
    Ember.run(function() {
      trackable = Ember.Object.createWithMixins(Ember.Trackable, {
        trackedProperties: ['name'],
        name: 'Tom'
      });
      trackable.set('name', 'Yehuda');
      trackable.set('name', 'Steve');
    });
  },

  teardown: function() {
    Ember.run(function() {
      trackable.destroy();
    });
  }
});

test("Trackable preserves existing behavior", function() {
  equal(trackable.get('name'), 'Steve');
});

test("you can retreive the previous value", function() {
  equal(trackable.getPrevious('name'), 'Yehuda');
});

test("you can retreive the first value", function() {
  equal(trackable.getFirst('name'), 'Tom');
});

test("you can retreive the entire history of the property", function() {
  deepEqual(trackable.getHistory('name'), ['Tom', 'Yehuda']);
});