import {
  CapturedArguments,
  CapturedRenderNode,
  CustomRenderNode,
  InternalComponentManager,
} from '@glimmer/interfaces';
import { expect, assign } from '@glimmer/util';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import {
  test,
  RenderTest,
  suite,
  BaseEnv,
  JitRenderDelegate,
  EmberishCurlyComponent,
  EmberishGlimmerComponent,
  EmberishGlimmerArgs,
  TestComponentDefinitionState,
  createTemplate,
  TemplateOnlyComponentManager,
  TEMPLATE_ONLY_CAPABILITIES,
} from '..';
import {
  EMPTY_ARGS,
  setComponentTemplate,
  TemplateOnlyComponent,
  templateOnlyComponent,
} from '@glimmer/runtime';

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

    let state: TestComponentDefinitionState = {
      name,
      capabilities: TEMPLATE_ONLY_CAPABILITIES,
      ComponentClass,
      template: null,
    };

    setComponentTemplate(createTemplate(template), ComponentClass);

    let definition = {
      state,
      manager: new Manager(),
    };

    this.registry.register('component', name, definition);
  }
}

class DebugRenderTreeTest extends RenderTest {
  static suiteName = 'Application test: debug render tree';

  declare delegate: DebugRenderTreeDelegate;

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
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'first',
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
        args: { positional: [], named: { arg: 'first' } },
        instance: (instance: EmberishCurlyComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
    ]);
  }

  @test 'emberish glimmer components'() {
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
        instance: (instance: EmberishGlimmerComponent) => (instance as any).arg === 'first',
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
        instance: (instance: EmberishGlimmerComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
        children: [],
      },
      {
        type: 'component',
        name: 'HelloWorld',
        args: { positional: [], named: { arg: 'second' } },
        instance: (instance: EmberishGlimmerComponent) => (instance as any).arg === 'second',
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
        instance: (instance: EmberishGlimmerComponent) => (instance as any).arg === 'first',
        template: '(unknown template module)',
        bounds: this.nodeBounds(this.element.firstChild),
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
      class extends EmberishGlimmerComponent {
        constructor(args: EmberishGlimmerArgs) {
          super(args);
          throw new Error('oops!');
        }
      }
    );

    assert.throws(() => {
      this.render('<HelloWorld @arg="first"/>');
    }, /oops!/);

    assert.deepEqual(this.delegate.getCapturedRenderTree(), [], 'there was no output');
  }

  nodeBounds(_node: SimpleNode | null): CapturedBounds {
    let node = expect(_node, 'BUG: Expected node');

    return {
      parentElement: ((expect(
        node.parentNode,
        'BUG: detached node'
      ) as unknown) as SimpleNode) as SimpleElement,
      firstNode: (node as unknown) as SimpleNode,
      lastNode: (node as unknown) as SimpleNode,
    };
  }

  elementBounds(element: Element): CapturedBounds {
    return {
      parentElement: (element as unknown) as SimpleElement,
      firstNode: (element.firstChild! as unknown) as SimpleNode,
      lastNode: (element.lastChild! as unknown) as SimpleNode,
    };
  }

  assertRenderTree(expected: ExpectedRenderNode[]): void {
    let actual = this.delegate.getCapturedRenderTree();

    this.assertRenderNodes(actual, expected, 'root');
  }

  assertRenderNodes(
    actual: CapturedRenderNode[],
    expected: ExpectedRenderNode[],
    path: string
  ): void {
    this.assert.strictEqual(
      actual.length,
      expected.length,
      `Expecting ${expected.length} render nodes at ${path}, got ${actual.length}.\n`
    );

    if (actual.length === expected.length) {
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
      expected = expected.sort(byTypeAndName);

      for (let i = 0; i < actual.length; i++) {
        this.assertRenderNode(actual[i], expected[i], `${actual[i].type}:${actual[i].name}`);
      }
    } else {
      this.assert.deepEqual(actual, [], path);
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
