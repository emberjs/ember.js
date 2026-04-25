import type { EnvironmentDelegate } from '@glimmer/runtime';
import { keys } from '@glimmer/util';

import type { ComponentKind } from '../components';
import type RenderDelegate from '../render-delegate';
import type { RenderDelegateOptions } from '../render-delegate';
import type { Count, IRenderTest, RenderTest } from '../render-test';
import type { DeclaredComponentKind } from '../test-decorator';

import { JitRenderDelegate } from '../modes/jit/delegate';
import { NodeJitRenderDelegate } from '../modes/node/env';
import {
  GxtPartialRehydrationDelegate,
  GxtRehydrationDelegate,
} from '../modes/rehydration/gxt-delegate';
import { JitSerializationDelegate } from '../suites/custom-dom-helper';

/**
 * Phase 4.2 — delegate override for rehydration modules under GXT_MODE.
 *
 * The classic `RehydrationDelegate` constructor loads `@simple-dom/document`
 * plus the Glimmer-VM opcode runtime, both of which are aliased to GXT
 * shims under GXT_MODE and crash on instantiation. The result is that
 * module registration throws before any QUnit tests are declared, and
 * the runner reports "No tests matched the module".
 *
 * When `globalThis.__GXT_MODE__` is truthy and the caller is trying to
 * register a delegate whose `style === 'rehydration'`, we transparently
 * swap in `GxtRehydrationDelegate`. This keeps the tests declarative
 * and lets the module at least RUN under GXT — individual test bodies
 * may still fail on assertion details, but the module is no longer
 * silently skipped.
 *
 * For partial-rehydration modules (which declare extra methods like
 * `registerTemplateOnlyComponent` and `renderComponentServerSide` on
 * top of the base rehydration delegate), we swap in the
 * `GxtPartialRehydrationDelegate` subclass so those methods exist.
 * Detection is via the constructor's prototype having a
 * `registerTemplateOnlyComponent` method.
 */
function overrideRehydrationDelegate<D extends RenderDelegate>(
  Delegate: RenderDelegateConstructor<D>
): RenderDelegateConstructor<D> {
  const gxtMode = (globalThis as unknown as { __GXT_MODE__?: boolean }).__GXT_MODE__;
  if (!gxtMode) return Delegate;
  if (Delegate.style !== 'rehydration') return Delegate;
  if ((Delegate as unknown) === GxtRehydrationDelegate) return Delegate;
  if ((Delegate as unknown) === GxtPartialRehydrationDelegate) return Delegate;
  // Detect partial-rehydration delegates by the extra `registerTemplateOnlyComponent`
  // method on the prototype. The GXT equivalent ships `GxtPartialRehydrationDelegate`.
  const proto = (Delegate as unknown as { prototype?: Record<string, unknown> }).prototype;
  if (proto && typeof proto['registerTemplateOnlyComponent'] === 'function') {
    return GxtPartialRehydrationDelegate as unknown as RenderDelegateConstructor<D>;
  }
  return GxtRehydrationDelegate as unknown as RenderDelegateConstructor<D>;
}

export interface RenderTestConstructor<D extends RenderDelegate, T extends IRenderTest> {
  suiteName: string;
  new (delegate: D): T;
}

export function jitSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options?: { componentModule?: boolean; env?: EnvironmentDelegate }
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

export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
  readonly isEager: boolean;
  readonly style: string;
  new (options?: RenderDelegateOptions): Delegate;
}

export function componentSuite<D extends RenderDelegate>(
  klass: RenderTestConstructor<D, IRenderTest>,
  Delegate: RenderDelegateConstructor<D>
): void {
  return suite(klass, Delegate, { componentModule: true });
}

export function suite<D extends RenderDelegate>(
  klass: RenderTestConstructor<D, IRenderTest>,
  Delegate: RenderDelegateConstructor<D>,
  options: { componentModule?: boolean; env?: EnvironmentDelegate } = {}
): void {
  // Defer override to instantiation time — `__GXT_MODE__` may not be set
  // yet at module-registration time (the GXT compile.ts module that
  // toggles the flag can load after test files register their suites).
  const RegisteredDelegate = Delegate;
  const ResolvedDelegate = new Proxy(RegisteredDelegate, {
    construct(target, args) {
      const Override = overrideRehydrationDelegate(target as RenderDelegateConstructor<D>);
      return Reflect.construct(Override as unknown as new (...a: unknown[]) => object, args);
    },
  }) as unknown as RenderDelegateConstructor<D>;
  Delegate = ResolvedDelegate;
  let suiteName = klass.suiteName;

  if (options.componentModule) {
    if (shouldRunTest<D>(Delegate)) {
      componentModule(
        `${Delegate.style} :: Components :: ${suiteName}`,
        klass as any as RenderTestConstructor<D, RenderTest>,
        Delegate
      );
    }
  } else {
    let instance: IRenderTest | null = null;
    QUnit.module(`[integration] ${Delegate.style} :: ${suiteName}`, {
      beforeEach() {
        instance = new klass(new Delegate({ env: options.env }));
        if (instance.beforeEach) instance.beforeEach();
      },

      afterEach() {
        if (instance!.afterEach) instance!.afterEach();
        instance = null;
      },
    });

    for (let prop in klass.prototype) {
      const test = klass.prototype[prop];

      if (isTestFunction(test) && shouldRunTest<D>(Delegate)) {
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
  Delegate: RenderDelegateConstructor<D>
) {
  let tests: ComponentTests = {
    glimmer: [],
    curly: [],
    dynamic: [],
    templateOnly: [],
  };

  function createTest(prop: string, test: any, skip?: boolean) {
    let shouldSkip: boolean;
    if (skip === true || test.skip === true) {
      shouldSkip = true;
    }

    return (type: ComponentKind, klass: RenderTestConstructor<D, T>) => {
      if (!shouldSkip) {
        QUnit.test(prop, (assert) => {
          let instance = new klass(new Delegate());
          instance.testType = type;
          return test.call(instance, assert, instance.count);
        });
      }
    };
  }

  for (let prop in klass.prototype) {
    const test = klass.prototype[prop];
    if (isTestFunction(test)) {
      if (test['kind'] === undefined) {
        let skip = test['skip'];
        switch (skip) {
          case 'glimmer':
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.glimmer.push(createTest(prop, test, true));
            break;
          case 'curly':
            tests.glimmer.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test, true));
            break;
          case 'dynamic':
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test, true));
            break;
          case true:
            ['glimmer', 'curly', 'dynamic'].forEach((kind) => {
              tests[kind as DeclaredComponentKind].push(createTest(prop, test, true));
            });
            break;
          default:
            tests.glimmer.push(createTest(prop, test));
            tests.curly.push(createTest(prop, test));
            tests.dynamic.push(createTest(prop, test));
        }
        continue;
      }

      let kind = test['kind'];

      if (kind === 'curly') {
        tests.curly.push(createTest(prop, test));
        tests.dynamic.push(createTest(prop, test));
      }

      if (kind === 'glimmer') {
        tests.glimmer.push(createTest(prop, test));
      }

      if (kind === 'dynamic') {
        tests.curly.push(createTest(prop, test));
        tests.dynamic.push(createTest(prop, test));
      }

      if (kind === 'templateOnly') {
        tests.templateOnly.push(createTest(prop, test));
      }
    }
  }
  QUnit.module(`[integration] ${name}`, () => {
    nestedComponentModules(klass, tests);
  });
}

interface ComponentTests {
  glimmer: Function[];
  curly: Function[];
  dynamic: Function[];
  templateOnly: Function[];
}

function nestedComponentModules<D extends RenderDelegate, T extends IRenderTest>(
  klass: RenderTestConstructor<D, T>,
  tests: ComponentTests
): void {
  keys(tests).forEach((type) => {
    // Skip sub-modules with zero tests — otherwise QUnit registers an
    // empty `[integration] X` module and the runner reports
    // "FAIL 0/1 — global failure: No tests matched the module".
    // This happens when a suite declares all tests with a single `kind`
    // (e.g. TemplateOnlyComponents is all `kind: 'templateOnly'`) so the
    // other three sub-modules end up empty.
    if (tests[type].length === 0) {
      return;
    }

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
  skip?: boolean | DeclaredComponentKind;
}

function isTestFunction(value: any): value is TestFunction {
  return typeof value === 'function' && value.isTest;
}

function isSkippedTest(value: any): boolean {
  return typeof value === 'function' && value.skip;
}
