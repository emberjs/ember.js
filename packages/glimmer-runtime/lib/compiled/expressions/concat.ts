import { CompiledExpression } from '../expressions';
import { normalizeTextValue } from '../opcodes/content';
import VM from '../../vm/append';
import { PathReference, CachedReference, RevisionTag, combineTagged } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export default class CompiledConcat {
  public type = "concat";
  public parts: CompiledExpression<Opaque>[];

  constructor({ parts }: { parts: CompiledExpression<Opaque>[] }) {
    this.parts = parts;
  }

  evaluate(vm: VM): ConcatReference {
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
  private parts: PathReference<Opaque>[];

  constructor(parts: PathReference<Opaque>[]) {
    super();
    this.tag = combineTagged(parts);
    this.parts = parts;
  }

  protected compute(): string {
    let parts = new Array<string>(this.parts.length);
    for (let i = 0; i < this.parts.length; i++) {
      parts[i] = normalizeTextValue(this.parts[i].value());
    }
    return parts.join('');
  }
}
