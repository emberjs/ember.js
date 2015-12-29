import { NULL_REFERENCE } from '../../references';
import { CompiledExpression } from '../expressions';
import VM from '../../vm';
import { PathReference } from 'glimmer-reference';
import { InternedString, Dict, dict } from 'glimmer-util';

export abstract class CompiledNamedArgs {
  static create({ keys, values }: { keys: InternedString[], values: CompiledExpression[] }): CompiledNamedArgs {
    if (keys.length) {
      return new CompiledNonEmptyNamedArgs({ keys, values });
    } else {
      return COMPILED_EMPTY_NAMED_ARGS;
    }
  }

  public type: string;
  abstract evaluate(vm: VM): EvaluatedNamedArgs;
}

class CompiledNonEmptyNamedArgs extends CompiledNamedArgs {
  public type = "named-args";
  public keys: InternedString[];
  public values: CompiledExpression[];

  constructor({ keys, values }: { keys: InternedString[], values: CompiledExpression[] }) {
    super();
    this.keys = keys;
    this.values = values;
  }

  evaluate(vm: VM): EvaluatedNamedArgs {
    let { keys, values } = this;

    let valueReferences = values.map((value, i) => {
      return <PathReference>value.evaluate(vm);
    });

    return EvaluatedNamedArgs.create({ keys, values: valueReferences });
  }
}

export const COMPILED_EMPTY_NAMED_ARGS = new (class extends CompiledNamedArgs {
  public type = "empty-named-args";

  evaluate(vm): EvaluatedNamedArgs {
    return EvaluatedNamedArgs.empty();
  }
});

export abstract class EvaluatedNamedArgs {
  static empty(): EvaluatedNamedArgs {
    return EVALUATED_EMPTY_NAMED_ARGS;
  }

  static create({ keys, values }: { keys: InternedString[], values: PathReference[] }) {
    return new NonEmptyEvaluatedNamedArgs({ keys, values });
  }

  public type: string;
  public values: PathReference[];
  public keys: InternedString[];

  forEach(callback: (key: InternedString, value: PathReference) => void) {
    let { keys, values } = this;
    keys.forEach((key, i) => callback(key, values[i]));
  }

  abstract get(key: InternedString): PathReference;
  abstract has(key: InternedString): boolean;
  abstract value(): Dict<any>;
}

class NonEmptyEvaluatedNamedArgs extends EvaluatedNamedArgs {
  public values: PathReference[];
  public keys: InternedString[];
  public map: Dict<PathReference>;

  constructor({ keys, values }: { keys: InternedString[], values: PathReference[] }) {
    super();

    let map = dict<PathReference>();

    values.forEach((v, i) => map[<string>keys[i]] = v);

    this.keys = keys;
    this.values = values;
    this.map = map;
  }

  get(key: InternedString): PathReference {
    return this.map[<string>key];
  }

  has(key: InternedString): boolean {
    return !!this.map[<string>key];
  }

  value(): Dict<any> {
    let hash = dict();
    let refs = this.values;

    this.keys.forEach((k, i) => {
      hash[<string>k] = refs[i].value();
    });

    return hash;
  }
}

export const EVALUATED_EMPTY_NAMED_ARGS = new (class extends EvaluatedNamedArgs {
  get(): PathReference {
    return NULL_REFERENCE;
  }

  has(key: InternedString): boolean {
    return false;
  }

  value(): Dict<any> {
    return null;
  }
});