import {
  registerPlugin,
  compile,
  removePlugin,
  packageName,
  engineName
} from './utils/helpers';

function TestPlugin() {
  ok(true, 'TestPlugin instantiated');
}

TestPlugin.prototype.transform = function(ast) {
  ok(true, 'transform was called');

  return ast;
};

QUnit.module(`ember-${packageName}: Registering AST Plugins`, {
  setup(assert) {
  },

  teardown() {
    removePlugin('ast', TestPlugin);
  }
});

QUnit.test('registering a plugin adds it to htmlbars-compiler options', function() {
  expect(2);

  registerPlugin('ast', TestPlugin);

  compile('some random template', { plugins: { ast: [] } });
});

QUnit.test('registering an unknown type throws an error', function() {
  throws(function() {
    registerPlugin('asdf', 'whatever');
  }, `Attempting to register whatever as "asdf" which is not a valid ${engineName} plugin type.`);
});

QUnit.test('can register AST plugins through the options', function() {
  expect(2);

  compile('some random template', { plugins: { ast: [TestPlugin] } });
});
