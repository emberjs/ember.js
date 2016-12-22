import VM from '../../vm/append';
import { COMPILED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_POSITIONAL_ARGS, CompiledPositionalArgs, EvaluatedPositionalArgs } from './positional-args';
import { COMPILED_EMPTY_NAMED_ARGS, EVALUATED_EMPTY_NAMED_ARGS, CompiledNamedArgs, EvaluatedNamedArgs } from './named-args';
import { RevisionTag, PathReference, combineTagged } from 'glimmer-reference';
import { InlineBlock } from '../../scanner';
import { Opaque, Option, Dict } from 'glimmer-util';

export { COMPILED_EMPTY_POSITIONAL_ARGS, COMPILED_EMPTY_NAMED_ARGS };

export interface Blocks {
  default: Option<InlineBlock>;
  inverse: Option<InlineBlock>;
}

export const EMPTY_BLOCKS: Blocks = {
  default: null,
  inverse: null
};

export class CompiledArgs {
  static create(positional: CompiledPositionalArgs, named: CompiledNamedArgs, blocks: Blocks): CompiledArgs {
    if (positional === COMPILED_EMPTY_POSITIONAL_ARGS && named === COMPILED_EMPTY_NAMED_ARGS && blocks === EMPTY_BLOCKS) {
      return this.empty();
    } else {
      return new this(positional, named, blocks);
    }
  }

  static empty(): CompiledArgs {
    return COMPILED_EMPTY_ARGS;
  }

  public type = "compiled-args";

  constructor(
    public positional: CompiledPositionalArgs,
    public named: CompiledNamedArgs,
    public blocks: Blocks
  ) {
  }

  evaluate(vm: VM): EvaluatedArgs {
    let { positional, named, blocks } = this;
    return EvaluatedArgs.create(positional.evaluate(vm), named.evaluate(vm), blocks);
  }
}

export const COMPILED_EMPTY_ARGS: CompiledArgs = new (class extends CompiledArgs {
  constructor() {
    super(COMPILED_EMPTY_POSITIONAL_ARGS, COMPILED_EMPTY_NAMED_ARGS, EMPTY_BLOCKS);
  }

  evaluate(_vm: VM): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }
});

export class EvaluatedArgs {
  static empty(): EvaluatedArgs {
    return EMPTY_EVALUATED_ARGS;
  }

  static create(positional: EvaluatedPositionalArgs, named: EvaluatedNamedArgs, blocks: Blocks): EvaluatedArgs {
    return new this(positional, named, blocks);
  }

  static positional(values: PathReference<Opaque>[], blocks = EMPTY_BLOCKS): EvaluatedArgs {
    return new this(EvaluatedPositionalArgs.create(values), EVALUATED_EMPTY_NAMED_ARGS, blocks);
  }

  static named(map: Dict<PathReference<Opaque>>, blocks = EMPTY_BLOCKS) {
    return new this(EVALUATED_EMPTY_POSITIONAL_ARGS, EvaluatedNamedArgs.create(map), blocks);
  }

  public tag: RevisionTag;

  constructor(
    public positional: EvaluatedPositionalArgs,
    public named: EvaluatedNamedArgs,
    public blocks: Blocks
  ) {
    this.tag = combineTagged([positional, named]);
  }
}

const EMPTY_EVALUATED_ARGS = new EvaluatedArgs(EVALUATED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_NAMED_ARGS, EMPTY_BLOCKS);

export { CompiledPositionalArgs, EvaluatedPositionalArgs, CompiledNamedArgs, EvaluatedNamedArgs };
