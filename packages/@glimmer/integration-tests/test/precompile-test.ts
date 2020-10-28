import { precompile } from '@glimmer/compiler';
import { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/util';
import {
  templateFactory,
  TemplateFactoryWithIdAndMeta,
  TemplateWithIdAndReferrer,
} from '@glimmer/opcode-compiler';

let serializedTemplate: SerializedTemplateWithLazyBlock;
let serializedTemplateNoId: SerializedTemplateWithLazyBlock;

QUnit.module('templateFactory', {
  beforeEach() {
    let templateJs = precompile('<div>{{name}}</div>', {
      meta: { moduleName: 'template/module/name' },
    });
    serializedTemplate = JSON.parse(templateJs);
    serializedTemplate.id = 'server-id-1';

    serializedTemplateNoId = JSON.parse(templateJs);
    serializedTemplateNoId.id = null;
  },
});

QUnit.test('id of serialized template is exposed on the factory', (assert) => {
  let factory = templateFactory(serializedTemplate) as TemplateFactoryWithIdAndMeta;
  assert.ok(factory.__id, 'is present');
  assert.equal(factory.__id, serializedTemplate.id, 'id matches serialized template id');
});

QUnit.test('generates id if no id is on the serialized template', (assert) => {
  let factory1 = templateFactory(serializedTemplateNoId) as TemplateFactoryWithIdAndMeta;
  let factory2 = templateFactory(serializedTemplateNoId) as TemplateFactoryWithIdAndMeta;
  assert.ok(factory1.__id, 'is present');
  assert.ok(factory2.__id, 'is present');
  assert.notEqual(
    factory1.__id,
    factory2.__id,
    'factories without underlying id create new id per factory'
  );
});

QUnit.test('id of template matches factory', (assert) => {
  let factory = templateFactory(serializedTemplate) as TemplateFactoryWithIdAndMeta;
  let template = unwrapTemplate(factory()) as TemplateWithIdAndReferrer;
  assert.ok(template.id, 'is present');
  assert.equal(template.id, factory.__id, 'template id matches factory id');
});

QUnit.test('meta is accessible from factory', (assert) => {
  let factory = templateFactory(serializedTemplate) as TemplateFactoryWithIdAndMeta;
  assert.deepEqual(factory.__meta, { moduleName: 'template/module/name' });
});

QUnit.test('meta is accessible from template', (assert) => {
  let factory = templateFactory(serializedTemplate);
  let template = unwrapTemplate(factory()) as TemplateWithIdAndReferrer;
  assert.deepEqual(
    template.referrer,
    { moduleName: 'template/module/name', owner: null },
    'template has expected meta'
  );
});

QUnit.test('can inject owner into template', (assert) => {
  let owner = {};
  let factory = templateFactory(serializedTemplate);

  let template = unwrapTemplate(factory(owner)) as TemplateWithIdAndReferrer;

  assert.strictEqual(template.referrer.owner, owner, 'is owner');
  assert.deepEqual(
    template.referrer,
    {
      moduleName: 'template/module/name',
      owner,
    },
    'template has expected meta'
  );
});
