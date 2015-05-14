import plugins from "ember-template-compiler/plugins";
import {
  registerPlugin
} from "ember-template-compiler/plugins";
import compile from "ember-template-compiler/system/compile";

var originalASTPlugins;

QUnit.module("ember-htmlbars: Ember.HTMLBars.registerASTPlugin", {
  setup() {
    originalASTPlugins = plugins.ast.slice();
  },

  teardown() {
    plugins.ast = originalASTPlugins;
  }
});

QUnit.test("registering a plugin adds it to htmlbars-compiler options", function() {
  expect(2);

  function TestPlugin() {
    ok(true, 'TestPlugin instantiated');
  }

  TestPlugin.prototype.transform = function(ast) {
    ok(true, 'transform was called');

    return ast;
  };

  registerPlugin('ast', TestPlugin);

  compile('some random template');
});

QUnit.test('registering an unknown type throws an error', function() {
  throws(function() {
    registerPlugin('asdf', "whatever");
  }, /Attempting to register "whatever" as "asdf" which is not a valid HTMLBars plugin type./);
});
