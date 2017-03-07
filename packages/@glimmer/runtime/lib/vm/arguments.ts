import { EvaluationStack } from './append';
import { dict } from '@glimmer/util';
import { combineTagged } from '@glimmer/reference';
import { EMPTY_ARRAY } from '../utils';
import { Dict, Opaque, Option } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';

/*
  The calling convention is:

  * 0-N positional arguments at the bottom (left-to-right)
  * 0-N named arguments next
  * 0-2 blocks next
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

export interface ICapturedPositionalArguments {
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
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  capture(): ICapturedNamedArguments;
}

export interface ICapturedNamedArguments {
  tag: Tag;
  names: string[];
  length: number;
  references: VersionedPathReference<Opaque>[];
  get<T extends VersionedPathReference<Opaque>>(name: string): T;
  value(): Dict<Opaque>;
}

export class Arguments implements IArguments {
  public positional: IPositionalArguments = new PositionalArguments();
  public named: INamedArguments = new NamedArguments();

  empty() {
    this.setup(null as any as EvaluationStack, 0, EMPTY_ARRAY, true);
    return this;
  }

  setup(stack: EvaluationStack, positionalCount: number, names: string[], synthetic: boolean) {
    let namedCount = names.length;
    let start = positionalCount + namedCount;

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
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    //
    // at(0) === pos1 === top - start
    // at(1) === pos2 === top - (start - 1)
    // at(2) === pos3 === top - (start - 2)
    let fromTop = this.start - position - 1;
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

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    // namedDict: { named1: 1, named2: 0 };
    //
    // get('named1') === named1 === top - (start - 1)
    // get('named2') === named2 === top - start
    let fromTop = this.length - this.names.indexOf(name) - 1;
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

  constructor(
    public tag: Tag,
    public names: string[],
    public references: VersionedPathReference<Opaque>[]
  ) {
    this.length = names.length;
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    let index = this.names.indexOf(name);
    return this.references[index] as T;
  }

  value(): Dict<Opaque> {
    let { names, references } = this;
    let out = dict<Opaque>();

    names.forEach((name, i) => out[name] = references[i].value());

    return out;
  }
}

export default new Arguments();
