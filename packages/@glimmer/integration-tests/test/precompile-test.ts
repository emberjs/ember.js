import { precompile } from '@glimmer/compiler';
import { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/util';
import {
  templateFactory,
  TemplateFactoryWithMeta,
  TemplateWithReferrer,
} from '@glimmer/opcode-compiler';

let serializedTemplate: SerializedTemplateWithLazyBlock;

QUnit.module('templateFactory', {
  beforeEach() {
    let templateJs = precompile('<div>{{name}}</div>', {
      meta: { moduleName: 'template/module/name' },
    });
    serializedTemplate = JSON.parse(templateJs);
  },
});

QUnit.test('meta is accessible from factory', (assert) => {
  let factory = templateFactory(serializedTemplate) as TemplateFactoryWithMeta;
  assert.deepEqual(factory.__meta, { moduleName: 'template/module/name' });
});

QUnit.test('meta is accessible from template', (assert) => {
  let factory = templateFactory(serializedTemplate);
  let template = unwrapTemplate(factory()) as TemplateWithReferrer;
  assert.deepEqual(
    template.referrer,
    { moduleName: 'template/module/name', owner: null },
    'template has expected meta'
  );
});

QUnit.test('can inject owner into template', (assert) => {
  let owner = {};
  let factory = templateFactory(serializedTemplate);

  let template = unwrapTemplate(factory(owner)) as TemplateWithReferrer;

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
