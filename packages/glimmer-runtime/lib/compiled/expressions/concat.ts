import { CompiledExpression } from '../expressions';
import { FIXME } from 'glimmer-util';
import VM from '../../vm/append';
import { PathReference, CachedReference, RevisionTag, combineTagged } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export default class CompiledConcat {
  public type = "concat";

  constructor(private parts: CompiledExpression<Opaque>[]) {}

  evaluate(vm: VM): CachedReference<string> {
    let parts: PathReference<Opaque>[] = new Array(this.parts.length);
    for (let i = 0; i < this.parts.length; i++) {
      parts[i] = this.parts[i].evaluate(vm);
    }
    return new ConcatReference(parts);
  }

  toJSON(): string {
    return `concat(${this.parts.map(expr => expr.toJSON()).join(", ")})`;
  }
}

class ConcatReference extends CachedReference<string> {
  public tag: RevisionTag;

  constructor(private parts: PathReference<Opaque>[]) {
    super();
    this.tag = combineTagged(parts);
  }

  protected compute(): string {
    let parts = new Array<string>();

    for (let i = 0; i < this.parts.length; i++) {
      let value = this.parts[i].value();

      if (value !== null && value !== undefined) {
        parts[i] = castToString(this.parts[i].value()) as FIXME<string, 'Coerce falsy values to strings'>;
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }

    return null;
  }
}

function castToString(value) {
  if (typeof value['toString'] !== 'function') {
    return '';
  }

  return String(value);
}
