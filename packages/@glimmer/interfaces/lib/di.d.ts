import { TemplateMeta } from '@glimmer/wire-format';
import { Opaque, Option, Unique } from './core';
import { ComponentSpec } from "@glimmer/runtime";

export interface RuntimeResolver<Specifier> {
  lookupComponent(name: string, meta: Specifier): Option<ComponentSpec<Opaque, Opaque>>;
  lookupPartial(name: string, meta: Specifier): Option<number>;

  resolve<U>(specifier: number): U;
}
