import {
  default as plugins,
  registerASTPlugin
} from "ember-htmlbars/plugins";
import compile from "ember-htmlbars/system/compile";

var originalASTPlugins;

QUnit.module("ember-htmlbars: Ember.HTMLBars.registerASTPlugin", {
  setup: function() {
    originalASTPlugins = plugins.ast.slice();
  },

  teardown: function() {
    plugins.ast = originalASTPlugins;
  }
});

test("registering a plugin adds it to htmlbars-compiler options", function() {
  expect(2);

  function TestPlugin() {
    ok(true, 'TestPlugin instantiated');
  }

  TestPlugin.prototype.transform = function(ast) {
    ok(true, 'transform was called');

    return ast;
  };

  registerASTPlugin(TestPlugin);

  compile('some random template');
});
