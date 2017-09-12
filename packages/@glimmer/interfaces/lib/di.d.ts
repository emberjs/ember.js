import { TemplateMeta } from '@glimmer/wire-format';
import { ComponentDefinition } from "@glimmer/runtime";

import { Opaque, Option, Unique } from './core';

export interface RuntimeResolver<Specifier> {
  lookupComponent(name: string, meta: Specifier): Option<ComponentDefinition<Opaque, Opaque>>;
  lookupPartial(name: string, meta: Specifier): Option<number>;

  resolve<U>(specifier: number): U;
}
