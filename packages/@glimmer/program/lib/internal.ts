import { Unique, RuntimeResolver as IResolver } from '@glimmer/interfaces';

export type Specifier = Unique<'Specifier'>;
export type Referer = Unique<'Referer'>;
export type Resolver = IResolver<Specifier>;
