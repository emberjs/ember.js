import { Unique, RuntimeResolver as IResolver } from '@glimmer/interfaces';

export type Specifier = Unique<'Specifier'>;
export type Referrer = Unique<'Referrer'>;
export type Resolver = IResolver<Specifier>;
