var originalDebounce = Ember.run.backburner.debounce;
var wasCalled = false;
module('Ember.run.debounce',{
  setup: function() {
    Ember.run.backburner.debounce = function() { wasCalled = true; };
  },
  teardown: function() {
    Ember.run.backburner.debounce = originalDebounce;
  }
});

test('Ember.run.debounce uses Backburner.debounce', function() {
  Ember.run.debounce(function() {});
  ok(wasCalled, 'Ember.run.debounce used');
});

