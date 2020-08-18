import { Option, Dict, Maybe } from '@glimmer/interfaces';
import { CachedReference, PathReference } from '@glimmer/reference';

export class ConcatReference extends CachedReference<Option<string>> {
  constructor(private parts: Array<PathReference<unknown>>) {
    super();
  }

  protected compute(): Option<string> {
    let parts = new Array<string>();

    for (let i = 0; i < this.parts.length; i++) {
      let value = this.parts[i].value() as Maybe<Dict>;

      if (value !== null && value !== undefined) {
        parts[i] = castToString(value);
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }

    return null;
  }
}

function castToString(value: Dict) {
  if (typeof value.toString !== 'function') {
    return '';
  }

  return String(value);
}
