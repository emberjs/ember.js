// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var ObserverClass = Ember.Object.extend({

  _keys: null,
  _values: null,
  _before : null,
  _after: null,

  isEnabled: true,

  init: function() {
    this._super();
    this.reset();
  },

  /**
    Invoked when the property changes.  Just records the parameters for
    later analysis.
  */
  propertyDidChange: function(target, key, value) {
    if (this._keys[key] === undefined) { this._keys[key] = 0; }
    this._keys[key]++;
    this._values[key] = value;
  },

  /**
    Resets the recorded results for another run.

    @returns {Object} receiver
  */
  reset: function() {
    this._keys = {};
    this._values = {};
    this._before = null;
    this._after = null;
    return this;
  },

  /**
    Begins observing the passed key names on the passed object.  Any changes
    on the named properties will be recorded.

    @param {Ember.Enumerable} obj
      The enumerable to observe.

    @returns {Object} receiver
  */
  observe: function(obj) {
    if (obj.addObserver) {
      var keys = Array.prototype.slice.call(arguments, 1),
          loc  = keys.length;
      while(--loc>=0) obj.addObserver(keys[loc], this, 'propertyDidChange');
    } else {
      this.isEnabled = false;
    }
    return this;
  },

  /**
    Returns true if the passed key was invoked.  If you pass a value as
    well then validates that the values match.

    @param {String} key
      Key to validate

    @param {Object} value
      (Optional) value

    @returns {Boolean}
  */
  validate: function(key, value) {
    if (!this.isEnabled) return true;
    if (!this._keys[key]) return false;
    if (arguments.length>1) return this._values[key] === value;
    else return true;
  },

  /**
    Returns times the observer as invoked.

    @param {String} key
      Key to check
  */
  timesCalled: function(key) {
    return this._keys[key] || 0;
  },

  /**
    begins acting as an enumerable observer.
  */
  observeEnumerable: function(obj) {
    obj.addEnumerableObserver(this);
    return this;
  },

  stopObserveEnumerable: function(obj) {
    obj.removeEnumerableObserver(this);
    return this;
  },

  enumerableWillChange: function() {
    equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  enumerableDidChange: function() {
    equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  }

});


/**
  Defines a test suite that can be used to test any object for compliance
  with any enumerable.  To use, extend this object and define the required
  methods to generate new object instances for testing, etc.

  You can also add your own tests by defining new methods beginning with the
  word 'test'
*/
var EnumerableTests = Ember.Object.extend({

  /**
    Define a name for these tests - all modules are prefixed w/ it.

    @property {String}
  */
  name: Ember.required(String),

  /**
    Implement to return a new enumerable object for testing.  Should accept
    either no parameters, a single number (indicating the desired length of
    the collection) or an array of objects.

    @param {Array} content
      An array of items to include in the enumerable optionally.

    @returns {Ember.Enumerable} a new enumerable
  */
  newObject: Ember.required(Function),

  /**
    Implement to return a set of new fixture objects that can be applied to
    the enumerable.  This may be passed into the newObject method.

    @param {Number} count
      The number of items required.

    @returns {Array} array of items
  */
  newFixture: function(cnt) {
    var ret = [];
    while(--cnt>=0) ret.push(Ember.generateGuid());
    return ret;
  },

  /**
    Implement accept an instance of the enumerable and return an array
    containing the objects in the enumerable.  This is used only for testing
    so performance is not important.

    @param {Ember.Enumerable} enumerable
      The enumerable to convert.

    @returns {Array} array of items
  */
  toArray: Ember.required(Function),

  /**
    Implement this method if your object can mutate internally (even if it
    does not support the MutableEnumerable API).  The method should accept
    an object of your desired type and modify it somehow.  Suite tests will
    use this to ensure that all appropriate caches, etc. clear when the
    mutation occurs.

    If you do not define this optional method, then mutation-related tests
    will be skipped.

    @param {Ember.Enumerable} enumerable
      The enumerable to mutate

    @returns {void}
  */
  mutate: function(){},

  /**
    Becomes true when you define a new mutate() method, indicating that
    mutation tests should run.  This is calculated automatically.

    @property {Boolean}
  */
  canTestMutation: Ember.computed(function() {
    return this.mutate !== EnumerableTests.prototype.mutate;
  }).property().cacheable(),

  /**
    Invoked to actually run the test - overridden by mixins
  */
  run: function() {},


  /**
    Creates a new observer object for testing.  You can add this object as an
    observer on an array and it will record results anytime it is invoked.
    After running the test, call the validate() method on the observer to
    validate the results.
  */
  newObserver: function(obj) {
    var ret = Ember.get(this, 'observerClass').create();
    if (arguments.length>0) ret.observe.apply(ret, arguments);
    return ret;
  },

  observerClass: ObserverClass

});

EnumerableTests.reopenClass({

  plan: null,

  run: function() {
    var C = this;
    return new C().run();
  },

  module: function(desc, opts) {
    if (!opts) opts = {};
    var setup = opts.setup, teardown = opts.teardown;
    this.reopen({
      run: function() {
        this._super();
        var title = Ember.get(this,'name')+': '+desc, ctx = this;
        module(title, {
          setup: function() {
            if (setup) setup.call(ctx);
          },

          teardown: function() {
            if (teardown) teardown.call(ctx);
          }
        });
      }
    });
  },

  test: function(name, func) {
    this.reopen({
      run: function() {
        this._super();
        var ctx = this;
        if (!func) test(name); // output warning
        else test(name, function() { func.call(ctx); });
      }
    });
  },

  // convert to guids to minimize logging.
  same: function(actual, exp, message) {
    actual = (actual && actual.map) ? actual.map(function(x) { return Ember.guidFor(x); }) : actual;
    exp = (exp && exp.map) ? exp.map(function(x) { return Ember.guidFor(x); }) : exp;
    return deepEqual(actual, exp, message);
  },

  // easy way to disable tests
  notest: function() {}

});

Ember.EnumerableTests = EnumerableTests;
Ember.EnumerableTests.ObserverClass = ObserverClass;

require('ember-runtime/~tests/suites/enumerable/compact');
require('ember-runtime/~tests/suites/enumerable/contains');
require('ember-runtime/~tests/suites/enumerable/every');
require('ember-runtime/~tests/suites/enumerable/filter');
require('ember-runtime/~tests/suites/enumerable/find');
require('ember-runtime/~tests/suites/enumerable/firstObject');
require('ember-runtime/~tests/suites/enumerable/forEach');
require('ember-runtime/~tests/suites/enumerable/mapProperty');
require('ember-runtime/~tests/suites/enumerable/invoke');
require('ember-runtime/~tests/suites/enumerable/lastObject');
require('ember-runtime/~tests/suites/enumerable/map');
require('ember-runtime/~tests/suites/enumerable/reduce');
require('ember-runtime/~tests/suites/enumerable/some');
require('ember-runtime/~tests/suites/enumerable/toArray');
require('ember-runtime/~tests/suites/enumerable/uniq');
require('ember-runtime/~tests/suites/enumerable/without');


