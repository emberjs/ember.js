import type {
  CapturedArguments,
  CapturedRenderNode,
  CustomRenderNode,
  Dict,
  InternalComponentManager,
  Owner,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import type { TemplateOnlyComponent } from '@glimmer/runtime';
import { expect } from '@glimmer/debug-util';
import { modifierCapabilities, setComponentTemplate, setModifierManager } from '@glimmer/manager';
import { EMPTY_ARGS, templateOnlyComponent, TemplateOnlyComponentManager } from '@glimmer/runtime';
import { assign } from '@glimmer/util';

import type { EmberishCurlyComponent } from '..';

import {
  BaseEnv,
  createTemplate,
  defComponent,
  defineSimpleModifier,
  GlimmerishComponent,
  JitRenderDelegate,
  RenderTest,
  suite,
  test,
  tracked,
  trackedObj,
} from '..';

interface CapturedBounds {
  parentElement: SimpleElement;
  firstNode: SimpleNode;
  lastNode: SimpleNode;
}

type Expected<T> = T | ((actual: T) => boolean);

function isExpectedFunc<T>(expected: Expected<T>): expected is (actual: T) => boolean {
  return typeof expected === 'function';
}

interface ExpectedRenderNode {
  type: CapturedRenderNode['type'];
  name: CapturedRenderNode['name'];
  args: Expected<CapturedRenderNode['args']>;
  instance: Expected<CapturedRenderNode['instance']>;
  template: Expected<CapturedRenderNode['template']>;
  bounds: Expected<CapturedRenderNode['bounds']>;
  children: Expected<CapturedRenderNode['children']> | ExpectedRenderNode[];
}

class DebugRenderTreeDelegate extends JitRenderDelegate {
  registerCustomComponent(
    name: string,
    template: string,
    Manager: { new (): InternalComponentManager<unknown> }
  ) {
    const ComponentClass = templateOnlyComponent();

    setComponentTemplate(createTemplate(template), ComponentClass);

    let definition = {
      name,
      state: ComponentClass,
      manager: new Manager(),
      template: null,
    };

    this.registry.register('component', name, definition);
  }
}

class DebugRenderTreeTest extends RenderTest {
  static suiteName = 'Application test: debug render tree';

  declare delegate: DebugRenderTreeDelegate;

  @test 'strict-mode components'() {
    const state = trackedObj({ showSecond: false });

    const HelloWorld = defComponent('{{@arg}}');
    const Root = defComponent(
      `<HelloWorld @arg="first"/>{{#if state.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      { scope: { HelloWorld, state }, emit: { moduleName: 'root.hbs' } }
    );

    this.renderComponent(Root);

    this.assertRenderTree([
      {
        type: 'component',
        name: '{ROOT}',
        args: { positional: [], named: {} },
        instance: null,
        template: 'root.hbs',
        bounds: this.elementBounds(this.delegate.getInitialElement()),
        children: [
          {
            type: 'component',
            name: 'HelloWorld',
            args: { positional: [], named: { arg: 'first' } },
            instance: null,
            template: '(unknown template module)',
            bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
            children: [],
          },
        ],
      },
    ]);
  }

  @test 'strict-mode modifiers'() {
    const state = trackedObj({ showSecond: false });

    const HelloWorld = defComponent('<p ...attributes>{{@arg}}</p>');
    const noopFn = () => {};
    const noop = defineSimpleModifier(noopFn);
    const Root = defComponent(
      `<HelloWorld {{noop}} @arg="first"/>{{#if state.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      { scope: { HelloWorld, state, noop }, emit: { moduleName: 'root.hbs' } }
    );

    this.renderComponent(Root);

    const element = this.delegate.getInitialElement();

    this.assertRenderTree([
      {
        type: 'component',
        name: '{ROOT}',
        args: { positional: [], named: {} },
        instance: null,
        template: 'root.hbs',
        bounds: this.elementBounds(element),
        children: [
          {
            type: 'component',
            name: 'HelloWorld',
            args: { positional: [], named: { arg: 'first' } },
            instance: null,
            template: '(unknown template module)',
            bounds: this.nodeBounds(element.firstChild),
            children: [
              {
                type: 'modifier',
                name: 'noop',
                args: { positional: [], named: {} },
                instance: (modifier: unknown) => modifier && Reflect.get(modifier, 'fn') === noopFn,
                template: null,
                bounds: this.nodeBounds(element.firstChild),
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  }

  @test 'template-only components'() {
    this.registerComponent('TemplateOnly', 'HelloWorld', '{{@arg}}');

    this.render(
      `<HelloWorld @arg="first"/>{{#if this.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      {
        showSecond: false,
      }
    );

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: true });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'second' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().lastChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: false });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);
  }

  @test 'emberish curly components'() {
    this.registerComponent('Curly', 'HelloWorld', 'Hello World');
    let error: Error | null = null;
    class State {
      @tracked doFail = false;
      get getterWithError() {
        if (!this.doFail) return;
        error = new Error('error');
        throw error;
      }
    }
    const obj = new State();

    this.render(
      `<HelloWorld @arg="first" @arg2={{this.obj.getterWithError}}/>{{#if this.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      {
        showSecond: false,
        obj,
      }
    );

    obj.doFail = true;

    this.delegate.getCapturedRenderTree();

    this.assert.ok(error !== null, 'expecting an Error');

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: (actual) => {
          const args = { positional: [], named: { arg: 'first', arg2: { error } } };
          this.assert.deepEqual(actual, args);
          this.assert.ok(
            !this.delegate.context.runtime.env.isArgumentCaptureError!(actual.named['arg'])
          );
          this.assert.ok(
            this.delegate.context.runtime.env.isArgumentCaptureError!(actual.named['arg2'])
          );
          return true;
        },
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);

    obj.doFail = false;

    this.rerender({ showSecond: true });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first', arg2: undefined } },
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'second' } },
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'second',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.lastChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: false });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first', arg2: undefined } },
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);
  }

  @test 'glimmerish components'() {
    this.registerComponent('Glimmer', 'HelloWorld', 'Hello World');

    this.render(
      `<HelloWorld @arg="first"/>{{#if this.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      {
        showSecond: false,
      }
    );

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: (instance: GlimmerishComponent) => instance.args['arg'] === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: true });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: (instance: GlimmerishComponent) => instance.args['arg'] === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'second' } },
        instance: (instance: GlimmerishComponent) => instance.args['arg'] === 'second',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.lastChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: false });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: (instance: GlimmerishComponent) => instance.args['arg'] === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);
  }

  @test 'in-element in tree'() {
    this.registerComponent('Glimmer', 'HiWorld', 'Hi World');
    this.registerComponent(
      'Glimmer',
      'HelloWorld',
      '{{#in-element this.destinationElement}}<HiWorld />{{/in-element}}',
      class extends GlimmerishComponent {
        get destinationElement() {
          return document.getElementById('target');
        }
      }
    );

    this.render(`<div id='target'></div><HelloWorld @arg="first"/>`);

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'first' } },
        instance: (instance: GlimmerishComponent) => instance.args['arg'] === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild!.nextSibling),
        children: [
          {
            type: 'keyword',
            name: 'in-element',
            args: { positional: [this.element.firstChild], named: {} },
            instance: (instance: GlimmerishComponent) => instance === null,
            template: null,
            bounds: this.elementBounds(this.element.firstChild! as unknown as SimpleElement),
            children: [
              {
                type: 'component',
                name: 'HiWorld',
                args: { positional: [], named: {} },
                instance: (instance: GlimmerishComponent) => instance,
                template: '(unknown template module)',
                bounds: this.nodeBounds(this.element.firstChild!.firstChild),
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  }

  @test modifiers() {
    this.registerComponent('Glimmer', 'HelloWorld', 'Hello World');
    const didInsert = () => null;

    class DidInsertModifier {
      element?: SimpleElement;
      didInsertElement() {}
      didUpdate() {}
      willDestroyElement() {}
    }

    this.registerModifier('did-insert', DidInsertModifier);

    class MyCustomModifier {}

    setModifierManager(
      () => ({
        capabilities: modifierCapabilities('3.22'),
        createModifier() {
          return new MyCustomModifier();
        },
        installModifier() {},
        updateModifier() {},
        destroyModifier() {},
      }),
      MyCustomModifier
    );

    const foo = Symbol('foo');
    const bar = Symbol('bar');

    this.render(
      `<div {{on 'click' this.didInsert}} {{did-insert this.foo bar=this.bar}} {{this.modifier this.bar foo=this.foo}}
      ><HelloWorld />
      {{~#if this.more~}}
        <div {{on 'click' this.didInsert passive=true}}></div>
      {{~/if~}}
      </div>`,
      {
        didInsert: didInsert,
        modifier: MyCustomModifier,
        foo,
        bar,
        more: false,
      }
    );

    this.assertRenderTree([
      {
        type: 'modifier',
        name: 'on',
        args: { positional: ['click', didInsert], named: {} },
        instance: null,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'DidInsertModifier',
        args: { positional: [foo], named: { bar } },
        instance: (instance: unknown) => instance instanceof DidInsertModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'MyCustomModifier',
        args: { positional: [bar], named: { foo } },
        instance: (instance: unknown) => instance instanceof MyCustomModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: {} },
        instance: (instance: any) => instance !== undefined,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild!.firstChild),
        children: [],
      },
    ]);

    this.rerender({
      more: true,
    });

    this.assertRenderTree([
      {
        type: 'modifier',
        name: 'on',
        args: { positional: ['click', didInsert], named: {} },
        instance: null,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'DidInsertModifier',
        args: { positional: [foo], named: { bar } },
        instance: (instance: unknown) => instance instanceof DidInsertModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'MyCustomModifier',
        args: { positional: [bar], named: { foo } },
        instance: (instance: unknown) => instance instanceof MyCustomModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: {} },
        instance: (instance: any) => instance !== undefined,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild!.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'on',
        args: { positional: ['click', didInsert], named: { passive: true } },
        instance: null,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild!.lastChild),
        children: [],
      },
    ]);

    this.rerender({
      more: false,
    });

    this.assertRenderTree([
      {
        type: 'modifier',
        name: 'on',
        args: { positional: ['click', didInsert], named: {} },
        instance: null,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'DidInsertModifier',
        args: { positional: [foo], named: { bar } },
        instance: (instance: unknown) => instance instanceof DidInsertModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'modifier',
        name: 'MyCustomModifier',
        args: { positional: [bar], named: { foo } },
        instance: (instance: unknown) => instance instanceof MyCustomModifier,
        template: null,
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: {} },
        instance: (instance: any) => instance !== undefined,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild!.firstChild),
        children: [],
      },
    ]);
  }

  @test 'getDebugCustomRenderTree works'() {
    let bucket1 = {};
    let instance1 = {};

    let bucket2 = {};
    let instance2 = {};

    this.delegate.registerCustomComponent(
      'HelloWorld',
      '{{@arg}}',
      class extends TemplateOnlyComponentManager {
        getDebugCustomRenderTree(
          _definition: TemplateOnlyComponent,
          _state: null,
          args: CapturedArguments
        ): CustomRenderNode[] {
          return [
            {
              bucket: bucket1,
              type: 'route-template',
              name: 'foo',
              instance: instance1,
              args,
              template: undefined,
            },
            {
              bucket: bucket2,
              type: 'engine',
              name: 'bar',
              instance: instance2,
              args: EMPTY_ARGS,
              template: undefined,
            },
          ];
        }
      }
    );

    this.registerComponent('TemplateOnly', 'HelloWorld2', '{{@arg}}');

    this.render(
      `<HelloWorld2 @arg="first"/>{{#if this.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      {
        showSecond: false,
      }
    );

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: true });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'route-template',
        name: 'foo',
        args: { positional: [], named: { arg: 'second' } },
        instance: instance1,
        template: null,
        bounds: this.nodeBounds(this.element.lastChild),
        children: [
          {
            type: 'engine',
            name: 'bar',
            args: { positional: [], named: {} },
            instance: instance2,
            template: null,
            bounds: this.nodeBounds(this.element.lastChild),
            children: [],
          },
        ],
      },
    ]);

    this.rerender({ showSecond: false });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);
  }

  @test 'empty getDebugCustomRenderTree works'() {
    this.delegate.registerCustomComponent(
      'HelloWorld',
      '{{@arg}}',
      class extends TemplateOnlyComponentManager {
        getDebugCustomRenderTree(): CustomRenderNode[] {
          return [];
        }
      }
    );

    this.registerComponent('TemplateOnly', 'HelloWorld2', '{{@arg}}');

    this.render(
      `<HelloWorld2 @arg="first"/>{{#if this.showSecond}}<HelloWorld @arg="second"/>{{/if}}`,
      {
        showSecond: false,
      }
    );

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.delegate.getInitialElement().firstChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: true });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);

    this.rerender({ showSecond: false });

    this.assertRenderTree([
      {
        type: 'component',
        name: 'HelloWorld2',
        args: { positional: [], named: { arg: 'first' } },
        instance: null,
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);
  }

  @test 'cleans up correctly after errors'(assert: Assert) {
    this.registerComponent(
      'Glimmer',
      'HelloWorld',
      'Hello World',
      class extends GlimmerishComponent {
        constructor(owner: Owner, args: Dict) {
          super(owner, args);
          throw new Error('oops!');
        }
      }
    );

    assert.throws(() => {
      this.render('<HelloWorld @arg="first"/>');
    }, /oops!/u);

    assert.deepEqual(this.delegate.getCapturedRenderTree(), [], 'there was no output');
  }

  nodeBounds(_node: SimpleNode | null): CapturedBounds {
    let node = expect(_node, 'BUG: Expected node');

    return {
      parentElement: expect(
        node.parentNode,
        'BUG: detached node'
      ) as unknown as SimpleNode as SimpleElement,
      firstNode: node as unknown as SimpleNode,
      lastNode: node as unknown as SimpleNode,
    };
  }

  elementBounds(element: SimpleElement): CapturedBounds {
    return {
      parentElement: element as unknown as SimpleElement,
      firstNode: element.firstChild! as unknown as SimpleNode,
      lastNode: element.lastChild! as unknown as SimpleNode,
    };
  }

  assertRenderTree(expected: ExpectedRenderNode[]): void {
    let actual = this.delegate.getCapturedRenderTree();

    this.assertRenderNodes(actual, expected, 'root');
  }

  assertRenderNodes(
    actual: CapturedRenderNode[],
    expectedNodes: ExpectedRenderNode[],
    path: string
  ): void {
    this.assert.strictEqual(
      actual.length,
      expectedNodes.length,
      `Expecting ${expectedNodes.length} render nodes at ${path}, got ${actual.length}.\n`
    );

    if (actual.length === expectedNodes.length) {
      let byTypeAndName = <T, U, V extends { type: T; name: U }>(a: V, b: V): number => {
        if (a.type > b.type) {
          return 1;
        } else if (a.type < b.type) {
          return -1;
        } else if (a.name > b.name) {
          return 1;
        } else if (a.name < b.name) {
          return -1;
        } else {
          return 0;
        }
      };

      actual = actual.sort(byTypeAndName);
      expectedNodes = expectedNodes.sort(byTypeAndName);

      actual.forEach((actualNode, i) => {
        let expected = this.guardPresent({ [`node (${i})`]: expectedNodes[i] });
        this.assertRenderNode(actualNode, expected, `${actualNode.type}:${actualNode.name}`);
      });
    } else {
      this.assert.deepEqual(actual, expectedNodes, path);
    }
  }

  assertRenderNode(actual: CapturedRenderNode, expected: ExpectedRenderNode, path: string): void {
    this.assertProperty(actual.type, expected.type, false, `${path} (type)`);
    this.assertProperty(actual.name, expected.name, false, `${path} (name)`);
    this.assertProperty(actual.args, expected.args, true, `${path} (args)`);
    this.assertProperty(actual.instance, expected.instance, false, `${path} (instance)`);
    this.assertProperty(actual.template, expected.template, false, `${path} (template)`);
    this.assertProperty(actual.bounds, expected.bounds, true, `${path} (bounds)`);

    if (Array.isArray(expected.children)) {
      this.assertRenderNodes(actual.children, expected.children, path);
    } else {
      this.assertProperty(actual.children, expected.children, false, `${path} (children)`);
    }
  }

  assertProperty<T>(actual: T, expected: Expected<T>, deep: boolean, path: string): void {
    if (isExpectedFunc(expected)) {
      this.assert.ok(expected(actual), `Matching ${path}, got ${actual}`);
    } else if (deep) {
      this.assert.deepEqual(actual, expected, `Matching ${path}`);
    } else {
      this.assert.strictEqual(actual, expected, `Matching ${path}`);
    }
  }
}

suite(DebugRenderTreeTest, DebugRenderTreeDelegate, {
  env: assign({}, BaseEnv, {
    enableDebugTooling: true,
  }),
});
