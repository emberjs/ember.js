import { TestEnvironment } from "@glimmer/test-helpers";
import { templateFactory } from "@glimmer/runtime";
import { SerializedTemplateWithLazyBlock, TemplateMeta } from "@glimmer/wire-format";

let env: TestEnvironment;

interface TestMeta extends TemplateMeta {
  version: number;
  lang: string;
  moduleName: string;
}

interface OwnerMeta {
  owner: {};
}

let serializedTemplate: SerializedTemplateWithLazyBlock<TestMeta>;
let serializedTemplateNoId: SerializedTemplateWithLazyBlock<TestMeta>;

QUnit.module("templateFactory", {
  beforeEach() {
    env = new TestEnvironment();

    let templates = new Templates();

    templates.compile("<div>{{name}}</div>", {
      meta: {
        version: 12,
        lang: 'es',
        moduleName: "template/module/name"
      },

      plugins: [],
      lookup: "template/module/name"
    });

    let templateJs: string;

    templates.eachTemplate(template => {
      templateJs = template;
    });

    // in the browser, require('crypto') will fail, and all we're testing
    // here is that the factory scrapes the id off correctly.
    serializedTemplate = JSON.parse(templateJs!);
    serializedTemplate.id = "server-id-1";

    serializedTemplateNoId = JSON.parse(templateJs!);
    serializedTemplateNoId.id = null;
  }
});

QUnit.test("id of serialized template is exposed on the factory", assert => {
  let factory = templateFactory(serializedTemplate);
  assert.ok(factory.id, 'is present');
  assert.equal(factory.id, serializedTemplate.id, 'id matches serialized template id');
});

QUnit.test("generates id if no id is on the serialized template", assert => {
  let factory1 = templateFactory(serializedTemplateNoId);
  let factory2 = templateFactory(serializedTemplateNoId);
  assert.ok(factory1.id, 'is present');
  assert.ok(factory2.id, 'is present');
  assert.notEqual(factory1.id, factory2.id, 'factories without underlying id create new id per factory');
});

QUnit.test("id of template matches factory", assert => {
  let factory = templateFactory(serializedTemplate);
  let template = factory.create(env.compileOptions);
  assert.ok(template.id, 'is present');
  assert.equal(template.id, factory.id, 'template id matches factory id');
});

QUnit.test("meta is accessible from factory", assert => {
  let factory = templateFactory(serializedTemplate);
  assert.deepEqual(factory.meta, {
    version: 12,
    lang: 'es',
    moduleName: "template/module/name"
  });
});

QUnit.test("meta is accessible from template", assert => {
  let factory = templateFactory(serializedTemplate);
  let template = factory.create(env.compileOptions);
  assert.deepEqual(template.meta, {
    version: 12,
    lang: 'es',
    moduleName: "template/module/name"
  }, 'template has expected meta');
});

QUnit.test("can inject per environment things into meta", assert => {
  let owner = {};
  let factory = templateFactory<TestMeta, OwnerMeta>(serializedTemplate);

  let template = factory.create(env.compileOptions, { owner });
  assert.strictEqual(template.meta.owner, owner, 'is owner');
  assert.deepEqual(template.meta, {
    version: 12,
    lang: 'es',
    moduleName: "template/module/name",
    owner
  }, 'template has expected meta');
});
