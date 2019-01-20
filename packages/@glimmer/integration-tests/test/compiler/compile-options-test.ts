import { precompile } from '@glimmer/compiler';
import { preprocess, DEFAULT_TEST_META } from '@glimmer/integration-tests';
import { module } from '../support';
import { assign } from '@glimmer/util';

QUnit.module('[glimmer-compiler] precompile');

module('[glimmer-compiler] Compile options', ({ test }) => {
  test('moduleName option is passed into meta', assert => {
    let moduleName = "It ain't hard to tell";
    let template = preprocess(
      'Hi, {{name}}!',
      assign({}, DEFAULT_TEST_META, { module: moduleName })
    );
    assert.equal(template.referrer.module, moduleName, 'Template has the moduleName');
  });
});

module('[glimmer-compiler] precompile', ({ test }) => {
  test('returned meta is correct', assert => {
    let wire = JSON.parse(
      precompile('Hi, {{name}}!', {
        meta: {
          moduleName: 'my/module-name',
          metaIsunknown: 'yes',
        },
      })
    );

    assert.equal(wire.meta.moduleName, 'my/module-name', 'Template has correct meta');
    assert.equal(wire.meta.metaIsunknown, 'yes', 'Template has correct meta');
  });

  test('customizeComponentName is used if present', function(assert) {
    let wire = JSON.parse(
      precompile('<XFoo />', {
        meta: {
          moduleName: 'my/module-name',
          metaIsunknown: 'yes',
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
});
