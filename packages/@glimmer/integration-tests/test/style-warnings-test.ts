import {
  AnnotatedModuleLocator,
  Option,
  RenderResult,
  Template,
  Environment,
  ElementBuilder,
} from '@glimmer/interfaces';
import { UpdatableRootReference } from '@glimmer/object-reference';
import {
  clientBuilder,
  DynamicAttribute,
  SimpleDynamicAttribute,
  dynamicAttribute,
  renderJitMain,
  EnvironmentDelegate,
} from '@glimmer/runtime';
import { AttrNamespace, SimpleElement } from '@simple-dom/interface';
import { module, test } from './support';
import {
  TestContext,
  preprocess,
  JitTestContext,
  qunitFixture,
  equalTokens,
  registerModifier,
} from '..';
import { unwrapTemplate, unwrapHandle } from '@glimmer/opcode-compiler';

let context: TestContext;
let root: SimpleElement;

function compile(template: string) {
  let out = preprocess(template);
  return out;
}

function commonSetup(delegate?: EnvironmentDelegate) {
  context = JitTestContext(delegate);
  root = qunitFixture();
}

function render(template: Template<AnnotatedModuleLocator>, self: any) {
  let result: RenderResult;
  context.env.begin();
  let cursor = { element: root, nextSibling: null };

  let handle = unwrapTemplate(template)
    .asLayout()
    .compile(context.syntax);

  let templateIterator = renderJitMain(
    context.runtime,
    context.syntax,
    new UpdatableRootReference(self),
    clientBuilder(context.env, cursor),
    unwrapHandle(handle)
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
            return new StyleAttribute({ element, name: 'style', namespace });
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
    test(`Standard element with static style and element modifier does not give you a warning`, assert => {
      registerModifier(context.registry, 'foo');
      let template = compile('<button style="display: flex" {{foo}}>click me</button>');
      render(template, {});

      assert.strictEqual(warnings, 0);
    });

    test(`Standard element with dynamic style and element modifier gives you 1 warning`, assert => {
      registerModifier(context.registry, 'foo');
      let template = compile('<button style={{dynAttr}} {{foo}}>click me</button>');
      render(template, { dynAttr: 'display:flex' });

      assert.strictEqual(warnings, 1);
    });

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
