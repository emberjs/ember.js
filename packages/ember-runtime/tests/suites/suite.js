import { guidFor } from 'ember-utils';
import EmberObject from '../../system/object';
import { get } from 'ember-metal';

/*
  @class
  A Suite can be used to define a reusable set of unit tests that can be
  applied to any object.  Suites are most useful for defining tests that
  work against a mixin or plugin API.  Developers implementing objects that
  use the mixin or support the API can then run these tests against their
  own code to verify compliance.

  To define a suite, you need to define the tests themselves as well as a
  callback API implementers can use to tie your tests to their specific class.

  ## Defining a Callback API

  To define the callback API, just extend this class and add your properties
  or methods that must be provided.

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
const Suite = EmberObject.extend({

  /*
    __Required.__ You must implement this method to apply this mixin.

    Define a name for these tests - all modules are prefixed w/ it.

    @type String
  */
  name: null,

  /*
    Invoked to actually run the test - overridden by mixins
  */
  run() {}

});

Suite.reopenClass({

  plan: null,

  run() {
    let C = this;
    return new C().run();
  },

  module(desc, opts) {
    if (!opts) {
      opts = {};
    }

    let setup = opts.setup;
    let teardown = opts.teardown;
    this.reopen({
      run() {
        this._super(...arguments);
        let title = get(this, 'name') + ': ' + desc;
        let ctx = this;
        QUnit.module(title, {
          setup() {
            if (setup) {
              setup.call(ctx);
            }
          },

          teardown() {
            if (teardown) {
              teardown.call(ctx);
            }
          }
        });
      }
    });
  },

  test(name, func) {
    this.reopen({
      run() {
        this._super(...arguments);
        let ctx = this;

        if (!func) {
          QUnit.test(name); // output warning
        } else {
          QUnit.test(name, () => func.call(ctx));
        }
      }
    });
  },

  // convert to guids to minimize logging.
  same(actual, exp, message) {
    actual = (actual && actual.map) ? actual.map(x => guidFor(x)) : actual;
    exp = (exp && exp.map) ? exp.map(x => guidFor(x)) : exp;
    return deepEqual(actual, exp, message);
  },

  // easy way to disable tests
  notest() {},

  importModuleTests(builder) {
    this.module(builder._module);

    builder._tests.forEach((descAndFunc) => {
      this.test.apply(this, descAndFunc);
    });
  }
});

const SuiteModuleBuilder = EmberObject.extend({
  _module: null,
  _tests: null,

  init() {
    this._tests = [];
  },

  module(name) { this._module = name; },

  test(name, func) {
    this._tests.push([name, func]);
  }
});

export { SuiteModuleBuilder, Suite };

export default Suite;
