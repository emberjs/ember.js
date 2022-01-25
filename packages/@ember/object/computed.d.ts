import { DeprecationOptions } from '@ember/debug';

export { alias, expandProperties } from '@ember/-internals/metal';

export function and(dependentKey: string, ...additionalDependentKeys: string[]): PropertyDecorator;

export function bool(dependentKey: string): PropertyDecorator;

export function collect(
  dependentKey: string,
  ...additionalDependentKeys: string[]
): PropertyDecorator;

export function deprecatingAlias(
  dependentKey: string,
  options: DeprecationOptions
): PropertyDecorator;

export function empty(dependentKey: string): PropertyDecorator;

export function equal(dependentKey: string, value: unknown): PropertyDecorator;

export function filter(
  dependentKey: string,
  callback: (value: unknown, index: number, array: unknown[]) => boolean
): PropertyDecorator;
export function filter(
  dependentKey: string,
  additionalDependentKeys: string[],
  callback: (value: unknown, index: number, array: unknown[]) => boolean
): PropertyDecorator;

export function filterBy(
  dependentKey: string,
  propertyKey: string,
  value?: unknown
): PropertyDecorator;

export function gt(dependentKey: string, value: number): PropertyDecorator;

export function gte(dependentKey: string, value: number): PropertyDecorator;

export function intersect(
  dependentKey: string,
  ...additionalDependentKeys: string[]
): PropertyDecorator;

export function lt(dependentKey: string, value: number): PropertyDecorator;

export function lte(dependentKey: string, value: number): PropertyDecorator;

export function map(
  dependentKey: string,
  callback: (value: unknown, index: number) => boolean
): PropertyDecorator;
export function map(
  dependentKey: string,
  additionalDependentKeys: string[],
  callback: (value: unknown, index: number) => boolean
): PropertyDecorator;

export function mapBy(dependentKey: string, propertyKey: string): PropertyDecorator;

export function match(dependentKey: string, value: RegExp): PropertyDecorator;

export function max(dependentKey: string): PropertyDecorator;

export function min(dependentKey: string): PropertyDecorator;

export function none(dependentKey: string): PropertyDecorator;

export function not(dependentKey: string): PropertyDecorator;

export function notEmpty(dependentKey: string): PropertyDecorator;

export function oneWay(dependentKey: string): PropertyDecorator;

export function or(dependentKey: string, ...additionalDependentKeys: string[]): PropertyDecorator;

export function readOnly(dependentKey: string): PropertyDecorator;

export function reads(dependentKey: string): PropertyDecorator;

export function setDiff(setAProperty: string, setBProperty: string): PropertyDecorator;

type SortDefinition = (itemA: unknown, itemB: unknown) => number;
export function sort(itemsKey: string, sortDefinition: SortDefinition | string): PropertyDecorator;
export function sort(
  itemsKey: string,
  additionalDependentKeys: string[],
  sortDefinition: SortDefinition
): PropertyDecorator;

export function sum(dependentKey: string): PropertyDecorator;

export function union(
  dependentKey: string,
  ...additionalDependentKeys: string[]
): PropertyDecorator;

// NOTE: Despite documentation, union and uniq are aliases, so uniq actually can take more props
export function uniq(dependentKey: string): PropertyDecorator;

export function uniqBy(dependentKey: string, propertyKey: string): PropertyDecorator;
