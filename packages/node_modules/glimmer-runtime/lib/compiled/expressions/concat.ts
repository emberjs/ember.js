import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { PathReference, Reference } from 'glimmer-reference';
import { Opaque, FIXME } from 'glimmer-util';

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

class ConcatReference implements Reference<string> {
  private parts: PathReference<Opaque>[];

  constructor(parts: PathReference<Opaque>[]) {
    this.parts = parts;
  }

  isDirty() {
    return true;
  }

  value(): string {
    let parts = new Array<string>(this.parts.length);
    for (let i = 0; i < this.parts.length; i++) {
      parts[i] = this.parts[i].value() as FIXME<'convert opaque to str'>;
    }
    return parts.join('');
  }

  destroy() {}
}
