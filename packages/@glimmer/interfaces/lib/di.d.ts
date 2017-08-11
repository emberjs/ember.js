import { TemplateMeta } from '@glimmer/wire-format';
import { Opaque, Option, Unique } from './core';

export interface Resolver<Specifier> {
  lookupHelper(name: string, meta: Specifier): Option<number>;
  lookupModifier(name: string, meta: Specifier): Option<number>;
  lookupComponent(name: string, meta: Specifier): Option<number>; // ComponentSpec
  lookupPartial(name: string, meta: Specifier): Option<number>;

  resolve<U>(specifier: number): U;
}
