import { ComponentDefinition } from './components';
import { Opaque, Option, Unique } from './core';

export interface RuntimeResolver<Locator> {
  lookupComponent(name: string, referrer: Locator): Option<ComponentDefinition<Opaque, Opaque>>;
  lookupPartial(name: string, referrer: Locator): Option<number>;

  resolve<U>(handle: number): U;
}
