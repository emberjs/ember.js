import { keys } from '@glimmer/util';

import type { ComponentKind } from '../components';
import type RenderDelegate from '../render-delegate';
import type { RenderDelegateOptions } from '../render-delegate';
import type { Count, IRenderTest, RenderTest } from '../render-test';
import type { DeclaredComponentKind } from '../test-decorator';

import { JitRenderDelegate } from '../modes/jit/delegate';
import { JitSerializationDelegate, NodeJitRenderDelegate } from '../modes/node/env';

export interface RenderTestConstructor<D extends RenderDelegate, T extends IRenderTest> {
  suiteName: string;
  new (delegate: D): T;
}

export function jitSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options?: { componentModule?: boolean; debugRenderTree?: boolean }
): void {
  return suite(klass, JitRenderDelegate, options);
}

export function nodeSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, NodeJitRenderDelegate, options);
}

export function nodeComponentSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>
): void {
  return suite(klass, NodeJitRenderDelegate, { componentModule: true });
}

export function jitComponentSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>
): void {
  return suite(klass, JitRenderDelegate, { componentModule: true });
}

export function jitSerializeSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, JitSerializationDelegate, options);
}

function teardown(test: IRenderTest): void {
  test.teardownDelegate?.();
}

export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
  readonly isEager: boolean;
  readonly style: string;
  new (options?: RenderDelegateOptions): Delegate;
}

export function componentSuite<D extends RenderDelegate>(
  klass: RenderTestConstructor<D, IRenderTest>,
  Delegate: RenderDelegateConstructor<D>,
  options: { kinds?: DeclaredComponentKind[] } = {}
): void {
  return suite(klass, Delegate, { componentModule: true, kinds: options.kinds });
}

export function suite<D extends RenderDelegate>(
  klass: RenderTestConstructor<D, IRenderTest>,
  Delegate: RenderDelegateConstructor<D>,
  options: {
    componentModule?: boolean;
    debugRenderTree?: boolean;
    /** The invocation kinds a component module runs (default: all of them). */
    kinds?: DeclaredComponentKind[];
  } = {}
): void {
  let suiteName = klass.suiteName;

  if (options.componentModule) {
    if (shouldRunTest<D>(Delegate)) {
      componentModule(
        `${Delegate.style} :: Components :: ${suiteName}`,
        klass as any as RenderTestConstructor<D, RenderTest>,
        Delegate,
        options.kinds
      );
    }
  } else {
    let instance: IRenderTest | null = null;
    QUnit.module(`[integration] ${Delegate.style} :: ${suiteName}`, {
      beforeEach() {
        instance = new klass(new Delegate({ debugRenderTree: options.debugRenderTree }));
        if (instance.beforeEach) instance.beforeEach();
      },

      afterEach() {
        if (instance!.afterEach) instance!.afterEach();
        teardown(instance!);
        instance = null;
      },
    });

    for (let [prop, test] of testFunctions(klass.prototype)) {
      if (shouldRunTest<D>(Delegate)) {
        if (isSkippedTest(test)) {
          QUnit.skip(prop, (assert) => {
            test.call(instance!, assert, instance!.count);
            instance!.count.assert();
          });
        } else {
          QUnit.test(prop, (assert) => {
            let result = test.call(instance!, assert, instance!.count);
            instance!.count.assert();
            return result;
          });
        }
      }
    }
  }
}

function componentModule<D extends RenderDelegate, T extends IRenderTest>(
  name: string,
  klass: RenderTestConstructor<D, T>,
  Delegate: RenderDelegateConstructor<D>,
  kinds?: DeclaredComponentKind[]
) {
  let tests: ComponentTests = {
    glimmer: [],
    curly: [],
    dynamic: [],
    templateOnly: [],
  };

  let current: IRenderTest | null = null;

  function createTest(prop: string, test: any, skip?: boolean) {
    let shouldSkip: boolean;
    if (skip === true || test.skip === true) {
      shouldSkip = true;
    }

    return (type: ComponentKind, klass: RenderTestConstructor<D, T>) => {
      if (!shouldSkip) {
        QUnit.test(prop, (assert) => {
          let instance = new klass(new Delegate());
          current = instance;
          instance.testType = type;
          return test.call(instance, assert, instance.count);
        });
      }
    };
  }

  for (let [prop, test] of testFunctions(klass.prototype)) {
    let kind = test['kind'];

    if (kind === undefined) {
      // A blueprint test runs once per invocation form of a Glimmer component: angle
      // brackets, curly (`{{#test-component}}`) and `{{component}}`.
      tests.glimmer.push(createTest(prop, test));
      tests.curly.push(createTest(prop, test));
      tests.dynamic.push(createTest(prop, test));
    } else {
      tests[kind].push(createTest(prop, test));
    }
  }

  if (kinds) {
    for (let kind of keys(tests)) {
      if (!kinds.includes(kind)) tests[kind] = [];
    }
  }
  QUnit.module(`[integration] ${name}`, (hooks) => {
    hooks.afterEach(() => {
      if (current !== null) teardown(current);
      current = null;
    });
    nestedComponentModules(klass, tests);
  });
}

type ComponentTests = Record<DeclaredComponentKind, Function[]>;

function nestedComponentModules<D extends RenderDelegate, T extends IRenderTest>(
  klass: RenderTestConstructor<D, T>,
  tests: ComponentTests
): void {
  keys(tests).forEach((type) => {
    let formattedType = upperFirst(type);

    QUnit.module(`[integration] ${formattedType}`, () => {
      const allTests = [...tests[type]].reverse();

      for (const t of allTests) {
        t(formattedType, klass);
      }

      tests[type] = [];
    });
  });
}

function upperFirst<T extends string>(
  str: T extends '' ? `upperFirst only takes (statically) non-empty strings` : T
): string {
  let first = str[0] as string;
  let rest = str.slice(1);

  return `${first.toUpperCase()}${rest}`;
}

const HAS_TYPED_ARRAYS = typeof Uint16Array !== 'undefined';

function shouldRunTest<T extends RenderDelegate>(Delegate: RenderDelegateConstructor<T>) {
  let isEagerDelegate = Delegate['isEager'];

  if (HAS_TYPED_ARRAYS) {
    return true;
  }

  if (!HAS_TYPED_ARRAYS && !isEagerDelegate) {
    return true;
  }

  return false;
}

interface TestFunction {
  (this: IRenderTest, assert: typeof QUnit.assert, count?: Count): void;
  kind?: DeclaredComponentKind;
  skip?: boolean;
}

/*
  Finds the test methods on a suite's prototype chain, in the same order a
  `for...in` loop would visit them. We don't use `for...in` itself because
  methods marked with `@test` under stable (2023-11) decorators remain
  non-enumerable: those decorators can only tag the function, not change the
  property descriptor.
*/
function testFunctions(proto: object): Array<[string, TestFunction]> {
  let seen = new Set<string>();
  let result: Array<[string, TestFunction]> = [];

  for (let obj = proto; obj && obj !== Object.prototype; obj = Object.getPrototypeOf(obj)) {
    for (let prop of Object.getOwnPropertyNames(obj)) {
      if (seen.has(prop)) continue;
      seen.add(prop);

      let desc = Object.getOwnPropertyDescriptor(obj, prop);
      if (desc && 'value' in desc && isTestFunction(desc.value)) {
        result.push([prop, desc.value]);
      }
    }
  }

  return result;
}

function isTestFunction(value: any): value is TestFunction {
  return typeof value === 'function' && value.isTest;
}

function isSkippedTest(value: any): boolean {
  return typeof value === 'function' && value.skip;
}
