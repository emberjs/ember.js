import { COMPILED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_POSITIONAL_ARGS, CompiledPositionalArgs, EvaluatedPositionalArgs } from './positional-args';
import { COMPILED_EMPTY_NAMED_ARGS, EVALUATED_EMPTY_NAMED_ARGS, CompiledNamedArgs, EvaluatedNamedArgs } from './named-args';
import VM from '../../vm/append';
import { Block  } from '../blocks';
import { CONSTANT_TAG, RevisionTag, PathReference, combine } from 'glimmer-reference';
import { Dict, dict, Opaque } from 'glimmer-util';

interface CompiledArgOptions {
  positional: CompiledPositionalArgs;
  named: CompiledNamedArgs;
}

export abstract class CompiledArgs {
  public type: string;
  public positional: CompiledPositionalArgs;
  public named: CompiledNamedArgs;

  static create({ positional, named }: CompiledArgOptions): CompiledArgs {
    if (positional === COMPILED_EMPTY_POSITIONAL_ARGS && named ===  COMPILED_EMPTY_NAMED_ARGS) {
      return COMPILED_EMPTY_ARGS;
    } else {
      return new CompiledNonEmptyArgs({ positional, named });
    }
  }

  static empty(): CompiledArgs {
    return COMPILED_EMPTY_ARGS;
  }

  abstract evaluate(vm: VM): EvaluatedArgs;
}

class CompiledNonEmptyArgs extends CompiledArgs {
  public type = "args";
  public positional: CompiledPositionalArgs;
  public named: CompiledNamedArgs;

  constructor({ positional, named }: CompiledArgOptions) {
    super();
    this.positional = positional;
    this.named = named;
  }

  evaluate(vm: VM): EvaluatedArgs {
    return EvaluatedArgs.create({
      positional: this.positional.evaluate(vm),
      named: this.named.evaluate(vm)
    });
  }
}

export const COMPILED_EMPTY_ARGS = new (class extends CompiledArgs {
  public type = "empty-args";

  evaluate(vm): EvaluatedArgs {
    return EvaluatedArgs.empty();
  }
});

interface EvaluatedArgsOptions {
  positional: EvaluatedPositionalArgs;
  named: EvaluatedNamedArgs;
}

export abstract class EvaluatedArgs {
  public tag: RevisionTag;

  static empty(): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }

  static create(options: EvaluatedArgsOptions): EvaluatedArgs {
    return new NonEmptyEvaluatedArgs(options);
  }

  static positional(values: PathReference<any>[]): EvaluatedArgs {
    return new NonEmptyEvaluatedArgs({ positional: EvaluatedPositionalArgs.create({ values }), named: EvaluatedNamedArgs.empty() });
  }

  public type: string;
  public positional: EvaluatedPositionalArgs;
  public named: EvaluatedNamedArgs;
  public blocks: Block[];
  public internal: Dict<Opaque>;

  public withInternal(): EvaluatedArgs {
    if (!this.internal) {
      this.internal = dict<Opaque>();
    }
    return this;
  }
}

class NonEmptyEvaluatedArgs extends EvaluatedArgs {
  constructor({ positional, named }: EvaluatedArgsOptions) {
    super();
    this.tag = combine([positional.tag, named.tag]);
    this.positional = positional;
    this.named = named;
    this.internal = null;
  }
}

export const EMPTY_EVALUATED_ARGS = new (class extends EvaluatedArgs {
  public tag = CONSTANT_TAG;
  public positional = EVALUATED_EMPTY_POSITIONAL_ARGS;
  public named = EVALUATED_EMPTY_NAMED_ARGS;
  public internal = null;

  public withInternal(): EvaluatedArgs {
    let args = new NonEmptyEvaluatedArgs(this);
    args.internal = dict<Opaque>();
    return args;
  }
});

export { CompiledPositionalArgs, EvaluatedPositionalArgs, CompiledNamedArgs, EvaluatedNamedArgs };
