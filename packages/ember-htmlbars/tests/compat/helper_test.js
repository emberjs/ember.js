import {
  makeHandlebarsCompatibleHelper
} from "ember-htmlbars/compat/helper";

var fakeView, fakeParams, fakeHash, fakeOptions, fakeEnv;

QUnit.module('ember-htmlbars: Handlebars compatible helpers', {
  setup: function() {
    fakeView = {};
    fakeParams = [];
    fakeHash = {};
    fakeOptions = {
      morph: {
        update: function() { }
      }
    };
    fakeEnv = {};
  },

  teardown: function() {

  }
});

test('wraps provided function so that original path params are provided to the helper', function() {
  expect(2);

  function someHelper(param1, param2, options) {
    equal(param1, 'blammo');
    equal(param2, 'blazzico');
  }

  var compatHelper = makeHandlebarsCompatibleHelper(someHelper);

  fakeParams = [ 'blammo', 'blazzico' ];
  compatHelper._preprocessArguments(fakeView, fakeParams, fakeHash, fakeOptions, fakeEnv);

  compatHelper(fakeParams, fakeHash, fakeOptions, fakeEnv);
});

test('combines `env` and `options` for the wrapped helper', function() {
  expect(2);

  function someHelper(options) {
    equal(options.first, 'Max');
    equal(options.second, 'James');
  }

  var compatHelper = makeHandlebarsCompatibleHelper(someHelper);

  fakeOptions.first = 'Max';
  fakeEnv.second = 'James';

  compatHelper._preprocessArguments(fakeView, fakeParams, fakeHash, fakeOptions, fakeEnv);
  compatHelper(fakeParams, fakeHash, fakeOptions, fakeEnv);
});

test('calls morph.update with the return value from the helper', function() {
  expect(1);

  function someHelper(options) {
    return 'Lucy!';
  }

  var compatHelper = makeHandlebarsCompatibleHelper(someHelper);

  fakeOptions.morph.update = function(value) {
    equal(value, 'Lucy!');
  };

  compatHelper._preprocessArguments(fakeView, fakeParams, fakeHash, fakeOptions, fakeEnv);
  compatHelper(fakeParams, fakeHash, fakeOptions, fakeEnv);
});
