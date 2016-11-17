import VM from '../../vm/append';
import { COMPILED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_POSITIONAL_ARGS, CompiledPositionalArgs, EvaluatedPositionalArgs } from './positional-args';
import { COMPILED_EMPTY_NAMED_ARGS, EVALUATED_EMPTY_NAMED_ARGS, CompiledNamedArgs, EvaluatedNamedArgs } from './named-args';
import { Templates, EMPTY_TEMPLATES } from '../../syntax/core';
import { RevisionTag, PathReference, combineTagged } from 'glimmer-reference';
import { Opaque, Dict } from 'glimmer-util';

export class CompiledArgs {
  static create(positional: CompiledPositionalArgs, named: CompiledNamedArgs, templates: Templates): CompiledArgs {
    if (positional === COMPILED_EMPTY_POSITIONAL_ARGS && named === COMPILED_EMPTY_NAMED_ARGS && templates === EMPTY_TEMPLATES) {
      return this.empty();
    } else {
      return new this(positional, named, templates);
    }
  }

  static empty(): CompiledArgs {
    return COMPILED_EMPTY_ARGS;
  }

  constructor(
    public positional: CompiledPositionalArgs,
    public named: CompiledNamedArgs,
    public templates: Templates
  ) {
  }

  evaluate(vm: VM): EvaluatedArgs {
    let { positional, named, templates } = this;
    return EvaluatedArgs.create(positional.evaluate(vm), named.evaluate(vm), templates);
  }
}

const COMPILED_EMPTY_ARGS: CompiledArgs = new (class extends CompiledArgs {
  constructor() {
    super(COMPILED_EMPTY_POSITIONAL_ARGS, COMPILED_EMPTY_NAMED_ARGS, EMPTY_TEMPLATES);
  }

  evaluate(vm: VM): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }
});

export class EvaluatedArgs {
  static empty(): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }

  static create(positional: EvaluatedPositionalArgs, named: EvaluatedNamedArgs, templates: Templates): EvaluatedArgs {
    return new this(positional, named, templates);
  }

  static positional(values: PathReference<Opaque>[]): EvaluatedArgs {
    return new this(EvaluatedPositionalArgs.create(values), EVALUATED_EMPTY_NAMED_ARGS, EMPTY_TEMPLATES);
  }

  static named(map: Dict<PathReference<Opaque>>) {
    return new this(EVALUATED_EMPTY_POSITIONAL_ARGS, EvaluatedNamedArgs.create(map), EMPTY_TEMPLATES);
  }

  public tag: RevisionTag;

  constructor(
    public positional: EvaluatedPositionalArgs,
    public named: EvaluatedNamedArgs,
    public templates: Templates
  ) {
    this.tag = combineTagged([positional, named]);
  }
}

const EMPTY_EVALUATED_ARGS = new EvaluatedArgs(EVALUATED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_NAMED_ARGS, EMPTY_TEMPLATES);

export { CompiledPositionalArgs, EvaluatedPositionalArgs, CompiledNamedArgs, EvaluatedNamedArgs };
