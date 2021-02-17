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
    let [[, componentNameExpr]] = block[0] as [WireFormat.Statements.Component];

    glimmerAssert(
      Array.isArray(componentNameExpr) &&
        componentNameExpr[0] === SexpOpcodes.GetFreeAsComponentHead,
      `component name is a free variable lookup`
    );

    let componentName = block[3][componentNameExpr[1]];
    assert.equal(componentName, 'ooFX', 'customized component name was used');
  });

  test('customizeComponentName does not cause components to conflict with existing symbols', function (assert) {
    let wire = JSON.parse(
      precompile('{{#let @model as |rental|}}<Rental @renter={{rental}} />{{/let}}', {
        customizeComponentName(input: string) {
          return input.toLowerCase();
        },
      })
    );

    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);

    let [[, , letBlock]] = block[0] as [WireFormat.Statements.Let];
    let [[, componentNameExpr]] = letBlock[0] as [WireFormat.Statements.Component];

    glimmerAssert(
      Array.isArray(componentNameExpr) &&
        componentNameExpr[0] === SexpOpcodes.GetFreeAsComponentHead,
      `component name is a free variable lookup`
    );

    let componentName = block[3][componentNameExpr[1]];
    assert.equal(componentName, 'rental', 'customized component name was used');
  });

  test('customizeComponentName is not invoked on curly components', function (assert) {
    let wire = JSON.parse(
      precompile('{{#my-component}}hello{{/my-component}}', {
        customizeComponentName(input: string) {
          return input.toUpperCase();
        },
      })
    );

    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);

    let [[, componentNameExpr]] = block[0] as [WireFormat.Statements.Block];

    glimmerAssert(
      Array.isArray(componentNameExpr) &&
        componentNameExpr[0] === SexpOpcodes.GetFreeAsComponentHead,
      `component name is a free variable lookup`
    );

    let componentName = block[3][componentNameExpr[1]];
    assert.equal(componentName, 'my-component', 'original component name was used');
  });

  test('customizeComponentName is not invoked on angle-bracket-like name invoked with curlies', function (assert) {
    let wire = JSON.parse(
      precompile('{{#MyComponent}}hello{{/MyComponent}}', {
        customizeComponentName(input: string) {
          return input.toUpperCase();
        },
      })
    );

    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);

    let [[, componentNameExpr]] = block[0] as [WireFormat.Statements.Block];

    glimmerAssert(
      Array.isArray(componentNameExpr) &&
        componentNameExpr[0] === SexpOpcodes.GetFreeAsComponentHead,
      `component name is a free variable lookup`
    );

    let componentName = block[3][componentNameExpr[1]];
    assert.equal(componentName, 'MyComponent', 'original component name was used');
  });

  test('lowercased names are not resolved or customized in resolution mode', (assert) => {
    let wire = JSON.parse(
      precompile('<rental />', {
        customizeComponentName(input: string) {
          return input.split('').reverse().join('');
        },
      })
    );

    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);
    let [openElementExpr] = block[0] as [WireFormat.Statements.OpenElement];

    glimmerAssert(
      Array.isArray(openElementExpr) && openElementExpr[0] === SexpOpcodes.OpenElement,
      `expr is open element`
    );

    let elementName = openElementExpr[1];
    assert.equal(elementName, 'rental', 'element name is correct');
  });
});
