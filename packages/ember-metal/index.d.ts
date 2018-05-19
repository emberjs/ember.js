import { Tag } from '@glimmer/reference';

export function peekMeta(obj: any): any;

export const PROPERTY_DID_CHANGE: symbol;

export function setHasViews(fn: () => boolean): null;

export type MethodKey<T> = { [K in keyof T]: T[K] extends (() => void) ? K : never }[keyof T];
export type RunInTransactionFunc = <T extends object, K extends MethodKey<T>>(
  context: T,
  methodName: K
) => boolean;
export type DidRenderFunc = (object: any, key: string, reference: any) => void;
export type AssertNotRenderedFunc = (obj: object, keyName: string) => void;

export const runInTransaction: RunInTransactionFunc;
export const didRender: DidRenderFunc;
export const assertNotRendered: AssertNotRenderedFunc;

export function get(obj: any, keyName: string): any;

export function set(
  obj: any,
  keyName: string,
  value: any,
  tolerant?: boolean
): void;

export function objectAt(arr: any, i: number): any;

export function computed(...args: Array<any>): any;

export function isNone(obj: any): boolean;

export function watchKey(obj: any, keyName: string, meta?: any): void;

export { tagForProperty, tagFor } from './lib/tags';
export { tracked } from './lib/tracked';
