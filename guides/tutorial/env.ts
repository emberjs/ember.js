import {
  Dict,
  OpaqueTemplateMeta,
  Option,
  RuntimeResolver,
  TemplateMeta,
} from '@glimmer/interfaces';
import { IterableKeyDefinitions } from '@glimmer/reference';

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

export const KEYS: IterableKeyDefinitions = {
  named: {
    '@index': (_: unknown, index: unknown) => String(index),
    '@primitive': (item: unknown) => String(item),
  },
  default: (key: string) => (item: unknown) => String((item as Dict)[key]),
};
