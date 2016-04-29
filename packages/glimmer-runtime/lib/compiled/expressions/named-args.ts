import { UNDEFINED_REFERENCE } from '../../references';
import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { CONSTANT_TAG, PathReference, RevisionTag, combine } from 'glimmer-reference';
import { InternedString, Dict, dict } from 'glimmer-util';

export abstract class CompiledNamedArgs {
  static create({ map }: { map: Dict<CompiledExpression<any>> }): CompiledNamedArgs {
    if (Object.keys(map).length) {
      return new CompiledNonEmptyNamedArgs({ map });
    } else {
      return COMPILED_EMPTY_NAMED_ARGS;
    }
  }

  public type: string;
  public map: Dict<CompiledExpression<any>>;
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

export const COMPILED_EMPTY_NAMED_ARGS = new (class extends CompiledNamedArgs {
  public type = "empty-named-args";
  public map = dict<CompiledExpression<any>>();

  evaluate(vm): EvaluatedNamedArgs {
    return EvaluatedNamedArgs.empty();
  }

  toJSON(): string {
    return `<EMPTY>`;
  }
});

export abstract class EvaluatedNamedArgs {
  public tag: RevisionTag;
  public keys: InternedString[];

  static empty(): EvaluatedNamedArgs {
    return EVALUATED_EMPTY_NAMED_ARGS;
  }

  static create({ map }: { map: Dict<PathReference<any>> }) {
    return new NonEmptyEvaluatedNamedArgs({ map });
  }

  public type: string;
  public map: Dict<PathReference<any>>;

  forEach(callback: (key: InternedString, value: PathReference<any>) => void) {
    let { map } = this;
    let mapKeys = Object.keys(map);

    for (let i = 0; i < mapKeys.length; i++) {
      let key = mapKeys[i];
      callback(key as InternedString, map[key]);
    }
  }

  abstract get(key: InternedString): PathReference<any>;
  abstract has(key: InternedString): boolean;
  abstract value(): Dict<any>;
}

class NonEmptyEvaluatedNamedArgs extends EvaluatedNamedArgs {
  public values: PathReference<any>[];
  public map: Dict<PathReference<any>>;

  constructor({ map }: { map: Dict<PathReference<any>> }) {
    super();

    let keys = this.keys = Object.keys(map) as InternedString[];
    this.map = map;

    let tags = [];

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      tags.push(map[key].tag);
    }

    this.tag = combine(tags);
  }

  get(key: InternedString): PathReference<any> {
    return this.map[<string>key] || UNDEFINED_REFERENCE;
  }

  has(key: InternedString): boolean {
    return !!this.map[<string>key];
  }

  value(): Dict<any> {
    let { map, keys } = this;

    let out = dict();

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      out[key] = map[key].value();
    }

    return out;
  }
}

export const EVALUATED_EMPTY_NAMED_ARGS = new (class extends EvaluatedNamedArgs {
  public tag = CONSTANT_TAG;
  public keys = [];

  get(): PathReference<any> {
    return UNDEFINED_REFERENCE;
  }

  has(key: InternedString): boolean {
    return false;
  }

  value(): Dict<any> {
    return {};
  }
});
