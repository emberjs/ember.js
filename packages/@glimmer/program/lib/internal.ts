import { Unique, RuntimeResolver as IResolver } from '@glimmer/interfaces';

export type Locator = Unique<'Locator'>;
export type Referrer = Unique<'Referrer'>;
export type Resolver = IResolver<Locator>;
