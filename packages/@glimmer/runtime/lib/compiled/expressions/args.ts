import { EVALUATED_EMPTY_POSITIONAL_ARGS, EvaluatedPositionalArgs } from './positional-args';
import { EVALUATED_EMPTY_NAMED_ARGS, EvaluatedNamedArgs } from './named-args';
import { Tag, PathReference, combineTagged } from '@glimmer/reference';
import { Block } from '../../scanner';
import { Opaque, Option, Dict } from '@glimmer/util';

export interface Blocks {
  default: Option<Block>;
  inverse: Option<Block>;
}

export const EMPTY_BLOCKS: Blocks = {
  default: null,
  inverse: null
};

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

  public tag: Tag;

  constructor(
    public positional: EvaluatedPositionalArgs,
    public named: EvaluatedNamedArgs,
    public blocks: Blocks = EMPTY_BLOCKS
  ) {
    this.tag = combineTagged([positional, named]);
  }
}

const EMPTY_EVALUATED_ARGS = new EvaluatedArgs(EVALUATED_EMPTY_POSITIONAL_ARGS, EVALUATED_EMPTY_NAMED_ARGS, EMPTY_BLOCKS);

export { EvaluatedPositionalArgs, EvaluatedNamedArgs };
