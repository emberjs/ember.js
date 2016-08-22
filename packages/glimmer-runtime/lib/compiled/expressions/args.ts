import VM from '../../vm/append';
import { COMPILED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_POSITIONAL_ARGS, CompiledPositionalArgs, EvaluatedPositionalArgs } from './positional-args';
import { COMPILED_EMPTY_NAMED_ARGS, EVALUATED_EMPTY_NAMED_ARGS, CompiledNamedArgs, EvaluatedNamedArgs } from './named-args';
import { RevisionTag, PathReference, combineTagged } from 'glimmer-reference';
import { Opaque, Dict } from 'glimmer-util';

export class CompiledArgs {
  static create(positional: CompiledPositionalArgs, named: CompiledNamedArgs): CompiledArgs {
    if (positional === COMPILED_EMPTY_POSITIONAL_ARGS && named ===  COMPILED_EMPTY_NAMED_ARGS) {
      return this.empty();
    } else {
      return new this(positional, named);
    }
  }

  static empty(): CompiledArgs {
    return COMPILED_EMPTY_ARGS;
  }

  constructor(
    public positional: CompiledPositionalArgs,
    public named: CompiledNamedArgs
  ) {
  }

  evaluate(vm: VM): EvaluatedArgs {
    return EvaluatedArgs.create(this.positional.evaluate(vm), this.named.evaluate(vm));
  }
}

const COMPILED_EMPTY_ARGS: CompiledArgs = new (class extends CompiledArgs {
  constructor() {
    super(COMPILED_EMPTY_POSITIONAL_ARGS, COMPILED_EMPTY_NAMED_ARGS);
  }

  evaluate(vm: VM): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }
});

export class EvaluatedArgs {
  static empty(): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }

  static create(positional: EvaluatedPositionalArgs, named: EvaluatedNamedArgs): EvaluatedArgs {
    return new this(positional, named);
  }

  static positional(values: PathReference<Opaque>[]): EvaluatedArgs {
    return new this(EvaluatedPositionalArgs.create(values), EVALUATED_EMPTY_NAMED_ARGS);
  }

  static named(map: Dict<PathReference<Opaque>>) {
    return new this(EVALUATED_EMPTY_POSITIONAL_ARGS, EvaluatedNamedArgs.create(map));
  }

  public tag: RevisionTag;

  constructor(
    public positional: EvaluatedPositionalArgs,
    public named: EvaluatedNamedArgs
  ) {
    this.tag = combineTagged([positional, named]);
  }
}

const EMPTY_EVALUATED_ARGS = new EvaluatedArgs(EVALUATED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_NAMED_ARGS);

export { CompiledPositionalArgs, EvaluatedPositionalArgs, CompiledNamedArgs, EvaluatedNamedArgs };
