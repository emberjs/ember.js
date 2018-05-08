import { TestEnvironment, equalTokens } from '@glimmer/test-helpers';
import { test, module } from '@glimmer/runtime/test/support';
import {
  RenderResult,
  DynamicAttribute,
  SimpleDynamicAttribute,
  ElementBuilder,
  clientBuilder,
} from '@glimmer/runtime';
import { UpdatableReference } from '@glimmer/object-reference';
import { Option, Simple, Opaque, Template } from '@glimmer/interfaces';

let env: TestEnvironment;
let root: HTMLElement;

function compile(template: string) {
  let out = env.preprocess(template);
  return out;
}

function commonSetup(customEnv = new TestEnvironment()) {
  env = customEnv; // TODO: Support SimpleDOM
  root = document.getElementById('qunit-fixture')!;
}

function render(template: Template, self: any) {
  let result: RenderResult;
  env.begin();
  let cursor = { element: root, nextSibling: null };
  let templateIterator = env.renderMain(
    template,
    new UpdatableReference(self),
    clientBuilder(env, cursor)
  );
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  return result;
}

module(
  'Style attributes',
  {
    beforeEach() {
      class StyleEnv extends TestEnvironment {
        attributeFor(
          element: Simple.Element,
          attr: string,
          isTrusting: boolean,
          namespace: Option<string>
        ): DynamicAttribute {
          if (attr === 'style' && !isTrusting) {
            return new StyleAttribute({ element, name, namespace });
          }

          return super.attributeFor(element, attr, isTrusting, namespace);
        }
      }

      commonSetup(new StyleEnv());
    },
    afterEach() {
      warnings = 0;
    },
  },
  () => {
    test(`using a static inline style on an element does not give you a warning`, function(assert) {
      let template = compile(`<div style="background: red">Thing</div>`);
      render(template, {});

      assert.strictEqual(warnings, 0);

      equalTokens(root, '<div style="background: red">Thing</div>', 'initial render');
    });

    test(`triple curlies are trusted`, function(assert) {
      let template = compile(`<div foo={{foo}} style={{{styles}}}>Thing</div>`);
      render(template, { styles: 'background: red' });

      assert.strictEqual(warnings, 0);

      equalTokens(root, '<div style="background: red">Thing</div>', 'initial render');
    });

    test(`using a static inline style on an namespaced element does not give you a warning`, function(assert) {
      let template = compile(
        `<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red" />`
      );

      render(template, {});

      assert.strictEqual(warnings, 0);

      equalTokens(
        root,
        '<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red"></svg>',
        'initial render'
      );
    });
  }
);

let warnings = 0;

class StyleAttribute extends SimpleDynamicAttribute {
  set(dom: ElementBuilder, value: Opaque, env: TestEnvironment): void {
    warnings++;
    super.set(dom, value, env);
  }

  update() {}
}
