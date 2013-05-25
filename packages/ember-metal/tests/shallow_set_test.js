require('ember-metal/shallow_set');
require('ember-metal/computed');
require('ember-metal/observer');

module('Ember.shallowSet');

test('shallowSet avoids unknownProperty', function() {
  var target = {};
  var proxy = {
    target: target,
    unknownProperty: function (key) {
      return target[key];
    },
    setUnknownProperty: function (key, value) {
      return target[key] = value;
    }
  };
  Ember.set(proxy, 'baz', 'boo');
  equal(Ember.get(proxy, 'baz'), 'boo', 'is set on proxy');
  equal(Ember.get(target, 'baz'), 'boo', 'is set on target');

  Ember.shallowSet(proxy, 'foo', 'bar');

  equal(Ember.get(proxy, 'foo'), 'bar', 'is set on proxy');
  equal(Ember.get(target, 'foo'), undefined, 'is not set on target');

  Ember.defineProperty(proxy, 'cp', Ember.computed(function(key, value) {
    return 'computed ' + value;
  }));

  Ember.shallowSet(proxy, 'cp', 'foo');

  equal(Ember.get(proxy, 'cp'), 'computed foo', 'does not clobber computed property if property is known');

  var changed;
  Ember.addObserver(proxy, 'watched', function () {
    changed = Ember.get(proxy, 'watched');
  });

  equal('watched' in proxy, false, 'precond property is unknown');

  Ember.shallowSet(proxy, 'watched', 'boo');

  equal(changed, 'boo', 'when shallowSet defines the property, it is observable');
});
