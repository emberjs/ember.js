import { templateFactory } from '@glimmer/opcode-compiler';
import { precompile } from '@glimmer/compiler';
import { SerializedTemplateWithLazyBlock, AnnotatedModuleLocator } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';

let serializedTemplate: SerializedTemplateWithLazyBlock<AnnotatedModuleLocator>;
let serializedTemplateNoId: SerializedTemplateWithLazyBlock<AnnotatedModuleLocator>;

export const DEFAULT_TEST_META: AnnotatedModuleLocator = Object.freeze({
  kind: 'unknown',
  meta: {},
  module: 'some/template',
  name: 'default',
});

QUnit.module('templateFactory', {
  beforeEach() {
    let templateJs = precompile('<div>{{name}}</div>', {
      meta: {
        kind: 'unknown',
        meta: {},
        module: 'template/module/name',
        name: 'default',
      },
    });
    serializedTemplate = JSON.parse(templateJs);
    serializedTemplate.id = 'server-id-1';

    serializedTemplateNoId = JSON.parse(templateJs);
    serializedTemplateNoId.id = null;
  },
});

QUnit.test('id of serialized template is exposed on the factory', assert => {
  let factory = templateFactory(serializedTemplate);
  assert.ok(factory.id, 'is present');
  assert.equal(factory.id, serializedTemplate.id, 'id matches serialized template id');
});

QUnit.test('generates id if no id is on the serialized template', assert => {
  let factory1 = templateFactory(serializedTemplateNoId);
  let factory2 = templateFactory(serializedTemplateNoId);
  assert.ok(factory1.id, 'is present');
  assert.ok(factory2.id, 'is present');
  assert.notEqual(
    factory1.id,
    factory2.id,
    'factories without underlying id create new id per factory'
  );
});

QUnit.test('id of template matches factory', assert => {
  let factory = templateFactory(serializedTemplate);
  let template = factory.create();
  assert.ok(template.id, 'is present');
  assert.equal(template.id, factory.id, 'template id matches factory id');
});

QUnit.test('meta is accessible from factory', assert => {
  let factory = templateFactory(serializedTemplate);
  assert.deepEqual(factory.meta, {
    kind: 'unknown',
    meta: {},
    module: 'template/module/name',
    name: 'default',
  });
});

QUnit.test('meta is accessible from template', assert => {
  let factory = templateFactory(serializedTemplate);
  let template = factory.create();
  assert.deepEqual(
    template.referrer as AnnotatedModuleLocator,
    {
      kind: 'unknown',
      meta: {},
      module: 'template/module/name',
      name: 'default',
    },
    'template has expected meta'
  );
});

QUnit.test('can inject per environment things into meta', assert => {
  let owner = {};
  let factory = templateFactory<AnnotatedModuleLocator>(serializedTemplate);

  let template = factory.create(
    assign({}, DEFAULT_TEST_META, {
      owner,
    })
  );

  assert.strictEqual(template.referrer.owner, owner, 'is owner');
  assert.deepEqual(
    template.referrer as AnnotatedModuleLocator & { owner: unknown },
    {
      kind: 'unknown',
      meta: {},
      module: 'template/module/name',
      name: 'default',
      owner,
    },
    'template has expected meta'
  );
});
