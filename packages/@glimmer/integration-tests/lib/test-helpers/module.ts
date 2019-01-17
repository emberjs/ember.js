import { IRenderTest, Count, RenderTest } from '../render-test';
import RenderDelegate from '../render-delegate';
import { JitRenderDelegate } from '../modes/jit/delegate';
import { SimpleDocument } from '@simple-dom/interface';
import { keys } from '@glimmer/util';
import { DeclaredComponentKind } from '../test-decorator';
import { ComponentKind } from '../components';
import { AotRenderDelegate } from '../modes/aot/delegate';
import { NodeRenderDelegate } from '../modes/node/env';
import { JitSerializationDelegate, AotSerializationDelegate } from '../suites/custom-dom-helper';

export interface RenderTestConstructor<D extends RenderDelegate, T extends IRenderTest> {
  suiteName: string;
  new (delegate: D): T;
}

export function jitSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, JitRenderDelegate, options);
}

export function nodeSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, NodeRenderDelegate, options);
}

export function nodeComponentSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>
): void {
  return suite(klass, NodeRenderDelegate, { componentModule: true });
}

export function jitComponentSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>
): void {
  return suite(klass, JitRenderDelegate, { componentModule: true });
}

export function aotSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, AotRenderDelegate, options);
}

export function aotComponentSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>
): void {
  return suite(klass, AotRenderDelegate, { componentModule: true });
}

export function jitSerializeSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, JitSerializationDelegate, options);
}

export function aotSerializeSuite<T extends IRenderTest>(
  klass: RenderTestConstructor<RenderDelegate, T>,
  options = { componentModule: false }
): void {
  return suite(klass, AotSerializationDelegate, options);
}

export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
  readonly isEager: boolean;
  readonly style: string;
  new (doc?: SimpleDocument): Delegate;
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
  options = { componentModule: false }
): void {
  let suiteName = klass.suiteName;

  if (options.componentModule) {
    if (shouldRunTest<D>(Delegate)) {
      componentModule(
        `${Delegate.style} :: Components :: ${suiteName}`,
        (klass as any) as RenderTestConstructor<D, RenderTest>,
        Delegate
      );
    }
  } else {
    QUnit.module(`[integration] ${Delegate.style} :: ${suiteName}`);

    for (let prop in klass.prototype) {
      const test = klass.prototype[prop];

      if (isTestFunction(test) && shouldRunTest<D>(Delegate)) {
        QUnit.test(prop, assert => {
          let instance = new klass(new Delegate());
          test.call(instance, assert, instance.count);
          instance.count.assert();
        });
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
    basic: [],
    fragment: [],
  };

  function createTest(prop: string, test: any, skip?: boolean) {
    let shouldSkip: boolean;
    if (skip === true || test.skip === true) {
      shouldSkip = true;
    }

    return (type: ComponentKind, klass: RenderTestConstructor<D, T>) => {
      if (!shouldSkip) {
        QUnit.test(`${type.toLowerCase()}: ${prop}`, assert => {
          let instance = new klass(new Delegate());
          instance.testType = type;
          test.call(instance, assert, instance.count);
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
            if (test['kind'] === 'basic') {
              // Basic components are not part of matrix testing
              tests.basic.push(createTest(prop, test, true));
            } else if (test['kind'] === 'fragment') {
              tests.fragment.push(createTest(prop, test, true));
            } else {
              ['glimmer', 'curly', 'dynamic'].forEach(kind => {
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

      if (kind === 'basic') {
        tests.basic.push(createTest(prop, test));
      }

      if (kind === 'fragment') {
        tests.fragment.push(createTest(prop, test));
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
  basic: Function[];
  fragment: Function[];
}

function nestedComponentModules<D extends RenderDelegate, T extends IRenderTest>(
  klass: RenderTestConstructor<D, T>,
  tests: ComponentTests
): void {
  keys(tests).forEach(type => {
    let formattedType = `${type[0].toUpperCase() + type.slice(1)}`;
    QUnit.module(`[integration] ${formattedType}`, () => {
      for (let i = tests[type].length - 1; i >= 0; i--) {
        let t = tests[type][i];
        t(formattedType, klass);
        tests[type].pop();
      }
    });
  });
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
