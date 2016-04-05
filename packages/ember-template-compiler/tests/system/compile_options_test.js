import defaultPlugins from 'ember-template-compiler/plugins';
import compileOptions from 'ember-template-compiler/system/compile_options';


function comparePlugins(options) {
  let results = compileOptions(options);
  let expectedPlugins = defaultPlugins.ast.slice();

  expectedPlugins = expectedPlugins.concat(options.plugins.ast.slice());

  deepEqual(results.plugins.ast, expectedPlugins);
}

QUnit.module('ember-htmlbars: compile_options');

QUnit.test('repeated function calls should be able to have separate plugins', function() {
  comparePlugins({
    plugins: {
      ast: ['foo', 'bar']
    }
  });

  comparePlugins({
    plugins: {
      ast: ['baz', 'qux']
    }
  });
});

QUnit.test('options is not required', function() {
  let results = compileOptions();

  deepEqual(results.plugins.ast, defaultPlugins.ast.slice());
});

QUnit.test('options.plugins is not required', function() {
  let results = compileOptions({});

  deepEqual(results.plugins.ast, defaultPlugins.ast.slice());
});

QUnit.test('options.plugins.ast is not required', function() {
  let results = compileOptions({
    plugins: {}
  });

  deepEqual(results.plugins.ast, defaultPlugins.ast.slice());
});
