import { UNDEFINED_REFERENCE } from '../../references';
import { EMPTY_ARRAY } from '../../utils';
import { PathReference, Tag, combineTagged } from '@glimmer/reference';
import { Opaque } from '@glimmer/util';

export class EvaluatedPositionalArgs {
  static create(values: ReadonlyArray<PathReference<Opaque>>) {
    return new this(values);
  }

  static empty(): EvaluatedPositionalArgs {
    return EVALUATED_EMPTY_POSITIONAL_ARGS;
  }

  public tag: Tag;
  public length: number;

  constructor(public values: ReadonlyArray<PathReference<Opaque>>) {
    this.tag = combineTagged(values);
    this.length = values.length;
  }

  at(index: number): PathReference<Opaque> {
    let { values, length } = this;
    return (index < length) ? values[index] : UNDEFINED_REFERENCE;
  }

  value(): ReadonlyArray<Opaque> {
    let { values, length } = this;
    let ret: Opaque[] = new Array(length);

    for (let i = 0; i < length; i++) {
      ret[i] = values[i].value();
    }

    return ret;
  }
}

export const EVALUATED_EMPTY_POSITIONAL_ARGS: EvaluatedPositionalArgs = new (class extends EvaluatedPositionalArgs {
  constructor() {
    super(EMPTY_ARRAY);
  }

  at(): PathReference<Opaque> {
    return UNDEFINED_REFERENCE;
  }

  value(): ReadonlyArray<Opaque> {
    return this.values;
  }
});
