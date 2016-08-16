import { UNDEFINED_REFERENCE } from '../../references';
import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { CONSTANT_TAG, PathReference, RevisionTag, combineTagged } from 'glimmer-reference';
import { Dict, dict } from 'glimmer-util';

export abstract class CompiledNamedArgs {
  public abstract type: string;
  public abstract map: Dict<CompiledExpression<any>>;

  static create({ map }: { map: Dict<CompiledExpression<any>> }): CompiledNamedArgs {
    if (Object.keys(map).length) {
      return new CompiledNonEmptyNamedArgs({ map });
    } else {
      return COMPILED_EMPTY_NAMED_ARGS;
    }
  }

  abstract evaluate(vm: VM): EvaluatedNamedArgs;
  abstract toJSON(): string;
}

class CompiledNonEmptyNamedArgs extends CompiledNamedArgs {
  public type = "named-args";
  public map: Dict<CompiledExpression<any>>;

  constructor({ map }: { map: Dict<CompiledExpression<any>> }) {
    super();
    this.map = map;
  }

  evaluate(vm: VM): EvaluatedNamedArgs {
    let { map } = this;

    let compiledMap = dict<PathReference<any>>();
    let compiledKeys = Object.keys(map);

    for (let i = 0; i < compiledKeys.length; i++) {
      let key = compiledKeys[i];
      compiledMap[key] = map[key].evaluate(vm);
    }

    return EvaluatedNamedArgs.create({ map: compiledMap });
  }

  toJSON(): string {
    let { map } = this;
    let inner = Object.keys(map).map(key => `${key}: ${map[key].toJSON()}`).join(", ");
    return `{${inner}}`;
  }
}

export const COMPILED_EMPTY_NAMED_ARGS: CompiledNamedArgs = new (class extends CompiledNamedArgs {
  public type = "empty-named-args";
  public map = dict<CompiledExpression<any>>();

  evaluate(vm: VM): EvaluatedNamedArgs {
    return EvaluatedNamedArgs.empty();
  }

  toJSON(): string {
    return `<EMPTY>`;
  }
});

export abstract class EvaluatedNamedArgs {
  public tag: RevisionTag;
  public keys: string[];
  public values: PathReference<any>[];
  public map: Dict<PathReference<any>>;

  static empty(): EvaluatedNamedArgs {
    return EVALUATED_EMPTY_NAMED_ARGS;
  }

  static create({ map }: { map: Dict<PathReference<any>> }) {
    return new NonEmptyEvaluatedNamedArgs({ map });
  }

  forEach(callback: (key: string, value: PathReference<any>) => void) {
    let { map } = this;
    let mapKeys = Object.keys(map);

    for (let i = 0; i < mapKeys.length; i++) {
      let key = mapKeys[i];
      callback(key, map[key]);
    }
  }

  abstract get(key: string): PathReference<any>;
  abstract has(key: string): boolean;
  abstract value(): Dict<any>;
}

class NonEmptyEvaluatedNamedArgs extends EvaluatedNamedArgs {
  public map: Dict<PathReference<any>>;
  public values: PathReference<any>[];

  constructor({ map }: { map: Dict<PathReference<any>> }) {
    super();

    let keys = Object.keys(map);
    let values = [];

    for (let i = 0; i < keys.length; i++) {
      values.push(map[keys[i]]);
    }

    this.tag = combineTagged(values);
    this.keys = keys;
    this.values = values;
    this.map = map;
  }

  get(key: string): PathReference<any> {
    return this.map[key] || UNDEFINED_REFERENCE;
  }

  has(key: string): boolean {
    return this.keys.indexOf(key) !== -1;
  }

  value(): Dict<any> {
    let { keys, values } = this;

    let out = dict();

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let ref = values[i];
      out[key] = ref.value();
    }

    return out;
  }
}

export const EVALUATED_EMPTY_NAMED_ARGS = new (class extends EvaluatedNamedArgs {
  public tag = CONSTANT_TAG;
  public keys = [];
  public values = [];
  public map = {};

  get(): PathReference<any> {
    return UNDEFINED_REFERENCE;
  }

  has(key: string): boolean {
    return false;
  }

  value(): Dict<any> {
    return this.map;
  }
});
