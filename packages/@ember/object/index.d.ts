export let action: MethodDecorator;

// NOTE: The internal version of computed is TypeScript.
// However, it is more permissive than we want.
export function computed(...dependentKeys: string[]): MethodDecorator;

// NOTE: The internal version of defineProperty is TypeScript.
// However, it is more permissive than we want.
export function defineProperty(
  obj: object,
  keyName: string,
  desc?: PropertyDescriptor,
  data?: any,
  meta?: any
): void;

export { default } from '@ember/-internals/runtime/types/index';
