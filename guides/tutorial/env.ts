import {
  Dict,
  DynamicScope,
  OpaqueTemplateMeta,
  Option,
  RuntimeResolver,
  TemplateMeta,
} from '@glimmer/interfaces';
import { IterableKeyDefinitions, PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';

export class TutorialRuntimeResolver implements RuntimeResolver<TemplateMeta> {
  lookupComponentDefinition(_name: string, _referrer?: Option<TemplateMeta>): Option<any> {
    throw new Error('Method not implemented.');
  }

  lookupPartial(_name: string, _referrer?: Option<OpaqueTemplateMeta>): Option<number> {
    throw new Error('Method not implemented.');
  }

  resolve<U>(_handle: number): U {
    throw new Error('Method not implemented.');
  }
}

export class TutorialDynamicScope implements DynamicScope {
  private bucket: any;

  constructor(bucket = null) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }

  get(key: string): PathReference<unknown> {
    return this.bucket[key];
  }

  set(key: string, reference: PathReference<unknown>) {
    return (this.bucket[key] = reference);
  }

  child(): TutorialDynamicScope {
    return new TutorialDynamicScope(this.bucket);
  }
}

export const KEYS: IterableKeyDefinitions = {
  named: {
    '@index': (_: unknown, index: unknown) => String(index),
    '@primitive': (item: unknown) => String(item),
  },
  default: (key: string) => (item: unknown) => String((item as Dict)[key]),
};
