import { LazyTestEnvironment, DEFAULT_TEST_META } from '@glimmer/test-helpers';
import { precompile } from '@glimmer/compiler';

let env: LazyTestEnvironment;

QUnit.module('[glimmer-compiler] precompile');

QUnit.module('[glimmer-compiler] Compile options', {
  beforeEach() {
    env = new LazyTestEnvironment();
  },
});

QUnit.test('moduleName option is passed into meta', assert => {
  let moduleName = "It ain't hard to tell";
  let template = env.preprocess('Hi, {{name}}!', { ...DEFAULT_TEST_META, moduleName });
  assert.equal(template.referrer.moduleName, moduleName, 'Template has the moduleName');
});

QUnit.module('[glimmer-compiler] precompile', {
  beforeEach() {
    env = new LazyTestEnvironment();
  },
});

QUnit.test('returned meta is correct', assert => {
  let wire = JSON.parse(
    precompile('Hi, {{name}}!', {
      meta: {
        moduleName: 'my/module-name',
        metaIsOpaque: 'yes',
      },
    })
  );

  assert.equal(wire.meta.moduleName, 'my/module-name', 'Template has correct meta');
  assert.equal(wire.meta.metaIsOpaque, 'yes', 'Template has correct meta');
});

QUnit.test('customizeComponentName is used if present', function(assert) {
  let wire = JSON.parse(
    precompile('<XFoo />', {
      meta: {
        moduleName: 'my/module-name',
        metaIsOpaque: 'yes',
      },
      customizeComponentName(input: string) {
        return input
          .split('')
          .reverse()
          .join('');
      },
    })
  );

  let [componentInvocation] = JSON.parse(wire.block).statements;
  assert.equal(componentInvocation[1], 'ooFX', 'customized component name was used');
});
