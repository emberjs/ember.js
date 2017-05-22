import { EvaluationStack } from './append';
import { dict, EMPTY_ARRAY } from '@glimmer/util';
import { combineTagged } from '@glimmer/reference';
import { Dict, Opaque, Option, unsafe } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { PrimitiveReference, UNDEFINED_REFERENCE } from '../references';

/*
  The calling convention is:

  * 0-N positional arguments at the bottom (left-to-right)
  * number of positional args
  * 0-N named arguments next
  * an array of names on top
*/

export interface IArguments {
  tag: Tag;
  length: number;
  positional: IPositionalArguments;
  named: INamedArguments;

  at<T extends VersionedPathReference<Opaque>>(pos: number): T;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  capture(): ICapturedArguments;
}

export interface ICapturedArguments {
  tag: Tag;
  length: number;
  positional: ICapturedPositionalArguments;
  named: ICapturedNamedArguments;
}

export interface IPositionalArguments {
  tag: Tag;
  length: number;
  at<T extends VersionedPathReference<Opaque>>(position: number): T;
  capture(): ICapturedPositionalArguments;
}

export interface ICapturedPositionalArguments extends VersionedPathReference<Opaque[]> {
  tag: Tag;
  length: number;
  references: VersionedPathReference<Opaque>[];
  at<T extends VersionedPathReference<Opaque>>(position: number): T;
  value(): Opaque[];
}

export interface INamedArguments {
  tag: Tag;
  names: string[];
  length: number;
  has(name: string): boolean;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  capture(): ICapturedNamedArguments;
}

export interface ICapturedNamedArguments extends VersionedPathReference<Dict<Opaque>> {
  tag: Tag;
  map: Dict<VersionedPathReference<Opaque>>;
  names: string[];
  length: number;
  references: VersionedPathReference<Opaque>[];
  has(name: string): boolean;
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  value(): Dict<Opaque>;
}

export class Arguments implements IArguments {
  private stack: EvaluationStack = null as any;
  public positional: IPositionalArguments = new PositionalArguments();
  public named: INamedArguments = new NamedArguments();

  empty() {
    this.setup(null as any as EvaluationStack, true);
    return this;
  }

  setup(stack: EvaluationStack, synthetic: boolean) {
    this.stack = stack;

    let names = stack.fromTop<string[]>(0);
    let namedCount = names.length;

    let positionalCount = stack.fromTop<number>(namedCount + 1);
    let start = positionalCount + namedCount + 2;

    let positional = this.positional as PositionalArguments;
    positional.setup(stack, start, positionalCount);

    let named = this.named as NamedArguments;
    named.setup(stack, namedCount, names, synthetic);
  }

  get tag(): Tag {
    return combineTagged([this.positional, this.named]);
  }

  get length(): number {
    return this.positional.length + this.named.length;
  }

  at<T extends VersionedPathReference<Opaque>>(pos: number): T {
    return this.positional.at<T>(pos);
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    return this.named.get<T>(name);
  }

  capture(): ICapturedArguments {
    return {
      tag: this.tag,
      length: this.length,
      positional: this.positional.capture(),
      named: this.named.capture()
    };
  }

  clear(): void {
    let { stack, length } = this;
    stack.pop(length + 2);
  }
}

class PositionalArguments implements IPositionalArguments {
  public length = 0;

  private stack: EvaluationStack = null as any;
  private start = 0;

  private _tag: Option<Tag> = null;
  private _references: Option<VersionedPathReference<Opaque>[]> = null;

  setup(stack: EvaluationStack, start: number, length: number) {
    this.stack = stack;
    this.start = start;
    this.length = length;

    this._tag = null;
    this._references = null;
  }

  get tag(): Tag {
    let tag = this._tag;

    if (!tag) {
      tag = this._tag = combineTagged(this.references);
    }

    return tag;
  }

  at<T extends VersionedPathReference<Opaque>>(position: number): T {
    let { start, length } = this;

    if (position < 0 || position >= length) {
      return UNDEFINED_REFERENCE as unsafe as T;
    }

    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    //
    // at(0) === pos1 === top - start
    // at(1) === pos2 === top - (start - 1)
    // at(2) === pos3 === top - (start - 2)
    let fromTop = start - position - 1;
    return this.stack.fromTop<T>(fromTop);
  }

  capture(): ICapturedPositionalArguments {
    return new CapturedPositionalArguments(this.tag, this.references);
  }

  private get references() {
    let references = this._references;

    if (!references) {
      let { length } = this;
      references = this._references = new Array(length);

      for (let i=0; i<length; i++) {
        references[i] = this.at(i);
      }
    }

    return references;
  }
}

class CapturedPositionalArguments implements ICapturedPositionalArguments {
  constructor(
    public tag: Tag,
    public references: VersionedPathReference<Opaque>[],
    public length = references.length
  ) {}

  at<T extends VersionedPathReference<Opaque>>(position: number): T {
    return this.references[position] as T;
  }

  value(): Opaque[] {
    return this.references.map(this.valueOf);
  }

  get(name: string): VersionedPathReference<Opaque> {
    let { references, length } = this;

    if (name === 'length') {
      return PrimitiveReference.create(length);
    } else {
      let idx = parseInt(name, 10);

      if (idx < 0 || idx >= length) {
        return UNDEFINED_REFERENCE;
      } else {
        return references[idx];
      }
    }
  }

  private valueOf(this: void, reference: VersionedPathReference<Opaque>): Opaque {
    return reference.value();
  }
}

class NamedArguments implements INamedArguments {
  public length = 0;

  private stack: EvaluationStack;

  private _tag: Option<Tag> = null;
  private _references: Option<VersionedPathReference<Opaque>[]> = null;

  private _names: Option<string[]> = null;
  private _realNames: string[] = EMPTY_ARRAY;

  setup(stack: EvaluationStack, length: number, names: string[], synthetic: boolean) {
    this.stack = stack;
    this.length = length;

    this._tag = null;
    this._references = null;

    if (synthetic) {
      this._names = names;
      this._realNames = EMPTY_ARRAY;
    } else {
      this._names = null;
      this._realNames = names;
    }
  }

  get tag(): Tag {
    return combineTagged(this.references);
  }

  get names() {
    let names = this._names;

    if (!names) {
      names = this._names = this._realNames.map(this.sliceName);
    }

    return names;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    let { names, length } = this;

    let idx = names.indexOf(name);

    if (idx === -1) {
      return UNDEFINED_REFERENCE as unsafe as T;
    }

    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    // namedDict: { named1: 1, named2: 0 };
    //
    // get('named1') === named1 === top - (start - 1)
    // get('named2') === named2 === top - start
    let fromTop = length - idx;
    return this.stack.fromTop<T>(fromTop);
  }

  capture(): ICapturedNamedArguments {
    return new CapturedNamedArguments(this.tag, this.names, this.references);
  }

  private get references() {
    let references = this._references;

    if (!references) {
      let { names, length } = this;
      references = this._references = [];

      for (let i=0; i<length; i++) {
        references[i] = this.get(names[i]);
      }
    }

    return references;
  }

  private sliceName(this: void, name: string) {
    return name.slice(1);
  }
}

class CapturedNamedArguments implements ICapturedNamedArguments {
  public length: number;
  private _map: Option<Dict<VersionedPathReference<Opaque>>>;

  constructor(
    public tag: Tag,
    public names: string[],
    public references: VersionedPathReference<Opaque>[]
  ) {
    this.length = names.length;
    this._map = null;
  }

  get map() {
    let map = this._map;

    if (!map) {
      let { names, references } = this;
      map = this._map = dict<VersionedPathReference<Opaque>>();

      for (let i = 0; i < names.length; i++) {
        let name = names[i];
        map![name] = references[i];
      }

    }

    return map;
  }

  has(name: string): boolean {
    return this.names.indexOf(name) !== -1;
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    let { names, references } = this;
    let idx = names.indexOf(name);

    if (idx === -1) {
      return UNDEFINED_REFERENCE as unsafe as T;
    } else {
      return references[idx] as T;
    }
  }

  value(): Dict<Opaque> {
    let { names, references } = this;
    let out = dict<Opaque>();

    for (let i = 0; i < names.length; i++) {
      let name = names[i];
      out[name] = references[i].value();
    }

    return out;
  }
}

export default new Arguments();
