import { compile } from "glimmer-test-helpers";
import { TestEnvironment } from "glimmer-test-helpers";
import { precompile } from "glimmer-compiler";

let env: TestEnvironment;

QUnit.module('Compile options', {
  setup() {
    env = new TestEnvironment();
  }
});

QUnit.test('moduleName option is passed into meta', function() {
  let moduleName = 'It ain\'t hard to tell';
  let template = compile('Hi, {{name}}!', {
    env,
    meta: {
      moduleName
    }
  });
  equal(template.meta.moduleName, moduleName, 'Template has the moduleName');
});

QUnit.module('precompile', {
  setup() {
    env = new TestEnvironment();
  }
});

QUnit.test('returned meta is correct', function() {
  let wire = JSON.parse(precompile('Hi, {{name}}!', {
    meta: {
      moduleName: 'my/module-name',
      metaIsOpaque: 'yes'
    }
  }));

  equal(wire.meta.moduleName, 'my/module-name', 'Template has correct meta');
  equal(wire.meta.metaIsOpaque, 'yes', 'Template has correct meta');
});
