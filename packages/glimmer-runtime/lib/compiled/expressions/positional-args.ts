import { NULL_REFERENCE } from '../../references';
import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { CONSTANT_TAG, PathReference, RevisionTag, combineTagged } from 'glimmer-reference';

export abstract class CompiledPositionalArgs {
  static create({ values }: { values: CompiledExpression<any>[] }): CompiledPositionalArgs {
    if (values.length) {
      return new CompiledNonEmptyPositionalArgs({ values });
    } else {
      return COMPILED_EMPTY_POSITIONAL_ARGS;
    }
  }

  public type: string;
  public length: number;
  abstract evaluate(vm: VM): EvaluatedPositionalArgs;
  abstract toJSON(): string;
}

class CompiledNonEmptyPositionalArgs extends CompiledPositionalArgs {
  public type = "positional-args";
  public values: CompiledExpression<any>[];

  constructor({ values }: { values: CompiledExpression<any>[] }) {
    super();
    this.length = values.length;
    this.values = values;
  }

  evaluate(vm: VM): EvaluatedPositionalArgs {
    let { values } = this;
    let valueReferences = new Array<any>(values.length);

    for (let i = 0; i < values.length; i++) {
      valueReferences[i] = <PathReference<any>>values[i].evaluate(vm);
    }

    return EvaluatedPositionalArgs.create({ values: valueReferences });
  }

  toJSON(): string {
    return `[${this.values.map(value => value.toJSON()).join(", ")}]`;
  }
}

export const COMPILED_EMPTY_POSITIONAL_ARGS = new (class extends CompiledPositionalArgs {
  public type = "empty-positional-args";

  public length = 0;

  evaluate(vm): EvaluatedPositionalArgs {
    return EvaluatedPositionalArgs.empty();
  }

  toJSON(): string {
    return `<EMPTY>`;
  }
});

export abstract class EvaluatedPositionalArgs {
  public tag: RevisionTag;

  static empty(): EvaluatedPositionalArgs {
    return EVALUATED_EMPTY_POSITIONAL_ARGS;
  }

  static create({ values }: { values: PathReference<any>[] }) {
    return new NonEmptyEvaluatedPositionalArgs({ values });
  }

  public type: string;
  public values: PathReference<any>[];
  public length: number;

  forEach(callback: (value: PathReference<any>) => void) {
    let values = this.values;
    for (let i = 0; i < values.length; i++) {
      callback(values[i]);
    }
  }

  abstract at(index: number): PathReference<any>;
  abstract value(): any[];
}

class NonEmptyEvaluatedPositionalArgs extends EvaluatedPositionalArgs {
  public values: PathReference<any>[];

  constructor({ values }: { values: PathReference<any>[] }) {
    super();
    this.tag = combineTagged(values);
    this.length = values.length;
    this.values = values;
  }

  at(index: number): PathReference<any> {
    return this.values[index];
  }

  value(): any[] {
    let ret = new Array(this.values.length);
    for (let i = 0; i < this.values.length; i++) {
      ret[i] = this.values[i].value();
    }

    return ret;
  }
}

export const EVALUATED_EMPTY_POSITIONAL_ARGS = new (class extends EvaluatedPositionalArgs {
  public tag = CONSTANT_TAG;
  public length = 0;
  public values = [];

  at(): PathReference<any> {
    return NULL_REFERENCE;
  }

  value(): any[] {
    return [];
  }
});
