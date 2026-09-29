import { keys } from '@glimmer/util';

export type DeclaredComponentKind = 'glimmer' | 'curly' | 'dynamic' | 'templateOnly';

export interface ComponentTestMeta {
  kind?: DeclaredComponentKind;
  skip?: boolean | DeclaredComponentKind;
}

type LegacyMethodDecorator = <T>(
  target: object,
  name: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

type StableMethodDecorator = (value: Function, context: ClassMethodDecoratorContext) => void;

export function test(meta: ComponentTestMeta): LegacyMethodDecorator & StableMethodDecorator;
export function test<T>(
  target: object,
  name: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void;
export function test(value: Function, context: ClassMethodDecoratorContext): void;
export function test(...args: any[]): any {
  if (args.length === 1) {
    let meta: ComponentTestMeta = args[0];
    return (...decoratorArgs: any[]) => {
      let testFunction = testFunctionFor(decoratorArgs);
      keys(meta).forEach((key) => (testFunction[key] = meta[key]));
      markTest(decoratorArgs);
    };
  }

  markTest(args);
  return isStableDecoratorArgs(args) ? undefined : args[2];
}

// Stable (2023-11) decorators are called as `(value, context)`, legacy ones as
// `(target, key, descriptor)`.
function isStableDecoratorArgs(args: any[]): args is [Function, ClassMethodDecoratorContext] {
  return args.length === 2 && typeof args[1] === 'object' && args[1] !== null && 'kind' in args[1];
}

function testFunctionFor(args: any[]): any {
  return isStableDecoratorArgs(args) ? args[0] : (args[2] as PropertyDescriptor).value;
}

function markTest(args: any[]): void {
  if (!isStableDecoratorArgs(args)) {
    (args[2] as PropertyDescriptor).enumerable = true;
  }
  testFunctionFor(args)['isTest'] = true;
}
