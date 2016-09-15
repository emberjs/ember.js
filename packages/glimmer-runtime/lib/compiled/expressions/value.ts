import { VM } from '../../vm';
import { CompiledExpression } from '../expressions';
import { ConstReference, PathReference } from 'glimmer-reference';
import { dict } from 'glimmer-util';

export default class CompiledValue<T> extends CompiledExpression<T> {
  public type = "value";
  private reference: ValueReference<T>;

  constructor(value: any) {
    super();
    this.reference = new ValueReference(value);
  }

  evaluate(vm: VM): PathReference<T> {
    return this.reference;
  }

  toJSON(): string {
    return JSON.stringify(this.reference.value());
  }
}

export class ValueReference<T> extends ConstReference<T> implements PathReference<T> {
  protected inner: T;
  protected children = dict<ValueReference<any>>();

  get(key: string) {
    let { children } = this;
    let child = children[key];

    if (!child) {
      child = children[key] = new ValueReference(this.inner[key]);
    }

    return child;
  }

  value(): any { return this.inner; }
}
