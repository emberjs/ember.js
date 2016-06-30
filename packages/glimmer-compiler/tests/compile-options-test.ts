import { compile } from "glimmer-test-helpers";
import { TestEnvironment } from "glimmer-test-helpers";

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
    moduleName
  });
  equal(template.raw.meta.moduleName, moduleName, 'Template has the moduleName');
});
