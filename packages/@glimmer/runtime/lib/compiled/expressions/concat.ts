import { Opaque, Option } from '@glimmer/interfaces';
import { CachedReference, combineTagged, PathReference, Tag } from '@glimmer/reference';

export class ConcatReference extends CachedReference<Option<string>> {
  public tag: Tag;

  constructor(private parts: Array<PathReference<Opaque>>) {
    super();
    this.tag = combineTagged(parts);
  }

  protected compute(): Option<string> {
    let parts = new Array<string>();

    for (let i = 0; i < this.parts.length; i++) {
      let value = this.parts[i].value();

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

function castToString(value: {}) {
  if (typeof value.toString !== 'function') {
    return '';
  }

  return String(value);
}
