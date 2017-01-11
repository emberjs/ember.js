import { UNDEFINED_REFERENCE } from '../../references';
import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { EMPTY_ARRAY } from '../../utils';
import { PathReference, RevisionTag, combineTagged } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export class CompiledPositionalArgs {
  static create(values: CompiledExpression<Opaque>[]): CompiledPositionalArgs {
    if (values.length) {
      return new this(values);
    } else {
      return COMPILED_EMPTY_POSITIONAL_ARGS;
    }
  }

  static empty() {
    return COMPILED_EMPTY_POSITIONAL_ARGS;
  }

  public length: number;

  constructor(public values: ReadonlyArray<CompiledExpression<Opaque>>) {
    this.length = values.length;
  }

  evaluate(vm: VM): EvaluatedPositionalArgs {
    let { values, length } = this;
    let references: PathReference<Opaque>[] = new Array(length);

    for (let i = 0; i < length; i++) {
      references[i] = values[i].evaluate(vm);
    }

    return EvaluatedPositionalArgs.create(references);
  }

  toJSON(): string {
    return `[${this.values.map(value => value.toJSON()).join(", ")}]`;
  }
}

export const COMPILED_EMPTY_POSITIONAL_ARGS: CompiledPositionalArgs = new (class extends CompiledPositionalArgs {
  constructor() {
    super(EMPTY_ARRAY);
  }

  evaluate(_vm: VM): EvaluatedPositionalArgs {
    return EVALUATED_EMPTY_POSITIONAL_ARGS;
  }

  toJSON(): string {
    return `<EMPTY>`;
  }
});

export class EvaluatedPositionalArgs {
  static create(values: ReadonlyArray<PathReference<Opaque>>) {
    return new this(values);
  }

  static empty(): EvaluatedPositionalArgs {
    return EVALUATED_EMPTY_POSITIONAL_ARGS;
  }

  public tag: RevisionTag;
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
