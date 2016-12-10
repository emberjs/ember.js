import { VM } from '../../vm';
import { CompiledExpression } from '../expressions';
import { Primitive, PrimitiveReference } from '../../references';

export default class CompiledValue<T extends Primitive> extends CompiledExpression<T> {
  public type = "value";
  private reference: PrimitiveReference<T>;

  constructor(value: T) {
    super();
    this.reference = PrimitiveReference.create(value);
  }

  evaluate(vm: VM): PrimitiveReference<T> {
    return this.reference;
  }

  toJSON(): string {
    return JSON.stringify(this.reference.value());
  }
}
