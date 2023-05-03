import { precompile } from '@glimmer/compiler';
import { preprocess } from '../..';
import { module } from '../support';
import { unwrapTemplate, assert as glimmerAssert, expect } from '@glimmer/util';
import { SexpOpcodes, WireFormat } from '@glimmer/interfaces';
import { TemplateWithIdAndReferrer } from '@glimmer/opcode-compiler';

module('[glimmer-compiler] Compile options', ({ test }) => {
  test('moduleName option is passed into meta', (assert) => {
    let moduleName = "It ain't hard to tell";
    let template = unwrapTemplate(
      preprocess('Hi, {{name}}!', { meta: { moduleName } })
    ) as TemplateWithIdAndReferrer;
    assert.strictEqual(template.referrer.moduleName, moduleName, 'Template has the moduleName');
  });
});

module('[glimmer-compiler] precompile', ({ test }) => {
  test('returned module name correct', (assert) => {
    let wire = JSON.parse(
      precompile('Hi, {{name}}!', {
        meta: { moduleName: 'my/module-name' },
      })
    );

    assert.strictEqual(wire.moduleName, 'my/module-name', 'Template has correct meta');
  });

  test('lexicalScope is used if present', (assert) => {
    // eslint-disable-next-line no-eval
    let wire: WireFormat.SerializedTemplateWithLazyBlock = eval(
      `(${precompile('<hello /><div />', {
        lexicalScope: (variable: string) => variable === 'hello',
      })})`
    );

    const hello = {};
    assert.ok(hello, 'the lexical variable is present');

    // eslint-disable-next-line no-eval
    let block: WireFormat.SerializedTemplateBlock = JSON.parse(wire.block);
    let [statements] = block;
    let [[, componentNameExpr], ...divExpr] = statements as [
      WireFormat.Statements.Component,
      ...WireFormat.Statement[]
    ];

    assert.deepEqual(wire.scope?.(), [hello]);

    assert.deepEqual(
      componentNameExpr,
      [SexpOpcodes.GetLexicalSymbol, 0],
      'The component invocation is for the lexical symbol `hello` (the 0th lexical entry)'
    );

    assert.deepEqual(divExpr, [
      [SexpOpcodes.OpenElement, 0],
      [SexpOpcodes.FlushElement],
      [SexpOpcodes.CloseElement],
    ]);
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
    assert.strictEqual(componentName, 'ooFX', 'customized component name was used');
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
    assert.strictEqual(componentName, 'rental', 'customized component name was used');
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
    assert.strictEqual(componentName, 'my-component', 'original component name was used');
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
    assert.strictEqual(componentName, 'MyComponent', 'original component name was used');
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
    assert.strictEqual(elementName, 'rental', 'element name is correct');
  });
});
