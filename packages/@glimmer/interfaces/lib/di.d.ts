import { TemplateMeta } from '@glimmer/wire-format';
import { Opaque, Option, Unique } from './core';

export interface Resolver<Specifier, T extends TemplateMeta = TemplateMeta> {
  lookupHelper(name: string, meta: T): Option<Specifier>;
  lookupModifier(name: string, meta: T): Option<Specifier>;
  lookupComponent(name: string, meta: T): Option<Specifier>;
  lookupPartial(name: string, meta: T): Option<Specifier>;

  resolve<U>(specifier: Specifier): U;
}