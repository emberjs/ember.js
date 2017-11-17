import {
  RuntimeResolver as IRuntimeResolver
} from '@glimmer/interfaces';
import { Specifier } from '@glimmer/opcode-compiler';
import { PartialDefinition } from '@glimmer/runtime/dist/types/lib/partial';

import {
  lookupComponent,
  lookupPartial,
} from 'ember-views';

export default class RuntimeResolver implements IRuntimeResolver<Specifier> {
  private partialsCache: PartialDefinition[];

  constructor(public owner: any) {
    this.partialsCache = [];
  }

  lookupComponent(name: string, meta: Specifier) {
    return lookupComponent(name, this.owner, meta);
  }

  lookupPartial(name: string, _meta: Specifier) {
    const partial = this.partialsCache.find(partial => partial.name === name);
    let idx;
    if (partial) {
      idx = this.partialsCache.indexOf(partial);
    } else {
      this.partialsCache.push(lookupPartial(name, this.owner));
      idx = this.partialsCache.length - 1;
    }
    return idx;
  }

  resolve<T>(specifier: number) {
    const cache = this.cacheFor[specifier];
    return cache[specifier] as T;
  }
}