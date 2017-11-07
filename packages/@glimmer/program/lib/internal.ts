import { Unique, RuntimeResolver as IResolver } from '@glimmer/interfaces';

export type TemplateMeta = Unique<'TemplateMeta'>;
export type Referrer = Unique<'Referrer'>;
export type Resolver = IResolver<TemplateMeta>;
