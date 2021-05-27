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

// NOTE: We don't properly handle types for CPs so we just return unknown for gets
export function get(obj: any, key: string): unknown;
export function getProperties<L extends string[]>(
  obj: any,
  list: L
): { [Key in L[number]]: unknown };
export function getProperties<L extends string[]>(
  obj: any,
  ...list: L
): { [Key in L[number]]: unknown };
export function set<T>(obj: any, key: string, value: T): T;
export function setProperties<T extends Record<string, any>>(obj: any, hash: T): T;

export { default } from '@ember/-internals/runtime/types/index';
