import { type EnvironmentDelegate } from '@glimmer/runtime';
import { keys } from '@glimmer/util';

import { type ComponentKind } from '../components';
import { JitRenderDelegate } from '../modes/jit/delegate';
import { NodeJitRenderDelegate } from '../modes/node/env';
import type RenderDelegate from '../render-delegate';
import { type RenderDelegateOptions } from '../render-delegate';
import { type Count, type IRenderTest, type RenderTest } from '../render-test';
import { JitSerializationDelegate } from '../suites/custom-dom-helper';
import { type DeclaredComponentKind } from '../test-decorator';

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
          // eslint-disable-next-line no-loop-func
          QUnit.skip(prop, (assert) => {
            test.call(instance!, assert, instance!.count);
            instance!.count.assert();
          });
        } else {
          // eslint-disable-next-line no-loop-func, qunit/require-expect
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
        // eslint-disable-next-line qunit/require-expect
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
            if (test['kind'] === 'templateOnly') {
              tests.templateOnly.push(createTest(prop, test, true));
            } else {
              ['glimmer', 'curly', 'dynamic'].forEach((kind) => {
                tests[kind as DeclaredComponentKind].push(createTest(prop, test, true));
              });
            }
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
  let rest = str.slice(1) as string;

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
