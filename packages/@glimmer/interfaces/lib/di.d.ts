import { TemplateMeta } from '@glimmer/wire-format';

import { ComponentDefinition } from './components';
import { Opaque, Option, Unique } from './core';

export interface RuntimeResolver<Meta> {
  lookupComponent(name: string, referrer: Meta): Option<ComponentDefinition<Opaque, Opaque>>;
  lookupPartial(name: string, referrer: Meta): Option<number>;

  resolve<U>(handle: number): U;
}
