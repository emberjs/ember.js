import { TemplateMeta } from '@glimmer/wire-format';
import { Opaque, Option, Unique } from './core';

export interface Resolver<Specifier, Handle> {
  lookupHelper(name: string, meta: Specifier): Option<Handle>;
  lookupModifier(name: string, meta: Specifier): Option<Handle>;
  lookupComponent(name: string, meta: Specifier): Option<Handle>; // ComponentSpec
  lookupPartial(name: string, meta: Specifier): Option<Handle>;

  resolve<U>(specifier: Handle): U;
}
