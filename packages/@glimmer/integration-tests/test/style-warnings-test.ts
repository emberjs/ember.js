import {
  AnnotatedModuleLocator,
  Option,
  RenderResult,
  Template,
  Environment,
  ElementBuilder,
} from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import {
  clientBuilder,
  DynamicAttribute,
  SimpleDynamicAttribute,
  dynamicAttribute,
  renderJitMain,
  RuntimeEnvironmentDelegate,
} from '@glimmer/runtime';
import { AttrNamespace, SimpleElement } from '@simple-dom/interface';
import { module, test } from './support';
import {
  TestContext,
  preprocess,
  JitTestContext,
  qunitFixture,
  equalTokens,
} from '@glimmer/integration-tests';

let context: TestContext;
let root: SimpleElement;

function compile(template: string) {
  let out = preprocess(template);
  return out;
}

function commonSetup(delegate?: RuntimeEnvironmentDelegate) {
  context = JitTestContext(delegate);
  root = qunitFixture();
}

function render(template: Template<AnnotatedModuleLocator>, self: any) {
  let result: RenderResult;
  context.env.begin();
  let cursor = { element: root, nextSibling: null };
  let templateIterator = renderJitMain(
    context.runtime,
    context.syntax,
    new UpdatableReference(self),
    clientBuilder(context.env, cursor),
    template.asLayout().compile(context.syntax)
  );
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  context.env.commit();
  return result;
}

module(
  'Style attributes',
  {
    beforeEach() {
      commonSetup({
        attributeFor(
          element: SimpleElement,
          attr: string,
          isTrusting: boolean,
          namespace: Option<AttrNamespace>
        ): DynamicAttribute {
          if (attr === 'style' && !isTrusting) {
            return new StyleAttribute({ element, name, namespace });
          }

          return dynamicAttribute(element, attr, namespace);
        },
      });
    },
    afterEach() {
      warnings = 0;
    },
  },
  () => {
    test(`using a static inline style on an element does not give you a warning`, assert => {
      let template = compile(`<div style="background: red">Thing</div>`);
      render(template, {});

      assert.strictEqual(warnings, 0);

      equalTokens(root, '<div style="background: red">Thing</div>', 'initial render');
    });

    test(`triple curlies are trusted`, assert => {
      let template = compile(`<div foo={{foo}} style={{{styles}}}>Thing</div>`);
      render(template, { styles: 'background: red' });

      assert.strictEqual(warnings, 0);

      equalTokens(root, '<div style="background: red">Thing</div>', 'initial render');
    });

    test(`using a static inline style on an namespaced element does not give you a warning`, assert => {
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
  set(dom: ElementBuilder, value: unknown, env: Environment): void {
    warnings++;
    super.set(dom, value, env);
  }

  update() {}
}
