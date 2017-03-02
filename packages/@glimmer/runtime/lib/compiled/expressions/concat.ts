import { FIXME } from '@glimmer/util';
import { PathReference, CachedReference, Tag, combineTagged } from '@glimmer/reference';
import { Option, Opaque } from '@glimmer/util';

export class ConcatReference extends CachedReference<Option<string>> {
  public tag: Tag;

  constructor(private parts: PathReference<Opaque>[]) {
    super();
    this.tag = combineTagged(parts);
  }

  protected compute(): Option<string> {
    let parts = new Array<string>();

    for (let i = 0; i < this.parts.length; i++) {
      let value = this.parts[i].value();

      if (value !== null && value !== undefined) {
        parts[i] = castToString(value as FIXME<any, 'This works with strict null checks'>) as FIXME<string, 'Coerce falsy values to strings'>;
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }

    return null;
  }
}

function castToString(value: Object) {
  if (typeof value['toString'] !== 'function') {
    return '';
  }

  return String(value);
}
