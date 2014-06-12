import EmberObject from "ember-runtime/system/object";
import {required} from "ember-metal/mixin";
import {guidFor, generateGuid} from "ember-metal/utils";
import {get} from "ember-metal/property_get";
import EnumerableUtils from "ember-metal/enumerable_utils";

var forEach = EnumerableUtils.forEach;

/**
  @class
  A Suite can be used to define a reusable set of unit tests that can be
  applied to any object.  Suites are most useful for defining tests that
  work against a mixin or plugin API.  Developers implementing objects that
  use the mixin or support the API can then run these tests against their
  own code to verify compliance.

  To define a suite, you need to define the tests themselves as well as a
  callback API implementors can use to tie your tests to thier specific class.

  ## Defining a Callback API

  To define the callback API, just extend this class and add your properties
  or methods that must be provided.  Use Ember.required() placeholders for
  any properties that implementors must define themselves.

  ## Defining Unit Tests

  To add unit tests, use the suite.module() or suite.test() methods instead
  of a regular module() or test() method when defining your tests.  This will
  add the tests to the suite.

  ## Using a Suite

  To use a Suite to test your own objects, extend the suite subclass and
  define any required methods.  Then call run() on the new subclass.  This
  will create an instance of your class and then defining the unit tests.

  @extends Ember.Object
  @private
*/
var Suite = EmberObject.extend({

  /**
    Define a name for these tests - all modules are prefixed w/ it.

    @type String
  */
  name: required(String),

  /**
    Invoked to actually run the test - overridden by mixins
  */
  run: function() {}

});

Suite.reopenClass({

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
        var title = get(this, 'name')+': '+desc, ctx = this;
        QUnit.module(title, {
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
    actual = (actual && actual.map) ? actual.map(function(x) { return guidFor(x); }) : actual;
    exp = (exp && exp.map) ? exp.map(function(x) { return guidFor(x); }) : exp;
    return deepEqual(actual, exp, message);
  },

  // easy way to disable tests
  notest: function() {},

  importModuleTests: function(builder) {
    var self = this;
    this.module(builder._module);

    forEach(builder._tests, function(descAndFunc) {
      self.test.apply(self, descAndFunc);
    });
  }
});

var SuiteModuleBuilder = EmberObject.extend({
  _module: null,
  _tests: null,

  init: function(){
    this._tests = [];
  },

  module: function(name) { this._module = name; },

  test: function(name, func) {
    this._tests.push([name, func]);
  }
});

export {SuiteModuleBuilder, Suite};

export default Suite;
