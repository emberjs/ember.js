import { precompile } from '@glimmer/compiler';
import { preprocess } from '../..';
import { module } from '../support';
import { unwrapTemplate, assert as glimmerAssert } from '@glimmer/util';
import { SexpOpcodes, WireFormat } from '@glimmer/interfaces';
import { TemplateWithIdAndReferrer } from '@glimmer/opcode-compiler';

module('[glimmer-compiler] Compile options', ({ test }) => {
  test('moduleName option is passed into meta', (assert) => {
    let moduleName = "It ain't hard to tell";
    let template = unwrapTemplate(
      preprocess('Hi, {{name}}!', { meta: { moduleName } })
    ) as TemplateWithIdAndReferrer;
    assert.equal(template.referrer.moduleName, moduleName, 'Template has the moduleName');
  });
});

module('[glimmer-compiler] precompile', ({ test }) => {
  test('returned module name correct', (assert) => {
    let wire = JSON.parse(
      precompile('Hi, {{name}}!', {
        meta: { moduleName: 'my/module-name' },
      })
    );

    assert.equal(wire.moduleName, 'my/module-name', 'Template has correct meta');
  });

  test('customizeComponentName is used if present', function (assert) {
    let wire = JSON.parse(
      precompile('<XFoo />', {
        customizeComponentName(input: string) {
          return input.split('').reverse().join('');
        },
      })
    );

    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);
    let [[, componentNameExpr]] = block.statements as [WireFormat.Statements.Component];

    glimmerAssert(
      Array.isArray(componentNameExpr) &&
        componentNameExpr[0] === SexpOpcodes.GetFreeAsComponentHead,
      `component name is a free variable lookup`
    );

    let componentName = block.upvars[componentNameExpr[1]];
    assert.equal(componentName, 'ooFX', 'customized component name was used');
  });
});
